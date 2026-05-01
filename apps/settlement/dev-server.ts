/**
 * Local development server for the settlement service.
 * Run via `pnpm --filter settlement dev`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { generateTollgateKeyPair } from '@tollgate/shared'
import { buildApp } from './src/app'
import { loadConfigFromEnv } from './src/lib/config'
import { PostgresStore } from './src/lib/postgres-store'
import { InMemoryStore } from './src/lib/store'

// Auto-load .env.local from the repo root (sibling chain of dirs).
function loadEnvLocal() {
  for (const dir of ['../..', '../../..', '../../../..']) {
    const p = resolve(process.cwd(), dir, '.env.local')
    if (!existsSync(p)) continue
    const txt = readFileSync(p, 'utf-8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (!m) continue
      const key = m[1]
      let value = m[2]
      // Strip wrapping quotes; convert literal \n to newline (PEM keys use this)
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      value = value.replace(/\\n/g, '\n')
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
    console.log(`📂 Loaded env from ${p}`)
    return
  }
}

loadEnvLocal()

async function main() {
  // Local dev convenience: skip on-chain verification by default so the
  // synthesized e2e flow works without a funded devnet wallet. Production
  // deployments (Vercel) MUST set this explicitly to anything else.
  if (process.env.TOLLGATE_SKIP_ONCHAIN_VERIFY === undefined) {
    process.env.TOLLGATE_SKIP_ONCHAIN_VERIFY = 'true'
    console.warn('⚠️  TOLLGATE_SKIP_ONCHAIN_VERIFY auto-set to true (DEV ONLY)')
  }

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
