import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getEndpoint, getEndpointCalls, getEndpointStats } from '@/lib/api'
import { formatTime, formatUsdc, truncateAddress } from '@/lib/format'
import { RevenueChart } from '@/components/RevenueChart'

export const dynamic = 'force-dynamic'

export default async function EndpointDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const decoded = decodeURIComponent(id)
  const endpoint = await getEndpoint(decoded)
  if (!endpoint) notFound()

  const [stats, calls] = await Promise.all([
    getEndpointStats(decoded),
    getEndpointCalls(decoded, 50),
  ])

  return (
    <div className="space-y-10">
      <section>
        <Link href="/" className="text-sm text-muted hover:text-text">
          ← Back
        </Link>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight font-mono">{endpoint.id}</h1>
            <p className="mt-1 text-muted">{endpoint.name}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums">
              {formatUsdc(endpoint.price_usdc)}
            </div>
            <div className="text-xs text-muted">per call</div>
          </div>
        </div>
        {endpoint.description && (
          <p className="mt-3 text-sm text-muted max-w-2xl">{endpoint.description}</p>
        )}
      </section>

      <section className="grid grid-cols-3 gap-4">
        <Stat label="Total settled" value={formatUsdc(stats.totalUsdc)} accent="accent2" />
        <Stat label="Total calls" value={stats.totalCalls.toLocaleString()} />
        <Stat label="Unique callers" value={String(stats.uniqueCallers)} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Daily revenue</h2>
        <RevenueChart data={stats.daily} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent calls</h2>
          {calls.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted text-center">
              No calls yet. Try hitting the endpoint with{' '}
              <code className="text-text">@tollgate/agent</code>.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full text-xs">
                <thead className="text-muted">
                  <tr className="bg-bg">
                    <th className="text-left px-3 py-2 font-medium">Agent</th>
                    <th className="text-right px-3 py-2 font-medium">Paid</th>
                    <th className="text-right px-3 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-mono">
                        {truncateAddress(c.agentPubkey)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatUsdc(c.priceUsdc)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted">
                        {formatTime(c.calledAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Top callers</h2>
          {stats.topCallers.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted text-center">
              No data yet.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full text-xs">
                <thead className="text-muted">
                  <tr className="bg-bg">
                    <th className="text-left px-3 py-2 font-medium">Agent</th>
                    <th className="text-right px-3 py-2 font-medium">Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topCallers.map((c) => (
                    <tr key={c.agent} className="border-t border-border">
                      <td className="px-3 py-2 font-mono">{truncateAddress(c.agent)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Configuration</h2>
        <dl className="rounded-xl border border-border bg-surface divide-y divide-border text-sm">
          <Row label="URL pattern" value={endpoint.url_pattern} mono />
          <Row label="Price" value={`${formatUsdc(endpoint.price_usdc)} / call`} />
          <Row label="Token TTL" value={`${endpoint.token_ttl}s`} />
          {endpoint.splits ? (
            <Row
              label="Recipients"
              value={
                <ul className="space-y-1 text-xs font-mono">
                  {endpoint.splits.map((s, i) => (
                    <li key={i}>
                      {truncateAddress(s.wallet)} — {(s.share * 100).toFixed(0)}%
                    </li>
                  ))}
                </ul>
              }
            />
          ) : (
            <Row label="Recipient" value={endpoint.recipient} mono />
          )}
          <Row label="Status" value={endpoint.active ? 'active' : 'inactive'} />
        </dl>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'accent2'
}) {
  const valueColor = accent === 'accent2' ? 'text-accent2' : 'text-text'
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}
