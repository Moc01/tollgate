import Link from 'next/link'
import { getOverview, listEndpoints } from '@/lib/api'
import { formatUsdc, truncateAddress } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [stats, endpoints] = await Promise.all([getOverview(), listEndpoints()])

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          Your <span className="gradient-text">paid APIs</span>
        </h1>
        <p className="mt-2 text-muted">
          Register an HTTP endpoint, choose a price in USDC, watch agents pay and call.
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total settled" value={formatUsdc(stats.totalUsdc)} accent="accent2" />
        <StatCard label="Total calls" value={stats.totalCalls.toLocaleString()} />
        <StatCard label="Active endpoints" value={String(stats.activeEndpoints)} />
        <StatCard label="Total endpoints" value={String(stats.totalEndpoints)} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Endpoints</h2>
        </div>

        {endpoints.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted bg-bg">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Endpoint</th>
                  <th className="text-left px-4 py-3 font-medium">Recipient</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep) => (
                  <tr key={ep.id} className="border-t border-border hover:bg-bg/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/e/${encodeURIComponent(ep.id)}`}
                        className="font-mono text-text hover:underline"
                      >
                        {ep.id}
                      </Link>
                      <div className="text-xs text-muted">{ep.name}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted text-xs">
                      {ep.splits ? `${ep.splits.length}-way split` : truncateAddress(ep.recipient)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatUsdc(ep.price_usdc)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ep.active ? (
                        <span className="text-accent2 text-xs">●&nbsp;active</span>
                      ) : (
                        <span className="text-muted text-xs">○&nbsp;inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'accent' | 'accent2'
}) {
  const valueColor = accent === 'accent2' ? 'text-accent2' : 'text-text'
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-surface p-10 text-center">
      <div className="text-lg font-semibold">No endpoints yet</div>
      <p className="text-muted mt-1 text-sm">
        Register your first paid API in 30 seconds.
      </p>
      <Link
        href="/new"
        className="inline-block mt-4 px-4 py-2 rounded-md bg-accent hover:opacity-90 text-sm font-medium transition-opacity"
      >
        + New endpoint
      </Link>
    </div>
  )
}
