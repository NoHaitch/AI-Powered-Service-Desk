"""Browser credential formats and the trusted local ingress boundary."""

import base64
import hashlib
import hmac
import ipaddress
import re
import secrets
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urlsplit
from uuid import UUID

import jwt
from fastapi import HTTPException, Request, Response
from pydantic import SecretStr

from app.core.config import Settings

ACCESS_COOKIE = "__Secure-desk-access"
REFRESH_COOKIE = "__Secure-desk-refresh"
ACCESS_PATH = "/api/v1"
REFRESH_PATH = "/api/v1/auth"
KEY_ID = re.compile(r"[a-zA-Z0-9_-]{1,24}")
KEY_VALUE = re.compile(r"[a-fA-F0-9]{64}")
TOKEN_VALUE = re.compile(r"[A-Za-z0-9_-]{43}")
ISSUER = "service-desk"
AUDIENCE = "service-desk-browser"


@dataclass(frozen=True, repr=False)
class KeyRing:
    active: str
    keys: dict[str, bytes]

    @classmethod
    def parse(cls, value: SecretStr | None) -> KeyRing:
        keys: dict[str, bytes] = {}
        for entry in (value.get_secret_value() if value else "").split(","):
            name, _, key = entry.partition(":")
            if not KEY_ID.fullmatch(name) or not KEY_VALUE.fullmatch(key) or name in keys:
                raise ValueError("Configure valid authentication key rings.")
            keys[name] = bytes.fromhex(key)
        if len(keys) > 4:
            raise ValueError("Too many keys in an authentication key ring.")
        return cls(next(iter(keys)), keys)


@dataclass(frozen=True)
class Claims:
    user_id: UUID
    family_id: UUID


@dataclass(frozen=True, repr=False)
class BrowserSecurity:
    origin: str
    host: str
    peer: ipaddress.IPv4Address | ipaddress.IPv6Address
    access: KeyRing
    refresh: KeyRing
    csrf: KeyRing
    limiter: bytes

    @classmethod
    def from_settings(cls, settings: Settings) -> BrowserSecurity:
        access = KeyRing.parse(settings.auth_access_keys)
        refresh = KeyRing.parse(settings.auth_refresh_keys)
        csrf = KeyRing.parse(settings.auth_csrf_keys)
        limiter = KeyRing.parse(settings.auth_limiter_key)
        keys = [key for ring in (access, refresh, csrf, limiter) for key in ring.keys.values()]
        if len(limiter.keys) != 1 or len(keys) != len(set(keys)):
            raise ValueError("Authentication keys must be distinct.")
        return cls(
            settings.auth_origin,
            urlsplit(settings.auth_origin).netloc,
            settings.auth_proxy_peer,
            access,
            refresh,
            csrf,
            limiter.keys[limiter.active],
        )

    def validate_host(self, request: Request) -> None:
        if request.headers.getlist("host") != [self.host]:
            raise HTTPException(403)

    def validate_origin(self, request: Request) -> None:
        self.validate_host(request)
        if request.headers.getlist("origin") != [self.origin]:
            raise HTTPException(403)

    def source(self, request: Request) -> str:
        source = request.headers.getlist("x-desk-client-address")
        if request.client is None or len(source) != 1:
            raise HTTPException(503)
        try:
            peer = parse_address(request.client.host)
            remote = parse_address(source[0])
        except ValueError:
            raise HTTPException(503) from None
        if peer != self.peer:
            raise HTTPException(503)
        return str(remote)

    def sign_access(self, claims: Claims, issued: datetime, expiry: datetime) -> str:
        return jwt.encode(
            {
                "iss": ISSUER,
                "aud": AUDIENCE,
                "sub": str(claims.user_id),
                "sid": str(claims.family_id),
                "iat": int(issued.timestamp()),
                "exp": int(expiry.timestamp()),
                "purpose": "access",
            },
            self.access.keys[self.access.active],
            algorithm="HS256",
            headers={"kid": self.access.active, "typ": "at+jwt"},
        )

    def access_claims(self, request: Request) -> Claims | None:
        token = request.cookies.get(ACCESS_COOKIE, "")
        if not token or len(token) > 1024:
            return None
        try:
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")
            if header.get("typ") != "at+jwt" or not isinstance(kid, str):
                return None
            payload = jwt.decode(
                token,
                self.access.keys[kid],
                algorithms=["HS256"],
                issuer=ISSUER,
                audience=AUDIENCE,
                options={
                    "require": ["iss", "aud", "sub", "sid", "iat", "exp", "purpose"],
                    "strict_aud": True,
                },
            )
            if (
                payload["purpose"] != "access"
                or type(payload["iat"]) is not int
                or type(payload["exp"]) is not int
                or not 0 < payload["exp"] - payload["iat"] <= 600
                or not isinstance(payload["sid"], str)
            ):
                return None
            return Claims(UUID(payload["sub"]), UUID(payload["sid"]))
        except jwt.InvalidTokenError, KeyError, ValueError, TypeError:
            return None

    def new_refresh(self) -> tuple[str, bytes]:
        token = f"{self.refresh.active}.{secrets.token_urlsafe(32)}"
        return token, keyed(self.refresh.keys[self.refresh.active], "refresh", token)

    def refresh_digest(self, token: str) -> bytes | None:
        kid, _, value = token.partition(".")
        if len(token) > 68 or not TOKEN_VALUE.fullmatch(value) or kid not in self.refresh.keys:
            return None
        return keyed(self.refresh.keys[kid], "refresh", token)

    def csrf_token(self, family: UUID, kid: str | None = None) -> str:
        key_id = kid if kid is not None else self.csrf.active
        digest = keyed(self.csrf.keys[key_id], "csrf", key_id, str(family))
        return f"{key_id}.{base64.urlsafe_b64encode(digest).decode('ascii').rstrip('=')}"

    def valid_csrf(self, request: Request, family: UUID) -> bool:
        headers = request.headers.getlist("x-csrf-token")
        if len(headers) != 1 or len(headers[0]) > 68:
            return False
        token = headers[0]
        kid, _, value = token.partition(".")
        return (
            kid in self.csrf.keys
            and bool(TOKEN_VALUE.fullmatch(value))
            and hmac.compare_digest(token, self.csrf_token(family, kid))
        )


def parse_address(value: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
    if len(value) > 45 or "%" in value:
        raise ValueError("Invalid source address.")
    address = ipaddress.ip_address(value)
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        return address.ipv4_mapped
    return address


def keyed(key: bytes, context: str, *parts: str) -> bytes:
    return hmac.digest(key, "\0".join((context, *parts)).encode(), hashlib.sha256)


def set_credentials(
    response: Response, access: str, refresh: str, access_age: int, refresh_age: int
) -> None:
    response.set_cookie(
        ACCESS_COOKIE,
        access,
        max_age=access_age,
        path=ACCESS_PATH,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        max_age=refresh_age,
        path=REFRESH_PATH,
        httponly=True,
        secure=True,
        samesite="lax",
    )


def clear_credentials(response: Response) -> None:
    for name, path in ((ACCESS_COOKIE, ACCESS_PATH), (REFRESH_COOKIE, REFRESH_PATH)):
        response.delete_cookie(name, path=path, secure=True, httponly=True, samesite="lax")
