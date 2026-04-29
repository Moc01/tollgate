import { Keypair } from '@solana/web3.js'
/**
 * End-to-end-ish tests for the settlement routes.
 * Uses InMemoryStore and a freshly generated keypair.
 *
 * Tests cover:
 *  - POST /v1/intent → returns pay_url + intent_id
 *  - POST /v1/confirm before payment → 202
 *  - simulated webhook marks intent paid
 *  - POST /v1/confirm after payment → 200 + valid JWT
 *  - GET /v1/jwks returns valid key
 *  - 404 / 410 / 409 error cases
 */
import {
  USDC_MINT_DEVNET,
  generateTollgateKeyPair,
  verifyAccessTokenWithPem,
} from '@tollgate/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app'
import type { AppConfig } from '../src/lib/config'
import { InMemoryStore } from '../src/lib/store'

// Mock the Solana RPC verification so tests don't hit real RPC.
vi.mock('../src/lib/solana', () => ({
  verifyPayment: vi.fn().mockResolvedValue({ ok: true, slot: 123 }),
}))

let config: AppConfig
let store: InMemoryStore
let app: ReturnType<typeof buildApp>

const RECIPIENT = Keypair.generate().publicKey.toBase58()

beforeEach(async () => {
  const kp = await generateTollgateKeyPair()
  config = {
    baseUrl: 'http://localhost:3001',
    issuer: 'https://tollgate.test',
    jwtPrivateKey: kp.privateKeyPem,
    jwtPublicKey: kp.publicKeyPem,
    jwtKid: 'test-kid',
    heliusWebhookSecret: null,
    heliusRpcUrl: 'https://devnet.fake/',
    network: 'devnet',
    databaseUrl: null,
  }
  store = new InMemoryStore()
  await store.upsertEndpoint({
    id: 'wiki-search-v1',
    owner_id: null,
    name: 'Wiki Search',
    description: null,
    url_pattern: 'https://wiki.test/search*',
    price_usdc: '0.001',
    recipient: RECIPIENT,
    splits: null,
    token_ttl: 300,
    active: true,
  })
  app = buildApp({ config, store })
})

