/**
 * Examples app: hosts 5 paid APIs in a single Hono application.
 *
 * Path layout:
 *   GET /api/news/?q=...          $0.002
 *   GET /api/github/?q=...        $0.001
 *   GET /api/wiki/?q=...          $0.0005
 *   GET /api/arxiv/?q=...         $0.003
 *   GET /api/solana-docs/?q=...   $0.0005
 *
 * All endpoints are protected by `@tollgate/middleware`, returning 402 unless
 * the caller presents a valid Tollgate-issued JWT.
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { arxivRouter } from './routers/arxiv'
import { githubRouter } from './routers/github'
import { newsRouter } from './routers/news'
import { solanaDocsRouter } from './routers/solana-docs'
import { wikiRouter } from './routers/wiki'

export interface ExamplesAppOptions {
  recipient: string
  settlementUrl: string
}

export function buildExamplesApp(opts: ExamplesAppOptions) {
  const app = new Hono()

  app.use('*', logger())
  app.use('*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'] }))

  app.get('/', (c) =>
    c.json({
      name: 'Tollgate Demo APIs',
      description: 'Five mock paid APIs protected by Tollgate-402.',
      endpoints: [
        { path: '/api/news', price_usdc: 0.002 },
        { path: '/api/github', price_usdc: 0.001 },
        { path: '/api/wiki', price_usdc: 0.0005 },
        { path: '/api/arxiv', price_usdc: 0.003 },
        { path: '/api/solana-docs', price_usdc: 0.0005 },
      ],
    }),
  )

  app.route('/api/news', newsRouter(opts))
  app.route('/api/github', githubRouter(opts))
  app.route('/api/wiki', wikiRouter(opts))
  app.route('/api/arxiv', arxivRouter(opts))
  app.route('/api/solana-docs', solanaDocsRouter(opts))

  return app
}
