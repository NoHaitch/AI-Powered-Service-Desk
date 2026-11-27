"""Create M1 service desk schema

Revision ID: 0002_m1_schema
Revises: 0001_foundation
Create Date: 2026-11-27 20:47:44.628003
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_m1_schema"
down_revision: str | Sequence[str] | None = "0001_foundation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE desk.incident_reference_seq AS bigint NO CYCLE")
    op.execute("""
        CREATE FUNCTION desk.next_incident_reference() RETURNS text
        LANGUAGE SQL VOLATILE SET search_path = pg_catalog, pg_temp
        AS $$
            SELECT 'INC-' || lpad(n::text, greatest(6, length(n::text)), '0')
            FROM nextval('desk.incident_reference_seq'::regclass) AS n
        $$
    """)
    op.create_table(
        "auth_limiter_state",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("generation", sa.Uuid(), nullable=False),
        sa.Column("recover_after", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("id = 1", name="ck_auth_limiter_state_singleton"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_limiter_state")),
        schema="desk",
    )
    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.CheckConstraint("code IN ('employee', 'agent', 'administrator')", name="ck_roles_code"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_roles")),
        sa.UniqueConstraint("code", name="uq_roles_code"),
        schema="desk",
    )
    op.create_table(
        "support_queues",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("tier", sa.Integer(), nullable=False),
        sa.CheckConstraint("tier = 1", name="ck_support_queues_m1_tier"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_support_queues")),
        sa.UniqueConstraint("code", name="uq_support_queues_code"),
        schema="desk",
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("password_hash LIKE '$argon2id$%'", name="ck_users_password_hash"),
        sa.CheckConstraint(
            "char_length(btrim(display_name)) BETWEEN 1 AND 120", name="ck_users_name"
        ),
        sa.CheckConstraint(
            "username COLLATE \"C\" ~ '^[a-z0-9._-]{3,64}$'", name="ck_users_username"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("username", name="uq_users_username"),
        schema="desk",
    )
    op.create_table(
        "queue_memberships",
        sa.Column("queue_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["queue_id"], ["desk.support_queues.id"], name=op.f("fk_queue_memberships_queue_id")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["desk.users.id"], name=op.f("fk_queue_memberships_user_id")
        ),
        sa.PrimaryKeyConstraint("queue_id", "user_id", name=op.f("pk_queue_memberships")),
        schema="desk",
    )
    op.create_index(
        "ix_queue_memberships_user_id",
        "queue_memberships",
        ["user_id"],
        unique=False,
        schema="desk",
    )
    op.create_table(
        "refresh_families",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("authenticated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_refreshed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("idle_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("absolute_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revocation_reason", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "(revoked_at IS NULL AND revocation_reason IS NULL) OR (revoked_at >= "
            "authenticated_at AND revoked_at IS NOT NULL AND revocation_reason IS NOT NULL "
            "AND revocation_reason IN ('logout', 'reuse', 'password_changed', "
            "'account_disabled', 'permissions_changed', 'revoke_all', 'administrative'))",
            name="ck_refresh_families_revocation",
        ),
        sa.CheckConstraint(
            "authenticated_at <= last_refreshed_at AND last_refreshed_at < idle_expires_at "
            "AND idle_expires_at <= absolute_expires_at",
            name="ck_refresh_families_deadlines",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["desk.users.id"], name=op.f("fk_refresh_families_user_id")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_families")),
        schema="desk",
    )
    op.create_index(
        "ix_refresh_families_user_id", "refresh_families", ["user_id"], unique=False, schema="desk"
    )
    op.create_table(
        "tickets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.Text(), server_default=sa.text("'incident'"), nullable=False),
        sa.Column(
            "reference",
            sa.Text(),
            server_default=sa.text("desk.next_incident_reference()"),
            nullable=False,
        ),
        sa.Column("requester_id", sa.Uuid(), nullable=False),
        sa.Column("queue_id", sa.Uuid(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("revision", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "description = btrim(description, "
            "U&'\\0009\\000A\\000B\\000C\\000D\\0020\\00A0\\1680\\2000\\2001\\2002\\2003\\2004\\2005\\2006\\2007\\2008\\2009\\200A\\2028\\2029\\202F\\205F\\3000\\FEFF')"
            " AND char_length(description) BETWEEN 1 AND 4000",
            name="ck_tickets_description",
        ),
        sa.CheckConstraint("kind = 'incident'", name="ck_tickets_m1_kind"),
        sa.CheckConstraint("reference ~ '^INC-[0-9]{6,19}$'", name="ck_tickets_reference"),
        sa.CheckConstraint(
            "summary = btrim(summary, "
            "U&'\\0009\\000A\\000B\\000C\\000D\\0020\\00A0\\1680\\2000\\2001\\2002\\2003\\2004\\2005\\2006\\2007\\2008\\2009\\200A\\2028\\2029\\202F\\205F\\3000\\FEFF')"
            " AND char_length(summary) BETWEEN 1 AND 120",
            name="ck_tickets_summary",
        ),
        sa.CheckConstraint("revision > 0", name="ck_tickets_revision"),
        sa.CheckConstraint("updated_at >= created_at", name="ck_tickets_times"),
        sa.ForeignKeyConstraint(
            ["queue_id"], ["desk.support_queues.id"], name=op.f("fk_tickets_queue_id")
        ),
        sa.ForeignKeyConstraint(
            ["requester_id"], ["desk.users.id"], name=op.f("fk_tickets_requester_id")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tickets")),
        sa.UniqueConstraint("reference", name="uq_tickets_reference"),
        schema="desk",
    )
    op.create_index(
        "ix_tickets_queue_created_id",
        "tickets",
        ["queue_id", "created_at", "id"],
        unique=False,
        schema="desk",
    )
    op.create_index(
        "ix_tickets_requester_created_id",
        "tickets",
        ["requester_id", "created_at", "id"],
        unique=False,
        schema="desk",
    )
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["desk.roles.id"], name=op.f("fk_user_roles_role_id")),
        sa.ForeignKeyConstraint(["user_id"], ["desk.users.id"], name=op.f("fk_user_roles_user_id")),
        sa.PrimaryKeyConstraint("user_id", "role_id", name=op.f("pk_user_roles")),
        schema="desk",
    )
    op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"], unique=False, schema="desk")
    op.create_table(
        "auth_audit_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("family_id", sa.Uuid(), nullable=True),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("outcome", sa.Text(), nullable=False),
        sa.CheckConstraint(
            "action IN ('login', 'refresh', 'reuse', 'logout', 'revoke', 'limiter_recovery')",
            name="ck_auth_audit_events_action",
        ),
        sa.CheckConstraint(
            "outcome IN ('success', 'denied', 'unavailable')", name="ck_auth_audit_events_outcome"
        ),
        sa.ForeignKeyConstraint(
            ["actor_id"], ["desk.users.id"], name=op.f("fk_auth_audit_events_actor_id")
        ),
        sa.ForeignKeyConstraint(
            ["family_id"], ["desk.refresh_families.id"], name=op.f("fk_auth_audit_events_family_id")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_audit_events")),
        schema="desk",
    )
    op.create_index(
        "ix_auth_audit_events_actor_id",
        "auth_audit_events",
        ["actor_id"],
        unique=False,
        schema="desk",
    )
    op.create_index(
        "ix_auth_audit_events_family_id",
        "auth_audit_events",
        ["family_id"],
        unique=False,
        schema="desk",
    )
    op.create_index(
        "ix_auth_audit_events_occurred_at",
        "auth_audit_events",
        ["occurred_at"],
        unique=False,
        schema="desk",
    )
    op.create_table(
        "incident_details",
        sa.Column("ticket_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.Text(), server_default=sa.text("'new'"), nullable=False),
        sa.Column("prompt_review", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("impact", sa.Text(), nullable=True),
        sa.Column("urgency", sa.Text(), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=True),
        sa.Column("triaged_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "(status = 'new' AND impact IS NULL AND urgency IS NULL AND priority IS NULL "
            "AND triaged_at IS NULL) OR (status = 'triaged' AND impact IS NOT NULL AND "
            "urgency IS NOT NULL AND priority IS NOT NULL AND triaged_at IS NOT NULL AND "
            "impact IN ('low', 'medium', 'high') AND urgency IN ('low', 'medium', 'high') "
            "AND priority BETWEEN 1 AND 4)",
            name="ck_incident_details_assessment",
        ),
        sa.ForeignKeyConstraint(
            ["ticket_id"], ["desk.tickets.id"], name=op.f("fk_incident_details_ticket_id")
        ),
        sa.PrimaryKeyConstraint("ticket_id", name=op.f("pk_incident_details")),
        schema="desk",
    )
    op.create_index(
        "ix_incident_details_new_flag",
        "incident_details",
        ["prompt_review", "ticket_id"],
        unique=False,
        schema="desk",
        postgresql_where=sa.text("status = 'new'"),
    )
    op.create_table(
        "refresh_credentials",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("family_id", sa.Uuid(), nullable=False),
        sa.Column("predecessor_id", sa.Uuid(), nullable=True),
        sa.Column("digest", sa.LargeBinary(), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("id <> predecessor_id", name="ck_refresh_credentials_not_self"),
        sa.CheckConstraint(
            "issued_at < expires_at AND (consumed_at IS NULL OR (consumed_at >= issued_at "
            "AND consumed_at < expires_at))",
            name="ck_refresh_credentials_times",
        ),
        sa.CheckConstraint("octet_length(digest) = 32", name="ck_refresh_credentials_digest"),
        sa.ForeignKeyConstraint(
            ["family_id", "predecessor_id"],
            ["desk.refresh_credentials.family_id", "desk.refresh_credentials.id"],
            name="fk_refresh_credentials_predecessor",
        ),
        sa.ForeignKeyConstraint(
            ["family_id"],
            ["desk.refresh_families.id"],
            name=op.f("fk_refresh_credentials_family_id"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_credentials")),
        sa.UniqueConstraint("digest", name="uq_refresh_credentials_digest"),
        sa.UniqueConstraint("family_id", "id", name="uq_refresh_credentials_family_id"),
        sa.UniqueConstraint("predecessor_id", name="uq_refresh_credentials_predecessor"),
        schema="desk",
    )
    op.create_index(
        "uq_refresh_credentials_root",
        "refresh_credentials",
        ["family_id"],
        unique=True,
        schema="desk",
        postgresql_where=sa.text("predecessor_id IS NULL"),
    )
    op.create_index(
        "uq_refresh_credentials_unconsumed",
        "refresh_credentials",
        ["family_id"],
        unique=True,
        schema="desk",
        postgresql_where=sa.text("consumed_at IS NULL"),
    )
    op.create_table(
        "incident_audit_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("ticket_id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("prior_status", sa.Text(), nullable=True),
        sa.Column("resulting_status", sa.Text(), nullable=False),
        sa.Column("impact", sa.Text(), nullable=True),
        sa.Column("urgency", sa.Text(), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "(action = 'submitted' AND prior_status IS NULL AND resulting_status = 'new' "
            "AND impact IS NULL AND urgency IS NULL AND priority IS NULL) OR (action = "
            "'triaged' AND prior_status IS NOT NULL AND prior_status = 'new' AND "
            "resulting_status = 'triaged' AND impact IS NOT NULL AND urgency IS NOT NULL "
            "AND priority IS NOT NULL AND impact IN ('low', 'medium', 'high') AND urgency "
            "IN ('low', 'medium', 'high') AND priority BETWEEN 1 AND 4)",
            name="ck_incident_audit_events_transition",
        ),
        sa.ForeignKeyConstraint(
            ["actor_id"], ["desk.users.id"], name=op.f("fk_incident_audit_events_actor_id")
        ),
        sa.ForeignKeyConstraint(
            ["ticket_id"],
            ["desk.incident_details.ticket_id"],
            name=op.f("fk_incident_audit_events_ticket_id"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_incident_audit_events")),
        schema="desk",
    )
    op.create_index(
        "ix_incident_audit_events_actor_id",
        "incident_audit_events",
        ["actor_id"],
        unique=False,
        schema="desk",
    )
    op.create_index(
        "ix_incident_audit_events_ticket_time",
        "incident_audit_events",
        ["ticket_id", "occurred_at"],
        unique=False,
        schema="desk",
    )
    op.create_foreign_key(
        "fk_tickets_incident_detail",
        "tickets",
        "incident_details",
        ["id"],
        ["ticket_id"],
        source_schema="desk",
        referent_schema="desk",
        deferrable=True,
        initially="DEFERRED",
    )
    op.execute("ALTER SEQUENCE desk.incident_reference_seq OWNED BY desk.tickets.reference")
    op.execute("""
        CREATE FUNCTION desk.guard_ticket_update() RETURNS trigger
        LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
        AS $$
        BEGIN
            IF NEW.reference IS DISTINCT FROM OLD.reference OR NEW.id IS DISTINCT FROM OLD.id
                OR NEW.kind IS DISTINCT FROM OLD.kind THEN
                RAISE EXCEPTION 'Ticket identity is immutable' USING ERRCODE = 'check_violation';
            END IF;
            IF NEW.revision <> OLD.revision + 1 THEN
                RAISE EXCEPTION 'A ticket update must advance its revision'
                    USING ERRCODE = 'check_violation';
            END IF;
            RETURN NEW;
        END
        $$
    """)
    op.execute("""
        CREATE TRIGGER guard_ticket_update BEFORE UPDATE ON desk.tickets
        FOR EACH ROW EXECUTE FUNCTION desk.guard_ticket_update()
    """)
    op.execute("""
        CREATE FUNCTION desk.guard_refresh_lineage() RETURNS trigger
        LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp
        AS $$
        BEGIN
            IF TG_OP = 'UPDATE' THEN
                IF OLD.consumed_at IS NOT NULL AND NEW.consumed_at IS DISTINCT FROM OLD.consumed_at
                THEN
                    RAISE EXCEPTION 'Credential consumption is irreversible'
                        USING ERRCODE = 'check_violation';
                END IF;
            ELSIF NEW.predecessor_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM desk.refresh_credentials AS predecessor
                WHERE predecessor.id = NEW.predecessor_id AND predecessor.family_id = NEW.family_id
                    AND predecessor.consumed_at <= NEW.issued_at
            ) THEN
                RAISE EXCEPTION 'Predecessor must be consumed before issuing its successor'
                    USING ERRCODE = 'check_violation';
            END IF;
            RETURN NEW;
        END
        $$
    """)
    op.execute("""
        CREATE TRIGGER guard_refresh_lineage BEFORE INSERT OR UPDATE OF consumed_at
        ON desk.refresh_credentials FOR EACH ROW EXECUTE FUNCTION desk.guard_refresh_lineage()
    """)
    op.execute("""
        CREATE FUNCTION desk.prune_auth_audit(retention_days integer DEFAULT 90) RETURNS bigint
        LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp
        AS $$
        DECLARE deleted bigint;
        BEGIN
            IF retention_days IS NULL OR retention_days < 1 THEN
                RAISE EXCEPTION 'A positive retention period is required'
                    USING ERRCODE = 'invalid_parameter_value';
            END IF;
            DELETE FROM desk.auth_audit_events
            WHERE occurred_at < statement_timestamp() - make_interval(days => retention_days);
            GET DIAGNOSTICS deleted = ROW_COUNT;
            RETURN deleted;
        END
        $$
    """)
    op.execute("""
        REVOKE EXECUTE ON FUNCTION desk.prune_auth_audit(integer),
            desk.guard_ticket_update(), desk.guard_refresh_lineage(),
            desk.next_incident_reference() FROM PUBLIC
    """)
    op.execute("GRANT USAGE ON SCHEMA desk TO desk_audit_maintenance")
    op.execute("GRANT EXECUTE ON FUNCTION desk.prune_auth_audit(integer) TO desk_audit_maintenance")
    op.execute("GRANT USAGE ON SEQUENCE desk.incident_reference_seq TO desk_runtime")
    op.execute("GRANT EXECUTE ON FUNCTION desk.next_incident_reference() TO desk_runtime")
    op.execute("""
        GRANT SELECT ON desk.users, desk.roles, desk.user_roles, desk.support_queues,
            desk.queue_memberships, desk.tickets, desk.incident_details, desk.refresh_families,
            desk.refresh_credentials, desk.auth_limiter_state TO desk_runtime
    """)
    op.execute("""
        GRANT INSERT (id, requester_id, queue_id, summary, description, revision)
        ON desk.tickets TO desk_runtime
    """)
    op.execute("GRANT UPDATE (revision, updated_at) ON desk.tickets TO desk_runtime")
    op.execute("GRANT INSERT (ticket_id, prompt_review) ON desk.incident_details TO desk_runtime")
    op.execute("""
        GRANT UPDATE (status, impact, urgency, priority, triaged_at)
        ON desk.incident_details TO desk_runtime
    """)
    op.execute("GRANT INSERT ON desk.refresh_families, desk.auth_limiter_state TO desk_runtime")
    op.execute("""
        GRANT UPDATE (last_refreshed_at, idle_expires_at, revoked_at, revocation_reason)
        ON desk.refresh_families TO desk_runtime
    """)
    op.execute("GRANT UPDATE ON desk.auth_limiter_state TO desk_runtime")
    op.execute("""
        GRANT INSERT (id, family_id, predecessor_id, digest, issued_at, expires_at, consumed_at)
        ON desk.refresh_credentials TO desk_runtime
    """)
    op.execute("GRANT UPDATE (consumed_at) ON desk.refresh_credentials TO desk_runtime")
    op.execute("""
        GRANT INSERT (id, ticket_id, actor_id, request_id, action, prior_status,
            resulting_status, impact, urgency, priority) ON desk.incident_audit_events
        TO desk_runtime
    """)
    op.execute("""
        GRANT INSERT (id, actor_id, family_id, request_id, action, outcome)
        ON desk.auth_audit_events TO desk_runtime
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT FROM desk.users) OR EXISTS (SELECT FROM desk.roles)
                OR EXISTS (SELECT FROM desk.support_queues) OR EXISTS (SELECT FROM desk.tickets)
                OR EXISTS (SELECT FROM desk.auth_limiter_state)
                OR EXISTS (SELECT FROM desk.auth_audit_events) THEN
                RAISE EXCEPTION 'Downgrade requires an empty M1 schema';
            END IF;
        END
        $$
    """)
    op.execute("DROP FUNCTION desk.prune_auth_audit(integer)")
    op.execute("REVOKE USAGE ON SCHEMA desk FROM desk_audit_maintenance")
    op.drop_constraint("fk_tickets_incident_detail", "tickets", schema="desk")
    op.drop_table("incident_audit_events", schema="desk")
    op.drop_table("refresh_credentials", schema="desk")
    op.drop_table("incident_details", schema="desk")
    op.drop_table("auth_audit_events", schema="desk")
    op.drop_table("user_roles", schema="desk")
    op.execute("ALTER TABLE desk.tickets ALTER COLUMN reference DROP DEFAULT")
    op.execute("DROP FUNCTION desk.next_incident_reference()")
    op.drop_table("tickets", schema="desk")
    op.execute("DROP FUNCTION desk.guard_ticket_update()")
    op.execute("DROP FUNCTION desk.guard_refresh_lineage()")
    op.drop_table("refresh_families", schema="desk")
    op.drop_table("queue_memberships", schema="desk")
    op.drop_table("users", schema="desk")
    op.drop_table("support_queues", schema="desk")
    op.drop_table("roles", schema="desk")
    op.drop_table("auth_limiter_state", schema="desk")
