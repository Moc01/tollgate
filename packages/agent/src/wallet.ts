import { Keypair, type Transaction, type VersionedTransaction } from '@solana/web3.js'
import type { AgentWallet } from '@tollgate/shared'
import bs58 from 'bs58'

/**
 * Wrap a Solana Keypair as an AgentWallet.
 *
 * The wallet exposes the public key and a signTransaction function that
 * returns the transaction signature (raw bytes).
 */
export function keypairWallet(keypair: Keypair): AgentWallet & { keypair: Keypair } {
  return {
    publicKey: keypair.publicKey.toBase58(),
    keypair,
    async signTransaction(txBytes: Uint8Array): Promise<Uint8Array> {
      // We deserialize, sign, and re-serialize. The caller only needs the
      // serialized signed transaction; we return that.
      const { Transaction, VersionedTransaction } = await import('@solana/web3.js')
      // Try VersionedTransaction first (newer format)
      try {
        const vtx = VersionedTransaction.deserialize(txBytes)
        vtx.sign([keypair])
        return vtx.serialize()
      } catch {
        // Fall back to legacy
        const tx = Transaction.from(txBytes)
        tx.partialSign(keypair)
        return tx.serialize({ requireAllSignatures: false, verifySignatures: false })
      }
    },
  }
}

/** Create an ephemeral Solana Keypair wallet (useful for tests). */
export function ephemeralWallet(): AgentWallet & { keypair: Keypair } {
  return keypairWallet(Keypair.generate())
}

/**
 * Build an AgentWallet from a base58-encoded secret key string.
 * Accepts either a 64-byte secret (full Solana keypair) or a 32-byte seed.
 */
export function walletFromBase58(secret: string): AgentWallet & { keypair: Keypair } {
  const bytes = bs58.decode(secret)
  if (bytes.length === 64) {
    return keypairWallet(Keypair.fromSecretKey(bytes))
  }
  if (bytes.length === 32) {
    return keypairWallet(Keypair.fromSeed(bytes))
  }
  throw new Error(`Invalid secret length ${bytes.length}; expected 32 or 64`)
}

/** Sign a Solana transaction in-place using the keypair, returning signed tx bytes. */
export async function signTransactionWithKeypair(
  tx: Transaction | VersionedTransaction,
  keypair: Keypair,
): Promise<Uint8Array> {
  const { VersionedTransaction } = await import('@solana/web3.js')
  if (tx instanceof VersionedTransaction) {
    tx.sign([keypair])
    return tx.serialize()
  }
  // Legacy Transaction
  ;(tx as Transaction).partialSign(keypair)
  return (tx as Transaction).serialize({ requireAllSignatures: false, verifySignatures: false })
}
