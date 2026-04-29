/**
 * Local development server for the settlement service.
 * Run via `pnpm --filter settlement dev`.
 */
import { serve } from '@hono/node-server'
import { generateTollgateKeyPair } from '@tollgate/shared'
import { buildApp } from './src/app'
import { loadConfigFromEnv } from './src/lib/config'
import { PostgresStore } from './src/lib/postgres-store'
import { InMemoryStore } from './src/lib/store'

async function main() {
  let config = loadConfigFromEnv()

  // For dev convenience: if JWT keys are missing, auto-generate ephemeral ones.
  if (!config.jwtPrivateKey || !config.jwtPublicKey) {
    console.warn(
      '⚠️  TOLLGATE_JWT_PRIVATE_KEY/PUBLIC_KEY not set, generating ephemeral keypair (DEV ONLY)',
    )
    const kp = await generateTollgateKeyPair()
    config = {
      ...config,
      jwtPrivateKey: kp.privateKeyPem,
      jwtPublicKey: kp.publicKeyPem,
    }
  }

  const store = config.databaseUrl ? new PostgresStore(config.databaseUrl) : new InMemoryStore()

  const app = buildApp({ config, store })

  const port = Number(process.env.PORT ?? 3001)
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`🚪 Tollgate settlement listening on http://localhost:${info.port}`)
    console.log(`   /v1/jwks  /v1/intent  /v1/confirm  /v1/webhook/helius  /v1/endpoints`)
    if (!config.databaseUrl) {
      console.log(`   📦 Using InMemoryStore (no DATABASE_URL set)`)
    }
  })
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
