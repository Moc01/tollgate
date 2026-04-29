import {
  generateTollgateKeyPair,
  signAccessToken,
  USDC_MINT_DEVNET,
} from '@tollgate/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { evaluateRequest, extractBearer, resolveConfig } from '../src/core'

const TEST_RECIPIENT = USDC_MINT_DEVNET // any valid pubkey works for tests

describe('extractBearer', () => {
  it('extracts the bearer token', () => {
    expect(extractBearer('Bearer abc.def.ghi')).toBe('abc.def.ghi')
    expect(extractBearer('bearer abc.def.ghi')).toBe('abc.def.ghi')
    expect(extractBearer('Bearer  abc.def.ghi  ')).toBe('abc.def.ghi')
  })

  it('returns null for invalid input', () => {
    expect(extractBearer(undefined)).toBe(null)
    expect(extractBearer('')).toBe(null)
    expect(extractBearer('Token abc')).toBe(null)
    expect(extractBearer(null)).toBe(null)
  })
})

describe('resolveConfig validation', () => {
  it('accepts a recipient-only config', () => {
    const cfg = resolveConfig({
      endpointId: 'e1',
      price: 0.001,
      recipient: TEST_RECIPIENT,
    })
    expect(cfg.endpointId).toBe('e1')
    expect(cfg.recipient).toBe(TEST_RECIPIENT)
    expect(cfg.splits).toBeNull()
  })

  it('accepts a splits-only config', () => {
    const cfg = resolveConfig({
      endpointId: 'e1',
      price: 0.001,
      splits: [
        { wallet: TEST_RECIPIENT, share: 0.7 },
        { wallet: TEST_RECIPIENT, share: 0.3 },
      ],
    })
    expect(cfg.splits).toHaveLength(2)
  })

  it('rejects both recipient and splits', () => {
    expect(() =>
      resolveConfig({
        endpointId: 'e1',
        price: 0.001,
        recipient: TEST_RECIPIENT,
        splits: [{ wallet: TEST_RECIPIENT, share: 1 }],
      }),
    ).toThrow(/either/i)
  })

  it('rejects splits that do not sum to 1', () => {
    expect(() =>
      resolveConfig({
        endpointId: 'e1',
        price: 0.001,
        splits: [{ wallet: TEST_RECIPIENT, share: 0.5 }],
      }),
    ).toThrow(/sum to 1/)
  })

  it('rejects invalid recipient', () => {
    expect(() =>
      resolveConfig({
        endpointId: 'e1',
        price: 0.001,
        recipient: 'not-a-real-address',
      }),
    ).toThrow(/Invalid recipient/)
  })

  it('rejects non-positive price', () => {
    expect(() =>
      resolveConfig({
        endpointId: 'e1',
        price: 0,
        recipient: TEST_RECIPIENT,
      }),
    ).toThrow(/positive/)
  })
})

describe('evaluateRequest', () => {
  const config = resolveConfig({
    endpointId: 'wiki-search-v1',
    price: 0.001,
    recipient: TEST_RECIPIENT,
    settlementUrl: 'https://tollgate.test/api/settle',
  })

  it('returns 402 when no auth header', async () => {
    const result = await evaluateRequest({}, config)
    expect(result.allow).toBe(false)
    if (result.allow) return
    expect(result.status).toBe(402)
    if (result.status !== 402) return
    expect(result.body.tollgate.endpoint_id).toBe('wiki-search-v1')
    expect(result.body.tollgate.price).toBe('0.001')
    expect(result.body.tollgate.currency).toBe('USDC')
    expect(result.body.tollgate.network).toBe('solana-devnet')
    expect(result.body.tollgate.challenge).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
    expect(result.headers['content-type']).toBe('application/json')
  })

  it('returns 402 when auth header is malformed', async () => {
    const result = await evaluateRequest({ authHeader: 'Token foo' }, config)
    expect(result.allow).toBe(false)
    if (result.allow) return
    expect(result.status).toBe(402)
  })

  it('returns 401 for token with no kid', async () => {
    const { privateKeyPem } = await generateTollgateKeyPair()
    const token = await signAccessToken(
      {
        sub: TEST_RECIPIENT,
        aud: 'wiki-search-v1',
        jti: 'int_test_001',
        ttlSeconds: 60,
        tg: { v: '0.1', calls_remaining: 1, tx: '' },
      },
      privateKeyPem,
      // no kid passed
    )
    const result = await evaluateRequest({ authHeader: `Bearer ${token}` }, config)
    expect(result.allow).toBe(false)
    if (result.allow) return
    expect(result.status).toBe(401)
  })

  it('returns 401 when JWKS fetch fails (network)', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    }) as typeof globalThis.fetch

    try {
      const { privateKeyPem } = await generateTollgateKeyPair()
      const token = await signAccessToken(
        {
          sub: TEST_RECIPIENT,
          aud: 'wiki-search-v1',
          jti: 'int_test_002',
          ttlSeconds: 60,
          tg: { v: '0.1', calls_remaining: 1, tx: '' },
        },
        privateKeyPem,
        { kid: 'unknown-kid' },
      )
      const result = await evaluateRequest({ authHeader: `Bearer ${token}` }, config)
      expect(result.allow).toBe(false)
      if (result.allow) return
      expect(result.status).toBe(401)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('evaluateRequest with mocked JWKS', () => {
  const originalFetch = globalThis.fetch
  let kp: { privateKeyPem: string; publicKeyPem: string }
  let jwksDocument: unknown

  beforeEach(async () => {
    kp = await generateTollgateKeyPair()
    const { buildJwks } = await import('@tollgate/shared/jwt')
    jwksDocument = await buildJwks([{ kid: 'test-kid', publicKeyPem: kp.publicKeyPem }])

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (u.includes('/v1/jwks')) {
        return new Response(JSON.stringify(jwksDocument), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response('Not found', { status: 404 })
    }) as typeof globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('allows a request with a valid signed token', async () => {
    const config = resolveConfig({
      endpointId: 'wiki-search-v1',
      price: 0.001,
      recipient: TEST_RECIPIENT,
      settlementUrl: 'https://tollgate.test/api/settle',
    })

    const token = await signAccessToken(
      {
        sub: TEST_RECIPIENT,
        aud: 'wiki-search-v1',
        jti: 'int_test_pass',
        ttlSeconds: 60,
        tg: { v: '0.1', calls_remaining: 1, tx: 'sig_pass' },
      },
      kp.privateKeyPem,
      { kid: 'test-kid' },
    )

    const result = await evaluateRequest({ authHeader: `Bearer ${token}` }, config)
    expect(result.allow).toBe(true)
    if (!result.allow) return
    expect(result.payload.aud).toBe('wiki-search-v1')
    expect(result.payload.tg.tx).toBe('sig_pass')
  })

  it('rejects a token with wrong audience', async () => {
    const config = resolveConfig({
      endpointId: 'wiki-search-v1',
      price: 0.001,
      recipient: TEST_RECIPIENT,
      settlementUrl: 'https://tollgate.test/api/settle',
    })

    const token = await signAccessToken(
      {
        sub: TEST_RECIPIENT,
        aud: 'different-endpoint',
        jti: 'int_test_wrong_aud',
        ttlSeconds: 60,
        tg: { v: '0.1', calls_remaining: 1, tx: '' },
      },
      kp.privateKeyPem,
      { kid: 'test-kid' },
    )

    const result = await evaluateRequest({ authHeader: `Bearer ${token}` }, config)
    expect(result.allow).toBe(false)
    if (result.allow) return
    expect(result.status).toBe(401)
  })
})
