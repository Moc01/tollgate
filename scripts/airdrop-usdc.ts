#!/usr/bin/env tsx
/**
 * Airdrop devnet USDC to a wallet for local testing.
 *
 * Devnet USDC (mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU) is freely
 * mintable via faucets. The USDC team operates one at:
 *   https://faucet.circle.com/
 *
 * For automation, we mint to the wallet stored in `~/.config/solana/devnet.json`
 * (the Solana CLI default) by calling the Circle faucet API.
 *
 * Usage: pnpm tg:airdrop-usdc [--wallet <pubkey>]
 */
import { execSync } from 'node:child_process'

const FAUCET_URL = 'https://faucet.circle.com/api/sendUsdc'

async function main() {
  let wallet = process.argv.find((arg) => arg.startsWith('--wallet='))?.split('=')[1]

  if (!wallet) {
    try {
      wallet = execSync('solana address').toString().trim()
    } catch {
      console.error(
        '❌ Could not determine wallet. Set SOLANA_KEYPAIR or pass --wallet=<pubkey>.',
      )
      process.exit(1)
    }
  }

  console.log(`💧 Requesting devnet USDC airdrop to: ${wallet}`)

  try {
    const res = await fetch(FAUCET_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        destinationWallet: wallet,
        chain: 'SOL',
        usdcAmount: '10',
      }),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error(`❌ Faucet returned ${res.status}: ${txt}`)
      console.log('')
      console.log('💡 Manual alternative: visit https://faucet.circle.com/')
      process.exit(1)
    }

    const json = (await res.json()) as { success?: boolean; transactionHash?: string }
    if (json.success) {
      console.log(`✅ 10 USDC airdropped`)
      if (json.transactionHash) {
        console.log(`   tx: https://explorer.solana.com/tx/${json.transactionHash}?cluster=devnet`)
      }
    } else {
      console.warn('⚠️  Faucet response did not indicate success:', json)
    }
  } catch (err) {
    console.error('❌ Faucet request failed:', err)
    console.log('')
    console.log('💡 Manual alternative: visit https://faucet.circle.com/')
    process.exit(1)
  }
}

main()
