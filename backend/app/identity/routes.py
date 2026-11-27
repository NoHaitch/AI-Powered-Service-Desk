"""M1 browser authentication endpoints."""

import asyncio
import json
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Annotated
from uuid import UUID, uuid4

from anyio.to_thread import run_sync
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.database import database_session
from app.core.telemetry import logger
from app.identity.limiter import Admission, Limiter, database_now
from app.identity.models import RefreshCredential, RefreshFamily, User
from app.identity.security import (
    REFRESH_COOKIE,
    BrowserSecurity,
    Claims,
    clear_credentials,
    set_credentials,
)
from app.identity.session import (
    Identity,
    audit,
    credential_by_digest,
    current_identity,
    guarded_admission,
    lock_family,
    require_browser,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
Session = Annotated[AsyncSession, Depends(database_session)]
USERNAME = re.compile(r"[a-zA-Z0-9._-]{3,64}")
MAX_LOGIN_BYTES = 4096


class Login(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    username: Annotated[str, Field(max_length=128)]
    password: Annotated[str, Field(min_length=1, max_length=128)]


class Csrf(BaseModel):
    csrf_token: str


class LoginResult(Csrf):
    user: Identity


class Passwords:
    def __init__(self, workers: int) -> None:
        self.hasher = PasswordHash.recommended()
        self.dummy_hash = self.hasher.hash(secrets.token_urlsafe(32))
        self.workers = asyncio.Semaphore(workers)

    async def verify(self, password: str, stored: str | None) -> bool:
        if self.workers.locked():
            raise HTTPException(503)
        async with self.workers:
            return await run_sync(self.hasher.verify, password, stored or self.dummy_hash)


@dataclass(frozen=True, repr=False)
class Issued:
    now: datetime
    user_id: UUID
    family_id: UUID
    refresh: str
    refresh_deadline: datetime

    def write(self, security: BrowserSecurity, settings: Settings, response: Response) -> None:
        expiry = min(
            self.refresh_deadline, self.now + timedelta(seconds=settings.auth_access_seconds)
        )
        access = security.sign_access(Claims(self.user_id, self.family_id), self.now, expiry)
        set_credentials(
            response,
            access,
            self.refresh,
            int(expiry.timestamp()) - int(self.now.timestamp()),
            int(self.refresh_deadline.timestamp()) - int(self.now.timestamp()),
        )


async def read_login(request: Request) -> Login:
    if request.headers.get("content-type", "").split(";", 1)[0].lower() != "application/json":
        raise HTTPException(422)
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > MAX_LOGIN_BYTES:
            raise HTTPException(413)
        data.extend(chunk)
    try:
        form = Login.model_validate(json.loads(data))
        form.password.encode("utf-8")
    except ValidationError, ValueError, RecursionError:
        raise HTTPException(422) from None
    return form


@router.post(
    "/login",
    response_model=LoginResult,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/json": {
                    "schema": Login.model_json_schema(),
                }
            },
        },
    },
)
async def login(request: Request, response: Response, db: Session) -> LoginResult:
    settings: Settings = request.app.state.settings
    security: BrowserSecurity = request.app.state.browser_security
    limiter: Limiter = request.app.state.auth_limiter
    passwords: Passwords = request.app.state.passwords
    security.validate_origin(request)
    source = security.source(request)
    if request.headers.getlist("x-desk-request") != ["1"]:
        raise HTTPException(403)
    admission = await limiter.begin(UUID(request.state.request_id))
    await admission.count(
        "login:total", settings.auth_login_total, settings.auth_admission_window_seconds
    )
    await admission.count(
        "login:source", settings.auth_login_source, settings.auth_login_window_seconds, source
    )
    form = await read_login(request)
    submitted = form.username.strip()
    if not USERNAME.fullmatch(submitted):
        raise HTTPException(422)
    name = submitted.lower()
    await admission.count(
        "login:identity-source",
        settings.auth_login_identifier_source,
        settings.auth_login_window_seconds,
        name,
        source,
    )
    async with db.begin():
        row = (
            await db.execute(
                select(User.id, User.password_hash).where(
                    User.username == name, User.disabled_at.is_(None)
                )
            )
        ).one_or_none()
    valid = await passwords.verify(form.password, row.password_hash if row else None)
    if not valid or row is None:
        if await admission.count(
            "login:signal",
            settings.auth_login_signal,
            settings.auth_signal_window_seconds,
            name,
            enforce=False,
        ):
            logger.warning(
                "auth_account_failure_signal", extra={"request_id": request.state.request_id}
            )
        if await admission.count(
            "login:denial-audit",
            1,
            settings.auth_admission_window_seconds,
            enforce=False,
        ):
            async with db.begin():
                audit(db, request, "login", "denied")
        raise HTTPException(401)
    async with db.begin():
        identity = await current_identity(db, row.id)
        stored = await db.scalar(select(User.password_hash).where(User.id == row.id))
        if identity is None or stored != row.password_hash:
            raise HTTPException(401)
        await guarded_admission(db, admission)
        now = await database_now(db)
        family = RefreshFamily(
            id=uuid4(),
            user_id=identity.id,
            authenticated_at=now,
            last_refreshed_at=now,
            idle_expires_at=now + timedelta(seconds=settings.auth_idle_seconds),
            absolute_expires_at=now + timedelta(seconds=settings.auth_absolute_seconds),
        )
        db.add(family)
        await db.flush()
        raw, digest = security.new_refresh()
        db.add(
            RefreshCredential(
                family_id=family.id,
                digest=digest,
                issued_at=now,
                expires_at=family.idle_expires_at,
            )
        )
        audit(db, request, "login", "success", user=identity.id, family=family.id)
        issued = Issued(now, identity.id, family.id, raw, family.idle_expires_at)
    issued.write(security, settings, response)
    return LoginResult(user=identity, csrf_token=security.csrf_token(issued.family_id))


