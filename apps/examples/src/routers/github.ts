import { tollgate } from '@tollgate/middleware/hono'
import { Hono } from 'hono'
import { GITHUB_REPOS, searchAll } from '../data/mocks'

export function githubRouter(opts: { recipient: string; settlementUrl: string }) {
  const app = new Hono()

  app.use(
    '/*',
    tollgate({
      endpointId: 'github-search-v1',
      price: 0.001,
      recipient: opts.recipient,
      settlementUrl: opts.settlementUrl,
    }),
  )

  app.get('/', (c) => {
    const q = c.req.query('q') ?? ''
    const limit = Math.min(Number(c.req.query('limit') ?? 5), 10)
    const results = searchAll(GITHUB_REPOS, q, limit)
    return c.json({
      provider: 'GitHub Search Pro (Tollgate demo)',
      query: q,
      count: results.length,
      results,
    })
  })

  return app
}
