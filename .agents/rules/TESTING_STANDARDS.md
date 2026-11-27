# Testing and verification standards

Cover changed behavior and bug fixes with appropriate automated tests, including feasible regression coverage. Use deterministic, isolated fixtures and observable assertions. Cover success, invalid input, boundaries, permissions, and relevant failure paths. Use coverage to find untested behavior and keep existing checks meaningful.

| Layer | Scope and candidate tools |
| --- | --- |
| Unit | Domain policy and pure functions with pytest or Vitest. Measure coverage with coverage.py or pytest-cov where useful. |
| Integration | Adapter and storage behavior with Testcontainers, Firebase emulators, or local Qdrant as applicable. |
| API contract | HTTP behavior with pytest/HTTPX, including schemas, status codes, error shape, and authorization. |
| Frontend component | User-visible states and accessibility with Vitest and React Testing Library. |
| End-to-end | Critical role-based workflows in a browser with Playwright. |
| Security | Boundary, negative authorization, hostile input, and failure-path tests, plus appropriate dependency or image checks. See the [security verification requirements](SECURITY_STANDARDS.md#security-verification). |
| Regression | A focused test at the layer where a bug is reliably observable. |
| Performance | Run a repeatable backend capacity test before release using k6 or equivalent. |
| ML | Held-out evaluation, leakage-safe splits, baseline comparison, macro F1, per-class metrics, and calibration when displaying confidence. |
| RAG | Separate retrieval metrics such as Recall@K, MRR, and nDCG from answer grounding, relevance, citation correctness, and abstention. |
| Agent and MCP | Verify tool permissions, approval, refusal, retry and iteration limits, failure paths, and audit outcomes. |

Every feature needs a feature-level acceptance and regression check through its normal entry points. Map checks to the user journeys and affected layers before implementation. Exercise a representative successful journey, invalid input, denied access and other relevant security boundaries, integration with real local dependencies, and end-to-end behavior where the feature crosses components. Add concurrency, retries, and dependency failure and recovery when affected. For browser workflows, use Playwright through the deployed ingress where the browser or proxy behavior matters. Isolated unit tests and mocks supplement these checks.

A feature is complete only after every applicable check passes. Record evidence, including the command, environment, scenario, and outcome. Explain inapplicable layers or mark verification partial when a required check is blocked. Maintain the resulting checks as regression coverage.

Discover commands from actual manifests and local scripts. Run relevant formatting, linting, type checks, tests, and build checks, with broader verification for shared or critical changes. Use the configured Ruff, MyPy, ESLint, and TypeScript checks when available. Fix failures caused by the change and report unrelated failures separately. Report commands, outcomes, and gaps accurately. Follow the [local merge gate](../../docs/git-and-releases.md#local-merge-gate) before merging to `main`.

Keep routine checks independent of production and paid APIs. Use external provider mocks in routine tests. Real-provider evaluations require explicit enablement and bounded quotas. Label illustrative data clearly and report measured evidence with reproducible settings.

## Backend capacity testing

Exercise the backend API directly with a representative mix of authenticated requests and seeded data in a controlled environment. Define latency and error-rate thresholds and a steady-state measurement window before the run. Increase load in bounded stages to measure the highest sustained concurrent virtual users and requests per second that meet those thresholds. Record p95 latency, error rate, resource use, the test environment, and any observed bottlenecks. Use local or mocked external dependencies and document their effect on the results.
