# Project state

**Phase:** M0 complete. **Active milestone:** [M1 Application foundation](../../docs/roadmap.md#m1-application-foundation), live authentication, incident intake, ownership, and L1 triage implemented.

- Completed setup work includes repository onboarding, the project name and path correction, and the repository engineering workflow. See the [workflow setup plan](../plans/repository-workflow.md) and [root instructions](../../AGENTS.md).
- The [live frontend](../../docs/architecture/frontend-experience.md) uses provisioned identities and server-backed incidents. Earlier fixture models remain development references for later workflow milestones.
- The [Git and release strategy](../../docs/git-and-releases.md) uses `main` and `dev` and defines local checks and manual releases. The local setup helper and HTTPS smoke check are available.
- **M0 evidence:** [Accepted incident requirements](../../docs/requirements/incident-intake-and-triage.md) and [first-slice contracts, threat model, and evaluation plan](../../docs/architecture/m0-authentication-design.md).
- **Agreed:** [PostgreSQL for persistence and Redis for caching](../../docs/decisions/0001-postgresql-and-redis.md). Track future settings in the [policy and configuration index](../../docs/policies-and-configuration.md).
- **Agreed:** [Stateless access verification, strict refresh rotation, and initial token lifetimes](../../docs/decisions/0003-stateless-access-and-refresh-rotation.md).
- **Agreed:** Live family and permission checks on sensitive operations, reauthentication for credential or privilege changes, and Redis in M1 with limiter outages failing closed on login and refresh.
- **Agreed:** Initial limiter defaults and recovery, five-minute reauthentication, same-origin HTTPS with Vite and preferred Nginx release routing, and [PostgreSQL integration](../../docs/decisions/0004-postgresql-integration.md).
- The [backend foundation](../../backend/README.md) includes locked dependencies, startup configuration, async PostgreSQL and Redis clients, Alembic, safe errors and logs, health checks, and Swagger. The [Compose definitions](../../docs/architecture/local-first.md#run-the-local-stack) render for both frontend targets.
- The [M1 schema](../../docs/architecture/database-schema.md) supports live authentication and incidents through revision `0003_private_attachments`. The expanded opt-in seed provides 12 database-backed identities and preserves account edits on reruns.
- The [M1 authentication operations guide](../../docs/architecture/m1-authentication.md) covers setup, trusted ingress, key rotation, cookie scope, Redis recovery, and the HTTPS acceptance suite. [Implementation plan](../plans/m1-authentication.md)
- **Verification:** PostgreSQL passed fresh and upgrade regression suites. A dedicated development project retained all accounts after PostgreSQL container recreation. Nginx HTTPS passed 17 Python authentication checks and three Chromium journeys. Vite HTTPS also passed its startup and TLS check and all three browser journeys. See the [verification record](../../docs/architecture/local-first.md#verification-record).
- The [private attachment foundation](../../docs/architecture/content-storage.md) provides metadata and storage primitives. Browser attachment APIs are a follow-up increment.
- **Next action:** Continue under the [roadmap](../../docs/roadmap.md) with the attachment follow-up and the pending account lifecycle and service desk workflow decisions.
