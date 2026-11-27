from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AttachmentQuotaGuard(Base):
    __tablename__ = "attachment_quota_guard"
    __table_args__ = (CheckConstraint("id = 1", name="ck_attachment_quota_guard_singleton"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)


class AttachmentObject(Base):
    __tablename__ = "attachment_objects"
    __table_args__ = (
        UniqueConstraint("provider", "storage_key", name="uq_attachment_objects_provider_key"),
        CheckConstraint("byte_count > 0", name="ck_attachment_objects_bytes"),
        CheckConstraint(
            "char_length(display_name) BETWEEN 1 AND 180",
            name="ck_attachment_objects_display_name",
        ),
        CheckConstraint(
            "media_type IN ('image/jpeg', 'image/png', 'text/plain', 'text/csv')",
            name="ck_attachment_objects_media_type",
        ),
        CheckConstraint(
            "expires_at IS NULL OR expires_at > created_at",
            name="ck_attachment_objects_expiry",
        ),
        CheckConstraint(
            "(state = 'reserved' AND sha256 IS NULL AND expires_at IS NOT NULL) OR "
            "(state = 'staged' AND sha256 IS NOT NULL AND expires_at IS NOT NULL) OR "
            "(state = 'linked' AND sha256 IS NOT NULL AND expires_at IS NULL) OR "
            "(state = 'deleted' AND expires_at IS NULL)",
            name="ck_attachment_objects_state",
        ),
        CheckConstraint(
            "sha256 IS NULL OR octet_length(sha256) = 32", name="ck_attachment_objects_digest"
        ),
        Index(
            "ix_attachment_objects_expiring",
            "expires_at",
            postgresql_where=text("state IN ('reserved', 'staged')"),
        ),
        Index("ix_attachment_objects_uploader_state", "uploader_id", "state"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    uploader_id: Mapped[UUID] = mapped_column(ForeignKey("desk.users.id"))
    provider: Mapped[str] = mapped_column(Text)
    storage_key: Mapped[UUID]
    display_name: Mapped[str] = mapped_column(Text)
    media_type: Mapped[str] = mapped_column(Text)
    byte_count: Mapped[int] = mapped_column(BigInteger)
    sha256: Mapped[bytes | None]
    state: Mapped[str] = mapped_column(Text, server_default=text("'reserved'"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"
    __table_args__ = (Index("ix_ticket_attachments_ticket_id", "ticket_id"),)

    object_id: Mapped[UUID] = mapped_column(
        ForeignKey("desk.attachment_objects.id"), primary_key=True
    )
    ticket_id: Mapped[UUID] = mapped_column(ForeignKey("desk.tickets.id"))
    linked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AttachmentAuditEvent(Base):
    __tablename__ = "attachment_audit_events"
    __mapper_args__ = {"eager_defaults": False}
    __table_args__ = (
        CheckConstraint(
            "action IN ('reserved', 'staged', 'linked', 'cancelled', 'expired')",
            name="ck_attachment_audit_events_action",
        ),
        Index("ix_attachment_audit_events_object_time", "object_id", "occurred_at"),
        Index("ix_attachment_audit_events_actor", "actor_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    object_id: Mapped[UUID] = mapped_column(ForeignKey("desk.attachment_objects.id"))
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("desk.users.id"))
    request_id: Mapped[UUID]
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    action: Mapped[str] = mapped_column(Text)
