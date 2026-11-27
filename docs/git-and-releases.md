# Git and release workflow

This is the agreed local integration and release workflow.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Stable, tested, production-ready code and the source of official releases. |
| `dev` | Active development, integration, and testing before promotion to `main`. |

Start feature work from `dev` on a descriptive branch such as `feature/ticket-intake`, `bugfix/sla-deadline`, or `docs/local-setup`. For an urgent production fix, branch from `main` as `hotfix/<topic>`, apply the local merge gate, merge into `main`, then bring the fix back into `dev`. Pull requests can record review and verification for substantial changes and future collaboration.

## Publish and promote a feature on GitHub

When promotion through `main` is authorized, push the feature branch first, merge and push `dev`, then merge and push `main`. Obtain explicit authorization for Git writes, tags, and deployments. A request to promote a feature through `main` covers the branch, commits, and pushes in this sequence.

1. Run `git status --short --branch` and `git fetch origin`. Review the local and remote branch histories. Update `dev` with `git switch dev` and `git merge --ff-only origin/dev`, then create the feature branch with `git switch -c feature/<topic>`.
2. Split the feature into small, reviewable commits according to the work involved. Use single-line Conventional Commit subjects such as `feat(auth): add database-backed sessions`, `test(auth): cover refresh rotation over HTTPS`, or `docs(auth): document account provisioning`. Stage each group explicitly, inspect `git diff --cached` for unrelated changes and secrets, and use the configured Git identity.
3. Apply the [local merge gate](#local-merge-gate) and publish the feature with `git push -u origin feature/<topic>`.
4. Refresh remote refs, switch to `dev`, and integrate the published feature with `git merge --ff-only origin/feature/<topic>` when history permits. Verify the integrated candidate, then run `git push origin dev`.
5. Refresh remote refs, switch to `main`, and integrate the published `dev` tip with `git merge --ff-only origin/dev` when history permits. Confirm the candidate includes the latest `origin/main` and matches the verified tree, then run `git push origin main`.
6. Run `git ls-remote --heads origin` for the feature branch, `dev`, and `main`. Confirm the pushed commits and report the feature commits, final branch tips, and verification results.

Fast-forward merges preserve the focused commit history. If histories diverge, review both sides, preserve their changes with a normal merge, and rerun the applicable checks on the resulting tree. Use a Conventional Commit subject such as `chore(git): merge feature into dev` when a merge commit is required. If GitHub branch rules require pull requests, use the required review path.

## Local merge gate

Before merging into `main`, verify the candidate with the latest target branch changes. Run formatting, lint, types, builds, and the [feature-level verification gate](../.agents/rules/TESTING_STANDARDS.md). Include applicable positive, negative, security, integration, browser end-to-end, and regression checks against the candidate. Record commands and results. Resolve failures in applicable checks before merging. At the planning stage, verify the documentation itself and record which application checks are unavailable.

As tooling is introduced, prefer reusable local commands that can later be called by CI. Keep routine checks independent of production systems and paid APIs. GitHub Actions, external CI/CD services, and automated deployment pipelines are deferred.

## Manual releases

Create an authorized semantic version tag such as `v0.1.0` on a verified commit on `main`. Record the changes and any migration or rollback notes. When deployment is authorized and a target exists, deploy the tagged revision using documented local commands or a reusable script. Verify the deployed version and smoke-test the service. Record the result and the previous known-good tag when available.

Treat staging and production as deployment environments. If staging is available, validate the same tagged revision there before promoting it to production.
