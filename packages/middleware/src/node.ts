import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MiddlewareConfig } from '@tollgate/shared'
import { evaluateRequest, resolveConfig } from './core'

/**
 * Bare Node.js HTTP middleware factory.
 *
 * @example
 * ```ts
 * import http from 'node:http'
 * import { tollgate } from '@tollgate/middleware/node'
 *
 * const guard = tollgate({
 *   endpointId: 'my-api-v1',
 *   price: 0.001,
 *   recipient: 'BDqnQu...',
 * })
 *
 * http.createServer(async (req, res) => {
 *   const blocked = await guard(req, res)
 *   if (blocked) return // response was already sent
 *   res.end('Hello paid world')
 * }).listen(3000)
 * ```
 *
 * Returns `true` if the request was blocked (response already written).
 * Returns `false` if the request should continue.
 */
export function tollgate(
  opts: MiddlewareConfig,
): (req: IncomingMessage, res: ServerResponse) => Promise<boolean> {
  const config = resolveConfig(opts)

  return async (req, res) => {
    const authHeader = (req.headers.authorization as string | undefined) ?? undefined
    const ipAddress =
      ((req.headers['x-forwarded-for'] as string | undefined) ?? '').split(',')[0]?.trim() ||
      (req.socket.remoteAddress ?? undefined)

    const result = await evaluateRequest({ authHeader, ipAddress }, config)

    if (result.allow) return false

    for (const [k, v] of Object.entries(result.headers)) {
      res.setHeader(k, v)
    }
    res.statusCode = result.status
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(result.body))
    return true
  }
}
