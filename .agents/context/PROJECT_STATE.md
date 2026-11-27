# Project state

**Phase:** M0 complete. **Active milestone:** [M1 Application foundation](../../docs/roadmap.md#m1-application-foundation), frontend work started.

- Completed setup work includes repository onboarding, the project name and path correction, and the repository engineering workflow. See the [workflow setup plan](../plans/repository-workflow.md) and [root instructions](../../AGENTS.md).
- The [frontend foundation](../../frontend/README.md) has Vite, Tailwind CSS, a shadcn/ui component preview, and lint and build commands. Backend capabilities and full-stack verification are pending.
- The [Git and release strategy](../../docs/git-and-releases.md) uses `main` and `dev` and defines local checks and manual releases. Verification scripts are pending.
- **M0 evidence:** [Accepted incident requirements](../../docs/requirements/incident-intake-and-triage.md) and [first-slice contracts, threat model, and evaluation plan](../../docs/architecture/m0-authentication-design.md).
- **Agreed:** [PostgreSQL for persistence and Redis for caching](../../docs/decisions/0001-postgresql-and-redis.md). Track future settings in the [policy and configuration index](../../docs/policies-and-configuration.md).
- **Agreed:** [Stateless access verification, strict refresh rotation, and initial token lifetimes](../../docs/decisions/0003-stateless-access-and-refresh-rotation.md).
- **Agreed:** Live family and permission checks on sensitive operations, reauthentication for credential or privilege changes, and Redis in M1 with limiter outages failing closed on login and refresh.
- **Agreed:** Initial limiter defaults and recovery, five-minute reauthentication, same-origin HTTPS with Vite and preferred Nginx release routing, and [PostgreSQL integration](../../docs/decisions/0004-postgresql-integration.md).
- **Blocker for backend work:** Explicit authorization for remaining scaffolding. No outstanding M0 policy decisions.
- **Next action after authorization:** Establish the Compose and API foundation, migrate and seed PostgreSQL, add auth and Redis, then verify the employee-to-L1 browser flow. Keep collection infrastructure optional.
