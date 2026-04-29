# Security Threat Model

This is a hackathon-grade security analysis. It is not a substitute for a professional audit before mainnet production deployment.

## Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│ Untrusted Internet                                                  │
│                                                                     │
│  ┌──────────┐                          ┌────────────────┐           │
│  │ AI Agent │ ──── HTTPS ──── ▶        │ Paid API +     │           │
│  └──────────┘                          │ Middleware     │           │
│       │                                └────────────────┘           │
│       │ HTTPS                                  ▲                    │
│       ▼                                        │ verifies JWT       │
│  ┌──────────────────────────────────────┐      │                    │
│  │   Settlement Service (TRUSTED)       │ ─────┘                    │
│  │   - signs JWTs with private Ed25519  │                           │
│  │   - publishes JWKS                   │                           │
│  └──────────────────────────────────────┘                           │
│       │                                                             │
│       │ Webhook (HMAC verified)                                     │
│       ▼                                                             │
│  ┌──────────────────────────────────────┐                           │
│  │   Helius                             │                           │
│  └──────────────────────────────────────┘                           │
│       │                                                             │
│       │ RPC                                                         │
│       ▼                                                             │
│  ┌──────────────────────────────────────┐                           │
│  │   Solana mainnet/devnet              │                           │
│  └──────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Threats

### T1 — Replay attack on access tokens

**Scenario**: an attacker captures a valid JWT and reuses it.

**Mitigation**:
- JWTs have short TTL (default 5 minutes)
- The `jti` claim equals the intent_id. The middleware records consumed `jti`s in a short-lived cache and rejects duplicates within the TTL window.
- For higher-value endpoints, providers can set `quotaCalls: 1` so the token is single-use.

### T2 — Forged 402 response (malicious endpoint)

**Scenario**: a malicious endpoint returns a 402 with a recipient address it doesn't control, then returns 200 OK without paying anything to the legitimate provider.

**Status v0.1**: not fully prevented. Mitigations:
- Agent enforces `maxPricePerCall` budget, so blast radius per call is small.
- Settlement service tracks all intents per endpoint registration; if the recipient in the 402 doesn't match the registered recipient for that `endpoint_id`, settlement refuses to issue intent.

**Status v0.2**: 402 responses will be signed with the endpoint's registered key, and the agent SDK will verify the signature.

### T3 — Settlement service compromise

**Scenario**: an attacker steals the settlement service's signing key and forges access tokens.

**Mitigation**:
- Key stored in Vercel encrypted env vars; rotated on detection
- Key rotation is supported via the `kid` header in JWTs and JWKS containing multiple active keys
- Defense in depth: high-value endpoints (post-MVP) will require on-chain attestation, not just JWT

### T4 — Agent wallet compromise

**Scenario**: the agent's private key is leaked, allowing draining of its USDC balance.

**Mitigation** (agent-side, not protocol):
- Recommend agents hold only a working budget, top up from a cold wallet
- `@tollgate/agent` supports `maxTotalSpend` per session
- Agents using Privy embedded wallets benefit from Privy's MPC-based key management

### T5 — Webhook spoofing

**Scenario**: an attacker sends a fake `webhook/helius` event to mark an intent as paid without an on-chain payment.

**Mitigation**:
- Helius webhooks include a signed HMAC. We verify the HMAC against a shared secret rotated quarterly.
- Webhook handler also re-fetches the transaction from Solana RPC to verify amounts and recipients independently.
- IP allowlist (Helius publishes their egress IPs).

### T6 — Double-spend / race condition

**Scenario**: an agent submits the same Solana tx targeting two different intents simultaneously, hoping to get two access tokens for one payment.

**Mitigation**:
- Each intent embeds a unique `reference` pubkey via Solana Pay. The same tx cannot reference two pubkeys.
- Settlement service enforces a uniqueness constraint on `(tx_signature, intent_id)` in the database.
- Race in the application layer (two intents created in parallel for one challenge) is prevented by `UNIQUE` index on `intents.challenge`.

### T7 — Intent enumeration / exhaustion

**Scenario**: an attacker creates millions of intents to exhaust the database or find collision in `challenge`.

**Mitigation**:
- Rate limit `POST /v1/intent` per IP and per agent_pubkey (10/min default).
- `challenge` is UUIDv4 (122 bits of entropy); collisions are statistically negligible.
- Pending intents older than `expires_at + 1 hour` are garbage-collected.

### T8 — Supply chain (npm package compromise)

**Scenario**: someone compromises `@tollgate/middleware` or `@tollgate/agent` and releases a malicious version.

**Mitigation**:
- Provenance: GitHub Actions builds publish with `npm publish --provenance`.
- 2FA on the npm account.
- Immutable releases tagged in GitHub.

### T9 — Front-running on payment submission

**Scenario**: an observer of the mempool front-runs an agent's payment to drain the price difference, or replays it.

**Mitigation**:
- Solana doesn't have a public mempool in the EVM sense; transactions go directly to the leader.
- The payment is a fixed-amount USDC transfer to a fixed recipient — there is no price slippage to exploit.
- The `reference` ties the payment to a specific intent; replaying the same tx doesn't grant access to a different intent.

### T10 — Phishing the dashboard user

**Scenario**: the dashboard user is tricked into linking a different Solana wallet as recipient, redirecting all revenue.

**Mitigation**:
- Dashboard requires reauthentication for sensitive changes (recipient address, splits).
- Email + in-app notification on any recipient change.
- 24-hour cool-down before new recipients can receive funds (post-MVP).

## Cryptographic Choices

| Use | Algorithm | Notes |
|---|---|---|
| JWT signing | EdDSA (Ed25519) | matches Solana's native curve; fast verify |
| Webhook HMAC | HMAC-SHA256 | standard for Helius |
| Random tokens | crypto.randomUUID() (v4) | 122 bits |
| Hash for deduplication | SHA-256 | standard |

## Audit Items for Post-Hackathon

1. Formal threat modeling session (STRIDE)
2. Pen test of settlement service
3. npm publish workflow review
4. Privy integration review for embedded wallet handling
5. Solana smart contract for on-chain attestation (v0.2)
