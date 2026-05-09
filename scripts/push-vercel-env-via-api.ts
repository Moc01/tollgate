#!/usr/bin/env tsx
/**
 * Push env vars to a Vercel project using the REST API directly.
 *
 * The CLI's `vercel env add` reading from stdin doesn't reliably handle
 * multi-line values (e.g. PEM keys), so we use the JSON API instead.
 *
 * Usage: pnpm tsx scripts/push-vercel-env-via-api.ts <app>
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const TEAM_ID = 'team_Lg8mp55T5lyiqDa2leYGtHPz'
const PROJECT_IDS: Record<string, string> = {
  settlement: 'prj_eam6IoV4eTh49RgNzOzXpIPfCokr',
  examples: 'prj_PFRB2XTBqXLq4KQsWUqN6Awc7w9a',
  curio: 'prj_I7pMZBDEOULTAVNlueHHrQ25PkXM',
  dashboard: 'prj_jOJVnlCPDHRP4i8peSba1I0hYINf',
}

const APP_VARS: Record<string, string[]> = {
  settlement: [
    'TOLLGATE_JWT_PRIVATE_KEY',
    'TOLLGATE_JWT_PUBLIC_KEY',
    'TOLLGATE_JWT_KID',
    'TOLLGATE_ISSUER',
    'TOLLGATE_BASE_URL',
    'HELIUS_API_KEY',
    'HELIUS_RPC_URL',
    'HELIUS_WEBHOOK_SECRET',
    'SOLANA_NETWORK',
    'TOLLGATE_SKIP_ONCHAIN_VERIFY',
  ],
  examples: ['TOLLGATE_SETTLEMENT_URL', 'EXAMPLES_RECIPIENT_WALLET'],
  curio: [
    'ANTHROPIC_API_KEY',
    'HELIUS_API_KEY',
    'HELIUS_RPC_URL',
    'TOLLGATE_SETTLEMENT_URL',
    'EXAMPLES_BASE_URL',
    'CURIO_AGENT_SECRET_KEY',
    'CURIO_SIMULATE_PAYMENTS',
    'SOLANA_NETWORK',
  ],
  dashboard: ['TOLLGATE_SETTLEMENT_URL', 'TOLLGATE_DASHBOARD_API_KEY'],
}

function loadEnvLocal(): Record<string, string> {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) throw new Error('.env.local not found')
  const txt = readFileSync(path, 'utf-8')
  const out: Record<string, string> = {}
  let key: string | null = null
  let buf: string[] = []
  for (const rawLine of txt.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (key !== null) {
      buf.push(line)
      if (line.endsWith('"') && !line.endsWith('\\"')) {
        out[key] = buf.join('\n').replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n')
        key = null
        buf = []
      }
      continue
    }
    if (!line.trim() || line.trim().startsWith('#')) continue
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    const k = m[1]!
    let v = m[2] ?? ''
    if (v.startsWith('"') && !v.slice(1).includes('"')) {
      key = k
      buf = [v]
      continue
    }
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    v = v.replace(/\\n/g, '\n')
    out[k] = v
  }
  return out
}

function loadToken(): string {
  const home = process.env.APPDATA || process.env.HOME
  if (!home) throw new Error('Cannot find APPDATA/HOME')
  const tokenPath = resolve(home, 'com.vercel.cli', 'Data', 'auth.json')
  if (!existsSync(tokenPath)) throw new Error(`Token file not found: ${tokenPath}`)
  const j = JSON.parse(readFileSync(tokenPath, 'utf-8'))
  if (!j.token) throw new Error('No token in auth.json')
  return j.token as string
}

interface VercelEnvVar {
  id: string
  key: string
}

async function listExistingVars(token: string, projectId: string): Promise<VercelEnvVar[]> {
  const r = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${TEAM_ID}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!r.ok) throw new Error(`list envs failed: ${r.status} ${await r.text()}`)
  const j = (await r.json()) as { envs: VercelEnvVar[] }
  return j.envs
}

async function deleteVar(token: string, projectId: string, envId: string) {
  const r = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env/${envId}?teamId=${TEAM_ID}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
  if (!r.ok && r.status !== 404) {
    const t = await r.text()
    throw new Error(`delete env ${envId} failed: ${r.status} ${t}`)
  }
}

async function addVar(token: string, projectId: string, key: string, value: string) {
  const body = { key, value, target: ['production'], type: 'encrypted' }
  const r = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${TEAM_ID}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`add env ${key} failed: ${r.status} ${t.slice(0, 200)}`)
  }
}

async function main() {
  const app = process.argv[2]
  if (!app || !(app in PROJECT_IDS)) {
    console.error('Usage: push-vercel-env-via-api.ts <settlement|examples|curio|dashboard|all>')
    process.exit(1)
  }
  const apps = app === 'all' ? Object.keys(APP_VARS) : [app]
  const env = loadEnvLocal()
  const token = loadToken()

  for (const a of apps) {
    const projectId = PROJECT_IDS[a]!
    const vars = APP_VARS[a]!
    console.log(`\n📤 ${a} (${projectId}):`)

    const existing = await listExistingVars(token, projectId)
    const existingByKey = new Map(existing.map((e) => [e.key, e.id]))

    for (const name of vars) {
      const value = env[name]
      if (value === undefined || value === '') {
        console.log(`  ⚠ ${name}: not set in .env.local — skipping`)
        continue
      }
      const existingId = existingByKey.get(name)
      if (existingId) {
        await deleteVar(token, projectId, existingId)
      }
      try {
        await addVar(token, projectId, name, value)
        const preview =
          value.length > 30 ? value.slice(0, 20).replace(/\n/g, '\\n') + '…' : value
        console.log(`  ✓ ${name} (${value.length} chars: ${preview})`)
      } catch (err) {
        console.error(`  ✗ ${name}: ${(err as Error).message}`)
      }
    }
  }
}

main().catch((err) => {
  console.error('❌', err.message ?? err)
  process.exit(1)
})
