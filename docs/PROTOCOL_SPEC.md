# Tollgate-402 Protocol Specification

**Version**: 0.1.0
**Status**: Draft
**Last updated**: 2026-04-29

---

## 1. Overview

Tollgate-402 is an HTTP-native payment protocol that uses status code `402 Payment Required` to signal that a paid resource requires a stablecoin payment on Solana before access is granted. It is designed for machine-to-machine ("agent-to-API") commerce.

## 2. Terminology

- **Endpoint**: an HTTP resource that requires payment (e.g., `https://api.example.com/v1/search`)
- **Provider**: the operator of an endpoint
- **Caller**: the entity making the HTTP request (typically an AI agent)
- **Settlement service**: the trusted intermediary that issues access tokens after observing a valid payment
- **Access token**: a short-lived JWT, signed by the settlement service, granting the caller permission to access a specific endpoint
- **Intent**: a server-side record describing a pending payment (price, recipient, expiration)

## 3. Flow

### 3.1 Unauthenticated request

```
Caller → Endpoint:
  GET /v1/search?q=Solana HTTP/1.1
  Host: wikipedia-pro.example.com
```

### 3.2 402 response

If the endpoint is paid and no valid `Authorization: Bearer <jwt>` header is present:

```
Endpoint → Caller:
  HTTP/1.1 402 Payment Required
  Content-Type: application/json
  Cache-Control: no-store

  {
    "tollgate": {
      "version": "0.1",
      "settlement": "https://tollgate.dev/api/settle",
      "endpoint_id": "wiki-search-v1",
      "price": "0.0005",
      "currency": "USDC",
      "network": "solana-mainnet",
      "challenge": "01f1c8c1-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
      "expires_at": "2026-04-29T12:30:00Z"
    },
    "error": "Payment required",
    "doc": "https://tollgate.dev/docs"
  }
```

The `challenge` is a server-generated nonce, used as the Solana Pay `reference` and as the unique key inside the settlement service.

### 3.3 Caller creates payment intent

```
Caller → Settlement:
  POST /v1/intent HTTP/1.1
  Content-Type: application/json

  {
    "endpoint_id": "wiki-search-v1",
    "challenge": "01f1c8c1-...",
    "agent_pubkey": "BDqnQu..." 
  }

Settlement → Caller:
  HTTP/1.1 200 OK
  Content-Type: application/json

  {
    "intent_id": "int_a1b2c3...",
    "pay_url": "solana:BDqnQu...?amount=0.0005&spl-token=EPjFW...&reference=01f1c8c1-...&label=Tollgate&memo=wiki-search-v1",
    "expires_at": "2026-04-29T12:30:00Z"
  }
```

### 3.4 Caller submits payment

The caller constructs a Solana transaction transferring `0.0005 USDC` to `BDqnQu...` (or to multiple recipients per `splits`), with the `reference` public key embedded as a read-only account, and signs+submits it from its own keypair.

### 3.5 Settlement observes payment

A Helius webhook delivers the transaction to the settlement service. Settlement verifies:

- Recipient address(es) and amounts match the intent
- The transaction is confirmed (`finalized` commitment recommended)
- The `reference` matches a known active intent
- The paying wallet matches `agent_pubkey` (when present)

If valid, settlement marks the intent as `paid` and is ready to issue an access token.

### 3.6 Caller redeems intent for token

```
Caller → Settlement:
  POST /v1/confirm HTTP/1.1
  Content-Type: application/json

  {
    "intent_id": "int_a1b2c3..."
  }

Settlement → Caller (if paid):
  HTTP/1.1 200 OK
  Content-Type: application/json

  {
    "access_token": "eyJhbGciOi...",  // JWT
    "token_type": "Bearer",
    "expires_in": 300,
    "tx_signature": "5Hf..."
  }
```

If the payment is not yet confirmed:

```
HTTP/1.1 202 Accepted
{ "status": "pending", "retry_after": 1.0 }
```

### 3.7 Caller retries with token

```
Caller → Endpoint:
  GET /v1/search?q=Solana HTTP/1.1
  Authorization: Bearer eyJhbGciOi...

Endpoint → Caller:
  HTTP/1.1 200 OK
  ...
```

