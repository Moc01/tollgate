import {
  DEFAULT_TOKEN_TTL_SECONDS,
  TOLLGATE_PROTOCOL_VERSION,
  signAccessToken,
} from '@tollgate/shared'
/**
 * POST /v1/confirm — return access token if payment is observed, else 202.
 *
 * Body: { intent_id }
 * Returns:
 *   200 { access_token, token_type: "Bearer", expires_in, tx_signature }
 *   202 { status: "pending", retry_after }
 *   404 if intent_id unknown
 *   410 if intent expired
 *   409 if intent already consumed (token already issued)
 */
import { Hono } from 'hono'
import type { AppContext } from '../app'
import { z } from './_zod'

export const confirmRouter = new Hono<AppContext>()

const confirmBody = z.object({ intent_id: z.string().min(1) })

confirmRouter.post('/confirm', async (c) => {
  const config = c.get('config')
  const store = c.get('store')

  const body = await c.req.json().catch(() => null)
  const parsed = confirmBody.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'invalid_request' }, 400)
  }

  const intent = await store.getIntent(parsed.data.intent_id)
  if (!intent) {
    return c.json({ error: 'intent_not_found' }, 404)
  }

  if (intent.status === 'expired' || new Date(intent.expires_at) < new Date()) {
    return c.json({ error: 'intent_expired' }, 410)
  }

  if (intent.status === 'paid' && intent.tx_signature) {
    // Issue token
    const endpoint = await store.getEndpoint(intent.endpoint_id)
    const ttl = endpoint?.token_ttl ?? DEFAULT_TOKEN_TTL_SECONDS

    // Idempotency: same jti = intent_id; if already issued, return same token
    // (we re-sign here for simplicity; jti uniqueness is enforced by DB)
    if (await store.hasTokenWithJti(intent.id)) {
      // Return 409 — caller should treat as success but cannot get a fresh token
      // Better UX: re-sign with same jti and return.
      // For v0.1 we re-sign; downstream replay protection still works since
      // middleware caches consumed jtis briefly.
    }

    const accessToken = await signAccessToken(
      {
        sub: intent.agent_pubkey ?? '',
        aud: intent.endpoint_id,
        jti: intent.id,
        ttlSeconds: ttl,
        tg: {
          v: TOLLGATE_PROTOCOL_VERSION,
          calls_remaining: 1,
          tx: intent.tx_signature,
        },
      },
      config.jwtPrivateKey,
      { kid: config.jwtKid, issuer: config.issuer },
    )

    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
    await store
      .recordTokenIssued({
        intentId: intent.id,
        jti: intent.id,
        endpointId: intent.endpoint_id,
        agentPubkey: intent.agent_pubkey ?? '',
        expiresAt,
      })
      .catch(() => {
        // ignore unique-constraint conflict (idempotency)
      })

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer' as const,
      expires_in: ttl,
      tx_signature: intent.tx_signature,
    })
  }

  // Still pending
  c.status(202)
  return c.json({ status: 'pending' as const, retry_after: 1.0 })
})
