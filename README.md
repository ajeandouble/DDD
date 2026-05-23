# DDD — Claude Code Context

## What this project is

A toy project for practising **Domain-Driven Design** in a single-runtime backend. Seven bounded contexts live in the same FastAPI process and communicate via in-process domain events.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + React Router + TanStack Query + Ky + Zod |
| Backend | Python, FastAPI, uv (single app) |
| Formatting | Black (backend, line-length 100) · Prettier (frontend) |

## Layout

```
DDD/
├── backend/
│   ├── pyproject.toml
│   └── src/
│       ├── main.py              # FastAPI app factory, router registration
│       ├── iam/                 # Identity, auth, policy-based authz
│       ├── imports/             # Media ingestion from external sources / uploads
│       ├── storage/             # Simulated S3 — file persistence and retrieval
│       ├── scheduler/           # Cron job runner — triggers periodic tasks
│       ├── analyzer/            # Simulated transcription — internal queue, retries, batching
│       ├── webhooks/            # Outbound notifications on job events
│       └── billing/             # Usage tracking and invoice generation
│
│       # Each context follows the same internal structure:
│       #   <context>/domain/          aggregates, value objects, events, repo interfaces
│       #   <context>/application/     use cases / command & query handlers
│       #   <context>/infrastructure/  repo implementations, DB, external adapters
│       #   <context>/api/             FastAPI routers
│
└── frontend/
    └── src/
        ├── routes/
        ├── components/
        └── lib/
```

## Event flow (happy path)

```
User uploads media
  → Imports emits FileIngested
    → Storage: stores the file
    → Analyzer: accepts job into its internal queue, processes (retries + batching)
      → emits TranscriptReady
        → Webhooks: fires outbound notification
        → Billing: records usage unit
```

## Bounded contexts

| Context | Key aggregate(s) | Key events emitted |
|---------|------------------|--------------------|
| IAM | `User`, `Role`, `Policy` | `UserCreated`, `RoleAssigned` |
| Imports | `ImportJob` | `FileIngested` |
| Storage | `StoredObject` | `ObjectStored`, `ObjectDeleted` |
| Scheduler | `CronJob` | `CronFired` |
| Analyzer | `AnalysisJob`, `Transcript` | `TranscriptReady`, `TranscriptFailed` |
| Webhooks | `WebhookEndpoint`, `Delivery` | `DeliverySucceeded`, `DeliveryFailed` |
| Billing | `UsageRecord`, `Invoice` | `InvoiceGenerated` |

## DDD conventions

- **No cross-context domain imports.** Use plain primitives (UUIDs, strings) or a thin anti-corruption layer at context boundaries.
- **Aggregates** enforce invariants via named methods — never public setters.
- **Value objects** are immutable; equality is by value.
- **Domain events** are the only cross-context coupling. Publish to an in-process event bus; each context subscribes to what it needs.
- **Repositories** are interfaces in `domain/`; implementations in `infrastructure/`.
- **API routers** translate HTTP ↔ application commands only — no business logic.

## IAM integration

Other contexts call the IAM application service to authorize actions — they never read the IAM database.
Full design: `~/.claude/projects/-Users-ajean-dev-DDD/IAM.md`

## Running

```bash
make install   # install all deps
make dev       # start backend + frontend concurrently
make format    # black + prettier
make build     # production frontend build
```

## ROADMAP

**After completing any task, update `/Users/ajean/.claude/projects/-Users-ajean-dev-DDD/ROADMAP.md`** — mark finished items `- [x]` and keep the file accurate. The ROADMAP lives outside the repo (it is in `.gitignore`).

## Subagents

When spawning agents (Explore, general-purpose, etc.) for lightweight tasks (file lookups, searches, simple edits), always pass `model: "haiku"` to minimize cost. Only use the default (Sonnet) or `model: "opus"` for tasks that genuinely need stronger reasoning.

## What to avoid

- Anemic domain models (logic in routers or application services, not aggregates)
- Direct cross-context repository or domain-object access
- Raw DB rows leaking out of repositories
- Adding HTTP calls between contexts — keep it in-process
