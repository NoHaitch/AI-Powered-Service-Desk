from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, SecretStr, StringConstraints
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


class MigrationSettings(DatabaseSettings):
    db_user: DatabaseIdentifier = "desk_migrator"


def load_settings() -> Settings:
    return Settings(_secrets_dir=secrets_dir if secrets_dir.is_dir() else None)  # type: ignore[call-arg]


def load_migration_settings() -> MigrationSettings:
    return MigrationSettings(  # type: ignore[call-arg]
        _secrets_dir=secrets_dir if secrets_dir.is_dir() else None,
    )
