/**
 * @tollgate/agent
 *
 * Client-side SDK that lets AI agents auto-pay Tollgate-402 paywalls in
 * Solana USDC.
 *
 * The main export is `withTollgate(fetch, config)`, which returns a
 * fetch-compatible function that transparently handles 402 responses.
 *
 * For LLM tool integrations, see sub-paths:
 *   - @tollgate/agent/anthropic   (Claude tool-use wrapper)
 *   - @tollgate/agent/openai      (OpenAI function-calling wrapper)
 *   - @tollgate/agent/wallet      (wallet helpers)
 */
export { withTollgate } from './withTollgate'
export { TokenCache } from './tokenCache'
export { buildPaymentTransaction, networkFromTollgateBody } from './payment'

// Re-export wallet helpers for convenience.
export { keypairWallet, ephemeralWallet, walletFromBase58 } from './wallet'

// Re-export shared types for ergonomic single-import usage.
export type {
  AgentConfig,
  AgentWallet,
  PaymentInfo,
  Tollgate402Body,
  RevenueSplit,
} from '@tollgate/shared'

export {
  TollgateError,
  PaymentRequiredError,
  BudgetExceededError,
  Invalid402BodyError,
  SettlementError,
} from '@tollgate/shared'
