/**
 * Tipos de estado das simulações independentes.
 *
 * Cada modalidade (Prefixado, CDI, IPCA+) possui seu próprio objeto
 * InvestmentSimulation contendo parâmetros, resultado e metadados.
 *
 * Os objetos nunca são compartilhados mutavelmente entre modalidades.
 */

import type { InvestmentCategory, InvestmentResult, TaxRegime } from './Investment'

// ----------------------------------------------------------------
// Parâmetros de uma simulação individual
// (cada modalidade só precisa de um produto)
// ----------------------------------------------------------------

export interface SingleInvestmentParameters {
  /** Nome do investimento (ex: "CDB Banco XYZ") */
  name: string
  /** Modalidade — determina quais campos de taxa são usados */
  category: InvestmentCategory
  /**
   * Taxa principal do produto (em decimal):
   * - Prefixado: taxa a.a. (ex: 0.145)
   * - CDI: percentual do CDI (ex: 1.06 = 106%)
   * - IPCA+: spread sobre IPCA (ex: 0.07)
   */
  annualRate: number
  /** Taxa CDI anual projetada (decimal) — usada em modalidade CDI */
  cdiRate: number
  /** Taxa IPCA anual projetada (decimal) — usada em modalidade IPCA+ */
  ipcaRate: number
  /** Data de início da aplicação (ISO YYYY-MM-DD) */
  startDate: string
  /** Prazo em meses */
  termMonths: number
  /** Valor inicial investido (R$) */
  initialAmount: number
  /** Aporte mensal (R$, 0 = sem aportes) */
  monthlyContribution: number
  /** Dia do mês para aportes (1–28) */
  contributionDay: number
  /** Regime tributário */
  taxRegime: TaxRegime
}

// ----------------------------------------------------------------
// Status de cada simulação
// ----------------------------------------------------------------

export type SimulationStatus =
  | 'not_simulated'  // Nunca foi executada
  | 'calculated'     // Executada e resultado atualizado
  | 'outdated'       // Parâmetros alterados após última execução

// ----------------------------------------------------------------
// Estado completo de uma modalidade
// ----------------------------------------------------------------

export interface InvestmentSimulation {
  /** Parâmetros configurados pelo usuário */
  parameters: SingleInvestmentParameters
  /**
   * Resultado da última execução.
   * null se nunca simulado.
   * Permanece disponível mesmo quando status = 'outdated'.
   */
  result: InvestmentResult | null
  /** Data/hora da última execução (ISO string) */
  lastCalculatedAt: string | null
  /** Status de atualização */
  status: SimulationStatus
}

// ----------------------------------------------------------------
// Estado global das três modalidades
// ----------------------------------------------------------------

export interface SimulationState {
  prefixado: InvestmentSimulation
  cdi: InvestmentSimulation
  ipca: InvestmentSimulation
}

// ----------------------------------------------------------------
// Tipo das chaves de modalidade
// ----------------------------------------------------------------

export type SimulationKey = keyof SimulationState

// ----------------------------------------------------------------
// Estrutura persistida no LocalStorage
// ----------------------------------------------------------------

export interface PersistedSimulationData {
  /** Versão do esquema — permite migração futura */
  version: number
  simulations: SimulationState
}

export const PERSISTED_DATA_VERSION = 1

// ----------------------------------------------------------------
// Valores padrão por modalidade
// ----------------------------------------------------------------

export const DEFAULT_PREFIXADO_PARAMS: SingleInvestmentParameters = {
  name: 'Prefixado 14,50% a.a.',
  category: 'prefixado',
  annualRate: 0.145,
  cdiRate: 0.1365,
  ipcaRate: 0.045,
  startDate: new Date().toISOString().slice(0, 10),
  termMonths: 24,
  initialAmount: 10000,
  monthlyContribution: 500,
  contributionDay: 5,
  taxRegime: 'regressivo',
}

export const DEFAULT_CDI_PARAMS: SingleInvestmentParameters = {
  name: 'CDB 106% CDI',
  category: 'cdi',
  annualRate: 1.06,
  cdiRate: 0.1365,
  ipcaRate: 0.045,
  startDate: new Date().toISOString().slice(0, 10),
  termMonths: 24,
  initialAmount: 10000,
  monthlyContribution: 500,
  contributionDay: 5,
  taxRegime: 'regressivo',
}

export const DEFAULT_IPCA_PARAMS: SingleInvestmentParameters = {
  name: 'IPCA+ 7,00% a.a.',
  category: 'ipca',
  annualRate: 0.07,
  cdiRate: 0.1365,
  ipcaRate: 0.045,
  startDate: new Date().toISOString().slice(0, 10),
  termMonths: 24,
  initialAmount: 10000,
  monthlyContribution: 500,
  contributionDay: 5,
  taxRegime: 'regressivo',
}

function makeDefault(params: SingleInvestmentParameters): InvestmentSimulation {
  return {
    parameters: params,
    result: null,
    lastCalculatedAt: null,
    status: 'not_simulated',
  }
}

export const DEFAULT_SIMULATION_STATE: SimulationState = {
  prefixado: makeDefault(DEFAULT_PREFIXADO_PARAMS),
  cdi: makeDefault(DEFAULT_CDI_PARAMS),
  ipca: makeDefault(DEFAULT_IPCA_PARAMS),
}

// ----------------------------------------------------------------
// Helpers para converter entre SingleInvestmentParameters e SimulationParams
// ----------------------------------------------------------------

import type { EconomicAssumptions, FinancialParameters, InvestmentProduct, SimulationParams } from './Investment'

/**
 * Converte os parâmetros de uma modalidade individual para o formato
 * esperado por runSimulation (que suporta múltiplos produtos).
 */
export function toSimulationParams(p: SingleInvestmentParameters): SimulationParams {
  const economic: EconomicAssumptions = {
    cdiRate: p.cdiRate,
    ipcaRate: p.ipcaRate,
    startDate: p.startDate,
  }
  const financial: FinancialParameters = {
    termMonths: p.termMonths,
    initialAmount: p.initialAmount,
    monthlyContribution: p.monthlyContribution,
    contributionDay: p.contributionDay,
  }
  const product: InvestmentProduct = {
    id: `sim-${p.category}`,
    name: p.name,
    category: p.category,
    annualRate: p.annualRate,
    taxRegime: p.taxRegime,
  }
  return { economic, financial, products: [product] }
}
