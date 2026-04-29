/**
 * POST /v1/webhook/helius — handle USDC arrival notifications.
 *
 * Helius sends one HTTP request per relevant transaction. Each request is
 * an array of enriched transaction objects. For each tx, we:
 *   1. Verify the HMAC (when HELIUS_WEBHOOK_SECRET is configured)
 *   2. Find the matching intent (by reference key in the tx)
 *   3. Independently verify the tx via RPC (defense in depth)
 *   4. Mark the intent as paid + record ledger entries
 *
 * The body shape varies by Helius webhook type. We handle the "Enhanced"
 * format which includes parsed instructions.
 */
import { Hono } from 'hono'
import { fromUsdcUnits, toUsdcUnits } from '@tollgate/shared'
import type { AppContext } from '../app'
import { verifyPayment } from '../lib/solana'

export const webhookRouter = new Hono<AppContext>()

webhookRouter.post('/webhook/helius', async (c) => {
  const config = c.get('config')
  const store = c.get('store')

  const rawBody = await c.req.text()

  // HMAC verification (skipped if no secret configured — DEV ONLY)
  if (config.heliusWebhookSecret) {
    const auth = c.req.header('authorization') ?? c.req.header('Authorization')
    if (!auth) return c.json({ error: 'missing_signature' }, 401)
    const expected = `Bearer ${config.heliusWebhookSecret}`
    // Helius simple-auth uses a static bearer; their HMAC product uses x-signature.
    // Accept either.
    const sigHeader = c.req.header('x-helius-signature')
    if (auth !== expected && !sigHeader) {
      return c.json({ error: 'invalid_signature' }, 401)
    }
    if (sigHeader) {
      const valid = await verifyHmac(rawBody, sigHeader, config.heliusWebhookSecret)
      if (!valid) return c.json({ error: 'invalid_signature' }, 401)
    }
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return c.json({ error: 'invalid_json' }, 400)
  }

  // Normalize: Helius sends an array of tx objects.
  const transactions = Array.isArray(payload) ? payload : [payload]

  const processed: Array<{ signature: string; status: 'paid' | 'unknown' | 'failed'; reason?: string }> = []

  for (const tx of transactions) {
    const txObj = tx as {
      signature?: string
      transaction?: { signatures?: string[] }
      accountData?: Array<unknown>
      tokenTransfers?: Array<{
        fromUserAccount?: string
        toUserAccount?: string
        tokenAmount?: number
        mint?: string
      }>
      events?: unknown
      slot?: number
    }
    const signature = txObj.signature ?? txObj.transaction?.signatures?.[0]
    if (!signature) {
      processed.push({ signature: '?', status: 'unknown', reason: 'no_signature' })
      continue
    }

    // Find intent by reference. Helius "Enhanced" payloads include account
    // keys; reference is one of them. Without enhanced format, we have to
    // pull tokenTransfers and look up the intents whose recipient matches.
    //
    // Strategy: extract all account pubkeys from the tx and check which
    // ones match an active intent challenge. Since challenges are
    // 32-byte pubkey-shaped uuids, this is cheap.
    const accountKeys = collectAccountKeys(txObj)
    let matched: Awaited<ReturnType<typeof store.getIntentByChallenge>> = null
    for (const key of accountKeys) {
      matched = await store.getIntentByChallenge(key)
      if (matched && matched.status === 'pending') break
    }

    if (!matched) {
      processed.push({ signature, status: 'unknown', reason: 'no_matching_intent' })
      continue
    }

    // Independent on-chain verification
    const verify = await verifyPayment({
      rpcUrl: config.heliusRpcUrl,
      network: config.network,
      txSignature: signature,
      expected: {
        referenceKey: matched.challenge,
        recipient: matched.recipient,
        splits: matched.splits,
        priceUsdc: matched.price_usdc,
      },
    })
    if (!verify.ok) {
      processed.push({ signature, status: 'failed', reason: verify.reason })
      continue
    }

    const updated = await store.markIntentPaid(matched.id, signature)
    if (updated) {
      // Record ledger
      if (matched.splits && matched.splits.length > 0) {
        const total = toUsdcUnits(matched.price_usdc)
        const { splitUsdcUnits } = await import('@tollgate/shared')
        const portions = splitUsdcUnits(total, matched.splits)
        for (const p of portions) {
          await store.recordLedgerEntry({
            intentId: matched.id,
            endpointId: matched.endpoint_id,
            recipient: p.wallet,
            amountUsdc: fromUsdcUnits(p.units),
            txSignature: signature,
          })
        }
      } else {
        await store.recordLedgerEntry({
          intentId: matched.id,
          endpointId: matched.endpoint_id,
          recipient: matched.recipient,
          amountUsdc: matched.price_usdc,
          txSignature: signature,
        })
      }
    }
    processed.push({ signature, status: 'paid' })
  }

  return c.json({ processed })
})

function collectAccountKeys(txObj: unknown): string[] {
  const keys: string[] = []
  const obj = txObj as {
    transaction?: { message?: { accountKeys?: Array<string | { pubkey: string }> } }
    accountData?: Array<{ account?: string }>
  }
  const fromMessage = obj?.transaction?.message?.accountKeys ?? []
  for (const k of fromMessage) {
    if (typeof k === 'string') keys.push(k)
    else if (k?.pubkey) keys.push(k.pubkey)
  }
  const fromAccountData = obj?.accountData ?? []
  for (const a of fromAccountData) {
    if (a?.account) keys.push(a.account)
  }
  return keys
}

async function verifyHmac(body: string, signatureHeader: string, secret: string): Promise<boolean> {
  // Helius x-signature is hex(HMAC-SHA256(secret, body))
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return signatureHeader === hex || signatureHeader === `sha256=${hex}`
}
