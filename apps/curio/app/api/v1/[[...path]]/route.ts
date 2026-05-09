/**
 * Mounts the settlement Hono app at /api/v1/* on the Curio deployment.
 *
 * Curio is the SINGLE deployed Vercel project. Settlement, examples, and the
 * Curio frontend all live in this Next.js app to avoid cross-app workspace-dep
 * issues at deploy time.
 */
import { buildApp } from 'settlement/app'
import { loadConfigFromEnv, assertConfig } from 'settlement/config'
import { InMemoryStore } from 'settlement/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let cachedFetch: ((req: Request) => Response | Promise<Response>) | null = null

function getFetch() {
  if (cachedFetch) return cachedFetch
  const config = loadConfigFromEnv()
  assertConfig(config)
  const store = new InMemoryStore()
  const app = buildApp({ config, store })
  cachedFetch = (req: Request) => app.fetch(stripApiPrefix(req))
  return cachedFetch
}

function stripApiPrefix(req: Request): Request {
  const url = new URL(req.url)
  // Hono settlement app mounts routes at /v1/*. Next.js gives us /api/v1/*.
  url.pathname = url.pathname.replace(/^\/api/, '')
  return new Request(url.toString(), req)
}

export const GET = (req: Request) => getFetch()(req)
export const POST = (req: Request) => getFetch()(req)
export const OPTIONS = (req: Request) => getFetch()(req)
