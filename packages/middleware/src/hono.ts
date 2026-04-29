import type { MiddlewareConfig } from '@tollgate/shared'
import type { Context, MiddlewareHandler } from 'hono'
import { evaluateRequest, resolveConfig } from './core'

/**
 * Hono middleware factory.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { tollgate } from '@tollgate/middleware/hono'
 *
 * const app = new Hono()
 * app.use('/search/*', tollgate({
 *   endpointId: 'wiki-search-v1',
 *   price: 0.001,
 *   recipient: 'BDqnQu...',
 * }))
 * ```
 */
export function tollgate(opts: MiddlewareConfig): MiddlewareHandler {
  const config = resolveConfig(opts)

  return async (c, next) => {
    const authHeader = c.req.header('authorization') ?? c.req.header('Authorization')
    const ipAddress = ipFromHonoContext(c)

    const result = await evaluateRequest({ authHeader, ipAddress }, config)

    if (result.allow) {
      // Stash token payload for downstream handlers.
      c.set('tollgate', result.payload)
      await next()
      return
    }

    for (const [k, v] of Object.entries(result.headers)) {
      c.header(k, v)
    }
    return c.json(result.body, result.status)
  }
}

function ipFromHonoContext(c: Context): string | undefined {
  const xff = c.req.header('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim()
  const cfip = c.req.header('cf-connecting-ip')
  if (cfip) return cfip
  return undefined
}

// Augment Hono's ContextVariableMap so `c.get('tollgate')` is typed.
declare module 'hono' {
  interface ContextVariableMap {
    tollgate?: import('@tollgate/shared').AccessTokenPayload
  }
}
