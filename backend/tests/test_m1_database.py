"""Opt-in integration tests. Use an isolated, migrated service_desk_test database."""

import os
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from io import BytesIO
from pathlib import Path
from threading import Barrier
from uuid import UUID, uuid4

import psycopg
import pytest
from psycopg import errors
from pwdlib import PasswordHash
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session

from app.attachments.config import AttachmentSettings
from app.attachments.service import AttachmentService
from app.attachments.storage import AttachmentError, LocalStorage
from app.identity.models import User
from app.seed import MARKER, PERSONAS, seed, seed_id
from app.tickets.schemas import IncidentCreate

TICKET_SQL = """
    INSERT INTO desk.tickets (id, requester_id, queue_id, summary, description)
    VALUES (%s, %s, %s, %s, 'Synthetic description') RETURNING reference
"""
INCIDENT_AUDIT_SQL = """
    INSERT INTO desk.incident_audit_events
    (id, ticket_id, actor_id, request_id, action, prior_status, resulting_status,
     impact, urgency, priority)
    VALUES (%s, %s, %s, %s, 'triaged', 'new', 'triaged', 'low', 'high', %s)
"""
CREDENTIAL_SQL = """
    INSERT INTO desk.refresh_credentials
    (id, family_id, predecessor_id, digest, issued_at, expires_at)
    VALUES (%s, %s, %s, %s, %s, %s)
"""


@pytest.fixture(scope="module")
def pg() -> Iterator[dict[str, str | int]]:
    raw_port = os.getenv("DESK_M1_TEST_PORT")
    if not raw_port:
        pytest.skip("Set DESK_M1_TEST_PORT to run PostgreSQL integration tests.")
    settings: dict[str, str | int] = {
        "host": "127.0.0.1",
        "port": int(raw_port),
        "dbname": "service_desk_test",
        "connect_timeout": 5,
    }
    with psycopg.connect(
        **settings, user="postgres", password=os.environ["DESK_M1_TEST_ADMIN"]
    ) as conn:
        marker = conn.execute(
            "SELECT shobj_description(oid, 'pg_database') FROM pg_database "
            "WHERE datname = current_database()"
        ).fetchone()
        assert marker == (MARKER,), "Use an isolated PostgreSQL instance marked for tests."
    yield settings


def connect(pg: dict[str, str | int], login: str = "runtime") -> psycopg.Connection:
    return psycopg.connect(
        **pg,
        user=f"desk_{login}" if login != "admin" else "postgres",
        password=os.environ[f"DESK_M1_TEST_{login.upper()}"],
        options="-c lock_timeout=5000 -c statement_timeout=10000",
    )


def passwords() -> dict[str, str]:
    return {username: f"Synthetic password for {username}" for username, _, _ in PERSONAS}


@pytest.fixture(scope="module")
def seeded(pg: dict[str, str | int]) -> Iterator[None]:
    engine = create_engine(
        URL.create(
            "postgresql+psycopg",
            username="desk_migrator",
            host="127.0.0.1",
            port=int(pg["port"]),
            database="service_desk_test",
            password=os.environ["DESK_M1_TEST_MIGRATOR"],
        ),
        hide_parameters=True,
    )
    with Session(engine) as session, session.begin():
        seed(session, passwords())
    with Session(engine) as session, session.begin():
        user = session.scalar(select(User).where(User.username == "maya"))
        assert user is not None
        original = user.password_hash
        assert PasswordHash.recommended().verify(passwords()["maya"], original)
        user.display_name = "Edited Maya"
        user.disabled_at = datetime.now(UTC)
    with Session(engine) as session, session.begin():
        seed(session, {key: value + " changed" for key, value in passwords().items()})
        user = session.scalar(select(User).where(User.username == "maya"))
        assert user is not None
        assert (user.display_name, user.password_hash) == ("Edited Maya", original)
        assert user.disabled_at is not None
    engine.dispose()
    yield


