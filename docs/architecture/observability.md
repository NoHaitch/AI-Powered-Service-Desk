# Observability architecture

The seven-day implementation target prioritizes a diagnosable local application. Centralized telemetry infrastructure is optional for both the functional and AI-powered MVPs.

| Priority | Milestone and dependency | Scope and completion evidence |
| --- | --- | --- |
| Essential | M1, with the first API slice and Compose services | Structured stdout logs, request correlation, redaction, liveness, and readiness. Verify a normal request, an error, and required-dependency failure on the default stack. |
| Incremental | M2 or M5, once representative routes and verification workloads exist | Measure request volume, errors, and latency. Use the capacity test for release evidence. Add a private metrics endpoint when continuous measurement is useful. |
| Incremental | M3 and M4, with each retrieval, provider, inference, or tool boundary | Capture timing, outcomes, and usage for the features that ship. Keep offline quality evaluations and durable audit evidence separate. |
| Optional | After the foundations, when an operational need justifies collection | Start with one signal and demonstrate a useful query or dashboard. Expand to centralized logs and cross-service tracing as needs arise. |

Local operational logs go to container stdout and are viewable through Compose. Persistent business and security audit records remain application data governed by their own integrity, access, and retention policies. A correlation ID can connect a diagnostic event to an audit event without duplicating its payload.

## Self-hosted candidates

| Candidate | Role | Dependency or trigger |
| --- | --- | --- |
| [OpenTelemetry](https://opentelemetry.io/docs/what-is-opentelemetry/) | Instrumentation and context propagation, with optional collection and export | Consistent signals or cross-service tracing are needed. |
| [Prometheus](https://prometheus.io/docs/introduction/overview/) | Collect and query time-series metrics | Services expose useful metrics that need regular collection. |
| [Grafana](https://grafana.com/docs/grafana/latest/datasources/) | Visualize telemetry from configured data sources | A dashboard answers a recurring operational question. |
| [Loki](https://grafana.com/docs/loki/latest/) | Centralized log storage and search | Logs from multiple services warrant shared search. |
| [Tempo](https://grafana.com/docs/tempo/latest/) | Distributed trace storage and lookup | Instrumented services produce traces that warrant storage. |

Consider an opt-in [Compose profile](https://docs.docker.com/compose/how-tos/profiles/) for collection infrastructure. Keep default development, tests, and MVP releases usable with the profile disabled. Choose components independently. When enabled, protect dashboard access, keep collectors and stores private, and bound retention and resource use.
