from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.config import Settings
from app.identity.security import ACCESS_COOKIE, AUDIENCE, ISSUER, BrowserSecurity, Claims
from app.tickets.routes import PRIORITIES
from app.tickets.schemas import IncidentCreate


def config(**options: object) -> Settings:
    return Settings.model_validate(
        {
            "db_password": "synthetic-db",
            "redis_password": "synthetic-redis",
            "auth_enabled": True,
            "auth_proxy_peer": "127.0.0.1",
            "auth_access_keys": "access:" + "11" * 32,
            "auth_refresh_keys": "refresh:" + "22" * 32,
            "auth_csrf_keys": "csrf:" + "33" * 32,
            "auth_limiter_key": "limiter:" + "44" * 32,
            **options,
        }
    )


def request(*headers: tuple[str, str], peer: str = "127.0.0.1") -> Request:
    return Request(
        {
            "type": "http",
            "client": (peer, 1234),
            "headers": [(name.lower().encode(), value.encode()) for name, value in headers],
        }
    )


def test_key_purpose_rotation_and_expiration() -> None:
    original = BrowserSecurity.from_settings(config())
    claims = Claims(uuid4(), uuid4())
    now = datetime.now(UTC)
    valid = original.sign_access(claims, now, now + timedelta(minutes=10))
    replayable_access = request(("Cookie", f"{ACCESS_COOKIE}={valid}"))
    expired = original.sign_access(
        claims, now - timedelta(days=1), now - timedelta(days=1, seconds=-60)
    )
    assert original.access_claims(replayable_access) == claims
    assert original.access_claims(request(("Cookie", f"{ACCESS_COOKIE}={expired}"))) is None

    refreshed, digest = original.new_refresh()
    csrf = original.csrf_token(claims.family_id)
    rotated = BrowserSecurity.from_settings(
        config(
            auth_access_keys="next:" + "55" * 32 + ",access:" + "11" * 32,
            auth_refresh_keys="next:" + "66" * 32 + ",refresh:" + "22" * 32,
            auth_csrf_keys="next:" + "77" * 32 + ",csrf:" + "33" * 32,
        )
    )
    assert rotated.access_claims(replayable_access) == claims
    assert rotated.refresh_digest(refreshed) == digest
    header = request(("X-CSRF-Token", csrf))
    assert rotated.valid_csrf(header, claims.family_id)
    assert not rotated.valid_csrf(header, uuid4())
    assert rotated.csrf_token(claims.family_id) != csrf
    assert rotated.refresh_digest(csrf) is None
    with pytest.raises(ValueError, match="distinct"):
        BrowserSecurity.from_settings(config(auth_csrf_keys="csrf:" + "11" * 32))


def test_proxy_requires_exact_peer_and_single_address() -> None:
    security = BrowserSecurity.from_settings(config())
    forwarded = ("X-Desk-Client-Address", "::ffff:192.0.2.42")
    assert security.source(request(forwarded, ("X-Forwarded-For", "203.0.113.1"))) == "192.0.2.42"

    for invalid in (request(forwarded, peer="127.0.0.2"), request(forwarded, forwarded), request()):
        with pytest.raises(HTTPException) as exc:
            security.source(invalid)
        assert exc.value.status_code == 503


def test_access_validation_checks_algorithm_key_and_each_required_claim() -> None:
    security = BrowserSecurity.from_settings(config())
    now = int(datetime.now(UTC).timestamp())
    payload = {
        "iss": ISSUER,
        "aud": AUDIENCE,
        "sub": str(uuid4()),
        "sid": str(uuid4()),
        "iat": now,
        "exp": now + 600,
        "purpose": "access",
    }
    entries = [
        ({**payload, "aud": "different-purpose"}, "HS256", "access", "at+jwt"),
        ({**payload, "iss": "different-issuer"}, "HS256", "access", "at+jwt"),
        ({**payload, "sid": "invalid"}, "HS256", "access", "at+jwt"),
        ({**payload, "sub": "invalid"}, "HS256", "access", "at+jwt"),
        ({**payload, "iat": now + 300}, "HS256", "access", "at+jwt"),
        ({**payload, "exp": now + 601}, "HS256", "access", "at+jwt"),
        ({**payload, "purpose": "other"}, "HS256", "access", "at+jwt"),
        (
            {key: value for key, value in payload.items() if key != "exp"},
            "HS256",
            "access",
            "at+jwt",
        ),
        (payload, "HS256", "other", "at+jwt"),
        (payload, "HS256", "access", "JWT"),
        (payload, "HS384", "access", "at+jwt"),
    ]
    for claims, algorithm, kid, category in entries:
        key = security.access.keys["access"] if algorithm == "HS256" else bytes(64)
        token = jwt.encode(claims, key, algorithm=algorithm, headers={"kid": kid, "typ": category})
        assert security.access_claims(request(("Cookie", f"{ACCESS_COOKIE}={token}"))) is None


def test_incident_matrix_and_input_boundaries() -> None:
    assert [
        [PRIORITIES[impact][urgency] for urgency in ("high", "medium", "low")]
        for impact in ("high", "medium", "low")
    ] == [[1, 2, 3], [2, 3, 4], [3, 4, 4]]
    assert len(IncidentCreate(summary=" " + "é" * 120, description="a\nb").summary) == 120
    for summary in ("é" * 121, " ", "invalid\x00"):
        with pytest.raises(ValueError):
            IncidentCreate(summary=summary, description="valid")
