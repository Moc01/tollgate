# Architecture

This document describes the system architecture of Tollgate. For protocol-level details, see [PROTOCOL_SPEC.md](./PROTOCOL_SPEC.md).

## High-Level System Diagram

```
                                  ┌─────────────────────────┐
                                  │  AI Agent Application   │
                                  │  (e.g., Curio, custom)  │
                                  └────────────┬────────────┘
                                               │ uses
                                               ▼
                                  ┌─────────────────────────┐
                                  │   @tollgate/agent       │
                                  │   - wraps fetch         │
                                  │   - handles 402         │
                                  │   - signs payments      │
                                  └────────────┬────────────┘
                                               │
                                               │ HTTP request (1)
                                               ▼
                                  ┌─────────────────────────┐
                                  │   Paid API Endpoint     │
                                  │   (any HTTP service)    │
                                  └────────────┬────────────┘
                                               │ uses
                                               ▼
                                  ┌─────────────────────────┐
                                  │   @tollgate/middleware  │
                                  │   - verify access token │
                                  │   - if absent: emit 402 │
                                  └────────────┬────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       │ (2) HTTP 402 + payment instructions           │
                       ▼                                               │
                  Agent receives 402                                   │
                       │                                               │
                       │ (3) POST /v1/intent (challenge, agent_pubkey) │
                       ▼                                               │
   ┌─────────────────────────────────┐                                 │
   │  Tollgate Settlement Service    │                                 │
   │  (Vercel Edge Functions)        │                                 │
   │  - issue payment intents        │                                 │
   │  - validate on-chain txs        │                                 │
   │  - sign access tokens (JWT)     │                                 │
   │  - record analytics             │                                 │
   └────────────────┬────────────────┘                                 │
                    │                                                  │
                    │ (4) returns Solana Pay URL + intent_id           │
                    ▼                                                  │
   Agent constructs USDC tx, signs with its wallet                     │
                    │                                                  │
                    │ (5) submits tx to Solana                         │
                    ▼                                                  │
              ┌──────────────────┐                                     │
              │  Solana Mainnet  │                                     │
              │  (or Devnet)     │                                     │
              └────────┬─────────┘                                     │
                       │                                               │
                       │ (6) Helius webhook fires on USDC transfer     │
                       ▼                                               │
            Settlement Service confirms tx                             │
                       │                                               │
                       │ (7) issues access token (JWT, short TTL)      │
                       ▼                                               │
                  Agent retries (8) with `Authorization: Bearer <jwt>` │
                                                                       │
                       ┌───────────────────────────────────────────────┘
                       ▼
              Middleware verifies JWT signature locally
              (no settlement-service round-trip needed)
                       │
                       ▼
                  API responds 200 OK
```

## Components

### `@tollgate/shared`

Foundation package. Pure TypeScript types and utilities used by all other packages. No runtime dependencies on Solana or framework code.

- **Types**: `PaymentIntent`, `AccessToken`, `EndpointConfig`, `RevenueSplit`, `Tollgate402Body`, etc.
- **JWT utilities**: sign, verify, decode (using `jose`)
- **Solana helpers**: address validation, USDC mint constants, devnet/mainnet detection
- **Error classes**: `TollgateError`, `PaymentRequiredError`, `BudgetExceededError`

### `@tollgate/middleware`

Server-side library. Provides framework adapters (Express, Hono, Next.js Edge, Bare Node).

```typescript
import { tollgate } from '@tollgate/middleware'

app.use('/search', tollgate({
  // Required
  endpointId: 'wiki-search-v1',
  price: 0.001,                    // in USDC
  recipient: 'BDqnQu...',          // Solana address (base58)

  // Optional
  splits: [                        // alt to `recipient`; pre-validated to sum to 1
    { wallet: 'Alice...', share: 0.7 },
    { wallet: 'Bob...',   share: 0.2 },
    { wallet: 'Plat...',  share: 0.1 },
  ],
  tokenTtl: 300,                   // seconds; default 600
  quotaCalls: 1,                   // calls per token; default 1
  freeTier: { dailyCalls: 100 },   // optional free quota by IP/agent_pubkey
}))
```

**Hot path performance**: the middleware verifies the JWT signature locally using a public key it fetches once at boot from the settlement service (`/v1/jwks`). It does **not** call settlement on each request.

### `@tollgate/agent`

Client-side library. Wraps a `fetch`-compatible interface so the calling code is unchanged.

```typescript
import { withTollgate } from '@tollgate/agent'

const fetch = withTollgate(globalThis.fetch, {
  wallet: kp,                      // Solana Keypair (devnet/mainnet)
  rpcUrl: 'https://...',           // Helius or other RPC
  maxPricePerCall: 0.01,           // budget guard, USDC
  maxTotalSpend: 1.0,              // session budget, USDC
  onPayment: (intent) => ...,      // optional hook for telemetry/UI
})
```

The wrapper:

1. Calls upstream once.
2. If 200: returns immediately.
3. If 402 with valid `Tollgate-402` body: parses the intent, checks budget, signs and submits a USDC transfer, polls settlement for the access token, retries with `Authorization: Bearer <jwt>`.
4. Caches access tokens by `endpointId` for the token's TTL.

