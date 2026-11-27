# Local-first architecture direction

**Status:** Docker Compose, PostgreSQL, Redis, and same-origin HTTPS are accepted. The reference deployment must run without paid infrastructure or hosted accounts. Public hosting is optional.

## Service boundaries

| Tier | Responsibility | Communication |
| --- | --- | --- |
| Frontend container | Client-rendered React, Vite, and TypeScript UI, built with Bun. | Same-origin HTTPS. Vite proxies API calls in development. Nginx is the preferred local release server and API reverse proxy. |
| Python/FastAPI container | One modular backend owns authorization, ticket and knowledge rules, audit writes, and data access. | HTTP API to the frontend and a private database connection. Compose service names are internal to the container network. |
| PostgreSQL container | Authoritative storage for incidents, users and role mappings, audit events, and later knowledge metadata. | Reachable by the backend on the Compose network. Use a named volume, versioned migrations, and documented backup and restore. |
| Redis container | M1 authentication rate limiting. Caching and optional revocation acceleration are deferred until justified. | Private to FastAPI on the Compose network. Limiter outage blocks login and refresh while unaffected routes remain available. PostgreSQL remains authoritative. |
| Independent ML inference container (later) | Self-host a versioned classifier and return advisory predictions. | An internal HTTP call from FastAPI with a timeout and manual fallback. The inference service does not need direct access to the application database. |

The Compose configuration publishes only the frontend HTTPS port on loopback. The frontend proxy and backend share a dedicated edge network. Only the reserved frontend peer is trusted to assert the source address. The proxy overwrites the internal header with its socket address. PostgreSQL and Redis connect only to the internal data network shared with the backend and the one-shot migration service. Vite and Nginx forward `/api` before the SPA fallback. The API ignores generic forwarding headers and validates the exact HTTPS origin for mutations. See the [frontend decision](../decisions/0002-react-vite-and-bun.md).

The [repository structure standard](../../.agents/rules/REPOSITORY_STRUCTURE.md) defines where these deployables, their configuration, and their tests live.

## Run the local stack

