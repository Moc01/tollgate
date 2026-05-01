import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Auto-load monorepo-root .env.local so server runtime sees ANTHROPIC_API_KEY etc.
// (Next.js by default only reads .env.local from the app dir, not monorepo root.)
function loadMonorepoEnv() {
  const here = dirname(fileURLToPath(import.meta.url))
  for (const dir of ['../..', '../../..']) {
    const p = resolve(here, dir, '.env.local')
    if (!existsSync(p)) continue
    const txt = readFileSync(p, 'utf-8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (!m) continue
      const key = m[1]
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
loadMonorepoEnv()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tollgate/agent', '@tollgate/shared'],
  serverExternalPackages: ['@solana/web3.js', '@solana/spl-token'],
  // Forward env vars Curio's server runtime needs.
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
    HELIUS_API_KEY: process.env.HELIUS_API_KEY ?? '',
    HELIUS_RPC_URL: process.env.HELIUS_RPC_URL ?? '',
    TOLLGATE_SETTLEMENT_URL: process.env.TOLLGATE_SETTLEMENT_URL ?? 'http://localhost:3001',
    EXAMPLES_BASE_URL: process.env.EXAMPLES_BASE_URL ?? 'http://localhost:4001',
    CURIO_AGENT_SECRET_KEY: process.env.CURIO_AGENT_SECRET_KEY ?? '',
    CURIO_SIMULATE_PAYMENTS: process.env.CURIO_SIMULATE_PAYMENTS ?? 'true',
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
}

export default nextConfig
