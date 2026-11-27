"""Opt-in local seed command. Read synthetic passwords from standard input."""

import argparse
import json
import sys
from datetime import UTC, datetime
from uuid import NAMESPACE_URL, UUID, uuid5

from pwdlib import PasswordHash
from sqlalchemy import create_engine, select, text, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.audit.models import IncidentAuditEvent
from app.core.config import load_migration_settings
from app.identity.models import Role, User, UserRole
from app.tickets.models import IncidentDetail, QueueMembership, SupportQueue, Ticket

PERSONAS = (
    ("maya", "Maya Chen", "employee"),
    ("jordan", "Jordan Lee", "employee"),
    ("alex", "Alex Morgan", "agent"),
    ("sam", "Sam Rivera", "administrator"),
)
MARKER = "service-desk-development-seed"
SEED_LOCK = 876189423


def seed_id(name: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"urn:service-desk:development:{name}")


def read_passwords() -> dict[str, str]:
    raw = json.loads(sys.stdin.read(8193))
    if not isinstance(raw, dict) or raw.keys() != {username for username, _, _ in PERSONAS}:
        raise ValueError("Supply one private password for each synthetic persona.")
    passwords: dict[str, str] = {}
    for name, value in raw.items():
        if not isinstance(value, str) or not 12 <= len(value) <= 128 or not value.strip():
            raise ValueError("Synthetic passwords must contain 12–128 characters.")
        passwords[name] = value
    if len(set(passwords.values())) != len(PERSONAS):
        raise ValueError("Use a distinct password for each synthetic persona.")
    return passwords


def seed(session: Session, passwords: dict[str, str]) -> None:
    marker = session.scalar(
        text(
            "SELECT shobj_description(oid, 'pg_database') FROM pg_database "
            "WHERE datname = current_database()"
        )
    )
    if marker != MARKER:
        raise ValueError("This database is not marked for development seeding.")
    session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": SEED_LOCK})

    roles: dict[str, Role] = {}
    for code in ("employee", "agent", "administrator"):
        role = session.scalar(select(Role).where(Role.code == code))
        if role is None:
            role = Role(id=seed_id(f"role:{code}"), code=code)
            session.add(role)
        roles[code] = role
    queue = session.scalar(select(SupportQueue).where(SupportQueue.code == "l1"))
    if queue is None:
        queue = SupportQueue(id=seed_id("queue:l1"), code="l1", name="L1 intake", tier=1)
        session.add(queue)
    session.flush()

    hasher = PasswordHash.recommended()
    for username, display_name, role_code in PERSONAS:
        user_id = seed_id(f"user:{username}")
        if session.get(User, user_id) is not None:
            continue
        if session.scalar(select(User.id).where(User.username == username)) is not None:
            raise ValueError("A synthetic username is already used by a different account.")
        session.add(
            User(
                id=user_id,
                username=username,
                display_name=display_name,
                password_hash=hasher.hash(passwords[username]),
            )
        )
        session.flush()
        session.add(UserRole(user_id=user_id, role_id=roles[role_code].id))
        if role_code == "agent":
            session.add(QueueMembership(user_id=user_id, queue_id=queue.id))
    session.flush()

    for key, username, summary, description, flagged, triaged in (
        (
            "vpn",
            "maya",
            "VPN disconnects when switching networks",
            "The demo VPN disconnects after switching wireless networks.",
            True,
            False,
        ),
        (
            "monitor",
            "jordan",
            "External monitor displays no signal",
            "The demo workstation cannot detect its external display.",
            False,
            True,
        ),
    ):
        ticket_id = seed_id(f"ticket:{key}")
        if session.get(Ticket, ticket_id) is not None:
            continue
        requester = seed_id(f"user:{username}")
        now = datetime.now(UTC)
        session.add(
            Ticket(
                id=ticket_id,
                requester_id=requester,
                queue_id=queue.id,
                summary=summary,
                description=description,
                created_at=now,
                updated_at=now,
            )
        )
        session.flush()
        session.add(
            IncidentDetail(
                ticket_id=ticket_id,
                prompt_review=flagged,
                status="triaged" if triaged else "new",
                impact="low" if triaged else None,
                urgency="high" if triaged else None,
                priority=3 if triaged else None,
                triaged_at=now if triaged else None,
            )
        )
        session.flush()
        session.add(
            IncidentAuditEvent(
                ticket_id=ticket_id,
                actor_id=requester,
                request_id=seed_id(f"submit:{key}"),
                occurred_at=now,
                action="submitted",
                resulting_status="new",
            )
        )
        if triaged:
            session.execute(
                update(Ticket).where(Ticket.id == ticket_id).values(revision=2, updated_at=now)
            )
            session.add(
                IncidentAuditEvent(
                    ticket_id=ticket_id,
                    actor_id=seed_id("user:alex"),
                    request_id=seed_id(f"triage:{key}"),
                    occurred_at=now,
                    action="triaged",
                    prior_status="new",
                    resulting_status="triaged",
                    impact="low",
                    urgency="high",
                    priority=3,
                )
            )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--development", action="store_true", help="Opt in to development seeding.")
    if not parser.parse_args().development:
        parser.error("--development is required.")
    try:
        passwords = read_passwords()
        config = load_migration_settings()
        if config.db_host not in {"localhost", "127.0.0.1", "::1", "postgres"}:
            raise ValueError("Use local PostgreSQL for development seeding.")
        if config.db_user != "desk_migrator":
            raise ValueError("Use the dedicated migration login for development seeding.")
        engine = create_engine(config.database_url(config.db_user), hide_parameters=True)
        try:
            with Session(engine) as session, session.begin():
                seed(session, passwords)
        finally:
            engine.dispose()
    except ValueError, SQLAlchemyError:
        raise SystemExit(
            "Seed failed. Check the marked local target, migrations and private input."
        ) from None
    print("Development seed complete.")


if __name__ == "__main__":
    main()
