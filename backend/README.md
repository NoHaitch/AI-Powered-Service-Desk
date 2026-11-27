# FastAPI backend

The M1 foundation exposes health checks, local Swagger UI, and a PostgreSQL schema for identity, refresh lineage, incidents, and audits. Application authentication and ticket endpoints remain pending. The React preview still uses synthetic data.

## Local checks

Use Python 3.14.7 and [uv](https://docs.astral.sh/uv/). From `backend/` run:

```sh
uv sync --locked
uv run --locked ruff check . ../scripts
uv run --locked ruff format --check . ../scripts
uv run --locked mypy
uv run --locked pytest
uv audit --locked --python-platform linux
```

The tests exercise the API contract, correlation and redaction, bounded dependency failures, and Swagger access. The [Compose guide](../docs/architecture/local-first.md#run-the-local-stack) covers real service checks.

To launch the API outside Compose, set `DESK_DB_PASSWORD` and `DESK_REDIS_PASSWORD` in the process environment from local secret storage. Set host and port overrides if running services at different addresses. From `backend/`:

```sh
uv run --locked uvicorn app.main:create_app --factory --host 127.0.0.1 --no-access-log --no-proxy-headers
```

On native Windows, add `--loop asyncio:SelectorEventLoop` for Psycopg async connectivity. The reference containers run on Linux.

Liveness and dependency error responses work without connected stores. Swagger is off by default. The Compose image includes the pinned assets, or a native operator can set `DESK_SWAGGER_ENABLED=true` and supply the image's matching files via `DESK_SWAGGER_ASSETS`.

## API and persistence

| Route | Behavior |
| --- | --- |
| `GET /api/health/live` | Process liveness. Independent of both datastores. |
| `GET /api/health/ready` | Bounded PostgreSQL query using runtime credentials. |
| `GET /api/health/redis` | Bounded Redis `PING` using restricted ACL credentials. Limiter behavior will require a separate write and state check. |
| `GET /api/docs`, `GET /api/openapi.json` | Opt-in Swagger UI and its generated OpenAPI contract, with assets served at the same origin. |

Successful health responses have `{"status":"ok"}`. Dependency failures return `503`. Errors have `code`, `message`, and `request_id`. The same server-generated ID appears in `X-Request-ID` and operational logs. JSON logs include the service, event, outcome, and applicable route template, status, duration, and safe error class. They omit actual URLs, headers, cookies, query values, and raw exceptions.

Run Alembic as a separate operation with the migration role. The baseline initializes Alembic history in the `desk` schema. The runtime login has schema usage and no schema creation permission. Revision `0002_m1_schema` adds the domain tables and narrow grants. See the [migration and seed workflow](../docs/architecture/database-schema.md#migration-and-local-seed-workflow) for preparing existing databases, seeding synthetic data, and running the isolated PostgreSQL suite.

## Backend configuration

All values use the `DESK_` prefix. Invalid types, empty required secrets, and values outside the validated bounds fail startup. Compose supplies password files under `/run/secrets`. The conventional host-side defaults below are intended for local development.

| Keys | Defaults and bounds |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | `127.0.0.1`, `5432`, `service_desk`, `desk_runtime`. Alembic defaults to `desk_migrator`. |
| `DB_PASSWORD`, `REDIS_PASSWORD` | Required non-empty secrets. Supply process environment values for native use or the granted Compose files. Alembic requires only its own database secret. |
| `DB_POOL_SIZE`, `DB_POOL_TIMEOUT_SECONDS`, `DB_CONNECT_TIMEOUT_SECONDS` | `5` (1–25), `2` (>0–30 s), `2` (2–30 s). Each process has one pool with no overflow. |
| `DB_STATEMENT_TIMEOUT_MS`, `DB_LOCK_TIMEOUT_MS` | `2000` and `1000` (1–60,000 ms each). |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_USER`, `REDIS_MAX_CONNECTIONS` | `127.0.0.1`, `6379`, `desk`, `5` (1–25). |
| `PROBE_TIMEOUT_SECONDS`, `LOG_LEVEL` | `2.5` (>0–30 s, also Redis socket budget), `INFO` (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `SWAGGER_ENABLED`, `SWAGGER_ASSETS` | `false`, `/app/swagger`. The development Compose override enables Swagger unless explicitly disabled. |

Revisit pool and probe budgets after representative measurements. The [PostgreSQL design](../docs/architecture/postgresql-integration.md) records the accepted transaction boundaries.

Revision `0003_private_attachments` adds the [local storage foundation](../docs/architecture/content-storage.md). The provider is testable independently of the HTTP layer. Attachment routes remain gated on live authorization.
