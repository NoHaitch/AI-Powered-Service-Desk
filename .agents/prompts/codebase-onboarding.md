# Codebase onboarding prompt

Analyze this checkout of AI-Powered Service Desk. Keep the review read-only and cite file paths and line numbers for important claims.

1. Read `AGENTS.md`, `.agents/README.md`, `.agents/context/PROJECT_STATE.md`, and `docs/roadmap.md`. Inspect Git status, recent commits, and the tracked tree. Use `.agents/PROJECT_CONTEXT.md` and the linked engineering rules for constraints.
2. Review `docs/architecture/frontend-experience.md`, `docs/architecture/local-first.md`, and `docs/requirements/incident-intake-and-triage.md`. Consult `docs/decisions/` and `docs/architecture/m0-authentication-design.md` to identify accepted policies and open decisions.
3. Start the frontend trace at `frontend/src/App.tsx` and `frontend/src/app/layouts.tsx`. Follow employee incident submission through fixture storage and L1 triage back to the employee detail view. Identify role and ownership checks, the future API integration point, and what `frontend/tests/` covers.
4. Start the backend trace at `backend/app/main.py`. Follow a readiness request through `backend/app/health.py` and `backend/app/core/`. Explain the app lifecycle, dependency probes, safe errors, request IDs, and Swagger/OpenAPI. Review `backend/migrations/` and `backend/tests/`.
5. Trace same-origin API routing in `frontend/vite.config.ts`, `infrastructure/nginx/default.conf`, `compose.yaml`, and `compose.dev.yaml`. Review `scripts/setup_local.py` and `scripts/check_local.py`. Read only safe configuration examples and skip credentials, local secrets, caches, and generated output.

Report an architecture map, both traced flows, the current milestone, verification evidence, discrepancies, and the next task. Distinguish implemented code, synthetic preview behavior, accepted but unimplemented policies, and unverified behavior. State which checks you actually ran. Preserve existing changes. Ask before installing dependencies, using Docker, accessing the network, editing files, or writing to Git.
