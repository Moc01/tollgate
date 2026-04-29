import type { AccessTokenPayload, MiddlewareConfig } from '@tollgate/shared'
import type { NextFunction, Request, Response } from 'express'
import { evaluateRequest, resolveConfig } from './core'

/**
 * Express middleware factory.
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { tollgate } from '@tollgate/middleware/express'
 *
 * const app = express()
 * app.use('/search', tollgate({
 *   endpointId: 'wiki-search-v1',
 *   price: 0.001,
 *   recipient: 'BDqnQu...',
 * }))
 * ```
 *
 * After successful verification, `req.tollgate` is populated with the
 * decoded `AccessTokenPayload`.
 */
export function tollgate(
  opts: MiddlewareConfig,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config = resolveConfig(opts)

  return async (req, res, next) => {
    const authHeader = (req.headers.authorization as string | undefined) ?? undefined
    const ipAddress =
      ((req.headers['x-forwarded-for'] as string | undefined) ?? '').split(',')[0]?.trim() ||
      (req.socket.remoteAddress ?? undefined)

    const result = await evaluateRequest({ authHeader, ipAddress }, config)

    if (result.allow) {
      ;(req as Request & { tollgate?: AccessTokenPayload }).tollgate = result.payload
      next()
      return
    }

    for (const [k, v] of Object.entries(result.headers)) {
      res.setHeader(k, v)
    }
    res.status(result.status).json(result.body)
  }
}

/**
 * Type augmentation for Express. Consumers using TypeScript can import this
 * package and access `req.tollgate` as a typed property.
 *
 * Note: we cannot augment 'express-serve-static-core' from this package
 * because the typing depends on the consumer's express version. Instead,
 * consumers should cast: `(req as Request & { tollgate?: AccessTokenPayload })`.
 */
export type RequestWithTollgate<R extends Request = Request> = R & {
  tollgate?: AccessTokenPayload
}
