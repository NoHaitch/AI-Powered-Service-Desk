# Database standards

PostgreSQL is authoritative for durable application and security state. Redis supports scoped operational state and caching. Follow the [security](SECURITY_STANDARDS.md), [observability](OBSERVABILITY_STANDARDS.md), and [containerization](CONTAINER_STANDARDS.md) standards for their respective controls.

## Schema and integrity

- Use descriptive lowercase `snake_case` identifiers and consistent plural table names. Use `id` for a surrogate primary key and `<entity>_id` for a reference. Use predictable named constraints and indexes such as `pk_`, `fk_`, `uq_`, `ck_`, and `ix_`.
- Give entity tables stable primary keys and use foreign keys to enforce relationships. Use composite keys or uniqueness for natural relationships such as membership. Choose deletion policies deliberately. Default to restricting deletion when history must survive. Cascade only for genuinely dependent records. Use soft deletion only with a defined lifecycle, uniqueness rule, and query policy.
- Choose types by meaning. Use timezone-aware PostgreSQL timestamps for instants, appropriate integer or exact numeric types for counts or fixed-precision values, and native UUIDs where opaque identifiers are warranted. Use text and deliberate bounds, and reserve JSONB for flexible data. Keep frequently queried or integrity-sensitive values in typed columns.
- Make required values `NOT NULL`. Use database defaults for shared, deterministic defaults. Express stable invariants with named checks, uniqueness, foreign keys, or composite constraints. Use partial unique indexes for conditional uniqueness. Review SQL null semantics explicitly. Express cross-row rules with relational constraints where possible and transactional domain logic where needed.
- Normalize by default. Model relationships for actual access patterns. Denormalize only for a demonstrated need, with explicit ownership and update consistency. Use frontend validation for feedback, backend schemas for untrusted inputs, domain code for business policy, and database constraints for invariants shared by all writers.

## Access, transactions, and performance

- Scope sessions to one request or unit of work, with independent sessions for concurrent tasks. Keep transaction ownership at the application operation. Data-access helpers participate in that transaction. Close sessions on success, failure, and cancellation.
- Keep transactions short. Commit related durable changes and their audit records atomically. Use conditional writes, version checks, unique constraints, or locks for known races. Define lock ordering, bounded waits, and safe retry semantics. Avoid user interaction and remote calls inside database transactions.
- Use parameterized queries and allowlist dynamic identifiers. Enforce resource authorization in the backend and scope queries accordingly. Run the app with restricted credentials, separate migration and administrative permissions, and private connectivity. Restrict audit mutation and reads for roles that do not need them.
- Limit query result sizes, paginate with deterministic ordering, and load relationships explicitly to avoid hidden I/O or N+1 queries. Add indexes for demonstrated query paths and relevant foreign-key access. Account for indexes already provided by keys and uniqueness. Use representative plans and measurements before adding specialized indexes or tuning.
- Use one bounded pool per application worker. Set acquisition, statement, and lock timeouts as appropriate. Count all workers and operational clients against the database connection budget. Release connections promptly and avoid stacking independent pools without cause. Log durations and outcome classes with redacted parameters.

## Migrations, backups, and verification

- Use reviewed, versioned migrations and apply them separately from application startup with the migration role. Treat generated revisions as drafts. Review SQL, locks, compatibility, defaults, backfills, data loss, and rollback or forward recovery before applying. Keep demo seeding separate. Obtain approval for destructive changes.
- Verify changes against real PostgreSQL. For schema changes, test migration from empty and from the relevant previous revision with representative data. Cover constraints, rollback, concurrent updates, audit atomicity, and restricted permissions where relevant. Verify recovery procedures rather than assuming downgrades are safe.
- Document backup scope, access, retention, and restore steps for durable databases and volumes. Verify restoration with approved test data before relying on backups. Protect backups as sensitive data.

## Redis

- Use private access and scoped credentials, purpose-based key namespaces, bounded key cardinality, and explicit TTLs for disposable state. Keep credentials and raw identifiers out of keys and diagnostics. Document invalidation, memory limits, eviction, and outage behavior for each use.
- Use atomic operations for counters and expiry. Keep security-critical limiter state safe from ordinary cache eviction. PostgreSQL remains authoritative for business data, permissions, refresh lineage, and revocation. Keep the approved fail-closed behavior for unavailable auth limiting.
- Test relevant Redis changes on real Redis, including expiry, concurrency, pressure, restart, degraded behavior, and recovery as applicable.
