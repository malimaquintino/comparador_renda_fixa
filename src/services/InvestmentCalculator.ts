/**
 * InvestmentCalculator
 *
 * Motor de cálculo financeiro para simulação de investimentos em renda fixa.
 *
 * Metodologia de cálculo:
 *
 * 1. CONVERSÃO DE TAXAS
 *    Todas as taxas são convertidas para equivalentes diárias via juros compostos.
 *    NÃO se utiliza divisão simples da taxa anual por 252 ou 365 — usa-se
 *    a fórmula de equivalência: taxaDiaria = (1 + taxaAnual)^(1/365) - 1
 *    Isso garante consistência independentemente do número de dias do período.
 *
 * 2. PREFIXADO
 *    taxaAnualEfetiva = taxaAnual (já é a taxa anual fixa)
 *    taxaDiaria = (1 + taxaAnual)^(1/365) - 1
 *
 * 3. CDI
 *    O percentual do CDI é aplicado sobre a taxa anual efetiva do CDI:
 *    taxaAnualEfetiva = (1 + CDI)^(percentualCDI) - 1
 *    Nota: percentualCDI em decimal — ex: 1.06 para 106% do CDI
 *    taxaDiaria = (1 + taxaAnualEfetiva)^(1/365) - 1
 *
 * 4. IPCA+
 *    Usa-se a capitalização composta das duas taxas:
 *    taxaAnualEfetiva = (1 + IPCA) * (1 + spreadIPCA) - 1
 *    taxaDiaria = (1 + taxaAnualEfetiva)^(1/365) - 1
 *
 * 5. LOTES INDIVIDUAIS
 *    Cada aporte é tratado como um lote independente.
 *    O capital inicial é o lote 0 (data inicial).
 *    Os aportes mensais são lotes 1..N (data = dia configurado de cada mês).
 *    Para cada lote, o rendimento é calculado sobre os dias corridos.
 *
 * 6. SÉRIE HISTÓRICA MENSAL
 *    A cada mês, somamos o valor acumulado de todos os lotes até aquela data,
 *    calculando o imposto estimado caso o resgate ocorresse naquele dia.
 *
 * 7. DIAS CORRIDOS
 *    Utiliza-se diferença de dias calendário (não dias úteis) para tributação.
 *    Convenção consistente com a prática de mercado para produtos de varejo.
 */

import type {
  EconomicAssumptions,
  FinancialParameters,
  InvestmentLot,
  InvestmentProduct,
  InvestmentResult,
  MonthlyDataPoint,
  SimulationParams,
  SimulationResult,
} from '../types/Investment'
import {
  aggregateTaxResults,
  calculateLotTax,
} from './TaxCalculator'

// ----------------------------------------------------------------
// Funções de conversão de taxas
// ----------------------------------------------------------------

/**
 * Converte taxa anual efetiva para taxa diária equivalente (base 365 dias).
 * taxaDiaria = (1 + taxaAnual)^(1/365) - 1
 */
export function annualToDailyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 365) - 1
}

/**
 * Converte taxa anual efetiva para taxa mensal equivalente.
 * taxaMensal = (1 + taxaAnual)^(1/12) - 1
 */
export function annualToMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

/**
 * Converte taxa diária para taxa anual equivalente.
 * taxaAnual = (1 + taxaDiaria)^365 - 1
 */
export function dailyToAnnualRate(dailyRate: number): number {
  return Math.pow(1 + dailyRate, 365) - 1
}

/**
 * Calcula a taxa anual efetiva de um produto PREFIXADO.
 */
export function getPrefixadoEffectiveRate(annualRate: number): number {
  return annualRate
}

/**
 * Calcula a taxa anual efetiva de um produto CDI.
 *
 * A fórmula correta para "% do CDI" em juros compostos:
 * taxaAnualEfetiva = (1 + CDI)^percentualCDI - 1
 *
 * Onde percentualCDI está em decimal (ex: 1.06 para 106%).
 *
 * Isso garante que 100% do CDI retorne exatamente o CDI,
 * e que 106% do CDI retorne uma taxa ligeiramente superior.
 */
export function getCDIEffectiveRate(cdiRate: number, percentageOfCDI: number): number {
  return Math.pow(1 + cdiRate, percentageOfCDI) - 1
}

/**
 * Calcula a taxa anual efetiva de um produto IPCA+.
 *
 * Capitalização composta das duas taxas (fórmula de Fischer):
 * taxaAnualEfetiva = (1 + IPCA) * (1 + spreadIPCA) - 1
 */
export function getIPCAEffectiveRate(ipcaRate: number, spreadRate: number): number {
  return (1 + ipcaRate) * (1 + spreadRate) - 1
}

/**
 * Retorna a taxa anual efetiva de um produto conforme sua modalidade.
 */
