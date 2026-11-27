from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class IncidentAuditEvent(Base):
    __mapper_args__ = {"eager_defaults": False}
    __tablename__ = "incident_audit_events"
    __table_args__ = (
        CheckConstraint(
            "(action = 'submitted' AND prior_status IS NULL AND resulting_status = 'new' "
            "AND impact IS NULL AND urgency IS NULL AND priority IS NULL) OR "
            "(action = 'triaged' AND prior_status IS NOT NULL AND prior_status = 'new' "
            "AND resulting_status = 'triaged' AND impact IS NOT NULL AND urgency IS NOT NULL "
            "AND priority IS NOT NULL AND impact IN ('low', 'medium', 'high') "
            "AND urgency IN ('low', 'medium', 'high') AND priority BETWEEN 1 AND 4)",
            name="ck_incident_audit_events_transition",
        ),
        Index("ix_incident_audit_events_ticket_time", "ticket_id", "occurred_at"),
        Index("ix_incident_audit_events_actor_id", "actor_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    ticket_id: Mapped[UUID] = mapped_column(ForeignKey("desk.incident_details.ticket_id"))
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("desk.users.id"))
    request_id: Mapped[UUID]
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    action: Mapped[str] = mapped_column(Text)
    prior_status: Mapped[str | None] = mapped_column(Text)
    resulting_status: Mapped[str] = mapped_column(Text)
    impact: Mapped[str | None] = mapped_column(Text)
    urgency: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[int | None]


class AuthAuditEvent(Base):
    __mapper_args__ = {"eager_defaults": False}
    __tablename__ = "auth_audit_events"
    __table_args__ = (
        CheckConstraint(
            "action IN ('login', 'refresh', 'reuse', 'logout', 'revoke', 'limiter_recovery')",
            name="ck_auth_audit_events_action",
        ),
        CheckConstraint(
            "outcome IN ('success', 'denied', 'unavailable')", name="ck_auth_audit_events_outcome"
        ),
        Index("ix_auth_audit_events_occurred_at", "occurred_at"),
        Index("ix_auth_audit_events_actor_id", "actor_id"),
        Index("ix_auth_audit_events_family_id", "family_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("desk.users.id"))
    family_id: Mapped[UUID | None] = mapped_column(ForeignKey("desk.refresh_families.id"))
    request_id: Mapped[UUID]
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    action: Mapped[str] = mapped_column(Text)
    outcome: Mapped[str] = mapped_column(Text)
