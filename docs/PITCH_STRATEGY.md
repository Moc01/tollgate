# Pitch Strategy

How we win the Frontier Hackathon.

## Judges

The judging panel includes ecosystem leaders. Confirmed names from Frontier promo:

- Anatoly Yakovenko (Solana cofounder)
- Lily Liu (Solana Foundation president)
- Phantom team
- Arcium team
- Metaplex team
- Superteam regional leads

Implications:
- They are technical founders. They want to see *engineering depth* and *real distribution intent*, not consumer flash.
- They have all built infra. Tollgate's "404 pages of HTTP got fixed" framing resonates.
- They will spend 30–60 seconds on the pitch video before deciding whether to dig deeper.

## The 30-Second Hook

Open the pitch video with this sequence:

```
[0:00] Show a terminal:
       $ npm install @tollgate/middleware
       $ # one line of code added to a Next.js API
       $ git push

[0:08] Cut to a Claude tool-use trace:
       Agent: Searching paid sources...
              ✓ NewsAPI       paid $0.002 USDC
              ✓ ArXiv         paid $0.003 USDC  
              ✓ Wikipedia     paid $0.0005 USDC
              ✓ Solana Docs   paid $0.0005 USDC

[0:18] Final answer with cost breakdown,
       a Solana Explorer link, an actual on-chain tx visible.

[0:25] Cut to founder face:
       "We just made HTTP 402 work, on Solana, for AI agents.
        It took 30 lines of code per side. Here's why this is
        the next billion-dollar API economy."

[0:30] Logo: Tollgate
```

The hook hits the judges' prior knowledge: HTTP 402 is the "joke" status code that every dev knows exists but never uses. Solving it is *funny and inevitable*. Solana is the obvious chain because of fees.

## The 3-Minute Pitch Video

Beat sheet:

| Time | Beat | Visual |
|---|---|---|
| 0:00 – 0:30 | The 30-second hook (above) | Terminal → trace → answer |
| 0:30 – 1:00 | The problem: AI agents can't pay APIs | Whiteboard-style explainer |
| 1:00 – 1:45 | The solution: live Curio demo | Screen recording, clean & smooth |
| 1:45 – 2:15 | Why Solana (5 properties slide) | Animated slide |
| 2:15 – 2:45 | Business model + early traction | Charts: real calls happening |
| 2:45 – 3:00 | The ask + team + close | Founder face |

## Common Mistakes to Avoid

Past Colosseum critique (per [the workshop blog post](https://blog.colosseum.com/perfecting-your-hackathon-submission/)):

- ❌ Exceeding 3 minutes
- ❌ Buzzwords ("revolutionary blockchain AI") instead of specifics
- ❌ Vague descriptions
- ❌ No team slide
- ❌ Forgetting to grant judges access to the GitHub repo / Loom

We pre-emptively counter each:
- Strict 3:00 timer
- Numbers everywhere ($0.001, 400ms, 5 sources, etc.)
- Concrete code visible in the first 10 seconds
- 30-second team slide near the end
- Repo is public; videos are unlisted YouTube + public Loom

## Differentiators to Hammer

These are the exact lines we want a judge to repeat back to their colleague:

1. *"They built Stripe for AI agents."*
2. *"One line of code. That's the whole integration."*
3. *"Programmable splits — multiple maintainers can monetize one API atomically."*
4. *"Native HTTP. Not a new protocol layer."*
5. *"They shipped the demo as a real product. Curio is on the App Store, basically."*

## Differentiation from Past Winners

| Past winner | Their angle | Our angle |
|---|---|---|
| Latinum (Breakout AI 1st) | MCP-specific payment middleware | Universal HTTP, AI tool wrappers, splits, dashboard |
| MCPay (Cypherpunk Stablecoin) | MCP-specific payment infrastructure | Same as above |
| Vanish (Breakout DeFi 1st) | Privacy on Solana | Different category; complementary |

We do not need to attack these. We position as: *"Specialization is fine; we did the universal layer because every API will eventually need it, not just MCP."*

## Technical Demo Video (2-3 min)

Different from the pitch. The technical demo answers: *how is this built?*

Structure:

| Time | Content |
|---|---|
| 0:00 – 0:30 | Repo tour: monorepo layout, packages, apps, examples |
| 0:30 – 1:00 | Code walkthrough: middleware (10 lines that matter), agent (the 402 → pay → retry loop) |
| 1:00 – 1:45 | Live integration: open a fresh Hono server, npm install, add middleware, deploy, agent calls it |
| 1:45 – 2:30 | Architecture explanation with the system diagram, focusing on JWT-based off-chain verification |
| 2:30 – 3:00 | What's next: signed 402 bodies, Confidential SPL Token, MoonPay off-ramp |

## The Founder Story

We don't have a founder-market story (the user is a Web2 dev with no creator background). So we don't try to fake one. Instead:

> *"I'm a Web2 dev. The first time I tried to give an AI agent an OpenAI API key and let it act on my behalf, I realized something was deeply wrong: my agent's spending limit was my limit. There was no way for it to discover and use new APIs without me holding its hand. I looked at HTTP 402, looked at Solana, and the answer was obvious."*

This is honest, technical, and exactly the kind of story that resonates with builder judges.

## Build-in-Public Plan

11 daily tweets, posted from `@tollgate_dev` or the user's existing handle.

Template:

```
Day N/11 of building Tollgate at #SolanaFrontier.

Today: <one line of progress>

[gif or screenshot]

GitHub → github.com/Moc01/tollgate
```

Goals:
- 100+ followers by submission
- 1 ecosystem retweet (target: Anatoly, anyone from Helius, Phantom, Privy)
- Demonstrate momentum to the accelerator review

## Side-Track Submissions

After main submission, immediately submit to applicable Superteam Earn side tracks:

- Privy bounty (if exists)
- Helius bounty
- Phantom integration
- Geographic side tracks (whichever the user qualifies for)
- Public goods award (Tollgate is open-source MIT — qualifies)

Each side-track is $1K–$10K. Stacking is realistic.

## What We Will NOT Say

- "Disrupt traditional payments" — meaningless
- "Web3 native" — every project says this
- "10× better than [X]" — let the judges conclude
- "AI revolution" — buzzword
- Any reference to memecoins, JEET, etc.

## Closing the Loop

After winning (or not), keep building. Tollgate is real infrastructure — even if we don't win, the npm packages can launch. The accelerator interview will ask, *"will you do this full-time?"* The answer must be yes, and the proof is shipping post-hackathon iterations.
