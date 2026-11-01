import { Award, TrendingDown, TrendingUp } from 'lucide-react'
import type { InvestmentResult } from '../types/Investment'
import {
  formatCategory,
  formatCurrency,
  formatEffectiveRate,
  formatPercent,
  formatProductRate,
  formatTaxRegime,
} from '../utils/FinancialFormat'

interface InvestmentCardProps {
  result: InvestmentResult
}

interface MetricRowProps {
  label: string
  value: string
  highlight?: boolean
  negative?: boolean
  dimmed?: boolean
}

function MetricRow({ label, value, highlight, negative, dimmed }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-700/50 last:border-0">
      <span className={`text-xs ${dimmed ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
      <span
        className={`text-sm font-medium tabular-nums ${
          highlight
            ? 'text-emerald-400'
            : negative
              ? 'text-red-400'
              : dimmed
                ? 'text-slate-500'
                : 'text-slate-100'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

const CATEGORY_BADGE: Record<string, string> = {
  prefixado: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  cdi: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ipca: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export function InvestmentCard({ result }: InvestmentCardProps) {
  const { product, isBest } = result

  const hasIOF = result.totalIOF > 0.005
  const hasIR = result.totalIR > 0.005

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-slate-800/70 backdrop-blur p-5 transition-all ${
        isBest
          ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10'
          : 'border-slate-700'
      }`}
    >
      {/* Badge melhor investimento */}
      {isBest && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-white shadow-md">
            <Award size={11} />
            Melhor resultado
          </span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-4 mt-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-100 leading-snug">{product.name}</h3>
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[product.category]}`}
          >
            {formatCategory(product.category)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {formatProductRate(product.category, product.annualRate)}
        </p>
        {product.description && (
          <p className="mt-1 text-xs text-slate-500 italic">{product.description}</p>
        )}
      </div>

      {/* Taxa efetiva */}
      <div className="mb-4 rounded-xl bg-slate-700/40 px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">Taxa efetiva estimada</span>
        <span className="text-sm font-bold text-indigo-300">
          {formatEffectiveRate(result.effectiveAnnualRate)}
        </span>
      </div>

      {/* Métricas financeiras */}
      <div className="flex flex-col">
        <MetricRow label="Total investido" value={formatCurrency(result.totalInvested)} />
        <MetricRow label="Saldo bruto" value={formatCurrency(result.grossBalance)} />
        <MetricRow label="Rendimento bruto" value={formatCurrency(result.grossEarnings)} />

        {hasIOF ? (
          <MetricRow label="IOF" value={`− ${formatCurrency(result.totalIOF)}`} negative />
        ) : (
          <MetricRow label="IOF" value="Não incide" dimmed />
        )}

        {hasIR ? (
          <MetricRow label="IR estimado" value={`− ${formatCurrency(result.totalIR)}`} negative />
        ) : (
          <MetricRow label="IR" value="Isento" dimmed />
        )}

        <div className="my-2 border-t border-slate-600" />

        <MetricRow
          label="Valor líquido final"
          value={formatCurrency(result.netBalance)}
          highlight={isBest}
        />
        <MetricRow
          label="Rendimento líquido"
          value={formatCurrency(result.netEarnings)}
          highlight={isBest}
        />
      </div>

      {/* Rentabilidade */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-700/40 px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-1">
            <TrendingUp size={11} />
            Nominal líquida
          </div>
          <p className="text-base font-bold text-slate-100">
            {formatPercent(result.nominalNetReturn)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-700/40 px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-1">
            <TrendingDown size={11} />
            Real líquida
          </div>
          <p
            className={`text-base font-bold ${result.realNetReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {formatPercent(result.realNetReturn)}
          </p>
        </div>
      </div>

      {/* Tributação */}
      <p className="mt-3 text-center text-xs text-slate-500">
        {formatTaxRegime(product.taxRegime)}
      </p>
    </div>
  )
}