export function getEffectiveAnnualRate(
  product: InvestmentProduct,
  economic: EconomicAssumptions
): number {
  switch (product.category) {
    case 'prefixado':
      return getPrefixadoEffectiveRate(product.annualRate)
    case 'cdi':
      return getCDIEffectiveRate(economic.cdiRate, product.annualRate)
    case 'ipca':
      return getIPCAEffectiveRate(economic.ipcaRate, product.annualRate)
  }
}

// ----------------------------------------------------------------
// Funções de cálculo de rendimento
// ----------------------------------------------------------------

/**
 * Calcula o valor bruto de um lote após N dias corridos.
 *
 * valorBruto = principal * (1 + taxaDiaria)^dias
 *
 * @param principal - Valor aplicado
 * @param dailyRate - Taxa diária equivalente
 * @param days - Número de dias corridos
 */
export function calculateGrossValue(
  principal: number,
  dailyRate: number,
  days: number
): number {
  return principal * Math.pow(1 + dailyRate, days)
}

// ----------------------------------------------------------------
// Funções de data
// ----------------------------------------------------------------

/**
 * Calcula a diferença em dias corridos entre duas datas.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  // Zera horários para evitar erros de DST
  const fromMidnight = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const toMidnight = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((toMidnight - fromMidnight) / msPerDay)
}

/**
 * Adiciona N meses a uma data, ajustando para o último dia do mês quando necessário.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  const targetMonth = result.getMonth() + months
  result.setMonth(targetMonth)
  // Se o mês avançou mais do que o esperado, significa que houve overflow de dias
  // (ex: 31/jan + 1 mês → não existe 31/fev → ajusta para 28/fev)
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0) // Vai para o último dia do mês anterior
  }
  return result
}

/**
 * Gera a data de um aporte no mês M, respeitando o dia configurado.
 *
 * @param startDate - Data de início da simulação
 * @param monthIndex - Índice do mês (1 = primeiro mês após o início)
 * @param contributionDay - Dia do mês configurado para o aporte
 */
export function getContributionDate(
  startDate: Date,
  monthIndex: number,
  contributionDay: number
): Date {
  const base = addMonths(startDate, monthIndex)
  const year = base.getFullYear()
  const month = base.getMonth()
  // Dias no mês alvo
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const day = Math.min(contributionDay, daysInMonth)
  return new Date(year, month, day)
}

/**
 * Gera a data final da simulação (data inicial + prazo em meses).
 */
export function getEndDate(startDate: Date, termMonths: number): Date {
  return addMonths(startDate, termMonths)
}

// ----------------------------------------------------------------
// Construção dos lotes
// ----------------------------------------------------------------

/**
 * Constrói os lotes de investimento para uma simulação.
 *
 * Lote 0: capital inicial (aplicado na data inicial)
 * Lotes 1..N: aportes mensais (aplicados no dia configurado de cada mês)
 *
 * Aportes realizados após a data de resgate são ignorados.
 */
export function buildLots(
  financial: FinancialParameters,
  startDate: Date,
  endDate: Date
): InvestmentLot[] {
  const lots: InvestmentLot[] = []

  // Lote 0: capital inicial
  if (financial.initialAmount > 0) {
    const days = calendarDaysBetween(startDate, endDate)
    lots.push({
      principal: financial.initialAmount,
      applicationDate: startDate,
      redemptionDate: endDate,
      calendarDays: days,
    })
  }

  // Lotes dos aportes mensais
  if (financial.monthlyContribution > 0) {
    for (let m = 1; m <= financial.termMonths; m++) {
      const appDate = getContributionDate(startDate, m, financial.contributionDay)

      // Não considerar aportes na data de resgate ou depois
      if (appDate >= endDate) break

      const days = calendarDaysBetween(appDate, endDate)
      lots.push({
        principal: financial.monthlyContribution,
        applicationDate: appDate,
        redemptionDate: endDate,
        calendarDays: days,
      })
    }
  }

  return lots
}

// ----------------------------------------------------------------
// Série histórica mensal
// ----------------------------------------------------------------

/**
 * Gera a série histórica mensal de um investimento.
 *
 * Para cada mês da simulação, calculamos o estado do portfólio
 * como se o resgate ocorresse naquele dia:
 * - Inclui apenas os lotes já aplicados até aquela data
 * - Calcula o rendimento bruto de cada lote pelo número de dias até aquele mês
 * - Aplica tributação estimada (IOF + IR) para cada lote
 */
