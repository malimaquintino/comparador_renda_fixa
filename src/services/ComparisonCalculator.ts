/**
 * ComparisonCalculator
 *
 * Indicadores comparativos para a aba Comparativo.
 *
 * Metodologia:
 *
 * RENTABILIDADE ANUALIZADA
 *   Converte a rentabilidade acumulada de qualquer prazo para equivalente anual:
 *   taxaAnualizada = (1 + rentAcumulada)^(365 / diasTotais) - 1
 *   Usa dias corridos reais entre início e fim, não apenas meses × 30.
 *
 * XIRR
 *   Delega ao XIRRCalculator. Reconstrói os fluxos de caixa a partir dos
 *   lotes da simulação (saídas) + valor líquido final (entrada).
 *   Retorna null quando não há convergência ou dados insuficientes.
 *
 * COMPARAÇÃO DE CONDIÇÕES
 *   Verifica se dois investimentos têm prazo, capital inicial e aporte iguais.
 *   Se diferentes, o comparativo deve exibir aviso ao usuário.
 */

import type { InvestmentResult } from '../types/Investment'
import type { InvestmentSimulation, SingleInvestmentParameters } from '../types/Simulation'
import { calendarDaysBetween, getEndDate } from './InvestmentCalculator'
import { buildCashFlows, calculateXIRR } from './XIRRCalculator'

// ----------------------------------------------------------------
// Indicadores de uma simulação para o comparativo
// ----------------------------------------------------------------

export interface ComparisonMetrics {
  /** Nome do investimento */
  name: string
  /** Taxa contratada (label formatável externamente) */
  annualRate: number
  category: 'prefixado' | 'cdi' | 'ipca'
  termMonths: number
  initialAmount: number
  monthlyContribution: number
  /** Resultado completo da simulação */
  result: InvestmentResult
  /** Rentabilidade líquida acumulada (decimal) */
  nominalNetReturn: number
  /** Rentabilidade líquida anualizada (decimal) */
  annualizedNetReturn: number
  /** Rentabilidade real líquida anualizada (decimal) */
  annualizedRealNetReturn: number
  /** XIRR líquida (decimal, null se não convergiu) */
  xirr: number | null
  /** Dias corridos totais efetivos */
  totalDays: number
  /** É o melhor por valor líquido final */
  isBestByNetBalance: boolean
  /** É o melhor por XIRR */
  isBestByXIRR: boolean
  /** É o melhor por rentabilidade anualizada */
  isBestByAnnualized: boolean
}

// ----------------------------------------------------------------
// Utilitários internos
// ----------------------------------------------------------------

/**
 * Calcula a rentabilidade anualizada a partir da acumulada e dos dias totais.
 * taxaAnualizada = (1 + acumulada)^(365 / dias) - 1
 */
export function annualizeReturn(accumulatedReturn: number, totalDays: number): number {
  if (totalDays <= 0) return 0
  return Math.pow(1 + accumulatedReturn, 365 / totalDays) - 1
}

/**
 * Reconstrói os fluxos de caixa de uma simulação para o XIRR.
 *
 * Como InvestmentResult não expõe os lotes diretamente, reconstruímos
 * os fluxos a partir dos pontos da série mensal:
 * - O delta de totalInvested entre meses consecutivos representa novos aportes.
 * - O valor líquido final é a entrada de caixa.
 */
function buildFlowsFromMonthlyData(
  result: InvestmentResult,
  params: SingleInvestmentParameters
): ReturnType<typeof buildCashFlows> {
  const startDate = new Date(params.startDate + 'T12:00:00')
  const endDate = getEndDate(startDate, params.termMonths)

  const flows: Array<{ applicationDate: Date; principal: number }> = []

  // Lote inicial
  if (params.initialAmount > 0) {
    flows.push({ applicationDate: startDate, principal: params.initialAmount })
  }

  // Aportes mensais — reconstruídos a partir do delta de totalInvested
  const monthly = result.monthlyData
  for (let i = 1; i < monthly.length; i++) {
    const delta = monthly[i].totalInvested - monthly[i - 1].totalInvested
    if (delta > 0.01) {
      flows.push({
        applicationDate: monthly[i].date,
        principal: delta,
      })
    }
  }

  return buildCashFlows(flows, result.netBalance, endDate)
}

