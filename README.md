<h1 align="center">AI-Powered Service Desk</h1>

<p align="center">
  A local-first IT service desk for incident tracking, support workflows, and planned AI-assisted troubleshooting.
</p>

<p align="center">
  <a href="https://github.com/NoHaitch/AI-Powered-Service-Desk/issues/new?title=Bug%3A%20">Report a bug</a>
  &middot;
  <a href="https://github.com/NoHaitch/AI-Powered-Service-Desk/issues/new?title=Feature%3A%20">Request a feature</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License"></a>
</p>

## Author

[NoHaitch](https://github.com/NoHaitch)

## Table of contents

- [Author](#author)
- [About](#about)
- [Features](#features)
- [System architecture](#system-architecture)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Testing and verification](#testing-and-verification)
- [Project structure](#project-structure)
- [Documentation and roadmap](#documentation-and-roadmap)
- [License](#license)

## About

AI-Powered Service Desk is a local-first IT service management application in planning. It is designed to give employees one place to report disruptions and request help, and give support teams a shared queue for triage, escalation, and resolution. A central knowledge base will help staff find relevant guidance, while later AI features will surface evidence and cite sources during troubleshooting.

## Features

**Current status:** The frontend foundation can run locally and includes a UI component preview. The service desk workflows below are planned.

| Release target | Planned capabilities |
| --- | --- |
| Functional MVP | Incident and service request workflows, role-based access, L1–L3 support queues, independent P1–P4 priorities, SLA tracking, audit history, and basic knowledge management. |
| AI-powered MVP | Grounded troubleshooting and answers with source citations using hybrid retrieval and an LLM. |
| Advanced AI | ML-assisted routing with self-hosted inference, MCP integration, and controlled, audited workflows. |

## System architecture

Docker Compose is the agreed deployment baseline. The proposed local topology pairs a browser-facing frontend container with a modular FastAPI backend and a persistent database. The backend owns authorization, business rules, and database access.

```mermaid
flowchart LR
    Browser --> Frontend[Frontend container]
    Frontend --> API[FastAPI container]
    API --> DB[(PostgreSQL container)]
    API -.-> Redis[(Redis)]
```

The planned browser entry point uses same-origin HTTPS, with Vite proxying in development and Nginx preferred for local releases. Redis is planned for authentication rate limiting, with optional caching later. Independent ML inference, vector search, and tool integration are planned for later milestones. [Local architecture](docs/architecture/local-first.md)

## Technology stack

| Area | Direction |
| --- | --- |
| Local deployment | Docker Compose, with zero mandatory infrastructure costs. Public hosting is optional. |
| Frontend | React, Vite, and TypeScript with Tailwind CSS through its Vite plugin and shadcn/ui components. Bun manages dependencies and runs development and build scripts. |
| Backend | Python and FastAPI. SQLAlchemy 2.x with Psycopg 3 async, Alembic migrations, and Pydantic validation. |
| Persistence and operational state | PostgreSQL for durable data. Redis for planned rate limiting and caching. |
| Identity | Stateless JWT access verification and rotating opaque refresh cookies. |
| AI and ML | Planned hybrid retrieval, LLM integration, and containerized inference. Model providers and orchestration tools are selected as requirements become clear. |

## Getting started

Initial product planning is complete. See the [frontend guide](frontend/README.md) to run the UI locally. Full-stack setup is pending.

| Step | Current status |
| --- | --- |
| Prerequisites | Bun for frontend development. Docker Compose is planned for the full local stack. |
| Installation | Install frontend dependencies from the Bun lockfile. See the [frontend guide](frontend/README.md). |
| Environment configuration | The frontend component preview requires no environment variables. Full-stack configuration is pending. |
| Running the application | Start the local Vite development server described in the [frontend guide](frontend/README.md). |

## Usage

The first planned workflow lets a signed-in employee submit an incident and track it while L1 support assesses its impact and urgency. See the [accepted intake and triage requirements](docs/requirements/incident-intake-and-triage.md).

## Testing and verification

The frontend has lint and build checks, including TypeScript compilation. See the [frontend verification commands](frontend/README.md#verification). Full-stack tests will cover domain rules, API access boundaries, end-to-end workflows, and backend capacity. The [Git and release workflow](docs/git-and-releases.md#local-merge-gate) describes the local checks required before merging to `main`.

## Project structure

| Path | Contents |
| --- | --- |
| [Frontend](frontend/README.md) | Vite application, Tailwind theme, and shared shadcn/ui components. |
| [Documentation](docs/README.md) | Roadmap, requirements, architecture proposals, and release workflow. |
| [Repository instructions](AGENTS.md) | Development and verification conventions. |
| [Agent workflow](.agents/README.md) | Project context, engineering standards, and reusable skills. |

## Documentation and roadmap

- [Documentation index](docs/README.md)
- [Project roadmap and release targets](docs/roadmap.md)
- [Incident submission and L1 triage requirements](docs/requirements/incident-intake-and-triage.md)
- [Local-first architecture proposal](docs/architecture/local-first.md)
- [Application policies and configuration](docs/policies-and-configuration.md)
- [Git and release workflow](docs/git-and-releases.md)

## License

This project is licensed under the [MIT License](LICENSE).
