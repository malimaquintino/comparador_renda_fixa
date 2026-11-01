import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { InvestmentResult } from '../types/Investment'
import { formatCurrency, formatDate, formatPercent } from '../utils/FinancialFormat'

interface MonthlyEvolutionTableProps {
  results: InvestmentResult[]
}

const thCls = 'py-2.5 px-3 text-right text-xs font-medium text-slate-500 whitespace-nowrap first:text-left'
const tdCls = 'py-2.5 px-3 text-right text-xs tabular-nums text-slate-300 first:text-left first:text-slate-400'

export function MonthlyEvolutionTable({ results }: MonthlyEvolutionTableProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(results[0]?.product.id ?? '')

  if (results.length === 0) return null

  const selected = results.find((r) => r.product.id === selectedId) ?? results[0]

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 backdrop-blur overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-700/30 transition"
      >
        <div>
          <span className="font-semibold text-slate-100">Evolução mensal detalhada</span>
          <span className="ml-2 text-xs text-slate-500">
            ({results[0].monthlyData.length} períodos)
          </span>
        </div>
        {open ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-700">
          {/* Seletor de produto */}
          <div className="flex flex-wrap gap-2 px-6 py-4 border-b border-slate-700">
            {results.map((r) => (
              <button
                key={r.product.id}
                onClick={() => setSelectedId(r.product.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  selectedId === r.product.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {r.product.name}
              </button>
            ))}
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/80 sticky top-0">
                <tr>
                  <th className={thCls}>Data</th>
                  <th className={thCls}>Mês</th>
                  <th className={thCls}>Total investido</th>
                  <th className={thCls}>Saldo bruto</th>
                  <th className={thCls}>Rendimento bruto</th>
                  <th className={thCls}>IOF est.</th>
                  <th className={thCls}>IR est.</th>
                  <th className={thCls}>Valor líquido</th>
                  <th className={thCls}>Rend. líquido</th>
                  <th className={thCls}>Rentab. nom.</th>
                </tr>
              </thead>
              <tbody>
                {selected.monthlyData.map((point) => {
                  const nominalReturn =
                    point.totalInvested > 0
                      ? (point.netBalance - point.totalInvested) / point.totalInvested
                      : 0
                  return (
                    <tr
                      key={point.month}
                      className={`border-t border-slate-700/40 hover:bg-slate-700/20 transition ${
                        point.month === selected.monthlyData.length - 1
                          ? 'bg-indigo-500/5 font-semibold'
                          : ''
                      }`}
                    >
                      <td className={tdCls}>{formatDate(point.date)}</td>
                      <td className={tdCls}>{point.month}</td>
                      <td className={tdCls}>{formatCurrency(point.totalInvested)}</td>
                      <td className={tdCls}>{formatCurrency(point.grossBalance)}</td>
                      <td className={`${tdCls} text-emerald-400`}>
                        {formatCurrency(point.grossEarnings)}
                      </td>
                      <td className={`${tdCls} ${point.estimatedIOF > 0.005 ? 'text-orange-400' : 'text-slate-600'}`}>
                        {point.estimatedIOF > 0.005
                          ? formatCurrency(point.estimatedIOF)
                          : '—'}
                      </td>
                      <td className={`${tdCls} ${point.estimatedIR > 0.005 ? 'text-red-400' : 'text-slate-600'}`}>
                        {selected.product.taxRegime === 'isento'
                          ? '—'
                          : formatCurrency(point.estimatedIR)}
                      </td>
                      <td className={`${tdCls} text-slate-100`}>
                        {formatCurrency(point.netBalance)}
                      </td>
                      <td className={`${tdCls} ${point.netEarnings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(point.netEarnings)}
                      </td>
                      <td className={`${tdCls} ${nominalReturn >= 0 ? 'text-slate-200' : 'text-red-400'}`}>
                        {formatPercent(nominalReturn)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
