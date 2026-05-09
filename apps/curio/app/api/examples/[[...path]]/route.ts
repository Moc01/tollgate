/**
 * Mounts the examples (5 paid mock APIs) Hono app at /api/examples/* on Curio.
 *
 * The examples app's internal routes are /api/news, /api/github, etc. After
 * the Next.js prefix is stripped, requests reach Hono as /api/examples/news/...
 * Hono's app expects /api/news/* — so we strip "examples" too.
 */
import { buildExamplesApp } from 'examples/app'
import { registerEndpoints } from 'examples/register'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let cachedFetch: ((req: Request) => Response | Promise<Response>) | null = null
let registerPromise: Promise<void> | null = null

function getSettlementUrl(req: Request) {
  // When everything is co-deployed, settlement is on the same origin.
  if (process.env.TOLLGATE_SETTLEMENT_URL && process.env.TOLLGATE_SETTLEMENT_URL !== '') {
    return process.env.TOLLGATE_SETTLEMENT_URL
  }
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}/api`
}

function getRecipient() {
  return (
    process.env.EXAMPLES_RECIPIENT_WALLET ||
    '11111111111111111111111111111111' // placeholder; simulated mode never uses this
  )
}

function buildOnce(req: Request) {
  if (cachedFetch) return cachedFetch
  const settlementUrl = getSettlementUrl(req)
  const app = buildExamplesApp({
    recipient: getRecipient(),
    settlementUrl,
  })
  cachedFetch = (r: Request) => app.fetch(stripExamplesPrefix(r))
  // Fire-and-forget registration
  if (!registerPromise) {
    registerPromise = registerEndpoints({
      settlementUrl,
      recipient: getRecipient(),
    }).catch((err) => {
      console.warn('endpoint registration failed:', err.message)
    })
  }
  return cachedFetch
}

function stripExamplesPrefix(req: Request): Request {
  const url = new URL(req.url)
  // Next.js gives us /api/examples/<rest>. The examples Hono app's routes
  // already start with /api/* (e.g. /api/news), so we just strip /api/examples
  // and let whatever came after be matched by Hono.
  url.pathname = url.pathname.replace(/^\/api\/examples/, '') || '/'
  return new Request(url.toString(), req)
}

export const GET = (req: Request) => buildOnce(req)(req)
export const POST = (req: Request) => buildOnce(req)(req)
export const OPTIONS = (req: Request) => buildOnce(req)(req)
