# ADR 0002 — React, Vite, TypeScript, and Bun

**Status:** Accepted

**Date:** 2026-11-27

## Context and decision

The interactive service desk needs a client-rendered browser UI backed by FastAPI. Use React and TypeScript with Vite. Use Bun for dependency management and for running development and build scripts, with the Bun lockfile committed when dependencies are introduced.

## Alternatives and consequences

The earlier Next.js proposal would bring a framework server and rendering options that the current product does not require. A client-rendered Vite application fits the local Compose deployment and can be built with Bun and served by a lightweight static server in a release image. npm and pnpm are outside the selected toolchain.

Use same-origin HTTPS for the browser. During development, Vite proxies API requests to FastAPI. For local release, prefer Nginx to serve the compiled assets and reverse-proxy the API on the same origin. FastAPI remains responsible for application rules and authorization. Certificate provisioning and proxy configuration belong to M1. See the [local architecture](../architecture/local-first.md).

[Vite static deployment](https://vite.dev/guide/static-deploy.html) · [Bun and Vite](https://bun.com/guides/ecosystem/vite)
