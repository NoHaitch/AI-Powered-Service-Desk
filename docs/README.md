# Project documentation

M0 product planning is complete and the M1 frontend foundation is in progress. The [project README](../README.md) describes the application and its current scope. The [frontend guide](../frontend/README.md) covers the Vite, Tailwind CSS, and shadcn/ui setup.

See the [Git and release workflow](git-and-releases.md) for branch roles, the local merge gate, and manual releases.

See the [project roadmap](roadmap.md) for milestone status, the prioritized feature checklist, release gates, and open scope decisions.

See the [accepted incident intake and L1 triage requirements](requirements/incident-intake-and-triage.md) for the first slice.

See the [local-first architecture proposal](architecture/local-first.md) for Docker Compose service boundaries, the database and cache decision, and open authentication and communication choices.

See the [frontend decision](decisions/0002-react-vite-and-bun.md) for the selected UI stack and release build direction.

See the [PostgreSQL integration design](architecture/postgresql-integration.md) for the selected driver, sessions, and migration verification.

See the [observability architecture](architecture/observability.md) for instrumentation priorities, the audit boundary, and optional local collection.

See the [M0 authentication and incident design](architecture/m0-authentication-design.md) for the accepted API and data contracts, threat model, and evaluation plan.

See [application policies and configuration](policies-and-configuration.md) for policy status and runtime settings as they are defined.

See the [project roadmap](roadmap.md) for milestone status, the prioritized feature checklist, release gates, and open scope decisions.

As design work is approved, this index will link to the product requirements and ITSM policies, architecture and data/API contracts, security threat model, testing and AI evaluation strategy, and local setup and operations guides. Each document should identify whether it describes a proposal, an approved design, an implemented capability, an experiment, or a deprecated approach.

Record significant decisions under `docs/decisions/` as they arise. Use a stable identifier and title, status, date, context, decision, alternatives, rationale, trade-offs, consequences, and references. Keep superseded records accessible and link them to their replacements.

Publish commands, configuration, and demo instructions when they can be checked against the repository.
