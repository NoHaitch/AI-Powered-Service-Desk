from ipaddress import IPv4Address, IPv6Address
from pathlib import Path
from typing import Annotated, Literal, Self
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, StringConstraints, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

Secret = Annotated[SecretStr, Field(min_length=1)]
DatabaseIdentifier = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_]{0,62}$")]
Port = Annotated[int, Field(ge=1, le=65535)]
secrets_dir = Path("/run/secrets")


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DESK_", hide_input_in_errors=True)

    db_host: str = "127.0.0.1"
    db_port: Port = 5432
    db_name: DatabaseIdentifier = "service_desk"
    db_password: Secret

    def database_url(self, user: str) -> URL:
        return URL.create(
            "postgresql+psycopg",
            username=user,
            password=self.db_password.get_secret_value(),
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        )


class Settings(DatabaseSettings):
    db_user: DatabaseIdentifier = "desk_runtime"
    db_pool_size: int = Field(default=5, ge=1, le=25)
    db_pool_timeout_seconds: float = Field(default=2, gt=0, le=30)
    db_connect_timeout_seconds: int = Field(default=2, ge=2, le=30)
    db_statement_timeout_ms: int = Field(default=2000, ge=1, le=60_000)
    db_lock_timeout_ms: int = Field(default=1000, ge=1, le=60_000)
    redis_host: str = "127.0.0.1"
    redis_port: Port = 6379
    redis_user: DatabaseIdentifier = "desk"
    redis_password: Secret
    redis_max_connections: int = Field(default=5, ge=1, le=25)
    probe_timeout_seconds: float = Field(default=2.5, gt=0, le=30)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    swagger_enabled: bool = False
    swagger_assets: Path = Path("/app/swagger")
    auth_enabled: bool = False
    auth_origin: str = "https://localhost:8443"
    auth_proxy_peer: IPv4Address | IPv6Address = IPv4Address("127.0.0.1")
    auth_access_keys: SecretStr | None = None
    auth_refresh_keys: SecretStr | None = None
    auth_csrf_keys: SecretStr | None = None
    auth_limiter_key: SecretStr | None = None
    auth_access_seconds: int = Field(default=600, ge=1, le=600)
    auth_idle_seconds: int = Field(default=86400, ge=2, le=86400)
    auth_absolute_seconds: int = Field(default=604800, ge=2, le=604800)
    auth_hash_workers: int = Field(default=2, ge=1, le=8)
    auth_login_total: int = Field(default=120, ge=1, le=10000)
    auth_login_source: int = Field(default=60, ge=1, le=10000)
    auth_login_identifier_source: int = Field(default=5, ge=1, le=1000)
    auth_login_signal: int = Field(default=15, ge=1, le=1000)
    auth_refresh_total: int = Field(default=300, ge=1, le=10000)
    auth_refresh_source: int = Field(default=30, ge=1, le=10000)
    auth_refresh_family: int = Field(default=6, ge=1, le=1000)
    auth_admission_window_seconds: int = Field(default=60, ge=1, le=60)
    auth_login_window_seconds: int = Field(default=300, ge=1, le=300)
    auth_signal_window_seconds: int = Field(default=900, ge=1, le=900)
    auth_recovery_seconds: int = Field(default=300, ge=1, le=3600)

    @model_validator(mode="after")
    def validate_authentication(self) -> Self:
        if not self.auth_enabled:
            return self
        origin = urlsplit(self.auth_origin)
        if (
            origin.scheme != "https"
            or not origin.hostname
            or origin.username is not None
            or self.auth_origin != f"https://{origin.netloc}"
            or origin.port == 443
            or self.auth_origin != self.auth_origin.lower()
        ):
            raise ValueError("Authentication requires a canonical HTTPS origin.")
        if not self.auth_access_seconds < self.auth_idle_seconds <= self.auth_absolute_seconds:
            raise ValueError("Invalid credential lifetimes.")
        if self.auth_recovery_seconds < max(
            self.auth_admission_window_seconds, self.auth_login_window_seconds
        ):
            raise ValueError("Limiter recovery must cover the longest enforced window.")
        return self


class MigrationSettings(DatabaseSettings):
    db_user: DatabaseIdentifier = "desk_migrator"


def load_settings() -> Settings:
    return Settings(_secrets_dir=secrets_dir if secrets_dir.is_dir() else None)  # type: ignore[call-arg]


def load_migration_settings() -> MigrationSettings:
    return MigrationSettings(  # type: ignore[call-arg]
        _secrets_dir=secrets_dir if secrets_dir.is_dir() else None,
    )
