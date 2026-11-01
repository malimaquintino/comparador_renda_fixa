/**
 * SimulationPage
 *
 * Componente base reutilizável pelas três abas de simulação individual.
 * Recebe a configuração visual e o hook de simulação via props,
 * renderizando formulário, status e resultados de forma uniforme.
 */

import { Play } from 'lucide-react'
import { InvestmentForm } from '../components/InvestmentForm'
import { InvestmentResults } from '../components/InvestmentResults'
import { SimulationStatusBadge } from '../components/SimulationStatus'
import type { UseInvestmentSimulationReturn } from '../hooks/useInvestmentSimulation'

export interface SimulationPageConfig {
  /** Título da página (ex: "Prefixado") */
  title: string
  /** Subtítulo descritivo */
  subtitle: string
  /** Cor de destaque — classe Tailwind para texto */
  accentText: string
  /** Cor de destaque — classe Tailwind para borda do painel */
  accentBorder: string
  /** Cor de destaque — classe Tailwind para bg do botão */
  buttonBg: string
  /** Cor de destaque — classe Tailwind para bg do botão hover */
  buttonHover: string
}

interface SimulationPageProps {
  config: SimulationPageConfig
  sim: UseInvestmentSimulationReturn
}

export function SimulationPage({ config, sim }: SimulationPageProps) {
  const { params, simulation, isDirty, canSimulate, updateParams, simulate } = sim

  return (
    <div className="flex flex-col gap-6">

      {/* ---- Cabeçalho da página ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold ${config.accentText}`}>{config.title}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{config.subtitle}</p>
        </div>
        <SimulationStatusBadge
          status={simulation.status}
          lastCalculatedAt={simulation.lastCalculatedAt}
          isDirty={isDirty}
        />
      </div>

      {/* ---- Layout principal: formulário + resultados ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

        {/* Painel de parâmetros */}
        <div className={`rounded-2xl border ${config.accentBorder} bg-slate-800/70 backdrop-blur p-5`}>
          <h3 className={`text-xs font-semibold uppercase tracking-widest ${config.accentText} mb-4`}>
            Parâmetros
          </h3>

          <InvestmentForm
            params={params}
            onChange={updateParams}
            accentColor={config.accentText}
          />

          <button
            onClick={simulate}
            disabled={!canSimulate}
            className={`
              mt-4 w-full flex items-center justify-center gap-2
              rounded-xl px-6 py-3 font-semibold text-sm text-white
              ${config.buttonBg} ${config.buttonHover}
              disabled:opacity-40 disabled:cursor-not-allowed
              shadow-lg transition
            `}
          >
            <Play size={15} />
            Simular investimento
          </button>

          {!canSimulate && (
            <p className="mt-2 text-center text-xs text-slate-500">
              Informe uma taxa válida e valor inicial ou aporte.
            </p>
          )}
        </div>

        {/* Área de resultados */}
        <div className="min-w-0">
          {simulation.result ? (
            <InvestmentResults result={simulation.result} />
          ) : (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-12 text-center">
              <Play size={36} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 font-medium">
                Configure os parâmetros e clique em "Simular investimento"
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Os resultados aparecerão aqui após a primeira simulação.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
