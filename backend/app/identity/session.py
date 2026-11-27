"""Transactional authentication and current identity queries."""

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from fastapi import HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.models import AuthAuditEvent
from app.identity.limiter import Admission
from app.identity.models import (
    AuthLimiterState,
    RefreshCredential,
    RefreshFamily,
    Role,
    User,
    UserRole,
)
from app.identity.security import BrowserSecurity

AuthAction = Literal["login", "refresh", "reuse", "logout"]
Outcome = Literal["success", "denied", "unavailable"]


class Identity(BaseModel):
    id: UUID
    display_name: str
    roles: list[str]


@dataclass(frozen=True)
class BrowserSession:
    identity: Identity
    family_id: UUID


def audit(
    session: AsyncSession,
    request: Request,
    action: AuthAction,
    outcome: Outcome,
    *,
    user: UUID | None = None,
    family: UUID | None = None,
) -> None:
    session.add(
        AuthAuditEvent(
            request_id=UUID(request.state.request_id),
            actor_id=user,
            family_id=family,
            action=action,
            outcome=outcome,
        )
    )


async def current_identity(session: AsyncSession, user_id: UUID) -> Identity | None:
    rows = (
        await session.execute(
            select(User.display_name, Role.code)
            .select_from(User)
            .outerjoin(UserRole, UserRole.user_id == User.id)
            .outerjoin(Role, Role.id == UserRole.role_id)
            .where(User.id == user_id, User.disabled_at.is_(None))
            .order_by(Role.code)
        )
    ).all()
    if not rows:
        return None
    return Identity(
        id=user_id,
        display_name=rows[0].display_name,
        roles=[row.code for row in rows if row.code is not None],
    )


async def require_browser(
    request: Request,
    session: AsyncSession,
    *,
    mutation: bool = False,
) -> BrowserSession:
    security: BrowserSecurity = request.app.state.browser_security
    if mutation:
        security.validate_origin(request)
    else:
        security.validate_host(request)
    claims = security.access_claims(request)
    if claims is None:
        raise HTTPException(401)
    identity = await current_identity(session, claims.user_id)
    if identity is None:
        raise HTTPException(401)
    if mutation and not security.valid_csrf(request, claims.family_id):
        raise HTTPException(403)
    return BrowserSession(identity, claims.family_id)


async def credential_by_digest(
    session: AsyncSession,
    digest: bytes | None,
) -> RefreshCredential | None:
    if digest is None:
        return None
    return (
        await session.execute(select(RefreshCredential).where(RefreshCredential.digest == digest))
    ).scalar_one_or_none()


async def lock_family(session: AsyncSession, family_id: UUID) -> RefreshFamily | None:
    result = await session.execute(
        select(RefreshFamily).where(RefreshFamily.id == family_id).with_for_update()
    )
    return result.scalar_one_or_none()


async def guarded_admission(session: AsyncSession, admission: Admission) -> None:
    # A recovery transition cannot commit between this check and an issuance commit.
    generation = await session.scalar(
        select(AuthLimiterState.generation)
        .where(
            AuthLimiterState.id == 1,
            AuthLimiterState.generation == admission.generation,
            AuthLimiterState.recover_after.is_(None),
        )
        .with_for_update(read=True)
    )
    if generation is None:
        raise HTTPException(503)
