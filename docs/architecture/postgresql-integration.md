# PostgreSQL integration design

**Status:** The integration design and first-slice schema policies are accepted in M0. M1 implements the [database decision](../decisions/0004-postgresql-integration.md) after separate authorization.

## Libraries

| Component | Decision or alternative |
| --- | --- |
| SQLAlchemy 2.x | Use the typed ORM for ordinary entity access and Core expressions for explicit conditional updates or specialized queries. Reuse the library's session and transaction APIs. A generic repository or extra unit-of-work framework adds little to this modular backend. |
| Alembic | Own schema revisions and reviewed upgrades. Use a separate migration command with migration credentials. Generate candidates where useful and inspect them for missed constraints, renames, and unsafe backfills. |
| Pydantic | Use dedicated request and response models for FastAPI boundaries, plus settings validation with the appropriate package if needed. Keep ORM models for persistence and expose only explicitly selected fields in responses. Database constraints remain authoritative across writers. |
| Psycopg 3 | Preferred async runtime driver. Its SQLAlchemy dialect supports async and sync engines, so the API can run async while Alembic uses a short-lived sync engine with the same driver family. Verify the selected package build on the intended container image. |
| asyncpg | Viable alternative for an async-only runtime. It would require an async migration setup or an additional sync driver. Evaluate both on compatibility, debugging, and measured workload needs before changing the default. |

A fully synchronous SQLAlchemy setup would also be viable with synchronous request handlers. Async fits the planned mix of database and service I/O, provided transactions stay short and database work uses the async driver throughout request paths. Async does not remove connection limits.

## Session and transaction boundaries

Create one async engine and session factory per FastAPI worker in its lifecycle, then dispose the engine at shutdown. A FastAPI dependency opens and closes one `AsyncSession` for an operation that needs persistence. Ordinary JWT verification does not acquire a database session. Do not share a session across concurrently running tasks. Read queries are bounded, and related data is loaded deliberately before response serialization.

Application operations own explicit transaction boundaries. Commit a mutation before returning success or setting auth cookies. Roll back on errors, release connections on cancellation, and perform external calls outside database transactions. Use the same transaction for protected writes and required audit events. Handle concurrent operations with database constraints and guarded mutations or row locks. Keep the M1 pool small and set pool, statement, and lock budgets based on planned worker count and local measurements.

## M0 policy and M1 verification

1. Pin supported library versions and verify the container build during M1.
2. Implement the accepted [M0 data contract](m0-authentication-design.md#postgresql-data-contract), including normalized username uniqueness, constrained incident fields, and restricted deletion.
3. Validate migration from empty and upgrade with representative data on PostgreSQL. Exercise simultaneous triage and refresh, rollback and audit atomicity, restricted runtime grants, pool release on failure, and the separate seed flow. Treat query and pool tuning as measurement work.

## References

- [SQLAlchemy async sessions](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html) and [PostgreSQL dialects](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html)
- [Alembic autogeneration and review](https://alembic.sqlalchemy.org/en/latest/autogenerate.html)
- [Pydantic models](https://pydantic.dev/docs/validation/latest/concepts/models/)