Also ships **adapters** that wrap LLM SDK tool definitions:

- `wrapAnthropicTools(tools, agentConfig)` — for Claude tool use
- `wrapOpenAIFunctions(functions, agentConfig)` — for OpenAI function calling
- `wrapMCPClient(client, agentConfig)` — for Model Context Protocol clients

These adapters intercept the fetch the model emits when it calls a tool that points to a paid endpoint.

### Settlement Service (`apps/settlement`)

Stateless HTTP service deployed to Vercel Edge Functions. Endpoints:

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/intent` | Create payment intent; returns Solana Pay URL + `intent_id` |
| POST | `/v1/confirm` | Agent polls/calls when its tx is sent; returns access token if confirmed |
| GET | `/v1/jwks` | JSON Web Key Set for middleware to verify access tokens |
| POST | `/v1/webhook/helius` | Webhook receiver for incoming USDC transfers |
| POST | `/v1/endpoints` | Register a new endpoint (auth: dashboard session) |
| GET | `/v1/analytics/:endpointId` | Time-series revenue data (auth: dashboard session) |

**Why Edge Functions**: Settlement is latency-critical; Edge runs near the agent. State is in Postgres (Supabase), reads are cached at the edge.

### Dashboard (`apps/dashboard`)

Next.js 14 app for API providers. Authenticated via Privy (email/Google login auto-creates a Solana wallet).

Pages:

- `/` — landing
- `/dashboard` — overview: today's revenue, total revenue, top endpoints
- `/endpoints` — register new endpoint, edit pricing/splits
- `/endpoints/[id]` — endpoint detail: time-series chart, recent calls, top callers
- `/payouts` — withdraw to bank via MoonPay (post-MVP)
- `/docs` — embedded docs site

### Curio (`apps/curio`)

Next.js 14 app. The demo product.

Pages:

- `/` — search interface
- `/c/[id]` — shared answer page (auditable)
- `/explorer` — public feed of recent answers and their cost breakdowns

Internally Curio uses Anthropic Claude with a tool definition that lets the agent search 5+ paid sources. Tool calls are routed through `@tollgate/agent`, which auto-pays each one.

### Examples (`examples/*`)

Five small Express servers, each protected by `@tollgate/middleware`, serving fake (or scraped real) data. Used by Curio.

| Example | Mock data | Price |
|---|---|---|
| `news-api` | Recent crypto news headlines | $0.002 |
| `github-search` | GitHub repo search | $0.001 |
| `wiki-api` | Wikipedia summary | $0.0005 |
| `arxiv-api` | ArXiv paper search | $0.003 |
| `solana-docs-api` | Solana docs Q&A | $0.0005 |

## Data Stores

- **Postgres (Supabase)**: endpoints, payment intents, access tokens, calls log, revenue splits
- **Edge Cache (Vercel KV / Upstash Redis)**: JWKS, recent intent lookups, rate limits

See [DATA_MODEL.md](./DATA_MODEL.md) for schemas.

## RPC Strategy

| Use case | RPC provider | Why |
|---|---|---|
| Submit USDC transfers from agents | Helius mainnet RPC | reliable, fast |
| Listen for USDC arrivals on settlement | Helius webhooks | push-based, no polling |
| Read balances on dashboard | Helius RPC + Supabase cache | RPC + 30s cache |
| Devnet operations (tests/CI) | Helius devnet RPC | free tier sufficient |

## Failure Modes & Recovery

| Failure | Detection | Recovery |
|---|---|---|
| Settlement webhook misses a tx | Reconciliation cron job re-scans Solana every 60s | Retroactively issue access token; agent client polls `confirm` |
| Agent's tx confirms but agent crashes before retrying | Token is short-TTL but cached; on agent restart it can claim | Settlement service exposes `GET /v1/intent/:id/token` for a 5-minute grace window |
| API provider's middleware rejects valid token | Local JWT verify failure (e.g., out-of-date JWKS) | Refresh JWKS every 60s, fail-open if signature is recent enough |
| Network partitions during payment | Agent times out waiting for settlement | Configurable timeout + automatic refund flag for ops review |

## Why a JWT, Not an On-Chain NFT or PDA

Two reasons:

1. **Latency**: An on-chain check on each request adds ~400ms. A JWT verifies in microseconds.
2. **Cost**: Even at Solana's fee, an on-chain check per API call adds up at scale.

The JWT is signed by the settlement service's private key. The middleware fetches the JWKS once. Trust is rooted in the on-chain payment that produced the JWT, but verification is off-chain.

If a deployment requires fully on-chain verification (regulated environments), `middleware` exposes a `verifyMode: 'on-chain' | 'jwt'` option (post-MVP).

## Security Boundary

- **Settlement service** is the single trusted issuer of access tokens. Its private key must be protected.
- **Middleware** is untrusted by clients but trusts settlement (via JWKS).
- **Agent** trusts its own keypair. It does NOT trust middleware (validates signatures of 402 responses).
- **402 responses are not signed** in v0.1 (open issue: a malicious endpoint could lie about price). v0.2 will sign 402 bodies with the endpoint's registered key. Mitigation in v0.1: agent enforces `maxPricePerCall`.

See [SECURITY.md](./SECURITY.md) for the full threat model.
