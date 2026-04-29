import { serve } from '@hono/node-server'
import { buildExamplesApp } from './src'

const app = buildExamplesApp({
  recipient: process.env.EXAMPLES_RECIPIENT_WALLET ?? '11111111111111111111111111111111',
  settlementUrl: process.env.TOLLGATE_SETTLEMENT_URL ?? 'http://localhost:3001',
})

const port = Number(process.env.PORT ?? 4001)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`📚 Tollgate examples listening on http://localhost:${info.port}`)
  console.log(`   /api/news  /api/github  /api/wiki  /api/arxiv  /api/solana-docs`)
})
