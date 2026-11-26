# Project roadmap

This living roadmap tracks delivery order and completion evidence. The release sequence below is agreed. Specific domain policies and technology choices remain open until reviewed.

## Release targets

| Target | Scope | Release gate |
| --- | --- | --- |
| Functional MVP | Local Docker Compose foundation (M1), end-to-end service desk (M2), and basic knowledge management (M3). | Complete the functional checks in M3 and apply M5 to this scope. |
| AI-powered MVP | Add grounded assistance after the functional desk works end to end. Use a vector database for the semantic branch of hybrid RAG and integrate an LLM for citation-backed answers (M3). | Meet the AI evaluation and access-control criteria in M3 and apply M5 to the expanded scope. |
| Advanced AI engineering | Incrementally deliver a trained routing classifier with Dockerized inference, MCP integration, and controlled agentic workflows (M4) as their prerequisites become ready. | Evaluate each increment and apply the relevant M4 and M5 checks before release. |

Hosted deployment remains optional (M6).

## Milestones

| ID | Milestone | Status | Depends on | Priority and release role |
| --- | --- | --- | --- | --- |
| M0 | [Product planning](#m0-product-planning) | Done | Repository workflow established | First-slice baseline approved |
| M1 | [Application foundation](#m1-application-foundation) | Planned | Explicit scaffolding authorization | Next, functional MVP |
| M2 | [Functional service desk](#m2-functional-service-desk) | Planned | M1 | Functional MVP |
| M3 | [Knowledge and grounded assistance](#m3-knowledge-and-grounded-assistance) | Planned | M2 | Basic knowledge management for the functional MVP, then grounded assistance for the AI-powered MVP |
| M4 | [Routing and controlled workflows](#m4-routing-and-controlled-workflows) | Deferred | Stable ticket data for classification. Grounded assistance and approved tool boundaries for evidence-dependent workflows. | Advanced AI engineering |
| M5 | [Hardening and local release](#m5-hardening-and-local-release) | Planned | Completed capabilities for the applicable release target | Repeat for each release |
| M6 | [Hosted deployment](#m6-hosted-deployment) | Deferred | M5 and hosting approval | Optional |

**Status values** are Planned, Active, Blocked, Decision pending, Done, and Deferred. Within a milestone, read the checklist in delivery order unless a dependency says otherwise. Check an item once its observable result has been verified. Mark a milestone Done when its release-scoped checklist and completion gate pass, and link the evidence alongside the gate. Record agreed scope changes here and link the relevant specification or decision record. Review affected rows whenever scope, dependencies, status, or completion evidence changes.

## M0 Product planning

- [x] Establish repository conventions, agent workflow, and the Git and manual release strategy.
- [x] Agree on the functional MVP, AI-powered MVP, and later advanced AI release targets.
- [x] Approve [acceptance criteria for employee incident intake and L1 triage](requirements/incident-intake-and-triage.md), including field limits, the priority matrix, and prompt review.
- [x] Select [PostgreSQL for persistence and Redis for caching](decisions/0001-postgresql-and-redis.md).
- [x] Select [React, Vite, TypeScript, and Bun](decisions/0002-react-vite-and-bun.md) for the frontend.
- [x] Decide [stateless access verification, refresh rotation, and token lifetimes](decisions/0003-stateless-access-and-refresh-rotation.md).
- [x] Approve sensitive-operation checks, reauthentication, and fail-closed M1 Redis rate limiting.
- [x] Finalize the [first-slice API and data contracts, threat model, and evaluation plan](architecture/m0-authentication-design.md).
- [x] Approve same-origin HTTPS, Vite development proxying, preferred Nginx release routing, limiter defaults and recovery, and five-minute reauthentication.
- [x] Approve the [PostgreSQL integration](decisions/0004-postgresql-integration.md), session architecture, UUIDs, schema invariants, and transaction boundaries.
- [x] Approve [login normalization, audit retention, restricted deletion, and revocation triggers](architecture/m0-authentication-design.md#login-and-record-lifecycle-policy).

**Completion gate met.** The first-slice requirements and policy decisions are approved, and the linked contracts, threat model, and verification plan reflect them. M1 awaits separate authorization to scaffold.

## M1 Application foundation

- [ ] Establish the React/Vite frontend, FastAPI, and PostgreSQL containers using Docker Compose, with safe configuration examples and reusable local checks. Use Bun for frontend tooling and distinguish development targets from release images.
- [ ] Implement the [observability foundations](architecture/observability.md) with the first API slice and Compose services. Verify structured logs, correlation, redaction, liveness, and readiness without a collector.
- [ ] Provide a documented [database seed command](architecture/local-first.md#demo-data-seeding) that runs after migrations and populates local PostgreSQL with synthetic users and incidents for the intake and triage demo. Verify that a fresh database can be seeded and a second run creates no duplicates.
- [ ] Implement sign-in, refresh, logout, and server-side authorization for seeded roles. Introduce private Redis rate limiting with the first login and refresh flow. Verify limits, concurrency, expiry, and recovery, plus fail-closed `503` responses and unaffected routes. Add auth and limiter logs, audit events, health signals, and bounded metrics without requiring an observability stack.
- [ ] Deliver one tested vertical slice where an employee submits and views their own incident, L1 filters the queue and triages the incident, and each successful change produces an audit event. Verify the browser flow and negative cases against the M0 evaluation plan.

**Completion gate.** A local setup can run the slice without paid services. Tests demonstrate successful intake and triage, denied cross-user access, invalid input handling, and a correct audit record.

## M2 Functional service desk

Agree on the remaining lifecycle, escalation, priority overrides, and SLA policies before implementing those behaviors.

- [ ] Support incidents and service requests, including assignment, pending work, resolution, closure, and reopening with history.
- [ ] Add role and user administration, L1–L3 queues and routing, escalation, direct specialist routing, reassignment and de-escalation, with reasons and preserved handoff history.
- [ ] Calculate P1–P4 priority from an impact and urgency matrix, independent of support tier. Record authorized overrides and reasons.
- [ ] Add configurable response and resolution SLA targets, calendars, time zone, pause and breach behavior, and visible deadlines. Preserve elapsed time correctly across escalation.
- [ ] Provide employee ticket history and escalation requests, agent filters and resolution history, administrator audit views, and accessible loading, error, and empty states.

**Completion gate.** Seeded scenarios cover all tiers and priorities. Tests cover authorization, valid and invalid transitions, SLA boundaries, escalation, and concurrent updates. Support staff can complete the flow manually.

## M3 Knowledge and grounded assistance

- [ ] **Functional MVP.** Let administrators upload, version, and manage access to PDF, Markdown, and plain-text knowledge documents. Track source metadata and ingestion status. Verify safe parsing, repeatable ingestion, and replacement and deletion behavior.
- [ ] **AI-powered MVP.** Compare keyword, vector-based semantic, and hybrid retrieval using a reviewed dataset and identical access rules. Evaluate fusion against the baselines and record relevance and latency results.
- [ ] **Planned AI.** Add citation-backed employee answers and support troubleshooting, similar-incident search, and evidence-backed resolution suggestions. Handle insufficient evidence, invalid output, and provider failure gracefully. Use a mock provider for routine tests and a clearly labeled demo mode.
- [ ] **Planned AI.** Instrument retrieval and generation as they ship. Expose relevant retrieval results, model usage, and evaluation results to authorized administrators.

**Completion gate.** Knowledge is accessible only to authorized roles. For the AI scope, record retrieval metrics such as Recall@K, MRR or nDCG, and verify citation mapping, grounding, abstention, and access filtering. Use public, licensed, or synthetic evaluation data.

## M4 Routing and controlled workflows

- [ ] Once the ticket taxonomy and labeled data are ready, train a category and routing classifier. Compare simple baselines and the trained model on held-out data. Record provenance, macro F1, per-class results, and calibration where confidence is displayed. Validate reproducible, versioned Dockerized inference and fallback to manual routing.
- [ ] Evaluate a bounded support workflow after grounded assistance is working. Consider direct application orchestration first, then compare LangChain or LangGraph where a concrete integration or state-management need warrants it.
- [ ] Introduce MCP when the tool use case and authorization boundary are clear. Start with authorized read-only tools. A future write requires explicit approval of the exact operation, rechecked permissions, safe retries, and auditing.
- [ ] Instrument inference and tool boundaries as they ship. If an advanced workflow ships, provide authorized access to its execution history and test malicious input, denied approval, errors, retry limits, and audit behavior. Evaluate distributed tracing separately.

**Completion gate.** Discuss and record scope before implementation. Any shipped component has measured evaluation evidence, a safe fallback, and documented operating limits. Dependencies and services are justified by the approved use case.

## M5 Hardening and local release

- [ ] Verify approved flows end to end, including access boundaries, safe upload handling, secret redaction, dependency checks, rate limits, and failure recovery. Include relevant AI regression checks for any shipped AI features.
- [ ] Verify the M1 observability foundations against the release configuration. Add lightweight metrics where useful for the capacity test and diagnostics.
- [ ] Run the documented backend capacity test. Record concurrent virtual users, sustained requests per second, p95 latency, error rate, and the test environment.
- [ ] Verify the local demo from a clean checkout using controlled services and seed data. Publish setup, architecture and decision records, known limits, evaluation evidence for shipped capabilities, and the demo walkthrough.
- [ ] Follow the [Git and release workflow](git-and-releases.md) for local checks, an authorized semantic version tag, and release and rollback notes.

**Completion gate.** A reviewer can reproduce the approved release locally with zero mandatory spending. Document actual quality and capacity results and the tagged release's known limitations.

## M6 Hosted deployment

- [ ] **Deferred and optional.** Evaluate hosting after the local release. Verify pricing, quotas, billing exposure, secrets, deployment health, and rollback options before approval.
- [ ] **If approved.** Manually deploy a verified revision tagged on `main`. Use staging and production as environments and smoke-test the deployed revision.

**Completion gate.** Hosting proceeds only with explicit approval. The documented local release serves as the reproducible portfolio demo if hosting is deferred.

## Optional and deferred scope

- **Optional observability infrastructure.** Consider an opt-in Compose profile for collection, centralized logs, dashboards, and tracing after the lightweight [foundations](architecture/observability.md) are usable. The seven-day target prioritizes the foundations and instrumentation of shipped features.

- **Optional enhancements.** L0 AI self-service, advanced reranking, additional providers, richer analytics, problem management, postmortems, SLOs, and monitoring integrations. Add them when they address a demonstrated need.
- **Deferred.** Multi-tenant isolation, external GitHub MCP integration, public hosting, and hosted CI/CD pipelines. A full ITSM suite, autonomous system administration, real password resets, and Kubernetes are outside the initial-release scope.

## Decisions to discuss

| Decision | Proposal or open choice | Needed by |
| --- | --- | --- |
| Service desk expansion | Agree on lifecycle transitions beyond triage, escalation, priority overrides, and SLA timing. | M2 |
| Retrieval and generation | Decide the indexing approach, embedding model, provider, fusion strategy, and evaluation thresholds after representative data and baseline results are available. | M3 |
| AI tooling and datasets | Select the classifier taxonomy, dataset, inference boundary, LangChain or LangGraph use, and MCP tool scope only when justified. | M4 |
| Hosting | Keep a reproducible local demo as the baseline. Decide on provider and cost controls only if public hosting is pursued. | M6 |
