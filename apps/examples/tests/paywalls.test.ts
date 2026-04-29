import { Keypair } from '@solana/web3.js'
import { describe, expect, it } from 'vitest'
import { buildExamplesApp } from '../src'

const RECIPIENT = Keypair.generate().publicKey.toBase58()

const app = buildExamplesApp({
  recipient: RECIPIENT,
  settlementUrl: 'https://tollgate.test/api/settle',
})

const PAID_PATHS = [
  { path: '/api/news', endpointId: 'news-api-v1', price: '0.002' },
  { path: '/api/github', endpointId: 'github-search-v1', price: '0.001' },
  { path: '/api/wiki', endpointId: 'wiki-search-v1', price: '0.0005' },
  { path: '/api/arxiv', endpointId: 'arxiv-search-v1', price: '0.003' },
  { path: '/api/solana-docs', endpointId: 'solana-docs-v1', price: '0.0005' },
]

describe('GET / (index)', () => {
  it('returns the list of endpoints (no paywall)', async () => {
    const res = await app.fetch(new Request('http://test/'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { endpoints: Array<{ path: string }> }
    expect(body.endpoints).toHaveLength(5)
  })
})

describe('paywall behavior', () => {
  for (const { path, endpointId, price } of PAID_PATHS) {
    it(`${path} returns 402 with correct endpoint_id and price`, async () => {
      const res = await app.fetch(new Request(`http://test${path}/?q=solana`))
      expect(res.status).toBe(402)
      const body = (await res.json()) as { tollgate: { endpoint_id: string; price: string } }
      expect(body.tollgate.endpoint_id).toBe(endpointId)
      expect(body.tollgate.price).toBe(price)
    })
  }
})
