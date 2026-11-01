/**
 * InvestmentForm
 *
 * Formulário de parâmetros para uma simulação individual.
 * Adaptável às três modalidades: os campos de taxa variam conforme a categoria.
 */

import { Info } from 'lucide-react'
import type { TaxRegime } from '../../types/Investment'
import type { SingleInvestmentParameters } from '../../types/Simulation'

interface InvestmentFormProps {
  params: SingleInvestmentParameters
  onChange: (partial: Partial<SingleInvestmentParameters>) => void
  /** Cor de destaque da modalidade (classe Tailwind) */
  accentColor?: string
}

// ----------------------------------------------------------------
// Primitivos de UI
// ----------------------------------------------------------------

const inputCls =
  'w-full rounded-lg border border-slate-600 bg-slate-700/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition'

const selectCls =
  'w-full rounded-lg border border-slate-600 bg-slate-700/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-300 flex items-center gap-1">
        {label}
        {hint && (
          <span className="group relative">
            <Info size={13} className="text-slate-500 cursor-help" />
            <span className="absolute left-5 top-0 z-20 hidden group-hover:block w-60 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-xs text-slate-200 shadow-xl">
              {hint}
            </span>
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 pt-2 pb-1 border-b border-slate-700/50">
      {children}
    </h3>
  )
}

// ----------------------------------------------------------------
// Helpers de conversão
// ----------------------------------------------------------------

/** Exibe taxa interna como string percentual para o input */
function rateToDisplay(_category: SingleInvestmentParameters['category'], rate: number): string {
  return (rate * 100).toFixed(2)
}

/** Converte valor digitado para taxa interna (decimal) */
function displayToRate(raw: string): number {
  const num = parseFloat(raw.replace(',', '.'))
  return isNaN(num) ? 0 : num / 100
}

// ----------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------

export function InvestmentForm({ params, onChange }: InvestmentFormProps) {
  function handleRate(raw: string) {
    onChange({ annualRate: displayToRate(raw) })
  }

  function handleNumber(field: keyof SingleInvestmentParameters, raw: string) {
    const num = parseFloat(raw.replace(',', '.'))
    if (!isNaN(num) && num >= 0) onChange({ [field]: num } as Partial<SingleInvestmentParameters>)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ---- Identificação ---- */}
      <SectionTitle>Identificação</SectionTitle>

      <Field label="Nome do investimento">
        <input
          className={inputCls}
          placeholder="Ex: CDB Banco XYZ 110% CDI"
          value={params.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>

      {/* ---- Taxa do produto ---- */}
      <SectionTitle>Taxa do produto</SectionTitle>

      {params.category === 'prefixado' && (
        <Field
          label="Taxa prefixada (% a.a.)"
          hint="Taxa de juros anual fixa contratada."
        >
          <input
            type="number"
            step="0.01"
            min="0.01"
            className={inputCls}
            value={rateToDisplay(params.category, params.annualRate)}
            onChange={(e) => handleRate(e.target.value)}
          />
        </Field>
      )}

      {params.category === 'cdi' && (
        <>
          <Field
            label="CDI anual (%)"
            hint="Taxa CDI anual projetada para a simulação."
          >
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputCls}
              value={(params.cdiRate * 100).toFixed(2)}
              onChange={(e) => onChange({ cdiRate: displayToRate(e.target.value) })}
            />
          </Field>
          <Field
            label="Percentual do CDI (%)"
            hint="Percentual do CDI contratado. Ex: 106 para 106% do CDI."
          >
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputCls}
              value={rateToDisplay(params.category, params.annualRate)}
              onChange={(e) => handleRate(e.target.value)}
            />
          </Field>
        </>
      )}

      {params.category === 'ipca' && (
        <>
          <Field
            label="IPCA anual (%)"
            hint="Inflação anual projetada (IPCA) para a simulação."
          >
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputCls}
              value={(params.ipcaRate * 100).toFixed(2)}
              onChange={(e) => onChange({ ipcaRate: displayToRate(e.target.value) })}
            />
          </Field>
          <Field
            label="Taxa adicional ao IPCA (% a.a.)"
            hint="Spread anual sobre o IPCA. Ex: 7.00 para IPCA + 7%."
          >
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputCls}
              value={rateToDisplay(params.category, params.annualRate)}
              onChange={(e) => handleRate(e.target.value)}
            />
          </Field>
        </>
      )}

      {/* ---- Tributação ---- */}
      <Field label="Tributação">
        <select
          className={selectCls}
          value={params.taxRegime}
          onChange={(e) => onChange({ taxRegime: e.target.value as TaxRegime })}
        >
          <option value="regressivo">Tabela regressiva (CDB, Tesouro, etc.)</option>
          <option value="isento">Isento de IR (LCI, LCA)</option>
        </select>
      </Field>

      {/* ---- Prazo e datas ---- */}
      <SectionTitle>Prazo</SectionTitle>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Data inicial">
          <input
            type="date"
            className={inputCls}
            value={params.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
        </Field>
        <Field label="Prazo (meses)" hint="Duração total da simulação.">
          <input
            type="number"
            step="1"
            min="1"
            max="600"
            className={inputCls}
            value={params.termMonths}
            onChange={(e) => handleNumber('termMonths', e.target.value)}
          />
        </Field>
      </div>

      {/* ---- Investimento ---- */}
      <SectionTitle>Investimento</SectionTitle>

      <Field label="Valor inicial (R$)" hint="Capital aplicado na data inicial.">
        <input
          type="number"
          step="100"
          min="0"
          className={inputCls}
          value={params.initialAmount}
          onChange={(e) => handleNumber('initialAmount', e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Aporte mensal (R$)" hint="Valor adicionado todo mês. Use 0 para sem aportes.">
          <input
            type="number"
            step="100"
            min="0"
            className={inputCls}
            value={params.monthlyContribution}
            onChange={(e) => handleNumber('monthlyContribution', e.target.value)}
          />
        </Field>
        <Field label="Dia do aporte" hint="Dia do mês para cada aporte (1–28).">
          <input
            type="number"
            step="1"
            min="1"
            max="28"
            className={inputCls}
            value={params.contributionDay}
            onChange={(e) => handleNumber('contributionDay', e.target.value)}
          />
        </Field>
      </div>

      {/* Linha separadora no final */}
      <div className="border-t border-slate-700/50 pt-1" />
    </div>
  )
}
