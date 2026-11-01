import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useState } from 'react'
import type { EconomicAssumptions, FinancialParameters } from '../types/Investment'

interface SimulationFormProps {
  economic: EconomicAssumptions
  financial: FinancialParameters
  onEconomicChange: (values: EconomicAssumptions) => void
  onFinancialChange: (values: FinancialParameters) => void
}

interface FieldProps {
  label: string
  hint?: string
  children: React.ReactNode
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-300 flex items-center gap-1">
        {label}
        {hint && (
          <span className="group relative">
            <Info size={13} className="text-slate-500 cursor-help" />
            <span className="absolute left-5 top-0 z-10 hidden group-hover:block w-56 rounded-lg bg-slate-700 px-3 py-2 text-xs text-slate-200 shadow-xl">
              {hint}
            </span>
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-600 bg-slate-700/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition'

export function SimulationForm({
  economic,
  financial,
  onEconomicChange,
  onFinancialChange,
}: SimulationFormProps) {
  const [open, setOpen] = useState(true)

  function handleEconomic(field: keyof EconomicAssumptions, raw: string) {
    if (field === 'startDate') {
      onEconomicChange({ ...economic, startDate: raw })
      return
    }
    const num = parseFloat(raw.replace(',', '.'))
    if (!isNaN(num)) {
      onEconomicChange({ ...economic, [field]: num / 100 })
    }
  }

  function handleFinancial(field: keyof FinancialParameters, raw: string) {
    const num = parseFloat(raw.replace(',', '.'))
    if (!isNaN(num) && num >= 0) {
      onFinancialChange({ ...financial, [field]: num })
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 backdrop-blur overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-700/30 transition"
      >
        <span className="font-semibold text-slate-100">Parâmetros da simulação</span>
        {open ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-700">
          {/* Premissas econômicas */}
          <div className="pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
              Premissas econômicas
            </h3>
            <div className="flex flex-col gap-4">
              <Field
                label="CDI anual (%)"
                hint="Taxa CDI anual projetada. Premissa constante durante toda a simulação."
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className={inputCls}
                  value={(economic.cdiRate * 100).toFixed(2)}
                  onChange={(e) => handleEconomic('cdiRate', e.target.value)}
                />
              </Field>

              <Field
                label="IPCA anual (%)"
                hint="Inflação anual projetada (IPCA). Premissa constante durante toda a simulação."
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className={inputCls}
                  value={(economic.ipcaRate * 100).toFixed(2)}
                  onChange={(e) => handleEconomic('ipcaRate', e.target.value)}
                />
              </Field>

              <Field label="Data inicial">
                <input
                  type="date"
                  className={inputCls}
                  value={economic.startDate}
                  onChange={(e) => handleEconomic('startDate', e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Parâmetros financeiros */}
          <div className="pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
              Configurações da aplicação
            </h3>
            <div className="flex flex-col gap-4">
              <Field
                label="Prazo (meses)"
                hint="Duração total da simulação em meses."
              >
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="600"
                  className={inputCls}
                  value={financial.termMonths}
                  onChange={(e) => handleFinancial('termMonths', e.target.value)}
                />
              </Field>

              <Field
                label="Valor inicial (R$)"
                hint="Capital investido na data de início."
              >
                <input
                  type="number"
                  step="100"
                  min="0"
                  className={inputCls}
                  value={financial.initialAmount}
                  onChange={(e) => handleFinancial('initialAmount', e.target.value)}
                />
              </Field>

              <Field
                label="Aporte mensal (R$)"
                hint="Valor adicionado mensalmente. Use 0 para simular sem aportes."
              >
                <input
                  type="number"
                  step="100"
                  min="0"
                  className={inputCls}
                  value={financial.monthlyContribution}
                  onChange={(e) => handleFinancial('monthlyContribution', e.target.value)}
                />
              </Field>

              <Field
                label="Dia do aporte"
                hint="Dia do mês em que os aportes mensais serão realizados (1 a 28)."
              >
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="28"
                  className={inputCls}
                  value={financial.contributionDay}
                  onChange={(e) => handleFinancial('contributionDay', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
