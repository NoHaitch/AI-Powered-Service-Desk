# Frontend experience

The service desk has three navigation areas built on React, Vite, Tailwind CSS, and the existing shadcn/ui preset. The [frontend guide](../../frontend/README.md) covers local operation. The [M0 API contract](m0-authentication-design.md#api-contract) and [incident requirements](../requirements/incident-intake-and-triage.md) remain authoritative for integration.

## Sitemap and current scope

| Area | Route or route family | Frontend preview state |
| --- | --- | --- |
| Public | `/`, `/login` | Synthetic persona selection. Real username and password login waits for FastAPI. |
| Public | `/about`, `/help` | Application overview and role-aware preview guidance. |
| Public | `/error/401`, `/error/403`, `/error/404`, `/error/500`, `/error/503` | Safe error views; unauthorized, forbidden, and unavailable ticket navigation use these presentations. |
| Public | Registration and password recovery | Deferred until account policy and backend support are defined. |
| Employee | `/portal`, `/portal/tickets` | Search assistance, primary actions, recent incidents, and searchable and paginated owned tickets. |
| Employee | `/portal/incidents/new`, `/portal/tickets/:id` | Incident submission, ticket details, scoped replies, activity history, and seeded resolutions. |
| Employee | `/portal/catalog`, `/portal/requests/new/:service` | Searchable and categorized synthetic services with dedicated request forms and employee tracking. `/portal/requests/new` also opens the catalog. |
| Employee | `/portal/knowledge`, `/portal/knowledge/:article` | Search, category filtering, and synthetic published articles. Relevant articles link to request forms. |
| Employee and management | `/{portal,workspace}/profile`, `/{portal,workspace}/notifications` | Persona profile, local preferences, scoped ticket updates, and per-persona read state. |
| Employee | `/portal/assistant`, service status | Grounded assistance placeholder. Service status is planned. |
| Management | `/workspace` | Role-aware fixture counts and Recharts incident volume. Administrators see aggregates and have no default access to incident details. |
| L1 agent | `/workspace/queue`, `/workspace/tickets`, `/workspace/assignments`, `/workspace/tickets/:id` | Oldest-first incident intake, prompt-review, assignment and status filters, triage, scoped replies, and internal notes. Assignment and resolution examples are seeded. |
| Administrator | `/workspace/knowledge`, `/workspace/knowledge/:article` | Knowledge inventory, local draft editing, and confirmed discard. Employee-visible fixtures are unchanged by drafts. |
| Administrator | `/workspace/access`, `/workspace/settings` | Labeled placeholders. An administrator persona has no implicit L1 grant. |
| Management | Assignment changes, later transitions, escalation, AI recommendations, knowledge publishing and ingestion, catalog administration, analytics, AI management, RBAC, SLA, audit logs | Planned. See the workflow decisions below. |

## Layout and design system

Public and employee pages use a responsive top bar, account and theme controls, and a minimal footer. The management area uses the existing collapsible shadcn Sidebar and a top utility bar. Ticket details include a breadcrumb and an activity timeline. Theme preference can be Light, Dark, or System.

Raleway, the Blue/Stone shadcn tokens, and Remix Icons remain the visual baseline. Use existing shadcn inputs, buttons, cards, menus, alerts, badges, and overlays. Use semantic status and priority colors with text labels. Keep reduced-motion support, visible focus, accessible labels, and bounded mobile table scrolling. See the [frontend design standard](../../.agents/rules/FRONTEND_DESIGN_STANDARDS.md).

## Navigation, integration, and user flows

Use browser links, lazy-loaded feature pages, and Vite's history fallback. Local release routing must preserve API forwarding before the SPA fallback. Revisit a declarative router when nested routes or retained navigation state justify the dependency.

Synthetic personas select preview scope without collecting passwords. Ticket changes, replies, knowledge drafts, and notification state persist only in the current tab's session storage. Theme preference is browser-local. Fixture identifiers are for display. Ticket activity represents employee-facing or staff-facing events and remains separate from the future audit trail. Ticket projections share a list and detail experience while retaining separate incident and request models. Fixture visibility checks mirror intended UI scopes. Enforce session, resource, and mutation authorization in the API and verify durable audit records there.

1. Sign in as Maya to report an incident or open an item in the catalog. Track both in My Tickets. On `INC-1047`, add a reply and review activity. Open `INC-1044` to see the seeded resolution and closed conversation.
2. Switch to Alex in the same tab to triage a new incident, review My Assignments, or respond on `INC-1047`. Add an internal note and confirm it stays out of Maya's view. Switch to Jordan to confirm that Maya's ticket links are unavailable.
3. Switch to Sam, edit a knowledge draft, and confirm discard when finished. Maya sees the original published content. The shared-drive article links to its dedicated catalog form.
4. Open the account menu to review the persona profile and notification preferences. Notifications are derived from scoped fixture events, and read state is per persona.

## Workflow decisions pending

| Workflow | Proposed first policy | Current preview |
| --- | --- | --- |
| Assignment and resolution | Let L1 agents self-assign triaged incidents and resolve their own assignments with a required resolution summary. Review closure, reopening, reassignment, and SLA timing separately. | Show seeded assignments, status, and resolution history. Triage remains the supported transition. |
| Escalation | Allow the assigned agent to hand off to the next tier with a reason. Clear individual assignment while preserving priority and elapsed SLA time. | Escalation mutations remain unavailable. |
| Service request fulfillment | Use a separate shared fulfillment queue, then decide routing, approvals, and SLAs. | Submit and track requests as the employee. The L1 incident queue remains incident-only. |
| Knowledge lifecycle | Decide publication, versioning, access rules, and ingestion alongside M3. | Edit and discard administrator drafts while preserving employee-visible fixture content. |

## Priorities and verification

1. Exercise preview routes, validation, permission affordances, and the fixture employee-to-L1 path.
2. Integrate cookie auth, CSRF, and incident endpoints. Replace fixture success and local state with authoritative responses. Add real API loading and failure states within the accepted contract.
3. Review pending workflow policies and integrate the catalog, agent lifecycle, ticket communication, and knowledge workflows according to the [roadmap](../roadmap.md). Add AI only as its data and authorization paths mature.

Run the frontend lint, build, and Bun tests. Verify desktop and mobile navigation, role denials, invalid input, triage outcome, and browser layout. Keep real security and end-to-end integration claims tied to backend verification.
