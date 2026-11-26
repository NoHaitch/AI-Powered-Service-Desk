# ADR 0001 — PostgreSQL and Redis

**Status:** Accepted

**Date:** 2026-11-27

## Context and decision

The local Docker Compose deployment needs durable storage for incidents, users, roles, and audit history. PostgreSQL is the authoritative application database. Redis supports caching and justified operational state. Introduce it in M1 for [authentication rate limiting](../architecture/m0-authentication-design.md#sensitive-operations-and-redis). Keep it outside ordinary JWT verification and leave immediate revocation to authoritative PostgreSQL checks on sensitive routes.

## Alternatives and consequences

PostgreSQL fits the separate database tier and lets related changes, such as triage and its audit entry, commit in one transaction. SQLite would simplify deployment by embedding storage in the backend. Firestore would favor a managed-service workflow. The [architecture proposal](../architecture/local-first.md) records the comparison.

The project owns PostgreSQL migrations, backups, and restore verification. Define retention, invalidation, and outage behavior for each Redis use case. Authoritative application, refresh, and revocation data stay in PostgreSQL. [Authentication decision](0003-stateless-access-and-refresh-rotation.md)
