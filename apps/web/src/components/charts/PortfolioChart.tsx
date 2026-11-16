'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

export type ChartPoint = { date: string; value: number }

const shortDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function PortfolioChart({
  data,
  currency = 'USD',
  label = 'Portfolio value over time',
  height = 224,
}: {
  data: ChartPoint[]
  currency?: string
  label?: string
  height?: number
}) {
  return (
    <div className="w-full" style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pvArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#facc15" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#232a45" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} stroke="#5b6385" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#5b6385"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={56}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => formatCurrency(v, currency, { maximumFractionDigits: 0 })}
          />
          <Tooltip
            contentStyle={{ background: '#121624', border: '1px solid #232a45', borderRadius: 12, color: '#f4f5f9' }}
            labelFormatter={(l) => shortDate(String(l))}
            formatter={(v) => [formatCurrency(Number(v), currency), 'Value']}
          />
          <Area type="monotone" dataKey="value" stroke="#facc15" strokeWidth={2} fill="url(#pvArea)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
