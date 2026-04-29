/**
 * Protocol version. Bumped on incompatible changes.
 * Minor (0.1, 0.2, ...) bumps are additive; agents on 0.1 talk to endpoints on 0.2.
 * Major bumps may break compatibility.
 */
export const TOLLGATE_PROTOCOL_VERSION = '0.1' as const

/** Default access token lifetime in seconds. */
export const DEFAULT_TOKEN_TTL_SECONDS = 300

/** Default payment intent lifetime in seconds. */
export const DEFAULT_INTENT_TTL_SECONDS = 600

/** Default agent budget guard (USDC) per single API call. */
export const DEFAULT_MAX_PRICE_PER_CALL_USDC = 0.01

/** Default agent budget guard (USDC) per session. */
export const DEFAULT_MAX_TOTAL_SPEND_USDC = 1.0

/** Default rate limit for /v1/intent per IP. */
export const DEFAULT_INTENT_RATE_LIMIT_PER_MINUTE = 10

/** USDC mint has 6 decimals (1 USDC = 1_000_000 smallest units). */
export const USDC_DECIMALS = 6

/** USDC mint addresses. */
export const USDC_MINTS = {
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
} as const

export type SolanaNetwork = keyof typeof USDC_MINTS

/** Default issuer claim for Tollgate-issued JWTs. */
export const DEFAULT_TOLLGATE_ISSUER = 'https://tollgate.dev'

/** JWT algorithm used by Tollgate. */
export const TOLLGATE_JWT_ALGORITHM = 'EdDSA' as const

/** User-Agent prefix used by `@tollgate/agent`. */
export const TOLLGATE_AGENT_USER_AGENT_PREFIX = 'Tollgate-Agent'

/** HTTP header used to carry the protocol version on responses. */
export const TOLLGATE_VERSION_HEADER = 'Tollgate-Version'
