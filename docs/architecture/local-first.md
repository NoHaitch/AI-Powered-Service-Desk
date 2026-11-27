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

The Compose configuration publishes only the frontend HTTPS port on loopback. The frontend and backend share the edge network. PostgreSQL and Redis connect only to the internal data network shared with the backend and the one-shot migration service. Vite and Nginx forward `/api` before the SPA fallback. This foundation ignores forwarded identity headers. Configure an explicit proxy trust boundary alongside the authentication/IP policy when implementing auth. See the [frontend decision](../decisions/0002-react-vite-and-bun.md).

The [repository structure standard](../../.agents/rules/REPOSITORY_STRUCTURE.md) defines where these deployables, their configuration, and their tests live.

## Run the local stack

Use a Docker engine in Linux container mode with BuildKit and Compose 2.24.4 or newer, Python 3.14, and [mkcert](https://github.com/FiloSottile/mkcert). Build downloads require access to the image registries and lockfile package sources. The running application and Swagger assets are local.

From the repository root, register the mkcert development CA on your own workstation and generate the ignored `.local/` files. The setup helper preserves existing credentials. Store the directory in the private checkout and keep its files out of source control. The file mounts grant only the relevant containers access.

```sh
mkcert -install
python scripts/setup_local.py
docker compose -f compose.yaml -f compose.dev.yaml up --build --wait
docker compose --profile tools run --rm migrate
python scripts/check_local.py --swagger
```

Open `https://localhost:8443` for the existing frontend preview and `https://localhost:8443/api/docs` for Swagger. Vite watches frontend source files. Use the base `docker compose up --build --wait` command for the optimized Nginx runtime and `python scripts/check_local.py` for its default docs-off mode. Stop the running configuration before switching modes. `DESK_HTTPS_PORT` changes the loopback host port, and `DESK_SWAGGER_ENABLED` overrides the docs setting. See [backend configuration](../../backend/README.md#backend-configuration) for API settings.

Inspect startup and persistence using `docker compose ps` and `docker compose --profile tools run --rm migrate alembic current`. Stop and recreate the PostgreSQL container, then check that the migration revision remains. The `postgres_data` named volume holds durable data. Bootstrap scripts run only on first initialization. Preserve the matching database secrets when preserving the volume. Redis is bounded, non-evicting, and ephemeral in this slice. Its ACL permits `PING` only until the auth limiter defines its required commands and verifies restart recovery.

For a local backup, run `docker compose exec -T postgres pg_dump -U postgres -d service_desk -Fc -f /tmp/service-desk.dump` and copy the dump to protected local storage with `docker compose cp postgres:/tmp/service-desk.dump .local/service-desk.dump`. To exercise restore on the same local cluster, create a scratch database and run `pg_restore` against it as the PostgreSQL administrator. Verify the revision and records there before considering a real restore. Follow the [database standards](../../.agents/rules/DATABASE_STANDARDS.md) for access and backup handling.

## Verification record

- PostgreSQL 17.12 and Redis 8.8.0 started with `docker compose up -d --wait --wait-timeout 120 postgres redis`. Both reported healthy. A TCP `SELECT 1` using the PostgreSQL runtime role returned `1`, and an authenticated Redis `PING` using the restricted ACL user returned `PONG`. Neither service published a host port.
- The Vite development and Nginx runtime frontend images built and started successfully. Host HTTPS checks reached the SPA deep link at `https://localhost:8443/portal/tickets` through the Compose loopback port mapping. Nginx returned HTTP `503` for an API request while the backend was stopped.
- Chromium exercised the same flow on both frontend targets through the forwarded port, covering visitor denial, blank-field validation, prompt-review intake, cross-owner denial, L1 triage, and the updated requester detail. The final frontend passed ESLint, the TypeScript and Vite build, and all 12 Bun tests. The browser flow used synthetic personas and tab storage.
- Native testing previously verified PostgreSQL readiness, runtime DDL denial, repeatable migration, HTTPS proxying, and Swagger. The backend image built and passed the release HTTPS smoke check through Nginx, including API liveness, PostgreSQL readiness, Redis, SPA routing, and the docs-off setting. PostgreSQL persistence after container recreation remains pending. The latest container checks skipped migrations and schema inspection.

## Persistence and caching

See the [persistence and cache decision](../decisions/0001-postgresql-and-redis.md) for the rationale and consequences. The alternatives considered were:

- **Firebase Auth and Firestore** can reduce managed-service operations and support local development with emulators. Firebase documents that its emulators are intended for development and testing. Using them as the reference self-hosted deployment would leave a gap between local operation and a production-ready setup.
- **SQLite** is a viable embedded alternative for a smaller demonstration. It would remove the separate database tier. A single file is simple to operate, while multiple concurrent writers and the intended client-server deployment make PostgreSQL a stronger fit here.

Keep knowledge files on local storage behind the backend when knowledge management arrives. Treat vector indexes as a later retrieval concern and keep ticket and authorization records in the authoritative database.

The [PostgreSQL integration design](postgresql-integration.md) covers the accepted driver, session lifecycle, migrations, and verification. Runtime and migration database privileges are separate.

## Demo data seeding

Provide an explicit local seed command to run after schema migrations. Migrations establish the schema. The seed command populates it with reproducible synthetic data for development and demos. Start with employee and L1 accounts, an intake queue, and incidents in the states supported by the first slice. Extend the scenarios as the application gains service requests, support tiers, SLA tracking, and knowledge management.

Make reruns safe by using stable seed identifiers and preserving existing edits. Document which database the command targets and have it reject production environments. Verify the command on a clean local database and run it twice to check for duplicates.

## Authentication and data policy

FastAPI owns authentication and enforces ownership, queue scope, and permissions. The [authentication decision](../decisions/0003-stateless-access-and-refresh-rotation.md) records the approved token, Redis, and sensitive-operation policies. The [M0 design](m0-authentication-design.md#login-and-record-lifecycle-policy) specifies login normalization, data lifecycle, revocation triggers, and incident policy.

## Observability

The default Compose stack includes application observability foundations. The optional collector and storage candidates, audit boundary, and rollout priorities are described in the [observability architecture](observability.md).

## References

- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Docker Compose networking](https://docs.docker.com/compose/how-tos/networking/)