@pytest.fixture
def ticket(pg: dict[str, str | int], seeded: None) -> UUID:
    ticket_id = uuid4()
    with connect(pg) as conn:
        row = conn.execute(
            TICKET_SQL, (ticket_id, seed_id("user:maya"), seed_id("queue:l1"), "Test")
        ).fetchone()
        assert row and row[0].startswith("INC-")
        conn.execute("INSERT INTO desk.incident_details (ticket_id) VALUES (%s)", (ticket_id,))
    return ticket_id


def test_seed_preserves_rows_and_restricts_queue_access(
    pg: dict[str, str | int], seeded: None
) -> None:
    with connect(pg, "migrator") as conn:
        assert conn.execute("SELECT count(*) FROM desk.users").fetchone() == (4,)
        assert conn.execute("SELECT count(*) FROM desk.tickets").fetchone() == (2,)
        assert conn.execute("SELECT count(*) FROM desk.incident_audit_events").fetchone() == (3,)
        assert conn.execute("SELECT user_id FROM desk.queue_memberships").fetchall() == [
            (seed_id("user:alex"),)
        ]
        assert conn.execute(
            "SELECT revision FROM desk.tickets WHERE id = %s", (seed_id("ticket:monitor"),)
        ).fetchone() == (2,)


def test_ticket_requires_exactly_one_detail_and_valid_assessment(
    pg: dict[str, str | int], ticket: UUID
) -> None:
    with pytest.raises(errors.ForeignKeyViolation), connect(pg) as conn:
        conn.execute(TICKET_SQL, (uuid4(), seed_id("user:maya"), seed_id("queue:l1"), "Orphan"))
    with pytest.raises(errors.UniqueViolation), connect(pg) as conn:
        conn.execute("INSERT INTO desk.incident_details(ticket_id) VALUES (%s)", (ticket,))
    with pytest.raises(errors.CheckViolation), connect(pg) as conn:
        conn.execute(
            "UPDATE desk.incident_details SET status = 'triaged' WHERE ticket_id=%s", (ticket,)
        )
    with pytest.raises(errors.CheckViolation), connect(pg) as conn:
        conn.execute(TICKET_SQL, (uuid4(), seed_id("user:maya"), seed_id("queue:l1"), "\u2003"))
    with pytest.raises(errors.CheckViolation), connect(pg, "migrator") as conn:
        conn.execute(
            "UPDATE desk.tickets SET reference='INC-999999', revision=revision+1 WHERE id=%s",
            (ticket,),
        )
    with pytest.raises(errors.CheckViolation), connect(pg) as conn:
        conn.execute("UPDATE desk.tickets SET updated_at=now() WHERE id=%s", (ticket,))
    with pytest.raises(errors.ForeignKeyViolation), connect(pg, "migrator") as conn:
        conn.execute("DELETE FROM desk.users WHERE id=%s", (seed_id("user:maya"),))


def test_identity_and_membership_constraints(pg: dict[str, str | int], seeded: None) -> None:
    with pytest.raises(errors.CheckViolation), connect(pg, "migrator") as conn:
        conn.execute(
            "INSERT INTO desk.users(id,username,display_name,password_hash) "
            "SELECT %s,'MAYA','Other user',password_hash FROM desk.users WHERE username='maya'",
            (uuid4(),),
        )
    with pytest.raises(errors.UniqueViolation), connect(pg, "migrator") as conn:
        conn.execute(
            "INSERT INTO desk.users(id,username,display_name,password_hash) "
            "SELECT %s,'maya','Other user',password_hash FROM desk.users WHERE username='maya'",
            (uuid4(),),
        )
    with pytest.raises(errors.UniqueViolation), connect(pg, "migrator") as conn:
        conn.execute("INSERT INTO desk.queue_memberships SELECT * FROM desk.queue_memberships")


