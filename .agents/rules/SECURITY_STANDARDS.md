# Security and configuration standards

- Authenticate and authorize protected requests server-side. Deny by default, grant least privilege, and enforce ticket and document visibility before retrieval or tool execution. Add tenant isolation if multi-tenancy is introduced.
- Validate inputs and structured outputs. Constrain file types, upload size, and parsing resources, and keep uploaded content inert. Use safe errors, bounded execution, and rate limits where appropriate. Scan dependencies with available project tooling.
- Treat user input, retrieved content, model output, and tool results as untrusted. Enforce business rules outside the model. Validate MCP tool arguments and current authorization at execution time. Bind sensitive mutations to explicit human approval of exact arguments, with idempotency and an audit trail.
- Audit important operations and redact secrets and personal data. Use public, appropriately licensed, or synthetic data. Keep confidential information and raw sensitive transcripts out of tracked files and agent context. Bound cloud and LLM spending and require approval before enabling paid resources.

## Settings and secrets

Use descriptive `UPPER_SNAKE_CASE` settings, with subsystem prefixes and units where needed. Preserve standard SDK variable names. Use `NEXT_PUBLIC_` only for settings intentionally visible in the browser. Keep credentials server-side and store production secrets in a hosting platform or secret manager.

Separate development, test, and production settings. Validate required configuration at startup, fail safely, and avoid unsafe production defaults. Document required and optional variables, their scope, formats, and defaults. Maintain safe placeholders in `.env.example` once runtime settings exist. Keep real environment files, keys, service accounts, tokens, passwords, and certificates out of source, logs, docs, tests, screenshots, and agent notes. See the [ignore rules](../../.gitignore).
