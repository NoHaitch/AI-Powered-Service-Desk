from contextlib import nullcontext

from alembic import context
from sqlalchemy import create_engine, pool

from app.core import models as models
from app.core.config import load_migration_settings
from app.core.database import Base


def filter_name(name: str | None, kind: str, _parents: object) -> bool:
    return kind != "schema" or name == "desk"


def run() -> None:
    settings = load_migration_settings()
    url = settings.database_url(settings.db_user)
    offline = context.is_offline_mode()
    engine = (
        None
        if offline
        else create_engine(
            url, poolclass=pool.NullPool, hide_parameters=True, connect_args={"connect_timeout": 5}
        )
    )
    try:
        with engine.connect() if engine is not None else nullcontext() as connection:
            context.configure(
                url=url,
                connection=connection,
                literal_binds=offline,
                target_metadata=Base.metadata,
                version_table_schema="desk",
                include_schemas=True,
                include_name=filter_name,
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        if engine is not None:
            engine.dispose()


run()
