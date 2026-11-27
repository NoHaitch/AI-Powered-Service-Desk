---
name: code-change-verification
description: Verify changes to application code, runtime behavior, tests, dependencies, or builds using checks that actually exist in the repository.
---

# Code change verification

1. Find manifests, local scripts, and setup docs for the changed entry points. Confirm the applicable commands and prerequisites. Use the [local merge gate](../../../docs/git-and-releases.md#local-merge-gate) when preparing a merge to `main`.
2. Follow the [testing standards](../../rules/TESTING_STANDARDS.md). Map acceptance criteria to feature-level positive, negative, security, integration, end-to-end, and regression checks at applicable layers. Exercise the normal application entry points and real local dependencies for changed boundaries. Include degraded, denied, and concurrent behavior where relevant.
3. Run the available formatting, lint, typing, test, and build checks relevant to the change. Fix introduced failures and rerun affected checks. Record commands, environments, and outcomes. Explain inapplicable layers and mark verification partial if a required check is blocked.
