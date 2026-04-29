/**
 * @tollgate/shared
 *
 * Foundation package for the Tollgate protocol.
 * Pure TypeScript types, JWT utilities, Solana helpers, and DB schema.
 *
 * Re-exports are organized by topic. Sub-path imports (e.g.
 * `@tollgate/shared/jwt`) are also supported.
 */

// Constants
export * from './constants'

// Types
export type {
  Tollgate402Body,
  RevenueSplit,
  AccessTokenPayload,
  PaymentIntent,
  IntentStatus,
  MiddlewareConfig,
  AgentConfig,
  AgentWallet,
  PaymentInfo,
  ClientPaymentIntent,
  ConfirmResponse,
  ConfirmPendingResponse,
  EndpointRecord,
} from './types'

// Errors
export {
  TollgateError,
  PaymentRequiredError,
  InvalidIntentError,
  BudgetExceededError,
  TokenExpiredError,
  InvalidTokenError,
  PaymentMismatchError,
  IntentExpiredError,
  IntentConsumedError,
  Invalid402BodyError,
  SettlementError,
} from './errors'

// JWT (also accessible via @tollgate/shared/jwt for tree-shaking)
export {
  generateTollgateKeyPair,
  signAccessToken,
  verifyAccessTokenWithPem,
  verifyAccessTokenWithJwk,
  buildJwks,
  fetchJwk,
  decodeJwtHeader,
  decodeJwtPayloadUnsafe,
} from './jwt'

// Solana (also accessible via @tollgate/shared/solana)
export {
  USDC_MINT_MAINNET,
  USDC_MINT_DEVNET,
  getUsdcMint,
  networkFromUsdcMint,
  isValidSolanaAddress,
  assertValidSolanaAddress,
  toUsdcUnits,
  fromUsdcUnits,
  splitUsdcUnits,
  buildSolanaPayUrl,
  generateReferenceKey,
} from './solana'
