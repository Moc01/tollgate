/** Format a USDC amount for display: $0.0023 USDC */
export function formatUsdc(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '$0.00'
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(6)}`
}

/** Truncate a Solana address for display: BDqn...cXyZ */
export function truncateAddress(addr: string, head = 4, tail = 4): string {
  if (!addr || addr.length < head + tail + 3) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}

/** Format a Date / ISO string to relative or short absolute. */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
