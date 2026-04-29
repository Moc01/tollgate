# Curio

> *Ask anything. Watch your AI pay per source, in real time.*

The killer demo for [Tollgate](../../). A Perplexity-style search agent where
every source is a paid API. Each citation comes with a transparent cost
breakdown, settled on Solana in stablecoins.

## Architecture

```
User query
    ↓
Anthropic Claude (sonnet-4-6) with 5 tools
    ↓
Claude picks 1–5 tools to call
    ↓
@tollgate/agent's withTollgate fetch wrapper
    ↓
Each tool call:
  - Hits the paid API → receives 402
  - Auto-creates payment intent at settlement service
  - Builds + signs USDC transfer on devnet
  - Polls /v1/confirm until JWT issued
  - Retries with Authorization: Bearer <jwt> → 200
    ↓
Claude synthesizes a final answer with [1] [2] citations
    ↓
SSE stream back to the browser, animating each step
```

## Local development

Requires:
- `apps/settlement` running on `:3001`
- `apps/examples` running on `:4001`
- `ANTHROPIC_API_KEY` in env
- `CURIO_AGENT_SECRET_KEY` in env (a base58 Solana keypair on devnet,
  pre-funded with USDC). If absent, an ephemeral wallet is generated;
  payments will fail unless you fund it manually.
- `HELIUS_RPC_URL` (or `HELIUS_API_KEY`) for devnet RPC

```bash
pnpm --filter curio dev
# → http://localhost:3002
```

## Deploy

```bash
pnpm --filter curio deploy
```

Set the env vars in Vercel project settings before deploying.
