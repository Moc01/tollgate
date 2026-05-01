'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface DailyPoint {
  day: string
  usdc: number
  calls: number
}

export function RevenueChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-sm text-muted text-center">
        No revenue data yet.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14F195" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#14F195" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              stroke="#777783"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#777783"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(3)}`}
            />
            <Tooltip
              contentStyle={{
                background: '#111114',
                border: '1px solid #1f1f25',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name) => {
                if (name === 'usdc') return [`$${value.toFixed(6)} USDC`, 'Revenue']
                if (name === 'calls') return [value, 'Calls']
                return [value, name]
              }}
            />
            <Area
              type="monotone"
              dataKey="usdc"
              stroke="#14F195"
              fill="url(#revGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
