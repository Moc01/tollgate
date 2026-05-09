#!/usr/bin/env tsx
/**
 * Push env vars to a linked Vercel project and (optionally) deploy.
 *
 * Usage:
 *   pnpm tsx scripts/deploy-vercel.ts push-env <app>
 *   pnpm tsx scripts/deploy-vercel.ts deploy   <app>
 *   pnpm tsx scripts/deploy-vercel.ts full     <app>      # push-env + deploy
 *
 * Apps: settlement | examples | curio | dashboard
 *
 * Reads values from .env.local at the workspace root. Multi-line PEM keys
 * (encoded as \n in .env.local) are unescaped before pushing.
 *
 * Idempotent: if a var already exists in Vercel it's removed and re-added.
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'

const ENV_PATH = resolve(process.cwd(), '.env.local')
const APPS_DIR = resolve(process.cwd(), 'apps')

type AppName = 'settlement' | 'examples' | 'curio' | 'dashboard'

const APP_VARS: Record<AppName, string[]> = {
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
  examples: [
    'TOLLGATE_SETTLEMENT_URL',
    'EXAMPLES_RECIPIENT_WALLET',
  ],
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
  dashboard: [
    'TOLLGATE_SETTLEMENT_URL',
    'TOLLGATE_DASHBOARD_API_KEY',
  ],
}

function loadEnvLocal(): Record<string, string> {
  if (!existsSync(ENV_PATH)) throw new Error(`${ENV_PATH} not found`)
  const txt = readFileSync(ENV_PATH, 'utf-8')
  const out: Record<string, string> = {}
  for (const line of txt.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    let v = m[2] ?? ''
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    v = v.replace(/\\n/g, '\n')
    out[m[1]!] = v
  }
  return out
}

function upsertEnvLocal(updates: Record<string, string>) {
  let txt = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : ''
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=.*$`, 'm')
    const line = `${key}=${value}`
    if (re.test(txt)) {
      txt = txt.replace(re, line)
    } else {
      txt = `${txt.trimEnd()}\n${line}\n`
    }
  }
  writeFileSync(ENV_PATH, txt, 'utf-8')
}

function runCmd(
  cmd: string,
  args: string[],
  opts: { cwd?: string; stdin?: string; capture?: boolean } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveP) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => {
      const s = d.toString()
      stdout += s
      if (!opts.capture) process.stdout.write(s)
    })
    child.stderr.on('data', (d) => {
      const s = d.toString()
      stderr += s
      if (!opts.capture) process.stderr.write(s)
    })
    child.on('close', (code) => {
      resolveP({ code: code ?? 1, stdout, stderr })
    })
    if (opts.stdin !== undefined) {
      child.stdin.write(opts.stdin)
    }
    child.stdin.end()
  })
}

async function pushVar(appDir: string, name: string, value: string) {
  // Remove existing (ignore failure), then add.
  await runCmd('vercel', ['env', 'rm', name, 'production', '--yes'], { cwd: appDir, capture: true })
  const r = await runCmd('vercel', ['env', 'add', name, 'production'], {
    cwd: appDir,
    stdin: value,
    capture: true,
  })
  if (r.code === 0) {
    console.log(`  ✓ ${name}`)
  } else {
    console.error(`  ✗ ${name} failed: ${r.stderr.trim().slice(0, 200)}`)
  }
}

async function pushEnv(app: AppName) {
  const appDir = resolve(APPS_DIR, app)
  if (!existsSync(resolve(appDir, '.vercel', 'project.json'))) {
    throw new Error(
      `${app} is not linked to a Vercel project. Run: cd apps/${app} && vercel link`,
    )
  }
  const env = loadEnvLocal()
  const vars = APP_VARS[app]
  console.log(`📤 Pushing env vars to ${app} (production):`)
  for (const name of vars) {
    const value = env[name]
    if (value === undefined || value === '') {
      console.warn(`  ⚠ ${name}: not set in .env.local — skipping`)
      continue
    }
    await pushVar(appDir, name, value)
  }
}

async function deploy(app: AppName): Promise<string> {
  const appDir = resolve(APPS_DIR, app)
  if (!existsSync(resolve(appDir, '.vercel', 'project.json'))) {
    throw new Error(
      `${app} is not linked to a Vercel project. Run: cd apps/${app} && vercel link`,
    )
  }
  console.log(`🚀 Deploying ${app} to production...`)
  const r = await runCmd('vercel', ['deploy', '--prod'], { cwd: appDir, capture: true })
  if (r.code !== 0) {
    console.error(r.stderr)
    throw new Error(`vercel deploy failed for ${app}`)
  }
  // Vercel prints the deployment URL to stdout. Capture the last https URL.
  const matches = r.stdout.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi) ?? []
  const url = matches[matches.length - 1]
  if (!url) {
    console.error('Could not parse deploy URL from stdout:', r.stdout)
    throw new Error('Deploy URL not found')
  }
  console.log(`  ✅ ${app} → ${url}`)
  return url
}

async function ensureWebhookSecret() {
  const env = loadEnvLocal()
  if (env.HELIUS_WEBHOOK_SECRET && env.HELIUS_WEBHOOK_SECRET !== 'your-webhook-secret') return
  const secret = randomBytes(32).toString('hex')
  upsertEnvLocal({ HELIUS_WEBHOOK_SECRET: secret })
  console.log(`🔐 Generated HELIUS_WEBHOOK_SECRET (32 bytes hex) and wrote to .env.local`)
}

async function ensureMiscDefaults() {
  const env = loadEnvLocal()
  const updates: Record<string, string> = {}
  if (!env.TOLLGATE_ISSUER) updates.TOLLGATE_ISSUER = 'https://tollgate.dev'
  if (!env.TOLLGATE_SKIP_ONCHAIN_VERIFY) updates.TOLLGATE_SKIP_ONCHAIN_VERIFY = 'true'
  if (!env.CURIO_SIMULATE_PAYMENTS) updates.CURIO_SIMULATE_PAYMENTS = 'true'
  if (!env.HELIUS_RPC_URL && env.HELIUS_API_KEY) {
    updates.HELIUS_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
  }
  if (Object.keys(updates).length > 0) {
    upsertEnvLocal(updates)
    console.log(`✏️  Defaults written to .env.local: ${Object.keys(updates).join(', ')}`)
  }
}

async function main() {
  const cmd = process.argv[2]
  const app = process.argv[3] as AppName | undefined

  if (cmd === 'init') {
    await ensureWebhookSecret()
    await ensureMiscDefaults()
    return
  }

  if (!app || !(app in APP_VARS)) {
    console.error('Usage: deploy-vercel.ts <init|push-env|deploy|full> [app]')
    console.error('Apps:  settlement | examples | curio | dashboard')
    process.exit(1)
  }

  if (cmd === 'push-env') {
    await ensureWebhookSecret()
    await ensureMiscDefaults()
    await pushEnv(app)
  } else if (cmd === 'deploy') {
    const url = await deploy(app)
    console.log(`\nURL: ${url}`)
  } else if (cmd === 'full') {
    await ensureWebhookSecret()
    await ensureMiscDefaults()
    await pushEnv(app)
    const url = await deploy(app)
    console.log(`\n${app}: ${url}`)
  } else {
    console.error('Unknown command:', cmd)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌', err.message ?? err)
  process.exit(1)
})
