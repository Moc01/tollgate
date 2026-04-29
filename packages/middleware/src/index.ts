/**
 * @tollgate/middleware
 *
 * Server-side paywall middleware for the Tollgate-402 protocol.
 *
 * The default `tollgate()` export is the Hono adapter (Hono is the recommended
 * framework for paid API examples since it runs on Edge / Node / Bun / CF Workers).
 *
 * For other frameworks, use sub-path imports:
 *   import { tollgate } from '@tollgate/middleware/express'
 *   import { tollgate } from '@tollgate/middleware/node'
 *   import { tollgate } from '@tollgate/middleware/next'
 */
export { tollgate } from './hono'
export { evaluateRequest, resolveConfig, extractBearer } from './core'
export type { ResolvedMiddlewareConfig, EvaluationResult, EvaluationInput } from './core'
