import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { buildExamplesApp } from './src'
import { registerEndpoints } from './src/register'

function loadEnvLocal() {
  for (const dir of ['../..', '../../..']) {
    const p = resolve(process.cwd(), dir, '.env.local')
    if (!existsSync(p)) continue
    const txt = readFileSync(p, 'utf-8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (!m) continue
      const key = m[1]!
      let value = m[2] ?? ''
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      value = value.replace(/\\n/g, '\n')
      if (process.env[key] === undefined) process.env[key] = value
    }
    return
  }
}
loadEnvLocal()

const recipient =
  process.env.EXAMPLES_RECIPIENT_WALLET ?? 'BDqnQuVKx5UZJYMYgz6CfQTcLoT6XYE1qzFKr5jNCcyc'
const settlementUrl = process.env.TOLLGATE_SETTLEMENT_URL ?? 'http://localhost:3001'

const app = buildExamplesApp({ recipient, settlementUrl })

const port = Number(process.env.PORT ?? 4001)
serve({ fetch: app.fetch, port }, async (info) => {
  console.log(`📚 Tollgate examples listening on http://localhost:${info.port}`)
  console.log(`   /api/news  /api/github  /api/wiki  /api/arxiv  /api/solana-docs`)
  // Wait briefly so settlement has time to come up if both started together,
  // then register all endpoints. Idempotent.
  setTimeout(() => {
    void registerEndpoints({ settlementUrl, recipient })
  }, 1500)
})
