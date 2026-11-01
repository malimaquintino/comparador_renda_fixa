/**
 * Testes unitários — InvestmentCalculator
 *
 * Valida:
 * - Conversão de taxas anuais, mensais e diárias
 * - Taxa efetiva por modalidade (prefixado, CDI, IPCA+)
 * - Cálculo de valor bruto (capitalização diária)
 * - Cálculo de dias corridos entre datas
 * - Construção de lotes (capital inicial + aportes mensais)
 * - Simulação completa sem aportes
 * - Simulação completa com aportes mensais
 * - Série histórica mensal
 * - Rentabilidade nominal e real
 * - Produto isento de IR
 */

import { describe, expect, it } from 'vitest'
import {
  annualToDailyRate,
  annualToMonthlyRate,
  buildLots,
  calendarDaysBetween,
  calculateGrossValue,
  dailyToAnnualRate,
  getCDIEffectiveRate,
  getEffectiveAnnualRate,
  getEndDate,
  getIPCAEffectiveRate,
  getPrefixadoEffectiveRate,
  runSimulation,
} from '../services/InvestmentCalculator'
import type { InvestmentProduct, SimulationParams } from '../types/Investment'

const PRECISION = 8 // casas decimais para assertivas de taxa

// ----------------------------------------------------------------
// Conversão de taxas
// ----------------------------------------------------------------
describe('annualToDailyRate', () => {
  it('converte 10% a.a. para taxa diária equivalente', () => {
    const daily = annualToDailyRate(0.10)
    // (1 + 0.10)^(1/365) - 1
    const expected = Math.pow(1.10, 1 / 365) - 1
    expect(daily).toBeCloseTo(expected, PRECISION)
  })

  it('é revertível para taxa anual', () => {
    const annual = 0.1250
    const daily = annualToDailyRate(annual)
    const backToAnnual = dailyToAnnualRate(daily)
    expect(backToAnnual).toBeCloseTo(annual, PRECISION)
  })

  it('taxa de 0% resulta em taxa diária de 0', () => {
    expect(annualToDailyRate(0)).toBeCloseTo(0)
  })
})

describe('annualToMonthlyRate', () => {
  it('converte 12% a.a. para taxa mensal equivalente', () => {
    const monthly = annualToMonthlyRate(0.12)
    const expected = Math.pow(1.12, 1 / 12) - 1
    expect(monthly).toBeCloseTo(expected, PRECISION)
  })

  it('capitalização de 12 meses reproduz a taxa anual', () => {
    const annual = 0.1065
    const monthly = annualToMonthlyRate(annual)
    const backToAnnual = Math.pow(1 + monthly, 12) - 1
    expect(backToAnnual).toBeCloseTo(annual, 6)
  })
})

// ----------------------------------------------------------------
// Taxas efetivas por modalidade
// ----------------------------------------------------------------
describe('getPrefixadoEffectiveRate', () => {
  it('retorna a própria taxa anual', () => {
    expect(getPrefixadoEffectiveRate(0.145)).toBe(0.145)
    expect(getPrefixadoEffectiveRate(0.12)).toBe(0.12)
  })
})

describe('getCDIEffectiveRate', () => {
  it('100% do CDI retorna exatamente o CDI', () => {
    const cdi = 0.1065
    expect(getCDIEffectiveRate(cdi, 1.0)).toBeCloseTo(cdi, PRECISION)
  })

  it('106% do CDI retorna taxa superior ao CDI', () => {
    const cdi = 0.1065
    const rate = getCDIEffectiveRate(cdi, 1.06)
    expect(rate).toBeGreaterThan(cdi)
    // (1.1065)^1.06 - 1
    const expected = Math.pow(1 + cdi, 1.06) - 1
    expect(rate).toBeCloseTo(expected, PRECISION)
  })

  it('95% do CDI (LCI) retorna taxa inferior ao CDI', () => {
    const cdi = 0.1065
    const rate = getCDIEffectiveRate(cdi, 0.95)
    expect(rate).toBeLessThan(cdi)
  })
})

