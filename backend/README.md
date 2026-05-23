# Backend — Claude Code Context

Single FastAPI app. Seven bounded contexts as Python packages: `iam`, `imports`, `storage`, `scheduler`, `analyzer`, `webhooks`, `billing`. See the root `CLAUDE.md` for the full picture, event flow, and aggregate table.

## Conventions

- Managed with `uv`; one `pyproject.toml` at `backend/`.
- Layer order within each context: `domain` → `application` → `infrastructure` → `api`. Lower layers never import from higher ones.
- FastAPI routers live in `<context>/api/`; they only translate HTTP ↔ application commands/queries.
- Pydantic models at the API boundary; plain dataclasses in the domain layer.
- Cross-context calls go through domain events or the IAM application service — never direct domain imports.

## Formatting

- **Black** — `uv run black src/` — line length 100, configured in `pyproject.toml`
- Run via `make format` or `make format-check` (CI-safe, no writes)

## Testing

- `domain/` and `application/`: pure unit tests, no I/O.
- `infrastructure/` and `api/`: integration tests against real dependencies (no DB or HTTP mocks).
