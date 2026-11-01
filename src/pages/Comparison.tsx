/**
 * Comparison
 *
 * Aba comparativo: consolida os últimos resultados calculados das três modalidades.
 * Não executa novos cálculos — lê exclusivamente o que cada simulação armazenou.
 */

import { AlertTriangle, ArrowUpDown, Award, GitCompare, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { InvestmentCompositionChart } from '../components/InvestmentCompositionChart'
import { MonthlyEvolutionTable } from '../components/MonthlyEvolutionTable'
import {
  buildComparisonMetrics,
  consolidateComparison,
  hasConditionDifferences,
  type ComparisonMetrics,
} from '../services/ComparisonCalculator'
import type { InvestmentSimulation } from '../types/Simulation'
import {
  formatCategory,
  formatChartValue,
  formatCurrency,
  formatDateShort,
  formatEffectiveRate,
  formatPercent,
  formatProductRate,
  formatTaxRegime,
  formatTerm,
} from '../utils/FinancialFormat'

// ----------------------------------------------------------------
// Paleta de cores por modalidade
// ----------------------------------------------------------------
const CATEGORY_COLORS = {
  prefixado: '#a78bfa',  // violet-400
  cdi: '#60a5fa',        // blue-400
  ipca: '#34d399',       // emerald-400
} as const

const CATEGORY_BG = {
  prefixado: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  cdi: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ipca: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
} as const

// ----------------------------------------------------------------
// Card comparativo
// ----------------------------------------------------------------
function ComparisonCard({ m, rank }: { m: ComparisonMetrics; rank: number }) {
  const isFirst = rank === 1
  const badgeColor = CATEGORY_BG[m.category]
  const accentColor = CATEGORY_COLORS[m.category]

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-slate-800/70 backdrop-blur p-5 transition-all ${
        isFirst
          ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
          : 'border-slate-700'
      }`}
    >
      {isFirst && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-white shadow-md">
            <Award size={11} /> Maior valor líquido
          </span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mt-1 mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-100 leading-snug">{m.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatProductRate(m.category, m.annualRate)}
          </p>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
          {formatCategory(m.category)}
        </span>
      </div>

      {/* Condições */}
      <div className="rounded-xl bg-slate-700/40 px-3 py-2.5 mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-slate-500">Prazo</span>
        <span className="text-slate-200 text-right">{formatTerm(m.termMonths)}</span>
        <span className="text-slate-500">Capital inicial</span>
        <span className="text-slate-200 text-right">{formatCurrency(m.initialAmount)}</span>
        <span className="text-slate-500">Aporte mensal</span>
        <span className="text-slate-200 text-right">
          {m.monthlyContribution > 0 ? formatCurrency(m.monthlyContribution) : '—'}
        </span>
        <span className="text-slate-500">Taxa efetiva</span>
        <span className="text-right font-semibold" style={{ color: accentColor }}>
          {formatEffectiveRate(m.result.effectiveAnnualRate)}
        </span>
      </div>

      {/* Métricas financeiras */}
      {[
        { label: 'Total investido', value: formatCurrency(m.result.totalInvested) },
        { label: 'Saldo bruto', value: formatCurrency(m.result.grossBalance) },
        { label: 'Rendimento bruto', value: formatCurrency(m.result.grossEarnings) },
        {
          label: 'IOF',
          value: m.result.totalIOF > 0.005 ? `− ${formatCurrency(m.result.totalIOF)}` : 'Não incide',
          negative: m.result.totalIOF > 0.005,
        },
        {
          label: 'IR estimado',
          value:
            m.result.product.taxRegime === 'isento'
              ? 'Isento'
              : `− ${formatCurrency(m.result.totalIR)}`,
          negative: m.result.totalIR > 0.005,
        },
      ].map(({ label, value, negative }) => (
        <div
          key={label}
          className="flex items-center justify-between py-1.5 border-b border-slate-700/50 text-xs"
        >
          <span className="text-slate-400">{label}</span>
          <span className={`font-medium tabular-nums ${negative ? 'text-red-400' : 'text-slate-200'}`}>
            {value}
          </span>
        </div>
      ))}

      <div className="my-2 border-t border-slate-600" />

      {/* Destaque: valor líquido */}
      <div className="flex items-center justify-between py-1 text-sm">
        <span className="text-slate-300 font-medium">Valor líquido final</span>
        <span className={`font-bold tabular-nums ${isFirst ? 'text-emerald-400' : 'text-slate-100'}`}>
          {formatCurrency(m.result.netBalance)}
        </span>
      </div>
      <div className="flex items-center justify-between pb-2 text-xs">
        <span className="text-slate-400">Rendimento líquido</span>
        <span className={`font-medium tabular-nums ${isFirst ? 'text-emerald-400' : 'text-slate-300'}`}>
          {formatCurrency(m.result.netEarnings)}
        </span>
      </div>

      <div className="my-2 border-t border-slate-600" />

      {/* Indicadores de rentabilidade */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        {[
          { label: 'Nom. acum.', value: formatPercent(m.nominalNetReturn) },
          { label: 'Real acum.', value: formatPercent(m.result.realNetReturn), real: true },
          { label: 'Nom. anual.', value: formatPercent(m.annualizedNetReturn) },
          {
            label: 'XIRR',
            value: m.xirr !== null ? formatPercent(m.xirr) : 'N/D',
            best: m.isBestByXIRR,
          },
        ].map(({ label, value, real, best }) => (
          <div key={label} className="rounded-lg bg-slate-700/40 px-2.5 py-2 text-center">
            <p className="text-xs text-slate-500 mb-0.5">{label}</p>
            <p className={`text-sm font-bold ${best || real ? 'text-emerald-400' : 'text-slate-100'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-slate-600">
        {formatTaxRegime(m.result.product.taxRegime)}
      </p>
    </div>
  )
}

// ----------------------------------------------------------------
// Tabela comparativa extendida
// ----------------------------------------------------------------
type SortField = 'netBalance' | 'annualizedNetReturn' | 'xirr' | 'nominalNetReturn'

function ExtendedComparisonTable({ metrics }: { metrics: ComparisonMetrics[] }) {
  const [sortField, setSortField] = useState<SortField>('netBalance')
  const [sortAsc, setSortAsc] = useState(false)

  function handleSort(f: SortField) {
    if (sortField === f) setSortAsc((v) => !v)
    else { setSortField(f); setSortAsc(false) }
  }

  const sorted = useMemo(() => {
    const getValue = (m: ComparisonMetrics): number => {
      switch (sortField) {
        case 'netBalance': return m.result.netBalance
        case 'annualizedNetReturn': return m.annualizedNetReturn
        case 'xirr': return m.xirr ?? -Infinity
        case 'nominalNetReturn': return m.nominalNetReturn
      }
    }
    return [...metrics].sort((a, b) => {
      const diff = getValue(b) - getValue(a)
      return sortAsc ? -diff : diff
    })
  }, [metrics, sortField, sortAsc])

  const maxNetBalance = Math.max(...sorted.map((m) => m.result.netBalance))

  interface RowDef {
    label: string
    sortField?: SortField
    format: (m: ComparisonMetrics) => string
    highlight?: boolean
    negative?: (m: ComparisonMetrics) => boolean
    dim?: (m: ComparisonMetrics) => boolean
  }

  const rows: RowDef[] = [
    { label: 'Modalidade', format: (m) => formatCategory(m.category) },
    { label: 'Taxa contratada', format: (m) => formatProductRate(m.category, m.annualRate) },
    { label: 'Taxa efetiva', format: (m) => formatEffectiveRate(m.result.effectiveAnnualRate) },
    { label: 'Prazo', format: (m) => formatTerm(m.termMonths) },
    { label: 'Capital inicial', format: (m) => formatCurrency(m.initialAmount) },
    { label: 'Aporte mensal', format: (m) => m.monthlyContribution > 0 ? formatCurrency(m.monthlyContribution) : '—' },
    { label: 'Total investido', format: (m) => formatCurrency(m.result.totalInvested) },
    { label: 'Saldo bruto', format: (m) => formatCurrency(m.result.grossBalance) },
    { label: 'Rendimento bruto', format: (m) => formatCurrency(m.result.grossEarnings) },
    {
      label: 'IOF',
      format: (m) => m.result.totalIOF > 0.005 ? `− ${formatCurrency(m.result.totalIOF)}` : '—',
      negative: (m) => m.result.totalIOF > 0.005,
      dim: (m) => m.result.totalIOF <= 0.005,
    },
    {
      label: 'IR estimado',
      format: (m) => m.result.product.taxRegime === 'isento' ? 'Isento' : `− ${formatCurrency(m.result.totalIR)}`,
      negative: (m) => m.result.totalIR > 0.005,
      dim: (m) => m.result.product.taxRegime === 'isento',
    },
    {
      label: 'Saldo líquido',
      format: (m) => formatCurrency(m.result.netBalance),
      highlight: true,
      sortField: 'netBalance',
    },
    {
      label: 'Rendimento líquido',
      format: (m) => formatCurrency(m.result.netEarnings),
      highlight: true,
    },
    {
      label: 'Rentab. nominal acum.',
      format: (m) => formatPercent(m.nominalNetReturn),
      sortField: 'nominalNetReturn',
    },
    {
      label: 'Rentab. real acum.',
      format: (m) => formatPercent(m.result.realNetReturn),
    },
    {
      label: 'Rentab. anualizada',
      format: (m) => formatPercent(m.annualizedNetReturn),
      sortField: 'annualizedNetReturn',
    },
    {
      label: 'XIRR líquida',
      format: (m) => m.xirr !== null ? formatPercent(m.xirr) : 'N/D',
      sortField: 'xirr',
      dim: (m) => m.xirr === null,
    },
    { label: 'Tributação', format: (m) => formatTaxRegime(m.result.product.taxRegime) },
  ]

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 backdrop-blur p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-100">Tabela comparativa</h2>
          <p className="text-xs text-slate-500 mt-0.5">Clique nos indicadores com seta para ordenar</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ArrowUpDown size={12} />
          {rows.find((r) => r.sortField === sortField)?.label ?? '—'}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-slate-500 pb-3 pr-4 min-w-[180px]">
                Indicador
              </th>
              {sorted.map((m) => (
                <th
                  key={m.category}
                  className={`text-right text-xs font-medium pb-3 px-3 min-w-[160px] ${
                    m.result.netBalance === maxNetBalance ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-end gap-1">
                    {m.result.netBalance === maxNetBalance && (
                      <Award size={11} className="text-emerald-400" />
                    )}
                    <span>{m.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-t border-slate-700/50 hover:bg-slate-700/20 transition"
              >
                <td className="py-2.5 pr-4">
                  {row.sortField ? (
                    <button
                      onClick={() => handleSort(row.sortField!)}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition"
                    >
                      {row.label}
                      <ArrowUpDown
                        size={11}
                        className={sortField === row.sortField ? 'text-amber-400' : 'text-slate-600'}
                      />
                    </button>
                  ) : (
                    <span className="text-slate-400">{row.label}</span>
                  )}
                </td>
                {sorted.map((m) => {
                  const isDim = row.dim?.(m)
                  const isNeg = row.negative?.(m)
                  const isBest = row.highlight && m.result.netBalance === maxNetBalance
                  return (
                    <td
                      key={m.category}
                      className={`py-2.5 px-3 text-right tabular-nums font-medium ${
                        isDim
                          ? 'text-slate-600'
                          : isNeg
                            ? 'text-red-400'
                            : isBest
                              ? 'text-emerald-400'
                              : row.highlight
                                ? 'text-slate-100'
                                : 'text-slate-300'
                      }`}
                    >
                      {row.format(m)}
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

// ----------------------------------------------------------------
// Gráfico de evolução comparativa (respeita períodos diferentes)
// ----------------------------------------------------------------
function ComparisonEvolutionChart({ metrics }: { metrics: ComparisonMetrics[] }) {
  // Constrói eixo temporal unificado a partir de todas as datas disponíveis
  const chartData = useMemo(() => {
    // Coleta todos os pontos de cada série indexados pela data ISO
    const dateMap = new Map<string, Record<string, number>>()

    for (const m of metrics) {
      for (const point of m.result.monthlyData) {
        const key = point.date instanceof Date
          ? point.date.toISOString().slice(0, 10)
          : String(point.date).slice(0, 10)
        if (!dateMap.has(key)) dateMap.set(key, {})
        const row = dateMap.get(key)!
        row.dateLabel = formatDateShort(point.date instanceof Date ? point.date : new Date(point.date)) as unknown as number
        row[`net_${m.category}`] = point.netBalance
        row[`invested_${m.category}`] = point.totalInvested
      }
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, row]) => row)
  }, [metrics])

  function CustomTooltip({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
    label?: string
  }) {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-xl border border-slate-600 bg-slate-800 p-4 shadow-2xl text-xs max-w-xs">
        <p className="font-semibold text-slate-200 mb-3">{label}</p>
        {payload.map((e) => (
          <div key={e.dataKey} className="flex items-center justify-between gap-6 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
              <span className="text-slate-300">{e.name}</span>
            </div>
            <span className="font-medium text-slate-100 tabular-nums">
              {formatCurrency(e.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 backdrop-blur p-6">
      <h2 className="font-semibold text-slate-100 mb-1">Evolução patrimonial comparativa</h2>
      <p className="text-xs text-slate-500 mb-6">
        Valor líquido estimado ao longo do tempo — cada série respeita seu próprio período
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
          <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '16px' }} />
          {metrics.map((m) => (
            <Line
              key={m.category}
              type="monotone"
              dataKey={`net_${m.category}`}
              name={m.name}
              stroke={CATEGORY_COLORS[m.category]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ----------------------------------------------------------------
// Página Comparison principal
// ----------------------------------------------------------------
interface ComparisonProps {
  simulations: {
    prefixado: InvestmentSimulation
    cdi: InvestmentSimulation
    ipca: InvestmentSimulation
  }
}

export function Comparison({ simulations }: ComparisonProps) {
  // Constrói métricas a partir dos resultados armazenados
  const allMetrics = useMemo(() => {
    const raw = [
      buildComparisonMetrics(simulations.prefixado),
      buildComparisonMetrics(simulations.cdi),
      buildComparisonMetrics(simulations.ipca),
    ]
    return consolidateComparison(raw)
  }, [simulations])

  const hasDifferentConditions = useMemo(
    () => allMetrics.length > 1 && hasConditionDifferences(allMetrics),
    [allMetrics]
  )

  // Quais modalidades ainda não foram simuladas
  const missing = useMemo(() => {
    const labels: string[] = []
    if (!simulations.prefixado.result) labels.push('Prefixado')
    if (!simulations.cdi.result) labels.push('CDI')
    if (!simulations.ipca.result) labels.push('IPCA+')
    return labels
  }, [simulations])

  // Quais têm resultado mas estão desatualizadas
  const outdated = useMemo(() => {
    const labels: string[] = []
    if (simulations.prefixado.result && simulations.prefixado.status === 'outdated') labels.push('Prefixado')
    if (simulations.cdi.result && simulations.cdi.status === 'outdated') labels.push('CDI')
    if (simulations.ipca.result && simulations.ipca.status === 'outdated') labels.push('IPCA+')
    return labels
  }, [simulations])

  // InvestmentResult array para componentes reutilizados
  const results = useMemo(() => allMetrics.map((m) => m.result), [allMetrics])

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div>
        <h2 className="text-xl font-bold text-amber-400">Comparativo</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Consolidação dos últimos resultados calculados de cada modalidade.
        </p>
      </div>

      {/* Estado: nenhuma simulação executada */}
      {allMetrics.length === 0 && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-16 text-center">
          <GitCompare size={40} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium">Nenhuma simulação executada ainda.</p>
          <p className="text-sm text-slate-600 mt-1">
            Execute ao menos uma simulação nas abas Prefixado, CDI ou IPCA+.
          </p>
        </div>
      )}

      {/* Avisos */}
      {allMetrics.length > 0 && (
        <div className="flex flex-col gap-3">

          {/* Modalidades sem resultado */}
          {missing.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-xs text-slate-400">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-300">Comparação parcial.</strong>{' '}
                {missing.join(' e ')} ainda {missing.length === 1 ? 'não foi simulado' : 'não foram simulados'}.
                Execute a simulação nessa{missing.length > 1 ? 's' : ''} aba{missing.length > 1 ? 's' : ''} para incluir no comparativo.
              </span>
            </div>
          )}

          {/* Resultados desatualizados */}
          {outdated.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-200">
                  {outdated.join(' e ')} {outdated.length === 1 ? 'possui' : 'possuem'} parâmetros alterados.
                </strong>{' '}
                O comparativo exibe o último resultado calculado. Execute novamente para atualizar.
              </span>
            </div>
          )}

          {/* Condições diferentes */}
          {hasDifferentConditions && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs text-blue-300">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>
                <strong className="text-blue-200">Condições diferentes.</strong>{' '}
                Os investimentos possuem prazo e/ou aportes distintos. Os valores finais absolutos
                não representam uma comparação em condições equivalentes. Utilize os indicadores
                de rentabilidade anualizada e XIRR para comparar a eficiência de cada produto.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Cards comparativos */}
      {allMetrics.length > 0 && (
        <div className={`grid gap-4 ${
          allMetrics.length === 1
            ? 'grid-cols-1 max-w-sm'
            : allMetrics.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {allMetrics
            .slice()
            .sort((a, b) => b.result.netBalance - a.result.netBalance)
            .map((m, i) => (
              <ComparisonCard key={m.category} m={m} rank={i + 1} />
            ))}
        </div>
      )}

      {/* Gráficos */}
      {allMetrics.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ComparisonEvolutionChart metrics={allMetrics} />
          <InvestmentCompositionChart results={results} />
        </div>
      )}

      {/* Tabela comparativa extendida */}
      {allMetrics.length > 0 && (
        <ExtendedComparisonTable metrics={allMetrics} />
      )}

      {/* Evolução mensal (todos os produtos disponíveis) */}
      {allMetrics.length > 0 && (
        <MonthlyEvolutionTable results={results} />
      )}

      {/* Nota sobre XIRR */}
      {allMetrics.length > 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-5 py-4 flex gap-3">
          <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-400">XIRR (Taxa Interna de Retorno):</strong>{' '}
            considera as datas e valores reais de cada aporte como saída de caixa e o valor
            líquido final como entrada. Calculada via Newton-Raphson com fallback por bisseção.
            "N/D" indica que não houve convergência para aquele conjunto de fluxos.
            A XIRR é um indicador complementar — não substitui a análise do saldo líquido final.
          </p>
        </div>
      )}
    </div>
  )
}
