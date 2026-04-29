# Project Plan

This is a 11-day execution plan for delivering Tollgate as a hackathon submission. Each milestone has a definition-of-done.

## Overall Strategy

We are optimizing for one thing: **a 30-second demo that makes a Colosseum judge stop scrolling**.

That demo requires:
1. A real, deployed paid API
2. A real AI agent that calls it
3. Real USDC moving on-chain
4. A dashboard showing the revenue land
5. A Curio answer with cost breakdown that auditably points to the on-chain tx

Every other feature is in service of that demo, the pitch video, or the technical-demo video.

## Working Model

- **Claude (AI)** does ~95% of the implementation: design, code, docs, scripts, deployment configs.
- **Human (Moc01)** is responsible for: account creation, key issuance, recording videos, real-world testing on a separate machine, choosing among options Claude proposes.
- **Communication**: Claude writes code first; human reviews; human reports any breakage. Claude debugs.

## Phase 0 — Architecture & Repo (Day 1)

**Status**: in progress

- [x] Create monorepo directory structure on D:\tollgate
- [x] Write `README.md` (bilingual)
- [x] Write `docs/PRODUCT_VISION.md`
- [x] Write `docs/ARCHITECTURE.md`
- [x] Write `docs/PROTOCOL_SPEC.md`
- [x] Write `docs/TECH_STACK.md`
- [x] Write `docs/DATA_MODEL.md`
- [ ] Write `docs/SECURITY.md`
- [ ] Write `docs/PITCH_STRATEGY.md`
- [ ] Write `docs/SETUP.md`
- [ ] Mirror all docs to `docs/zh/` (Chinese)
- [ ] Initialize git, commit Phase 0
- [ ] Push to `git@github.com:Moc01/tollgate.git`

**Definition of done**: human can clone the repo and read a complete plan; nothing surprising remains undecided.

## Phase 1 — Monorepo & Shared (Day 1–2)

- [ ] Create root `package.json` with pnpm workspaces
- [ ] Create root `tsconfig.json`, `tsconfig.base.json`
- [ ] Create root `biome.json`
- [ ] Create `.gitignore`, `.env.example`, `LICENSE` (MIT)
- [ ] Create `packages/shared` skeleton: `package.json`, `tsup.config.ts`, `src/index.ts`
- [ ] Implement core types in `packages/shared/src/types.ts`
- [ ] Implement JWT helpers (`sign`, `verify`, `jwks`) in `packages/shared/src/jwt.ts`
- [ ] Implement Solana helpers (USDC mint, address validation) in `packages/shared/src/solana.ts`
- [ ] Implement DB schema (Drizzle) in `packages/shared/src/db/schema.ts`
- [ ] Build `@tollgate/shared` and verify it imports cleanly

**Definition of done**: `pnpm -r build` succeeds, `pnpm -r typecheck` passes.

## Phase 2 — Middleware (Day 2)

- [ ] Create `packages/middleware` skeleton
- [ ] Implement core 402 emission logic
- [ ] Implement JWT verification (using JWKS cache)
- [ ] Express adapter
- [ ] Hono adapter (default for examples)
- [ ] Next.js Edge adapter
- [ ] Bare Node `IncomingMessage` adapter
- [ ] Unit tests with Vitest

**Definition of done**: in a test, a request without auth returns 402 with a valid `Tollgate-402` body; a request with a valid mock JWT returns 200.

## Phase 3 — Settlement Service (Day 3)

- [ ] Create `apps/settlement` Vercel Edge Function project
- [ ] Implement `POST /v1/intent`
- [ ] Implement `POST /v1/confirm` (returns 202 if pending, 200 with token if paid)
- [ ] Implement `GET /v1/jwks`
- [ ] Implement `POST /v1/webhook/helius` (verify HMAC, mark intent paid, write ledger)
- [ ] Postgres connection (Supabase)
- [ ] Set up Helius webhook on devnet
- [ ] End-to-end test: manually craft 402 → intent → tx → confirm → token

**Definition of done**: a `curl` test against deployed settlement creates an intent, accepts a tx via mocked webhook, returns a valid JWT.

## Phase 4 — Agent SDK (Day 4)

- [ ] Create `packages/agent` skeleton
- [ ] Implement `withTollgate(fetch, config)` core wrapper
- [ ] Implement payment flow: detect 402 → POST /v1/intent → sign tx → submit → poll /v1/confirm
- [ ] Implement budget guards (`maxPricePerCall`, `maxTotalSpend`)
- [ ] Implement token caching by `endpoint_id`
- [ ] Implement Anthropic tool wrapper (`wrapAnthropicTools`)
- [ ] Implement OpenAI function wrapper (`wrapOpenAIFunctions`)
- [ ] Unit tests

