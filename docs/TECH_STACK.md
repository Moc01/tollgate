# Technology Stack

Why each tool was chosen, and what the alternatives were.

## Language & Runtime

### TypeScript

- **Why**: shared types across server and client. Strong inference, vibrant ecosystem.
- **Alternatives considered**: Rust (too slow for 11-day delivery), Python (no Solana ergonomics on the agent side).

### Node.js 20+

- **Why**: required by Vercel Edge runtime, by Privy, by Anthropic SDK. Native fetch in 18+.
- **Alternative**: Bun. Faster cold-starts, but ecosystem incompatibility with several Solana libs in 2026.

## Monorepo

### pnpm workspaces

- **Why**: best balance of speed, disk usage, and reliability. Native to Vercel deployment.
- **Alternatives**: Turborepo (more features but more config; we don't need its build cache), Nx (overkill), Yarn workspaces (slower).

### tsup (for package builds)

- **Why**: zero-config TypeScript bundler producing both ESM and CJS, with proper `.d.ts` outputs.
- **Alternative**: tsc directly (slower, requires postprocessing for ESM).

## Web Frameworks

### Next.js 14 (App Router)

- **Used in**: `apps/dashboard`, `apps/curio`
- **Why**: server components let us mix server-only Solana logic with client UI without a separate API layer. Native Vercel deployment. App Router gives us streaming for the Curio agent UI.
- **Alternatives**: Remix (similar but smaller ecosystem), SvelteKit (great but team unfamiliar), Astro (overkill).

### Hono (for paid example APIs)

- **Used in**: `examples/*`
- **Why**: 30 KB, fast, runs on Edge / Node / Bun / Cloudflare Workers. Lets us demonstrate that `@tollgate/middleware` works on every runtime.
- **Alternatives**: Express (heavier, Node-only), Fastify (similar to Hono but Node-only).

### Vercel Edge Functions

- **Used in**: `apps/settlement`
- **Why**: settlement is latency-sensitive (agents are blocked on it). Edge runs in 100+ regions. Cold starts < 50ms.
- **Alternatives**: Cloudflare Workers (similar but worse Solana lib compatibility), AWS Lambda@Edge (too much config).

## UI

### shadcn/ui

- **Why**: copy-paste components built on Radix and Tailwind. We own the source. Works perfectly with the Linear/Stripe aesthetic that judges expect.
- **Alternatives**: MUI (too opinionated), Chakra (heavier), unstyled headless (too slow to ship in 11 days).

### Tailwind CSS

- **Why**: fastest path to a polished UI. Mature.
- **Alternatives**: vanilla CSS (slower iteration), CSS-in-JS (server-component complications).

### Recharts

- **Used in**: dashboard analytics
- **Why**: declarative React API, looks good out of the box.
- **Alternatives**: Visx (more powerful but more code), Tremor (built on Recharts).

### Framer Motion

- **Used in**: Curio agent payment animation
- **Why**: the "agent paid $0.001" tickers must feel alive. Framer is the de-facto choice.
- **Alternatives**: react-spring (lower-level), CSS animations (less expressive).

## Solana

### `@solana/web3.js` v2 (modular)

- **Why**: official, well-maintained.
- **Alternative**: gill (Anza's new modular client) — promising but immature; pin for v0.2.

### `@solana/spl-token`

- **Why**: USDC is an SPL token; we need its instruction builders.
- **Alternative**: hand-rolled instruction encoding (too error-prone for 11 days).

### `@solana/pay`

- **Why**: standard URL format for payment intents. Wallets understand it natively.
- **Alternative**: custom URL format (would lose Phantom mobile compatibility).

### Helius RPC + Webhooks

- **Why**: most reliable on Solana mainnet/devnet. Webhook product is unique — push-based USDC arrival notifications, no polling.
- **Alternatives**: Triton One (excellent for raw RPC, no webhook product), QuickNode (worse Solana focus), self-hosted (impossible in 11 days).

## Auth

### Privy

- **Used in**: `apps/dashboard`, `apps/curio`
- **Why**: email/Google login auto-creates a Solana wallet (embedded). Removes the "do you have a wallet?" friction. Direct sponsor of the hackathon.
- **Alternatives**: Dynamic (similar), Web3Auth (heavier), Phantom Connect (requires wallet pre-installation; we want zero-friction).

## Database

### Supabase Postgres

- **Why**: managed Postgres with row-level security, generous free tier, easy connection from Edge runtime via the JS client.
- **Alternatives**: Neon (also great, but our preference is bundled auth + storage), PlanetScale (MySQL is awkward for our `jsonb` usage).

### Drizzle ORM

- **Why**: type-safe queries, lightweight, no codegen step, works in Edge runtime.
- **Alternatives**: Prisma (heavier, edge-runtime-fragile), kysely (SQL-builder only, less ergonomic).

## AI

### Anthropic Claude (`@anthropic-ai/sdk`)

- **Used in**: Curio's agent loop
- **Why**: best tool-use ergonomics in 2026. Sonnet 4.6 is fast and cheap enough for real-time queries. Claude is the team's strength.
- **Alternative**: OpenAI Responses API (similar capability; wrapped by `@tollgate/agent`'s OpenAI adapter for compatibility but not used in Curio's primary path).

### OpenAI text-embedding-3-small

- **Used in**: Curio retrieval (when we need relevance scoring)
- **Why**: cheapest high-quality embedding. 1536-dim.
- **Alternative**: Voyage (better quality but more expensive).

## Crypto

### `jose`

- **Used in**: JWT signing/verification across `@tollgate/shared`
- **Why**: WebCrypto-native, Edge-runtime compatible, supports EdDSA out of the box.
- **Alternative**: `jsonwebtoken` (Node-only, no EdDSA without a plugin).

### `@noble/curves`

- **Used in**: Solana keypair operations where `web3.js` is overkill
- **Why**: minimal, audited, tree-shakable.

## Observability

### PostHog

- **Why**: self-hosted-able, open-source product analytics + funnels. We want to see the demo flow conversion live during pitch evaluation.
- **Alternative**: Amplitude (more polished but pricier).

### Sentry

- **Why**: error tracking. Free tier covers a hackathon.

## Hosting & DNS

### Vercel

- **Used in**: all three apps + settlement
- **Why**: zero-config Next.js + Edge Functions + preview deploys per PR. Free tier is enormous.

### Cloudflare DNS

- **Why**: DNS-only mode lets Vercel handle everything else. Easy domain transfers.

## CI/CD

### GitHub Actions

- **Why**: free for public repos, native to GitHub.
- **Workflow**: typecheck + lint + test on push; build on tag for npm packages.

### Changesets

- **Why**: handles versioning and changelog for the two npm packages. Manual but reliable.
- **Alternative**: semantic-release (more automated but harder to control).

## Dev Tooling

### Biome

- **Why**: replaces ESLint + Prettier with one tool, 10× faster. Mature in 2026.
- **Alternative**: ESLint + Prettier (still fine, but slower).

### Vitest

- **Why**: fast, native ESM, drop-in compatible with Jest API.

## Hard "No"s

- ❌ **Anchor / Rust programs** — we don't need a custom on-chain program. USDC SPL transfers + JWT trust are sufficient. Saves 4–5 days.
- ❌ **GraphQL** — overkill for a hackathon API surface.
- ❌ **Microservices** — settlement is one service, dashboard is one app. No service mesh.
- ❌ **Kubernetes** — Vercel handles all hosting.
- ❌ **Custom L2 / sidechain** — Solana mainnet/devnet directly.
