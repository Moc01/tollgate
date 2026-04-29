import {
  type AccessTokenPayload,
  DEFAULT_TOKEN_TTL_SECONDS,
  DEFAULT_TOLLGATE_ISSUER,
  Invalid402BodyError,
  type MiddlewareConfig,
  type RevenueSplit,
  TOLLGATE_PROTOCOL_VERSION,
  type Tollgate402Body,
  assertValidSolanaAddress,
  decodeJwtHeader,
  fetchJwk,
  generateReferenceKey,
  isValidSolanaAddress,
  verifyAccessTokenWithJwk,
} from '@tollgate/shared'
import type { SolanaNetwork } from '@tollgate/shared'

/**
 * Configuration that has been validated and resolved with defaults.
 * Internal type — consumers should pass `MiddlewareConfig` to `tollgate()`.
 */
export interface ResolvedMiddlewareConfig {
  endpointId: string
  price: number
  recipient: string
  splits: RevenueSplit[] | null
  tokenTtl: number
  quotaCalls: number
  settlementUrl: string
  jwksUrl: string
  network: SolanaNetwork
  issuer: string
  freeTier?: { dailyCalls: number }
}

/** Validate and apply defaults to user-provided MiddlewareConfig. */
export function resolveConfig(opts: MiddlewareConfig): ResolvedMiddlewareConfig {
  if (!opts.endpointId || typeof opts.endpointId !== 'string') {
    throw new Invalid402BodyError('endpointId is required')
  }
  if (typeof opts.price !== 'number' || !(opts.price > 0)) {
    throw new Invalid402BodyError('price must be a positive number')
  }
  if (opts.recipient && opts.splits) {
    throw new Invalid402BodyError('Provide either recipient or splits, not both')
  }
  if (!opts.recipient && !opts.splits) {
    throw new Invalid402BodyError('Either recipient or splits is required')
  }

  let recipient: string
  let splits: RevenueSplit[] | null = null

  if (opts.splits) {
    if (opts.splits.length === 0) {
      throw new Invalid402BodyError('splits must not be empty')
    }
    const total = opts.splits.reduce((acc, s) => acc + s.share, 0)
    if (Math.abs(total - 1) > 1e-9) {
      throw new Invalid402BodyError(`splits shares must sum to 1, got ${total}`)
    }
    for (const s of opts.splits) {
      assertValidSolanaAddress(s.wallet, 'split wallet')
    }
    splits = opts.splits
    // Use a canonical placeholder; the real recipients are in splits[].
    // Many wallets need a primary recipient field for the URL; we use the first.
    recipient = opts.splits[0]!.wallet
  } else {
    if (!isValidSolanaAddress(opts.recipient!)) {
      throw new Invalid402BodyError(`Invalid recipient: ${opts.recipient}`)
    }
    recipient = opts.recipient!
  }

  const settlementUrl =
    opts.settlementUrl ?? process.env.TOLLGATE_SETTLEMENT_URL ?? 'https://tollgate.dev/api/settle'

  const network: SolanaNetwork =
    opts.network ?? ((process.env.SOLANA_NETWORK as SolanaNetwork) || 'devnet')

  return {
    endpointId: opts.endpointId,
    price: opts.price,
    recipient,
    splits,
    tokenTtl: opts.tokenTtl ?? DEFAULT_TOKEN_TTL_SECONDS,
    quotaCalls: opts.quotaCalls ?? 1,
    settlementUrl: settlementUrl.replace(/\/$/, ''),
    jwksUrl: `${settlementUrl.replace(/\/$/, '')}/v1/jwks`,
    network,
    issuer: process.env.TOLLGATE_ISSUER ?? DEFAULT_TOLLGATE_ISSUER,
    ...(opts.freeTier ? { freeTier: { dailyCalls: opts.freeTier.dailyCalls ?? 0 } } : {}),
  }
}

/** Result of evaluating an incoming request. */
export type EvaluationResult =
  | { allow: true; payload: AccessTokenPayload }
  | { allow: false; status: 402; body: Tollgate402Body; headers: Record<string, string> }
  | { allow: false; status: 401; body: { error: string }; headers: Record<string, string> }

export interface EvaluationInput {
  /** The full Authorization header, or the bearer value, or undefined. */
  authHeader?: string | null | undefined
  /** Used for free-tier accounting (optional). */
  ipAddress?: string | null | undefined
}

/**
 * Core entrypoint. Evaluate an incoming request against a resolved config.
 * Framework adapters (Hono/Express/Next/Node) wrap this function.
 */
export async function evaluateRequest(
  input: EvaluationInput,
  config: ResolvedMiddlewareConfig,
): Promise<EvaluationResult> {
  const tokenString = extractBearer(input.authHeader)

  // No token: emit 402.
  if (!tokenString) {
    return build402(config)
  }

  // Try to verify token.
  try {
    const header = decodeJwtHeader(tokenString)
    const kid = header.kid
    if (!kid) {
      // Tokens without kid are invalid in v0.1.
      return {
        allow: false,
        status: 401,
        body: { error: 'invalid_token' },
        headers: { 'cache-control': 'no-store' },
      }
    }

    const jwk = await fetchJwk(config.jwksUrl, kid)
    const payload = await verifyAccessTokenWithJwk(tokenString, jwk, {
      audience: config.endpointId,
      issuer: config.issuer,
    })

    return { allow: true, payload }
  } catch (err) {
    // Any verify failure → 401 with descriptive code if available.
    const code = (err as { code?: string }).code ?? 'invalid_token'
    return {
      allow: false,
      status: 401,
      body: { error: code },
      headers: { 'cache-control': 'no-store' },
    }
  }
}

/** Extract bearer token from an Authorization header. */
export function extractBearer(authHeader?: string | null | undefined): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

/** Build a fresh 402 response body. */
function build402(config: ResolvedMiddlewareConfig): EvaluationResult {
  const challenge = generateReferenceKey()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min default

  const body: Tollgate402Body = {
    tollgate: {
      version: TOLLGATE_PROTOCOL_VERSION,
      settlement: config.settlementUrl,
      endpoint_id: config.endpointId,
      price: String(config.price),
      currency: 'USDC',
      network: `solana-${config.network}`,
      challenge,
      expires_at: expiresAt,
      ...(config.splits ? { splits: config.splits } : {}),
    },
    error: 'Payment required',
    doc: 'https://tollgate.dev/docs',
  }

  return {
    allow: false,
    status: 402,
    body,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'tollgate-version': TOLLGATE_PROTOCOL_VERSION,
    },
  }
}
