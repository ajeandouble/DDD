# DDD Project Roadmap

## Completed

### Phase 1 — Bootstrap
- FastAPI app, MongoDB, bounded context scaffolding, basic auth (JWT), organizations/projects/subprojects/campaigns hierarchy

### Phase 2 — Audio import pipeline
- Multipart upload → temp storage → `FileIngested` event → faster-whisper transcription (local, word timestamps)
- Speaker diarization heuristic (gap > 1.5s toggles A/B)
- `TranscriptReady` → `conv.content` updated to speaker-turn JSON array
- Storage context serves audio files via `GET /storage/{key}`
- SHA-256 `file_hash` on `ImportJob` aggregate and `imports_jobs` collection for future idempotency

### Phase 3 — Billing & Subscriptions
- `Subscription` aggregate on `org_id`: `tier`, `tokens_used`, `period_start`, `owner_id`; `tokens_remaining` computed property
- `UsageRecord` aggregate: one per transcription job — `org_id`, `conversation_id`, `duration_seconds`, `tokens_consumed`
- Token heuristic: `100 + int(duration_seconds)` per job
- Plans: `starter` (10k tokens, no webhooks), `pro` (100k, webhooks), `enterprise` (unlimited, webhooks)
- `OrganizationCreated` → Billing event handler seeds a `starter` subscription automatically
- `ConversationTranscribed` → Billing event handler records usage and deducts tokens
- `QuotaService` (CQRS read side): `check_analysis_quota` raises `QuotaExceeded` (→ HTTP 402 on upload); `check_webhook_access` raises `WebhookAccessDenied` (→ HTTP 403 on endpoint create)
- `GET /webhooks/endpoints` returns `[]` for starter orgs (no 403)
- Upload (`POST /imports/`) now requires `scope_id` + `scope_type`; enforces editor+ role via Casbin before quota check
- API: `GET /billing/organizations/{id}/subscription`, `POST .../upgrade`, `GET .../usage`
- Frontend: `/orgs/:orgId/billing` — plan cards with token progress bar, fake payment modal (pre-filled card), usage history table
- Frontend: "Upload audio" / "New conversation" buttons hidden for viewers (`canWrite` check via `myRoles.campaigns[scopeId]`)
- Frontend: "New endpoint" button on WebhooksPage hidden for non-admins; starter orgs see upgrade CTA instead of endpoint list

### Phase 4 — IAM (roles, groups, policies)
- Casbin policy engine, role hierarchy (viewer → editor → supervisor → admin → superadmin)
- Group membership, role ceiling enforcement
- `useCanManageMembers` hook, `MembersDrawer` UI

### Phase 5 — Webhooks
- `ConversationTranscribed` domain event emitted by conversations context (not analyzer) — carries full envelope: `org_id`, `title`, `timestamp`, `scope_type/id`, `metadata`, `speaker_turns`, `stats`
- Webhooks context subscribes to `conversation.transcribed`; DDD boundary respected (no cross-context domain imports)
- RestrictedPython sandbox: `_getitem_`, `_getattr_`, `_getiter_`, `_write_`; `print()` via `PrintCollector` class in globs (compiled code calls `_print_(_getattr_)` → instance stored as `_print`)
- HMAC-SHA256 signing header `X-DDD-Signature: sha256=…`, httpx async delivery (10s timeout), same call returns transformer error or HTTP result
- Delivery log per endpoint: status (`success` / `failed` / `transformer_error`), response code, error traceback
- Admin-only CRUD for endpoints; transformer dry-run endpoint (`POST /webhooks/transformer/test`) open to any authenticated user
- UI: endpoint list with enable/disable toggle, delivery log collapse, edit modal; transformer textarea + editable sample payload (real `conversation.transcribed` shape); stdout shown in grey block, errors in red
- Testable with `nc -lk 4000` on macOS

### Phase 6 — Audio player with word-level seeking
- WaveSurfer v7 waveform, click-to-seek on word spans, auto-scroll transcript, play/pause button
- 60vh scrollable transcript panel, `findActiveWord` binary search

### Phase 7 — Conversation creation UX
- "Speaker turns" mode in new-conversation modal (segmented control toggle vs plain text)
- Metadata key/value editor (add/remove rows) on both new conversation and audio upload modals

### Phase 8 — Conversation search, pagination & sorting
- `POST /conversations/search` with structured filters, pagination, and sort
- Filter fields: `title`, `content`, `meta` (key + value), `stats.word_count`, `stats.duration_seconds`
- String operators: `eq`, `contains` (case-insensitive), `regex`; numeric operators: `eq`, `gt`, `gte`, `lt`, `lte`
- Numeric guard: `value.lstrip("-+").replace(".", "", 1).isdigit()` before Mongo cast
- Sort by Date / Title / Duration with toggle ↑↓; field whitelist-validated in repository
- TanStack Query keyed by `[page, activeFilters, sortBy, sortDir]` — each combo cached independently
- Filter panel UI (collapsible) with add/remove rows, Apply/Clear
- Card layout: fixed date+time column on left, vertical divider, metadata badges inline
- Backoff polling for pending transcripts: 1s → 5s → 10s×10 → 20s×20 → 5min; stops when transcript arrives

### Phase 9 (partial) — Scope & conversation UI enhancements
- Scope color palette (16 colors), stored on `Project`/`Subproject`/`Campaign` aggregates; supervisor+ only
- Scope color rendered as left border + transparent background on cards
- Inline editable scope names via `EditableTitle` component (DDD-compliant: `rename()` aggregate method + `Rename*Command`)
- Conversation edit modal: title + tag `MultiSelect`, inline "Add tag" form
- Conversation delete with confirmation modal
- `file_hash` SHA-256 on `ImportJob` for idempotency groundwork

---

## Planned

### Phase 9 — Conversation UX polish
- Invalid regex toast: `try/catch new RegExp(value)` before search submit → Mantine notification
- Height-limited conversation list: `max-height: calc(100vh - N)` with `overflow-y: auto`; pagination bar stays in viewport
- Per-page selector: 25 / 50 / 100 items via Mantine `Select`
- Persisted per-campaign preferences in `localStorage`: `{ [campaignId]: { perPage, sortBy, sortDir } }` — pagination and sort persisted per campaign; filters are session-only (not persisted) to avoid stale filters silently hiding results
- Tag CRUD per org, assign/remove tags on conversations
- Filter by tag in search panel (tag filter chips; multi-select; persisted in campaign prefs)

### Phase 10 — Scheduler / cron
- `CronJob` aggregate, in-process cron runner
- Demo: nightly invoice generation, stale-conversation cleanup

### Phase 11 — i18n & user preferences
- `react-i18next` integration; extract all UI strings to locale JSON files
- Languages: English, French, Spanish, Italian, German, Japanese, Chinese
- Machine-translated locale files (flagged for manual review)
- Language preference stored on `User` aggregate (`preferences.locale` field); `PATCH /users/me/preferences` endpoint
- Language selector in Settings page

### Phase 13 — Performance & UX responsiveness
- Debounce free-text search inputs (title, content filters) to avoid firing on every keystroke
- Throttle high-frequency interactions (e.g. waveform scrubbing, rapid page changes)

### Phase 12 — User avatar
- Drag-and-drop avatar upload on profile/settings page
- Client-side compression via `browser-image-compression` → target ≤ 200 KB after compress
- Stored as base64 in a dedicated `avatars` collection (separate from `User` document to avoid bloating every user fetch)
- `GET /users/:id/avatar` endpoint; avatar displayed in nav/header
