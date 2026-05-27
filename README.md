# DDD

## What this project is

A toy project for practising **Domain-Driven Design** in a single-runtime backend. Seven bounded contexts live in the same FastAPI process and communicate via in-process domain events.

## How to run

**Prerequisites:** MongoDB running locally on port 27017.

```bash
# 1. Install all dependencies
make install

# 2. Seed the database with fixture users and sample data
cd backend && uv run python scripts/seed_dev.py

# 3. Start backend + frontend concurrently
make dev # might not work because of my lazyness in which case run them independently with `make dev-backend` and `make dev-frontend`
```

The backend starts at `http://localhost:8000` and the frontend at `http://localhost:5173`.

### Seed accounts

All seeded accounts share the password **`abcd1234`**.

| Email                | Role                             |
| -------------------- | -------------------------------- |
| `superadmin@ddd.dev` | Superadmin — bypasses all checks |
| `alice@ddd.dev`      | Org owner → admin at org (auto)  |
| `bob@ddd.dev`        | Supervisor at org                |
| `carol@ddd.dev`      | Editor at project                |
| `dave@ddd.dev`       | Viewer at campaign               |
| `eve@ddd.dev`        | Supervisor at subproject         |
| `frank@ddd.dev`      | Editor at org                    |
| `grace@ddd.dev`      | Viewer at project                |
| `henry@ddd.dev`      | Editor at campaign               |
| `ivan@ddd.dev`       | Viewer at org                    |
| `judy@ddd.dev`       | No role — locked out of org      |

The seed creates one organisation (**Acme Corp**) with a full project → subproject → campaign hierarchy and 100 sample conversations.

## Stack

| Layer      | Tech                                                    |
| ---------- | ------------------------------------------------------- |
| Frontend   | React + Vite + React Router + TanStack Query + Ky + Zod |
| Backend    | Python, FastAPI, uv (single app)                        |
| Formatting | Black (backend, line-length 100) · Prettier (frontend)  |

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

| Context   | Key aggregate(s)              | Key events emitted                    |
| --------- | ----------------------------- | ------------------------------------- |
| IAM       | `User`, `Role`, `Policy`      | `UserCreated`, `RoleAssigned`         |
| Imports   | `ImportJob`                   | `FileIngested`                        |
| Storage   | `StoredObject`                | `ObjectStored`, `ObjectDeleted`       |
| Scheduler | `CronJob`                     | `CronFired`                           |
| Analyzer  | `AnalysisJob`, `Transcript`   | `TranscriptReady`, `TranscriptFailed` |
| Webhooks  | `WebhookEndpoint`, `Delivery` | `DeliverySucceeded`, `DeliveryFailed` |
| Billing   | `UsageRecord`, `Invoice`      | `InvoiceGenerated`                    |

## DDD conventions

- **No cross-context domain imports.** Use plain primitives (UUIDs, strings) or a thin anti-corruption layer at context boundaries.
- **Aggregates** enforce invariants via named methods — never public setters.
- **Value objects** are immutable; equality is by value.
- **Domain events** are the only cross-context coupling. Publish to an in-process event bus; each context subscribes to what it needs.
- **Repositories** are interfaces in `domain/`; implementations in `infrastructure/`.
- **API routers** translate HTTP ↔ application commands only — no business logic.

## IAM integration

Other contexts call the IAM application service to authorize actions — they never read the IAM database.
Other contexts call the IAM application service to authorize actions — they never read the IAM database directly.

## Makefile reference

```bash
make install        # install all deps (backend + frontend)
make dev            # start backend + frontend concurrently
make dev-backend    # backend only
make dev-frontend   # frontend only
make format         # black + prettier
make build          # production frontend build
```

## What to avoid

- Anemic domain models (logic in routers or application services, not aggregates)
- Direct cross-context repository or domain-object access
- Raw DB rows leaking out of repositories
- Adding HTTP calls between contexts — keep it in-process
