# Repository structure

Use one monorepo with a defined owner for each application, independently deployable service, and infrastructure component. Preserve the existing `.agents/` and `docs/` layouts. This tree defines where future files belong.

```text
AI-Powered-Service-Desk/
├── .agents/                         # Agent context, rules, and skills
├── docs/                            # Requirements, architecture, ADRs, and roadmap
├── frontend/
│   ├── src/
│   │   ├── app/                     # Entry point, routes, and providers
│   │   ├── features/                # Auth, incidents, and later frontend features
│   │   └── shared/                  # Cross-feature code when reuse is established
│   ├── package.json                 # Frontend dependencies and commands
│   ├── bun.lock
│   ├── Dockerfile
│   └── .dockerignore
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application assembly
│   │   ├── core/                    # Settings, DB lifecycle, and request context
│   │   └── modules/                 # Auth, incidents, and later domain modules
│   ├── migrations/                  # Backend Alembic revisions
│   ├── tests/                       # Backend unit, API, and storage integration tests
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── Dockerfile
│   └── .dockerignore
├── services/
│   ├── ml-inference/                # Later independent inference runtime
│   └── mcp-server/                  # Later independent MCP boundary if justified
├── infrastructure/
│   ├── nginx/                       # Local release frontend and API proxy config
│   └── observability/               # Optional collection profile configuration
├── tests/
│   ├── e2e/                         # Browser and cross-stack flows
│   ├── performance/                 # Capacity and load scenarios
│   └── evaluations/                 # Cross-component AI evaluations
├── scripts/                         # Commands coordinating multiple components
└── compose.yaml                     # Local reference stack entry point
```

For M1, start with the frontend, backend, and local Compose stack. Keep the frontend and backend scope to auth and the employee-to-L1 incident slice. Add migrations, tests, Nginx configuration, and root scripts as their work arrives. Keep database seeding backend-owned. Create a directory when its first real file is needed.

## Application and service boundaries

- **Frontend:** Place feature UI, API calls, state, and component tests together. Keep app composition in `app/`. Move code to `shared/` when multiple features need the same behavior. Consume the backend contract and derive OpenAPI types where practical.
- **Backend:** Use a domain-oriented modular monolith. In each module, HTTP routes and schemas adapt requests, application operations own transactions and orchestration, domain code owns policy, and persistence code owns queries. Start with a few files and introduce subpackages when the module grows. Use explicit application interfaces across modules and keep HTTP and database details out of domain rules.
- **Future AI:** Keep RAG and orchestration in the backend where practical. Introduce a service when deployment, dependencies, or a trust boundary justify it. Each independent service owns its source, dependencies, image, and tests. ML and MCP use explicit contracts and scoped permissions. They do not import backend persistence internals or access its database directly.
- **Shared code:** Reuse a module or feature's existing logic before extracting it. Create a shared package only when multiple deployables have a stable common need. Keep migrations, runtime state, secrets, and domain policy with their owners.

## Build, configuration, testing, and naming

- Each deployable owns its dependency manifest, lockfile, Dockerfile, and focused build context with an appropriate `.dockerignore`. Keep supporting configuration under its component in `infrastructure/`. Root Compose owns stack wiring. Add profiles or overrides when a real environment or optional service needs them.
- Keep settings and safe examples with the component that validates them. Shared Compose settings belong at the root when needed. Follow the [security standards](SECURITY_STANDARDS.md) for secrets and the [container standards](CONTAINER_STANDARDS.md) for runtime configuration.
- Keep Alembic configuration and revisions in `backend/`. Run schema migrations and demo seeding separately. A future service with its own durable store owns its schema and migrations. Follow the [database standards](DATABASE_STANDARDS.md).
- Keep unit, component, and single-service integration tests with their owners. Reserve root `tests/` for checks that span components or verify the assembled stack. Keep service-specific commands with the service, and use root `scripts/` for cross-component work.
- Use `snake_case` for Python packages and modules, `PascalCase` for React components, and descriptive `kebab-case` for deployable directories and documentation filenames. Keep public architecture, ADRs, and setup guides in `docs/`. Update this reference when ownership or boundaries change.