**Definition of done**: in a test, a wrapped fetch hitting a 402-returning mock automatically pays and retries, returning the final 200 response.

## Phase 5 — Example Paid APIs (Day 5)

- [ ] `examples/news-api`: Hono server returning mock news, $0.002 per call
- [ ] `examples/github-search`: Hono server, $0.001
- [ ] `examples/wiki-api`: Hono server, $0.0005
- [ ] `examples/arxiv-api`: Hono server, $0.003
- [ ] `examples/solana-docs-api`: Hono server, $0.0005
- [ ] All deployed to Vercel with public URLs
- [ ] All registered in the dashboard

**Definition of done**: an end-to-end test calling each example via `@tollgate/agent` returns valid responses after payment.

## Phase 6 — Dashboard (Day 6–7)

- [ ] Create `apps/dashboard` Next.js project
- [ ] Privy auth integration
- [ ] Endpoint registration form
- [ ] Endpoint list / detail pages
- [ ] Revenue chart (Recharts)
- [ ] Recent calls table
- [ ] Top callers list
- [ ] Splits configuration UI
- [ ] Polish (mobile responsive, loading states, empty states)

**Definition of done**: a new user can log in, register an endpoint, see fake traffic populate within minutes.

## Phase 7 — Curio (Day 7–8)

- [ ] Create `apps/curio` Next.js project
- [ ] Search input UI (single-page, Perplexity-style)
- [ ] Backend route: agent loop using Anthropic + `@tollgate/agent` + tools
- [ ] Stream the agent's tool-call progress to the frontend (Server-Sent Events)
- [ ] Cost-breakdown UI with citation tooltips
- [ ] On-chain "View on Explorer" links
- [ ] Public answer pages (`/c/[id]`)
- [ ] `/explorer` feed of recent answers

**Definition of done**: type a question, see 5 paid sources called in real time, see a final answer with cost breakdown, click an `Explorer` link and find the actual on-chain payment.

## Phase 8 — Polish (Day 9)

- [ ] All apps mobile-responsive
- [ ] Loading & empty states everywhere
- [ ] Error handling (especially payment timeouts)
- [ ] PostHog analytics events at key points
- [ ] Sentry error reporting
- [ ] Custom domain: `tollgate.dev` (TBD) or fallback to `tollgate-protocol.vercel.app`
- [ ] Landing page hero animation
- [ ] Logo / brand kit (single SVG)

**Definition of done**: the apps look and feel like a Linear/Stripe-quality product.

## Phase 9 — Pitch Materials (Day 10)

- [ ] Write pitch video script (3 min, English)
- [ ] Write pitch video script Chinese subtitle / dubbing
- [ ] Record pitch video (Loom or Descript)
- [ ] Write technical demo script (2-3 min)
- [ ] Record technical demo
- [ ] Write project description for Colosseum form
- [ ] Prepare 5-slide pitch deck (PDF) as backup

**Definition of done**: human has both videos uploaded to private YouTube/Loom links.

## Phase 10 — Submission (Day 11)

- [ ] Final smoke test of all deployed apps
- [ ] Update README with live URLs
- [ ] Update GitHub repo description and topics
- [ ] Create release tag `v0.1.0-hackathon`
- [ ] Submit on colosseum.com
- [ ] Submit to Superteam Earn side tracks (Privy, Helius, Phantom, etc.)
- [ ] Build-in-public final tweet

**Definition of done**: confirmation email from Colosseum.

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Helius webhook delivery delay | Medium | High | reconciliation job re-scans Solana every 60s |
| Privy embedded wallet quota | Low | Medium | use Privy free tier; fallback to Solana keypair if blocked |
| Vercel Edge cold starts during demo | Low | Medium | warm-up cron 5 min before recording |
| Anthropic API rate limit during demo | Low | High | second key on standby, throttle in code |
| Devnet USDC liquidity | Low | High | mint our own test SPL token if needed; document clearly |
| 11-day deadline overrun | High | Critical | aggressive feature cuts in phases 6–8 if behind schedule |

## Cut List (if behind schedule)

In priority order, cut from end:

1. PostHog/Sentry (just keep console)
2. MoonPay integration (skip, mention as "coming soon")
3. Public `/explorer` feed in Curio (just keep search)
4. Splits configuration UI in dashboard (use a JSON textarea instead)
5. OpenAI function wrapper (only ship Anthropic adapter)
6. Mobile responsive on dashboard (Curio + landing must be responsive; dashboard can be desktop-only)

We never cut: middleware, agent, settlement, Curio search, on-chain payment.
