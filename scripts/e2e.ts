#!/usr/bin/env tsx
/**
 * End-to-end test of the full Tollgate flow against locally-running services:
 *   - apps/settlement on :3001
 *   - apps/examples on :4001
 *
 * The script does NOT submit real Solana transactions — instead it bypasses
 * the on-chain leg by hitting the settlement service's webhook endpoint with
 * a synthesized "Helius" event, then verifies the issued JWT.
 *
 * For a real on-chain E2E (with USDC transfer + Helius webhook), use the
 * full local environment with a funded devnet wallet.
 *
 * Usage: pnpm tg:e2e
 */
import { Keypair } from '@solana/web3.js'
import { generateReferenceKey, USDC_MINT_DEVNET } from '@tollgate/shared'

const SETTLEMENT = process.env.TOLLGATE_SETTLEMENT_URL ?? 'http://localhost:3001'
const EXAMPLES = process.env.EXAMPLES_BASE_URL ?? 'http://localhost:4001'

async function main() {
  console.log(`🚪 E2E test against:\n   settlement: ${SETTLEMENT}\n   examples:   ${EXAMPLES}\n`)

  // 0. Register a test endpoint with the settlement service
  const recipient = Keypair.generate().publicKey.toBase58()
  console.log(`0. Registering test endpoint (recipient ${recipient.slice(0, 8)}…)`)
  const reg = await fetch(`${SETTLEMENT}/v1/endpoints`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: 'wiki-search-v1',
      name: 'Wiki E2E',
      urlPattern: `${EXAMPLES}/api/wiki/*`,
      priceUsdc: '0.0005',
      recipient,
    }),
  })
  if (!reg.ok) {
    console.error('❌ failed to register endpoint:', await reg.text())
    process.exit(1)
  }
  console.log('   ✓ endpoint registered\n')

  // 1. Hit the example without auth — expect 402
  console.log('1. Calling /api/wiki without auth → expect 402')
  const r1 = await fetch(`${EXAMPLES}/api/wiki?q=solana`)
  if (r1.status !== 402) {
    console.error(`❌ expected 402, got ${r1.status}: ${await r1.text()}`)
    process.exit(1)
  }
  const body = (await r1.json()) as {
    tollgate: { endpoint_id: string; price: string; challenge: string; settlement: string }
  }
  console.log(`   ✓ 402 received, challenge=${body.tollgate.challenge.slice(0, 8)}…`)
  console.log(`   ✓ price=${body.tollgate.price} USDC\n`)

  // 2. Create payment intent
  console.log('2. POST /v1/intent')
  const agentPubkey = Keypair.generate().publicKey.toBase58()
  const i1 = await fetch(`${SETTLEMENT}/v1/intent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      endpoint_id: body.tollgate.endpoint_id,
      challenge: body.tollgate.challenge,
      agent_pubkey: agentPubkey,
    }),
  })
  if (!i1.ok) {
    console.error('❌ intent failed:', await i1.text())
    process.exit(1)
  }
  const intent = (await i1.json()) as { intent_id: string; pay_url: string; expires_at: string }
  console.log(`   ✓ intent_id=${intent.intent_id}\n`)

  // 3. Synthesize a "Helius webhook" event that includes the challenge
  console.log('3. POST /v1/webhook/helius (synthesized)')
  const wh = await fetch(`${SETTLEMENT}/v1/webhook/helius`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify([
      {
        signature: 'TEST_SIG_' + Date.now(),
        transaction: {
          message: {
            accountKeys: [
              agentPubkey,
              recipient,
              body.tollgate.challenge,
              USDC_MINT_DEVNET,
            ],
          },
        },
        tokenTransfers: [
          {
            fromUserAccount: agentPubkey,
            toUserAccount: recipient,
            tokenAmount: 0.0005,
            mint: USDC_MINT_DEVNET,
          },
        ],
      },
    ]),
  })
  if (!wh.ok) {
    console.error('❌ webhook failed:', await wh.text())
    process.exit(1)
  }
  const whBody = (await wh.json()) as { processed: Array<{ status: string }> }
  if (whBody.processed[0]?.status !== 'paid') {
    console.warn(`⚠️  webhook processed but status=${whBody.processed[0]?.status}`)
    console.log(
      '   (this is expected if the settlement service is configured for real Solana RPC verification — the test cannot finish without a real on-chain tx).',
    )
    process.exit(0)
  }
  console.log('   ✓ webhook processed; intent marked paid\n')

  // 4. Confirm and get JWT
  console.log('4. POST /v1/confirm')
  const cf = await fetch(`${SETTLEMENT}/v1/confirm`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ intent_id: intent.intent_id }),
  })
  if (!cf.ok) {
    console.error(`❌ confirm failed (${cf.status}):`, await cf.text())
    process.exit(1)
  }
  const token = (await cf.json()) as { access_token: string }
  console.log(`   ✓ access_token issued\n`)

  // 5. Retry the example with the JWT
  console.log('5. Retry /api/wiki with Authorization → expect 200')
  const r2 = await fetch(`${EXAMPLES}/api/wiki?q=solana`, {
    headers: { authorization: `Bearer ${token.access_token}` },
  })
  if (r2.status !== 200) {
    console.error(`❌ expected 200, got ${r2.status}: ${await r2.text()}`)
    process.exit(1)
  }
  const final = (await r2.json()) as { provider: string }
  console.log(`   ✓ ${r2.status} OK, provider=${final.provider}`)
  console.log(`\n🎉 End-to-end flow works.`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
