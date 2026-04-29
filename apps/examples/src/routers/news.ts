import { tollgate } from '@tollgate/middleware/hono'
import { Hono } from 'hono'
import { NEWS, searchAll } from '../data/mocks'

export function newsRouter(opts: { recipient: string; settlementUrl: string }) {
  const app = new Hono()

  app.use(
    '/*',
    tollgate({
      endpointId: 'news-api-v1',
      price: 0.002,
      recipient: opts.recipient,
      settlementUrl: opts.settlementUrl,
    }),
  )

  app.get('/', (c) => {
    const q = c.req.query('q') ?? c.req.query('query') ?? ''
    const limit = Math.min(Number(c.req.query('limit') ?? 5), 10)
    const results = searchAll(NEWS, q, limit)
    return c.json({
      provider: 'NewsAPI Pro (Tollgate demo)',
      query: q,
      count: results.length,
      results,
    })
  })

  return app
}
