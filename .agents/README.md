# Agent workflow index

Start with the [repository instructions](../AGENTS.md). Open only the entries relevant to the task. Shared files here can become public when tracked.

| Use | Location |
| --- | --- |
| Product scope, constraints, and proposals | [Project context](PROJECT_CONTEXT.md) |
| Milestones, feature checklist, and completion criteria | [Project roadmap](../docs/roadmap.md) |
| Milestone, blockers, and next action | [Project state](context/PROJECT_STATE.md) |
| Explicit collaboration preferences | [Developer preferences](context/DEVELOPER_PREFERENCES.md) |
| Engineering rules | [Coding](rules/CODING_STANDARDS.md), [testing](rules/TESTING_STANDARDS.md), [documentation](rules/DOCUMENTATION_STANDARDS.md), [security](rules/SECURITY_STANDARDS.md), [containerization](rules/CONTAINER_STANDARDS.md), [context](rules/CONTEXT_MANAGEMENT.md) |
| Operational instrumentation | [Observability](rules/OBSERVABILITY_STANDARDS.md) |
| Data integrity and persistence | [Database standards](rules/DATABASE_STANDARDS.md) |
| Monorepo layout and component ownership | [Repository structure](rules/REPOSITORY_STRUCTURE.md) |
| Reusable, task-specific workflows | [Required skill triggers](../AGENTS.md#required-skill-triggers) |
| Working artifacts | `plans/` for substantial plans, `handoffs/` for transfers that need extra detail, and `prompts/` for reusable prompts worth sharing |
| Private scratch | `local/` and `scratch/` are Git-ignored. Keep secrets in an appropriate secret store. |

Codex can select repository skills automatically by description or explicitly via `$skill-name`. If a skill is unavailable in the current selector, read the linked `SKILL.md`. A fresh session from the repository root is a good way to check discovery of new root instructions and skills. [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills) · [Codex instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md#how-codex-discovers-guidance)

The [project documentation](../docs/README.md) is the independent reference for contributors and reviewers.
