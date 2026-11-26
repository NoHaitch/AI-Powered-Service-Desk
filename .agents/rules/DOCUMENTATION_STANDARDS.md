# Documentation standards

Assess documentation impact on every task. Update affected human documentation, config examples, and agent summaries alongside the change. If documented behavior is unaffected, mention that in the task report without creating an incidental edit.

Use the root README for the product introduction, motivation, feature status, high-level architecture and stack, setup and environment instructions, verification, demo or deployment, limitations, and licensing as each becomes available. Put detailed requirements, domain rules, contracts, architecture, evaluation, security, and operations in [docs](../../docs/README.md). Human-facing docs must stand on their own.

Use descriptive filenames and headings, a clear hierarchy, concise Markdown, relative repository links, and language-tagged fences. Use tables for reference information, numbered lists for ordered work, and Mermaid when it clarifies a flow. Check claims, links, configuration, and runnable examples against the repository. Mark proposed, approved, implemented, experimental, and deprecated material explicitly and remove stale guidance.

Use [ADRs](../../docs/README.md) for significant decisions. Preserve the historical record when superseding a decision. Use the [context standard](CONTEXT_MANAGEMENT.md) for session continuity.
