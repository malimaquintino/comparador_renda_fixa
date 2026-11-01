/**
 * XIRRCalculator
 *
 * Calcula a Taxa Interna de Retorno para fluxos de caixa irregulares (XIRR).
 *
 * Metodologia:
 * - O XIRR é a taxa anual r que zera o Valor Presente Líquido (VPL) dos fluxos:
 *   VPL(r) = Σ [ Ci / (1 + r)^(di / 365) ] = 0
 *   onde Ci é o fluxo e di é o número de dias a partir da data de referência.
 *
 * - Aportes (saídas de caixa) são representados como valores negativos.
 * - O valor líquido final (entrada de caixa) é representado como valor positivo.
 *
 * Algoritmo:
 * 1. Tentativa inicial com Newton-Raphson (convergência quadrática quando perto da raiz).
 * 2. Se Newton-Raphson não convergir em maxIterations, fallback para bisseção
 *    (convergência mais lenta, mas garantida em intervalos bem definidos).
 * 3. Retorna null se não houver convergência em nenhum método.
 *
 * Convenções:
 * - Base de 365 dias corridos.
 * - Taxa retornada em decimal anual (ex: 0.1450 = 14,50% a.a.).
 * - Fluxos devem ter ao menos uma entrada e uma saída para ter solução.
 */

export interface CashFlow {
  /** Data do fluxo */
  date: Date
  /**
   * Valor do fluxo em R$:
   * - Negativo: saída de caixa (investimento/aporte)
   * - Positivo: entrada de caixa (resgate)
   */
  amount: number
}

const MAX_ITERATIONS_NR = 200      // Newton-Raphson
const MAX_ITERATIONS_BIS = 200     // Bisseção
const TOLERANCE = 1e-10            // Critério de convergência do VPL
const RATE_TOLERANCE = 1e-12       // Critério de convergência da taxa
const MIN_RATE = -0.9999           // Limite inferior da bisseção
const MAX_RATE = 100.0             // Limite superior da bisseção (10.000% a.a.)

/**
 * Calcula o número de dias corridos entre a data de referência e a data do fluxo.
 */
function daysFraction(referenceDate: Date, flowDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const refMs = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )
  const flowMs = Date.UTC(
    flowDate.getFullYear(),
    flowDate.getMonth(),
    flowDate.getDate()
  )
  return (flowMs - refMs) / msPerDay
}

/**
 * Calcula o VPL (Valor Presente Líquido) dado uma taxa anual r.
 *
 * VPL(r) = Σ [ Ci / (1 + r)^(di / 365) ]
 */
function npv(rate: number, flows: CashFlow[], referenceDate: Date): number {
  let result = 0
  for (const flow of flows) {
    const t = daysFraction(referenceDate, flow.date) / 365
    result += flow.amount / Math.pow(1 + rate, t)
  }
  return result
}

/**
 * Calcula a derivada do VPL em relação à taxa r (dVPL/dr).
 *
 * dVPL/dr = Σ [ -t * Ci / (1 + r)^(t + 1) ]
 */
function dnpv(rate: number, flows: CashFlow[], referenceDate: Date): number {
  let result = 0
  for (const flow of flows) {
    const t = daysFraction(referenceDate, flow.date) / 365
    result += (-t * flow.amount) / Math.pow(1 + rate, t + 1)
  }
  return result
}

/**
 * Tenta convergir o XIRR usando o método de Newton-Raphson.
 */
function newtonRaphson(
  flows: CashFlow[],
  referenceDate: Date,
  initialGuess: number
): number | null {
  let rate = initialGuess

  for (let i = 0; i < MAX_ITERATIONS_NR; i++) {
    const v = npv(rate, flows, referenceDate)
    const dv = dnpv(rate, flows, referenceDate)

    if (Math.abs(dv) < 1e-20) return null // derivada próxima de zero — não converge

    const newRate = rate - v / dv

    if (Math.abs(newRate - rate) < RATE_TOLERANCE && Math.abs(v) < TOLERANCE) {
      return newRate
    }
    rate = newRate

    // Mantém a taxa em intervalo razoável para evitar overflow
    if (rate <= MIN_RATE) rate = MIN_RATE + 1e-6
    if (rate > MAX_RATE) rate = MAX_RATE
  }

  return null
}

