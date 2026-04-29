import { decodeJwtPayloadUnsafe } from '@tollgate/shared'

/**
 * In-memory cache of access tokens, keyed by `endpoint_id`.
 * Tokens expire on their `exp` claim minus a small safety margin.
 */
const SAFETY_MARGIN_MS = 5_000

interface CacheEntry {
  token: string
  expiresAtMs: number
}

export class TokenCache {
  private cache = new Map<string, CacheEntry>()

  /** Get a still-valid token for the given endpoint, or undefined. */
  get(endpointId: string): string | undefined {
    const entry = this.cache.get(endpointId)
    if (!entry) return undefined
    if (Date.now() + SAFETY_MARGIN_MS >= entry.expiresAtMs) {
      this.cache.delete(endpointId)
      return undefined
    }
    return entry.token
  }

  /** Store a token. Expiration is read from the JWT's `exp` claim. */
  set(endpointId: string, token: string): void {
    try {
      const payload = decodeJwtPayloadUnsafe(token)
      const expMs = (payload.exp ?? 0) * 1000
      this.cache.set(endpointId, { token, expiresAtMs: expMs })
    } catch {
      // If we can't decode, store with a short default TTL (60s).
      this.cache.set(endpointId, { token, expiresAtMs: Date.now() + 60_000 })
    }
  }

  /** Remove an entry (e.g. when the server says the token is no longer valid). */
  delete(endpointId: string): void {
    this.cache.delete(endpointId)
  }

  clear(): void {
    this.cache.clear()
  }
}
