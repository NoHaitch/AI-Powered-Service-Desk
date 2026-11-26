# Security and configuration standards

## Mandatory principles

Apply security by design, secure defaults, defense in depth, least privilege, and fail-closed behavior throughout the project. Identify assets and trust boundaries before making consequential changes. Deny protected access and actions when identity, permission, or required approval cannot be established. Match controls to the milestone's threats and record the rationale for significant choices.

## Identity and credentials

- Authenticate and authorize every protected operation server-side. Check current roles, resource ownership, and queue or document scope. Enforce tenant isolation if tenancy is introduced. Frontend permissions are for presentation. Backend checks remain authoritative.
- If JWTs are used, verify signatures with an explicit algorithm allowlist and validate required issuer, audience, subject, token type, and time claims. Separate rules for different credential types. Minimize claims and define key rotation and revocation. Set short access lifetimes. Treat bearer credentials as replayable and select additional protection based on risk.
- If refresh tokens are used, rotate on use, preserve enough lineage to detect reuse, and revoke the affected family on confirmed reuse. Make consumption, rotation, and revocation concurrency-safe. Define idle and absolute expiry and enforce logout and account revocation on the server. Keep raw refresh tokens out of persistence and logs.
- Protect browser credential cookies with `HttpOnly`, `Secure` in the reference deployment, an explicit `SameSite` policy, and narrow scope appropriate to their use. Require CSRF protection for cookie-authenticated mutations, including refresh and logout, and prevent login CSRF. CORS and SameSite are supplementary controls. Keep any local HTTP exception explicit and isolated.
- Use Argon2id with a unique, library-generated random salt per password hash. Validate work factors on the target runtime and bound hashing load. Use established cryptographic libraries and authenticated encryption where sensitive data requires encryption at rest. Protect sensitive traffic in transit across relevant trust boundaries. Keep encryption and signing keys separate by purpose and environment, restrict access, and document rotation, recovery, and retirement.

## Trust boundaries and data handling

- Validate untrusted data server-side on entry and across service boundaries. Apply schemas, size and resource limits, and allowlists where appropriate. Sanitize intentionally permitted rich content and encode output for its destination context. Keep uploads inert and constrain file types and parsing resources.
- Use parameterized SQL and constrain dynamic identifiers and sort fields. Avoid interpolating untrusted input into commands, templates, or paths. Restrict outbound fetches and redirects when accepting URLs. Consider injection, XSS, SSRF, mass assignment, and object-level authorization in reviews and tests.
- Apply independent controls at each layer. The frontend safely renders untrusted data. The backend validates requests and enforces domain rules. PostgreSQL uses least-privilege runtime credentials, separate migration privileges, constraints, and transactions. Internal services authenticate and authorize calls according to their boundary, validate inputs, and use scoped identities. Private Compose networking limits exposure and never grants trust by itself. Follow the [containerization standards](CONTAINER_STANDARDS.md).

## Failure handling and operations

- Use consistent HTTP status and error shapes. Return safe messages and a correlation ID where appropriate. Protect diagnostic and audit logs with restricted access and retention rules. Redact credentials, secrets, and sensitive payloads. Audit security-sensitive actions and important outcomes.
- Keep related state changes and durable audit records consistent with transactions or an explicitly designed equivalent. Bound timeouts, retries, and resource usage. Retry mutations only when their effects are safe to repeat. Degrade optional features gracefully while preserving authorization, data integrity, and other security checks.
- Review direct and transitive dependencies and base images for vulnerabilities with available tooling. Apply updates or document the impact and disposition of relevant findings. Use public, appropriately licensed, or synthetic data for development and evaluation. Bound cloud and LLM spending and require approval before enabling paid resources.

## AI, ML, and MCP

- Treat prompts, retrieved documents, model outputs, and tool results as untrusted data. Enforce per-user access during retrieval and before releasing results. Minimize or redact data sent to models and tools, including in traces. Test for prompt injection, unauthorized retrieval, and sensitive information leakage.
- Keep business rules and access decisions outside the model. Restrict tool availability, arguments, and resources. Validate tool inputs and outputs and recheck actor permissions at execution. Require explicit human approval for consequential actions, bound to the exact operation and arguments, with safe retry behavior and auditing. Restrict model artifact sources and ML service permissions.

## Security verification

For relevant changes, update the threat model and run risk-based checks before completion. Include negative authorization and boundary tests, invalid input, concurrency or replay where applicable, dependency failures, and evidence of fail-closed behavior. Review data exposure, logging, and relevant dependency or image findings. Record actual results and gaps. Use STRIDE to classify threats, CWE to identify weakness classes, and OWASP ASVS and web, API, and LLM guidance to select applicable controls. Record relevant requirement or weakness IDs where useful, with evidence for each claimed result.

## Settings and secrets

Use descriptive `UPPER_SNAKE_CASE` settings, with subsystem prefixes and units where needed. Preserve standard SDK variable names. Treat Vite-exposed variables, including the default `VITE_` prefix, as public browser data. Keep credentials server-side and supply secret values through approved runtime secret mechanisms.

Separate development, test, and production settings. Validate required configuration at startup, fail safely, and avoid unsafe production defaults. Document required and optional variables, their scope, formats, and defaults. Maintain safe placeholders in `.env.example` once runtime settings exist. Keep real environment files, keys, service accounts, tokens, passwords, and certificates out of source, logs, docs, tests, screenshots, and agent notes. See the [ignore rules](../../.gitignore).

## References

- [OWASP ASVS](https://asvs.owasp.org/), [web security cheat sheets](https://cheatsheetseries.owasp.org/), [API Security](https://owasp.org/projects/api-security-project), and [LLM security guidance](https://genai.owasp.org/llm-top-10/)
- [Microsoft STRIDE threat categories](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats) and [MITRE CWE](https://cwe.mitre.org/)
- [RFC 8725 for JWT security](https://www.rfc-editor.org/rfc/rfc8725.html), [RFC 9700 for token protection](https://www.rfc-editor.org/rfc/rfc9700.html), and [RFC 9106 for Argon2](https://www.rfc-editor.org/rfc/rfc9106.html)
