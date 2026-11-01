/**
 * Testes unitários — TaxCalculator
 *
 * Valida:
 * - Tabela de IOF (dias 1–29, limite no dia 30)
 * - Tabela regressiva de IR (limites exatos: 180, 181, 360, 361, 720, 721)
 * - Cálculo de IOF sobre rendimento
 * - Cálculo de IR sobre base
 * - Resultado completo por lote (calculateLotTax)
 * - Regime isento (LCI/LCA)
 * - Agregação de resultados de múltiplos lotes
 */

import { describe, expect, it } from 'vitest'
import {
  aggregateTaxResults,
  calculateIOF,
  calculateIR,
  calculateLotTax,
  getIOFRate,
  getIRBracket,
  getIRRate,
} from '../services/TaxCalculator'
import type { InvestmentLot } from '../types/Investment'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function makeLot(principal: number, days: number): InvestmentLot {
  const appDate = new Date(2024, 0, 1)
  const redemptionDate = new Date(appDate)
  redemptionDate.setDate(redemptionDate.getDate() + days)
  return { principal, applicationDate: appDate, redemptionDate, calendarDays: days }
}

// ----------------------------------------------------------------
// IOF
// ----------------------------------------------------------------
describe('getIOFRate', () => {
  it('retorna 96% no dia 1', () => {
    expect(getIOFRate(1)).toBeCloseTo(0.96)
  })
  it('retorna 3% no dia 29', () => {
    expect(getIOFRate(29)).toBeCloseTo(0.03)
  })
  it('retorna 0 no dia 30', () => {
    expect(getIOFRate(30)).toBe(0)
  })
  it('retorna 0 para dias acima de 30', () => {
    expect(getIOFRate(100)).toBe(0)
    expect(getIOFRate(365)).toBe(0)
  })
  it('retorna valores corretos para dias intermediários', () => {
    expect(getIOFRate(15)).toBeCloseTo(0.50)
    expect(getIOFRate(10)).toBeCloseTo(0.66)
    expect(getIOFRate(20)).toBeCloseTo(0.33)
  })
})

describe('calculateIOF', () => {
  it('calcula IOF corretamente para 10 dias com rendimento de R$ 100', () => {
    // IOF = 100 * 0.66 = 66
    expect(calculateIOF(100, 10)).toBeCloseTo(66)
  })
  it('retorna 0 quando o rendimento é zero', () => {
    expect(calculateIOF(0, 10)).toBe(0)
  })
  it('retorna 0 quando o rendimento é negativo', () => {
    expect(calculateIOF(-10, 10)).toBe(0)
  })
  it('retorna 0 quando permanência >= 30 dias', () => {
    expect(calculateIOF(1000, 30)).toBe(0)
    expect(calculateIOF(1000, 180)).toBe(0)
  })
  it('calcula IOF no dia 1 (96%)', () => {
    expect(calculateIOF(200, 1)).toBeCloseTo(192)
  })
})

// ----------------------------------------------------------------
// IR
// ----------------------------------------------------------------
describe('getIRBracket', () => {
  it('retorna 22,5% para 0 dias', () => {
    expect(getIRBracket(0).rate).toBe(0.225)
  })
  it('retorna 22,5% para 180 dias (limite inferior)', () => {
    expect(getIRBracket(180).rate).toBe(0.225)
  })
  it('retorna 20% para 181 dias (limite superior da faixa)', () => {
    expect(getIRBracket(181).rate).toBe(0.200)
  })
  it('retorna 20% para 360 dias', () => {
    expect(getIRBracket(360).rate).toBe(0.200)
  })
  it('retorna 17,5% para 361 dias', () => {
    expect(getIRBracket(361).rate).toBe(0.175)
  })
  it('retorna 17,5% para 720 dias', () => {
    expect(getIRBracket(720).rate).toBe(0.175)
  })
  it('retorna 15% para 721 dias', () => {
    expect(getIRBracket(721).rate).toBe(0.150)
  })
  it('retorna 15% para prazos muito longos', () => {
    expect(getIRBracket(3650).rate).toBe(0.150)
  })
})

describe('getIRRate', () => {
  it('retorna alíquota correta para cada limite', () => {
    expect(getIRRate(180)).toBe(0.225)
    expect(getIRRate(181)).toBe(0.200)
    expect(getIRRate(360)).toBe(0.200)
    expect(getIRRate(361)).toBe(0.175)
    expect(getIRRate(720)).toBe(0.175)
    expect(getIRRate(721)).toBe(0.150)
  })
})

