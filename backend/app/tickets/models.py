from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# ECMAScript trim characters, shared with the employee preview.
TRIM_CHARS = (
    r"U&'\0009\000A\000B\000C\000D\0020\00A0\1680"
    r"\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'"
)


class SupportQueue(Base):
    __tablename__ = "support_queues"
    __table_args__ = (
        UniqueConstraint("code", name="uq_support_queues_code"),
        CheckConstraint("tier = 1", name="ck_support_queues_m1_tier"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    tier: Mapped[int]


class QueueMembership(Base):
    __tablename__ = "queue_memberships"
    __table_args__ = (Index("ix_queue_memberships_user_id", "user_id"),)

    queue_id: Mapped[UUID] = mapped_column(ForeignKey("desk.support_queues.id"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("desk.users.id"), primary_key=True)


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        UniqueConstraint("reference", name="uq_tickets_reference"),
        CheckConstraint("kind = 'incident'", name="ck_tickets_m1_kind"),
        CheckConstraint("reference ~ '^INC-[0-9]{6,19}$'", name="ck_tickets_reference"),
        CheckConstraint(
            f"summary = btrim(summary, {TRIM_CHARS}) AND char_length(summary) BETWEEN 1 AND 120",
            name="ck_tickets_summary",
        ),
        CheckConstraint(
            f"description = btrim(description, {TRIM_CHARS}) "
            "AND char_length(description) BETWEEN 1 AND 4000",
            name="ck_tickets_description",
        ),
        CheckConstraint("revision > 0", name="ck_tickets_revision"),
        CheckConstraint("updated_at >= created_at", name="ck_tickets_times"),
        Index("ix_tickets_requester_created_id", "requester_id", "created_at", "id"),
        Index("ix_tickets_queue_created_id", "queue_id", "created_at", "id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey(
            "desk.incident_details.ticket_id",
            name="fk_tickets_incident_detail",
            deferrable=True,
            initially="DEFERRED",
            use_alter=True,
        ),
        primary_key=True,
        default=uuid4,
    )
    kind: Mapped[str] = mapped_column(Text, server_default=text("'incident'"))
    reference: Mapped[str] = mapped_column(
        Text, server_default=text("desk.next_incident_reference()")
    )
    requester_id: Mapped[UUID] = mapped_column(ForeignKey("desk.users.id"))
    queue_id: Mapped[UUID] = mapped_column(ForeignKey("desk.support_queues.id"))
    summary: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    revision: Mapped[int] = mapped_column(server_default=text("1"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __mapper_args__ = {"version_id_col": revision}


class IncidentDetail(Base):
    __tablename__ = "incident_details"
    __table_args__ = (
        CheckConstraint(
            "(status = 'new' AND impact IS NULL AND urgency IS NULL AND priority IS NULL "
            "AND triaged_at IS NULL) OR "
            "(status = 'triaged' AND impact IS NOT NULL AND urgency IS NOT NULL "
            "AND priority IS NOT NULL AND triaged_at IS NOT NULL "
            "AND impact IN ('low', 'medium', 'high') AND urgency IN ('low', 'medium', 'high') "
            "AND priority BETWEEN 1 AND 4)",
            name="ck_incident_details_assessment",
        ),
        Index(
            "ix_incident_details_new_flag",
            "prompt_review",
            "ticket_id",
            postgresql_where=text("status = 'new'"),
        ),
    )

    ticket_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("desk.tickets.id"), primary_key=True)
    status: Mapped[str] = mapped_column(Text, server_default=text("'new'"))
    prompt_review: Mapped[bool] = mapped_column(server_default=text("false"))
    impact: Mapped[str | None] = mapped_column(Text)
    urgency: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[int | None]
    triaged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
