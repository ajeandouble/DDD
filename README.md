# DDD — Domain-Driven Design Playground

A toy project for exploring Domain-Driven Design principles in a single-runtime backend with a React frontend.

## Goals

- Practise DDD tactical patterns: aggregates, value objects, domain events, repositories
- Keep bounded contexts well-separated within a single app — no premature distribution
- Validate design decisions with a real frontend consuming real APIs

## Architecture

```
DDD/
├── backend/        # Single FastAPI app (one module per bounded context)
└── frontend/       # React SPA
```

### Bounded Contexts

| Module | Responsibility |
|--------|---------------|
| **IAM** | Identity, authentication, and policy-based authorization |
| **Imports** | Ingesting media files from external sources or direct upload |
| **Storage** | Simulated S3 — file persistence, metadata, and retrieval |
| **Scheduler** | Cron job runner — triggers periodic tasks |
| **Analyzer** | Simulated transcription unit — internal queue with retries and batching for rate-limit handling |
| **Webhooks** | Outbound notifications to external systems on job completion |
| **Billing** | Usage tracking and invoice generation |

All seven contexts run in the **same process**. Cross-context communication happens via in-process domain events, not HTTP.

### Frontend

- **React** + **Vite**
- **TanStack Router** — file-based routing
- **TanStack Query** — server state and caching
- **Ky** — HTTP client

### Backend

Single **FastAPI** app, managed with **[uv](https://github.com/astral-sh/uv)**.

## DDD Concepts in Play

- **Bounded Contexts** — each module owns its domain model; no cross-module domain imports
- **Aggregates** — consistency boundaries enforced within each context
- **Domain Events** — cross-context communication via in-process events, not direct calls
- **Repository Pattern** — persistence behind domain interfaces; implementations swappable
- **Value Objects** — immutable, identity-free domain concepts

## Getting Started

```bash
# Backend
cd backend
uv sync
uv run fastapi dev

# Frontend
cd frontend
npm install
npm run dev
```

## Documentation

Design notes live in `~/.claude/projects/-Users-ajean-dev-DDD/` (outside the repo):

- `IAM.md` — identity model, policy engine, and authorization flows
