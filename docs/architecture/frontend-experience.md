# Frontend experience

The service desk has three navigation areas built on React, Vite, Tailwind CSS, and the existing shadcn/ui preset. The [frontend guide](../../frontend/README.md) covers local operation. The [M0 API contract](m0-authentication-design.md#api-contract) and [incident requirements](../requirements/incident-intake-and-triage.md) remain authoritative for integration.

## Sitemap and current scope

| Area | Route or route family | Current experience |
| --- | --- | --- |
| Public | `/`, `/login` | Username and password login with provisioned accounts. |
| Public | `/about`, `/help` | Service overview, sample contacts, and a categorized FAQ. |
| Public | `/error/401`, `/error/403`, `/error/404`, `/error/500`, `/error/503` | Safe error views. |
| Employee | `/portal`, `/portal/tickets` | Incident actions and a paginated list of owned incidents. |
| Employee | `/portal/incidents/new`, `/portal/tickets/:id` | Live intake, updates, and incident details. |
| Employee | `/portal/catalog`, `/portal/requests/new/:service` | Browse categorized sample services. Submitting and tracking service requests are planned. |
| Employee | `/portal/knowledge`, `/portal/knowledge/:article` | Search, category filters, and read-only Markdown articles. |
| Employee and management | `/{portal,workspace}/profile` | Live identity, role labels, browser-local appearance, and sign-out. |
| Management | `/workspace` | Role-aware navigation. An administrator alone has no incident access. |
| L1 agent | `/workspace/queue`, `/workspace/tickets/:id` | Live oldest-first intake, prompt-review filtering, authorized detail, and triage. |
| Planned | Notifications, assignment, conversations, user administration, knowledge editing, and AI assistance | These workflows wait for the server contracts in their respective milestones. |

## Layout and design system

Public and employee pages use a responsive top bar with account and theme controls. The management area uses the existing collapsible shadcn Sidebar and a top utility bar. Ticket lists offer 10, 20, 50, or 100 rows per page on desktop and mobile, starting at 10. Changing the page size returns to page one. Ticket table headers are labels. The separate Sort dropdown controls order where offered, and L1 intake remains oldest first. Native select controls share an inset down chevron in both themes. Live incident details show the reference, status, priority, report and update time. The earlier fixture layouts illustrate activity timelines and displaying assignees near the ticket reference for later workflows.

An app-wide theme provider follows the system's light or dark preference on first visit and tracks system changes until the user chooses a theme. The header button switches directly to the opposite theme. Its hover and keyboard-focus tooltip names the next action. The user's choice is stored in the browser and applied across routes and reloads.

Public, employee, and management pages share a footer. It shows ©, the current year calculated at runtime, the author name NoHaitch, and the application name AI-Powered Service Desk. The text-only links appear in the order About, Help, and GitHub. The footer can wrap at narrow widths. GitHub links to the [project repository](https://github.com/NoHaitch/AI-Powered-Service-Desk).

The About page opens with links to sign-in and the FAQ. Its four cards cover the workflow, use cases, technology, and sample contacts. Cards stack on smaller screens and use two columns on large screens. Body paragraphs and lists are justified, with left-aligned headings and contact details. The workflow walks through employee intake, L1 triage, and requester follow-up. It also shows use cases for the catalog, knowledge base, and staff workspace. Keep the technology summary aligned with the stack and identify the synthetic development data. The contact section displays `support@example.com` and `+1 (202) 555-0147` as sample details.

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

Live routes obtain identity from `/auth/me` and incident data from the API. The browser coordinates refresh across tabs using Web Locks. Role-based navigation is a UI affordance. The server enforces incident ownership and current role and queue grants. CSRF stays in memory and the credential cookies are HttpOnly. Fixture models remain as development references and are outside the live sign-in and incident routing.

1. Sign in as Maya to report an incident and open it from My Tickets. Reload to confirm the stored report is still visible.
2. Sign in as Alex in a separate browser profile to review the L1 intake queue. Optionally filter for prompt review, assess impact and urgency, and complete triage.
3. Return to Maya's browser to read the new status and priority. In another profile, sign in as Jordan and confirm the incident is unavailable.
4. Open Profile & preferences to review the current identity, appearance behavior, and session sign-out.

## Workflow decisions pending

| Workflow | Proposed first policy | Earlier fixture design |
| --- | --- | --- |
| Assignment and resolution | Let L1 agents self-assign triaged incidents and resolve their own assignments with a required resolution summary. Review closure, reopening, reassignment, and SLA timing separately. | Show seeded assignments, status, and resolution history. Triage remains the supported transition. |
| Escalation | Allow the assigned agent to hand off to the next tier with a reason. Clear individual assignment while preserving priority and elapsed SLA time. | Escalation mutations remain unavailable. |
| Service request fulfillment | Use a separate shared fulfillment queue, then decide routing, approvals, and SLAs. | Submit and track requests as the employee. The L1 incident queue remains incident-only. |
| Knowledge lifecycle | Decide publication, versioning, access rules, and ingestion alongside M3. | Edit and discard administrator drafts while preserving employee-visible fixture content. |

## Priorities and verification

Run frontend lint, build, Bun regression tests, and the [HTTPS feature suite](m1-authentication.md#verification-workflow) for changes to authenticated journeys. The browser suite covers sign-in, session restoration, role denials, form validation, durable incident intake, and triage. Keep pending workflows aligned with their [roadmap milestones](../roadmap.md).