def test_reference_generation_is_concurrent_and_allows_rollback_gaps(
    pg: dict[str, str | int], seeded: None
) -> None:
    barrier = Barrier(2)

    def allocate(commit: bool) -> str:
        with connect(pg) as conn:
            ticket_id = uuid4()
            row = conn.execute(
                TICKET_SQL, (ticket_id, seed_id("user:maya"), seed_id("queue:l1"), "Concurrent")
            ).fetchone()
            assert row
            conn.execute("INSERT INTO desk.incident_details (ticket_id) VALUES (%s)", (ticket_id,))
            barrier.wait(timeout=8)
            if not commit:
                conn.rollback()
            return str(row[0])

    with ThreadPoolExecutor(max_workers=2) as pool:
        committed, rolled_back = list(pool.map(allocate, [True, False]))
    assert committed != rolled_back
    with connect(pg) as conn:
        assert conn.execute(
            "SELECT reference FROM desk.tickets WHERE reference IN (%s,%s)",
            (committed, rolled_back),
        ).fetchall() == [(committed,)]


def test_revision_race_and_audit_atomicity(pg: dict[str, str | int], ticket: UUID) -> None:
    actor = seed_id("user:alex")
    with pytest.raises(errors.CheckViolation), connect(pg) as conn:
        conn.execute("UPDATE desk.tickets SET revision=2 WHERE id=%s AND revision=1", (ticket,))
        conn.execute(INCIDENT_AUDIT_SQL, (uuid4(), ticket, actor, uuid4(), 8))
    barrier = Barrier(2)

    def try_triage() -> int:
        with connect(pg) as conn:
            assert conn.execute(
                "SELECT revision FROM desk.tickets WHERE id=%s", (ticket,)
            ).fetchone() == (1,)
            barrier.wait(timeout=8)
            count = conn.execute(
                "UPDATE desk.tickets SET revision=revision+1, updated_at=now() "
                "WHERE id=%s AND revision=1",
                (ticket,),
            ).rowcount
            if count:
                conn.execute(
                    "UPDATE desk.incident_details SET status='triaged', impact='low', "
                    "urgency='high', priority=3, triaged_at=now() WHERE ticket_id=%s",
                    (ticket,),
                )
                conn.execute(INCIDENT_AUDIT_SQL, (uuid4(), ticket, actor, uuid4(), 3))
            return count

    with ThreadPoolExecutor(max_workers=2) as pool:
        jobs = [pool.submit(try_triage) for _ in range(2)]
        assert sorted(job.result() for job in jobs) == [0, 1]
    with connect(pg, "migrator") as conn:
        assert conn.execute(
            "SELECT count(*) FROM desk.incident_audit_events WHERE ticket_id=%s", (ticket,)
        ).fetchone() == (1,)


