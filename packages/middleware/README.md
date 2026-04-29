# `@tollgate/middleware`

Server-side paywall middleware. Charge AI agents in USDC for any HTTP API.

## Install

```bash
npm install @tollgate/middleware
# or
pnpm add @tollgate/middleware
```

## Quick start (Hono)

```typescript
import { Hono } from 'hono'
import { tollgate } from '@tollgate/middleware/hono'

const app = new Hono()

app.use('/search/*', tollgate({
  endpointId: 'wiki-search-v1',
  price: 0.001,                           // USDC per call
  recipient: process.env.MY_SOLANA_WALLET!,
  settlementUrl: 'https://tollgate.dev/api/settle',
}))

app.get('/search', (c) => c.json({ results: [...] }))

export default app
```

## Quick start (Express)

```typescript
import express from 'express'
import { tollgate } from '@tollgate/middleware/express'

const app = express()

app.use('/search', tollgate({
  endpointId: 'wiki-search-v1',
  price: 0.001,
  recipient: process.env.MY_SOLANA_WALLET!,
}))

app.get('/search', (req, res) => res.json({ results: [...] }))
```

## Quick start (Next.js Edge)

```typescript
// app/api/search/route.ts
import { tollgate } from '@tollgate/middleware/next'

export const runtime = 'edge'

const guard = tollgate({
  endpointId: 'my-search-v1',
  price: 0.001,
  recipient: process.env.MY_SOLANA_WALLET!,
})

export async function GET(req: Request) {
  const blocked = await guard(req)
  if (blocked) return blocked

  return Response.json({ results: [...] })
}
```

## Configuration

```typescript
{
  endpointId: 'wiki-search-v1',           // required, used as JWT audience
  price: 0.001,                           // required, USDC per call
  recipient: 'BDqnQu...',                 // OR splits[]
  splits: [                               // alt to recipient
    { wallet: 'Alice...', share: 0.7 },
    { wallet: 'Bob...',   share: 0.2 },
    { wallet: 'Plat...',  share: 0.1 },
  ],
  tokenTtl: 300,                          // seconds; default 300
  quotaCalls: 1,                          // calls per token; default 1
  settlementUrl: '...',                   // settlement service base URL
  network: 'devnet',                      // or 'mainnet-beta'
  freeTier: { dailyCalls: 100 },          // optional free quota
}
```

## How it works

1. Request arrives without `Authorization: Bearer <jwt>`
2. Middleware returns `402 Payment Required` with a `Tollgate-402` body
3. Caller (an AI agent using `@tollgate/agent`) creates a payment intent at the
   settlement service, signs and submits a Solana USDC transfer
4. Caller receives a JWT from settlement and retries the request
5. Middleware verifies JWT signature locally using cached JWKS — passes through

See [PROTOCOL_SPEC.md](../../docs/PROTOCOL_SPEC.md) for the wire format.
