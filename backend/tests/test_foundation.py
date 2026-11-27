import asyncio
import json
from pathlib import Path
from uuid import UUID

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError
from redis.exceptions import ConnectionError as RedisConnectionError
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncEngine

from app import health
from app.core import config as settings_module
from app.core.config import Settings
from app.main import create_app


def settings(**overrides: object) -> Settings:
    return Settings.model_validate(
        {
            "db_password": SecretStr("synthetic-db-password"),
            "redis_password": SecretStr("synthetic-redis-password"),
            **overrides,
        }
    )


@pytest.fixture
def app() -> FastAPI:
    application = create_app(settings(probe_timeout_seconds=0.02))

    @application.get("/testing/validate")
    async def checked(count: int) -> dict[str, int]:
        return {"count": count}

    @application.get("/testing/deny")
    async def denied() -> None:
        raise HTTPException(status_code=403, detail="sensitive-detail")

    @application.get("/testing/fail/{name}")
    async def failed(name: str) -> None:
        raise RuntimeError(f"sensitive-exception-text: {name}")

    return application


def test_safe_errors_and_structured_logs(app: FastAPI, capsys: pytest.CaptureFixture[str]) -> None:
    with TestClient(app) as client:
        requests = (
            ("/api/health/live", 200, None),
            ("/testing/validate?count=sensitive-invalid-input", 422, "invalid_request"),
            ("/testing/deny", 403, "forbidden"),
            ("/testing/fail/sensitive-path?token=sensitive-query", 500, "internal_error"),
            ("/api/missing-sensitive-route", 404, "not_found"),
        )
        ids = []
        for route, status, code in requests:
            response = client.get(route, headers={"X-Request-ID": "untrusted-id"})
            assert response.status_code == status
            request_id = response.headers["X-Request-ID"]
            ids.append(UUID(request_id))
            if code:
                assert response.json()["code"] == code
                assert response.json()["request_id"] == request_id
                assert "sensitive-" not in response.text
        assert len(set(ids)) == len(requests)

    output = capsys.readouterr().out
    assert "sensitive-" not in output
    assert "untrusted-id" not in output
    events = [json.loads(line) for line in output.splitlines()]
    assert all(event["service"] == "service-desk-api" for event in events)
    assert any(event.get("route") == "/testing/fail/{name}" for event in events)
    assert any(event.get("error_class") == "RuntimeError" for event in events)
    completed = [event for event in events if event["event"] == "request_completed"]
    assert [event["request_id"] for event in completed] == [str(value) for value in ids]
    assert [event["outcome"] for event in completed] == [
        "success",
        "client_error",
        "client_error",
        "server_error",
        "client_error",
    ]


def test_dependency_outages_are_bounded_and_independent(
    app: FastAPI,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    async def postgres_ok(_engine: AsyncEngine) -> bool:
        return True

    async def postgres_down(_engine: AsyncEngine) -> bool:
        raise OperationalError(None, None, Exception("synthetic-connection-secret"))

    async def redis_down(_redis: object) -> bool:
        raise RedisConnectionError("synthetic-redis-secret")

    async def redis_slow(_redis: object) -> bool:
        await asyncio.sleep(1)
        return True

    monkeypatch.setattr(health, "postgres_ping", postgres_ok)
    monkeypatch.setattr(health, "redis_ping", redis_down)
    with TestClient(app) as client:
        assert client.get("/api/health/ready").json() == {"status": "ok"}
        failed = client.get("/api/health/redis")
        assert failed.status_code == 503
        assert failed.json()["request_id"] == failed.headers["X-Request-ID"]
        assert failed.json()["code"] == "unavailable"
        monkeypatch.setattr(health, "redis_ping", redis_slow)
        assert client.get("/api/health/redis").status_code == 503
        monkeypatch.setattr(health, "postgres_ping", postgres_down)
        assert client.get("/api/health/ready").status_code == 503
        assert client.get("/api/health/live").status_code == 200
    logs = capsys.readouterr().out
    assert "synthetic-connection-secret" not in logs
    assert "synthetic-redis-secret" not in logs
    assert '"error_class": "TimeoutError"' in logs


def test_swagger_is_opt_in_and_same_origin(app: FastAPI, tmp_path: Path) -> None:
    with TestClient(app) as client:
        assert client.get("/api/docs").status_code == 404
        assert client.get("/api/openapi.json").status_code == 404
    (tmp_path / "swagger-ui-bundle.js").write_text("/* test asset */", encoding="utf-8")
    with TestClient(create_app(settings(swagger_enabled=True, swagger_assets=tmp_path))) as client:
        docs = client.get("/api/docs")
        assert docs.status_code == 200
        assert "/api/docs/assets/swagger-ui-bundle.js" in docs.text
        assert "/api/openapi.json" in docs.text
        assert "https://" not in docs.text
        assert client.get("/api/docs/assets/swagger-ui-bundle.js").status_code == 200
        schema = client.get("/api/openapi.json").json()["paths"]
        assert set(schema) == {"/api/health/live", "/api/health/ready", "/api/health/redis"}
        assert "503" in schema["/api/health/ready"]["get"]["responses"]


def test_settings_hide_secrets_and_reject_invalid_limits() -> None:
    config = settings(db_password="contains:/@?reserved")
    url = config.database_url(config.db_user)
    assert url.password == "contains:/@?reserved"
    assert "contains:" not in str(url)
    with pytest.raises(ValidationError) as error:
        settings(db_password="", db_pool_size=0)
    assert {entry["loc"] for entry in error.value.errors()} == {("db_password",), ("db_pool_size",)}


def test_runtime_and_migration_secrets_are_loaded_separately(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings_module, "secrets_dir", tmp_path)
    monkeypatch.delenv("DESK_DB_PASSWORD", raising=False)
    monkeypatch.delenv("DESK_REDIS_PASSWORD", raising=False)
    password_file = tmp_path / "DESK_DB_PASSWORD"
    password_file.write_text("synthetic-migrator\n", encoding="utf-8")
    migration = settings_module.load_migration_settings()
    assert migration.db_user == "desk_migrator"
    assert migration.db_password.get_secret_value() == "synthetic-migrator"
    with pytest.raises(ValidationError):
        settings_module.load_settings()
    password_file.write_text("synthetic-runtime\n", encoding="utf-8")
    (tmp_path / "DESK_REDIS_PASSWORD").write_text("synthetic-redis\n", encoding="utf-8")
    runtime = settings_module.load_settings()
    assert runtime.db_user == "desk_runtime"
    assert runtime.db_password.get_secret_value() == "synthetic-runtime"
