# Agent context management

Use the [agent index](../README.md) for progressive disclosure. Start with root instructions, then search for the few sections, rules, decisions, and skills needed. Open a skill's instructions when its trigger matches. Shared agent files are public when tracked.

- [Project context](../PROJECT_CONTEXT.md) holds durable requirements, learning objectives, constraints, and proposals. [Project state](../context/PROJECT_STATE.md) is the concise snapshot of current phase, milestones, capabilities, blockers, decisions, and next action. Refresh state after meaningful changes.
- [Developer preferences](../context/DEVELOPER_PREFERENCES.md) retains explicit, durable preferences. Keep private details and transcript excerpts out of shared files.
- Put substantial implementation plans in `plans/`. Include objective, relevant context, scope and non-goals, affected components, dependencies, steps, risks, verification, and observable acceptance criteria.
- Put a handoff in `handoffs/` when transferring substantial or unfinished work that project state alone cannot capture. Include the request, completed work, discoveries and decisions, affected files, actual commands and outcomes, remaining work, blockers, and next action. Consolidate or archive stale handoffs. Put reusable prompts in `prompts/` only when they have a repeatable use.
- Link to the authoritative human-facing specification or approved ADR. Surface conflicts and reconcile outdated agent summaries. Treat unstated decisions as open, including after compaction or session changes.
