#!/usr/bin/env bash
# Disposable PostgreSQL integration suite. Run from any directory after uv sync --locked.
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
scratch=$(mktemp -d)
containers=()
cleanup() {
  for container in "${containers[@]}"; do
    docker rm -f "$container" >/dev/null || true
  done
  rm -rf -- "$scratch"
}
trap cleanup EXIT

export DESK_M1_TEST_ADMIN=synthetic-admin DESK_M1_TEST_RUNTIME=synthetic-runtime
export DESK_M1_TEST_MIGRATOR=synthetic-migrator
export DESK_DB_HOST=127.0.0.1 DESK_DB_NAME=service_desk_test DESK_DB_USER=desk_migrator
export DESK_DB_PASSWORD="$DESK_M1_TEST_MIGRATOR"
mkdir "$scratch/secrets"
printf '%s\n' "$DESK_M1_TEST_RUNTIME" > "$scratch/secrets/desk_runtime_password"
printf '%s\n' "$DESK_M1_TEST_MIGRATOR" > "$scratch/secrets/desk_migration_password"
# The container's postgres user reads synthetic credentials from this mount.
chmod 755 "$scratch/secrets"
chmod 644 "$scratch/secrets/"*
cd "$root/backend"

for path in fresh baseline; do
  container=$(docker run -d --tmpfs /var/lib/postgresql/data -p 127.0.0.1::5432 \
    -e POSTGRES_DB=service_desk_test -e POSTGRES_PASSWORD="$DESK_M1_TEST_ADMIN" \
    -v "$scratch/secrets:/run/secrets:ro" \
    -v "$root/infrastructure/postgres/10-init.sh:/docker-entrypoint-initdb.d/10-init.sh:ro" \
    -v "$root/infrastructure/postgres/20-audit-maintenance.sql:/docker-entrypoint-initdb.d/20-audit-maintenance.sql:ro" \
    postgres:17.12-alpine)
  containers+=("$container")
  for ((attempt=0; attempt<60; attempt++)); do
    if docker exec "$container" pg_isready -h 127.0.0.1 -U postgres -d service_desk_test >/dev/null; then
      break
    fi
    sleep 1
  done
  if ((attempt == 60)); then
    printf 'Isolated PostgreSQL did not become ready.\n' >&2
    exit 1
  fi
  published=$(docker port "$container" 5432/tcp)
  export DESK_DB_PORT="${published##*:}" DESK_M1_TEST_PORT="${published##*:}"

  if [[ "$path" == baseline ]]; then
    uv run --locked alembic upgrade 0001_foundation
  fi
  uv run --locked alembic upgrade head
  uv run --locked alembic check
  if [[ "$path" == fresh ]]; then
    uv run --locked alembic downgrade 0001_foundation
    uv run --locked alembic upgrade head
  fi

  cat > "$scratch/passwords.json" <<'JSON'
{"maya":"Synthetic password for maya","jordan":"Synthetic password for jordan","alex":"Synthetic password for alex","sam":"Synthetic password for sam"}
JSON
  if uv run --locked python -m app.seed --development < "$scratch/passwords.json"; then
    printf 'Seeder accepted an unmarked database.\n' >&2
    exit 1
  fi

  docker exec "$container" psql -X -U postgres -d service_desk_test -v ON_ERROR_STOP=1 \
    -c "COMMENT ON DATABASE service_desk_test IS 'service-desk-development-seed'"
  uv run --locked python -m app.seed --development < "$scratch/passwords.json"
  env -u DESK_DB_HOST -u DESK_DB_NAME -u DESK_DB_USER -u DESK_DB_PASSWORD -u DESK_DB_PORT \
    uv run --locked pytest
  if uv run --locked alembic downgrade 0001_foundation > "$scratch/downgrade.log" 2>&1; then
    printf 'Downgrade accepted a populated database.\n' >&2
    exit 1
  fi
  grep -Eq 'Downgrade requires an empty (M1|attachment) schema' "$scratch/downgrade.log"
done
