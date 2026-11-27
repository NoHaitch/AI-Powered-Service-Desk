-- Run as a PostgreSQL administrator on existing development clusters before migration.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'desk_audit_maintenance') THEN
        CREATE ROLE desk_audit_maintenance NOLOGIN;
    END IF;
END
$$;
