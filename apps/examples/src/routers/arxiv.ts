import { Hono } from 'hono'
import { tollgate } from '@tollgate/middleware/hono'
import { ARXIV_PAPERS, searchAll } from '../data/mocks'

export function arxivRouter(opts: { recipient: string; settlementUrl: string }) {
  const app = new Hono()

  app.use(
    '/*',
    tollgate({
      endpointId: 'arxiv-search-v1',
      price: 0.003,
      recipient: opts.recipient,
      settlementUrl: opts.settlementUrl,
    }),
  )

  app.get('/', (c) => {
    const q = c.req.query('q') ?? ''
    const limit = Math.min(Number(c.req.query('limit') ?? 5), 10)
    const results = searchAll(ARXIV_PAPERS, q, limit)
    return c.json({
      provider: 'ArXiv Premium (Tollgate demo)',
      query: q,
      count: results.length,
      results,
    })
  })

  return app
}
