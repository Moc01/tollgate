import { Hono } from 'hono'
import { tollgate } from '@tollgate/middleware/hono'
import { searchWiki } from '../data/mocks'

export function wikiRouter(opts: { recipient: string; settlementUrl: string }) {
  const app = new Hono()

  app.use(
    '/*',
    tollgate({
      endpointId: 'wiki-search-v1',
      price: 0.0005,
      recipient: opts.recipient,
      settlementUrl: opts.settlementUrl,
    }),
  )

  app.get('/', (c) => {
    const q = c.req.query('q') ?? c.req.query('topic') ?? ''
    const article = searchWiki(q)
    if (!article) {
      return c.json({
        provider: 'Wikipedia API Pro (Tollgate demo)',
        query: q,
        article: null,
        message: 'No article found for the given topic',
      })
    }
    return c.json({
      provider: 'Wikipedia API Pro (Tollgate demo)',
      query: q,
      article,
    })
  })

  return app
}
