# Git and release workflow

This is the agreed workflow. Verification commands and deployment scripts are planned for when the application is available.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Stable, tested, production-ready code and the source of official releases. |
| `dev` | Active development, integration, and testing before promotion to `main`. |

Use `dev` for small changes. For substantial or isolated work, optionally branch from `dev` with a descriptive name such as `feature/ticket-intake`, `bugfix/sla-deadline`, or `docs/local-setup` and merge back into `dev`. For an urgent production fix, branch from `main` as `hotfix/<topic>`, apply the local merge gate, merge into `main`, then bring the fix back into `dev`. Pull requests can record review and verification for substantial changes and future collaboration.

Keep commits focused and use a single-line Conventional Commit subject such as `fix(tickets): preserve the SLA deadline on escalation`. Obtain explicit authorization before committing, pushing, merging, creating branches, tagging releases, or deploying.

## Local merge gate

Before merging into `main`, verify the candidate with the latest target branch changes. Run formatting checks, linting, type checking, automated tests, a build, and relevant security checks locally. Record commands and results. Resolve failures in applicable checks before merging. At the planning stage, verify the documentation itself and record which application checks are unavailable.

As tooling is introduced, prefer reusable local commands that can later be called by CI. Keep routine checks independent of production systems and paid APIs. GitHub Actions, external CI/CD services, and automated deployment pipelines are deferred.

## Manual releases

Create an authorized semantic version tag such as `v0.1.0` on a verified commit on `main`. Record the changes and any migration or rollback notes. When deployment is authorized and a target exists, deploy the tagged revision using documented local commands or a reusable script. Verify the deployed version and smoke-test the service. Record the result and the previous known-good tag when available.

Treat staging and production as deployment environments. If staging is available, validate the same tagged revision there before promoting it to production.
