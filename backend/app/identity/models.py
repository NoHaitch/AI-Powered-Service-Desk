from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    LargeBinary,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("username", name="uq_users_username"),
        CheckConstraint(
            """username COLLATE "C" ~ '^[a-z0-9._-]{3,64}$'""",
            name="ck_users_username",
        ),
        CheckConstraint("char_length(btrim(display_name)) BETWEEN 1 AND 120", name="ck_users_name"),
        CheckConstraint("password_hash LIKE '$argon2id$%'", name="ck_users_password_hash"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(Text)
    display_name: Mapped[str] = mapped_column(Text)
    password_hash: Mapped[str] = mapped_column(Text, deferred=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = (
        UniqueConstraint("code", name="uq_roles_code"),
        CheckConstraint("code IN ('employee', 'agent', 'administrator')", name="ck_roles_code"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(Text)


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = (Index("ix_user_roles_role_id", "role_id"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("desk.users.id"), primary_key=True)
    role_id: Mapped[UUID] = mapped_column(ForeignKey("desk.roles.id"), primary_key=True)


class RefreshFamily(Base):
    __tablename__ = "refresh_families"
    __table_args__ = (
        CheckConstraint(
            "authenticated_at <= last_refreshed_at AND last_refreshed_at < idle_expires_at "
            "AND idle_expires_at <= absolute_expires_at",
            name="ck_refresh_families_deadlines",
        ),
        CheckConstraint(
            "(revoked_at IS NULL AND revocation_reason IS NULL) OR "
            "(revoked_at >= authenticated_at AND revoked_at IS NOT NULL "
            "AND revocation_reason IS NOT NULL AND revocation_reason IN "
            "('logout', 'reuse', 'password_changed', 'account_disabled', 'permissions_changed', "
            "'revoke_all', 'administrative'))",
            name="ck_refresh_families_revocation",
        ),
        Index("ix_refresh_families_user_id", "user_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("desk.users.id"))
    authenticated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    idle_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    absolute_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revocation_reason: Mapped[str | None] = mapped_column(Text)


class RefreshCredential(Base):
    __tablename__ = "refresh_credentials"
    __table_args__ = (
        UniqueConstraint("digest", name="uq_refresh_credentials_digest"),
        UniqueConstraint("family_id", "id", name="uq_refresh_credentials_family_id"),
        UniqueConstraint("predecessor_id", name="uq_refresh_credentials_predecessor"),
        ForeignKeyConstraint(
            ["family_id", "predecessor_id"],
            ["desk.refresh_credentials.family_id", "desk.refresh_credentials.id"],
            name="fk_refresh_credentials_predecessor",
        ),
        CheckConstraint("octet_length(digest) = 32", name="ck_refresh_credentials_digest"),
        CheckConstraint(
            "issued_at < expires_at AND (consumed_at IS NULL OR "
            "(consumed_at >= issued_at AND consumed_at < expires_at))",
            name="ck_refresh_credentials_times",
        ),
        CheckConstraint("id <> predecessor_id", name="ck_refresh_credentials_not_self"),
        Index(
            "uq_refresh_credentials_unconsumed",
            "family_id",
            unique=True,
            postgresql_where=text("consumed_at IS NULL"),
        ),
        Index(
            "uq_refresh_credentials_root",
            "family_id",
            unique=True,
            postgresql_where=text("predecessor_id IS NULL"),
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    family_id: Mapped[UUID] = mapped_column(ForeignKey("desk.refresh_families.id"))
    predecessor_id: Mapped[UUID | None]
    digest: Mapped[bytes] = mapped_column(LargeBinary, deferred=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuthLimiterState(Base):
    __tablename__ = "auth_limiter_state"
    __table_args__ = (CheckConstraint("id = 1", name="ck_auth_limiter_state_singleton"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    generation: Mapped[UUID]
    recover_after: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
