/**
 * TaxCalculator
 *
 * Serviço responsável pelo cálculo de tributação de investimentos em renda fixa.
 *
 * Metodologia:
 * - IOF regressivo conforme tabela da Receita Federal (Decreto nº 6.306/2007),
 *   incide sobre o rendimento em resgates realizados em até 30 dias corridos.
 * - IR regressivo conforme tabela da Lei nº 11.033/2004, calculado individualmente
 *   por lote (cada aporte tem seu próprio prazo e alíquota).
 * - O IOF é calculado primeiro e deduzido da base de cálculo do IR.
 * - Produtos configurados como "isento" não têm IR calculado (LCI, LCA, etc.).
 */

import type { InvestmentLot, LotTaxResult, TaxRegime } from '../types/Investment'

// ----------------------------------------------------------------
// Tabela de IOF regressivo (dias 1 a 29)
// No dia 30 e acima, IOF = 0%
// Fonte: Decreto nº 6.306/2007, art. 46
// ----------------------------------------------------------------
const IOF_TABLE: Record<number, number> = {
  1: 0.96,  2: 0.93,  3: 0.90,  4: 0.86,  5: 0.83,
  6: 0.80,  7: 0.76,  8: 0.73,  9: 0.70, 10: 0.66,
  11: 0.63, 12: 0.60, 13: 0.56, 14: 0.53, 15: 0.50,
  16: 0.46, 17: 0.43, 18: 0.40, 19: 0.36, 20: 0.33,
  21: 0.30, 22: 0.26, 23: 0.23, 24: 0.20, 25: 0.16,
  26: 0.13, 27: 0.10, 28: 0.06, 29: 0.03,
}

// ----------------------------------------------------------------
// Tabela regressiva de IR (Lei nº 11.033/2004)
// ----------------------------------------------------------------
export interface IRBracket {
  minDays: number
  maxDays: number | null
  rate: number
  label: string
}

export const IR_TABLE: IRBracket[] = [
  { minDays: 0,   maxDays: 180, rate: 0.225, label: 'Até 180 dias' },
  { minDays: 181, maxDays: 360, rate: 0.200, label: '181 a 360 dias' },
  { minDays: 361, maxDays: 720, rate: 0.175, label: '361 a 720 dias' },
  { minDays: 721, maxDays: null, rate: 0.150, label: 'Acima de 720 dias' },
]

// ----------------------------------------------------------------
// Funções utilitárias
// ----------------------------------------------------------------

/**
 * Retorna a alíquota de IOF para um determinado número de dias corridos.
 * IOF incide somente nos primeiros 29 dias; a partir do 30º dia, alíquota = 0.
 */
export function getIOFRate(calendarDays: number): number {
  if (calendarDays >= 30) return 0
  return IOF_TABLE[calendarDays] ?? 0
}

/**
 * Retorna o bracket de IR aplicável conforme os dias corridos.
 */
export function getIRBracket(calendarDays: number): IRBracket {
  for (const bracket of IR_TABLE) {
    if (
      calendarDays >= bracket.minDays &&
      (bracket.maxDays === null || calendarDays <= bracket.maxDays)
    ) {
      return bracket
    }
  }
  // Fallback (não deve ocorrer com a tabela completa)
  return IR_TABLE[IR_TABLE.length - 1]
}

/**
 * Retorna a alíquota de IR aplicável conforme os dias corridos.
 */
export function getIRRate(calendarDays: number): number {
  return getIRBracket(calendarDays).rate
}

/**
 * Calcula o IOF sobre o rendimento bruto de um lote.
 *
 * @param grossEarnings - Rendimento bruto do lote (R$)
 * @param calendarDays - Dias corridos de permanência
 * @returns Valor do IOF (R$)
 */
export function calculateIOF(grossEarnings: number, calendarDays: number): number {
  if (grossEarnings <= 0 || calendarDays >= 30) return 0
  const iofRate = getIOFRate(calendarDays)
  return grossEarnings * iofRate
}

/**
 * Calcula o IR sobre a base (rendimento após IOF) de um lote.
 *
 * @param irBase - Base de cálculo do IR (rendimento - IOF)
 * @param calendarDays - Dias corridos de permanência
 * @param taxRegime - Regime tributário do produto
 * @returns Valor do IR (R$)
 */
export function calculateIR(
  irBase: number,
  calendarDays: number,
  taxRegime: TaxRegime
): number {
  if (irBase <= 0) return 0
  if (taxRegime === 'isento') return 0
  const irRate = getIRRate(calendarDays)
  return irBase * irRate
}

/**
 * Calcula o resultado tributário completo de um lote de investimento.
 *
 * Fluxo de cálculo:
 * 1. Calcula rendimento bruto: grossEarnings = grossValue - principal
 * 2. Calcula IOF sobre o rendimento bruto (se < 30 dias)
 * 3. Base do IR = rendimento bruto - IOF
 * 4. Calcula IR sobre a base (conforme regime tributário e prazo)
 * 5. Rendimento líquido = base IR - IR
 * 6. Valor líquido = principal + rendimento líquido
 *
 * @param lot - Lote de investimento com principal e datas
 * @param grossValue - Valor bruto do lote ao final do período
 * @param taxRegime - Regime tributário do produto
 */
export function calculateLotTax(
  lot: InvestmentLot,
  grossValue: number,
  taxRegime: TaxRegime
): LotTaxResult {
  const grossEarnings = Math.max(0, grossValue - lot.principal)

  const iof = calculateIOF(grossEarnings, lot.calendarDays)
  const irBase = Math.max(0, grossEarnings - iof)
  const irRate = taxRegime === 'isento' ? 0 : getIRRate(lot.calendarDays)
  const ir = taxRegime === 'isento' ? 0 : calculateIR(irBase, lot.calendarDays, taxRegime)
  const netEarnings = irBase - ir
  const netValue = lot.principal + netEarnings

  return {
    lot,
    grossEarnings,
    iof,
    irBase,
    irRate,
    ir,
    netEarnings,
    netValue,
  }
}

/**
 * Agrega os resultados tributários de todos os lotes de um investimento.
 *
 * @param lotResults - Array com o resultado tributário de cada lote
 * @returns Totais consolidados
 */
export function aggregateTaxResults(lotResults: LotTaxResult[]): {
  totalPrincipal: number
  totalGrossValue: number
  totalGrossEarnings: number
  totalIOF: number
  totalIR: number
  totalNetEarnings: number
  totalNetValue: number
} {
  return lotResults.reduce(
    (acc, r) => ({
      totalPrincipal: acc.totalPrincipal + r.lot.principal,
      totalGrossValue: acc.totalGrossValue + r.lot.principal + r.grossEarnings,
      totalGrossEarnings: acc.totalGrossEarnings + r.grossEarnings,
      totalIOF: acc.totalIOF + r.iof,
      totalIR: acc.totalIR + r.ir,
      totalNetEarnings: acc.totalNetEarnings + r.netEarnings,
      totalNetValue: acc.totalNetValue + r.netValue,
    }),
    {
      totalPrincipal: 0,
      totalGrossValue: 0,
      totalGrossEarnings: 0,
      totalIOF: 0,
      totalIR: 0,
      totalNetEarnings: 0,
      totalNetValue: 0,
    }
  )
}
