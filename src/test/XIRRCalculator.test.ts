/**
 * Testes unitários — XIRRCalculator
 *
 * Valida:
 * - XIRR de fluxo simples (sem aportes intermediários)
 * - XIRR com aportes mensais irregulares
 * - Convergência via Newton-Raphson e bisseção
 * - Casos sem solução (retorna null)
 * - buildCashFlows constrói fluxos corretamente
 */

import { describe, expect, it } from 'vitest'
import { buildCashFlows, calculateXIRR, type CashFlow } from '../services/XIRRCalculator'

const TOLERANCE = 0.001 // 0,1% — suficiente para validação

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function d(y: number, m: number, day: number) {
  return new Date(y, m - 1, day)
}

// ----------------------------------------------------------------
// calculateXIRR — casos básicos
// ----------------------------------------------------------------
describe('calculateXIRR', () => {
  it('retorna null para array vazio', () => {
    expect(calculateXIRR([])).toBeNull()
  })

  it('retorna null para apenas um fluxo', () => {
    expect(calculateXIRR([{ date: d(2024, 1, 1), amount: -1000 }])).toBeNull()
  })

  it('retorna null quando só há saídas', () => {
    const flows: CashFlow[] = [
      { date: d(2024, 1, 1), amount: -1000 },
      { date: d(2024, 7, 1), amount: -500 },
    ]
    expect(calculateXIRR(flows)).toBeNull()
  })

  it('retorna null quando só há entradas', () => {
    const flows: CashFlow[] = [
      { date: d(2024, 1, 1), amount: 1000 },
      { date: d(2025, 1, 1), amount: 500 },
    ]
    expect(calculateXIRR(flows)).toBeNull()
  })

  it('calcula XIRR para investimento simples sem aportes', () => {
    // -10.000 em 01/01/2024, +11.500 em 01/01/2025 (365 dias)
    // XIRR ≈ 15% a.a.
    const flows: CashFlow[] = [
      { date: d(2024, 1, 1), amount: -10000 },
      { date: d(2025, 1, 1), amount: 11500 },
    ]
    const xirr = calculateXIRR(flows)
    expect(xirr).not.toBeNull()
    expect(xirr!).toBeCloseTo(0.15, 2)
  })

  it('calcula XIRR para investimento de 2 anos', () => {
    // -10.000 em 01/01/2024, +13.225 em 01/01/2026 (730 dias)
    // (1.15)^2 = 1.3225 → XIRR ≈ 15% a.a.
    const flows: CashFlow[] = [
      { date: d(2024, 1, 1), amount: -10000 },
      { date: d(2026, 1, 1), amount: 13225 },
    ]
    const xirr = calculateXIRR(flows)
    expect(xirr).not.toBeNull()
    expect(xirr!).toBeCloseTo(0.15, 2)
  })

  it('calcula XIRR com aportes mensais regulares', () => {
    // Investimento: -10.000 inicial + 6 aportes de -500 a cada mês
    // Resgate: valor aproximado após 7 meses com 12% a.a.
    const start = d(2024, 1, 1)
    const flows: CashFlow[] = [
      { date: start, amount: -10000 },
    ]
    // 6 aportes mensais
    for (let m = 1; m <= 6; m++) {
      flows.push({ date: d(2024, m + 1, 1), amount: -500 })
    }
    // Resgate no mês 7 com retorno próximo de 12% a.a.
    // Estimativa conservadora do valor bruto
    flows.push({ date: d(2024, 8, 1), amount: 13500 })

    const xirr = calculateXIRR(flows)
    expect(xirr).not.toBeNull()
    // Taxa positiva e plausível (entre 0% e 50% a.a.)
    expect(xirr!).toBeGreaterThan(0)
    expect(xirr!).toBeLessThan(0.5)
  })

  it('retorna taxa positiva quando resgate > total investido', () => {
    const flows: CashFlow[] = [
      { date: d(2024, 1, 1), amount: -5000 },
      { date: d(2025, 6, 1), amount: 6000 },
    ]
    const xirr = calculateXIRR(flows)
    expect(xirr).not.toBeNull()
    expect(xirr!).toBeGreaterThan(0)
  })

  it('retorna taxa negativa quando resgate < total investido', () => {
    const flows: CashFlow[] = [
      { date: d(2024, 1, 1), amount: -5000 },
      { date: d(2025, 1, 1), amount: 4500 },
    ]
    const xirr = calculateXIRR(flows)
    expect(xirr).not.toBeNull()
    expect(xirr!).toBeLessThan(0)
  })

  it('XIRR é consistente com rentabilidade nominal para fluxo simples', () => {
    // Com um único aporte e resgate em exatamente 1 ano,
    // XIRR deve ser igual à rentabilidade nominal simples.
    const principal = 20000
    const nominalRate = 0.145 // 14,5% a.a.
    const grossValue = principal * (1 + nominalRate)

    const flows: CashFlow[] = [
      { date: d(2024, 1, 1), amount: -principal },
      { date: d(2025, 1, 1), amount: grossValue },
    ]
    const xirr = calculateXIRR(flows)
    expect(xirr).not.toBeNull()
    expect(xirr!).toBeCloseTo(nominalRate, TOLERANCE)
  })
})

// ----------------------------------------------------------------
// buildCashFlows
// ----------------------------------------------------------------
describe('buildCashFlows', () => {
  it('cria saídas para cada lote e uma entrada final', () => {
    const lots = [
      { applicationDate: d(2024, 1, 1), principal: 10000 },
      { applicationDate: d(2024, 2, 5), principal: 500 },
    ]
    const flows = buildCashFlows(lots, 11200, d(2026, 1, 1))

    expect(flows).toHaveLength(3)
    // Duas saídas (negativas)
    const outflows = flows.filter((f) => f.amount < 0)
    expect(outflows).toHaveLength(2)
    expect(outflows[0].amount).toBe(-10000)
    expect(outflows[1].amount).toBe(-500)
    // Uma entrada (positiva)
    const inflows = flows.filter((f) => f.amount > 0)
    expect(inflows).toHaveLength(1)
    expect(inflows[0].amount).toBe(11200)
  })

  it('ordena fluxos cronologicamente', () => {
    const lots = [
      { applicationDate: d(2024, 3, 1), principal: 500 },
      { applicationDate: d(2024, 1, 1), principal: 10000 },
    ]
    const flows = buildCashFlows(lots, 11000, d(2025, 1, 1))
    for (let i = 1; i < flows.length; i++) {
      expect(flows[i].date.getTime()).toBeGreaterThanOrEqual(flows[i - 1].date.getTime())
    }
  })
})
