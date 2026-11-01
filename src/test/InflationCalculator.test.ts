/**
 * Testes unitários — InflationCalculator
 *
 * Valida:
 * - Inflação acumulada por juros compostos
 * - Rentabilidade real (fórmula de Fischer)
 * - Poder de compra presente
 */

import { describe, expect, it } from 'vitest'
import {
  calculateAccumulatedInflation,
  calculateInflationForDays,
  calculateRealReturn,
  toPresentPurchasingPower,
} from '../services/InflationCalculator'

describe('calculateAccumulatedInflation', () => {
  it('inflação acumulada em 12 meses ≈ inflação anual', () => {
    const annual = 0.045
    const accumulated = calculateAccumulatedInflation(annual, 12)
    expect(accumulated).toBeCloseTo(annual, 4)
  })

  it('é maior que a inflação anual para prazos maiores de 12 meses', () => {
    const annual = 0.045
    const acc24 = calculateAccumulatedInflation(annual, 24)
    // Capitalização composta: (1.045)^2 - 1 ≈ 9,2%
    expect(acc24).toBeGreaterThan(annual)
    expect(acc24).toBeCloseTo(Math.pow(1 + annual, 2) - 1, 4)
  })

  it('com inflação zero, acumulado é zero', () => {
    expect(calculateAccumulatedInflation(0, 12)).toBeCloseTo(0)
    expect(calculateAccumulatedInflation(0, 24)).toBeCloseTo(0)
  })

  it('inflação para prazo 0 é zero', () => {
    expect(calculateAccumulatedInflation(0.05, 0)).toBeCloseTo(0)
  })
})

describe('calculateInflationForDays', () => {
  it('inflação para 365 dias ≈ inflação anual', () => {
    const annual = 0.045
    const acc = calculateInflationForDays(annual, 365)
    expect(acc).toBeCloseTo(annual, 3)
  })

  it('inflação para 0 dias é zero', () => {
    expect(calculateInflationForDays(0.05, 0)).toBeCloseTo(0)
  })
})

describe('calculateRealReturn', () => {
  it('aplica fórmula de Fischer corretamente', () => {
    const nominal = 0.15
    const inflation = 0.045
    const expected = (1 + nominal) / (1 + inflation) - 1
    expect(calculateRealReturn(nominal, inflation)).toBeCloseTo(expected, 8)
  })

  it('com inflação igual à nominal, real ≈ 0', () => {
    const rate = 0.10
    expect(calculateRealReturn(rate, rate)).toBeCloseTo(0, 8)
  })

  it('retorna 0 quando inflação = -1 (evita divisão por zero)', () => {
    expect(calculateRealReturn(0.10, -1)).toBe(0)
  })

  it('rentabilidade real > 0 quando nominal > inflação', () => {
    expect(calculateRealReturn(0.15, 0.05)).toBeGreaterThan(0)
  })

  it('rentabilidade real < 0 quando nominal < inflação', () => {
    expect(calculateRealReturn(0.03, 0.05)).toBeLessThan(0)
  })

  it('resultado difere da subtração simples (demonstra necessidade da fórmula)', () => {
    const nominal = 0.20
    const inflation = 0.10
    const fischer = calculateRealReturn(nominal, inflation)
    const simpleSubtraction = nominal - inflation // = 0.10
    // Fischer: (1.20)/(1.10) - 1 ≈ 0.0909... ≠ 0.10
    expect(fischer).not.toBeCloseTo(simpleSubtraction, 3)
    expect(fischer).toBeCloseTo(0.0909, 3)
  })
})

describe('toPresentPurchasingPower', () => {
  it('desconta inflação do valor futuro', () => {
    const future = 1100
    const inflation = 0.10
    const present = toPresentPurchasingPower(future, inflation)
    expect(present).toBeCloseTo(1000, 2)
  })

  it('com inflação zero, retorna o próprio valor', () => {
    expect(toPresentPurchasingPower(5000, 0)).toBeCloseTo(5000, 4)
  })

  it('retorna o valor original quando inflação = -1', () => {
    expect(toPresentPurchasingPower(5000, -1)).toBe(5000)
  })
})