describe('getIPCAEffectiveRate', () => {
  it('calcula corretamente IPCA + 7%', () => {
    const ipca = 0.045
    const spread = 0.07
    const expected = (1 + ipca) * (1 + spread) - 1
    expect(getIPCAEffectiveRate(ipca, spread)).toBeCloseTo(expected, PRECISION)
  })

  it('com IPCA zero retorna apenas o spread', () => {
    expect(getIPCAEffectiveRate(0, 0.07)).toBeCloseTo(0.07, PRECISION)
  })

  it('com spread zero retorna apenas o IPCA', () => {
    expect(getIPCAEffectiveRate(0.045, 0)).toBeCloseTo(0.045, PRECISION)
  })
})

describe('getEffectiveAnnualRate', () => {
  const economic = { cdiRate: 0.1065, ipcaRate: 0.045, startDate: '2024-01-01' }

  it('prefixado retorna a taxa direta', () => {
    const p: InvestmentProduct = {
      id: 'p1', name: 'P', category: 'prefixado', annualRate: 0.145, taxRegime: 'regressivo',
    }
    expect(getEffectiveAnnualRate(p, economic)).toBe(0.145)
  })

  it('cdi calcula corretamente', () => {
    const p: InvestmentProduct = {
      id: 'p2', name: 'C', category: 'cdi', annualRate: 1.06, taxRegime: 'regressivo',
    }
    const expected = getCDIEffectiveRate(0.1065, 1.06)
    expect(getEffectiveAnnualRate(p, economic)).toBeCloseTo(expected, PRECISION)
  })

  it('ipca calcula corretamente', () => {
    const p: InvestmentProduct = {
      id: 'p3', name: 'I', category: 'ipca', annualRate: 0.07, taxRegime: 'regressivo',
    }
    const expected = getIPCAEffectiveRate(0.045, 0.07)
    expect(getEffectiveAnnualRate(p, economic)).toBeCloseTo(expected, PRECISION)
  })
})

// ----------------------------------------------------------------
// Cálculo de valor bruto
// ----------------------------------------------------------------
describe('calculateGrossValue', () => {
  it('calcula capitalização simples para 365 dias', () => {
    const dailyRate = annualToDailyRate(0.10)
    const gross = calculateGrossValue(1000, dailyRate, 365)
    // Deve ser próximo a 1100 (10% sobre 1000)
    expect(gross).toBeCloseTo(1100, 1)
  })

  it('retorna o principal quando taxa = 0', () => {
    expect(calculateGrossValue(5000, 0, 180)).toBe(5000)
  })

  it('retorna o principal quando dias = 0', () => {
    const dailyRate = annualToDailyRate(0.12)
    expect(calculateGrossValue(5000, dailyRate, 0)).toBeCloseTo(5000, 6)
  })
})

// ----------------------------------------------------------------
// Datas
// ----------------------------------------------------------------
describe('calendarDaysBetween', () => {
  it('calcula corretamente diferença de 30 dias', () => {
    const from = new Date(2024, 0, 1)
    const to = new Date(2024, 0, 31)
    expect(calendarDaysBetween(from, to)).toBe(30)
  })

  it('retorna 0 para a mesma data', () => {
    const d = new Date(2024, 5, 15)
    expect(calendarDaysBetween(d, d)).toBe(0)
  })

  it('conta corretamente ano bissexto', () => {
    const from = new Date(2024, 0, 1)
    const to = new Date(2025, 0, 1)
    expect(calendarDaysBetween(from, to)).toBe(366) // 2024 é bissexto
  })
})

// ----------------------------------------------------------------
// Construção de lotes
// ----------------------------------------------------------------
describe('buildLots', () => {
  const startDate = new Date(2024, 0, 1) // 01/01/2024
  const endDate = getEndDate(startDate, 24)

  it('cria apenas o lote inicial quando não há aportes', () => {
    const financial = {
      termMonths: 24,
      initialAmount: 10000,
      monthlyContribution: 0,
      contributionDay: 5,
    }
    const lots = buildLots(financial, startDate, endDate)
    expect(lots).toHaveLength(1)
    expect(lots[0].principal).toBe(10000)
    expect(lots[0].calendarDays).toBeGreaterThan(0)
  })

  it('cria lote inicial + aportes mensais', () => {
    const financial = {
      termMonths: 12,
      initialAmount: 10000,
      monthlyContribution: 1000,
      contributionDay: 5,
    }
    const lots = buildLots(financial, startDate, getEndDate(startDate, 12))
    // 1 lote inicial + 12 aportes mensais (mas o último aporte em jan/2025 pode ser >= endDate)
    expect(lots.length).toBeGreaterThan(1)
    expect(lots[0].principal).toBe(10000)
    lots.slice(1).forEach((l) => expect(l.principal).toBe(1000))
  })

  it('lotes têm dias decrescentes (lotes mais antigos ficam mais tempo)', () => {
    const financial = {
      termMonths: 12,
      initialAmount: 5000,
      monthlyContribution: 500,
      contributionDay: 15,
    }
    const lots = buildLots(financial, startDate, getEndDate(startDate, 12))
    for (let i = 1; i < lots.length; i++) {
      expect(lots[i - 1].calendarDays).toBeGreaterThanOrEqual(lots[i].calendarDays)
    }
  })

  it('não cria lotes quando valor inicial é zero e não há aportes', () => {
    const financial = {
      termMonths: 12,
      initialAmount: 0,
      monthlyContribution: 0,
      contributionDay: 5,
    }
    const lots = buildLots(financial, startDate, getEndDate(startDate, 12))
    expect(lots).toHaveLength(0)
  })
})

