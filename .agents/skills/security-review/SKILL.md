---
name: security-review
description: Review trust boundaries when changing authentication, authorization, secrets, external integrations, document ingestion, or AI tool execution.
---

# Security review

1. Trace identities, sensitive data, and trust boundaries across the changed request, retrieval, and tool paths. Use the [security standards](../../rules/SECURITY_STANDARDS.md) to check where authorization and validation occur.
2. Check relevant abuse and failure paths using safe fixtures, including cross-user access, untrusted content, excessive inputs, stale approvals, and sensitive data in logs. For a tool write, verify approval binds the precise operation and arguments, permissions are rechecked, and retries preserve audit and state consistency.
3. Record findings, impact, remediation, and tests. Update threat-model documentation when boundaries change and surface consequential decisions before proceeding.
