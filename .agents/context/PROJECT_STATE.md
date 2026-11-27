# Project state

**Phase:** M0 complete. **Active milestone:** [M1 Application foundation](../../docs/roadmap.md#m1-application-foundation), frontend preview and backend foundation implemented.

- Completed setup work includes repository onboarding, the project name and path correction, and the repository engineering workflow. See the [workflow setup plan](../plans/repository-workflow.md) and [root instructions](../../AGENTS.md).
- The [frontend fixture preview](../../docs/architecture/frontend-experience.md) covers incident intake and L1 triage, catalog requests, ticket conversations and internal notes, seeded assignments and resolutions, a Markdown knowledge base and local drafts, and account tools. Backend integration and the [post-triage workflow decisions](../../docs/architecture/frontend-experience.md#workflow-decisions-pending) remain open.
- The [Git and release strategy](../../docs/git-and-releases.md) uses `main` and `dev` and defines local checks and manual releases. The local setup helper and HTTPS smoke check are available.
- **M0 evidence:** [Accepted incident requirements](../../docs/requirements/incident-intake-and-triage.md) and [first-slice contracts, threat model, and evaluation plan](../../docs/architecture/m0-authentication-design.md).
- **Agreed:** [PostgreSQL for persistence and Redis for caching](../../docs/decisions/0001-postgresql-and-redis.md). Track future settings in the [policy and configuration index](../../docs/policies-and-configuration.md).
- **Agreed:** [Stateless access verification, strict refresh rotation, and initial token lifetimes](../../docs/decisions/0003-stateless-access-and-refresh-rotation.md).
- **Agreed:** Live family and permission checks on sensitive operations, reauthentication for credential or privilege changes, and Redis in M1 with limiter outages failing closed on login and refresh.
- **Agreed:** Initial limiter defaults and recovery, five-minute reauthentication, same-origin HTTPS with Vite and preferred Nginx release routing, and [PostgreSQL integration](../../docs/decisions/0004-postgresql-integration.md).
- The [backend foundation](../../backend/README.md) includes locked dependencies, startup configuration, async PostgreSQL and Redis clients, Alembic, safe errors and logs, health checks, and Swagger. The [Compose definitions](../../docs/architecture/local-first.md#run-the-local-stack) render for both frontend targets.
- **Verification:** Both frontend Docker targets served the preview through loopback HTTPS. The API container passed the Nginx HTTPS smoke check with PostgreSQL and Redis. See the [verification record](../../docs/architecture/local-first.md#verification-record).
- **Next action:** Verify PostgreSQL volume persistence across container recreation. Then implement the accepted identity and audit schema and synthetic seed command, and settle proxy trust for login rate limiting. Keep optional infrastructure outside the first API slice.
