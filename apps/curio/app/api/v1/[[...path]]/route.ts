/**
 * Mounts the settlement Hono app at /api/v1/* on the Curio deployment.
 *
 * Curio is the SINGLE deployed Vercel project. Settlement, examples, and the
 * Curio frontend all live in this Next.js app to avoid cross-app workspace-dep
 * issues at deploy time.
 *
 * State is held on globalThis so that warm invocations share the InMemoryStore
 * with the bundled examples app. Cold starts re-seed the 5 known endpoints
 * synchronously, so a freshly-thawed function answers /v1/intent correctly on
 * the very first request without waiting on examples to call POST /v1/endpoints.
 */
import { buildApp } from 'settlement/app'
import { loadConfigFromEnv, assertConfig } from 'settlement/config'
import { InMemoryStore } from 'settlement/store'
import { ensureSeededStore } from '@/lib/shared-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let cachedFetch: ((req: Request) => Response | Promise<Response>) | null = null

function getFetch() {
  if (cachedFetch) return cachedFetch
  const config = loadConfigFromEnv()
  assertConfig(config)
  const store = ensureSeededStore(InMemoryStore)
  const app = buildApp({ config, store })
  cachedFetch = (req: Request) => app.fetch(stripApiPrefix(req))
  return cachedFetch
}

function stripApiPrefix(req: Request): Request {
  const url = new URL(req.url)
  url.pathname = url.pathname.replace(/^\/api/, '')
  return new Request(url.toString(), req)
}

export const GET = (req: Request) => getFetch()(req)
export const POST = (req: Request) => getFetch()(req)
export const OPTIONS = (req: Request) => getFetch()(req)
