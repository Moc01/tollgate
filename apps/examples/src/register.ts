/**
 * On startup, register all 5 paid endpoints with the settlement service.
 * Idempotent — uses upsert. Without this, the agent's first call gets
 * `endpoint_not_found` from settlement.
 */
const ENDPOINTS = [
  { id: 'news-api-v1', name: 'NewsAPI Pro', urlPattern: '/api/news*', priceUsdc: '0.002' },
  { id: 'github-search-v1', name: 'GitHub Search Pro', urlPattern: '/api/github*', priceUsdc: '0.001' },
  { id: 'wiki-search-v1', name: 'Wikipedia API', urlPattern: '/api/wiki*', priceUsdc: '0.0005' },
  { id: 'arxiv-search-v1', name: 'ArXiv Premium', urlPattern: '/api/arxiv*', priceUsdc: '0.003' },
  { id: 'solana-docs-v1', name: 'Solana Docs Q&A', urlPattern: '/api/solana-docs*', priceUsdc: '0.0005' },
]

export async function registerEndpoints(opts: { settlementUrl: string; recipient: string }) {
  const url = `${opts.settlementUrl.replace(/\/$/, '')}/v1/endpoints`
  let ok = 0
  let fail = 0
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...ep,
          recipient: opts.recipient,
          tokenTtl: 300,
          active: true,
        }),
      })
      if (res.ok) ok++
      else {
        fail++
        console.warn(`  ✗ register ${ep.id}: ${res.status} ${await res.text().catch(() => '')}`)
      }
    } catch (err) {
      fail++
      console.warn(`  ✗ register ${ep.id}:`, (err as Error).message)
    }
  }
  console.log(`📡 Registered ${ok}/${ENDPOINTS.length} endpoints with settlement (${opts.settlementUrl})`)
  if (fail > 0) console.warn(`   (${fail} failed — settlement may not be reachable yet)`)
}
