# ADR 0004 — PostgreSQL integration and transaction boundaries

**Status:** Accepted

**Date:** 2026-11-27

## Context and decision

Use SQLAlchemy 2.x with Psycopg 3 async for FastAPI, synchronous Alembic migrations using Psycopg 3 with separate migration credentials, and Pydantic for API validation. Use one bounded pool per API worker and an operation-scoped session where persistence is needed. Application operations own transactions. Ordinary access JWT verification stays stateless.

Use UUID entity identifiers and the [M0 data invariants](../architecture/m0-authentication-design.md#postgresql-data-contract). Commit related changes and their required audit events atomically. Serialize refresh changes at the family boundary and guard concurrent triage updates.

## Alternatives and consequences

Psycopg 3 lets the async runtime and synchronous migration process use one driver family. The [integration design](../architecture/postgresql-integration.md) retains the comparison with asyncpg and a synchronous runtime. M1 will pin versions, verify the image build, and measure connection and timeout settings. Schema migrations implement the accepted normalization and retention boundaries.
