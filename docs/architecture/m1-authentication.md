# M1 authentication operations

The [authentication and incident contract](m0-authentication-design.md#api-contract) defines the browser interface. The [ingress and key-management decision](../decisions/0007-local-authentication-boundaries.md) records the M1 deployment and account scope.

## Provision and sign in

Run the [local Compose workflow](local-first.md#run-the-local-stack) and [migrate and seed a marked development database](database-schema.md#migration-and-local-seed-workflow). Use `https://localhost:8443` with a trusted local certificate. Use separate browser profiles or an incognito window to try employee and agent accounts in parallel. Tabs within one browser profile intentionally share a session. Cookie scope follows the hostname and path across ports, so use separate browser profiles when testing parallel deployments. Existing seed accounts retain their passwords, profile edits, account states, role grants, and memberships on reruns.

The login header is `X-Desk-Request: 1`. Authenticated mutations send `X-CSRF-Token` and require the configured exact HTTPS origin. The access cookie is `__Secure-desk-access` at `/api/v1`. The refresh cookie is `__Secure-desk-refresh` at `/api/v1/auth`. These cookies have no Domain attribute and use Secure, HttpOnly and SameSite=Lax. Auth and incident responses use `Cache-Control: no-store`. A successful browser session uses in-memory CSRF and current user data from `/auth/me`. English and Indonesian error messages are selected by browser language, with English as the fallback.

The first login or refresh on an empty limiter starts the configured cooldown (five minutes by default) and returns `503`. Subsequent admission after the deadline checks an actual Redis write and installs the active generation marker. `/api/health/auth` checks the generation and performs a bounded Redis health write, while `/api/health/redis` checks connectivity. Missing markers, failed counter writes, and inconsistent counter TTLs trigger fail-closed recovery. A failed request that cannot record a new generation because PostgreSQL is unavailable still issues no tokens. The account-wide login failure threshold is a signal. Current permissions and session lineage remain in PostgreSQL. Limiter counters contain keyed bucket identities.

## Secrets and rotation

`python scripts/setup_local.py` creates four independently generated 256-bit auth keys. Each Compose secret exposes one purpose to the API container. Keep `.local/` private with mode `0700`. Local Compose file mounts allow the unprivileged container user to read the relevant mounted file. The directory and mounts provide host access control. At-rest protection depends on the host storage configuration. Do not pass production key values in command-line arguments, browser settings, or version control.

| Secret file | Layout and operation |
| --- | --- |
| `desk_auth_access_keys` | Signing key ring. New tokens use the first key ID. Keep the former verification key for the maximum access lifetime after the last issuance, then remove it. Remove a compromised key promptly and assess existing sessions. |
| `desk_auth_refresh_keys` | Refresh digest key ring. Keep the former key until the latest affected family's absolute deadline has passed, so old and consumed credentials remain recognizable. If urgent retirement is necessary, revoke sessions through a controlled database maintenance operation before removing the key. |
| `desk_auth_csrf_keys` | Family-bound authentication code key ring. Keep the former key for the affected refresh horizon during scheduled rotation. Clients can obtain a new in-memory token from `/auth/csrf`. |
| `desk_auth_limiter_key` | One identity and generation authentication key. Rotate with all API instances stopped, then let recovery fence off the old counters before resuming admission. |

Key ring format is `id:64-hex-characters[,previous-id:64-hex-characters]`. Key IDs are local allowlisted identifiers. Replace a file atomically inside protected storage, recreate the backend to remount it, and validate readiness and a credential issued before the rotation. Coordinate multi-instance deployments so every verifier has both keys before issuing with the new one. Keep rotation and revocation records and store recovery keys separately from backups.

Password hashes use Argon2id with a random salt. Refresh credentials use a keyed digest. CSRF values use a family-bound message authentication code. JWTs contain signed claims that remain readable by a bearer. Disk and backup encryption protect stored data and have a separate key lifecycle. The reference Compose configuration uses HTTPS at ingress, PostgreSQL SCRAM and Redis ACL credentials over private single-host bridges, and the host storage configuration for named volumes. Enable encryption at the storage layer where required and store only encrypted database and attachment backups outside the private local host. Verify restore on an isolated instance and review session revocation and limiter recovery before exposing a restored service.

## Verification workflow

Run the locked native backend and frontend checks, the [isolated PostgreSQL migration suite](database-schema.md#verification), and `bash backend/tests/run_m1_auth_https.sh` after installing the locked Playwright Chromium. The HTTPS runner creates its own Compose project and volumes, generates private synthetic passwords, verifies TLS and API behavior, exercises outages against the disposable PostgreSQL and Redis, and runs Chromium on the same deployment. See the [verification record](local-first.md#verification-record).

Use `DESK_AUTH_TEST_VITE=1` with the HTTPS runner to verify the Vite development proxy. A different test port can be selected with `DESK_AUTH_TEST_PORT`. Each run uses separate database, Redis, and authentication keys. The Redis memory-exhaustion check uses a configuration-only identity generated inside the disposable test project. The reference Compose ACL excludes that identity. Chromium uses the local certificate key for the test server. The TLS contract tests independently verify the certificate and hostname.

The target API container reported Argon2id parameters `m=65536,t=3,p=4` and verified one synthetic password in approximately 351 ms under local test load. This check confirms the configured work factor on the target container. The [capacity test standard](../../.agents/rules/TESTING_STANDARDS.md#backend-capacity-testing) covers sustained release throughput.
