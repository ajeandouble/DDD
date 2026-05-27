# Frontend — Claude Code Context

React SPA. See the root `CLAUDE.md` for the overall architecture.

## Stack

- **Vite** — dev server and bundler; config in `vite.config.ts`
- **React Router** — `createBrowserRouter` wired in `src/main.tsx`; routes are plain objects, no file-based magic
- **TanStack Query** — all server state; no ad-hoc `useEffect` fetches
- **Ky** — HTTP client; single instance in `src/lib/http.ts` with auth hooks; typed API helpers in `src/lib/api.ts`

## Layout

```
frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx              # app entry — createBrowserRouter + QueryClientProvider
    ├── pages/                # one file per route
    │   ├── LoginPage.tsx
    │   └── HomePage.tsx
    ├── components/
    ├── dto/                  # Zod schemas mirroring backend Pydantic models
    │   ├── auth.ts
    │   ├── conversations.ts
    │   └── imports.ts
    └── lib/
        ├── api.ts            # typed Ky helpers — one function per endpoint
        ├── http.ts           # Ky instance with Bearer token + 401 redirect
        └── query-client.ts   # QueryClient singleton
```

## Formatting

- **Prettier** — `npm run format` — config in `.prettierrc` (100 chars, double quotes, trailing commas)
- `routeTree.gen.ts` is excluded from formatting (auto-generated)
- Run via `make format` or `make format-check`

## Conventions

- Page components own their `useQuery` / `useMutation` calls; presentational components receive data as props.
- All API calls go through typed helpers in `src/lib/api.ts` — never raw `fetch` or inline `ky`.
- DTOs in `src/dto/` mirror backend Pydantic response models exactly; keep them in sync when the backend changes.
- No global state beyond TanStack Query's cache.

## Auth

- Login → `POST /api/auth/login` → store JWT in `localStorage` (toy scope; use memory in prod).
- Ky `beforeRequest` hook attaches `Authorization: Bearer <token>` automatically.
- On 401, token is cleared and user is redirected to `/login`.

## Running

```bash
npm install
npm run dev     # http://localhost:5173
```

Backend is proxied: `fetch('/api/...')` → `http://localhost:8000/...`
