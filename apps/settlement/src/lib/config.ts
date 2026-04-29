import {
  DEFAULT_TOLLGATE_ISSUER,
  type SolanaNetwork,
} from '@tollgate/shared'

export interface AppConfig {
  /** Where the settlement service is publicly hosted. */
  baseUrl: string
  /** Issuer claim for issued JWTs. */
  issuer: string
  /** JWT signing key (PKCS8 PEM). */
  jwtPrivateKey: string
  /** JWT public key (SPKI PEM) — for JWKS publishing. */
  jwtPublicKey: string
  /** Active key id. */
  jwtKid: string
  /** Helius webhook secret for HMAC verification. */
  heliusWebhookSecret: string | null
  /** Helius RPC URL for verifying tx independently. */
  heliusRpcUrl: string
  /** Solana network. */
  network: SolanaNetwork
  /** Optional: Postgres connection string. If unset, in-memory store is used. */
  databaseUrl: string | null
}

export function loadConfigFromEnv(): AppConfig {
  return {
    baseUrl: process.env.TOLLGATE_BASE_URL ?? 'http://localhost:3001',
    issuer: process.env.TOLLGATE_ISSUER ?? DEFAULT_TOLLGATE_ISSUER,
    jwtPrivateKey: process.env.TOLLGATE_JWT_PRIVATE_KEY ?? '',
    jwtPublicKey: process.env.TOLLGATE_JWT_PUBLIC_KEY ?? '',
    jwtKid: process.env.TOLLGATE_JWT_KID ?? 'tg-2026-04',
    heliusWebhookSecret: process.env.HELIUS_WEBHOOK_SECRET ?? null,
    heliusRpcUrl:
      process.env.HELIUS_RPC_URL ??
      `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY ?? ''}`,
    network: (process.env.SOLANA_NETWORK as SolanaNetwork | undefined) ?? 'devnet',
    databaseUrl: process.env.DATABASE_URL ?? null,
  }
}

export function assertConfig(config: AppConfig): void {
  if (!config.jwtPrivateKey) {
    throw new Error('TOLLGATE_JWT_PRIVATE_KEY is required (run `pnpm tg:keygen`)')
  }
  if (!config.jwtPublicKey) {
    throw new Error('TOLLGATE_JWT_PUBLIC_KEY is required (run `pnpm tg:keygen`)')
  }
}
