import { buildJwks } from '@tollgate/shared'
/**
 * GET /v1/jwks — publish public keys for middleware to verify access tokens.
 */
import { Hono } from 'hono'
import type { AppContext } from '../app'

export const jwksRouter = new Hono<AppContext>()

jwksRouter.get('/jwks', async (c) => {
  const config = c.get('config')
  const jwks = await buildJwks([{ kid: config.jwtKid, publicKeyPem: config.jwtPublicKey }])
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(jwks)
})
