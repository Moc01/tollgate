# Setup Guide

How to get Tollgate running locally and deployed.

## Prerequisites

- Node.js 20.10+ ([download](https://nodejs.org/))
- pnpm 9+ (`npm install -g pnpm`)
- Solana CLI ([install](https://docs.solana.com/cli/install-solana-cli-tools))
- Git

## 1. Clone

```bash
git clone git@github.com:Moc01/tollgate.git
cd tollgate
```

## 2. Install Dependencies

```bash
pnpm install
```

This installs all packages and apps in the monorepo.

## 3. API Keys & Environment

Copy the example env file:

```bash
cp .env.example .env.local
```

Fill in the following keys:

| Variable | Source | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Curio's AI agent |
| `PRIVY_APP_ID` | dashboard.privy.io | Embedded wallet auth |
| `PRIVY_APP_SECRET` | dashboard.privy.io | Server-side Privy ops |
| `HELIUS_API_KEY` | dev.helius.xyz | Solana RPC + webhooks |
| `HELIUS_WEBHOOK_SECRET` | dev.helius.xyz (after creating webhook) | Webhook HMAC verification |
| `SUPABASE_URL` | supabase.com (project settings) | Database |
| `SUPABASE_SERVICE_ROLE_KEY` | supabase.com (project settings → API) | Settlement service writes |
| `SUPABASE_ANON_KEY` | supabase.com (project settings → API) | Public reads |
| `TOLLGATE_JWT_PRIVATE_KEY` | generate via `pnpm tg:keygen` | Settlement service signing |
| `TOLLGATE_JWT_PUBLIC_KEY` | generated alongside private | JWKS publishing |
| `SOLANA_NETWORK` | `devnet` | or `mainnet-beta` for production |
| `USDC_MINT_ADDRESS` | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (devnet) | for testing |

For mainnet, USDC mint is `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.

## 4. Generate JWT Keys

```bash
pnpm tg:keygen
```

This writes a public/private Ed25519 keypair into `.env.local` (only run once).

## 5. Set Up Solana Devnet Wallet

```bash
solana-keygen new --outfile ~/.config/solana/devnet.json
solana config set --url devnet --keypair ~/.config/solana/devnet.json
solana airdrop 2  # gets 2 SOL for testing
```

To receive devnet USDC for testing:

```bash
pnpm tg:airdrop-usdc
```

This script (in `scripts/`) calls a public devnet USDC faucet to credit your wallet.

## 6. Set Up Database

Create a Supabase project at supabase.com.

```bash
pnpm db:generate     # creates migration files from schema
pnpm db:migrate      # applies them to Supabase
pnpm db:seed         # optional: insert sample data
```

## 7. Set Up Helius Webhook

After deploying `apps/settlement`:

1. Go to dev.helius.xyz → Webhooks → Create
2. URL: `https://<your-settlement-deployment>.vercel.app/api/v1/webhook/helius`
3. Token to track: USDC mint
4. Account addresses: leave blank (we'll register endpoints' recipients dynamically via Helius API)
5. Copy the secret into `.env.local` as `HELIUS_WEBHOOK_SECRET`

For local development with webhooks: use [ngrok](https://ngrok.com) or [Cloudflared Tunnel](https://www.cloudflare.com/products/tunnel/) to expose `localhost:3001`.

## 8. Run Locally

In separate terminals:

```bash
# Terminal 1: settlement service
pnpm --filter settlement dev          # localhost:3001

# Terminal 2: dashboard
pnpm --filter dashboard dev           # localhost:3000

# Terminal 3: curio demo app
pnpm --filter curio dev               # localhost:3002

# Terminal 4: example paid APIs
pnpm --filter "examples/*" dev:all    # localhost:4001-4005
```

Or run everything at once:

```bash
pnpm dev
```

## 9. End-to-End Test

```bash
pnpm tg:e2e
```

This runs a full E2E:
1. Starts a paid example API
2. Spins up an agent with a fresh devnet wallet
3. Calls the API
4. Verifies 402 → payment → token → 200 response

## 10. Deploy

```bash
# Settlement
pnpm --filter settlement deploy

# Dashboard
pnpm --filter dashboard deploy

# Curio
pnpm --filter curio deploy

# Examples
pnpm --filter "examples/*" deploy
```

Each command runs `vercel --prod` after a typecheck and build.

## Troubleshooting

### `pnpm install` fails with native build errors

On Windows, install the [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and re-run.

### `solana airdrop` fails

Devnet has rate limits. Wait 30 seconds and retry, or use the [Solana Faucet UI](https://faucet.solana.com/).

### Helius webhook never fires

Most common cause: the recipient account isn't being tracked. Check the webhook config in dev.helius.xyz.

### JWT signature verification fails

Probably JWKS cache. Restart the middleware app or wait 60 seconds.

### Privy login fails

Verify `PRIVY_APP_ID` matches the project ID in dashboard.privy.io. Check the allowed origins on Privy include your dev URL.

## Updating

```bash
git pull
pnpm install
pnpm db:migrate
pnpm dev
```
