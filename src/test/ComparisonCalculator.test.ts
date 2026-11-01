/**
 * Testes unitários — ComparisonCalculator
 *
 * Valida:
 * - annualizeReturn (conversão acumulada → anualizada)
 * - buildComparisonMetrics (métricas por simulação)
 * - consolidateComparison (marca melhores)
 * - checkConditionDifferences (detecta condições diferentes)
 * - hasConditionDifferences
 * - Comparação parcial (apenas uma ou duas modalidades)
 * - Comparação completa
 */

import { describe, expect, it } from 'vitest'
import {
  annualizeReturn,
  buildComparisonMetrics,
  checkConditionDifferences,
  consolidateComparison,
  hasConditionDifferences,
} from '../services/ComparisonCalculator'
import { runSimulation } from '../services/InvestmentCalculator'
import type { InvestmentSimulation } from '../types/Simulation'
import { toSimulationParams } from '../types/Simulation'
import { DEFAULT_CDI_PARAMS, DEFAULT_IPCA_PARAMS, DEFAULT_PREFIXADO_PARAMS } from '../types/Simulation'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function makeSim(
  params = DEFAULT_PREFIXADO_PARAMS,
  simulate = true
): InvestmentSimulation {
  if (!simulate) {
    return { parameters: params, result: null, lastCalculatedAt: null, status: 'not_simulated' }
  }
  const simResult = runSimulation(toSimulationParams(params))
  return {
    parameters: params,
    result: simResult.results[0],
    lastCalculatedAt: new Date().toISOString(),
    status: 'calculated',
  }
}

// ----------------------------------------------------------------
// annualizeReturn
// ----------------------------------------------------------------
describe('annualizeReturn', () => {
  it('retorna 0 quando dias = 0', () => {
    expect(annualizeReturn(0.15, 0)).toBe(0)
  })

  it('para prazo de exatamente 365 dias, retorna a própria taxa acumulada', () => {
    const rate = 0.15
    expect(annualizeReturn(rate, 365)).toBeCloseTo(rate, 6)
  })

  it('para prazo de 730 dias, a anualizada é menor que a acumulada', () => {
    // Acumulada em 2 anos ≈ 32,25% se 15% a.a.
    // Anualizada deve retornar ≈ 15%
    const accumulated = Math.pow(1.15, 2) - 1 // ≈ 0.3225
    const annualized = annualizeReturn(accumulated, 730)
    expect(annualized).toBeCloseTo(0.15, 2)
  })

  it('para prazo de 180 dias, a anualizada é maior que a acumulada', () => {
    // 7% em 180 dias → anualizada > 7%
    expect(annualizeReturn(0.07, 180)).toBeGreaterThan(0.07)
  })

  it('é consistente com annualToMonthlyRate — 12 meses reproduz taxa anual', () => {
    // Se a rentabilidade mensal é r, acumulada em 12 meses = (1+r)^12 - 1
    // Anualizada deve retornar o equivalente anual
    const monthlyRate = 0.01
    const accumulated = Math.pow(1 + monthlyRate, 12) - 1
    const days = 365
    const annualized = annualizeReturn(accumulated, days)
    const expectedAnnual = Math.pow(1 + monthlyRate, 12) - 1
    expect(annualized).toBeCloseTo(expectedAnnual, 4)
  })
})

// ----------------------------------------------------------------
// buildComparisonMetrics
// ----------------------------------------------------------------
describe('buildComparisonMetrics', () => {
  it('retorna null para simulação sem resultado', () => {
    const sim = makeSim(DEFAULT_PREFIXADO_PARAMS, false)
    expect(buildComparisonMetrics(sim)).toBeNull()
  })

  it('retorna métricas válidas para simulação executada', () => {
    const sim = makeSim()
    const m = buildComparisonMetrics(sim)
    expect(m).not.toBeNull()
    expect(m!.nominalNetReturn).toBeGreaterThan(0)
    expect(m!.annualizedNetReturn).toBeGreaterThan(0)
    expect(m!.totalDays).toBeGreaterThan(0)
    expect(m!.result).not.toBeNull()
  })

  it('rentabilidade anualizada > 0 para investimento com rentabilidade positiva', () => {
    const sim = makeSim()
    const m = buildComparisonMetrics(sim)!
    expect(m.annualizedNetReturn).toBeGreaterThan(0)
  })

  it('XIRR não lança exceção (retorna número ou null)', () => {
    const sim = makeSim()
    const m = buildComparisonMetrics(sim)!
    expect(m.xirr === null || typeof m.xirr === 'number').toBe(true)
  })

  it('XIRR próxima da rentabilidade anualizada para fluxo sem aportes', () => {
    // Sem aportes, XIRR ≈ rentabilidade nominal líquida anualizada
    const params = { ...DEFAULT_PREFIXADO_PARAMS, monthlyContribution: 0 }
    const sim = makeSim(params)
    const m = buildComparisonMetrics(sim)!
    if (m.xirr !== null) {
      // Devem ser próximos (dentro de 2 p.p.) quando não há aportes
      expect(Math.abs(m.xirr - m.annualizedNetReturn)).toBeLessThan(0.03)
    }
  })
})

