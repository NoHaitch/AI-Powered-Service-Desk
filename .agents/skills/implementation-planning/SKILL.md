---
name: implementation-planning
description: Plan substantial features, cross-service changes, and architectural work with observable acceptance criteria and proportionate verification.
---

# Implementation planning

1. Read the [project state](../../context/PROJECT_STATE.md) and relevant [product context](../../PROJECT_CONTEXT.md). Trace affected entry points, authorization, data ownership, and downstream callers.
2. Define scope, non-goals, dependencies, failure cases, and acceptance criteria. Prefer a small end-to-end slice. Compare consequential alternatives and bring unresolved product, contract, security, or cost questions to the developer.
3. Save the substantial plan under `plans/` as described in the [context rules](../../rules/CONTEXT_MANAGEMENT.md). Link existing decisions and specify how each critical criterion will be verified. Match the plan to the implementation authorization.
