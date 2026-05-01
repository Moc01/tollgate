import { tollgate } from '@tollgate/middleware/hono'
import { Hono } from 'hono'
import { SOLANA_DOCS, searchAll } from '../data/mocks'

export function solanaDocsRouter(opts: { recipient: string; settlementUrl: string }) {
  const app = new Hono()

  app.use(
    '/*',
    tollgate({
      endpointId: 'solana-docs-v1',
      price: 0.0005,
      recipient: opts.recipient,
      settlementUrl: opts.settlementUrl,
    }),
  )

  app.get('/*', (c) => {
    const q = c.req.query('q') ?? ''
    const limit = Math.min(Number(c.req.query('limit') ?? 3), 5)
    const results = searchAll(SOLANA_DOCS, q, limit)
    return c.json({
      provider: 'Solana Docs Q&A (Tollgate demo)',
      query: q,
      count: results.length,
      results,
    })
  })

  return app
}
