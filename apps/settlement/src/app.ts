/**
 * Tollgate Settlement Service.
 *
 * Stateless HTTP service that:
 *  - issues payment intents (POST /v1/intent)
 *  - confirms intents and signs access tokens (POST /v1/confirm)
 *  - publishes JWKS (GET /v1/jwks)
 *  - receives Helius webhook for USDC arrivals (POST /v1/webhook/helius)
 *  - manages endpoint registrations (POST /v1/endpoints)
 *
 * Storage backend is pluggable via the Store interface (Postgres in prod,
 * in-memory in tests). All routes share an env-derived AppConfig.
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { AppConfig } from './lib/config'
import type { Store } from './lib/store'
import { confirmRouter } from './routes/confirm'
import { endpointsRouter } from './routes/endpoints'
import { intentRouter } from './routes/intent'
import { jwksRouter } from './routes/jwks'
import { webhookRouter } from './routes/webhook'

export interface AppContext {
  Variables: {
    config: AppConfig
    store: Store
  }
}

export function buildApp(deps: { config: AppConfig; store: Store }): Hono<AppContext> {
  const app = new Hono<AppContext>()

  app.use('*', logger())
  app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'] }))

  app.use('*', async (c, next) => {
    c.set('config', deps.config)
    c.set('store', deps.store)
    await next()
  })

  app.get('/', (c) =>
    c.json({
      name: 'Tollgate Settlement Service',
      version: '0.1.0',
      docs: 'https://github.com/Moc01/tollgate',
    }),
  )

  app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }))

  app.route('/v1', intentRouter)
  app.route('/v1', confirmRouter)
  app.route('/v1', jwksRouter)
  app.route('/v1', webhookRouter)
  app.route('/v1', endpointsRouter)

  return app
}
