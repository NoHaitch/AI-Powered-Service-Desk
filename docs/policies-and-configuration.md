# Application policies and configuration

Use this page as the index for policies across the backend, frontend, and supporting services. Track each policy where it is best explained and link to that source here. Domain rules can live in requirements and decision rationale can live in ADRs.

| Area | Policy or setting | Status and reference |
| --- | --- | --- |
| Ticketing | Intake field limits, triage priority, and urgent-report handling | Accepted in the [incident requirements](requirements/incident-intake-and-triage.md). |
| Authentication | Stateless access verification, access lifetime, refresh inactivity and absolute limits, rotation and reuse detection | Accepted in the [authentication decision](decisions/0003-stateless-access-and-refresh-rotation.md). |
| Authentication safeguards | Live checks on sensitive operations and five-minute single-use reauthentication for credential or privilege changes | Accepted in the [authentication decision](decisions/0003-stateless-access-and-refresh-rotation.md). |
| Redis controls | M1 login and refresh throttling, account-wide alert, counter expiry, and configurable recovery with `503` on unavailability | Accepted [initial limiter defaults](architecture/m0-authentication-design.md#configurable-limiter-defaults). |
| Login and record lifecycle | Normalized local usernames, configurable 90-day auth and security audit retention, incident history retention, restricted deletion, and revocation triggers | [Accepted in M0](architecture/m0-authentication-design.md#login-and-record-lifecycle-policy). |
| Backend foundation | Database and Redis connection bounds, probe timeout, structured logging, and Swagger access | Implemented [backend settings](../backend/README.md#backend-configuration). Revisit budgets after load measurements. |
| Local infrastructure | Loopback HTTPS port, local certificate and secret provisioning, private datastore topology and Redis persistence | [Compose configuration](architecture/local-first.md#run-the-local-stack). Runtime verification is pending on a Docker-enabled host. |

## Recording a policy or setting

For a policy, record the expected behavior, scope, status, and rationale. For a configurable setting, also record the actual key once defined, units or format, default or required status, valid values, environment-specific differences, and behavior when the value is missing or invalid. Link the implementation and verification evidence once available.

Update the relevant documentation, safe example configuration, and validation together when a policy or setting changes. Use safe placeholders for credentials and document where they are supplied. Keep secret values and live tokens out of tracked files.