async function postJson(
  app: ReturnType<typeof buildApp>,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return app.fetch(
    new Request(`http://test${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  )
}

describe('GET /v1/jwks', () => {
  it('returns a JWKS document with the active kid', async () => {
    const res = await app.fetch(new Request('http://test/v1/jwks'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { keys: Array<{ kid: string; alg: string }> }
    expect(body.keys).toHaveLength(1)
    expect(body.keys[0]?.kid).toBe('test-kid')
    expect(body.keys[0]?.alg).toBe('EdDSA')
  })
})

describe('POST /v1/intent', () => {
  it('creates an intent for a registered endpoint', async () => {
    const res = await postJson(app, '/v1/intent', {
      endpoint_id: 'wiki-search-v1',
      challenge: Keypair.generate().publicKey.toBase58(),
      agent_pubkey: Keypair.generate().publicKey.toBase58(),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { intent_id: string; pay_url: string; expires_at: string }
    expect(body.intent_id).toMatch(/^int_/)
    expect(body.pay_url).toMatch(/^solana:/)
    expect(body.pay_url).toContain('amount=0.001')
    expect(new Date(body.expires_at).getTime()).toBeGreaterThan(Date.now())
  })

  it('returns 404 for unknown endpoint', async () => {
    const res = await postJson(app, '/v1/intent', {
      endpoint_id: 'does-not-exist',
      challenge: Keypair.generate().publicKey.toBase58(),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 for missing fields', async () => {
    const res = await postJson(app, '/v1/intent', { endpoint_id: 'wiki-search-v1' })
    expect(res.status).toBe(400)
  })

  it('returns existing pending intent for repeat challenge', async () => {
    const challenge = Keypair.generate().publicKey.toBase58()
    const r1 = await postJson(app, '/v1/intent', {
      endpoint_id: 'wiki-search-v1',
      challenge,
    })
    const r2 = await postJson(app, '/v1/intent', {
      endpoint_id: 'wiki-search-v1',
      challenge,
    })
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    const b1 = (await r1.json()) as { intent_id: string }
    const b2 = (await r2.json()) as { intent_id: string }
    expect(b1.intent_id).toBe(b2.intent_id)
  })
})

describe('POST /v1/confirm', () => {
  it('returns 404 for unknown intent', async () => {
    const res = await postJson(app, '/v1/confirm', { intent_id: 'int_nope' })
    expect(res.status).toBe(404)
  })

  it('returns 202 when intent is pending', async () => {
    const ir = await postJson(app, '/v1/intent', {
      endpoint_id: 'wiki-search-v1',
      challenge: Keypair.generate().publicKey.toBase58(),
    })
    const { intent_id } = (await ir.json()) as { intent_id: string }
    const res = await postJson(app, '/v1/confirm', { intent_id })
    expect(res.status).toBe(202)
    const body = (await res.json()) as { status: string; retry_after: number }
    expect(body.status).toBe('pending')
    expect(body.retry_after).toBeGreaterThan(0)
  })

  it('returns 200 with valid JWT after webhook marks intent paid', async () => {
    const challenge = Keypair.generate().publicKey.toBase58()
    const agent = Keypair.generate().publicKey.toBase58()

    const ir = await postJson(app, '/v1/intent', {
      endpoint_id: 'wiki-search-v1',
      challenge,
      agent_pubkey: agent,
    })
    const { intent_id } = (await ir.json()) as { intent_id: string }

    // Simulate webhook for a tx that includes this challenge as an account key
    const webhookBody = [
      {
        signature: '5HfTestSig111',
        transaction: {
          message: {
            accountKeys: [agent, RECIPIENT, challenge, USDC_MINT_DEVNET],
          },
        },
        tokenTransfers: [
          {
            fromUserAccount: agent,
            toUserAccount: RECIPIENT,
            tokenAmount: 0.001,
            mint: USDC_MINT_DEVNET,
          },
        ],
      },
    ]
    const wr = await postJson(app, '/v1/webhook/helius', webhookBody)
    expect(wr.status).toBe(200)

    // Now confirm should return 200 with token
    const cr = await postJson(app, '/v1/confirm', { intent_id })
    expect(cr.status).toBe(200)
    const body = (await cr.json()) as {
      access_token: string
      tx_signature: string
      expires_in: number
    }
    expect(body.access_token).toBeTruthy()
    expect(body.tx_signature).toBe('5HfTestSig111')
    expect(body.expires_in).toBeGreaterThan(0)

    const payload = await verifyAccessTokenWithPem(body.access_token, config.jwtPublicKey, {
      audience: 'wiki-search-v1',
      issuer: config.issuer,
    })
    expect(payload.aud).toBe('wiki-search-v1')
    expect(payload.sub).toBe(agent)
    expect(payload.tg.tx).toBe('5HfTestSig111')
  })
})

describe('POST /v1/endpoints', () => {
  it('upserts a new endpoint', async () => {
    const res = await postJson(app, '/v1/endpoints', {
      id: 'news-v1',
      name: 'News API',
      urlPattern: 'https://news.test/*',
      priceUsdc: '0.002',
      recipient: RECIPIENT,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; id: string }
    expect(body.ok).toBe(true)
    expect(body.id).toBe('news-v1')

    const got = await store.getEndpoint('news-v1')
    expect(got?.price_usdc).toBe('0.002')
  })

  it('rejects splits not summing to 1', async () => {
    const res = await postJson(app, '/v1/endpoints', {
      id: 'bad-splits-v1',
      name: 'Bad Splits',
      urlPattern: 'https://bad.test/*',
      priceUsdc: '0.001',
      splits: [{ wallet: RECIPIENT, share: 0.5 }],
    })
    expect(res.status).toBe(400)
  })

  it('rejects neither recipient nor splits', async () => {
    const res = await postJson(app, '/v1/endpoints', {
      id: 'no-recipient-v1',
      name: 'No Recipient',
      urlPattern: 'https://x.test/*',
      priceUsdc: '0.001',
    })
    expect(res.status).toBe(400)
  })
})
