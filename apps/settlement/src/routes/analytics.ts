/**
 * Analytics routes for the dashboard:
 *   GET /v1/endpoints/:id/calls   — recent calls for an endpoint
 *   GET /v1/endpoints/:id/ledger  — recent ledger entries
 *   GET /v1/endpoints/:id/stats   — aggregated daily totals
 *   GET /v1/stats/overview        — totals across all endpoints
 *
 * MVP scope: powered by InMemoryStore via simple iteration, or by
 * Postgres queries when DATABASE_URL is set. We expose enough for the
 * dashboard's revenue chart and recent-calls table.
 *
 * NOTE: when calling helper methods like `_allCalls`/`_allLedger` on the
 * store, we MUST call them on the store object itself (e.g. `store._allCalls()`)
 * rather than destructuring into a local variable, otherwise `this` is lost
 * and the method throws when accessing instance fields.
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

type StoreWithHelpers = {
  _allCalls?: () => CallSummary[]
  _allLedger?: () => LedgerSummary[]
  listEndpoints: (ownerId?: string) => Promise<{ id: string; active: boolean }[]>
}

analyticsRouter.get('/endpoints/:id/calls', async (c) => {
  const store = c.get('store') as unknown as StoreWithHelpers
  const endpointId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200)

  let calls: CallSummary[] = []
  if (typeof store._allCalls === 'function') {
    calls = store._allCalls().filter((row) => row.endpointId === endpointId)
  }
  calls.sort((a, b) => b.calledAt.localeCompare(a.calledAt))
  return c.json({ calls: calls.slice(0, limit) })
})

analyticsRouter.get('/endpoints/:id/ledger', async (c) => {
  const store = c.get('store') as unknown as StoreWithHelpers
  const endpointId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200)

  let entries: LedgerSummary[] = []
  if (typeof store._allLedger === 'function') {
    entries = store._allLedger().filter((e) => e.endpointId === endpointId)
  }
  entries.sort((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))
  return c.json({ entries: entries.slice(0, limit) })
})

analyticsRouter.get('/endpoints/:id/stats', async (c) => {
  const store = c.get('store') as unknown as StoreWithHelpers
  const endpointId = c.req.param('id')

  let totalUsdc = 0
  let totalCalls = 0
  const dailyMap = new Map<string, { day: string; usdc: number; calls: number }>()
  const callerMap = new Map<string, number>()

  if (typeof store._allLedger === 'function') {
    for (const entry of store._allLedger()) {
      if (entry.endpointId !== endpointId) continue
      const amt = Number(entry.amountUsdc)
      totalUsdc += amt
      const day = (entry.recordedAt ?? new Date().toISOString()).slice(0, 10)
      const cur = dailyMap.get(day) ?? { day, usdc: 0, calls: 0 }
      cur.usdc += amt
      dailyMap.set(day, cur)
    }
  }

  if (typeof store._allCalls === 'function') {
    for (const call of store._allCalls()) {
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
  const store = c.get('store') as unknown as StoreWithHelpers

  let totalUsdc = 0
  let totalCalls = 0

  if (typeof store._allLedger === 'function') {
    for (const entry of store._allLedger()) totalUsdc += Number(entry.amountUsdc)
  }
  if (typeof store._allCalls === 'function') {
    for (const _ of store._allCalls()) totalCalls++
  }

  const endpoints = await store.listEndpoints()
  return c.json({
    totalUsdc: totalUsdc.toFixed(6),
    totalCalls,
    activeEndpoints: endpoints.filter((e) => e.active).length,
    totalEndpoints: endpoints.length,
  })
})