The endpoint's middleware verifies the JWT signature using the cached JWKS, checks that the `aud` (audience) field matches its `endpoint_id`, and that the token has not expired.

## 4. Access Token Format

Tollgate access tokens are JWTs signed with EdDSA (Ed25519). The settlement service publishes its public key at `GET /v1/jwks` in standard [RFC 7517](https://datatracker.ietf.org/doc/html/rfc7517) format.

**Header**:
```json
{ "alg": "EdDSA", "typ": "JWT", "kid": "tg-2026-04" }
```

**Payload**:
```json
{
  "iss": "https://tollgate.dev",
  "sub": "BDqnQu...",                  // agent pubkey
  "aud": "wiki-search-v1",             // endpoint_id
  "iat": 1714400000,
  "exp": 1714400300,                   // 5-minute TTL by default
  "jti": "int_a1b2c3...",              // intent_id, used for replay prevention
  "tg": {
    "v": "0.1",
    "calls_remaining": 1,              // for quota-based tokens (mostly always 1 in v0.1)
    "tx": "5Hf..."                     // confirming Solana tx signature
  }
}
```

## 5. Solana Pay Encoding

Tollgate-402 piggybacks on the [Solana Pay specification](https://docs.solanapay.com/spec). The payment URL in step 3.3 follows that spec exactly:

```
solana:<recipient>?amount=<amount>&spl-token=<USDC_mint>&reference=<challenge>&label=<...>&memo=<endpoint_id>
```

This means any Solana Pay-compatible wallet (Phantom mobile, Solflare, etc.) can act as a paying client. The reference public key is critical: it allows the settlement service to disambiguate which intent the payment belongs to.

For multi-recipient (split) payments, the agent must construct a single transaction with multiple `Transfer` instructions targeting each recipient, all referencing the same `reference` key. The settlement service validates that the sum of amounts and the recipient set match the registered splits.

## 6. Headers (informational)

Tollgate-aware clients SHOULD send a `User-Agent` containing `Tollgate-Agent/<version>`, e.g., `Tollgate-Agent/0.1.0`.

Endpoints MAY reflect Tollgate version compatibility in the response:

```
Tollgate-Version: 0.1
```

## 7. Free Tier and Bypass

An endpoint may grant free access (e.g., to logged-in users, low-volume IPs). Implementations are free to do so before the 402 logic runs; this spec only governs the paid path.

## 8. Errors

When the caller's behavior is wrong, settlement returns standard JSON errors:

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `invalid_intent` | malformed intent body |
| 404 | `intent_not_found` | unknown intent_id |
| 410 | `intent_expired` | intent past `expires_at` |
| 409 | `intent_consumed` | a token was already issued for this intent |
| 422 | `payment_mismatch` | tx amount or recipient does not match intent |
| 429 | `rate_limited` | too many requests; honor `Retry-After` |

## 9. Versioning

The protocol's version appears in the `tollgate.version` field of the 402 body and inside the JWT. Major version bumps may break compatibility; minor bumps are additive.

## 10. Open Issues for v0.2

- **Signed 402 bodies**: today, a malicious endpoint could lie in its 402 body about pricing or recipient. v0.2 will require endpoints to register a public key with settlement and sign 402 bodies. Agents can verify the signature before paying.
- **Streaming subscriptions**: long-lived tokens that grant access for time-bounded sessions instead of single calls.
- **Refunds**: standardized refund flow when an endpoint fails to deliver after a confirmed payment.
- **Cross-currency**: support for non-USDC stablecoins (USDT, EURC, PYUSD) on Solana.
- **L2/L3**: explicit support for Confidential SPL Token (Arcium) for private payments.

## 11. Reference

- [HTTP/1.1 Status Code Definitions, RFC 7231 §6.5.2](https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.2) — defines the meaning of 402
- [Solana Pay Specification](https://docs.solanapay.com/spec)
- [JSON Web Tokens, RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [JSON Web Key Sets, RFC 7517](https://datatracker.ietf.org/doc/html/rfc7517)
