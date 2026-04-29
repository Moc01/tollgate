import { describe, expect, it } from 'vitest'
import {
  assertValidSolanaAddress,
  buildSolanaPayUrl,
  fromUsdcUnits,
  generateReferenceKey,
  getUsdcMint,
  isValidSolanaAddress,
  networkFromUsdcMint,
  splitUsdcUnits,
  toUsdcUnits,
  USDC_MINT_DEVNET,
  USDC_MINT_MAINNET,
} from '../src/solana'

describe('USDC mint constants', () => {
  it('returns the correct mint per network', () => {
    expect(getUsdcMint('mainnet-beta')).toBe(USDC_MINT_MAINNET)
    expect(getUsdcMint('devnet')).toBe(USDC_MINT_DEVNET)
  })

  it('detects network from mint address', () => {
    expect(networkFromUsdcMint(USDC_MINT_MAINNET)).toBe('mainnet-beta')
    expect(networkFromUsdcMint(USDC_MINT_DEVNET)).toBe('devnet')
    expect(networkFromUsdcMint('not-a-real-mint')).toBeNull()
  })
})

describe('isValidSolanaAddress', () => {
  it('accepts valid base58 addresses', () => {
    expect(isValidSolanaAddress(USDC_MINT_MAINNET)).toBe(true)
    expect(isValidSolanaAddress(USDC_MINT_DEVNET)).toBe(true)
  })

  it('rejects invalid input', () => {
    expect(isValidSolanaAddress('hello')).toBe(false)
    expect(isValidSolanaAddress('')).toBe(false)
    expect(isValidSolanaAddress(null)).toBe(false)
    expect(isValidSolanaAddress(undefined)).toBe(false)
    expect(isValidSolanaAddress(123)).toBe(false)
    // Wrong length
    expect(isValidSolanaAddress('11111111')).toBe(false)
  })

  it('assertValidSolanaAddress throws on invalid', () => {
    expect(() => assertValidSolanaAddress('bad', 'recipient')).toThrow(/recipient/)
  })
})

describe('USDC unit conversion', () => {
  it('converts human USDC to smallest units', () => {
    expect(toUsdcUnits(1)).toBe(1_000_000n)
    expect(toUsdcUnits('1')).toBe(1_000_000n)
    expect(toUsdcUnits(0.001)).toBe(1_000n)
    expect(toUsdcUnits('0.000001')).toBe(1n)
    expect(toUsdcUnits(0)).toBe(0n)
  })

  it('rejects negative or NaN amounts', () => {
    expect(() => toUsdcUnits(-1)).toThrow()
    expect(() => toUsdcUnits('not-a-number')).toThrow()
  })

  it('rejects amounts with too many decimals', () => {
    expect(() => toUsdcUnits('0.0000001')).toThrow(/decimals/)
  })

  it('round-trips human → units → human', () => {
    expect(fromUsdcUnits(1_000_000n)).toBe('1')
    expect(fromUsdcUnits(1_000n)).toBe('0.001')
    expect(fromUsdcUnits(1n)).toBe('0.000001')
  })
})

describe('splitUsdcUnits', () => {
  it('splits exactly when shares are clean', () => {
    const result = splitUsdcUnits(1_000_000n, [
      { wallet: 'A', share: 0.7 },
      { wallet: 'B', share: 0.2 },
      { wallet: 'C', share: 0.1 },
    ])
    expect(result.map((r) => r.units)).toEqual([700_000n, 200_000n, 100_000n])
  })

  it('absorbs rounding remainder into the last split', () => {
    const result = splitUsdcUnits(1n, [
      { wallet: 'A', share: 0.5 },
      { wallet: 'B', share: 0.5 },
    ])
    // 1 cannot split evenly; expect [0, 1] (last absorbs)
    const sum = result.reduce((acc, r) => acc + r.units, 0n)
    expect(sum).toBe(1n)
  })

  it('rejects splits that do not sum to 1', () => {
    expect(() =>
      splitUsdcUnits(1_000n, [
        { wallet: 'A', share: 0.6 },
        { wallet: 'B', share: 0.3 }, // sums to 0.9
      ]),
    ).toThrow(/sum to 1/)
  })

  it('rejects empty splits', () => {
    expect(() => splitUsdcUnits(100n, [])).toThrow(/empty/)
  })
})

describe('buildSolanaPayUrl', () => {
  it('builds a valid solana: URL', () => {
    const url = buildSolanaPayUrl({
      recipient: USDC_MINT_DEVNET, // any valid pubkey works for the test
      amount: '0.001',
      splToken: USDC_MINT_DEVNET,
      reference: USDC_MINT_DEVNET,
      label: 'Tollgate',
      memo: 'wiki-search-v1',
    })
    expect(url.startsWith('solana:')).toBe(true)
    expect(url).toContain('amount=0.001')
    expect(url).toContain('spl-token=')
    expect(url).toContain('reference=')
    expect(url).toContain('label=Tollgate')
    expect(url).toContain('memo=wiki-search-v1')
  })
})

describe('generateReferenceKey', () => {
  it('returns a valid base58 Solana address each call', () => {
    const a = generateReferenceKey()
    const b = generateReferenceKey()
    expect(isValidSolanaAddress(a)).toBe(true)
    expect(isValidSolanaAddress(b)).toBe(true)
    expect(a).not.toBe(b)
  })
})
