/**
 * Shared in-process store for the settlement service, kept on globalThis so
 * warm Vercel function invocations share state across the /api/v1/* and
 * /api/examples/* route handlers.
 *
 * Pre-seeded with the 5 known example endpoints so settlement answers
 * /v1/intent correctly on the very first request after a cold start (no
 * waiting on examples to POST /v1/endpoints).
 *
 * NOTE: This is sufficient for a single-instance demo. For multi-tenant
 * production we'd swap in PostgresStore.
 */
import type { Store, EndpointRow } from 'settlement/store'

const SEED_ENDPOINTS: Array<Omit<EndpointRow, 'splits'> & { priceDisplay: string }> = [
  { id: 'news-api-v1', owner_id: null, name: 'NewsAPI Pro', description: null, url_pattern: '/api/news*', price_usdc: '0.002', recipient: '', token_ttl: 300, active: true, priceDisplay: '0.002' },
  { id: 'github-search-v1', owner_id: null, name: 'GitHub Search Pro', description: null, url_pattern: '/api/github*', price_usdc: '0.001', recipient: '', token_ttl: 300, active: true, priceDisplay: '0.001' },
  { id: 'wiki-search-v1', owner_id: null, name: 'Wikipedia API', description: null, url_pattern: '/api/wiki*', price_usdc: '0.0005', recipient: '', token_ttl: 300, active: true, priceDisplay: '0.0005' },
  { id: 'arxiv-search-v1', owner_id: null, name: 'ArXiv Premium', description: null, url_pattern: '/api/arxiv*', price_usdc: '0.003', recipient: '', token_ttl: 300, active: true, priceDisplay: '0.003' },
  { id: 'solana-docs-v1', owner_id: null, name: 'Solana Docs Q&A', description: null, url_pattern: '/api/solana-docs*', price_usdc: '0.0005', recipient: '', token_ttl: 300, active: true, priceDisplay: '0.0005' },
]

const GLOBAL_KEY = '__tollgate_inmem_store__'

interface GlobalCache {
  store?: Store
}

function getGlobalCache(): GlobalCache {
  // biome-ignore lint/suspicious/noExplicitAny: globalThis singleton pattern
  const g = globalThis as any
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = {}
  return g[GLOBAL_KEY] as GlobalCache
}

export function ensureSeededStore(InMemoryStoreCtor: new () => Store): Store {
  const cache = getGlobalCache()
  if (cache.store) return cache.store
  const store = new InMemoryStoreCtor()
  const recipient = process.env.EXAMPLES_RECIPIENT_WALLET || '11111111111111111111111111111111'
  for (const ep of SEED_ENDPOINTS) {
    // store.upsertEndpoint expects { ...EndpointRow }
    void store.upsertEndpoint({
      id: ep.id,
      owner_id: null,
      name: ep.name,
      description: null,
      url_pattern: ep.url_pattern,
      price_usdc: ep.price_usdc,
      recipient,
      splits: null,
      token_ttl: ep.token_ttl,
      active: ep.active,
    })
  }
  cache.store = store
  return store
}
