/**
 * InflationCalculator
 *
 * Serviço para cálculo de inflação acumulada e poder de compra.
 *
 * Metodologia:
 * - A inflação acumulada é calculada por juros compostos, não por soma simples.
 * - A rentabilidade real utiliza a fórmula de Fischer:
 *   rentabilidadeReal = (1 + nominalReturn) / (1 + inflacaoAcumulada) - 1
 * - Isso é matematicamente correto e evita distorções em prazos longos.
 *
 * Premissa: IPCA tratado como constante ao longo de toda a simulação.
 * (Esta simplificação é documentada na seção de metodologia da interface.)
 */

import { annualToMonthlyRate } from './InvestmentCalculator'

/**
 * Calcula a inflação acumulada em um período.
 *
 * @param annualInflationRate - Taxa de inflação anual (decimal, ex: 0.045 = 4,5%)
 * @param months - Prazo em meses
 * @returns Inflação acumulada total (decimal, ex: 0.093 = 9,3%)
 */
export function calculateAccumulatedInflation(
  annualInflationRate: number,
  months: number
): number {
  const monthlyRate = annualToMonthlyRate(annualInflationRate)
  return Math.pow(1 + monthlyRate, months) - 1
}

/**
 * Calcula a inflação acumulada para um período específico em dias.
 *
 * @param annualInflationRate - Taxa de inflação anual (decimal)
 * @param days - Número de dias corridos
 * @returns Inflação acumulada no período (decimal)
 */
export function calculateInflationForDays(
  annualInflationRate: number,
  days: number
): number {
  const dailyRate = Math.pow(1 + annualInflationRate, 1 / 365) - 1
  return Math.pow(1 + dailyRate, days) - 1
}

/**
 * Calcula a rentabilidade real usando a fórmula de Fischer.
 *
 * Fórmula: rentReal = (1 + nominalReturn) / (1 + inflacaoAcumulada) - 1
 *
 * NÃO usa subtração simples (nominalReturn - inflacaoAcumulada),
 * pois essa aproximação é imprecisa para prazos mais longos.
 *
 * @param nominalReturn - Rentabilidade nominal acumulada (decimal)
 * @param accumulatedInflation - Inflação acumulada no período (decimal)
 * @returns Rentabilidade real (decimal)
 */
export function calculateRealReturn(
  nominalReturn: number,
  accumulatedInflation: number
): number {
  if (accumulatedInflation <= -1) return 0
  return (1 + nominalReturn) / (1 + accumulatedInflation) - 1
}

/**
 * Calcula o poder de compra equivalente de um valor futuro em termos de hoje.
 *
 * @param futureValue - Valor futuro nominal
 * @param accumulatedInflation - Inflação acumulada no período
 * @returns Valor em poder de compra na data de hoje
 */
export function toPresentPurchasingPower(
  futureValue: number,
  accumulatedInflation: number
): number {
  if (accumulatedInflation <= -1) return futureValue
  return futureValue / (1 + accumulatedInflation)
}

/**
 * Retorna a descrição textual da inflação acumulada no período.
 *
 * @param annualInflationRate - Taxa de inflação anual (decimal)
 * @param months - Prazo em meses
 */
export function getInflationSummary(
  annualInflationRate: number,
  months: number
): {
  annualRate: number
  monthlyRate: number
  accumulatedRate: number
  months: number
} {
  const monthlyRate = annualToMonthlyRate(annualInflationRate)
  const accumulatedRate = calculateAccumulatedInflation(annualInflationRate, months)
  return {
    annualRate: annualInflationRate,
    monthlyRate,
    accumulatedRate,
    months,
  }
}
