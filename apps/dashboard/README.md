# Dashboard

Tollgate's web UI for API providers. Server-rendered Next.js 15 app on port 3000.

Pages:
- `/` — overview: total settled USDC, total calls, list of registered endpoints
- `/new` — register a new paid endpoint (single recipient or multi-way splits)
- `/e/[id]` — endpoint detail: daily revenue chart, recent calls, top callers

## Local

Requires `apps/settlement` running on port 3001.

```bash
pnpm --filter dashboard dev
# → http://localhost:3000
```

Env:
- `TOLLGATE_SETTLEMENT_URL` — defaults to `http://localhost:3001`
- `TOLLGATE_DASHBOARD_API_KEY` — optional bearer token if settlement is configured to require it

## Auth

For v1.0 the dashboard is unauthenticated; anyone with the URL can register endpoints. The settlement service supports `TOLLGATE_DASHBOARD_API_KEY` env var as a shared secret if you need to lock it down (then set the same key here). Privy embedded-wallet auth is planned for v0.2.