Use a Docker engine in Linux container mode with BuildKit and Compose 2.24.4 or newer, Python 3.14, and [mkcert](https://github.com/FiloSottile/mkcert). Build downloads require access to the image registries and lockfile package sources. The running application and Swagger assets are local.

From the repository root, trust the mkcert CA on your workstation and generate the ignored `.local/` secret files. The setup helper preserves existing credentials and upgrades the known previous Redis ACL. `DESK_LOCAL_SECRET_DIR` selects a separate private directory for isolated Compose projects. Use distinct secrets and browser profiles for different environments.

```sh
mkcert -install
python scripts/setup_local.py
docker compose up -d --wait postgres redis
docker compose --profile tools run --rm --build migrate
docker compose up -d --build --wait
```

For an older PostgreSQL volume, see the [maintenance-role bootstrap](database-schema.md#migration-and-local-seed-workflow) before migrating. An existing Compose project that uses the old edge network may need to be stopped and brought down before starting the new definition. Keep its named volumes. Recreate Redis to load the updated ACL.

Provision accounts explicitly on a [marked development database](database-schema.md#migration-and-local-seed-workflow), then open `https://localhost:8443`. For source watching and local Swagger, use `docker compose -f compose.yaml -f compose.dev.yaml up -d --build --wait` after migration. The release build uses Nginx and disables Swagger by default. `DESK_HTTPS_PORT` selects the loopback port. `DESK_AUTH_ORIGIN` selects the exact accepted HTTPS scheme, hostname, and port. If port forwarding changes the browser origin, configure that origin explicitly and use a certificate trusted by the browser. `DESK_AUTH_PROXY_SUBNET` and `DESK_AUTH_PROXY_PEER` can resolve a conflicting local network allocation.

The named PostgreSQL volume retains durable data. PostgreSQL bootstrap runs only at first initialization. Preserve the associated secrets when preserving the volume. Redis is a bounded, non-evicting ephemeral limiter. See the [authentication operations guide](m1-authentication.md) for startup and recovery timing, security, and internal transport boundaries.

To prepare an encrypted PostgreSQL backup, stream `docker compose exec -T postgres pg_dump -U postgres -d service_desk -Fc` to approved authenticated encryption tooling and store the encrypted output with restricted access. Keep the recovery key separately from the backup. Coordinate PostgreSQL and attachment backups, verify restore on an isolated instance, and follow the [database standards](../../.agents/rules/DATABASE_STANDARDS.md) and [content storage recovery process](content-storage.md).

## Verification record

- PostgreSQL 17.12 and Redis 8.8.0 reported healthy. PostgreSQL readiness and authenticated Redis health passed through the loopback HTTPS entry point. Only the frontend publishes a host port.
- The isolated development database contains 12 accounts, including two disabled accounts. PostgreSQL container recreation preserved all 12 accounts and Alembic revision `0003_private_attachments`. A separately provisioned real login returned the seeded identity, could read its incidents, and signed out successfully.
- `UV_NO_SYNC=1 bash backend/tests/run_m1_postgres.sh` passed 30 tests on each fresh and baseline-upgrade PostgreSQL instance, including migration consistency, seed opt-in and preservation, database constraints, the concurrency guards, and restricted audit privileges. The fixture data and credentials remained independent of the existing unmarked local project.
- The full Nginx HTTPS run passed 17 Python checks across the API and dedicated expiry phases, followed by all three Chromium journeys. Employees submitted and tracked an incident, cross-account and out-of-queue access were denied, and L1 triage produced the expected priority. The browser verified cookie attributes, actual access expiry, cross-tab refresh, sign-out, localized errors, and inert rendering of submitted markup. API checks covered token validation, replay and revocation, CSRF, current queue grants, concurrent operations, audit rollback, Redis counter races and memory exhaustion, PostgreSQL and Redis outages, and redaction.
- The focused Vite Compose HTTPS run passed its TLS and limiter initialization check plus all three Chromium journeys with current accounts and the same FastAPI backend.
- Native Ruff, mypy, ESLint, TypeScript, and 15 Bun tests passed. The locked `uv audit` and Bun advisory checks reported zero known package findings. Local container image vulnerability scanning and sustained release capacity measurement were outside these checks.
- The [HTTPS verification workflow](m1-authentication.md#verification-workflow) uses `bash backend/tests/run_m1_auth_https.sh` for the full release test. The Vite browser run additionally set `DESK_AUTH_TEST_VITE=1` and `DESK_AUTH_TEST_BROWSER_ONLY=1`. TLS 1.2 and 1.3 were negotiated with certificate and hostname verification at the Nginx ingress. The reference PostgreSQL container reported `ssl=off` on its private bridge.

## Persistence and caching

See the [persistence and cache decision](../decisions/0001-postgresql-and-redis.md) for the rationale and consequences. The alternatives considered were:

- **Firebase Auth and Firestore** can reduce managed-service operations and support local development with emulators. Firebase documents that its emulators are intended for development and testing. Using them as the reference self-hosted deployment would leave a gap between local operation and a production-ready setup.
- **SQLite** is a viable embedded alternative for a smaller demonstration. It would remove the separate database tier. A single file is simple to operate, while multiple concurrent writers and the intended client-server deployment make PostgreSQL a stronger fit here.

Keep knowledge files on local storage behind the backend when knowledge management arrives. Treat vector indexes as a later retrieval concern and keep ticket and authorization records in the authoritative database.

The [PostgreSQL integration design](postgresql-integration.md) covers the accepted driver, session lifecycle, migrations, and verification. Runtime and migration database privileges are separate.

## Demo data seeding

Run the [opt-in local seed command](database-schema.md#migration-and-local-seed-workflow) after migrations. It populates a marked development database with synthetic accounts, explicit L1 memberships, and new and triaged incidents. It includes disabled users and agents without queue membership for denied-path checks. The command uses privately supplied passwords and preserves existing fixture edits on reruns.

## Authentication and data policy

FastAPI owns authentication and enforces ownership, queue scope, and permissions. The [authentication decision](../decisions/0003-stateless-access-and-refresh-rotation.md) records the approved token, Redis, and sensitive-operation policies. The [M0 design](m0-authentication-design.md#login-and-record-lifecycle-policy) specifies login normalization, data lifecycle, revocation triggers, and incident policy.

## Observability

The default Compose stack includes application observability foundations. The optional collector and storage candidates, audit boundary, and rollout priorities are described in the [observability architecture](observability.md).

## References

- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Docker Compose networking](https://docs.docker.com/compose/how-tos/networking/)

The backend mounts a private `attachment_data` named volume. See the [content storage architecture](content-storage.md#attachment-foundation) for quotas, lifecycle, and coordinated database and file backup.
