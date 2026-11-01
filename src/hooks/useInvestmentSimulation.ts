/**
 * useInvestmentSimulation
 *
 * Hook que gerencia o ciclo de vida de uma simulação individual:
 * - Parâmetros editáveis
 * - Dirty flag (parâmetros alterados após última execução)
 * - Execução da simulação
 * - Persistência via callback externo
 *
 * Cada aba (Prefixado, CDI, IPCA+) instancia este hook com sua própria
 * InvestmentSimulation — garantindo isolamento total entre modalidades.
 */

import { useCallback, useMemo, useState } from 'react'
import { runSimulation } from '../services/InvestmentCalculator'
import type { InvestmentSimulation, SingleInvestmentParameters } from '../types/Simulation'
import { toSimulationParams } from '../types/Simulation'

export interface UseInvestmentSimulationReturn {
  /** Parâmetros atualmente editados no formulário */
  params: SingleInvestmentParameters
  /** Resultado e metadados da última execução */
  simulation: InvestmentSimulation
  /** Verdadeiro quando os parâmetros foram alterados após a última execução */
  isDirty: boolean
  /** Se os parâmetros atuais são válidos para executar */
  canSimulate: boolean
  /** Atualiza um ou mais campos dos parâmetros */
  updateParams: (partial: Partial<SingleInvestmentParameters>) => void
  /** Executa a simulação com os parâmetros atuais */
  simulate: () => void
}

export function useInvestmentSimulation(
  /** Estado inicial carregado do storage */
  initialSimulation: InvestmentSimulation,
  /** Callback chamado após cada mudança (para persistência) */
  onUpdate: (sim: InvestmentSimulation) => void
): UseInvestmentSimulationReturn {
  const [simulation, setSimulation] = useState<InvestmentSimulation>(initialSimulation)

  // Parâmetros que o usuário está editando agora
  const [params, setParams] = useState<SingleInvestmentParameters>(
    initialSimulation.parameters
  )

  // dirty = parâmetros editados diferem do que foi simulado
  const isDirty = useMemo(() => {
    if (simulation.status === 'not_simulated') return false
    return JSON.stringify(params) !== JSON.stringify(simulation.parameters)
  }, [params, simulation.parameters, simulation.status])

  const canSimulate = useMemo(
    () =>
      params.termMonths >= 1 &&
      params.initialAmount + params.monthlyContribution > 0 &&
      params.annualRate > 0,
    [params]
  )

  const updateParams = useCallback(
    (partial: Partial<SingleInvestmentParameters>) => {
      setParams((prev) => ({ ...prev, ...partial }))
    },
    []
  )

  const simulate = useCallback(() => {
    if (!canSimulate) return

    try {
      const simParams = toSimulationParams(params)
      const simResult = runSimulation(simParams)

      // O motor retorna um array (suporte a múltiplos produtos);
      // aqui sempre temos exatamente um produto.
      const result = simResult.results[0]

      const updated: InvestmentSimulation = {
        parameters: { ...params },
        result,
        lastCalculatedAt: new Date().toISOString(),
        status: 'calculated',
      }

      setSimulation(updated)
      onUpdate(updated)
    } catch (err) {
      console.error('[useInvestmentSimulation] Erro na simulação:', err)
    }
  }, [canSimulate, params, onUpdate])

  return {
    params,
    simulation,
    isDirty,
    canSimulate,
    updateParams,
    simulate,
  }
}