def test_refresh_family_serializes_successors(pg: dict[str, str | int], seeded: None) -> None:
    family, unrelated, first = uuid4(), uuid4(), uuid4()
    now = datetime.now(UTC)
    expires = now + timedelta(hours=1)
    with connect(pg) as conn:
        for key in (family, unrelated):
            conn.execute(
                "INSERT INTO desk.refresh_families "
                "(id,user_id,authenticated_at,last_refreshed_at,"
                "idle_expires_at,absolute_expires_at) "
                "VALUES (%s,%s,%s,%s,%s,%s)",
                (key, seed_id("user:maya"), now, now, expires, expires),
            )
        conn.execute(CREDENTIAL_SQL, (first, family, None, uuid4().bytes * 2, now, expires))
    with pytest.raises(errors.UniqueViolation), connect(pg) as conn:
        conn.execute(CREDENTIAL_SQL, (uuid4(), family, None, uuid4().bytes * 2, now, expires))

    barrier = Barrier(2)

    def rotate() -> bool:
        barrier.wait(timeout=8)
        with connect(pg) as conn:
            conn.execute("SELECT id FROM desk.refresh_families WHERE id=%s FOR UPDATE", (family,))
            consumed = conn.execute(
                "UPDATE desk.refresh_credentials SET consumed_at=%s "
                "WHERE id=%s AND consumed_at IS NULL",
                (now, first),
            ).rowcount
            if consumed:
                conn.execute(
                    CREDENTIAL_SQL, (uuid4(), family, first, uuid4().bytes * 2, now, expires)
                )
            return bool(consumed)

    with ThreadPoolExecutor(max_workers=2) as pool:
        jobs = [pool.submit(rotate) for _ in range(2)]
        assert sorted(job.result() for job in jobs) == [False, True]
    with pytest.raises(errors.UniqueViolation), connect(pg) as conn:
        conn.execute(CREDENTIAL_SQL, (uuid4(), family, first, uuid4().bytes * 2, now, expires))
    with pytest.raises((errors.ForeignKeyViolation, errors.CheckViolation)), connect(pg) as conn:
        conn.execute(CREDENTIAL_SQL, (uuid4(), unrelated, first, uuid4().bytes * 2, now, expires))
    with pytest.raises(errors.CheckViolation), connect(pg) as conn:
        conn.execute("UPDATE desk.refresh_credentials SET consumed_at=NULL WHERE id=%s", (first,))


def test_audit_retention_and_grants(pg: dict[str, str | int], seeded: None) -> None:
    for statement in (
        "SELECT * FROM desk.auth_audit_events",
        "UPDATE desk.auth_audit_events SET outcome='success'",
        "DELETE FROM desk.incident_audit_events",
        "DELETE FROM desk.auth_audit_events",
        "SELECT desk.prune_auth_audit()",
        "CREATE TABLE desk.nope (id int)",
        "INSERT INTO desk.auth_audit_events (occurred_at) VALUES (now())",
    ):
        with pytest.raises(errors.InsufficientPrivilege), connect(pg) as conn:
            conn.execute(statement)
    with connect(pg) as conn:
        conn.execute(
            "INSERT INTO desk.auth_audit_events (id,request_id,action,outcome) "
            "VALUES (%s,%s,'login','denied')",
            (uuid4(), uuid4()),
        )
    with connect(pg, "migrator") as conn:
        conn.execute(
            "INSERT INTO desk.auth_audit_events (id,request_id,action,outcome,occurred_at) "
            "VALUES (%s,%s,'login','denied',now()-interval '91 days'),"
            "(%s,%s,'login','denied',now()-interval '89 days')",
            (uuid4(), uuid4(), uuid4(), uuid4()),
        )
    with connect(pg, "admin") as conn:
        conn.execute("SET ROLE desk_audit_maintenance")
        assert conn.execute("SELECT desk.prune_auth_audit()").fetchone() == (1,)
        conn.execute("RESET ROLE")
        assert conn.execute("SELECT count(*) FROM desk.auth_audit_events").fetchone() == (2,)
        assert conn.execute("SELECT count(*) FROM desk.incident_audit_events").fetchone()[0] >= 3
    with pytest.raises(errors.InsufficientPrivilege), connect(pg, "admin") as conn:
        conn.execute("SET ROLE desk_audit_maintenance")
        conn.execute("DELETE FROM desk.incident_audit_events")


def test_request_schema_matches_incident_storage_boundary() -> None:
    accepted = IncidentCreate(summary="\ufeff\u2003hello ", description="\n`Example`\n")
    assert (accepted.summary, accepted.description, accepted.prompt_review) == (
        "hello",
        "`Example`",
        False,
    )
    with pytest.raises(ValidationError):
        IncidentCreate.model_validate({"summary": "a", "description": "b", "priority": 1})


