import type { SolanaNetwork } from './constants'

/**
 * The body returned by an endpoint when it needs payment.
 * Wire format documented in `docs/PROTOCOL_SPEC.md` §3.2.
 */
export interface Tollgate402Body {
  tollgate: {
    /** Protocol version, e.g. "0.1" */
    version: string
    /** URL of the settlement service */
    settlement: string
    /** Stable id for the endpoint (used as JWT `aud`) */
    endpoint_id: string
    /** Price as a string to avoid float rounding */
    price: string
    /** Currency, currently always "USDC" */
    currency: 'USDC'
    /** Network: "solana-mainnet" or "solana-devnet" */
    network: `solana-${SolanaNetwork}`
    /** Server-generated nonce; doubles as Solana Pay reference */
    challenge: string
    /** RFC 3339 timestamp when this intent expires */
    expires_at: string
    /** Optional revenue splits */
    splits?: RevenueSplit[]
  }
  error: 'Payment required'
  doc?: string
}

/**
 * A single recipient in a multi-recipient endpoint.
 * `share` is a fractional value where the sum across all entries equals 1.
 */
export interface RevenueSplit {
  /** Solana wallet address (base58) */
  wallet: string
  /** 0 < share <= 1 */
  share: number
}

/**
 * The JWT payload signed by the settlement service.
 * Wire format documented in `docs/PROTOCOL_SPEC.md` §4.
 */
export interface AccessTokenPayload {
  /** Issuer (e.g. "https://tollgate.dev") */
  iss: string
  /** Subject = paying agent's pubkey */
  sub: string
  /** Audience = endpoint_id */
  aud: string
  /** Issued-at (unix seconds) */
  iat: number
  /** Expiration (unix seconds) */
  exp: number
  /** JWT id = intent_id, used for replay prevention */
  jti: string
  /** Tollgate-specific claims */
  tg: {
    /** Protocol version */
    v: string
    /** Calls remaining for this token. Almost always 1 in v0.1. */
    calls_remaining: number
    /** Solana tx signature that paid for this token */
    tx: string
  }
}

/** Internal settlement-side record of a payment intent. */
export interface PaymentIntent {
  id: string
  endpoint_id: string
  challenge: string
  agent_pubkey: string | null
  price_usdc: string
  recipient: string
  splits: RevenueSplit[] | null
  status: IntentStatus
  tx_signature: string | null
  paid_at: string | null
  expires_at: string
  created_at: string
}

export type IntentStatus = 'pending' | 'paid' | 'expired' | 'failed'

/** Configuration object passed to `tollgate()` middleware factory. */
export interface MiddlewareConfig {
  /** Stable, human-readable id for this endpoint */
  endpointId: string
  /** Price per call in USDC (e.g. 0.001) */
  price: number
  /** Recipient wallet (base58). Either this OR `splits` must be provided. */
  recipient?: string
  /** Multi-recipient revenue split. Sum of `share` must equal 1. */
  splits?: RevenueSplit[]
  /** Token lifetime in seconds. Default 300. */
  tokenTtl?: number
  /** Calls allowed per token. Default 1. */
  quotaCalls?: number
  /** Settlement service base URL. Default: env TOLLGATE_SETTLEMENT_URL. */
  settlementUrl?: string
  /** Network. Default: env SOLANA_NETWORK. */
  network?: SolanaNetwork
  /** Optional free-tier rules. */
  freeTier?: {
    /** Allow N calls per IP per day before requiring payment. */
    dailyCalls?: number
  }
}

/** Configuration object passed to `withTollgate(fetch, config)`. */
export interface AgentConfig {
  /** Solana keypair used to sign and pay. */
  wallet: AgentWallet
  /** RPC URL for submitting txs. */
  rpcUrl: string
  /** Network. Default: derived from rpcUrl. */
  network?: SolanaNetwork
  /** Maximum price (USDC) the agent will pay for a single call. */
  maxPricePerCall?: number
  /** Maximum total spend (USDC) for the lifetime of this wrapper. */
  maxTotalSpend?: number
  /** Optional callback fired before each payment is signed. */
  onBeforePayment?: (intent: ClientPaymentIntent) => void | Promise<void>
  /** Optional callback fired after payment is confirmed. */
  onPayment?: (info: PaymentInfo) => void | Promise<void>
  /** Maximum poll attempts when waiting for confirm. Default 30. */
  maxConfirmPolls?: number
  /** Delay between confirm polls in ms. Default 500. */
  confirmPollDelayMs?: number
}

/** Subset of Solana Keypair functionality the agent needs. */
export interface AgentWallet {
  /** Base58 public key */
  publicKey: string
  /** Sign a serialized transaction (returns signature bytes). */
  signTransaction: (txBytes: Uint8Array) => Promise<Uint8Array>
}

/** Information returned to onPayment callback. */
export interface PaymentInfo {
  intentId: string
  endpointId: string
  priceUsdc: string
  txSignature: string
  durationMs: number
}

/** Client-side view of the intent (returned from /v1/intent). */
export interface ClientPaymentIntent {
  intent_id: string
  pay_url: string
  expires_at: string
}

/** Client-side response from /v1/confirm when paid. */
export interface ConfirmResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  tx_signature: string
}

/** Client-side response from /v1/confirm when still pending. */
export interface ConfirmPendingResponse {
  status: 'pending'
  retry_after: number
}

/** Endpoint registration row, used by dashboard. */
export interface EndpointRecord {
  id: string
  owner_id: string
  name: string
  description: string | null
  url_pattern: string
  price_usdc: string
  recipient: string
  splits: RevenueSplit[] | null
  token_ttl: number
  active: boolean
  created_at: string
  updated_at: string
}
