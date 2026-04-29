import {
  CompactSign,
  type JWK,
  type JWTPayload,
  type KeyLike,
  SignJWT,
  exportJWK,
  exportPKCS8,
  exportSPKI,
  generateKeyPair,
  importJWK,
  importPKCS8,
  importSPKI,
  jwtVerify,
} from 'jose'
import {
  DEFAULT_TOKEN_TTL_SECONDS,
  DEFAULT_TOLLGATE_ISSUER,
  TOLLGATE_JWT_ALGORITHM,
  TOLLGATE_PROTOCOL_VERSION,
} from './constants'
import { InvalidTokenError, TokenExpiredError } from './errors'
import type { AccessTokenPayload } from './types'

/**
 * Generate a fresh Ed25519 keypair as PEM-encoded strings, suitable for storing
 * in environment variables (PKCS8 for private, SPKI for public).
 *
 * Run once at setup; the result is written into `.env.local` as
 * `TOLLGATE_JWT_PRIVATE_KEY` and `TOLLGATE_JWT_PUBLIC_KEY`.
 */
export async function generateTollgateKeyPair(): Promise<{
  privateKeyPem: string
  publicKeyPem: string
  publicJwk: JWK
}> {
  const { privateKey, publicKey } = await generateKeyPair(TOLLGATE_JWT_ALGORITHM, {
    extractable: true,
  })

  const privateKeyPem = await exportPKCS8(privateKey)
  const publicKeyPem = await exportSPKI(publicKey)
  const publicJwk = await exportJWK(publicKey)

  return { privateKeyPem, publicKeyPem, publicJwk }
}

/** Sign a Tollgate access token. */
export async function signAccessToken(
  payload: Omit<AccessTokenPayload, 'iss' | 'iat' | 'exp'> & {
    iss?: string
    iat?: number
    exp?: number
    ttlSeconds?: number
  },
  privateKeyPem: string,
  options: { kid?: string; issuer?: string } = {},
): Promise<string> {
  const privateKey = await importPKCS8(privateKeyPem, TOLLGATE_JWT_ALGORITHM)
  const now = Math.floor(Date.now() / 1000)
  const issuer = options.issuer ?? payload.iss ?? DEFAULT_TOLLGATE_ISSUER
  const iat = payload.iat ?? now
  const exp = payload.exp ?? iat + (payload.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS)

  const tg: AccessTokenPayload['tg'] = {
    v: payload.tg?.v ?? TOLLGATE_PROTOCOL_VERSION,
    calls_remaining: payload.tg?.calls_remaining ?? 1,
    tx: payload.tg?.tx ?? '',
  }

  const claims: JWTPayload = {
    iss: issuer,
    sub: payload.sub,
    aud: payload.aud,
    jti: payload.jti,
    iat,
    exp,
    tg,
  }

  return new SignJWT(claims)
    .setProtectedHeader({
      alg: TOLLGATE_JWT_ALGORITHM,
      typ: 'JWT',
      ...(options.kid ? { kid: options.kid } : {}),
    })
    .sign(privateKey)
}

/** Verify a Tollgate access token using a PEM-encoded public key. */
export async function verifyAccessTokenWithPem(
  token: string,
  publicKeyPem: string,
  expected: { audience?: string; issuer?: string } = {},
): Promise<AccessTokenPayload> {
  const publicKey = await importSPKI(publicKeyPem, TOLLGATE_JWT_ALGORITHM)
  return verifyAccessTokenWithKey(token, publicKey, expected)
}

/** Verify a Tollgate access token using a JWK (used by middleware via JWKS). */
export async function verifyAccessTokenWithJwk(
  token: string,
  jwk: JWK,
  expected: { audience?: string; issuer?: string } = {},
): Promise<AccessTokenPayload> {
  const publicKey = await importJWK(jwk, TOLLGATE_JWT_ALGORITHM)
  return verifyAccessTokenWithKey(token, publicKey, expected)
}

