# Employee incident submission and L1 triage

**Status:** Accepted in M0. Implementation requires separate authorization to scaffold.

## Scope

A signed-in employee reports an unplanned service disruption. The employee can find and read their own incident. An authorized L1 agent can find it in the intake queue, assess impact and urgency, and complete triage. This slice ends at `Triaged`. Service requests, individual assignment, escalation, full SLA policy, knowledge management, and AI belong to later slices.

The agreed defaults are a required summary and description, priority pending until L1 assessment, a shared intake queue for authorized L1 agents, and restricted staff access to raw audit records. Triage moves an incident from `New` to `Triaged` without assigning an individual agent.

## Acceptance criteria

| ID | Scenario | Observable result |
| --- | --- | --- |
| INC-01 | An authenticated employee submits a valid summary and description. | One incident is created with a reference ID, server-recorded requester and creation time, L1 queue, and `New` status. The employee sees confirmation and can reopen the detail view after a refresh. Priority remains pending triage. |
| INC-02 | A required field is missing, blank, or over its approved limit. | The UI identifies the affected field, and the server rejects invalid input even if client validation is bypassed. The submission creates neither an incident nor a success audit event. See the field limits below. |
| INC-03 | A visitor has no session, or employee B tries to access employee A's incident by URL or API. | The server denies access. Employee lists expose only the signed-in employee's own incidents, and an unauthorized response exposes no incident details. Employee input cannot set requester, status, tier, or priority. |
| INC-04 | An authorized L1 agent opens the intake queue. | The new incident appears in the authorized queue. The agent can open it and see the report. An employee or an agent outside the queue's access scope cannot read the queue or triage the incident. |
| INC-05 | An authorized L1 agent assesses impact and urgency for a `New` incident. | The server validates both values and applies the approved matrix to compute P1–P4. On success, it persists the assessment and changes status to `Triaged`. The tier stays L1 at every priority. The employee can see the updated status and priority on their incident. |
| INC-06 | An actor attempts unauthorized triage, submits invalid ratings, or repeats a transition after another agent completed it. | The server rejects the invalid transition or stale update and preserves the last valid incident state. Exactly one successful triage is recorded. |
| INC-07 | Submission or triage succeeds. | The audit trail records the incident reference, actor, timestamp, action, and relevant state changes, including impact, urgency, and priority for triage. Authorized staff can inspect the record. Employee views expose only employee-facing ticket information. A failed write leaves no partial success state. |
| INC-08 | An employee flags a report for prompt L1 review at submission. | The queue visibly marks the report and lets L1 filter for flagged incidents. Default ordering is oldest first. The flag does not change urgency, priority, SLA behavior, or support tier. Unflagged reports remain visible by default. |

Verify the happy path with a browser or equivalent end-to-end check. Use API or integration tests for role and ownership boundaries, validation, stale updates, and audit consistency. Use domain tests for each approved matrix combination and allowed transition. Seed local accounts and synthetic incidents so checks run without paid or external AI services.

## Field limits

Require a summary of 1–120 characters and a description of 1–4,000 characters after trimming surrounding whitespace. Accept plain text, allow multiline descriptions, and enforce the same character-counting rules on the client and server. Prompt employees to include the affected service, observed impact, and when the disruption started. Test blank input, exact limits, and one character over each limit.

## Priority matrix

L1 assesses **impact** by the extent and business consequence of the disruption. High means a critical business service or broad organizational impact, medium means a team or measurable business workflow is affected, and low means the impact is localized. L1 assesses **urgency** by how long work can reasonably wait. High means work is blocked or delay would cause serious harm, medium means work is degraded or a workaround is limited, and low means a viable workaround allows work to continue.

| Impact / urgency | High | Medium | Low |
| --- | --- | --- | --- |
| High | P1 | P2 | P3 |
| Medium | P2 | P3 | P4 |
| Low | P3 | P4 | P4 |

P1 is reserved for high impact and high urgency. A single blocked employee would normally receive P3 at low impact and high urgency. L1 can assess higher impact where the business consequence warrants it. Verify all nine combinations and keep the matrix separate from tier assignment and any future SLA timing or override policy.

## Urgent reports before triage

Offer an optional **Request prompt review** checkbox. L1 sees a visible flag and can filter for flagged incidents. The default unfiltered queue is oldest first and includes flagged and unflagged work. The flag does not assign priority or trigger automated notification or an immediate-response guarantee. If an established urgent contact channel exists, show it alongside intake. Notification and SLA clock policy belong to later slices.
