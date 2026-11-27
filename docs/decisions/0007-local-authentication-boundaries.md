# ADR 0007 — Local authentication boundaries and key management

**Status:** Accepted for M1.

**Date:** 2026-11-28

## Context

[ADR 0003](0003-stateless-access-and-refresh-rotation.md) establishes access JWTs, opaque rotating refresh credentials, and fail-closed rate limiting. M1 also needs an unambiguous ingress source, browser coordination, and reproducible account provisioning.

## Decision

- Only the API signs and verifies access JWTs. Use PyJWT with HS256, an operator-configured key ring and an allowlisted key ID. Independent keys cover access signing, refresh digests, CSRF, and limiter identity. Reevaluate asymmetric signatures when a separate verifier has a real need for access tokens.
- Nginx and the Vite development proxy replace the internal client-address header with their socket source. FastAPI accepts the header only from the single reserved proxy peer on the dedicated Compose edge network. Publishing only loopback HTTPS bounds the reference deployment to the local machine. NAT or port forwarding can put several users in one rate bucket. A production ingress and its upstream trust chain require review before publication.
- M1 authenticates provisioned database accounts. Use the opt-in development seed to exercise real login, a read-only profile, browser-local appearance settings, and sign-out. Account administration, credential changes, recovery, email verification, MFA, and other-session management require their own reviewed contracts. No additional personal information is required in the M1 user schema.
- Use the browser Web Locks API to serialize session cookie writes across tabs. Retry a protected read after confirmed refresh. Keep CSRF in memory. A browser without safe refresh coordination can sign in interactively. Use Playwright for the local HTTPS acceptance suite.
- Use authenticated browser-to-proxy TLS. The reference single-host private bridges carry internal HTTP, PostgreSQL and Redis traffic. Restrict bridge and host access. Encrypted storage and backups are deployment controls. Future cross-host transport and new sensitive fields need a separate review of in-transit or field encryption and key custody.

## Consequences

Operational changes to proxy addresses or origins require matching Compose and API configuration. Key rotation and Redis recovery follow the [M1 authentication operations guide](../architecture/m1-authentication.md). Revocation immediately stops the refresh family. Already-issued access tokens remain usable on eligible routes until expiry, subject to current account and resource authorization.
