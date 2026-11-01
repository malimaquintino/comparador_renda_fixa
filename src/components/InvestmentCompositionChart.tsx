import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { InvestmentResult } from '../types/Investment'
import { formatChartValue, formatCurrency } from '../utils/FinancialFormat'

interface InvestmentCompositionChartProps {
  results: InvestmentResult[]
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; fill: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-xl border border-slate-600 bg-slate-800 p-4 shadow-2xl text-xs max-w-xs">
      <p className="font-semibold text-slate-200 mb-3 truncate max-w-[200px]">{label}</p>
      <div className="flex flex-col gap-2">
        {payload
          .filter((e) => e.value > 0)
          .map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ background: entry.fill }}
                />
                <span className="text-slate-300">{entry.name}</span>
              </div>
              <span className="font-medium text-slate-100 tabular-nums">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

export function InvestmentCompositionChart({ results }: InvestmentCompositionChartProps) {
  if (results.length === 0) return null

  const data = results.map((r) => ({
    name: r.product.name,
    'Capital investido': r.totalInvested,
    'Rendimento líquido': r.netEarnings,
    'IR': r.totalIR,
    'IOF': r.totalIOF,
  }))

  const BARS = [
    { key: 'Capital investido', color: '#475569' },
    { key: 'Rendimento líquido', color: '#34d399' },
    { key: 'IR', color: '#f87171' },
    { key: 'IOF', color: '#fb923c' },
  ]

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 backdrop-blur p-6">
      <h2 className="font-semibold text-slate-100 mb-1">Composição do patrimônio final</h2>
      <p className="text-xs text-slate-500 mb-6">
        Decomposição do valor final de cada investimento
      </p>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            interval={0}
            width={80}
          />
          <YAxis
            tickFormatter={formatChartValue}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={85}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '16px' }} />

          {BARS.map(({ key, color }) => (
            <Bar key={key} dataKey={key} stackId="composition" fill={color} radius={key === 'IOF' ? [4, 4, 0, 0] : undefined}>
              {key === 'Rendimento líquido' && (
                <LabelList
                  dataKey="Rendimento líquido"
                  position="insideTop"
                  formatter={(v: unknown) => {
                    const num = typeof v === 'number' ? v : 0
                    return num > 0 ? formatChartValue(num) : ''
                  }}
                  style={{ fill: '#e2e8f0', fontSize: 10 }}
                />
              )}
              {data.map((_, idx) => (
                <Cell key={idx} fill={color} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
