/**
 * Vercel Node.js runtime entrypoint.
 * The vercel.json rewrites all /v1/* and /api/* to this single function.
 */
import { handle } from '@hono/node-server/vercel'
import { buildApp } from '../src/app'
import { assertConfig, loadConfigFromEnv } from '../src/lib/config'
import { PostgresStore } from '../src/lib/postgres-store'
import { InMemoryStore } from '../src/lib/store'

const appConfig = loadConfigFromEnv()
assertConfig(appConfig)

const store = appConfig.databaseUrl ? new PostgresStore(appConfig.databaseUrl) : new InMemoryStore()

const app = buildApp({ config: appConfig, store })

export default handle(app)
