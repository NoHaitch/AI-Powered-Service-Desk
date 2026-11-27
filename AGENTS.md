# Repository instructions

AI-Powered Service Desk (`NoHaitch/AI-Powered-Service-Desk`) is a portfolio ITSM application for a fictional organization. Keep L1–L3 support tiers independent of P1–P4 priority. Enforce ticket transitions, escalation, and SLA rules in deterministic domain logic. Use public, appropriately licensed, or synthetic data and preserve a reproducible local workflow with zero mandatory spending. Obtain explicit approval before scaffolding or installing application dependencies.

## Navigation and workflow

- Inspect Git status, applicable instructions, and relevant files first. Use the [agent index](.agents/README.md) to locate the [current state](.agents/context/PROJECT_STATE.md), [project context](.agents/PROJECT_CONTEXT.md), and task-specific rules. Consult relevant project context before planning or implementing. Read only the sections you need.
- For substantial work, define scope, acceptance criteria, trade-offs, and verification in a focused plan. Discuss consequential product, architecture, security, public contract, or cost decisions before acting. Once implementation is authorized, proceed independently on routine in-scope edits and checks.
- Use the [roadmap](docs/roadmap.md) for milestones and completion criteria. Update affected checklist entries and the current state when progress changes. Discuss material changes to scope, priority, or release boundaries with the developer before adopting them.
- Follow the [repository structure standard](.agents/rules/REPOSITORY_STRUCTURE.md) when scaffolding, organizing modules, or adding services and infrastructure.
- Implement small cohesive changes. Follow the [coding standards](.agents/rules/CODING_STANDARDS.md), use English, and keep formatting and naming consistent. Keep business logic independently testable.
- Follow the [testing standards](.agents/rules/TESTING_STANDARDS.md). Add or update appropriate tests for changed behavior. Discover and run applicable checks, fix failures introduced by the change, and report the commands you actually ran.
- Assess documentation on every task. Follow the [root README standard](.agents/rules/DOCUMENTATION_STANDARDS.md#root-readme) and synchronize affected [human documentation](docs/README.md), configuration examples, and shared agent context in the same change. If documented behavior is unaffected, say briefly that no documentation update was needed.
- Apply security by design, secure defaults, defense in depth, least privilege, and fail-closed behavior. Follow the [security standards](.agents/rules/SECURITY_STANDARDS.md).
- Follow the [containerization standards](.agents/rules/CONTAINER_STANDARDS.md) for Docker images, Compose services, and local release verification.
- Follow the [database standards](.agents/rules/DATABASE_STANDARDS.md) for PostgreSQL and Redis changes, including migration review and integration tests where applicable.
- Follow the [observability standards](.agents/rules/OBSERVABILITY_STANDARDS.md) when changing service boundaries, operational signals, or AI integrations.
- Preserve existing work. Review tracked and new files for unintended changes and secrets, and run `git diff --check` where applicable. Obtain explicit authorization before committing, pushing, merging, creating or changing branches, tagging releases, opening PRs, deploying, running destructive Git operations, creating paid resources, or performing other external writes.
- Follow the [Git and release workflow](docs/git-and-releases.md). Keep `main` stable and integrate on `dev`. Verify locally before merging to `main` and release manually from version tags on `main`. CI/CD is deferred.

## Commit messages and identity

- For each authorized commit, use a single concise English subject following [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). Use `type: summary` or `type(scope): summary`. Omit the body and trailers. Use `feat` for features and `fix` for bug fixes. Other common types include `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `revert`, `style`, and `test`. For removals, choose the type by purpose, such as `chore` for maintenance cleanup. Mark breaking changes with `!` before the colon and describe the break in the subject.
- Use the developer's configured local Git name and email as the sole author and committer. Preserve the Git identity configuration and never override it with flags or environment variables. Never add a `Co-authored-by` trailer or AI attribution. If the developer's Git identity is missing, ask before committing.

## Required skill triggers

Use each applicable skill once per task and read its linked rules only as needed. If Codex has not surfaced the skill, open its linked `SKILL.md` directly.

| Skill | Required when |
| --- | --- |
| [implementation-planning](.agents/skills/implementation-planning/SKILL.md) | A feature or change is substantial, cross-service, or architectural. |
| [code-change-verification](.agents/skills/code-change-verification/SKILL.md) | Application code, runtime behavior, tests, dependencies, or build behavior changes. |
| [docs-sync](.agents/skills/docs-sync/SKILL.md) | Features, architecture, configuration, setup, APIs, deployment, or business rules change. |
| [context-handoff](.agents/skills/context-handoff/SKILL.md) | Completing a substantial milestone, suspending unfinished work, or transferring work. |
| [security-review](.agents/skills/security-review/SKILL.md) | Security-sensitive behavior, secrets, trust boundaries, data handling, service exposure, or AI tool access changes. |
| [architecture-review](.agents/skills/architecture-review/SKILL.md) | Service boundaries, data ownership, public contracts, infrastructure, or significant dependencies change. |
| [ai-evaluation](.agents/skills/ai-evaluation/SKILL.md) | Retrieval, embeddings, prompts, model providers, generation, ML, or agent workflows change. |
| [itsm-domain-review](.agents/skills/itsm-domain-review/SKILL.md) | Incidents, ticket lifecycle, priority, tiers, SLAs, assignment, or escalation change. |

## Definition of done

Meet the acceptance criteria, verify the relevant behavior and quality checks, review security and the diff, and synchronize affected docs and context. Record material decisions in ADRs. Report implementation status, actual verification, limitations, and any remaining work. Mark verification as partial when a required check could not run.

For security-relevant changes, the definition of done includes the [security verification requirements](.agents/rules/SECURITY_STANDARDS.md#security-verification), with evidence from applicable negative tests and failure scenarios.
