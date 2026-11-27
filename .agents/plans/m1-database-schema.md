# M1 database schema plan

**Status:** Implemented and verified on two isolated PostgreSQL 17.12 instances.

## Accepted scope and design

- [ADR 0005](../../docs/decisions/0005-shared-ticket-identity.md) records the decision to use a shared tickets root with a required incident detail subtype in M1. Service request and other future subtype tables remain deferred.
- PostgreSQL allocates immutable, human-readable incident references alongside UUID API identities. Use explicit ticket revisions and guard writes by the expected revision.
- Keep incident and authentication audit tables distinct. Runtime writes use server timestamps. The auth retention function has a separate maintenance grant.
- An opt-in marked local seed command uses Argon2id and privately supplied passwords. Seed reruns preserve existing accounts and credentials.
- The [database architecture](../../docs/architecture/database-schema.md) is authoritative for the implemented data dictionary, current and future ER diagrams, migration workflow, Redis conventions, and verification boundaries.

## Implementation and acceptance evidence

- Domain-oriented typed SQLAlchemy models and separate Pydantic incident inputs. The reviewed migration follows `0001_foundation`, with a dedicated migration role and narrowly scoped runtime grants.
- Ran the isolated Docker PostgreSQL suite for a fresh install and an explicit baseline upgrade. Both matched Alembic metadata and passed all 13 tests.
- Verified subtype completeness, reference uniqueness and gaps, restrictive foreign keys, revision races, refresh lineage, audit transaction rollback, privilege denials, retention, and seed refusal and repeatability. Verified downgrade and re-upgrade on an empty schema and refusal to downgrade populated schema.
- Ruff lint and formatting, mypy, offline migration SQL generation, and the locked Linux dependency audit passed.
- No API routes, auth workflows, Redis limiter behavior, service-request persistence, or production migrations are part of this increment.
