# FastAPI backend

The M1 backend authenticates provisioned users, rotates refresh credentials, and authorizes incident intake, tracking, and L1 triage. PostgreSQL owns identity, session lineage, incidents, and audits. Redis enforces authentication limits. See the [browser API contract](../docs/architecture/m0-authentication-design.md#api-contract).

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

### Authentication configuration

The native health-only configuration omits authentication unless `DESK_AUTH_ENABLED=true`. Compose enables it and mounts required `DESK_AUTH_ACCESS_KEYS`, `DESK_AUTH_REFRESH_KEYS`, `DESK_AUTH_CSRF_KEYS`, and `DESK_AUTH_LIMITER_KEY` secret files. Configure the canonical `DESK_AUTH_ORIGIN` and exact `DESK_AUTH_PROXY_PEER` together. See [key formats and rotation](../docs/architecture/m1-authentication.md#secrets-and-rotation).

| Settings | Defaults |
| --- | --- |
| `DESK_AUTH_ACCESS_SECONDS`, `DESK_AUTH_IDLE_SECONDS`, `DESK_AUTH_ABSOLUTE_SECONDS` | 600, 86,400, and 604,800 seconds. The access lifetime is shorter than the idle lifetime, and the idle lifetime is bounded by the absolute lifetime. |
| `DESK_AUTH_HASH_WORKERS` | 2 concurrent Argon2id verifications per API worker. |
| `DESK_AUTH_ADMISSION_WINDOW_SECONDS`, `DESK_AUTH_LOGIN_WINDOW_SECONDS`, `DESK_AUTH_SIGNAL_WINDOW_SECONDS`, `DESK_AUTH_RECOVERY_SECONDS` | 60, 300, 900, and 300 seconds. Recovery covers the longest enforced counter window. |
| `DESK_AUTH_LOGIN_TOTAL`, `DESK_AUTH_LOGIN_SOURCE`, `DESK_AUTH_LOGIN_IDENTIFIER_SOURCE`, `DESK_AUTH_LOGIN_SIGNAL` | 120, 60, 5, and 15 in their respective accepted windows. The signal is advisory. |
| `DESK_AUTH_REFRESH_TOTAL`, `DESK_AUTH_REFRESH_SOURCE`, `DESK_AUTH_REFRESH_FAMILY` | 300, 30, and 6 in the admission window. |

Container settings for auth are distinct from migration credentials. `GET /api/health/auth` checks the durable limiter generation against Redis. Its degradation does not change PostgreSQL readiness or liveness.
