import { handle } from '@hono/node-server/vercel'
import { buildExamplesApp } from '../src'

const app = buildExamplesApp({
  recipient: process.env.EXAMPLES_RECIPIENT_WALLET ?? '11111111111111111111111111111111',
  settlementUrl: process.env.TOLLGATE_SETTLEMENT_URL ?? 'http://localhost:3001',
})

export default handle(app)
