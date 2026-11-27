# Local-first architecture direction

**Status:** Docker Compose, PostgreSQL, Redis, and same-origin HTTPS are accepted. The reference deployment must run without paid infrastructure or hosted accounts. Public hosting is optional.

## Proposed service boundaries

| Tier | Responsibility | Communication |
| --- | --- | --- |
| Frontend container | Client-rendered React, Vite, and TypeScript UI, built with Bun. | Same-origin HTTPS. Vite proxies API calls in development. Nginx is the preferred local release server and API reverse proxy. |
| Python/FastAPI container | One modular backend owns authorization, ticket and knowledge rules, audit writes, and data access. | HTTP API to the frontend and a private database connection. Compose service names are internal to the container network. |
| PostgreSQL container | Authoritative storage for incidents, users and role mappings, audit events, and later knowledge metadata. | Reachable by the backend on the Compose network. Use a named volume, versioned migrations, and documented backup and restore. |
| Redis container | M1 authentication rate limiting. Caching and optional revocation acceleration are deferred until justified. | Private to FastAPI on the Compose network. Limiter outage blocks login and refresh while unaffected routes remain available. PostgreSQL remains authoritative. |
| Independent ML inference container (later) | Self-host a versioned classifier and return advisory predictions. | An internal HTTP call from FastAPI with a timeout and manual fallback. The inference service does not need direct access to the application database. |

Bind the HTTPS browser entry point to loopback and keep the API, database, cache, and inference ports private in the reference topology. Route API requests before any SPA fallback. Trust forwarding headers only from the configured proxy. Local certificate provisioning and Compose routing details belong to M1. Add a dedicated gateway, vector search, MCP, and orchestration only when their roadmap prerequisites are met. See the [frontend decision](../decisions/0002-react-vite-and-bun.md).

The [repository structure standard](../../.agents/rules/REPOSITORY_STRUCTURE.md) defines where these deployables, their configuration, and their tests live.

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
