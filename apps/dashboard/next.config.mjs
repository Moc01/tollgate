import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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
  transpilePackages: ['@tollgate/shared'],
  env: {
    TOLLGATE_SETTLEMENT_URL: process.env.TOLLGATE_SETTLEMENT_URL ?? 'http://localhost:3001',
    TOLLGATE_DASHBOARD_API_KEY: process.env.TOLLGATE_DASHBOARD_API_KEY ?? '',
  },
}

export default nextConfig