// ----------------------------------------------------------------
// Simulação completa — sem aportes
// ----------------------------------------------------------------
describe('runSimulation — sem aportes', () => {
  const params: SimulationParams = {
    economic: { cdiRate: 0.1065, ipcaRate: 0.045, startDate: '2024-01-01' },
    financial: { termMonths: 24, initialAmount: 100000, monthlyContribution: 0, contributionDay: 5 },
    products: [
      { id: 'p1', name: 'Prefixado', category: 'prefixado', annualRate: 0.145, taxRegime: 'regressivo' },
    ],
  }

  it('total investido = capital inicial', () => {
    const result = runSimulation(params)
    expect(result.results[0].totalInvested).toBeCloseTo(100000)
  })

  it('saldo bruto é maior que o capital inicial', () => {
    const result = runSimulation(params)
    expect(result.results[0].grossBalance).toBeGreaterThan(100000)
  })

  it('valor líquido é menor que o saldo bruto', () => {
    const result = runSimulation(params)
    const r = result.results[0]
    expect(r.netBalance).toBeLessThan(r.grossBalance)
  })

  it('série histórica tem termMonths + 1 pontos', () => {
    const result = runSimulation(params)
    expect(result.results[0].monthlyData).toHaveLength(25) // 0..24
  })

  it('rentabilidade nominal é positiva', () => {
    const result = runSimulation(params)
    expect(result.results[0].nominalReturn).toBeGreaterThan(0)
  })

  it('prazo de 24 meses: alíquota de IR deve ser 15% (> 720 dias)', () => {
    const result = runSimulation(params)
    const r = result.results[0]
    // IR estimado ≈ rendimento bruto * 15%
    const expectedIR = r.grossEarnings * 0.15
    expect(r.totalIR).toBeCloseTo(expectedIR, 1)
  })
})

// ----------------------------------------------------------------
// Simulação completa — com aportes mensais
// ----------------------------------------------------------------
describe('runSimulation — com aportes', () => {
  const params: SimulationParams = {
    economic: { cdiRate: 0.1065, ipcaRate: 0.045, startDate: '2024-01-01' },
    financial: { termMonths: 12, initialAmount: 10000, monthlyContribution: 1000, contributionDay: 5 },
    products: [
      { id: 'p1', name: 'CDB', category: 'cdi', annualRate: 1.06, taxRegime: 'regressivo' },
    ],
  }

  it('total investido = capital inicial + aportes realizados', () => {
    const result = runSimulation(params)
    const r = result.results[0]
    // 10.000 + até 12 aportes de 1.000
    expect(r.totalInvested).toBeGreaterThanOrEqual(10000)
    expect(r.totalInvested).toBeLessThanOrEqual(22000)
  })

  it('saldo bruto > total investido', () => {
    const result = runSimulation(params)
    const r = result.results[0]
    expect(r.grossBalance).toBeGreaterThan(r.totalInvested)
  })

  it('total de lotes é correto (capital + aportes)', () => {
    const result = runSimulation(params)
    // Não testamos internamente os lotes, mas o totalInvested deve refletir
    // capital inicial + número de aportes * 1000
    const r = result.results[0]
    const numContributions = (r.totalInvested - 10000) / 1000
    expect(numContributions).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(numContributions)).toBe(true)
  })

  it('os aportes têm IR de alíquota maior por terem prazo menor', () => {
    // Com 12 meses, aportes dos últimos meses terão < 180 dias → 22,5%
    // O capital inicial terá > 360 dias → 17,5%
    // O IR total deve ser > 15% sobre todo o rendimento
    const result = runSimulation(params)
    const r = result.results[0]
    const effectiveIRRate = r.totalIR / r.grossEarnings
    // Média ponderada deve ser entre 15% e 22.5%
    expect(effectiveIRRate).toBeGreaterThan(0.15)
    expect(effectiveIRRate).toBeLessThan(0.225)
  })
})

