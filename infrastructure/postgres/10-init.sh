#!/bin/sh
(
set -eu

export RUNTIME_PASSWORD="$(cat /run/secrets/desk_runtime_password)"
export MIGRATION_PASSWORD="$(cat /run/secrets/desk_migration_password)"
test -n "$RUNTIME_PASSWORD"
test -n "$MIGRATION_PASSWORD"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 <<'SQL'
\getenv db_name POSTGRES_DB
\getenv runtime_password RUNTIME_PASSWORD
\getenv migration_password MIGRATION_PASSWORD
BEGIN;
CREATE ROLE desk_runtime LOGIN PASSWORD :'runtime_password';
CREATE ROLE desk_migrator LOGIN PASSWORD :'migration_password';
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO desk_runtime, desk_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA desk AUTHORIZATION desk_migrator;
GRANT USAGE ON SCHEMA desk TO desk_runtime;
COMMIT;
SQL
)