function buildMonthlySeries(
  financial: FinancialParameters,
  startDate: Date,
  endDate: Date,
  lots: InvestmentLot[],
  dailyRate: number,
  product: InvestmentProduct
): MonthlyDataPoint[] {
  const series: MonthlyDataPoint[] = []

  for (let m = 0; m <= financial.termMonths; m++) {
    const referenceDate = m === 0 ? startDate : addMonths(startDate, m)
    // Garante que o último ponto seja exatamente a data final
    const pointDate = m === financial.termMonths ? endDate : referenceDate

    let totalInvested = 0
    let grossBalance = 0
    const lotResults = []

    for (const lot of lots) {
      // Só considera lotes já aplicados até esta data
      if (lot.applicationDate > pointDate) continue

      const daysToPoint = calendarDaysBetween(lot.applicationDate, pointDate)
      const grossValue = calculateGrossValue(lot.principal, dailyRate, daysToPoint)

      totalInvested += lot.principal
      grossBalance += grossValue

      // Cria um lote temporário com o resgate na data do ponto
      const tempLot: InvestmentLot = {
        ...lot,
        redemptionDate: pointDate,
        calendarDays: daysToPoint,
      }
      lotResults.push(calculateLotTax(tempLot, grossValue, product.taxRegime))
    }

    const agg = aggregateTaxResults(lotResults)
    const grossEarnings = grossBalance - totalInvested

    series.push({
      date: pointDate,
      month: m,
      totalInvested,
      grossBalance,
      grossEarnings,
      estimatedIR: agg.totalIR,
      estimatedIOF: agg.totalIOF,
      netBalance: agg.totalNetValue,
      netEarnings: agg.totalNetEarnings,
    })
  }

  return series
}

// ----------------------------------------------------------------
// Cálculo do resultado final de um produto
// ----------------------------------------------------------------

/**
 * Calcula o resultado completo de simulação para um produto.
 */
export function simulateProduct(
  product: InvestmentProduct,
  financial: FinancialParameters,
  economic: EconomicAssumptions,
  startDate: Date,
  endDate: Date,
  accumulatedInflation: number
): Omit<InvestmentResult, 'isBest'> {
  const effectiveAnnualRate = getEffectiveAnnualRate(product, economic)
  const dailyRate = annualToDailyRate(effectiveAnnualRate)

  // Constrói os lotes
  const lots = buildLots(financial, startDate, endDate)

  // Calcula o resultado tributário final de cada lote
  const lotResults = lots.map((lot) => {
    const grossValue = calculateGrossValue(lot.principal, dailyRate, lot.calendarDays)
    return calculateLotTax(lot, grossValue, product.taxRegime)
  })

  const agg = aggregateTaxResults(lotResults)

  // Gera a série histórica mensal
  const monthlyData = buildMonthlySeries(
    financial,
    startDate,
    endDate,
    lots,
    dailyRate,
    product
  )

  // Rentabilidade nominal acumulada = (valorBruto / totalInvestido) - 1
  const nominalReturn =
    agg.totalPrincipal > 0
      ? agg.totalGrossValue / agg.totalPrincipal - 1
      : 0

  // Rentabilidade nominal líquida
  const nominalNetReturn =
    agg.totalPrincipal > 0
      ? agg.totalNetValue / agg.totalPrincipal - 1
      : 0

  // Rentabilidade real = (1 + nominalReturn) / (1 + inflacaoAcumulada) - 1
  const realReturn =
    accumulatedInflation > -1
      ? (1 + nominalReturn) / (1 + accumulatedInflation) - 1
      : 0

  // Rentabilidade real líquida
  const realNetReturn =
    accumulatedInflation > -1
      ? (1 + nominalNetReturn) / (1 + accumulatedInflation) - 1
      : 0

  return {
    product,
    monthlyData,
    totalInvested: agg.totalPrincipal,
    grossBalance: agg.totalGrossValue,
    grossEarnings: agg.totalGrossEarnings,
    totalIOF: agg.totalIOF,
    totalIR: agg.totalIR,
    netBalance: agg.totalNetValue,
    netEarnings: agg.totalNetEarnings,
    effectiveAnnualRate,
    nominalReturn,
    realReturn,
    nominalNetReturn,
    realNetReturn,
  }
}

// ----------------------------------------------------------------
// Ponto de entrada principal
// ----------------------------------------------------------------

/**
 * Executa a simulação completa para todos os produtos configurados.
 *
 * @param params - Parâmetros completos da simulação
 * @returns Resultado completo com série histórica e indicadores de cada produto
 */
export function runSimulation(params: SimulationParams): SimulationResult {
  const { economic, financial, products } = params

  const startDate = new Date(economic.startDate + 'T12:00:00')
  const endDate = getEndDate(startDate, financial.termMonths)

  // Inflação acumulada no período (juros compostos)
  // inflacaoAcumulada = (1 + ipcaMensal)^prazoMeses - 1
  // onde ipcaMensal = (1 + ipcaAnual)^(1/12) - 1
  const monthlyInflation = annualToMonthlyRate(economic.ipcaRate)
  const accumulatedInflation = Math.pow(1 + monthlyInflation, financial.termMonths) - 1

  // Calcula resultado de cada produto
  const rawResults = products.map((product) =>
    simulateProduct(product, financial, economic, startDate, endDate, accumulatedInflation)
  )

  // Determina o melhor investimento pelo maior valor líquido
  const maxNetBalance = Math.max(...rawResults.map((r) => r.netBalance))

  const results: InvestmentResult[] = rawResults.map((r) => ({
    ...r,
    isBest: r.netBalance === maxNetBalance && maxNetBalance > 0,
  }))

  return {
    params,
    results,
    calculatedAt: new Date(),
  }
}
