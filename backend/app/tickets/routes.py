"""Authorized M1 incident intake, tracking, and triage."""

from datetime import datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import and_, exists, func, insert, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.audit.models import IncidentAuditEvent
from app.core.database import database_session
from app.identity.models import Role, User, UserRole
from app.identity.session import require_browser
from app.tickets.models import IncidentDetail, QueueMembership, SupportQueue, Ticket
from app.tickets.schemas import IncidentCreate, IncidentTriage

router = APIRouter(prefix="/api/v1", tags=["Incidents"])
Session = Annotated[AsyncSession, Depends(database_session)]

PRIORITIES = {
    "high": {"high": 1, "medium": 2, "low": 3},
    "medium": {"high": 2, "medium": 3, "low": 4},
    "low": {"high": 3, "medium": 4, "low": 4},
}


class IncidentSummary(BaseModel):
    id: UUID
    reference: str
    summary: str
    status: str
    priority: int | None
    created_at: datetime
    updated_at: datetime


class IncidentView(IncidentSummary):
    description: str


class StaffIncident(IncidentView):
    queue: str
    prompt_review: bool
    impact: str | None
    urgency: str | None


def summary(ticket: Ticket, detail: IncidentDetail) -> IncidentSummary:
    return IncidentSummary(
        id=ticket.id,
        reference=ticket.reference,
        summary=ticket.summary,
        status=detail.status,
        priority=detail.priority,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
    )


def view(ticket: Ticket, detail: IncidentDetail) -> IncidentView:
    return IncidentView(**summary(ticket, detail).model_dump(), description=ticket.description)


def staff_view(ticket: Ticket, detail: IncidentDetail, queue: str) -> StaffIncident:
    return StaffIncident(
        **view(ticket, detail).model_dump(),
        queue=queue,
        prompt_review=detail.prompt_review,
        impact=detail.impact,
        urgency=detail.urgency,
    )


def has_role(user: UUID, role: str) -> ColumnElement[bool]:
    return exists(
        select(User.id)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, UserRole.role_id == Role.id)
        .where(User.id == user, User.disabled_at.is_(None), Role.code == role)
    )


def has_l1_membership(user: UUID, queue_id: ColumnElement[UUID]) -> ColumnElement[bool]:
    return and_(
        has_role(user, "agent"),
        exists(
            select(QueueMembership.user_id).where(
                QueueMembership.user_id == user,
                QueueMembership.queue_id == queue_id,
            )
        ),
    )


@router.post("/incidents", status_code=201, response_model=IncidentView)
async def create_incident(form: IncidentCreate, request: Request, db: Session) -> IncidentView:
    async with db.begin():
        actor = (await require_browser(request, db, mutation=True)).identity
        if "employee" not in actor.roles:
            raise HTTPException(403)
        queue_id = await db.scalar(select(SupportQueue.id).where(SupportQueue.code == "l1"))
        if queue_id is None:
            raise HTTPException(503)
        ticket = await db.scalar(
            insert(Ticket)
            .values(
                id=uuid4(),
                requester_id=actor.id,
                queue_id=queue_id,
                summary=form.summary,
                description=form.description,
            )
            .returning(Ticket)
        )
        assert ticket is not None
        detail = await db.scalar(
            insert(IncidentDetail)
            .values(
                ticket_id=ticket.id,
                prompt_review=form.prompt_review,
            )
            .returning(IncidentDetail)
        )
        assert detail is not None
        db.add(
            IncidentAuditEvent(
                ticket_id=ticket.id,
                actor_id=actor.id,
                request_id=UUID(request.state.request_id),
                action="submitted",
                resulting_status="new",
            )
        )
        return view(ticket, detail)