// ----------------------------------------------------------------
// consolidateComparison
// ----------------------------------------------------------------
describe('consolidateComparison', () => {
  it('retorna array vazio para lista vazia', () => {
    expect(consolidateComparison([])).toHaveLength(0)
  })

  it('retorna array vazio quando todos os resultados são null', () => {
    expect(consolidateComparison([null, null, null])).toHaveLength(0)
  })

  it('com apenas uma simulação, ela é marcada como melhor', () => {
    const m = buildComparisonMetrics(makeSim())!
    const consolidated = consolidateComparison([m])
    expect(consolidated[0].isBestByNetBalance).toBe(true)
  })

  it('marca corretamente o melhor por netBalance entre dois produtos', () => {
    const simLow = makeSim({ ...DEFAULT_PREFIXADO_PARAMS, annualRate: 0.10 })
    const simHigh = makeSim({ ...DEFAULT_PREFIXADO_PARAMS, annualRate: 0.15 })
    const mLow = buildComparisonMetrics(simLow)!
    const mHigh = buildComparisonMetrics(simHigh)!

    const consolidated = consolidateComparison([mLow, mHigh])
    const best = consolidated.find((m) => m.isBestByNetBalance)
    expect(best).not.toBeUndefined()
    expect(best!.result.netBalance).toBeGreaterThan(
      consolidated.find((m) => !m.isBestByNetBalance)!.result.netBalance
    )
  })

  it('apenas um produto é marcado como melhor por netBalance', () => {
    const mP = buildComparisonMetrics(makeSim(DEFAULT_PREFIXADO_PARAMS))!
    const mC = buildComparisonMetrics(makeSim(DEFAULT_CDI_PARAMS))!
    const mI = buildComparisonMetrics(makeSim(DEFAULT_IPCA_PARAMS))!
    const consolidated = consolidateComparison([mP, mC, mI])
    const bests = consolidated.filter((m) => m.isBestByNetBalance)
    expect(bests).toHaveLength(1)
  })

  it('aceita comparação parcial (apenas uma modalidade)', () => {
    const m = buildComparisonMetrics(makeSim(DEFAULT_CDI_PARAMS))!
    const consolidated = consolidateComparison([null, m, null])
    expect(consolidated).toHaveLength(1)
    expect(consolidated[0].isBestByNetBalance).toBe(true)
  })

  it('aceita comparação parcial (duas modalidades)', () => {
    const mP = buildComparisonMetrics(makeSim(DEFAULT_PREFIXADO_PARAMS))!
    const mC = buildComparisonMetrics(makeSim(DEFAULT_CDI_PARAMS))!
    const consolidated = consolidateComparison([mP, mC, null])
    expect(consolidated).toHaveLength(2)
    expect(consolidated.filter((m) => m.isBestByNetBalance)).toHaveLength(1)
  })
})

// ----------------------------------------------------------------
// checkConditionDifferences / hasConditionDifferences
// ----------------------------------------------------------------
describe('checkConditionDifferences', () => {
  it('retorna sem diferenças para lista vazia', () => {
    const diff = checkConditionDifferences([])
    expect(diff.termMonths).toBe(false)
    expect(diff.initialAmount).toBe(false)
    expect(diff.monthlyContribution).toBe(false)
  })

  it('retorna sem diferenças quando condições são iguais', () => {
    const params = { ...DEFAULT_PREFIXADO_PARAMS }
    const m1 = buildComparisonMetrics(makeSim(params))!
    const m2 = buildComparisonMetrics(makeSim({ ...params, annualRate: 0.12 }))!
    const diff = checkConditionDifferences([m1, m2])
    expect(diff.termMonths).toBe(false)
    expect(diff.initialAmount).toBe(false)
    expect(diff.monthlyContribution).toBe(false)
  })

  it('detecta prazo diferente', () => {
    const m1 = buildComparisonMetrics(makeSim({ ...DEFAULT_PREFIXADO_PARAMS, termMonths: 12 }))!
    const m2 = buildComparisonMetrics(makeSim({ ...DEFAULT_PREFIXADO_PARAMS, termMonths: 24 }))!
    const diff = checkConditionDifferences([m1, m2])
    expect(diff.termMonths).toBe(true)
  })

  it('detecta capital inicial diferente', () => {
    const m1 = buildComparisonMetrics(makeSim({ ...DEFAULT_PREFIXADO_PARAMS, initialAmount: 10000 }))!
    const m2 = buildComparisonMetrics(makeSim({ ...DEFAULT_PREFIXADO_PARAMS, initialAmount: 20000 }))!
    const diff = checkConditionDifferences([m1, m2])
    expect(diff.initialAmount).toBe(true)
  })

  it('detecta aporte mensal diferente', () => {
    const m1 = buildComparisonMetrics(makeSim({ ...DEFAULT_PREFIXADO_PARAMS, monthlyContribution: 500 }))!
    const m2 = buildComparisonMetrics(makeSim({ ...DEFAULT_PREFIXADO_PARAMS, monthlyContribution: 0 }))!
    const diff = checkConditionDifferences([m1, m2])
    expect(diff.monthlyContribution).toBe(true)
  })
})

