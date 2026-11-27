# M1 backend and Compose foundation

Implement the infrastructure and API foundation in the existing monorepo. Follow the [PostgreSQL ADR](../../docs/decisions/0004-postgresql-integration.md), [local-first topology](../../docs/architecture/local-first.md), and [observability design](../../docs/architecture/observability.md).

1. Lock Python dependencies with uv. Build a FastAPI application factory, validated configuration, bounded SQLAlchemy/Psycopg pool, Redis client, and explicit Alembic entry point. Keep development/test-only tools out of runtime images.
2. Expose liveness and PostgreSQL readiness plus a distinct Redis probe. Correlate responses and structured stdout logs, and exercise safe failure handling. Keep local Swagger UI and its assets same-origin.
3. Add Compose with separate edge and private data networks, PostgreSQL runtime and migration roles, ephemeral Redis, and Nginx or Vite over loopback HTTPS. Leave frontend workflows on their existing fixtures.
4. Verify Python and frontend checks, Compose rendering and service connectivity when tooling permits. Document offline and environment limits. Authentication, business schema and seed data, and the full-stack incident flow remain later M1 steps.

## Verification

Ruff, mypy, backend pytest, Bun lint and tests, the TypeScript and Vite build, and Python and Bun dependency advisory checks passed. Alembic compiled the baseline in SQL mode and applied it twice against an isolated PostgreSQL 17.12 cluster. The checks confirmed runtime DDL denial, async PostgreSQL readiness, independent Redis failure, generated request IDs, and redaction. Edge rendered the local Swagger UI assets over HTTPS through Vite and verified the SPA route remained usable.

The Redis client sent only AUTH and PING to a loopback protocol fixture. Compose rendered both configurations. Container verification is deferred to a Docker-enabled host. The [Compose checklist](../../docs/architecture/local-first.md#run-the-local-stack) covers image builds and startup, the live Redis ACL and probe, Nginx routing, and named volume persistence.
