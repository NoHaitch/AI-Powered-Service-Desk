# Functional service desk frontend preview

Extend the existing preview with a catalog-to-request flow, ticket conversations and visible history, assignment and resolution views, knowledge browsing and draft management, and per-persona account tools. Preserve the accepted incident intake and triage rules and all backend milestones.

- Use the existing shells, controls, and browser routing. Keep fixture storage and policy separate from presentation so the live API can replace them.
- Verify that an employee can submit a catalog request and reopen the detail, reply on their own ticket, and never see staff notes or another employee's ticket. Verify that agents can distinguish intake from assigned work and use their scoped controls.
- Let employees read published knowledge fixtures. Limit local draft editing to the administrator and keep drafts outside the published view.
- Keep assignment writes, escalation, closure, reopening, service request routing, and SLA policy subject to review. Initial seeded data can illustrate these states. Document approved increments and leave unresolved actions unavailable.
- Run the frontend lint, type and build checks, Bun tests, and desktop/mobile browser checks in both themes. Record fixture limitations in the frontend guide and project state.

## Verification

Frontend lint and the TypeScript and Vite build passed. Ten Bun tests cover the original triage flow and the new request, conversation, and knowledge scopes, including storage failures. Edge verified the built preview at 1440 and 390 pixels in light and dark themes. Demonstrated incident intake and L1 triage, catalog validation and tracking, role denials, replies and staff-only notes, seeded resolution, draft discard confirmation, notifications, preferences, and mobile queue navigation. Durable authorization, audit integrity, and API failure handling require the live integration.
