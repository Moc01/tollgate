import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token'
import {
  ComputeBudgetProgram,
  type Connection,
  type Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js'
import {
  type RevenueSplit,
  type Tollgate402Body,
  USDC_DECIMALS,
  getUsdcMint,
  splitUsdcUnits,
  toUsdcUnits,
} from '@tollgate/shared'

/**
 * Build (but do not submit) a Solana transaction transferring USDC from
 * `payer` to `recipient` (or to multiple recipients per `splits`), with the
 * `reference` public key embedded as a read-only account.
 *
 * Returns the unsigned transaction; caller is expected to sign with the
 * agent's keypair before submitting.
 */
export async function buildPaymentTransaction(params: {
  connection: Connection
  payer: Keypair
  recipient: string
  splits?: RevenueSplit[] | null
  amountUsdc: number | string
  reference: string
  network: 'mainnet-beta' | 'devnet'
  /** Optional priority fee in microlamports per CU. */
  priorityFeeMicroLamports?: number
}): Promise<Transaction> {
  const { connection, payer, amountUsdc, reference, network } = params
  const usdcMint = new PublicKey(getUsdcMint(network))
  const referenceKey = new PublicKey(reference)

  const totalUnits = toUsdcUnits(amountUsdc)

  const tx = new Transaction()

  if (params.priorityFeeMicroLamports) {
    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: params.priorityFeeMicroLamports,
      }),
    )
  }

  // Source ATA (payer's USDC account)
  const fromAta = await getAssociatedTokenAddress(usdcMint, payer.publicKey, false)

  // Compute per-recipient amounts
  const recipients =
    params.splits && params.splits.length > 0
      ? splitUsdcUnits(totalUnits, params.splits)
      : [{ wallet: params.recipient, units: totalUnits }]

  let referenceAttached = false

  for (const r of recipients) {
    const recipientPk = new PublicKey(r.wallet)
    const toAta = await getAssociatedTokenAddress(usdcMint, recipientPk, false)

    // Idempotent ATA creation (in case recipient hasn't received USDC before)
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        payer.publicKey,
        toAta,
        recipientPk,
        usdcMint,
      ),
    )

    const transferIx = createTransferCheckedInstruction(
      fromAta,
      usdcMint,
      toAta,
      payer.publicKey,
      r.units,
      USDC_DECIMALS,
    )

    // Attach the reference key to the FIRST transfer instruction so settlement
    // can find the payment via the Solana Pay reference convention.
    if (!referenceAttached) {
      transferIx.keys.push({ pubkey: referenceKey, isSigner: false, isWritable: false })
      referenceAttached = true
    }

    tx.add(transferIx)
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = payer.publicKey
  // We track these for poll-after-send; web3.js uses them when serializing
  ;(tx as Transaction & { lastValidBlockHeight?: number }).lastValidBlockHeight =
    lastValidBlockHeight

  return tx
}

/**
 * Convenience: derive a Solana network identifier from a Tollgate-402 body.
 */
export function networkFromTollgateBody(body: Tollgate402Body): 'mainnet-beta' | 'devnet' {
  switch (body.tollgate.network) {
    case 'solana-mainnet-beta':
      return 'mainnet-beta'
    case 'solana-devnet':
      return 'devnet'
    default:
      throw new Error(`Unknown network: ${body.tollgate.network}`)
  }
}
