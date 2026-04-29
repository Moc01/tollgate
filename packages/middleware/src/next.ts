import type { MiddlewareConfig } from '@tollgate/shared'
import { evaluateRequest, resolveConfig } from './core'

/**
 * Next.js Edge / Route handler middleware factory.
 *
 * Returns a function that takes a `Request` and returns:
 *  - `null` if the request is allowed to proceed
 *  - a `Response` (402 or 401) if the request is blocked
 *
 * @example
 * ```ts
 * // app/api/search/route.ts
 * import { tollgate } from '@tollgate/middleware/next'
 *
 * export const runtime = 'edge'
 *
 * const guard = tollgate({
 *   endpointId: 'my-search-v1',
 *   price: 0.001,
 *   recipient: process.env.MY_SOLANA_WALLET!,
 * })
 *
 * export async function GET(req: Request) {
 *   const blocked = await guard(req)
 *   if (blocked) return blocked
 *
 *   return Response.json({ results: [] })
 * }
 * ```
 */
export function tollgate(
  opts: MiddlewareConfig,
): (req: Request) => Promise<Response | null> {
  const config = resolveConfig(opts)

  return async (req) => {
    const authHeader = req.headers.get('authorization') ?? undefined
    const xff = req.headers.get('x-forwarded-for')
    const cfip = req.headers.get('cf-connecting-ip')
    const ipAddress = (xff ? xff.split(',')[0]?.trim() : null) ?? cfip ?? undefined

    const result = await evaluateRequest({ authHeader, ipAddress }, config)

    if (result.allow) {
      // Pass payload via custom header so downstream handlers can read it
      // (without a shared store). They are expected to verify again if needed.
      // This is best-effort and may not be needed in most cases.
      return null
    }

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: result.headers,
    })
  }
}
