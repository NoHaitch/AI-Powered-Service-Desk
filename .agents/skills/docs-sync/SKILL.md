---
name: docs-sync
description: Synchronize authoritative documentation after changes to features, architecture, configuration, setup, APIs, deployment, or business rules.
---

# Docs sync

1. Use the [documentation standards](../../rules/DOCUMENTATION_STANDARDS.md) and [documentation index](../../../docs/README.md) to locate authoritative guidance. Search old names, paths, endpoints, and variables to find affected references.
2. Update only affected material. Apply the [root README standard](../../rules/DOCUMENTATION_STANDARDS.md#root-readme) when public-facing status or instructions change. Keep ADRs, contracts, examples, and agent summaries consistent where affected. Preserve superseded ADRs and link replacements.
3. Check table-of-contents anchors, local links, and commands against the relevant headings, files, and manifests. Synchronize the [policy and configuration index](../../../docs/policies-and-configuration.md) when policies or settings change. Confirm safe configuration examples, mark pending values, and note verification limits.
