/**
 * POST /v1/intent — create a payment intent.
 *
 * Body: { endpoint_id, challenge, agent_pubkey }
 * Returns: { intent_id, pay_url, expires_at }
 *
 * The challenge in the request must match a 402 the caller received.
 * We snapshot the price/recipient/splits from the registered endpoint at
 * intent creation time so providers can change pricing without affecting
 * in-flight intents.
 */
import { Hono } from 'hono'
import { type AppContext } from '../app'
import {
  DEFAULT_INTENT_TTL_SECONDS,
  buildSolanaPayUrl,
  getUsdcMint,
  isValidSolanaAddress,
  splitUsdcUnits,
  toUsdcUnits,
} from '@tollgate/shared'
import { z } from './_zod'

export const intentRouter = new Hono<AppContext>()

const intentBodySchema = z.object({
  endpoint_id: z.string().min(1),
  challenge: z.string().min(1),
  agent_pubkey: z.string().optional(),
})

intentRouter.post('/intent', async (c) => {
  const config = c.get('config')
  const store = c.get('store')

  const body = await c.req.json().catch(() => null)
  const parsed = intentBodySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'invalid_intent', issues: parsed.error.issues }, 400)
  }

  const { endpoint_id, challenge, agent_pubkey } = parsed.data

  // Look up the registered endpoint (snapshot price/recipient/splits)
  const endpoint = await store.getEndpoint(endpoint_id)
  if (!endpoint || !endpoint.active) {
    return c.json({ error: 'endpoint_not_found' }, 404)
  }

  if (agent_pubkey && !isValidSolanaAddress(agent_pubkey)) {
    return c.json({ error: 'invalid_agent_pubkey' }, 400)
  }

  // Reject duplicate challenge (same challenge, different intent attempt).
  const existing = await store.getIntentByChallenge(challenge)
  if (existing) {
    if (existing.status === 'paid') {
      return c.json({ error: 'intent_consumed' }, 409)
    }
    // Return existing pending intent
    return c.json({
      intent_id: existing.id,
      pay_url: buildPayUrl(endpoint, challenge),
      expires_at: existing.expires_at,
    })
  }

  const id = `int_${randomId()}`
  const expiresAt = new Date(Date.now() + DEFAULT_INTENT_TTL_SECONDS * 1000).toISOString()

  await store.createIntent({
    id,
    endpoint_id: endpoint.id,
    challenge,
    agent_pubkey: agent_pubkey ?? null,
    price_usdc: endpoint.price_usdc,
    recipient: endpoint.recipient,
    splits: endpoint.splits,
    status: 'pending',
    tx_signature: null,
    paid_at: null,
    expires_at: expiresAt,
  })

  return c.json({
    intent_id: id,
    pay_url: buildPayUrl(endpoint, challenge),
    expires_at: expiresAt,
  })
})

function buildPayUrl(
  endpoint: { recipient: string; splits: { wallet: string; share: number }[] | null; price_usdc: string },
  challenge: string,
): string {
  // For multi-recipient, Solana Pay supports only one recipient in the URL.
  // We use the first split as the URL recipient (the actual transaction
  // contains all transfers; agents should construct the multi-leg tx based
  // on the splits they received in the 402 body).
  const recipient = endpoint.splits && endpoint.splits.length > 0
    ? endpoint.splits[0]!.wallet
    : endpoint.recipient

  const totalUnits = toUsdcUnits(endpoint.price_usdc)
  const amountInUsdc = endpoint.price_usdc
  void splitUsdcUnits // ensure imported for typing
  void totalUnits

  return buildSolanaPayUrl({
    recipient,
    amount: amountInUsdc,
    splToken: getUsdcMint('devnet'), // TODO: pull from app config; mainnet vs devnet
    reference: challenge,
    label: 'Tollgate',
  })
}

function randomId(): string {
  // 16 random bytes → base36
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36)).join('').slice(0, 18)
}
