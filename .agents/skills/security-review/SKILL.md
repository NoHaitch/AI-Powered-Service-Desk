---
name: security-review
description: Review trust boundaries when changing authentication, authorization, secrets, external integrations, document ingestion, or AI tool execution.
---

# Security review

1. Trace identities, sensitive data, and trust boundaries across the changed paths. Use STRIDE and the [security standards](../../rules/SECURITY_STANDARDS.md) to identify affected controls at each layer.
2. Verify applicable negative and failure paths with safe fixtures. Check that missing authorization, dependency failures, and retries preserve deny-by-default behavior and state integrity. Include security checks for changed dependencies or images where relevant.
3. Record findings, impact, remediation, tests run, and gaps. Link evidence to the threat model and applicable controls. Discuss consequential choices before adopting them.