async function verifyAccessTokenWithKey(
  token: string,
  publicKey: KeyLike | Uint8Array,
  expected: { audience?: string; issuer?: string },
): Promise<AccessTokenPayload> {
  let result
  try {
    result = await jwtVerify(token, publicKey, {
      audience: expected.audience,
      issuer: expected.issuer ?? DEFAULT_TOLLGATE_ISSUER,
      algorithms: [TOLLGATE_JWT_ALGORITHM],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'verify failed'
    if (msg.includes('exp')) throw new TokenExpiredError(msg)
    throw new InvalidTokenError(msg)
  }

  const payload = result.payload as unknown as AccessTokenPayload
  if (!payload.sub || !payload.aud || !payload.jti || !payload.tg) {
    throw new InvalidTokenError('Token missing required claims')
  }
  return payload
}

/**
 * Build a JWKS document from one or more public keys.
 * Settlement publishes this at GET /v1/jwks.
 */
export async function buildJwks(
  keys: { kid: string; publicKeyPem: string }[],
): Promise<{ keys: (JWK & { kid: string; use: 'sig'; alg: 'EdDSA' })[] }> {
  const jwks = await Promise.all(
    keys.map(async ({ kid, publicKeyPem }) => {
      const publicKey = await importSPKI(publicKeyPem, TOLLGATE_JWT_ALGORITHM)
      const jwk = await exportJWK(publicKey)
      return {
        ...jwk,
        kid,
        use: 'sig' as const,
        alg: TOLLGATE_JWT_ALGORITHM,
      }
    }),
  )
  return { keys: jwks }
}

/**
 * Fetch a JWKS document and return the matching JWK for a given kid.
 * Caches results in-process for the duration of `ttlMs`.
 */
const jwksCache = new Map<string, { fetchedAt: number; document: { keys: (JWK & { kid?: string })[] } }>()
const JWKS_CACHE_TTL_MS = 60_000

export async function fetchJwk(jwksUrl: string, kid: string): Promise<JWK> {
  const cached = jwksCache.get(jwksUrl)
  const now = Date.now()
  const isStale = !cached || now - cached.fetchedAt > JWKS_CACHE_TTL_MS

  let document: { keys: (JWK & { kid?: string })[] }
  if (isStale) {
    const res = await fetch(jwksUrl, {
      headers: { accept: 'application/json' },
    })
    if (!res.ok) {
      throw new InvalidTokenError(`Failed to fetch JWKS: ${res.status}`)
    }
    document = (await res.json()) as { keys: (JWK & { kid?: string })[] }
    jwksCache.set(jwksUrl, { fetchedAt: now, document })
  } else {
    document = cached.document
  }

  const match = document.keys.find((k) => k.kid === kid)
  if (!match) {
    throw new InvalidTokenError(`No matching kid "${kid}" in JWKS`)
  }
  return match
}

/** Decode a JWT header without verifying. Used to read the `kid`. */
export function decodeJwtHeader(token: string): { alg?: string; kid?: string; typ?: string } {
  const parts = token.split('.')
  if (parts.length < 2 || !parts[0]) {
    throw new InvalidTokenError('Malformed JWT')
  }
  try {
    const json = base64UrlDecode(parts[0])
    return JSON.parse(json) as { alg?: string; kid?: string; typ?: string }
  } catch {
    throw new InvalidTokenError('Failed to decode JWT header')
  }
}

/** Decode a JWT payload without verifying. Useful for debugging only. */
export function decodeJwtPayloadUnsafe(token: string): AccessTokenPayload {
  const parts = token.split('.')
  if (parts.length < 2 || !parts[1]) {
    throw new InvalidTokenError('Malformed JWT')
  }
  try {
    const json = base64UrlDecode(parts[1])
    return JSON.parse(json) as AccessTokenPayload
  } catch {
    throw new InvalidTokenError('Failed to decode JWT payload')
  }
}

function base64UrlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4)
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad)
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(b64)
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
  }
  // Node fallback
  return Buffer.from(b64, 'base64').toString('utf-8')
}

// Re-export jose's CompactSign for advanced use.
export { CompactSign }
export type { JWK, JWTPayload }
