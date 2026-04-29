# `@tollgate/shared`

Foundation package for Tollgate. Pure TypeScript with no framework dependencies.

## What's in here

- **Types** (`./types`) — protocol types used everywhere: `Tollgate402Body`, `PaymentIntent`, `AccessTokenPayload`, `RevenueSplit`, etc.
- **JWT helpers** (`./jwt`) — sign + verify Ed25519 JWTs, JWKS publishing
- **Solana helpers** (`./solana`) — USDC mint constants, address validation, decimal conversion
- **DB schema** (`./db`) — Drizzle schema for Postgres
- **Constants** (`./constants`) — protocol version, default TTLs
- **Errors** (`./errors`) — typed error classes

## Usage

```typescript
import {
  TOLLGATE_PROTOCOL_VERSION,
  type Tollgate402Body,
  type AccessTokenPayload,
} from '@tollgate/shared'

import { signAccessToken, verifyAccessToken } from '@tollgate/shared/jwt'
import { isValidSolanaAddress, toUsdcUnits, USDC_MINT_DEVNET } from '@tollgate/shared/solana'
```

## Development

```bash
pnpm build       # bundle to dist/
pnpm test        # run vitest
pnpm typecheck   # tsc --noEmit
```