/**
 * Tenta convergir o XIRR usando o método da bisseção (mais robusto, mais lento).
 */
function bisection(flows: CashFlow[], referenceDate: Date): number | null {
  let lo = MIN_RATE + 1e-6
  let hi = MAX_RATE

  const npvLo = npv(lo, flows, referenceDate)
  const npvHi = npv(hi, flows, referenceDate)

  // A bisseção só funciona quando os extremos têm sinais opostos
  if (npvLo * npvHi > 0) return null

  for (let i = 0; i < MAX_ITERATIONS_BIS; i++) {
    const mid = (lo + hi) / 2
    const npvMid = npv(mid, flows, referenceDate)

    if (Math.abs(npvMid) < TOLERANCE || (hi - lo) / 2 < RATE_TOLERANCE) {
      return mid
    }

    if (npvLo * npvMid < 0) {
      hi = mid
    } else {
      lo = mid
    }
  }

  return (lo + hi) / 2
}

/**
 * Calcula o XIRR (Taxa Interna de Retorno para fluxos irregulares).
 *
 * @param flows - Array de fluxos de caixa com data e valor.
 *   Aportes: valores negativos. Resgate final: valor positivo.
 * @returns Taxa anual em decimal, ou null se não houver convergência.
 *
 * @example
 * const flows = [
 *   { date: new Date('2024-01-01'), amount: -10000 },  // investimento inicial
 *   { date: new Date('2024-02-05'), amount: -500 },    // aporte
 *   { date: new Date('2026-01-01'), amount: 13000 },   // resgate
 * ]
 * const xirr = calculateXIRR(flows) // ex: 0.1456 = 14,56% a.a.
 */
export function calculateXIRR(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null

  // Verifica que há ao menos uma saída e uma entrada
  const hasNegative = flows.some((f) => f.amount < 0)
  const hasPositive = flows.some((f) => f.amount > 0)
  if (!hasNegative || !hasPositive) return null

  // Data de referência = primeiro fluxo
  const referenceDate = flows[0].date

  // Tentativas com diferentes valores iniciais para Newton-Raphson
  const initialGuesses = [0.1, 0.0, 0.5, -0.1, 2.0, 0.01]

  for (const guess of initialGuesses) {
    const result = newtonRaphson(flows, referenceDate, guess)
    if (result !== null && isFinite(result) && result > MIN_RATE) {
      // Valida o resultado calculando o VPL
      const vplCheck = Math.abs(npv(result, flows, referenceDate))
      if (vplCheck < TOLERANCE * 1000) {
        return result
      }
    }
  }

  // Fallback: bisseção
  const bisResult = bisection(flows, referenceDate)
  if (bisResult !== null && isFinite(bisResult)) {
    return bisResult
  }

  return null
}

/**
 * Constrói os fluxos de caixa a partir dos lotes de uma simulação.
 *
 * Cada aporte é uma saída de caixa na sua data de aplicação.
 * O valor líquido final é uma entrada de caixa na data de resgate.
 *
 * @param lots - Array de lotes com { applicationDate, principal }
 * @param netFinalValue - Valor líquido ao final da simulação
 * @param redemptionDate - Data de resgate/vencimento
 */
export function buildCashFlows(
  lots: Array<{ applicationDate: Date; principal: number }>,
  netFinalValue: number,
  redemptionDate: Date
): CashFlow[] {
  const flows: CashFlow[] = lots.map((lot) => ({
    date: lot.applicationDate,
    amount: -lot.principal,
  }))

  flows.push({
    date: redemptionDate,
    amount: netFinalValue,
  })

  // Ordena cronologicamente
  flows.sort((a, b) => a.date.getTime() - b.date.getTime())

  return flows
}
