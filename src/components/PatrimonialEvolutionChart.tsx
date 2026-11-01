import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { InvestmentResult } from '../types/Investment'
import { formatChartValue, formatCurrency, formatDateShort } from '../utils/FinancialFormat'

interface PatrimonialEvolutionChartProps {
  results: InvestmentResult[]
}

// Paleta de cores para os investimentos
const COLORS = ['#818cf8', '#34d399', '#fb923c', '#f472b6', '#38bdf8', '#a78bfa', '#4ade80']

interface ChartDataPoint {
  month: number
  dateLabel: string
  totalInvested: number
  [key: string]: number | string
}

// Tooltip customizado
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-600 bg-slate-800 p-4 shadow-2xl text-xs max-w-xs">
      <p className="font-semibold text-slate-200 mb-3">{label}</p>
      <div className="flex flex-col gap-2">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: entry.color }}
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

export function PatrimonialEvolutionChart({ results }: PatrimonialEvolutionChartProps) {
  if (results.length === 0) return null

  // Constrói os dados do gráfico mesclando todas as séries
  const referenceMonthly = results[0].monthlyData
  const data: ChartDataPoint[] = referenceMonthly.map((point, idx) => {
    const row: ChartDataPoint = {
      month: point.month,
      dateLabel: formatDateShort(point.date),
      totalInvested: point.totalInvested,
    }
    results.forEach((result) => {
      const mp = result.monthlyData[idx]
      if (mp) {
        row[`gross_${result.product.id}`] = mp.grossBalance
        row[`net_${result.product.id}`] = mp.netBalance
      }
    })
    return row
  })

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 backdrop-blur p-6">
      <h2 className="font-semibold text-slate-100 mb-1">Evolução patrimonial</h2>
      <p className="text-xs text-slate-500 mb-6">
        Valor líquido estimado ao longo do período (saldo após impostos projetados)
      </p>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatChartValue}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={85}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '16px' }}
          />

          {/* Linha do capital investido */}
          <Line
            type="monotone"
            dataKey="totalInvested"
            name="Capital investido"
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* Linhas de valor líquido de cada produto */}
          {results.map((result, i) => (
            <Line
              key={result.product.id}
              type="monotone"
              dataKey={`net_${result.product.id}`}
              name={result.product.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}

          {/* Linha de referência no mês 12 */}
          {referenceMonthly.length > 12 && (
            <ReferenceLine
              x={formatDateShort(referenceMonthly[12]!.date)}
              stroke="#475569"
              strokeDasharray="4 4"
              label={{ value: '12m', fill: '#64748b', fontSize: 10 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