@router.get("/me", response_model=Identity)
async def me(request: Request, db: Session) -> Identity:
    return (await require_browser(request, db)).identity


@router.get("/csrf", response_model=Csrf)
async def csrf(request: Request, db: Session) -> Csrf:
    security: BrowserSecurity = request.app.state.browser_security
    security.validate_host(request)
    claims = security.access_claims(request)
    if claims is not None and await current_identity(db, claims.user_id) is not None:
        return Csrf(csrf_token=security.csrf_token(claims.family_id))
    credential = await credential_by_digest(
        db, security.refresh_digest(request.cookies.get(REFRESH_COOKIE, ""))
    )
    if credential is not None and credential.consumed_at is None:
        family = await db.get(RefreshFamily, credential.family_id)
        now = await database_now(db)
        if (
            family is not None
            and family.revoked_at is None
            and now < min(family.idle_expires_at, credential.expires_at, family.absolute_expires_at)
            and await current_identity(db, family.user_id) is not None
        ):
            return Csrf(csrf_token=security.csrf_token(family.id))
    raise HTTPException(401)


@router.post("/refresh", status_code=204)
async def refresh(request: Request, response: Response, db: Session) -> Response:
    settings: Settings = request.app.state.settings
    security: BrowserSecurity = request.app.state.browser_security
    limiter: Limiter = request.app.state.auth_limiter
    security.validate_origin(request)
    source = security.source(request)
    admission = await limiter.begin(UUID(request.state.request_id))
    await admission.count(
        "refresh:total", settings.auth_refresh_total, settings.auth_admission_window_seconds
    )
    await admission.count(
        "refresh:source",
        settings.auth_refresh_source,
        settings.auth_admission_window_seconds,
        source,
    )
    async with db.begin():
        issued = await rotate_family(db, request, settings, security, admission)
    if issued is None:
        raise HTTPException(401)
    issued.write(security, settings, response)
    response.status_code = 204
    return response


async def rotate_family(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    security: BrowserSecurity,
    admission: Admission,
) -> Issued | None:
    credential = await credential_by_digest(
        db, security.refresh_digest(request.cookies.get(REFRESH_COOKIE, ""))
    )
    if credential is None:
        return None
    if not security.valid_csrf(request, credential.family_id):
        raise HTTPException(403)

    family = await lock_family(db, credential.family_id)
    assert family is not None
    await db.refresh(credential, ["consumed_at"])
    now = await database_now(db)
    if family.revoked_at is not None or now >= family.absolute_expires_at:
        return None

    if credential.consumed_at is not None:
        family.revoked_at = now
        family.revocation_reason = "reuse"
        audit(db, request, "reuse", "success", user=family.user_id, family=family.id)
        return None

    expires = min(credential.expires_at, family.idle_expires_at, family.absolute_expires_at)
    if now >= expires or await current_identity(db, family.user_id) is None:
        return None
    await admission.count(
        "refresh:family",
        settings.auth_refresh_family,
        settings.auth_admission_window_seconds,
        str(family.id),
    )
    await guarded_admission(db, admission)
    now = await database_now(db)
    deadline = min(family.absolute_expires_at, now + timedelta(seconds=settings.auth_idle_seconds))
    if now >= expires or int(deadline.timestamp()) <= int(now.timestamp()):
        return None

    credential.consumed_at = now
    family.idle_expires_at = deadline
    family.last_refreshed_at = now
    await db.flush()
    raw, digest = security.new_refresh()
    db.add(
        RefreshCredential(
            family_id=family.id,
            predecessor_id=credential.id,
            digest=digest,
            issued_at=now,
            expires_at=deadline,
        )
    )
    audit(db, request, "refresh", "success", user=family.user_id, family=family.id)
    return Issued(now, family.user_id, family.id, raw, deadline)


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, db: Session) -> Response:
    security: BrowserSecurity = request.app.state.browser_security
    security.validate_origin(request)
    async with db.begin():
        credential = await credential_by_digest(
            db, security.refresh_digest(request.cookies.get(REFRESH_COOKIE, ""))
        )
        claims = security.access_claims(request)
        family_id = credential.family_id if credential else claims.family_id if claims else None
        if family_id is not None:
            if not security.valid_csrf(request, family_id):
                raise HTTPException(403)
            family = await lock_family(db, family_id)
            if family is not None and family.revoked_at is None:
                family.revoked_at = await database_now(db)
                family.revocation_reason = "logout"
                audit(db, request, "logout", "success", user=family.user_id, family=family.id)
    clear_credentials(response)
    response.status_code = 204
    return response
