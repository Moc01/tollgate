# Pitch Video Script (3:00)

This is the script for the **pitch video** submitted to Colosseum. It is the
single most important deliverable. Judges screen the first 30 seconds before
deciding whether to dig deeper.

**Tools**: Loom or Descript. 1080p. Founder face on the right, screen demo on the left.

**Tone**: Confident, technical, dry-humored. Not salesy.

---

## Beat sheet

| Time | Beat | Visual |
|---|---|---|
| 0:00 – 0:30 | Hook (the joke) | Terminal + tool trace + answer |
| 0:30 – 1:00 | The problem | Whiteboard-style explainer |
| 1:00 – 1:45 | The product (live Curio) | Screen recording, narrated |
| 1:45 – 2:15 | Why Solana | Animated slide |
| 2:15 – 2:45 | Business + traction | Charts + numbers |
| 2:45 – 3:00 | Ask + close | Founder face full-screen |

---

## Script

### 0:00 – 0:30 — The Hook

> *(visual: terminal cursor blinking)*
>
> *(type, deliberately)*
>
> ```
> $ npm install @tollgate/middleware
> $ # one line of code
> $ git push
> ```
>
> *(cut to a Claude tool-use trace, fast cuts)*
>
> ```
> Agent: Searching paid sources...
>   ✓ NewsAPI       paid $0.002 USDC
>   ✓ ArXiv         paid $0.003 USDC
>   ✓ Wikipedia     paid $0.0005 USDC
>   ✓ Solana Docs   paid $0.0005 USDC
> ```
>
> *(cut to final answer with citations + cost breakdown + on-chain Explorer link visible)*
>
> *(cut to founder face, calm, looks at camera)*
>
> "We just made HTTP 402 work. On Solana. For AI agents.
> 30 lines of code per side.
> Welcome to the next billion-dollar API economy."
>
> *(logo: Tollgate)*

### 0:30 – 1:00 — The Problem

> *(slide: simple whiteboard graphic — "AI agent" on left, "API" on right, broken arrow between them)*
>
> "Stripe was built for humans. AI agents have no SSN, no credit card, no Plaid account."
>
> *(animation: each item gets crossed out)*
>
> "Today, every agent shares its human owner's API key. That breaks every interesting agent design.
>
> An agent can't discover a *new* paid API on the fly.
> A platform can't bill back per-agent consumption.
> And nobody can settle a $0.001 microtransaction through Visa."
>
> *(visual: a $0.001 payment + "Stripe declined: under minimum" stamp)*
>
> "The agentic web needs a different payment substrate."

### 1:00 – 1:45 — Live Curio Demo

> *(open Curio in browser)*
>
> "Meet Curio. Ask anything. Watch your AI pay per source — in real time."
>
> *(type the prompt)*
>
> > "What's the latest research on Solana's Firedancer upgrade?"
>
> *(hit Enter; tool list animates as each call lands)*
>
> "Claude picked four sources. Each one is a paid API. Watch the dots."
>
> *(point at the UI as it ticks)*
>
> "$0.002 to NewsAPI. $0.003 to ArXiv. $0.0005 to Wikipedia. $0.0005 to Solana Docs.
>
> Each payment is a stablecoin transfer on Solana — sub-second, sub-cent.
>
> *(answer streams in)*
>
> "Now Claude synthesizes the answer with citations. And here's the receipt —
>
> *(scroll to cost breakdown)*
>
> "$0.0085 total. Click any line, you go straight to Solana Explorer. Auditable. On-chain. Stripe simply cannot do this."

### 1:45 – 2:15 — Why Solana

> *(animated slide titled "Why this only works on Solana", 5 rows)*
>
> "We need five things at the same time:"
>
> *(each row appears with a checkmark)*
>
> 1. Sub-cent fees — so the call doesn't cost more than what you're buying
> 2. Sub-second finality — so an agent making 100 calls doesn't block forever
> 3. No KYC — agents don't have identities
> 4. Native USDC — for budget predictability
> 5. Programmable splits — for multi-contributor APIs
>
> "Ethereum L2s give you one or two. Lightning gives you sub-cent but no stablecoin. Stripe gives you none of these.
>
> Solana is the only chain where all five hold today."

### 2:15 – 2:45 — Business + Traction

> *(visual: a line chart, with caveats — fake traction is forbidden, we use what we have)*
>
> "Tollgate is open-source MIT. Two npm packages — middleware and agent — and a settlement service. We launched the protocol with this hackathon.
>
> The platform takes 5–10 percent of every call settled. The agentic API economy is projected at $50 billion by 2027.
>
> Cypherpunk's MCPay won by serving MCP. Latinum won by serving payment middleware. Tollgate is the universal layer underneath both — every paid HTTP API, every agent SDK.
>
> If we're right, every paid endpoint on the open web ends up with a 402 layer."

### 2:45 – 3:00 — Ask + Close

> *(founder full screen)*
>
> "I'm Moc01. I built this in 11 days because I needed it. I plan to ship it as production infrastructure within 90 days. The accelerator is the way I get there.
>
> Tollgate. The vending machine for AI agents.
> Code is on GitHub. Try Curio at the link. Thanks."
>
> *(end card: tollgate.dev · github.com/Moc01/tollgate)*

---

## Recording checklist

- [ ] Test mic levels; speak ~10% slower than feels natural
- [ ] Pre-warm Vercel deployments 5 min before recording (cold-start kills)
- [ ] Use Loom's "Cam + Screen" mode at 1080p
- [ ] Stay strictly under 3:00 (Colosseum auto-rejects longer)
- [ ] Re-record the hook section as many times as needed; it's 50% of the eval
- [ ] Upload as **unlisted** YouTube and **public** Loom (judges have both)
- [ ] Add captions (Descript auto-generates)
- [ ] Final review with stopwatch
