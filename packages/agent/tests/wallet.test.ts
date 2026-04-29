import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import { describe, expect, it } from 'vitest'
import { ephemeralWallet, keypairWallet, walletFromBase58 } from '../src/wallet'

describe('wallet helpers', () => {
  it('keypairWallet exposes pubkey and signs', () => {
    const kp = Keypair.generate()
    const w = keypairWallet(kp)
    expect(w.publicKey).toBe(kp.publicKey.toBase58())
    expect(typeof w.signTransaction).toBe('function')
    expect(w.keypair).toBe(kp)
  })

  it('ephemeralWallet generates a fresh wallet each time', () => {
    const a = ephemeralWallet()
    const b = ephemeralWallet()
    expect(a.publicKey).not.toBe(b.publicKey)
  })

  it('walletFromBase58 accepts a 64-byte secret', () => {
    const kp = Keypair.generate()
    const secret = bs58.encode(kp.secretKey)
    const w = walletFromBase58(secret)
    expect(w.publicKey).toBe(kp.publicKey.toBase58())
  })

  it('walletFromBase58 accepts a 32-byte seed', () => {
    const seed = new Uint8Array(32)
    for (let i = 0; i < 32; i++) seed[i] = i
    const w = walletFromBase58(bs58.encode(seed))
    // Same seed must yield same pubkey
    const w2 = walletFromBase58(bs58.encode(seed))
    expect(w.publicKey).toBe(w2.publicKey)
  })

  it('walletFromBase58 rejects wrong-length input', () => {
    expect(() => walletFromBase58(bs58.encode(new Uint8Array(16)))).toThrow(/length/)
  })
})
