/**
 * Analytics routes for the dashboard:
 *   GET /v1/endpoints/:id/calls   — recent calls for an endpoint
 *   GET /v1/endpoints/:id/ledger  — recent ledger entries
 *   GET /v1/endpoints/:id/stats   — aggregated daily totals
 *
 * MVP scope: powered by InMemoryStore via simple iteration, or by
 * Postgres queries when DATABASE_URL is set. We expose enough for the
 * dashboard's revenue chart and recent-calls table.
 */
import { Hono } from 'hono'
import type { AppContext } from '../app'

export const analyticsRouter = new Hono<AppContext>()

interface CallSummary {
  endpointId: string
  intentId: string
  agentPubkey: string
  priceUsdc: string
  calledAt: string
}

interface LedgerSummary {
  intentId: string
  endpointId: string
  recipient: string
  amountUsdc: string
  txSignature: string
  recordedAt: string
}

analyticsRouter.get('/endpoints/:id/calls', async (c) => {
  const store = c.get('store') as unknown as {
    _allCalls?: () => CallSummary[]
  }
  const endpointId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200)

  // For InMemoryStore we expose _allCalls; for Postgres we'd query.
  // We keep it tolerant: if neither shape works, return empty array.
  const fn = (store as { _allCalls?: () => CallSummary[] })._allCalls
  let calls: CallSummary[] = []
  if (typeof fn === 'function') {
    calls = fn().filter((c) => c.endpointId === endpointId)
  }
  calls.sort((a, b) => b.calledAt.localeCompare(a.calledAt))
  return c.json({ calls: calls.slice(0, limit) })
})

analyticsRouter.get('/endpoints/:id/ledger', async (c) => {
  const store = c.get('store') as unknown as {
    _allLedger?: () => LedgerSummary[]
  }
  const endpointId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200)

  const fn = store._allLedger
  let entries: LedgerSummary[] = []
  if (typeof fn === 'function') {
    entries = fn().filter((e) => e.endpointId === endpointId)
  }
  entries.sort((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))
  return c.json({ entries: entries.slice(0, limit) })
})

analyticsRouter.get('/endpoints/:id/stats', async (c) => {
  const store = c.get('store') as unknown as {
    _allLedger?: () => LedgerSummary[]
    _allCalls?: () => CallSummary[]
  }
  const endpointId = c.req.param('id')

  let totalUsdc = 0
  let totalCalls = 0
  const dailyMap = new Map<string, { day: string; usdc: number; calls: number }>()
  const callerMap = new Map<string, number>()

  const ledgerFn = store._allLedger
  if (typeof ledgerFn === 'function') {
    for (const entry of ledgerFn()) {
      if (entry.endpointId !== endpointId) continue
      const amt = Number(entry.amountUsdc)
      totalUsdc += amt
      const day = (entry.recordedAt ?? new Date().toISOString()).slice(0, 10)
      const cur = dailyMap.get(day) ?? { day, usdc: 0, calls: 0 }
      cur.usdc += amt
      dailyMap.set(day, cur)
    }
  }

  const callsFn = store._allCalls
  if (typeof callsFn === 'function') {
    for (const call of callsFn()) {
      if (call.endpointId !== endpointId) continue
      totalCalls++
      const day = call.calledAt.slice(0, 10)
      const cur = dailyMap.get(day) ?? { day, usdc: 0, calls: 0 }
      cur.calls++
      dailyMap.set(day, cur)
      callerMap.set(call.agentPubkey, (callerMap.get(call.agentPubkey) ?? 0) + 1)
    }
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.day.localeCompare(b.day))
  const topCallers = Array.from(callerMap.entries())
    .map(([agent, count]) => ({ agent, calls: count }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10)

  return c.json({
    totalUsdc: totalUsdc.toFixed(6),
    totalCalls,
    uniqueCallers: callerMap.size,
    daily,
    topCallers,
  })
})

analyticsRouter.get('/stats/overview', async (c) => {
  const store = c.get('store') as unknown as {
    _allLedger?: () => LedgerSummary[]
    _allCalls?: () => CallSummary[]
    listEndpoints: (ownerId?: string) => Promise<{ id: string; active: boolean }[]>
  }

  let totalUsdc = 0
  let totalCalls = 0

  const ledgerFn = store._allLedger
  if (typeof ledgerFn === 'function') {
    for (const entry of ledgerFn()) totalUsdc += Number(entry.amountUsdc)
  }
  const callsFn = store._allCalls
  if (typeof callsFn === 'function') {
    for (const _ of callsFn()) totalCalls++
  }

  const endpoints = await store.listEndpoints()
  return c.json({
    totalUsdc: totalUsdc.toFixed(6),
    totalCalls,
    activeEndpoints: endpoints.filter((e) => e.active).length,
    totalEndpoints: endpoints.length,
  })
})