describe('calculateIR', () => {
  it('calcula IR corretamente com alíquota regressiva', () => {
    // 180 dias → 22,5% sobre 1000 = 225
    expect(calculateIR(1000, 180, 'regressivo')).toBeCloseTo(225)
    // 361 dias → 17,5% sobre 1000 = 175
    expect(calculateIR(1000, 361, 'regressivo')).toBeCloseTo(175)
  })
  it('retorna 0 para regime isento', () => {
    expect(calculateIR(1000, 180, 'isento')).toBe(0)
    expect(calculateIR(1000, 721, 'isento')).toBe(0)
  })
  it('retorna 0 quando base é zero ou negativa', () => {
    expect(calculateIR(0, 365, 'regressivo')).toBe(0)
    expect(calculateIR(-100, 365, 'regressivo')).toBe(0)
  })
})

// ----------------------------------------------------------------
// calculateLotTax — cálculo completo por lote
// ----------------------------------------------------------------
describe('calculateLotTax', () => {
  it('calcula corretamente lote com IR de 22,5% (< 180 dias)', () => {
    const lot = makeLot(1000, 90)
    // Gross value = 1100 → grossEarnings = 100
    // IOF = 0 (>= 30 dias)
    // IR = 100 * 22.5% = 22.50
    const result = calculateLotTax(lot, 1100, 'regressivo')
    expect(result.grossEarnings).toBeCloseTo(100)
    expect(result.iof).toBe(0)
    expect(result.irRate).toBe(0.225)
    expect(result.ir).toBeCloseTo(22.5)
    expect(result.netEarnings).toBeCloseTo(77.5)
    expect(result.netValue).toBeCloseTo(1077.5)
  })

  it('aplica IOF + IR para resgates < 30 dias', () => {
    const lot = makeLot(1000, 15)
    // grossEarnings = 50
    // IOF = 50 * 50% = 25
    // irBase = 50 - 25 = 25
    // IR = 25 * 22.5% = 5.625
    // netEarnings = 25 - 5.625 = 19.375
    const result = calculateLotTax(lot, 1050, 'regressivo')
    expect(result.grossEarnings).toBeCloseTo(50)
    expect(result.iof).toBeCloseTo(25)
    expect(result.irBase).toBeCloseTo(25)
    expect(result.ir).toBeCloseTo(5.625)
    expect(result.netEarnings).toBeCloseTo(19.375)
    expect(result.netValue).toBeCloseTo(1019.375)
  })

  it('isento de IR não calcula imposto', () => {
    const lot = makeLot(5000, 365)
    const result = calculateLotTax(lot, 5500, 'isento')
    expect(result.grossEarnings).toBeCloseTo(500)
    expect(result.ir).toBe(0)
    expect(result.irRate).toBe(0)
    expect(result.netEarnings).toBeCloseTo(500)
    expect(result.netValue).toBeCloseTo(5500)
  })

  it('usa alíquota de 15% para prazos acima de 720 dias', () => {
    const lot = makeLot(10000, 721)
    const result = calculateLotTax(lot, 11000, 'regressivo')
    // grossEarnings = 1000
    // IR = 1000 * 15% = 150
    expect(result.irRate).toBe(0.15)
    expect(result.ir).toBeCloseTo(150)
    expect(result.netEarnings).toBeCloseTo(850)
  })

  it('não aplica IR negativo quando gross = principal', () => {
    const lot = makeLot(1000, 90)
    const result = calculateLotTax(lot, 1000, 'regressivo')
    expect(result.grossEarnings).toBe(0)
    expect(result.ir).toBe(0)
    expect(result.netEarnings).toBe(0)
    expect(result.netValue).toBe(1000)
  })
})

// ----------------------------------------------------------------
// aggregateTaxResults
// ----------------------------------------------------------------
describe('aggregateTaxResults', () => {
  it('agrega corretamente dois lotes', () => {
    const lot1 = makeLot(1000, 365)
    const lot2 = makeLot(500, 180)
    const r1 = calculateLotTax(lot1, 1100, 'regressivo') // earnings=100, IR=15
    const r2 = calculateLotTax(lot2, 550, 'regressivo')  // earnings=50, IR=11.25
    const agg = aggregateTaxResults([r1, r2])
    expect(agg.totalPrincipal).toBeCloseTo(1500)
    expect(agg.totalGrossEarnings).toBeCloseTo(150)
    expect(agg.totalIR).toBeCloseTo(r1.ir + r2.ir)
    expect(agg.totalNetValue).toBeCloseTo(r1.netValue + r2.netValue)
  })

  it('retorna zeros para array vazio', () => {
    const agg = aggregateTaxResults([])
    expect(agg.totalPrincipal).toBe(0)
    expect(agg.totalIR).toBe(0)
  })
})