// ----------------------------------------------------------------
// Função principal
// ----------------------------------------------------------------

/**
 * Calcula os indicadores comparativos para uma simulação individual.
 */
export function buildComparisonMetrics(
  simulation: InvestmentSimulation
): ComparisonMetrics | null {
  if (!simulation.result) return null

  const { parameters: params, result } = simulation
  const startDate = new Date(params.startDate + 'T12:00:00')
  const endDate = getEndDate(startDate, params.termMonths)
  const totalDays = calendarDaysBetween(startDate, endDate)

  // Rentabilidade anualizada líquida
  const annualizedNetReturn = annualizeReturn(result.nominalNetReturn, totalDays)

  // Rentabilidade real anualizada líquida
  const annualizedRealNetReturn = annualizeReturn(result.realNetReturn, totalDays)

  // XIRR
  let xirr: number | null = null
  try {
    const cashFlows = buildFlowsFromMonthlyData(result, params)
    xirr = calculateXIRR(cashFlows)
  } catch {
    xirr = null
  }

  return {
    name: params.name,
    annualRate: params.annualRate,
    category: params.category,
    termMonths: params.termMonths,
    initialAmount: params.initialAmount,
    monthlyContribution: params.monthlyContribution,
    result,
    nominalNetReturn: result.nominalNetReturn,
    annualizedNetReturn,
    annualizedRealNetReturn,
    xirr,
    totalDays,
    isBestByNetBalance: false, // preenchido pelo comparativo consolidado
    isBestByXIRR: false,
    isBestByAnnualized: false,
  }
}

/**
 * Consolida os indicadores das três modalidades e marca os melhores.
 */
export function consolidateComparison(
  metrics: (ComparisonMetrics | null)[]
): ComparisonMetrics[] {
  const available = metrics.filter((m): m is ComparisonMetrics => m !== null)
  if (available.length === 0) return []

  const maxNetBalance = Math.max(...available.map((m) => m.result.netBalance))
  const xirrValues = available.map((m) => m.xirr).filter((x): x is number => x !== null)
  const maxXIRR = xirrValues.length > 0 ? Math.max(...xirrValues) : null
  const maxAnnualized = Math.max(...available.map((m) => m.annualizedNetReturn))

  return available.map((m) => ({
    ...m,
    isBestByNetBalance: m.result.netBalance === maxNetBalance,
    isBestByXIRR: maxXIRR !== null && m.xirr === maxXIRR,
    isBestByAnnualized: m.annualizedNetReturn === maxAnnualized,
  }))
}

// ----------------------------------------------------------------
// Verificação de condições equivalentes
// ----------------------------------------------------------------

export interface ConditionDiff {
  termMonths: boolean
  initialAmount: boolean
  monthlyContribution: boolean
}

/**
 * Verifica se dois conjuntos de métricas têm condições equivalentes.
 * Retorna quais campos diferem.
 */
export function checkConditionDifferences(
  metrics: ComparisonMetrics[]
): ConditionDiff {
  if (metrics.length <= 1) {
    return { termMonths: false, initialAmount: false, monthlyContribution: false }
  }

  const ref = metrics[0]
  const termDiff = metrics.some((m) => m.termMonths !== ref.termMonths)
  const initialDiff = metrics.some(
    (m) => Math.abs(m.initialAmount - ref.initialAmount) > 0.01
  )
  const contributionDiff = metrics.some(
    (m) => Math.abs(m.monthlyContribution - ref.monthlyContribution) > 0.01
  )

  return {
    termMonths: termDiff,
    initialAmount: initialDiff,
    monthlyContribution: contributionDiff,
  }
}

/**
 * Retorna true se houver qualquer diferença de condições entre os investimentos.
 */
export function hasConditionDifferences(metrics: ComparisonMetrics[]): boolean {
  const diff = checkConditionDifferences(metrics)
  return diff.termMonths || diff.initialAmount || diff.monthlyContribution
}