// ----------------------------------------------------------------
// Simulação completa — produto isento (LCI)
// ----------------------------------------------------------------
describe('runSimulation — produto isento', () => {
  const params: SimulationParams = {
    economic: { cdiRate: 0.1065, ipcaRate: 0.045, startDate: '2024-01-01' },
    financial: { termMonths: 12, initialAmount: 50000, monthlyContribution: 0, contributionDay: 5 },
    products: [
      { id: 'lci', name: 'LCI', category: 'cdi', annualRate: 0.95, taxRegime: 'isento' },
    ],
  }

  it('IR total deve ser zero', () => {
    const result = runSimulation(params)
    expect(result.results[0].totalIR).toBe(0)
  })

  it('valor líquido = saldo bruto (sem tributação)', () => {
    const result = runSimulation(params)
    const r = result.results[0]
    expect(r.netBalance).toBeCloseTo(r.grossBalance, 2)
  })
})

// ----------------------------------------------------------------
// Identificação do melhor investimento
// ----------------------------------------------------------------
describe('runSimulation — identificação do melhor', () => {
  const params: SimulationParams = {
    economic: { cdiRate: 0.1065, ipcaRate: 0.045, startDate: '2024-01-01' },
    financial: { termMonths: 24, initialAmount: 10000, monthlyContribution: 0, contributionDay: 5 },
    products: [
      { id: 'p1', name: 'Baixo', category: 'prefixado', annualRate: 0.10, taxRegime: 'regressivo' },
      { id: 'p2', name: 'Alto', category: 'prefixado', annualRate: 0.15, taxRegime: 'regressivo' },
      { id: 'p3', name: 'Médio', category: 'prefixado', annualRate: 0.12, taxRegime: 'regressivo' },
    ],
  }

  it('apenas um produto deve ser marcado como melhor', () => {
    const result = runSimulation(params)
    const best = result.results.filter((r) => r.isBest)
    expect(best).toHaveLength(1)
  })

  it('o produto com maior taxa é marcado como melhor', () => {
    const result = runSimulation(params)
    const best = result.results.find((r) => r.isBest)
    expect(best?.product.id).toBe('p2')
  })
})

// ----------------------------------------------------------------
// Rentabilidade real
// ----------------------------------------------------------------
describe('runSimulation — rentabilidade real', () => {
  it('rentabilidade real é menor que nominal', () => {
    const params: SimulationParams = {
      economic: { cdiRate: 0.1065, ipcaRate: 0.045, startDate: '2024-01-01' },
      financial: { termMonths: 24, initialAmount: 10000, monthlyContribution: 0, contributionDay: 5 },
      products: [
        { id: 'p1', name: 'P', category: 'prefixado', annualRate: 0.145, taxRegime: 'regressivo' },
      ],
    }
    const result = runSimulation(params)
    const r = result.results[0]
    expect(r.realReturn).toBeLessThan(r.nominalReturn)
  })

  it('com taxa igual à inflação, rentabilidade real ≈ 0', () => {
    const ipca = 0.045
    // Usa prefixado com taxa igual à inflação; líquida será negativa (IR deduzido)
    const params: SimulationParams = {
      economic: { cdiRate: 0.10, ipcaRate: ipca, startDate: '2024-01-01' },
      financial: { termMonths: 12, initialAmount: 10000, monthlyContribution: 0, contributionDay: 5 },
      products: [
        { id: 'p1', name: 'P', category: 'prefixado', annualRate: ipca, taxRegime: 'regressivo' },
      ],
    }
    const result = runSimulation(params)
    const r = result.results[0]
    // Nominal ≈ IPCA acumulado, real ≈ 0 (bruto)
    expect(r.realReturn).toBeCloseTo(0, 2)
  })
})