def test_attachment_staging_claim_rollback_expiry_and_audit(
    pg: dict[str, str | int], ticket: UUID, tmp_path: Path
) -> None:
    port = int(pg["port"])
    engine = create_engine(
        URL.create(
            "postgresql+psycopg",
            username="desk_runtime",
            host="127.0.0.1",
            port=port,
            database="service_desk_test",
            password=os.environ["DESK_M1_TEST_RUNTIME"],
        )
    )
    service = AttachmentService(
        AttachmentSettings(root=tmp_path, min_free_bytes=0), LocalStorage(tmp_path, 0)
    )
    actor, other, request = seed_id("user:maya"), seed_id("user:jordan"), uuid4()
    raw = b"test attachment"
    with Session(engine) as db, db.begin():
        key = service.reserve(db, actor, request, "notes.txt", "text/plain", len(raw))
        expiry = service.reserve(db, actor, request, "test.csv", "text/csv", len(raw))
    with Session(engine) as db, db.begin():
        with pytest.raises(AttachmentError):
            service.stage(db, key, other, request, BytesIO(raw))
        service.stage(db, key, actor, request, BytesIO(raw))
        service.stage(db, expiry, actor, request, BytesIO(raw))
    with pytest.raises(ValueError), Session(engine) as db, db.begin():
        service.link(db, ticket, actor, request, [key])
        db.flush()
        raise ValueError("simulate an unrelated incident failure")
    with Session(engine) as db, db.begin():
        with pytest.raises(AttachmentError), service.open_linked(db, ticket, key):
            pass
        with pytest.raises(AttachmentError):
            service.link(db, ticket, other, request, [key])
        service.link(db, ticket, actor, request, [key])
    with Session(engine) as db, db.begin():
        with pytest.raises(AttachmentError):
            service.cancel(db, key, actor, request)
        with pytest.raises(AttachmentError), service.open_linked(db, uuid4(), key):
            pass
        with service.open_linked(db, ticket, key) as file:
            assert file.read() == raw
    with connect(pg, "migrator") as conn:
        conn.execute(
            "UPDATE desk.attachment_objects SET created_at=now()-interval '2 days', "
            "expires_at=now()-interval '1 day' WHERE id=%s",
            (expiry,),
        )
    with Session(engine) as db, db.begin():
        assert service.expire(db, request) == 1
        assert len(list(tmp_path.iterdir())) == 2
        assert service.expire(db, request, dry_run=False) == 1
        assert len(list(tmp_path.iterdir())) == 1
    with pytest.raises(errors.InsufficientPrivilege), connect(pg) as conn:
        conn.execute("SELECT * FROM desk.attachment_audit_events")
    with connect(pg, "migrator") as conn:
        assert conn.execute(
            "SELECT action FROM desk.attachment_audit_events "
            "WHERE object_id=%s ORDER BY occurred_at",
            (key,),
        ).fetchall() == [("reserved",), ("staged",), ("linked",)]
    engine.dispose()


def test_attachment_pending_quota_serializes_reservations(
    pg: dict[str, str | int], seeded: None, tmp_path: Path
) -> None:
    engine = create_engine(
        URL.create(
            "postgresql+psycopg",
            username="desk_runtime",
            host="127.0.0.1",
            port=int(pg["port"]),
            database="service_desk_test",
            password=os.environ["DESK_M1_TEST_RUNTIME"],
        ),
        hide_parameters=True,
    )
    service = AttachmentService(
        AttachmentSettings(root=tmp_path, max_pending_count=1),
        LocalStorage(tmp_path, 0),
    )
    barrier = Barrier(2)
    actor = seed_id("user:jordan")

    def reserve() -> bool:
        barrier.wait(timeout=8)
        try:
            with Session(engine) as db, db.begin():
                service.reserve(db, actor, uuid4(), "notes.txt", "text/plain", 1)
        except AttachmentError as exc:
            assert str(exc) == "Attachment quota exceeded."
            return False
        return True

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            jobs = [pool.submit(reserve) for _ in range(2)]
            assert sorted(job.result() for job in jobs) == [False, True]
    finally:
        engine.dispose()
