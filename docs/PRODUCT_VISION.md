# Product Vision

> *The vending machine for AI agents.*

## TL;DR

Tollgate is a Solana-native HTTP 402 payment protocol that lets any API charge AI agents per call in USDC. The protocol ships as two npm packages (server-side middleware + client-side agent SDK) plus a settlement service and a dashboard.

The first product built on Tollgate is **Curio** — an AI search agent that pays multiple paid sources per query, demonstrating the full agent-pays-API flow live.

---

## The Problem

The agentic web is here. AI agents browse, research, transact, and increasingly act on behalf of users at scale. Yet every payment rail in existence is built for humans:

- **Stripe** requires SSN, KYC, and a real bank account
- **Credit cards** assume an identity check, monthly billing, and chargebacks
- **PayPal/Venmo** are human-to-human and KYC-locked
- **API keys with prepaid balance** lock agents into a single provider, no portability

So today's "AI agents" pay for APIs through their human owner's API keys. This breaks every interesting agent design pattern:

1. **Multi-source orchestration**: An agent that wants to query 10 different paid APIs must have an API key for each one, set up by a human in advance.
2. **Long-running autonomy**: An agent that needs to discover *new* paid APIs on the fly cannot — it has no way to onboard with a new provider without human intervention.
3. **Revenue accountability**: A platform hosting many agents has no clean way to bill back which agent consumed what API at what price.
4. **Micro-economics**: A $0.001 API call simply cannot be settled by Stripe (whose minimum is ~$0.30 + 2.9%).

The agentic web needs a different payment substrate.

## The Insight

Three properties make this substrate uniquely a Solana problem:

| Property | Why it matters | Why Solana |
|---|---|---|
| **Sub-cent fees** | A $0.001 API call must not cost more in fees than the call itself | Solana fees are ~$0.00025, often lower |
| **Sub-second finality** | Agents make hundreds of API calls; payment must not block | Solana blocks settle in ~400ms |
| **No KYC, no banks** | Agents have no identity; payments must be pseudonymous | Solana wallets are permissionless |
| **Native USDC** | Agents need price stability for budget planning | Solana USDC is the most liquid stablecoin on any L1 |
| **Programmable splits** | Multi-contributor APIs need automatic, trustless revenue sharing | SPL Token transfers cost effectively zero |

There is no other chain where all five are true at the same time. Ethereum L2s come close on (1) and (2) but USDC liquidity is fragmented and DEX fragmentation undermines stability. Bitcoin Lightning has (1) and (2) but no native stablecoin. Centralized rails fail (3) absolutely.

## The Standard

HTTP defined `402 Payment Required` in 1996 and never used it. The web's missing status code is finally getting a use case — and Solana is the right substrate.

Tollgate-402 is **HTTP-native**, so it plays well with all existing infrastructure (CDNs, load balancers, gateways, AI tool definitions). It does not require a new protocol layer; it requires a payment header.

## The Three Audiences

### 1. **API providers** — they install `@tollgate/middleware`

```typescript
import { tollgate } from '@tollgate/middleware'

app.use('/search', tollgate({
  price: 0.001,
  recipient: process.env.MY_SOLANA_WALLET,
}))
```

That's it. Their API now charges $0.001 USDC per call to any caller, settled on Solana, no Stripe account needed.

### 2. **AI agent builders** — they install `@tollgate/agent`

```typescript
import { withTollgate } from '@tollgate/agent'

const fetch = withTollgate(globalThis.fetch, {
  wallet: agentWallet,        // a Solana keypair, e.g. from Privy
  maxPricePerCall: 0.01,      // budget guard
})

// Now any 402 response is automatically paid and the request retried
const res = await fetch('https://wikipedia-pro.example.com/search?q=Solana')
```

Their agent now transparently handles paid APIs without any provider-specific integration.

### 3. **The platform** — Tollgate Cloud (free tier; SaaS for advanced features)

API providers register their endpoints on the dashboard, see real-time revenue, see which agents are calling them, and configure revenue splits among contributors. Optional: connect MoonPay to off-ramp earnings to fiat.

## The Demo App: Curio

**Curio** is the killer demonstration — a Perplexity-style search agent built entirely on Tollgate. When a user asks Curio a question, it:

1. Spawns 5+ parallel calls to specialized paid APIs (news, github, wikipedia, arxiv, solana docs)
2. Pays each one in USDC via `@tollgate/agent`
3. Synthesizes a final answer with Claude (also paid through Tollgate)
4. Returns the answer with a per-source cost breakdown that the user can audit on Solana Explorer

Curio is not just a demo. It's a real product that could be launched after the hackathon, generating recurring economics for both the platform and source operators.

## Why This Wins the Hackathon

The judging criteria from Colosseum are:

| Criterion | How Tollgate scores |
|---|---|
| **Functionality** | Live demo: 1 line of code → AI agent pays a paywalled API → answer arrives, all in <2 seconds |
| **Founder commitment** | The protocol is publishable as a real npm package the day after the hackathon. The team intends to ship it as production infrastructure. |
| **Business viability** | Platform takes 5–10% of all settled volume. Agentic API economy is projected to be $50B+ by 2027. |
| **Market understanding** | Tollgate exactly matches the gap between Stripe (built for humans) and on-chain payments (UX hostile for non-crypto APIs). |
| **Solana integration** | Five distinct Solana primitives are necessary: native USDC, sub-second finality, sub-cent fees, programmable token splits, no-KYC wallets. None of them are optional. |

## The Long Bet

If agents become the dominant consumers of APIs (a 2026–2028 trend), then every paid API on the open web will eventually need a 402-style payment layer. Tollgate is the first credible Solana-native implementation. If we win, we are positioned as the canonical implementation of an emerging standard.

The accelerator's $250K and the network attached to it would let us:

1. Ship Tollgate as production infrastructure within 90 days post-hackathon
2. Onboard 100 paid API providers in the first 6 months
3. Establish the Solana-native 402 standard before any other team can

This is a real long-term company, not a hackathon project.
