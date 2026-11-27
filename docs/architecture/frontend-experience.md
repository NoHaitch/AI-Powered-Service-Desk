# Frontend experience

The service desk has three navigation areas built on React, Vite, Tailwind CSS, and the existing shadcn/ui preset. The [frontend guide](../../frontend/README.md) covers local operation. The [M0 API contract](m0-authentication-design.md#api-contract) and [incident requirements](../requirements/incident-intake-and-triage.md) remain authoritative for integration.

## Sitemap and current scope

| Area | Route or route family | Frontend preview state |
| --- | --- | --- |
| Public | `/`, `/login` | Synthetic persona selection. Real username and password login waits for FastAPI. |
| Public | `/about` | Preview workflow, employee and staff use cases, technology stack, sample contacts, and a link to the FAQ. |
| Public | `/help` | Categorized FAQ for the preview and sample workplace IT guidance. |
| Public | `/error/401`, `/error/403`, `/error/404`, `/error/500`, `/error/503` | Safe error views; unauthorized, forbidden, and unavailable ticket navigation use these presentations. |
| Public | Registration and password recovery | Deferred until account policy and backend support are defined. |
| Employee | `/portal`, `/portal/tickets` | Search assistance, primary actions, recent incidents, and searchable and paginated owned tickets. |
| Employee | `/portal/incidents/new`, `/portal/tickets/:id` | Incident submission, ticket details, scoped replies, activity history, and seeded resolutions. |
| Employee | `/portal/catalog`, `/portal/requests/new/:service` | Searchable and categorized synthetic services with dedicated request forms and employee tracking. `/portal/requests/new` also opens the catalog. |
| Employee | `/portal/knowledge`, `/portal/knowledge/:article` | Search, category filtering, and synthetic Markdown articles. Relevant articles link to request forms. |
| Employee and management | `/{portal,workspace}/profile`, `/{portal,workspace}/notifications` | Persona profile, local preferences, scoped ticket updates, and per-persona read state. |
| Employee | `/portal/assistant`, service status | Grounded assistance placeholder. Service status is planned. |
| Management | `/workspace` | Role-aware fixture counts and Recharts incident volume. Administrators see aggregates and have no default access to incident details. |
| L1 agent | `/workspace/queue`, `/workspace/tickets`, `/workspace/assignments`, `/workspace/tickets/:id` | Oldest-first incident intake, prompt-review, assignment and status filters, triage, scoped replies, and internal notes. Assignment and resolution examples are seeded. |
| Administrator | `/workspace/knowledge`, `/workspace/knowledge/:article` | Knowledge inventory, local draft editing, and confirmed discard. Employee-visible fixtures are unchanged by drafts. |
| Administrator | `/workspace/access`, `/workspace/settings` | Labeled placeholders. An administrator persona has no implicit L1 grant. |
| Management | Assignment changes, later transitions, escalation, AI recommendations, knowledge publishing and ingestion, catalog administration, analytics, AI management, RBAC, SLA, audit logs | Planned. See the workflow decisions below. |

## Layout and design system

Public and employee pages use a responsive top bar with account and theme controls. The management area uses the existing collapsible shadcn Sidebar and a top utility bar. Ticket lists offer 10, 20, 50, or 100 rows per page on desktop and mobile, starting at 10. Changing the page size returns to page one. Ticket table headers are labels. The separate Sort dropdown controls order where offered, and L1 intake remains oldest first. Native select controls share an inset down chevron in both themes. Ticket details include a breadcrumb and an activity timeline. In-progress tickets show the assigned agent beside the ticket reference and date when an assignee is present.

An app-wide theme provider follows the system's light or dark preference on first visit and tracks system changes until the user chooses a theme. The header button switches directly to the opposite theme. Its hover and keyboard-focus tooltip names the next action. The user's choice is stored in the browser and applied across routes and reloads.

Public, employee, and management pages share a footer. It shows ©, the current year calculated at runtime, the author name NoHaitch, and the application name AI-Powered Service Desk. The text-only links appear in the order About, Help, and GitHub. The footer can wrap at narrow widths. GitHub links to the [project repository](https://github.com/NoHaitch/AI-Powered-Service-Desk).

The About page opens with links to preview sign-in and the FAQ. Its four cards cover the workflow, use cases, technology, and sample contacts. Cards stack on smaller screens and use two columns on large screens. Body paragraphs and lists are justified, with left-aligned headings and contact details. The workflow walks through employee intake, L1 triage, and requester follow-up. It also shows use cases for the catalog, knowledge base, and staff workspace. Keep the technology summary aligned with the stack and clearly label the synthetic preview. The contact section displays `support@example.com` and `+1 (202) 555-0147` as sample details.

Raleway, the shared shadcn theme tokens, and Remix Icons form the visual baseline. Use existing shadcn inputs, buttons, cards, menus, alerts, badges, and overlays. Use semantic status and priority colors with text labels. Keep reduced-motion support, visible focus, accessible labels, and bounded mobile table scrolling. See the [frontend design standard](../../.agents/rules/FRONTEND_DESIGN_STANDARDS.md).

## Color palette

Use blue as the brand accent, with white and neutral gray surfaces in light mode and blue-tinted near-black surfaces in dark mode. Set colors in [the shared theme tokens](../../frontend/src/index.css) and consume them through semantic utilities such as `bg-card`, `text-muted-foreground`, and `text-primary`. Keep ordinary panels, navigation, forms, and tables on solid surfaces. Reserve the shared blue gradient for the About, sign-in, and employee home headers.

| Role | Light | Dark |
| --- | --- | --- |
| Page background / work area | `#FAFBFC` / `#F5F6F8` | `#10151E` / `#131B28` |
| Card / sidebar | `#FFFFFF` / `#F7F8FA` | `#182130` / `#141E2D` |
| Body / supporting text | `#17253D` / `#4D607B` | `#EAF1FC` / `#AABBD3` |
| Primary / primary button text | `#2456C4` / `#FFFFFF` | `#8CB7FF` / `#102341` |
| Selected accent / accent text | `#E3EDFF` / `#173971` | `#293D5B` / `#E6EFFF` |
| Form control fill / border | `#FFFFFF` / `#858C96` | `#182130` / `#737C88` |
| Gradient stops | `#EAF2FF` → `#F4F7FC` → `#FCFDFF` | `#203B63` → `#182B46` → `#141E2D` |

Use blue for links, primary actions, focus rings, selected states, and intentional callouts such as the article support card. Use subtle dividers between surfaces and stronger borders and focus colors for interactive controls. Check normal text against its actual surface for at least 4.5:1 contrast, including over gradients. Keep semantic colors for ticket priority, status, and destructive actions, paired with text labels.

## Help content

The Help & FAQ page starts with a search field and an On this page navigation list that jumps to category headings. Search matches every entered term across the category name, question, and answer, regardless of case. The page shows matching questions and category links, reports when there are no matches, and restores all categories when the search is cleared. It renders one accordion per category from the [FAQ JSON](../../frontend/src/features/help/faq.json). Each category has an ID, label, and scope. Use `preview` for documented preview behavior and `sample` for fictional workplace guidance. Each entry has a stable, unique ID, a question, and a plain-text answer. Keep IDs when editing wording. Keep the source public and synthetic.

The JSON is a candidate source for the future retrieval corpus. Review and import each question and answer together as one document, retaining its entry ID, category, and scope as metadata. Use scope to keep sample workplace guidance from being presented as application policy. Ingestion and automatic answers are tracked under [M3](../roadmap.md#m3-knowledge-and-grounded-assistance).

## Service catalog

The catalog keeps a grid of cards on the neutral work surface. Use solid card fills, subtle borders, muted category badges, and blue request links. Each service page explains what the request covers, what to prepare, and where the submitted preview request appears. A Fill out request form link at the top jumps to the form below the details on the same page. Request forms use the same card treatment and shared input palette.

Every service page explains when to use it, when to report an incident where relevant, and the information needed for review. A left arrow precedes the Back to service catalog link. A clock icon and the estimated processing time appear beside the service subtitle and above Open request on each catalog card. The estimate is in business days after required details and any approvals are in place. All forms require a request subject and a business justification. Additional fields vary by service.

| Service | Required additional fields | Optional or conditional fields | Typical processing time |
| --- | --- | --- | --- |
| Software access | — | Access change, application role, needed-by date | 2–3 business days |
| Shared drive access | Permission level | Folder owner or team, needed-by date | 1–2 business days |
| IT equipment | Request type, delivery or pickup location | Needed-by date | 3–5 business days |
| Mailing list access | Join or leave | — | 1–2 business days |
| Work email | Mailbox change, department or team | Needed-by date | 2–3 business days |
| VPN access | Device type, access duration | End date required for temporary access | 2–4 business days |
| Shared mailbox access | Mailbox permission | Mailbox owner or team | 1–3 business days |
| Work phone enrollment | Device ownership, setup type | — | 2–4 business days |
| New starter IT setup | Start date, department or team, work arrangement | — | 5–7 business days |

The preview validates required entries, allowed choices, and calendar dates before writing to tab-local storage. My Tickets shows the service-specific details submitted with a request. Older preview requests remain readable with their original fields. Dates give support planning context in the preview. The application does not submit requests to a fulfillment team or schedule provisioning.

## Knowledge articles

The employee knowledge index shows a vertical list with linked article titles, categories, summaries, and last-updated dates. Use the white card surface for the light page and the near-black background surface for the dark page. Search controls follow the shared form palette. Keep the brand blue on result links. Search applies after 300 ms without typing and matches titles, summaries, categories, and article bodies. Results show ten articles per page with Previous and Next controls. Applying a new search or changing the category returns to page one.

The preview bundles 18 synthetic Markdown articles from [the corpus directory](../../frontend/src/features/knowledge/articles/). Each filename becomes the stable article ID used in URLs and local drafts. Keep the filename when revising an article. Use a flat front matter block between `---` lines containing `title`, `category`, `summary`, and `updated` in `YYYY-MM-DD` format. Update the date when published content changes. The date appears on results and article pages. An optional `service` field must match an existing catalog ID and adds the corresponding request button below the article.

The employee article uses a centered reading column on the same white or near-black page surface as the knowledge index. Article text sits directly on the page. Tables use a muted header, and the support card uses the blue-tinted secondary surface with a subtle blue border. The sticky article toolbar opens a right-side On this page overlay on desktop and mobile. Outline links indent by heading level, close the panel, and move focus to the selected heading. Section URLs can be shared. A left arrow precedes the Back to knowledge base link. The article body supports paragraphs, headings from `##` through `######`, flat numbered and bulleted lists, and pipe tables with a separator row and optional column alignment markers. Use the front matter title as the page heading, keep heading labels stable for shared links, and separate blocks with blank lines. Tables can scroll horizontally within the article on narrow screens. The page renders these blocks as React elements and displays raw HTML as plain text. Search includes article titles, summaries, categories, and body text. The administrator edits Markdown in the tab-local draft editor. Public article content comes from the bundled files.

Every employee article ends with a Having Issues? card. It uses the same sample email and phone number as the About page and links to the device's email and phone apps. The card provides the preview's contact option while the chat assistant is planned.

The source files can be reviewed for future RAG ingestion. Uploads, indexing, and publishing are tracked under [M3](../roadmap.md#m3-knowledge-and-grounded-assistance).

## Navigation, integration, and user flows

Use browser links, lazy-loaded feature pages, and Vite's history fallback. Show a centered spinner with an accessible loading label while a lazy route loads. Local release routing must preserve API forwarding before the SPA fallback. Revisit a declarative router when nested routes or retained navigation state justify the dependency.

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
