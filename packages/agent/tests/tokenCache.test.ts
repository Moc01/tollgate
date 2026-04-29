import { USDC_MINT_DEVNET, generateTollgateKeyPair, signAccessToken } from '@tollgate/shared'
import { describe, expect, it } from 'vitest'
import { TokenCache } from '../src/tokenCache'

describe('TokenCache', () => {
  it('stores and retrieves a token by endpointId', async () => {
    const cache = new TokenCache()
    const { privateKeyPem } = await generateTollgateKeyPair()
    const token = await signAccessToken(
      {
        sub: USDC_MINT_DEVNET,
        aud: 'wiki-search-v1',
        jti: 'int_001',
        ttlSeconds: 60,
        tg: { v: '0.1', calls_remaining: 1, tx: '' },
      },
      privateKeyPem,
    )

    cache.set('wiki-search-v1', token)
    expect(cache.get('wiki-search-v1')).toBe(token)
  })

  it('returns undefined for unknown endpoint', () => {
    const cache = new TokenCache()
    expect(cache.get('nope')).toBeUndefined()
  })

  it('expires tokens past their exp claim', async () => {
    const cache = new TokenCache()
    const { privateKeyPem } = await generateTollgateKeyPair()
    const expired = await signAccessToken(
      {
        sub: USDC_MINT_DEVNET,
        aud: 'wiki-search-v1',
        jti: 'int_002',
        iat: Math.floor(Date.now() / 1000) - 100,
        exp: Math.floor(Date.now() / 1000) - 10,
        tg: { v: '0.1', calls_remaining: 1, tx: '' },
      },
      privateKeyPem,
    )

    cache.set('wiki-search-v1', expired)
    expect(cache.get('wiki-search-v1')).toBeUndefined()
  })

  it('clear() removes everything', () => {
    const cache = new TokenCache()
    cache.set('a', 'fake-token-a')
    cache.set('b', 'fake-token-b')
    cache.clear()
    // After clear, even just-set entries should be gone (the fake tokens
    // get the 60s default TTL since they aren't valid JWTs)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
  })

  it('delete() removes specific entry', () => {
    const cache = new TokenCache()
    cache.set('a', 'fake-token-a')
    cache.set('b', 'fake-token-b')
    cache.delete('a')
    expect(cache.get('a')).toBeUndefined()
    // 'b' would still be there until its 60s TTL elapses
  })
})
