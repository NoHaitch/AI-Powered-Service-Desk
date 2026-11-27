"""Register persistence metadata for Alembic and schema verification."""

from app.attachments import models as attachments
from app.audit import models as audit
from app.identity import models as identity
from app.tickets import models as tickets

__all__ = ["attachments", "audit", "identity", "tickets"]
