/**
 * Server-side fetch helpers for the dashboard. All calls go to the
 * settlement service via the TOLLGATE_SETTLEMENT_URL env var.
 */
import 'server-only'

const SETTLEMENT_URL = (
  process.env.TOLLGATE_SETTLEMENT_URL ?? 'http://localhost:3001'
).replace(/\/$/, '')

const API_KEY = process.env.TOLLGATE_DASHBOARD_API_KEY

function authHeaders(): Record<string, string> {
  return API_KEY ? { authorization: `Bearer ${API_KEY}` } : {}
}

export interface DashEndpoint {
  id: string
  owner_id: string | null
  name: string
  description: string | null
  url_pattern: string
  price_usdc: string
  recipient: string
  splits: Array<{ wallet: string; share: number }> | null
  token_ttl: number
  active: boolean
}

export interface OverviewStats {
  totalUsdc: string
  totalCalls: number
  activeEndpoints: number
  totalEndpoints: number
}

export interface EndpointStats {
  totalUsdc: string
  totalCalls: number
  uniqueCallers: number
  daily: Array<{ day: string; usdc: number; calls: number }>
  topCallers: Array<{ agent: string; calls: number }>
}

export interface CallRow {
  endpointId: string
  intentId: string
  agentPubkey: string
  priceUsdc: string
  calledAt: string
}

export async function getOverview(): Promise<OverviewStats> {
  const res = await fetch(`${SETTLEMENT_URL}/v1/stats/overview`, {
    cache: 'no-store',
    headers: authHeaders(),
  })
  if (!res.ok) {
    return { totalUsdc: '0', totalCalls: 0, activeEndpoints: 0, totalEndpoints: 0 }
  }
  return (await res.json()) as OverviewStats
}

export async function listEndpoints(): Promise<DashEndpoint[]> {
  const res = await fetch(`${SETTLEMENT_URL}/v1/endpoints`, {
    cache: 'no-store',
    headers: authHeaders(),
  })
  if (!res.ok) return []
  const json = (await res.json()) as { endpoints: DashEndpoint[] }
  return json.endpoints
}

export async function getEndpoint(id: string): Promise<DashEndpoint | null> {
  const res = await fetch(`${SETTLEMENT_URL}/v1/endpoints/${encodeURIComponent(id)}`, {
    cache: 'no-store',
    headers: authHeaders(),
  })
  if (!res.ok) return null
  const json = (await res.json()) as { endpoint: DashEndpoint }
  return json.endpoint
}

export async function getEndpointStats(id: string): Promise<EndpointStats> {
  const res = await fetch(
    `${SETTLEMENT_URL}/v1/endpoints/${encodeURIComponent(id)}/stats`,
    { cache: 'no-store', headers: authHeaders() },
  )
  if (!res.ok) {
    return { totalUsdc: '0', totalCalls: 0, uniqueCallers: 0, daily: [], topCallers: [] }
  }
  return (await res.json()) as EndpointStats
}

export async function getEndpointCalls(id: string, limit = 50): Promise<CallRow[]> {
  const res = await fetch(
    `${SETTLEMENT_URL}/v1/endpoints/${encodeURIComponent(id)}/calls?limit=${limit}`,
    { cache: 'no-store', headers: authHeaders() },
  )
  if (!res.ok) return []
  const json = (await res.json()) as { calls: CallRow[] }
  return json.calls
}

export interface UpsertEndpointInput {
  id: string
  name: string
  description?: string
  urlPattern: string
  priceUsdc: string
  recipient?: string
  splits?: Array<{ wallet: string; share: number }>
  tokenTtl?: number
  active?: boolean
}

export async function upsertEndpoint(input: UpsertEndpointInput): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${SETTLEMENT_URL}/v1/endpoints`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, error: text || `HTTP ${res.status}` }
  }
  return { ok: true }
}
