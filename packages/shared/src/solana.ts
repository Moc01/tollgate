import { PublicKey } from '@solana/web3.js'
import BigNumber from 'bignumber.js'
import { USDC_DECIMALS, USDC_MINTS, type SolanaNetwork } from './constants'

/**
 * Re-export USDC mint addresses for convenience.
 * Use `getUsdcMint(network)` to look up by network name.
 */
export const USDC_MINT_MAINNET = USDC_MINTS['mainnet-beta']
export const USDC_MINT_DEVNET = USDC_MINTS.devnet

/** Get the USDC mint address for a given network. */
export function getUsdcMint(network: SolanaNetwork): string {
  return USDC_MINTS[network]
}

/** Detect the network for a given USDC mint address. Returns null if unknown. */
export function networkFromUsdcMint(mint: string): SolanaNetwork | null {
  if (mint === USDC_MINTS['mainnet-beta']) return 'mainnet-beta'
  if (mint === USDC_MINTS.devnet) return 'devnet'
  return null
}

/** Validate a base58 Solana address by attempting to construct a PublicKey. */
export function isValidSolanaAddress(addr: unknown): addr is string {
  if (typeof addr !== 'string') return false
  if (addr.length < 32 || addr.length > 44) return false
  try {
    // PublicKey constructor throws on invalid base58 / wrong length
    new PublicKey(addr)
    return true
  } catch {
    return false
  }
}

/** Throw if the given address is not a valid Solana address. */
export function assertValidSolanaAddress(addr: unknown, label = 'address'): asserts addr is string {
  if (!isValidSolanaAddress(addr)) {
    throw new Error(`Invalid Solana ${label}: ${String(addr)}`)
  }
}

/**
 * Convert a USDC amount in human form (e.g. 0.001) to an SPL token amount in
 * smallest units (bigint). USDC has 6 decimals.
 *
 * `0.001 USDC` → `1000n`
 * `1 USDC`     → `1000000n`
 */
export function toUsdcUnits(usdc: number | string): bigint {
  const bn = new BigNumber(usdc)
  if (bn.isNaN() || bn.isNegative()) {
    throw new Error(`Invalid USDC amount: ${usdc}`)
  }
  const units = bn.shiftedBy(USDC_DECIMALS)
  if (!units.isInteger()) {
    throw new Error(`USDC amount has more than ${USDC_DECIMALS} decimals: ${usdc}`)
  }
  return BigInt(units.toFixed(0))
}

/**
 * Convert SPL token amount in smallest units (bigint) to a human-readable string.
 *
 * `1000n`    → `"0.001"`
 * `1000000n` → `"1"`
 */
export function fromUsdcUnits(units: bigint | number): string {
  const bn = new BigNumber(units.toString())
  return bn.shiftedBy(-USDC_DECIMALS).toFixed()
}

/** Compute revenue split amounts in smallest units, ensuring exact sum. */
export function splitUsdcUnits(
  totalUnits: bigint,
  splits: { wallet: string; share: number }[],
): { wallet: string; units: bigint }[] {
  if (splits.length === 0) {
    throw new Error('Cannot split with empty splits array')
  }
  const totalShare = splits.reduce((acc, s) => acc + s.share, 0)
  if (Math.abs(totalShare - 1) > 1e-9) {
    throw new Error(`Splits must sum to 1, got ${totalShare}`)
  }

  const result: { wallet: string; units: bigint }[] = []
  let remaining = totalUnits

  for (let i = 0; i < splits.length - 1; i++) {
    const split = splits[i]!
    const portionBn = new BigNumber(totalUnits.toString())
      .multipliedBy(split.share)
      .integerValue(BigNumber.ROUND_FLOOR)
    const units = BigInt(portionBn.toFixed(0))
    result.push({ wallet: split.wallet, units })
    remaining -= units
  }

  // Last split absorbs any rounding remainder so the sum is exact.
  const last = splits[splits.length - 1]!
  result.push({ wallet: last.wallet, units: remaining })
  return result
}

/** Build the Solana Pay URL for a single-recipient transfer of USDC. */
export function buildSolanaPayUrl(params: {
  recipient: string
  amount: number | string
  splToken: string
  reference: string
  label?: string
  message?: string
  memo?: string
}): string {
  const u = new URL(`solana:${params.recipient}`)
  u.searchParams.set('amount', String(params.amount))
  u.searchParams.set('spl-token', params.splToken)
  u.searchParams.set('reference', params.reference)
  if (params.label) u.searchParams.set('label', params.label)
  if (params.message) u.searchParams.set('message', params.message)
  if (params.memo) u.searchParams.set('memo', params.memo)
  return u.toString()
}

/**
 * Generate a fresh Solana Pay reference public key (used as the `challenge`
 * in 402 bodies). The bytes are random; we surface a base58 string.
 */
export function generateReferenceKey(): string {
  // Use crypto.getRandomValues to derive a 32-byte pubkey-shaped value.
  // We don't need this to be a real secret-derived pubkey; it just needs
  // to be a unique base58 32-byte value to embed in the Solana tx.
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return new PublicKey(bytes).toBase58()
}