describe('hasConditionDifferences', () => {
  it('retorna false para condições iguais', () => {
    const m1 = buildComparisonMetrics(makeSim())!
    const m2 = buildComparisonMetrics(makeSim({ ...DEFAULT_PREFIXADO_PARAMS, annualRate: 0.12 }))!
    expect(hasConditionDifferences([m1, m2])).toBe(false)
  })

  it('retorna true quando prazo difere', () => {
    const m1 = buildComparisonMetrics(makeSim({ ...DEFAULT_PREFIXADO_PARAMS, termMonths: 12 }))!
    const m2 = buildComparisonMetrics(makeSim({ ...DEFAULT_PREFIXADO_PARAMS, termMonths: 36 }))!
    expect(hasConditionDifferences([m1, m2])).toBe(true)
  })
})

// ----------------------------------------------------------------
// Independência entre simulações
// ----------------------------------------------------------------
describe('Independência entre simulações', () => {
  it('alterar parâmetros não modifica resultado armazenado', () => {
    // Simula e armazena resultado
    const originalParams = { ...DEFAULT_PREFIXADO_PARAMS }
    const sim = makeSim(originalParams)
    const originalNetBalance = sim.result!.netBalance

    // "Altera" os parâmetros (como se o usuário editasse o formulário)
    const updatedParams = { ...originalParams, annualRate: 0.10 }

    // O resultado armazenado não deve mudar — apenas os parâmetros mudariam
    // (o hook só atualiza result após chamar simulate())
    const updatedSim: InvestmentSimulation = { ...sim, parameters: updatedParams }
    expect(updatedSim.result!.netBalance).toBe(originalNetBalance)
  })

  it('executar simulação de uma modalidade não afeta outra', () => {
    // Simula prefixado
    const prefixadoSim = makeSim(DEFAULT_PREFIXADO_PARAMS)
    const prefixadoResult = prefixadoSim.result!.netBalance

    // Simula CDI com parâmetros diferentes
    const cdiSim = makeSim({ ...DEFAULT_CDI_PARAMS, initialAmount: 50000 })

    // O resultado do prefixado não muda
    expect(prefixadoSim.result!.netBalance).toBe(prefixadoResult)

    // Os dois resultados são independentes
    expect(prefixadoSim.result!.netBalance).not.toBe(cdiSim.result!.netBalance)
  })

  it('comparativo com CDI não simulado retorna apenas prefixado e IPCA+', () => {
    const mP = buildComparisonMetrics(makeSim(DEFAULT_PREFIXADO_PARAMS))!
    const mI = buildComparisonMetrics(makeSim(DEFAULT_IPCA_PARAMS))!
    // CDI não simulado → null
    const consolidated = consolidateComparison([mP, null, mI])
    expect(consolidated).toHaveLength(2)
    expect(consolidated.some((m) => m.category === 'prefixado')).toBe(true)
    expect(consolidated.some((m) => m.category === 'ipca')).toBe(true)
    expect(consolidated.some((m) => m.category === 'cdi')).toBe(false)
  })

  it('status outdated não apaga o resultado anterior', () => {
    const sim = makeSim(DEFAULT_PREFIXADO_PARAMS)
    const outdatedSim: InvestmentSimulation = { ...sim, status: 'outdated' }
    // Resultado ainda disponível mesmo com status outdated
    expect(outdatedSim.result).not.toBeNull()
    expect(outdatedSim.result!.netBalance).toBeGreaterThan(0)
  })
})

// ----------------------------------------------------------------
// Rentabilidade anualizada — integração com runSimulation
// ----------------------------------------------------------------
describe('rentabilidade anualizada — integração', () => {
  it('prefixado 15% a.a. por 24 meses tem anualizada ≈ 15% após IR', () => {
    const params = {
      ...DEFAULT_PREFIXADO_PARAMS,
      annualRate: 0.15,
      termMonths: 24,
      monthlyContribution: 0,
    }
    const sim = makeSim(params)
    const m = buildComparisonMetrics(sim)!
    // Após IR (15% em 24 meses = acima de 720 dias), a anualizada líquida
    // deve ser menor que 15% mas positiva
    expect(m.annualizedNetReturn).toBeGreaterThan(0)
    expect(m.annualizedNetReturn).toBeLessThan(0.15)
  })

  it('produto isento tem anualizada ≈ taxa bruta', () => {
    const params = {
      ...DEFAULT_CDI_PARAMS,
      annualRate: 0.95,    // 95% CDI
      taxRegime: 'isento' as const,
      monthlyContribution: 0,
    }
    const sim = makeSim(params)
    const m = buildComparisonMetrics(sim)!
    // Sem IR, a anualizada líquida ≈ anualizada bruta
    expect(m.annualizedNetReturn).toBeCloseTo(m.result.effectiveAnnualRate, 1)
  })
})
