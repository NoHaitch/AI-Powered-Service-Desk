# Frontend

The frontend is a client-rendered React and TypeScript application built with Vite. Tailwind CSS v4 is integrated through `@tailwindcss/vite` in `vite.config.ts`. shadcn/ui provides reusable primitives generated into the source tree. The project uses Bun for dependency management and scripts.

## Getting started

With Bun installed, run the following from the repository root:

```sh
cd frontend
bun install --frozen-lockfile
bun --bun run dev
```

The native dev server can display public pages. For authentication and incidents, use the [Compose development override](../docs/architecture/local-first.md#run-the-local-stack) so the browser reaches the live API over the trusted HTTPS origin. Provision synthetic accounts with the [development seed](../docs/architecture/database-schema.md#migration-and-local-seed-workflow). Use separate browser profiles to sign in as an employee and an L1 agent at the same time.

See the [frontend experience guide](../docs/architecture/frontend-experience.md) for the sitemap, layouts, and current and planned flows.

## UI components

The applied shadcn preset is `b1aIuQ2XC` (Base UI Luma, Stone base, Blue theme, Raleway, and Remix Icons). `components.json` controls registry generation and aliases. Theme tokens live in `src/index.css`.

Shared components are in `src/shared/components/ui/` and are imported from `@/shared/components/ui/<name>`. Reuse the installed shadcn primitives before creating a new one.

| Area | Available components |
| --- | --- |
| Forms and actions | Button, Button Group, Checkbox, Field, Input, Input Group, Label, Select, Slider, Switch, Textarea, Toggle, Toggle Group |
| Navigation and overlays | Breadcrumb, Context Menu, Dialog, Dropdown Menu, Hover Card, Navigation Menu, Pagination, Popover, Sheet, Sidebar, Tabs, Tooltip |
| Layout and data | Accordion, Badge, Calendar, Card, Carousel, Chart, Collapsible, Date Picker, Data Table, Item, Resizable, Scroll Area, Separator, Table |
| Feedback and conversation | Alert, Attachment, Avatar, Bubble, Code Block, Message, Message Scroller, Progress, Skeleton, Spinner, Toast |

The application mounts `TooltipProvider` and `Toaster`. Use Alert for inline feedback and Toast for transient notifications. Add `SidebarProvider` around the layout that uses Sidebar and `MessageScrollerProvider` around a conversation that needs it. Message, Attachment, and related components are UI primitives for future work. Their presence does not enable chatbot or upload functionality.

Date Picker composes Calendar and Popover and takes a controlled date value and change handler. Data Table composes the shadcn Table with TanStack Table v9. Pass typed column definitions, rows, and an accessible caption. Keep sorting, filtering, pagination, and data fetching in the consuming feature where needed. Use code-owned chart style configuration and keep generated message content subject to the application's rendering and input safety rules.

[shadcn Date Picker recipe](https://ui.shadcn.com/docs/components/base/date-picker) · [shadcn Data Table recipe](https://ui.shadcn.com/docs/components/base/data-table)

For additional components, use the [shadcn CLI](https://ui.shadcn.com/docs/cli) from `frontend/`. Review generated files and dependencies and keep the Bun lockfile with the change.

## Verification

Run from `frontend/`:

```sh
bun --bun run lint
bun --bun run build
bun test tests
```

The build runs TypeScript checks and writes static assets to `dist/`. Bun tests cover triage, input limits, queue filtering, ticket ownership, reply and note visibility, storage failures, and knowledge draft scope.

For live browser verification, install the locked Chromium binary with `bunx --no-install playwright install chromium`. From the repository root, run `bash backend/tests/run_m1_auth_https.sh`. It runs the browser against the same isolated PostgreSQL, Redis, and HTTPS stack used for contract tests.
