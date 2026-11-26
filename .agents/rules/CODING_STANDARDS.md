# Coding standards

Use English in identifiers, comments, docs, tests, and commits. Save text as UTF-8, use LF and a final newline for new text, and defer indentation and mechanical formatting to the project's formatters when configured. Preserve existing conventions and avoid unrelated churn.

Favor meaningful names, simple interfaces, clear module boundaries, and readable multiline code. Reuse existing code when it preserves behavior and gives shared logic a clear home. Keep related operations together and domain rules in one place. Use early returns when they reduce nesting, blank lines between logical steps, and named constants for policy values. Use comments sparingly for non-obvious rationale, constraints, and invariants. Remove dead code, unused imports, debug statements, and unexplained TODOs. Use judgment on function and file size.

Organize code around clear responsibilities. Use MVC or a similar layered structure where it fits. Keep request handling and presentation separate from business rules and persistence so core behavior can be tested independently.

## Python

- Use PEP 8 naming, `snake_case` for functions, variables and modules, `PascalCase` for classes, and `UPPER_SNAKE_CASE` for constants. Annotate public interfaces, domain models, and nontrivial functions.
- Handle exceptions explicitly and use structured production logs. Validate API input and settings with Pydantic where appropriate. Choose sync or async according to the work and libraries.
- Keep FastAPI routing, application orchestration, domain rules, data access, configuration, and integrations distinct where it improves testability. Test business rules outside HTTP handlers.
- When initialized, use Ruff to lint and format, MyPy or a justified equivalent for types, pytest for tests, and uv or an approved reproducible package manager.

## TypeScript and frontend

- Use Bun for Node ecosystem work, including dependency management, project scripts, and local verification. Include the Bun lockfile in changes that introduce JavaScript or TypeScript dependencies.

- Enable strict TypeScript at initialization. Justify any use of `any`. Use PascalCase for React components and types, camelCase for functions, variables and hooks, and consistent filenames.
- Use typed API contracts and validate untrusted data at runtime. Follow React and Next.js conventions, with client rendering and global state scoped to actual needs. Keep presentation, data fetching, state, and business logic independently understandable.
- Use semantic HTML, keyboard-accessible and responsive UI, and usable loading, error, and empty states. Keep server credentials on the server.
- When initialized, use ESLint and a consistent formatter such as Prettier. Select the appropriate [testing layer](TESTING_STANDARDS.md).

## API contracts

Keep naming and error responses consistent. Use backend OpenAPI as the contract and derive frontend types where practical. Use explicit mappings when boundary naming differs and maintain one authoritative contract.

Verify dependency APIs and compatibility with official documentation before implementing against them.
