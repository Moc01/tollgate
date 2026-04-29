# Technical Demo Video Script (2:30)

This complements the pitch video. It is shown to judges who **want depth** —
how the system is built, what trade-offs were made, what the next
implementation steps look like.

**Tone**: Engineering peer-to-peer. No marketing. Be specific.

---

## Beat sheet

| Time | Beat | Visual |
|---|---|---|
| 0:00 – 0:30 | Repo tour | VS Code, monorepo |
| 0:30 – 1:00 | Code walkthrough | Two key files, side-by-side |
| 1:00 – 1:45 | Live integration | Terminal — npm install + curl + paid response |
| 1:45 – 2:15 | Architecture | System diagram |
| 2:15 – 2:30 | What's next | Bulleted slide |

---

## Script

### 0:00 – 0:30 — Repo Tour

> *(open VS Code, file tree expanded)*
>
> "Tollgate is a pnpm monorepo. Two npm packages, four apps.
>
> *(point at each as you say it)*
>
> `packages/shared` — protocol types, JWT helpers, Solana utils.
> `packages/middleware` — server-side paywall. One line of code per endpoint.
> `packages/agent` — client-side SDK that auto-pays 402 responses.
> `apps/settlement` — the trusted issuer of access tokens.
> `apps/examples` — five paid APIs that Curio uses.
> `apps/curio` — the demo product, a Perplexity for paid sources.
>
> 64 unit tests across packages. CI runs on every push. License: MIT."

### 0:30 – 1:00 — Code Walkthrough

> *(open `packages/middleware/src/hono.ts` — show how short it is)*
>
> "Here's the entire integration on the server side. It's a Hono middleware factory.
>
> *(highlight the 5 lines)*
>
> ```ts
> app.use('/search', tollgate({
>   endpointId: 'wiki-search-v1',
>   price: 0.001,
>   recipient: process.env.MY_SOLANA_WALLET!,
> }))
> ```
>
> Three lines if you compress it. The middleware checks the Authorization header. Missing or invalid? It returns a 402 with a Tollgate-protocol body."
>
> *(open `packages/agent/src/withTollgate.ts`)*
>
> "On the client, you wrap fetch.
>
> ```ts
> const fetch = withTollgate(globalThis.fetch, { wallet, rpcUrl, maxPricePerCall: 0.01 })
> ```
>
> Now any 402 response triggers: parse the body, create a payment intent at the settlement service, build and sign the USDC transfer, submit it, poll until the access token comes back, retry the original request. All transparent to the calling code."

### 1:00 – 1:45 — Live Integration

> *(terminal: empty Hono project)*
>
> "Watch. I have a fresh Hono server, no auth, public.
>
> *(type)*
>
> ```bash
> $ pnpm add @tollgate/middleware
> ```
>
> *(open the index.ts in editor, add the middleware import + use line)*
>
> "Three lines. Save. Restart server."
>
> *(curl the endpoint without auth)*
>
> ```bash
> $ curl http://localhost:4001/api/search
> ```
>
> *(show the 402 + Tollgate-402 body in JSON)*
>
> "402 Payment Required. The body has a `tollgate` block: protocol version, settlement URL, endpoint id, price, currency, network, and a challenge. Challenge is the Solana Pay reference.
>
> *(switch to a node REPL or a script with @tollgate/agent)*
>
> "Now the client side. I'll use a devnet keypair I funded earlier.
>
> *(run a script that calls the endpoint via withTollgate; tail the logs)*
>
> "Look — agent receives 402. Posts intent to settlement. Builds USDC transaction. Signs. Submits to Solana devnet. Polls /v1/confirm. Receives JWT. Retries with Authorization header. Receives 200.
>
> *(show the on-chain tx on Solana Explorer)*
>
> "There's the tx. 400ms confirmation. $0.001 USDC delivered."

### 1:45 – 2:15 — Architecture

> *(open `docs/ARCHITECTURE.md` and show the system diagram)*
>
> "Two trust boundaries. Settlement is the only signer. Middleware verifies tokens locally using cached JWKS — no settlement round-trip per call. Agent is untrusted by both, but builds and signs its own payments.
>
> Webhook from Helius pushes USDC arrivals to settlement, which independently re-verifies via RPC before issuing tokens. Defense in depth.
>
> Per-call latency? Settlement adds about 400 milliseconds — Solana finality. Once the token is cached, subsequent calls within TTL skip the round-trip entirely."

### 2:15 – 2:30 — What's Next

> *(slide titled "v0.2 Roadmap")*
>
> 1. Signed 402 bodies (so endpoints can't lie about price)
> 2. Streaming subscriptions (pay for time-windows, not single calls)
> 3. Confidential SPL Token integration (private payments via Arcium)
> 4. MoonPay off-ramp for providers
> 5. On-chain endpoint registry (decentralized discovery)
>
> "Then we ship v1.0 as production infra. That's the whole talk. Code is on GitHub. Thank you."
>
> *(end card: github.com/Moc01/tollgate)*

---

## Recording checklist

- [ ] Have terminals + editor pre-arranged in screen layout
- [ ] Pre-fund the demo wallet on devnet
- [ ] Run a full end-to-end dry-run before recording
- [ ] Practice each segment until it fits the time budget
- [ ] Record in 1080p; use a tool that can highlight cursor position
