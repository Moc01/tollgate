# `@tollgate/agent`

Client-side SDK that lets your AI agent transparently pay for paywalled APIs.

## Install

```bash
pnpm add @tollgate/agent @solana/web3.js
```

## Quick start

```typescript
import { Keypair } from '@solana/web3.js'
import { withTollgate, keypairWallet } from '@tollgate/agent'

const wallet = keypairWallet(Keypair.fromSecretKey(/* ... */))

const fetch = withTollgate(globalThis.fetch, {
  wallet,
  rpcUrl: process.env.HELIUS_RPC_URL!,
  network: 'devnet',
  maxPricePerCall: 0.01,   // never pay more than 1 cent per call
  maxTotalSpend: 1.0,      // never spend more than $1 in this session
})

// Now any 402 response is paid automatically
const res = await fetch('https://wikipedia-pro.example.com/search?q=Solana')
const data = await res.json()
```

## Anthropic Claude tool use

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { wrapAnthropicTools } from '@tollgate/agent/anthropic'

const claude = new Anthropic()
const tools = wrapAnthropicTools(
  [
    { name: 'search_wiki', description: '...', input_schema: {...},
      url: 'https://wikipedia-pro.example.com/search' },
    { name: 'search_news', description: '...', input_schema: {...},
      url: 'https://news-api.example.com/search' },
  ],
  agentConfig,
)

// Now Claude's tool calls automatically pay paywalls
```

## How it works

1. Your agent calls `await fetch(url)`
2. Upstream returns `402 Payment Required` with a Tollgate-402 body
3. SDK auto-creates a payment intent at the settlement service
4. SDK signs and submits a Solana USDC transfer using the wallet
5. SDK polls settlement until it receives an access token
6. SDK retries the original request with `Authorization: Bearer <jwt>`
7. Upstream returns 200; the result of `fetch()` is the final response

This entire flow takes 1–2 seconds on Solana mainnet.

See [PROTOCOL_SPEC.md](../../docs/PROTOCOL_SPEC.md) for the wire format.
