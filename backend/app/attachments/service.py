"""Storage operations for trusted callers. HTTP authentication and ACLs live above this layer."""

from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from typing import BinaryIO
from uuid import UUID, uuid4

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.tickets.models import Ticket

from .config import AttachmentSettings
from .models import AttachmentAuditEvent, AttachmentObject, AttachmentQuotaGuard, TicketAttachment
from .storage import AttachmentError, StorageProvider, StoredObject
from .validation import validate_content, validate_name


class AttachmentService:
    def __init__(self, settings: AttachmentSettings, storage: StorageProvider) -> None:
        self.settings = settings
        self.storage = storage

    @staticmethod
    def _audit(
        db: Session, object_id: UUID, actor: UUID | None, request_id: UUID, action: str
    ) -> None:
        db.add(
            AttachmentAuditEvent(
                object_id=object_id,
                actor_id=actor,
                request_id=request_id,
                action=action,
            )
        )

    def reserve(
        self, db: Session, actor: UUID, request_id: UUID, filename: str, media_type: str, size: int
    ) -> UUID:
        filename = validate_name(filename, media_type)
        if not 1 <= size <= self.settings.max_file_bytes:
            raise AttachmentError("Invalid attachment size.")

        # Every reservation takes this row lock before reading current usage.
        db.execute(select(AttachmentQuotaGuard).with_for_update()).scalar_one()
        pending_count, pending_bytes = db.execute(
            select(func.count(), func.coalesce(func.sum(AttachmentObject.byte_count), 0)).where(
                AttachmentObject.uploader_id == actor,
                AttachmentObject.state.in_(("reserved", "staged")),
            )
        ).one()
        total = db.scalar(
            select(func.coalesce(func.sum(AttachmentObject.byte_count), 0)).where(
                AttachmentObject.state != "deleted"
            )
        )
        if (
            pending_count >= self.settings.max_pending_count
            or pending_bytes + size > self.settings.max_pending_bytes
            or total is None
            or total + size > self.settings.max_storage_bytes
        ):
            raise AttachmentError("Attachment quota exceeded.")

        now = datetime.now(UTC)
        key = uuid4()
        db.add(
            AttachmentObject(
                id=key,
                uploader_id=actor,
                provider=self.storage.name,
                storage_key=uuid4(),
                display_name=filename,
                media_type=media_type,
                byte_count=size,
                state="reserved",
                created_at=now,
                expires_at=now + timedelta(seconds=self.settings.staging_seconds),
            )
        )
        db.flush()
        self._audit(db, key, actor, request_id, "reserved")
        return key

    def _pending(self, db: Session, object_id: UUID, actor: UUID) -> AttachmentObject:
        row = db.scalar(
            select(AttachmentObject)
            .where(
                AttachmentObject.id == object_id,
                AttachmentObject.uploader_id == actor,
                AttachmentObject.provider == self.storage.name,
                AttachmentObject.state.in_(("reserved", "staged")),
                AttachmentObject.expires_at > func.clock_timestamp(),
            )
            .with_for_update()
        )
        if row is None:
            raise AttachmentError("Attachment is unavailable.")
        return row

    def stage(
        self, db: Session, object_id: UUID, actor: UUID, request_id: UUID, source: BinaryIO
    ) -> None:
        """Stage a bounded local source after its reservation has committed."""
        # Prevent simultaneous decodes/writes for the same uploader across workers.
        db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": f"attachments:{actor}"},
        )
        row = self._pending(db, object_id, actor)
        if row.state == "staged":
            return
        # A prior process may have published bytes without committing the stage.
        self.storage.delete(row.storage_key)
        stored = self.storage.write(
            row.storage_key,
            source,
            row.byte_count,
            lambda file: validate_content(file, row.media_type, self.settings.max_image_pixels),
        )
        row.sha256 = stored.digest
        row.state = "staged"
        self._audit(db, object_id, actor, request_id, "staged")

    def link(
        self,
        db: Session,
        ticket_id: UUID,
        actor: UUID,
        request_id: UUID,
        object_ids: Sequence[UUID],
    ) -> None:
        """Call after checking ticket authorization and lifecycle in the same transaction."""
        if not object_ids:
            return
        if len(object_ids) > self.settings.max_ticket_count or len(set(object_ids)) != len(
            object_ids
        ):
            raise AttachmentError("Invalid attachment selection.")
        db.execute(select(Ticket.id).where(Ticket.id == ticket_id).with_for_update()).scalar_one()
        rows = [self._pending(db, key, actor) for key in sorted(object_ids)]
        if any(row.state != "staged" for row in rows):
            raise AttachmentError("Attachment is unavailable.")
        count, size = db.execute(
            select(func.count(), func.coalesce(func.sum(AttachmentObject.byte_count), 0))
            .join(TicketAttachment, TicketAttachment.object_id == AttachmentObject.id)
            .where(TicketAttachment.ticket_id == ticket_id)
        ).one()
        if (
            count + len(rows) > self.settings.max_ticket_count
            or size + sum(row.byte_count for row in rows) > self.settings.max_ticket_bytes
        ):
            raise AttachmentError("Ticket attachment limit exceeded.")
        for row in rows:
            row.state = "linked"
            row.expires_at = None
            db.add(TicketAttachment(object_id=row.id, ticket_id=ticket_id))
            self._audit(db, row.id, actor, request_id, "linked")

    @contextmanager
    def open_linked(self, db: Session, ticket_id: UUID, object_id: UUID) -> Iterator[BinaryIO]:
        """Verify bytes after the calling operation has authorized the parent ticket."""
        row = db.scalar(
            select(AttachmentObject)
            .join(TicketAttachment, TicketAttachment.object_id == AttachmentObject.id)
            .where(
                TicketAttachment.ticket_id == ticket_id,
                AttachmentObject.id == object_id,
                AttachmentObject.provider == self.storage.name,
                AttachmentObject.state == "linked",
            )
        )
        if row is None or row.sha256 is None or row.byte_count > self.settings.max_file_bytes:
            raise AttachmentError("Attachment is unavailable.")
        with self.storage.open_verified(
            row.storage_key, StoredObject(row.byte_count, row.sha256)
        ) as file:
            yield file

    def _discard(
        self, db: Session, row: AttachmentObject, actor: UUID | None, request_id: UUID, action: str
    ) -> None:
        self.storage.delete(row.storage_key)
        row.expires_at = None
        row.state = "deleted"
        self._audit(db, row.id, actor, request_id, action)

    def cancel(self, db: Session, object_id: UUID, actor: UUID, request_id: UUID) -> None:
        self._discard(db, self._pending(db, object_id, actor), actor, request_id, "cancelled")

    def expire(self, db: Session, request_id: UUID, *, dry_run: bool = True) -> int:
        query = (
            select(AttachmentObject)
            .where(
                AttachmentObject.provider == self.storage.name,
                AttachmentObject.state.in_(("reserved", "staged")),
                AttachmentObject.expires_at <= func.clock_timestamp(),
            )
            .order_by(AttachmentObject.expires_at, AttachmentObject.id)
            .limit(100)
        )
        if not dry_run:
            query = query.with_for_update(skip_locked=True)
        rows = db.scalars(query).all()
        if not dry_run:
            for row in rows:
                self._discard(db, row, None, request_id, "expired")
        return len(rows)
