# Documentation standards

Assess documentation impact on every task. Update affected human documentation, config examples, and agent summaries alongside the change. If documented behavior is unaffected, mention that in the task report without creating an incidental edit.

Put detailed requirements, domain rules, contracts, architecture, evaluation, security, and operations in [docs](../../docs/README.md). Human-facing docs must stand on their own.

## Root README

Write the [root README](../../README.md) for public readers. Use one H1 for the application name, then these sections in order: Author, Table of contents, About, Features, System architecture, Technology stack, Getting started, Usage, Testing and verification, Project structure, Documentation and roadmap, and License.

- Confirm the public author identity and license from established repository information. If either remains undecided, state its status.
- Explain what the application does, whom it serves, and which problems it addresses. Keep personal motivations, portfolio objectives, career goals, and learning objectives out of the README.
- Use clickable heading links in the table of contents, relative links to repository documentation, and a diagram when it helps explain the architecture. Keep the prose technical and concise, with restrained visual decoration.
- Distinguish implemented features from planned ones and approved designs from open choices. Describe actual project paths. Cover prerequisites, installation, environment configuration, and running in Getting started. Publish setup, usage, and test commands only after verifying them. Mark pending steps explicitly.
- Review and update affected sections whenever features, architecture, dependencies, configuration, installation, usage, or verification changes. Keep details in linked documentation and verify heading anchors, links, and examples.

## General Markdown and project records

Use descriptive filenames and headings, a clear hierarchy, concise Markdown, relative repository links, and language-tagged fences. Use tables for reference information, numbered lists for ordered work, and Mermaid when it clarifies a flow. Check claims, links, configuration, and runnable examples against the repository. Mark proposed, approved, implemented, experimental, and deprecated material explicitly and remove stale guidance.

Use [ADRs](../../docs/README.md) for significant decisions. Preserve the historical record when superseding a decision. Use the [context standard](CONTEXT_MANAGEMENT.md) for session continuity.

Maintain delivery status in the [roadmap](../../docs/roadmap.md). Update affected checklist entries and link verification evidence when a completion criterion is met. Capture approved changes to scope or priority there and link the relevant specification or decision record.

Track application policies and runtime settings in the [policy and configuration index](../../docs/policies-and-configuration.md) or its linked source documents. Update the relevant entries, implementation, and safe examples together. Record agreed defaults, constraints, and environment differences. Mark undecided values as pending and keep secret values out of tracked documentation.
