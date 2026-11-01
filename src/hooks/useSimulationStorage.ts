/**
 * useSimulationStorage
 *
 * Hook responsável pela persistência independente das três simulações no LocalStorage.
 *
 * Estrutura salva:
 * {
 *   version: 1,
 *   simulations: { prefixado: ..., cdi: ..., ipca: ... }
 * }
 *
 * Regras:
 * - Atualizar uma modalidade nunca sobrescreve as demais.
 * - Dados inválidos ou de versões incompatíveis são substituídos pelo padrão.
 * - InvestmentResult não é diretamente serializável (contém Date em monthlyData),
 *   por isso os resultados são serializados com datas como string ISO e
 *   desserializados de volta ao carregar.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { InvestmentResult, MonthlyDataPoint } from '../types/Investment'
import type { InvestmentSimulation, PersistedSimulationData, SimulationKey, SimulationState } from '../types/Simulation'
import { DEFAULT_SIMULATION_STATE, PERSISTED_DATA_VERSION } from '../types/Simulation'

const STORAGE_KEY = 'rendimentos:v2'

// ----------------------------------------------------------------
// Serialização / Desserialização
// ----------------------------------------------------------------

/** Substitui Date por string ISO para JSON.stringify */
function serializeResult(result: InvestmentResult): unknown {
  return {
    ...result,
    monthlyData: result.monthlyData.map((p) => ({
      ...p,
      date: p.date instanceof Date ? p.date.toISOString() : p.date,
    })),
  }
}

/** Restaura string ISO para Date após JSON.parse */
function deserializeResult(raw: unknown): InvestmentResult {
  const r = raw as InvestmentResult & { monthlyData: (MonthlyDataPoint & { date: unknown })[] }
  return {
    ...r,
    monthlyData: r.monthlyData.map((p) => ({
      ...p,
      date: typeof p.date === 'string' ? new Date(p.date) : (p.date as Date),
    })),
  }
}

function serializeSimulation(sim: InvestmentSimulation): unknown {
  return {
    ...sim,
    result: sim.result ? serializeResult(sim.result) : null,
  }
}

function deserializeSimulation(raw: unknown): InvestmentSimulation {
  const s = raw as InvestmentSimulation & { result: unknown }
  return {
    ...s,
    result: s.result ? deserializeResult(s.result) : null,
  }
}

// ----------------------------------------------------------------
// Leitura inicial do LocalStorage
// ----------------------------------------------------------------

function loadFromStorage(): SimulationState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_SIMULATION_STATE)

    const parsed = JSON.parse(raw) as PersistedSimulationData

    if (!parsed || parsed.version !== PERSISTED_DATA_VERSION) {
      return structuredClone(DEFAULT_SIMULATION_STATE)
    }

    const sims = parsed.simulations
    return {
      prefixado: deserializeSimulation(sims.prefixado),
      cdi: deserializeSimulation(sims.cdi),
      ipca: deserializeSimulation(sims.ipca),
    }
  } catch (err) {
    console.warn('[useSimulationStorage] Erro ao ler do LocalStorage:', err)
    return structuredClone(DEFAULT_SIMULATION_STATE)
  }
}

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------

export interface UseSimulationStorageReturn {
  /** Estado completo das três simulações */
  state: SimulationState
  /** Atualiza uma modalidade individualmente — não toca nas outras */
  updateSimulation: (key: SimulationKey, sim: InvestmentSimulation) => void
  /** Restaura tudo para o padrão e limpa o LocalStorage */
  resetAll: () => void
}

export function useSimulationStorage(): UseSimulationStorageReturn {
  const [state, setState] = useState<SimulationState>(() => loadFromStorage())

  // Ref para gravar no LocalStorage sem criar dependência circular no useEffect
  const stateRef = useRef(state)
  stateRef.current = state

  // Persiste sempre que o estado muda
  useEffect(() => {
    try {
      const payload: PersistedSimulationData = {
        version: PERSISTED_DATA_VERSION,
        simulations: {
          prefixado: serializeSimulation(state.prefixado) as InvestmentSimulation,
          cdi: serializeSimulation(state.cdi) as InvestmentSimulation,
          ipca: serializeSimulation(state.ipca) as InvestmentSimulation,
        },
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (err) {
      console.warn('[useSimulationStorage] Erro ao persistir:', err)
    }
  }, [state])

  const updateSimulation = useCallback(
    (key: SimulationKey, sim: InvestmentSimulation) => {
      setState((prev) => ({
        ...prev,
        [key]: sim,
      }))
    },
    []
  )

  const resetAll = useCallback(() => {
    const fresh = structuredClone(DEFAULT_SIMULATION_STATE)
    setState(fresh)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignora
    }
  }, [])

  return { state, updateSimulation, resetAll }
}
