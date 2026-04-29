import { Connection, type Keypair } from '@solana/web3.js'
import {
  type AgentConfig,
  BudgetExceededError,
  type ClientPaymentIntent,
  type ConfirmResponse,
  Invalid402BodyError,
  SettlementError,
  type Tollgate402Body,
} from '@tollgate/shared'
import { buildPaymentTransaction, networkFromTollgateBody } from './payment'
import { TokenCache } from './tokenCache'

/** Augment a Fetch-compatible function with Tollgate-402 auto-payment. */
export function withTollgate(innerFetch: typeof fetch, config: AgentConfig): typeof fetch {
  const cache = new TokenCache()
  const totalSpentRef = { value: 0 }
  const maxConfirmPolls = config.maxConfirmPolls ?? 30
  const confirmPollDelayMs = config.confirmPollDelayMs ?? 500

  const wrapped: typeof fetch = async (input, init) => {
    const url = requestUrl(input)
    const cachedToken = cache.get(url) // first attempt: try url-based key (we also try endpoint-id-based after)

    // Optimistic call (with cached token if any)
    let response = await innerFetch(input, withAuth(init, cachedToken))

    if (response.status !== 402) return response

    // Parse 402 body
    const body = (await response
      .clone()
      .json()
      .catch(() => null)) as Tollgate402Body | null
    if (!body || !body.tollgate || !body.tollgate.endpoint_id) {
      throw new Invalid402BodyError('Response was 402 but body missing tollgate field')
    }

    // Try endpoint-id-keyed cache before paying
    const cachedByEndpoint = cache.get(body.tollgate.endpoint_id)
    if (cachedByEndpoint) {
      response = await innerFetch(input, withAuth(init, cachedByEndpoint))
      if (response.status !== 402) return response
    }

    // Budget guard
    const price = Number(body.tollgate.price)
    if (Number.isNaN(price) || price < 0) {
      throw new Invalid402BodyError(`Invalid price in 402 body: ${body.tollgate.price}`)
    }
    if (config.maxPricePerCall != null && price > config.maxPricePerCall) {
      throw new BudgetExceededError(price, config.maxPricePerCall)
    }
    if (config.maxTotalSpend != null && totalSpentRef.value + price > config.maxTotalSpend) {
      throw new BudgetExceededError(
        price,
        config.maxTotalSpend - totalSpentRef.value,
        `Session spend ${totalSpentRef.value} + this call ${price} would exceed limit ${config.maxTotalSpend}`,
      )
    }

    // optional pre-payment hook (can throw to abort)
    const startMs = Date.now()
    if (config.onBeforePayment) {
      // We don't have intent yet; pass minimal info now
      await config.onBeforePayment({
        intent_id: '',
        pay_url: '',
        expires_at: body.tollgate.expires_at,
      })
    }

    // 1. Create intent
    const intent = await createIntent(body, config.wallet.publicKey)

    // 2. Build, sign, submit Solana payment
    const network = networkFromTollgateBody(body)
    const connection = new Connection(config.rpcUrl, 'confirmed')

    const keypair = (config.wallet as { keypair?: Keypair }).keypair
    if (!keypair) {
      throw new Error(
        'AgentConfig.wallet must include a keypair (e.g. via keypairWallet()). ' +
          'External signers are planned for v0.2.',
      )
    }

    const tx = await buildPaymentTransaction({
      connection,
      payer: keypair,
      recipient: addressFromPayUrl(intent.pay_url),
      splits: body.tollgate.splits ?? null,
      amountUsdc: body.tollgate.price,
      reference: body.tollgate.challenge,
      network,
    })

    // Sign + send
    tx.sign(keypair)
    const txSignature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    })

    // 3. Poll settlement until paid
    const token = await pollConfirm({
      settlementUrl: body.tollgate.settlement,
      intentId: intent.intent_id,
      maxPolls: maxConfirmPolls,
      delayMs: confirmPollDelayMs,
    })

    cache.set(body.tollgate.endpoint_id, token.access_token)
    totalSpentRef.value += price

    if (config.onPayment) {
      await config.onPayment({
        intentId: intent.intent_id,
        endpointId: body.tollgate.endpoint_id,
        priceUsdc: body.tollgate.price,
        txSignature,
        durationMs: Date.now() - startMs,
      })
    }

    // 4. Retry original request with Authorization
    return innerFetch(input, withAuth(init, token.access_token))
  }

  return wrapped
}

// ---------------- helpers ----------------

function withAuth(init: RequestInit | undefined, token: string | undefined): RequestInit {
  if (!token) return init ?? {}
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  return { ...(init ?? {}), headers }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function addressFromPayUrl(payUrl: string): string {
  // solana:<recipient>?...
  const match = payUrl.match(/^solana:([1-9A-HJ-NP-Za-km-z]{32,44})/)
  if (!match) throw new Error(`Invalid Solana Pay URL: ${payUrl}`)
  return match[1]!
}

async function createIntent(
  body: Tollgate402Body,
  agentPubkey: string,
): Promise<ClientPaymentIntent> {
  const url = `${body.tollgate.settlement.replace(/\/$/, '')}/v1/intent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      endpoint_id: body.tollgate.endpoint_id,
      challenge: body.tollgate.challenge,
      agent_pubkey: agentPubkey,
    }),
  })
  if (!res.ok) {
    throw new SettlementError(res.status, `intent creation failed: ${await res.text()}`)
  }
  return (await res.json()) as ClientPaymentIntent
}

async function pollConfirm(args: {
  settlementUrl: string
  intentId: string
  maxPolls: number
  delayMs: number
}): Promise<ConfirmResponse> {
  const url = `${args.settlementUrl.replace(/\/$/, '')}/v1/confirm`
  for (let i = 0; i < args.maxPolls; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent_id: args.intentId }),
    })
    if (res.status === 200) {
      return (await res.json()) as ConfirmResponse
    }
    if (res.status === 202) {
      const j = (await res.json()) as { retry_after?: number }
      const sleep = (j.retry_after ?? args.delayMs / 1000) * 1000
      await new Promise((r) => setTimeout(r, sleep))
      continue
    }
    throw new SettlementError(res.status, `confirm failed: ${await res.text()}`)
  }
  throw new SettlementError(408, `Timed out after ${args.maxPolls} polls`)
}
