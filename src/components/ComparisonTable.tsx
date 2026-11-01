import { ArrowUpDown, Award } from 'lucide-react'
import { useState } from 'react'
import type { InvestmentResult } from '../types/Investment'
import {
  formatCategory,
  formatCurrency,
  formatEffectiveRate,
  formatPercent,
  formatProductRate,
  formatTaxRegime,
} from '../utils/FinancialFormat'

interface ComparisonTableProps {
  results: InvestmentResult[]
}

type SortKey = 'netBalance' | 'grossBalance' | 'netEarnings' | 'grossEarnings' | 'nominalReturn' | 'realReturn'

interface Row {
  label: string
  format: (r: InvestmentResult) => string
  sortKey?: SortKey
  highlight?: boolean
  dimOnZero?: boolean
  getValue?: (r: InvestmentResult) => number
}

const ROWS: Row[] = [
  {
    label: 'Modalidade',
    format: (r) => formatCategory(r.product.category),
  },
  {
    label: 'Taxa contratada',
    format: (r) => formatProductRate(r.product.category, r.product.annualRate),
  },
  {
    label: 'Taxa efetiva estimada',
    format: (r) => formatEffectiveRate(r.effectiveAnnualRate),
  },
  {
    label: 'Total investido',
    format: (r) => formatCurrency(r.totalInvested),
    getValue: (r) => r.totalInvested,
  },
  {
    label: 'Saldo bruto',
    format: (r) => formatCurrency(r.grossBalance),
    sortKey: 'grossBalance',
    getValue: (r) => r.grossBalance,
  },
  {
    label: 'Rendimento bruto',
    format: (r) => formatCurrency(r.grossEarnings),
    sortKey: 'grossEarnings',
    getValue: (r) => r.grossEarnings,
  },
  {
    label: 'IOF',
    format: (r) => (r.totalIOF > 0.005 ? `− ${formatCurrency(r.totalIOF)}` : 'Não incide'),
    dimOnZero: true,
    getValue: (r) => r.totalIOF,
  },
  {
    label: 'IR estimado',
    format: (r) =>
      r.product.taxRegime === 'isento' ? 'Isento' : `− ${formatCurrency(r.totalIR)}`,
    dimOnZero: true,
    getValue: (r) => r.totalIR,
  },
  {
    label: 'Valor líquido final',
    format: (r) => formatCurrency(r.netBalance),
    sortKey: 'netBalance',
    highlight: true,
    getValue: (r) => r.netBalance,
  },
  {
    label: 'Rendimento líquido',
    format: (r) => formatCurrency(r.netEarnings),
    sortKey: 'netEarnings',
    highlight: true,
    getValue: (r) => r.netEarnings,
  },
  {
    label: 'Rentabilidade nominal',
    format: (r) => formatPercent(r.nominalNetReturn),
    sortKey: 'nominalReturn',
    getValue: (r) => r.nominalNetReturn,
  },
  {
    label: 'Rentabilidade real',
    format: (r) => formatPercent(r.realNetReturn),
    sortKey: 'realReturn',
    getValue: (r) => r.realNetReturn,
  },
  {
    label: 'Tributação',
    format: (r) => formatTaxRegime(r.product.taxRegime),
  },
]

export function ComparisonTable({ results }: ComparisonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('netBalance')
  const [sortAsc, setSortAsc] = useState(false)

  if (results.length === 0) return null

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const sorted = [...results].sort((a, b) => {
    const map: Record<SortKey, (r: InvestmentResult) => number> = {
      netBalance: (r) => r.netBalance,
      grossBalance: (r) => r.grossBalance,
      netEarnings: (r) => r.netEarnings,
      grossEarnings: (r) => r.grossEarnings,
      nominalReturn: (r) => r.nominalNetReturn,
      realReturn: (r) => r.realNetReturn,
    }
    const fn = map[sortKey]
    const diff = fn(b) - fn(a)
    return sortAsc ? -diff : diff
  })

  const maxNetBalance = Math.max(...sorted.map((r) => r.netBalance))

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 backdrop-blur p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-100">Tabela comparativa</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Clique nos indicadores com seta para reordenar
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <ArrowUpDown size={12} />
          Ordenado por{' '}
          <span className="text-slate-200 font-medium">
            {ROWS.find((r) => r.sortKey === sortKey)?.label ?? '—'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4 min-w-[160px]">
                Indicador
              </th>
              {sorted.map((result) => (
                <th
                  key={result.product.id}
                  className={`text-right text-xs font-medium pb-3 px-3 min-w-[160px] ${
                    result.netBalance === maxNetBalance
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-end gap-1">
                    {result.netBalance === maxNetBalance && (
                      <Award size={11} className="text-emerald-400" />
                    )}
                    <span className="font-semibold">{result.product.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-t border-slate-700/50 hover:bg-slate-700/20 transition">
                <td className="py-2.5 pr-4">
                  {row.sortKey ? (
                    <button
                      onClick={() => handleSort(row.sortKey!)}
                      className="flex items-center gap-1 text-left text-slate-400 hover:text-slate-200 transition"
                    >
                      {row.label}
                      <ArrowUpDown
                        size={11}
                        className={sortKey === row.sortKey ? 'text-indigo-400' : 'text-slate-600'}
                      />
                    </button>
                  ) : (
                    <span className="text-slate-400">{row.label}</span>
                  )}
                </td>

                {sorted.map((result) => {
                  const val = row.getValue?.(result)
                  const isDimmed = row.dimOnZero && val !== undefined && val < 0.005
                  const isBestCol = result.netBalance === maxNetBalance
                  const isNegative =
                    (row.label === 'IOF' || row.label === 'IR estimado') &&
                    val !== undefined &&
                    val > 0.005

                  return (
                    <td
                      key={result.product.id}
                      className={`py-2.5 px-3 text-right tabular-nums font-medium ${
                        isDimmed
                          ? 'text-slate-600'
                          : isNegative
                            ? 'text-red-400'
                            : row.highlight && isBestCol
                              ? 'text-emerald-400'
                              : row.highlight
                                ? 'text-slate-100'
                                : 'text-slate-300'
                      }`}
                    >
                      {row.format(result)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
