#!/usr/bin/env tsx
/**
 * One-shot setup for Curio's demo agent wallet.
 *
 * Generates a fresh Solana keypair for the Curio agent, writes the base58
 * secret key into .env.local as CURIO_AGENT_SECRET_KEY, also generates a
 * recipient wallet for the examples service (EXAMPLES_RECIPIENT_WALLET),
 * then funds Curio's wallet with devnet SOL and USDC.
 *
 * Usage: pnpm tg:setup-curio
 *
 * Idempotency: if CURIO_AGENT_SECRET_KEY already exists in .env.local, the
 * existing wallet is reused (top-up only). Pass --rotate to force a new key.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'

const ENV_PATH = resolve(process.cwd(), '.env.local')
const PUBLIC_DEVNET_RPC = 'https://api.devnet.solana.com'
const CIRCLE_FAUCET_URL = 'https://faucet.circle.com/api/sendUsdc'

// Load .env.local so we can read HELIUS_API_KEY
function loadDotEnvLocal() {
  if (!existsSync(ENV_PATH)) return
  const txt = readFileSync(ENV_PATH, 'utf-8')
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    let v = m[2] ?? ''
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[m[1]!] === undefined) process.env[m[1]!] = v
  }
}
loadDotEnvLocal()

function pickRpcUrl(): string {
  const helius = process.env.HELIUS_API_KEY
  if (helius && helius !== 'your-helius-api-key') {
    return `https://devnet.helius-rpc.com/?api-key=${helius}`
  }
  return PUBLIC_DEVNET_RPC
}

interface EnvBlock {
  curioSecret: string | null
  examplesRecipient: string | null
  raw: Record<string, string>
}

function parseEnv(): EnvBlock {
  if (!existsSync(ENV_PATH)) {
    return { curioSecret: null, examplesRecipient: null, raw: {} }
  }
  const txt = readFileSync(ENV_PATH, 'utf-8')
  const raw: Record<string, string> = {}
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    let v = m[2] ?? ''
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    raw[m[1]!] = v
  }
  return {
    curioSecret: raw.CURIO_AGENT_SECRET_KEY || null,
    examplesRecipient: raw.EXAMPLES_RECIPIENT_WALLET || null,
    raw,
  }
}

function upsertEnv(updates: Record<string, string>) {
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

function keypairFromSecret(secret: string): Keypair {
  const bytes = bs58.decode(secret)
  if (bytes.length === 64) return Keypair.fromSecretKey(bytes)
  if (bytes.length === 32) return Keypair.fromSeed(bytes)
  throw new Error(`Invalid secret length ${bytes.length}; expected 32 or 64`)
}

async function fundSolFromAirdrop(pubkey: PublicKey): Promise<boolean> {
  // Try Helius first (if API key is set), then fall back to public devnet RPC.
  const candidates = [pickRpcUrl()]
  if (candidates[0] !== PUBLIC_DEVNET_RPC) candidates.push(PUBLIC_DEVNET_RPC)

  for (const url of candidates) {
    const label = url.includes('helius') ? 'Helius' : 'public devnet'
    console.log(`💸 Requesting 1 SOL airdrop via ${label}...`)
    try {
      const conn = new Connection(url, 'confirmed')
      const sig = await conn.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL)
      await conn.confirmTransaction(sig, 'confirmed')
      const balance = await conn.getBalance(pubkey)
      console.log(`   ✅ SOL balance: ${balance / LAMPORTS_PER_SOL} SOL`)
      console.log(`   tx: https://explorer.solana.com/tx/${sig}?cluster=devnet`)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`   ⚠️  ${label} airdrop failed: ${msg.slice(0, 200)}`)
    }
  }
  console.warn('   👉 Manual fallback: https://faucet.solana.com/  (paste pubkey, request 1 SOL)')
  return false
}

async function fundUsdcFromCircle(pubkey: PublicKey): Promise<boolean> {
  console.log(`💵 Requesting 10 USDC devnet airdrop to ${pubkey.toBase58()}...`)
  try {
    const res = await fetch(CIRCLE_FAUCET_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        destinationWallet: pubkey.toBase58(),
        chain: 'SOL',
        usdcAmount: '10',
      }),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.warn(`   ⚠️  Circle faucet returned ${res.status}: ${txt.slice(0, 200)}`)
      console.warn('   Manual fallback: https://faucet.circle.com/')
      return false
    }
    const json = (await res.json()) as { success?: boolean; transactionHash?: string }
    if (json.success) {
      console.log('   ✅ 10 USDC airdropped')
      if (json.transactionHash) {
        console.log(`   tx: https://explorer.solana.com/tx/${json.transactionHash}?cluster=devnet`)
      }
      return true
    }
    console.warn('   ⚠️  Faucet response did not indicate success:', json)
    return false
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`   ⚠️  Faucet request failed: ${msg}`)
    console.warn('   Manual fallback: https://faucet.circle.com/')
    return false
  }
}

async function main() {
  const rotate = process.argv.includes('--rotate')
  const env = parseEnv()

  // 1. Curio agent wallet
  let curio: Keypair
  if (env.curioSecret && !rotate) {
    curio = keypairFromSecret(env.curioSecret)
    console.log(`🔑 Reusing existing Curio wallet: ${curio.publicKey.toBase58()}`)
  } else {
    curio = Keypair.generate()
    const secret = bs58.encode(curio.secretKey)
    upsertEnv({ CURIO_AGENT_SECRET_KEY: secret })
    console.log(`🆕 Generated new Curio wallet: ${curio.publicKey.toBase58()}`)
    console.log('   (CURIO_AGENT_SECRET_KEY written to .env.local)')
  }

  // 2. Examples recipient wallet (only generate if missing — receivers don't need funding)
  if (!env.examplesRecipient || env.examplesRecipient === '11111111111111111111111111111111') {
    const recipient = Keypair.generate()
    upsertEnv({ EXAMPLES_RECIPIENT_WALLET: recipient.publicKey.toBase58() })
    console.log(`🏦 Generated Examples recipient: ${recipient.publicKey.toBase58()}`)
    console.log('   (EXAMPLES_RECIPIENT_WALLET public key written to .env.local)')
  } else {
    console.log(`🏦 Reusing Examples recipient: ${env.examplesRecipient}`)
  }

  // 3. Fund Curio with SOL (for tx fees)
  console.log('')
  const solOk = await fundSolFromAirdrop(curio.publicKey)

  // 4. Fund Curio with USDC
  console.log('')
  const usdcOk = await fundUsdcFromCircle(curio.publicKey)

  // 5. Final state + advice
  console.log('')
  if (solOk && usdcOk) {
    console.log('✅ Wallet funded. Real on-chain payments will work.')
    console.log('   You can flip CURIO_SIMULATE_PAYMENTS=false in .env.local to test real payments.')
  } else {
    console.log('⚠️  Funding incomplete. The demo will work in SIMULATED payment mode')
    console.log('   (CURIO_SIMULATE_PAYMENTS=true is the default).')
    console.log('')
    console.log('   For real on-chain payments later, fund this address:')
    console.log(`     ${curio.publicKey.toBase58()}`)
    console.log('   - SOL (devnet, for tx fees): https://faucet.solana.com/')
    console.log('   - USDC (devnet, ≥ 0.1):       https://faucet.circle.com/')
  }
  console.log('')
  console.log('Next:')
  console.log('   - Local test: pnpm dev')
  console.log('   - Deploy:     vercel --prod  (in each app directory)')
}

main().catch((err) => {
  console.error('❌ setup-curio-wallet failed:', err)
  process.exit(1)
})
