"""Add private attachment metadata and ticket links."""

import sqlalchemy as sa
from alembic import op

revision = "0003_private_attachments"
down_revision = "0002_m1_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "attachment_quota_guard",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
        sa.CheckConstraint("id = 1", name="ck_attachment_quota_guard_singleton"),
        schema="desk",
    )
    op.execute("INSERT INTO desk.attachment_quota_guard (id) VALUES (1)")
    op.create_table(
        "attachment_objects",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("uploader_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("storage_key", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("media_type", sa.Text(), nullable=False),
        sa.Column("byte_count", sa.BigInteger(), nullable=False),
        sa.Column("sha256", sa.LargeBinary()),
        sa.Column("state", sa.Text(), nullable=False, server_default=sa.text("'reserved'")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(
            ["uploader_id"], ["desk.users.id"], name="fk_attachment_objects_uploader_id"
        ),
        sa.UniqueConstraint("provider", "storage_key", name="uq_attachment_objects_provider_key"),
        sa.CheckConstraint("byte_count > 0", name="ck_attachment_objects_bytes"),
        sa.CheckConstraint(
            "char_length(display_name) BETWEEN 1 AND 180", name="ck_attachment_objects_display_name"
        ),
        sa.CheckConstraint(
            "media_type IN ('image/jpeg', 'image/png', 'text/plain', 'text/csv')",
            name="ck_attachment_objects_media_type",
        ),
        sa.CheckConstraint(
            "expires_at IS NULL OR expires_at > created_at", name="ck_attachment_objects_expiry"
        ),
        sa.CheckConstraint(
            "(state = 'reserved' AND sha256 IS NULL AND expires_at IS NOT NULL) OR "
            "(state = 'staged' AND sha256 IS NOT NULL AND expires_at IS NOT NULL) OR "
            "(state = 'linked' AND sha256 IS NOT NULL AND expires_at IS NULL) OR "
            "(state = 'deleted' AND expires_at IS NULL)",
            name="ck_attachment_objects_state",
        ),
        sa.CheckConstraint(
            "sha256 IS NULL OR octet_length(sha256) = 32", name="ck_attachment_objects_digest"
        ),
        schema="desk",
    )
    op.create_index(
        "ix_attachment_objects_expiring",
        "attachment_objects",
        ["expires_at"],
        schema="desk",
        postgresql_where=sa.text("state IN ('reserved', 'staged')"),
    )
    op.create_index(
        "ix_attachment_objects_uploader_state",
        "attachment_objects",
        ["uploader_id", "state"],
        schema="desk",
    )
    op.create_table(
        "ticket_attachments",
        sa.Column("object_id", sa.Uuid(), primary_key=True),
        sa.Column("ticket_id", sa.Uuid(), nullable=False),
        sa.Column(
            "linked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(
            ["object_id"], ["desk.attachment_objects.id"], name="fk_ticket_attachments_object_id"
        ),
        sa.ForeignKeyConstraint(
            ["ticket_id"], ["desk.tickets.id"], name="fk_ticket_attachments_ticket_id"
        ),
        schema="desk",
    )
    op.create_index(
        "ix_ticket_attachments_ticket_id", "ticket_attachments", ["ticket_id"], schema="desk"
    )
    op.create_table(
        "attachment_audit_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("object_id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid()),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column(
            "occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("action", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["object_id"],
            ["desk.attachment_objects.id"],
            name="fk_attachment_audit_events_object_id",
        ),
        sa.ForeignKeyConstraint(
            ["actor_id"], ["desk.users.id"], name="fk_attachment_audit_events_actor_id"
        ),
        sa.CheckConstraint(
            "action IN ('reserved', 'staged', 'linked', 'cancelled', 'expired')",
            name="ck_attachment_audit_events_action",
        ),
        schema="desk",
    )
    op.create_index(
        "ix_attachment_audit_events_object_time",
        "attachment_audit_events",
        ["object_id", "occurred_at"],
        schema="desk",
    )
    op.create_index(
        "ix_attachment_audit_events_actor", "attachment_audit_events", ["actor_id"], schema="desk"
    )
    op.execute("""
        GRANT SELECT ON desk.attachment_quota_guard, desk.attachment_objects,
            desk.ticket_attachments TO desk_runtime
    """)
    op.execute("GRANT UPDATE (id) ON desk.attachment_quota_guard TO desk_runtime")
    op.execute("GRANT INSERT ON desk.attachment_objects TO desk_runtime")
    op.execute(
        "GRANT UPDATE (state, expires_at, sha256) ON desk.attachment_objects TO desk_runtime"
    )
    op.execute("GRANT INSERT (object_id, ticket_id) ON desk.ticket_attachments TO desk_runtime")
    op.execute("""
        GRANT INSERT (id, object_id, actor_id, request_id, action)
        ON desk.attachment_audit_events TO desk_runtime
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT FROM desk.attachment_objects) THEN
                RAISE EXCEPTION 'Downgrade requires an empty attachment schema';
            END IF;
        END
        $$
    """)
    op.drop_table("attachment_audit_events", schema="desk")
    op.drop_table("ticket_attachments", schema="desk")
    op.drop_table("attachment_objects", schema="desk")
    op.drop_table("attachment_quota_guard", schema="desk")
