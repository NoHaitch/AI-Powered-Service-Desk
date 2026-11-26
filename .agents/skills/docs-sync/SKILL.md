---
name: docs-sync
description: Synchronize authoritative documentation after changes to features, architecture, configuration, setup, APIs, deployment, or business rules.
---

# Docs sync

1. Use the [documentation standards](../../rules/DOCUMENTATION_STANDARDS.md) and [documentation index](../../../docs/README.md) to locate authoritative guidance. Search old names, paths, endpoints, and variables to find affected references.
2. Update only affected material. Keep README status, setup, examples, ADRs, contracts, and agent summaries consistent where they are affected. Preserve superseded ADRs and link replacements.
3. Check local links and commands against the files or manifests they rely on. Confirm configuration examples and mark proposed or experimental behavior as such. Note verification limits.
