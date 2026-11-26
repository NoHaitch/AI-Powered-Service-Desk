# ADR 0003 — Stateless JWT access and rotating opaque refresh tokens

**Status:** Accepted

**Date:** 2026-11-27

## Context and decision

FastAPI owns browser authentication. Verify signed JWT access tokens locally by default, without a PostgreSQL or Redis lookup for the token or family. Resource ownership and permissions still apply to each operation. Use opaque refresh tokens, PostgreSQL token families, strict single-use rotation, and family revocation on detected reuse.

Use initial lifetimes of 10 minutes for access, 24 hours of refresh inactivity, and 7 days absolute from login.

Require current PostgreSQL family and permission checks for sensitive operations, plus recent reauthentication for credential or privilege changes. Introduce Redis in M1 for authentication rate limiting. Return `503` from login and refresh if the required limiter is unavailable, while preserving unaffected operations. PostgreSQL remains authoritative for families, permissions, and revocation. Defer a Redis denylist until justified.

## Alternatives and consequences

A live family lookup on every request would provide immediate session revocation at the cost of a shared state dependency for ordinary credential verification. The default trade-off is that logout or family revocation stops refresh immediately after commit, while issued access JWTs can remain valid until expiry. JWT refresh tokens offer little benefit because strict rotation still requires durable lineage. An opaque session remains a simpler alternative if stateless access is no longer needed.

The [M0 design](../architecture/m0-authentication-design.md#configurable-limiter-defaults) records the accepted limiter thresholds, account-wide alert without hard lockout, configurable recovery, and five-minute single-use reauthentication proof. The [login and record lifecycle policy](../architecture/m0-authentication-design.md#login-and-record-lifecycle-policy) defines normalized unique local usernames, configurable 90-day auth and security audit retention, restricted deletion, and family-level and account-wide revocation triggers.
