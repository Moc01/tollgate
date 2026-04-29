import { describe, expect, it } from 'vitest'
import {
  buildJwks,
  decodeJwtHeader,
  decodeJwtPayloadUnsafe,
  generateTollgateKeyPair,
  signAccessToken,
  verifyAccessTokenWithJwk,
  verifyAccessTokenWithPem,
} from '../src/jwt'

describe('JWT lifecycle', () => {
  it('round-trips: generate → sign → verify (PEM)', async () => {
    const { privateKeyPem, publicKeyPem } = await generateTollgateKeyPair()

    const token = await signAccessToken(
      {
        sub: 'BDqnQuVKx5UZJYMYgz6CfQTcLoT6XYE1qzFKr5jNCcyc',
        aud: 'wiki-search-v1',
        jti: 'int_test_001',
        ttlSeconds: 60,
        tg: { v: '0.1', calls_remaining: 1, tx: 'tx_sig_test' },
      },
      privateKeyPem,
      { kid: 'test-kid' },
    )

    const payload = await verifyAccessTokenWithPem(token, publicKeyPem, {
      audience: 'wiki-search-v1',
    })
    expect(payload.sub).toBe('BDqnQuVKx5UZJYMYgz6CfQTcLoT6XYE1qzFKr5jNCcyc')
    expect(payload.aud).toBe('wiki-search-v1')
    expect(payload.jti).toBe('int_test_001')
    expect(payload.tg.v).toBe('0.1')
    expect(payload.tg.calls_remaining).toBe(1)
    expect(payload.tg.tx).toBe('tx_sig_test')
  })

  it('round-trips via JWKS / JWK', async () => {
    const { privateKeyPem, publicKeyPem } = await generateTollgateKeyPair()
    const jwks = await buildJwks([{ kid: 'k1', publicKeyPem }])
    expect(jwks.keys).toHaveLength(1)
    expect(jwks.keys[0]?.kid).toBe('k1')

    const token = await signAccessToken(
      {
        sub: 'BDqnQuVKx5UZJYMYgz6CfQTcLoT6XYE1qzFKr5jNCcyc',
        aud: 'wiki-search-v1',
        jti: 'int_test_002',
        ttlSeconds: 60,
        tg: { v: '0.1', calls_remaining: 1, tx: 'tx_sig_test' },
      },
      privateKeyPem,
      { kid: 'k1' },
    )

    const jwk = jwks.keys[0]!
    const payload = await verifyAccessTokenWithJwk(token, jwk, {
      audience: 'wiki-search-v1',
    })
    expect(payload.aud).toBe('wiki-search-v1')
  })

  it('fails verification with wrong audience', async () => {
    const { privateKeyPem, publicKeyPem } = await generateTollgateKeyPair()
    const token = await signAccessToken(
      {
        sub: 'BDqnQuVKx5UZJYMYgz6CfQTcLoT6XYE1qzFKr5jNCcyc',
        aud: 'endpoint-A',
        jti: 'int_test_003',
        ttlSeconds: 60,
        tg: { v: '0.1', calls_remaining: 1, tx: '' },
      },
      privateKeyPem,
    )
    await expect(
      verifyAccessTokenWithPem(token, publicKeyPem, { audience: 'endpoint-B' }),
    ).rejects.toThrow()
  })

  it('fails verification with wrong key', async () => {
    const a = await generateTollgateKeyPair()
    const b = await generateTollgateKeyPair()
    const token = await signAccessToken(
      {
        sub: 'BDqnQuVKx5UZJYMYgz6CfQTcLoT6XYE1qzFKr5jNCcyc',
        aud: 'wiki-search-v1',
        jti: 'int_test_004',
        ttlSeconds: 60,
        tg: { v: '0.1', calls_remaining: 1, tx: '' },
      },
      a.privateKeyPem,
    )
    await expect(
      verifyAccessTokenWithPem(token, b.publicKeyPem, { audience: 'wiki-search-v1' }),
    ).rejects.toThrow()
  })

  it('fails verification when expired', async () => {
    const { privateKeyPem, publicKeyPem } = await generateTollgateKeyPair()
    const token = await signAccessToken(
      {
        sub: 'BDqnQuVKx5UZJYMYgz6CfQTcLoT6XYE1qzFKr5jNCcyc',
        aud: 'wiki-search-v1',
        jti: 'int_test_005',
        iat: Math.floor(Date.now() / 1000) - 1000,
        exp: Math.floor(Date.now() / 1000) - 60,
        tg: { v: '0.1', calls_remaining: 1, tx: '' },
      },
      privateKeyPem,
    )
    await expect(
      verifyAccessTokenWithPem(token, publicKeyPem, { audience: 'wiki-search-v1' }),
    ).rejects.toThrow()
  })
})

describe('decodeJwtHeader', () => {
  it('extracts kid and alg from a real signed token', async () => {
    const { privateKeyPem } = await generateTollgateKeyPair()
    const token = await signAccessToken(
      {
        sub: 'BDqnQuVKx5UZJYMYgz6CfQTcLoT6XYE1qzFKr5jNCcyc',
        aud: 'wiki-search-v1',
        jti: 'int_test_006',
        ttlSeconds: 60,
        tg: { v: '0.1', calls_remaining: 1, tx: '' },
      },
      privateKeyPem,
      { kid: 'tg-2026-04' },
    )
    const header = decodeJwtHeader(token)
    expect(header.alg).toBe('EdDSA')
    expect(header.kid).toBe('tg-2026-04')
    expect(header.typ).toBe('JWT')
  })

  it('throws on malformed input', () => {
    expect(() => decodeJwtHeader('not-a-jwt')).toThrow()
  })
})

describe('decodeJwtPayloadUnsafe', () => {
  it('reads payload without verification', async () => {
    const { privateKeyPem } = await generateTollgateKeyPair()
    const token = await signAccessToken(
      {
        sub: 'BDqnQuVKx5UZJYMYgz6CfQTcLoT6XYE1qzFKr5jNCcyc',
        aud: 'wiki-search-v1',
        jti: 'int_test_007',
        ttlSeconds: 60,
        tg: { v: '0.1', calls_remaining: 1, tx: 'sig_007' },
      },
      privateKeyPem,
    )
    const payload = decodeJwtPayloadUnsafe(token)
    expect(payload.aud).toBe('wiki-search-v1')
    expect(payload.tg.tx).toBe('sig_007')
  })
})