@router.get("/incidents", response_model=list[IncidentSummary])
async def list_incidents(
    request: Request,
    db: Session,
    offset: Annotated[int, Query(ge=0, le=1_000_000)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[IncidentSummary]:
    actor = (await require_browser(request, db)).identity
    if "employee" not in actor.roles:
        raise HTTPException(403)
    rows = (
        await db.execute(
            select(Ticket, IncidentDetail)
            .join(IncidentDetail, IncidentDetail.ticket_id == Ticket.id)
            .where(Ticket.requester_id == actor.id, has_role(actor.id, "employee"))
            .order_by(Ticket.created_at.desc(), Ticket.id.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return [summary(ticket, detail) for ticket, detail in rows]


@router.get("/incidents/{ticket_id}", response_model=StaffIncident | IncidentView)
async def read_incident(ticket_id: UUID, request: Request, db: Session) -> IncidentView:
    user = (await require_browser(request, db)).identity.id
    staff = and_(SupportQueue.code == "l1", has_l1_membership(user, SupportQueue.id.expression))
    row = (
        await db.execute(
            select(Ticket, IncidentDetail, SupportQueue.code, staff.label("staff"))
            .join(IncidentDetail, IncidentDetail.ticket_id == Ticket.id)
            .join(SupportQueue, SupportQueue.id == Ticket.queue_id)
            .where(
                Ticket.id == ticket_id,
                or_(
                    staff,
                    and_(Ticket.requester_id == user, has_role(user, "employee")),
                ),
            )
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(404)
    ticket, detail, code, allowed_staff = row
    return staff_view(ticket, detail, code) if allowed_staff else view(ticket, detail)


@router.get("/queues/l1/incidents", response_model=list[StaffIncident])
async def list_intake(
    request: Request,
    db: Session,
    flagged_only: bool = False,
    offset: Annotated[int, Query(ge=0, le=1_000_000)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[StaffIncident]:
    actor = (await require_browser(request, db)).identity
    queue_id = await db.scalar(
        select(SupportQueue.id).where(
            SupportQueue.code == "l1",
            has_l1_membership(actor.id, SupportQueue.id.expression),
        )
    )
    if queue_id is None:
        raise HTTPException(403)
    query = (
        select(Ticket, IncidentDetail)
        .join(IncidentDetail, IncidentDetail.ticket_id == Ticket.id)
        .where(
            Ticket.queue_id == queue_id,
            IncidentDetail.status == "new",
            has_l1_membership(actor.id, Ticket.queue_id.expression),
        )
    )
    if flagged_only:
        query = query.where(IncidentDetail.prompt_review.is_(True))
    rows = (
        await db.execute(query.order_by(Ticket.created_at, Ticket.id).limit(limit).offset(offset))
    ).all()
    return [staff_view(ticket, detail, "l1") for ticket, detail in rows]


@router.post("/incidents/{ticket_id}/triage", response_model=StaffIncident)
async def triage(
    ticket_id: UUID,
    form: IncidentTriage,
    request: Request,
    db: Session,
) -> StaffIncident:
    async with db.begin():
        actor = (await require_browser(request, db, mutation=True)).identity
        queue_id = await db.scalar(
            select(SupportQueue.id).where(
                SupportQueue.code == "l1",
                has_l1_membership(actor.id, SupportQueue.id.expression),
            )
        )
        if queue_id is None:
            raise HTTPException(403)
        record = (
            await db.execute(
                select(Ticket.revision, IncidentDetail.status)
                .join(IncidentDetail, IncidentDetail.ticket_id == Ticket.id)
                .where(Ticket.id == ticket_id, Ticket.queue_id == queue_id)
            )
        ).one_or_none()
        if record is None:
            raise HTTPException(404)
        if record.status != "new":
            raise HTTPException(409)
        updated = await db.scalar(
            update(Ticket)
            .where(
                Ticket.id == ticket_id,
                Ticket.revision == record.revision,
                has_l1_membership(actor.id, Ticket.queue_id.expression),
            )
            .values(revision=Ticket.revision + 1, updated_at=func.clock_timestamp())
            .returning(Ticket)
        )
        if updated is None:
            raise HTTPException(409)
        priority = PRIORITIES[form.impact][form.urgency]
        detail = await db.scalar(
            update(IncidentDetail)
            .where(
                IncidentDetail.ticket_id == ticket_id,
                IncidentDetail.status == "new",
            )
            .values(
                status="triaged",
                impact=form.impact,
                urgency=form.urgency,
                priority=priority,
                triaged_at=updated.updated_at,
            )
            .returning(IncidentDetail)
        )
        if detail is None:
            raise HTTPException(409)
        db.add(
            IncidentAuditEvent(
                ticket_id=ticket_id,
                actor_id=actor.id,
                request_id=UUID(request.state.request_id),
                action="triaged",
                prior_status="new",
                resulting_status="triaged",
                impact=form.impact,
                urgency=form.urgency,
                priority=priority,
            )
        )
        return staff_view(updated, detail, "l1")
