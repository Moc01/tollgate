import { isValidSolanaAddress } from '@tollgate/shared'
/**
 * POST /v1/endpoints — register or update an endpoint.
 *
 * For the hackathon MVP this is unauthenticated; in production it would
 * require a Privy session cookie. We add a simple bearer-token guard
 * gated on the TOLLGATE_DASHBOARD_API_KEY env var.
 */
import { Hono } from 'hono'
import type { AppContext } from '../app'
import { z } from './_zod'

export const endpointsRouter = new Hono<AppContext>()

const splitSchema = z.object({
  wallet: z.string(),
  share: z.number().min(0).max(1),
})

const upsertSchema = z.object({
  id: z.string().min(1).max(64),
  ownerId: z.string().nullable().optional(),
  name: z.string().min(1).max(120),
  description: z.string().nullable().optional(),
  urlPattern: z.string().min(1),
  priceUsdc: z.union([z.string(), z.number()]).transform((v) => String(v)),
  recipient: z.string().optional(),
  splits: z.array(splitSchema).nullable().optional(),
  tokenTtl: z.number().int().min(30).max(86400).optional(),
  active: z.boolean().optional(),
})

endpointsRouter.post('/endpoints', async (c) => {
  const store = c.get('store')

  const apiKey = process.env.TOLLGATE_DASHBOARD_API_KEY
  if (apiKey) {
    const auth = c.req.header('authorization')
    if (auth !== `Bearer ${apiKey}`) {
      return c.json({ error: 'unauthorized' }, 401)
    }
  }

  const body = await c.req.json().catch(() => null)
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'invalid_request', issues: parsed.error.issues }, 400)
  }

  const data = parsed.data

  // Validate recipient/splits
  let recipient: string
  let splits: { wallet: string; share: number }[] | null = null
  if (data.splits && data.splits.length > 0) {
    const total = data.splits.reduce((acc, s) => acc + s.share, 0)
    if (Math.abs(total - 1) > 1e-9) {
      return c.json({ error: 'splits_not_summing_to_one' }, 400)
    }
    for (const s of data.splits) {
      if (!isValidSolanaAddress(s.wallet)) {
        return c.json({ error: 'invalid_wallet_in_splits', wallet: s.wallet }, 400)
      }
    }
    splits = data.splits
    recipient = data.splits[0]!.wallet
  } else if (data.recipient) {
    if (!isValidSolanaAddress(data.recipient)) {
      return c.json({ error: 'invalid_recipient' }, 400)
    }
    recipient = data.recipient
  } else {
    return c.json({ error: 'recipient_or_splits_required' }, 400)
  }

  await store.upsertEndpoint({
    id: data.id,
    owner_id: data.ownerId ?? null,
    name: data.name,
    description: data.description ?? null,
    url_pattern: data.urlPattern,
    price_usdc: data.priceUsdc,
    recipient,
    splits,
    token_ttl: data.tokenTtl ?? 300,
    active: data.active ?? true,
  })

  return c.json({ ok: true, id: data.id })
})

endpointsRouter.get('/endpoints', async (c) => {
  const store = c.get('store')
  const ownerId = c.req.query('owner_id')
  const list = await store.listEndpoints(ownerId)
  return c.json({ endpoints: list })
})

endpointsRouter.get('/endpoints/:id', async (c) => {
  const store = c.get('store')
  const endpoint = await store.getEndpoint(c.req.param('id'))
  if (!endpoint) return c.json({ error: 'not_found' }, 404)
  return c.json({ endpoint })
})
