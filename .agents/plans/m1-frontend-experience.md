# M1 frontend experience plan

Deliver a browser-runnable fixture slice for login, employee incident intake and tracking, and L1 triage. Follow the accepted [incident requirements](../../docs/requirements/incident-intake-and-triage.md) and [M0 contracts](../../docs/architecture/m0-authentication-design.md).

1. Define route and layout ownership for public, employee, and management areas. Use first-slice browser links and the existing shadcn primitives.
2. Keep deterministic rules and fixture access checks independent of screen rendering. Use synthetic personas and tab-scoped data. Keep live authentication, persistence, and later workflows out of this slice.
3. Verify the matrix, field boundaries, scope checks, queue filtering, and duplicate triage with frontend tests. Verify navigation, desktop and mobile layouts, and the employee-to-L1 path in a browser.
4. Update the design guide, roadmap, and project state with the implemented slice and limitations.

## Verification

Frontend lint, the TypeScript and Vite build, and five Bun tests passed. Edge verified the built preview on desktop and mobile, including incident submission, role and ownership denials, L1 triage, employee status and priority, theme switching, and mobile sign-out. Live API integration remains pending in M1.
