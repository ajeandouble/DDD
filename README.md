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
| **Scopes** | Org / Project / Subproject / Campaign hierarchy and membership |
| **Conversations** | Conversation and review records, transcripts |
| **Imports** | Ingesting media files from external sources or direct upload |
| **Storage** | Simulated S3 — file persistence, metadata, and retrieval |
| **Analyzer** | Simulated transcription — internal queue with retries and batching |
| **Webhooks** | Outbound notifications to external systems on job completion |
| **Billing** | Usage tracking and invoice generation |

All contexts run in the **same process**. Cross-context communication happens via in-process domain events, not HTTP.

## Running

```bash
make install   # install all deps
make dev       # start backend (port 8000) + frontend (port 5173) concurrently
make format    # black + prettier
```

Seed test data: `POST /dev/seed` — drops all collections and recreates fixtures.

## IAM — Authorization Model

### Scope hierarchy

```
Organization
└── Project
    └── Subproject
        └── Campaign
```

Campaigns can also be parented directly to an Organization or Project (flat campaigns).

### Roles

Four roles in ascending order: `viewer < editor < supervisor < admin`.

Roles are assigned per-scope via Casbin RBAC (`g = _, _, _` domain-based model). Scope lineage (`project → org`, etc.) is stored as Casbin grouping rules in the `_lineage` domain, enabling upward traversal in permission checks.

A special `superadmin` role at the `platform` domain bypasses all scope checks.

### Visibility rules

| Who | What they can see |
|-----|------------------|
| Superadmin | Everything |
| Org member (any role at any sub-scope) | The org itself; org-level campaigns; groups (read-only) |
| Org viewer+ | All projects, subprojects, campaigns in the org |
| Project viewer+ | That project + all its subprojects and campaigns |
| Subproject viewer+ | That subproject + its campaigns |
| Campaign/sub-scope role | That specific scope only |

Becoming a member of an org happens automatically when a user is granted any role at any scope within that org (`OrgMemberAdded` event → `org.member_ids`). There is no separate "invite to org" step.

### Editing rules

| Action | Required |
|--------|----------|
| Assign/revoke roles at a scope | supervisor+ at **that scope** (role ceiling = your own role) |
| Create a group | supervisor+ at **any scope** in the org (you become the group owner) |
| Manage a group (add/remove members, delete) | Group owner **or** org supervisor/admin |
| Full group admin (all groups) | Org supervisor/admin |

### Groups

Groups are org-level aggregates with an `owner_id`. Any org member can see all groups (read-only). Only the owner or an org supervisor/admin can mutate a group. Groups can be assigned roles at any scope just like users.

## DDD Concepts in Play

- **Bounded Contexts** — each module owns its domain model; no cross-module domain imports
- **Aggregates** — consistency boundaries enforced within each context
- **Domain Events** — cross-context communication via in-process events, not direct calls
- **Repository Pattern** — persistence behind domain interfaces; implementations swappable
- **Value Objects** — immutable, identity-free domain concepts
- **Anti-Corruption Layer** — IAM is called as an application service by other contexts; they never read the IAM database directly
