# Observability standards

Apply observability at application, service, and AI boundaries. Follow the [milestone priorities](../../docs/architecture/observability.md) for instrumentation and collection.

## Foundations

- Emit structured logs to stdout with UTC timestamp, severity, service, event, outcome, and duration where applicable. Use route templates and status codes for HTTP requests. Include a correlation ID in request logs and safe responses.
- Generate a request ID at the trusted entry point. Accept upstream IDs only from trusted boundaries after validation. Propagate the ID on internal calls and attach trace and span IDs when tracing is enabled. IDs never establish identity or permissions.
- Provide minimal liveness and readiness endpoints for HTTP services, such as `/health` and `/ready`, and suitable health checks for supporting containers. Liveness checks the process itself. Readiness checks required dependencies with bounded timeouts. Report optional dependency degradation without marking unrelated routes unavailable.
- Redact before writing or exporting. Allowlist fields and exclude credentials, tokens, cookies, personal data, raw payloads, ticket bodies, documents, prompts, and model responses by default. Limit telemetry access and retention. Keep probe responses free of sensitive diagnostics.
- Keep operational telemetry separate from durable business and security audits. Telemetry can be sampled or dropped under backpressure. A collector failure must never suppress a required audit write. Correlation IDs can link records across stores.

## Incremental signals

- Measure request rate, errors, and latency when metrics are introduced. Use bounded labels such as route template, method, status class, and service. Keep user, ticket, request, and trace IDs and raw URLs out of labels. Protect metrics endpoints on the internal network.
- Add distributed tracing when cross-service diagnosis warrants it. Propagate standard trace context at trusted boundaries, sample spans, and allowlist attributes and outbound metadata. Exclude sensitive data from attributes and baggage.
- As AI components ship, instrument retrieval, generation, inference, and tools at their respective boundaries. Prefer stage duration, outcomes, timeouts and retries, model/version, token or retrieval counts, and tool or approval outcomes. Track quality evaluation evidence and durable approvals separately.
- Bound exporter queues, retries, retention, and resource use. Optional telemetry outages must not block application requests. Verify correlation, readiness failure, redaction, and operation with the collection stack disabled on affected paths.
