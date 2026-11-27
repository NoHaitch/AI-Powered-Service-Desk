# Frontend design standards

Follow the [frontend experience guide](../../docs/architecture/frontend-experience.md) for route ownership and planned scope. Use the [repository structure](REPOSITORY_STRUCTURE.md) and the existing [shadcn component inventory](../../frontend/README.md#ui-components).

- Keep public and employee navigation at the top. Use the collapsible sidebar and utility bar in the management workspace. Keep active location, account controls, and skip navigation accessible at desktop and mobile sizes.
- Use the existing shadcn theme, Raleway typography, Tailwind spacing, and Remix Icons. Add a token for repeated design needs. Prefer calm surfaces and consistent hierarchy. Preserve readable contrast in all themes and respect reduced-motion preferences.
- Display status and priority as text with semantic color as a secondary signal. Keep tier, lifecycle, and priority independent. Guide the user through validation, absence of data, denied access, and temporary failures.
- Keep the primary information and action visible at narrow widths. Ticket lists use compact rows with status and priority on mobile and a table on larger screens.
- Derive navigation from the caller's role and scope. Keep administrative actions and queue access distinct when using the same workspace. Guard routes and actions in the UI for usability. The API remains the authorization boundary.
- Identify synthetic previews on screen and in setup docs. Keep fixture data separate from future API adapters. Never collect real credentials or show backend success for fixture interactions.
- Verify the relevant flow and layout with keyboard and browser checks at desktop and mobile widths. Test state changes and denied routes. Keep the guide and roadmap aligned with shipped capabilities.
