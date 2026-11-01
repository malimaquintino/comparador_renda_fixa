/**
 * InvestmentResults
 *
 * Exibe os resultados de uma simulação individual:
 * - Card com todos os indicadores financeiros
 * - Gráfico de evolução patrimonial
 * - Gráfico de composição patrimonial
 * - Tabela de evolução mensal
 *
 * Reutiliza os componentes existentes, passando o resultado em um array
 * com um elemento (conforme a interface desses componentes espera).
 */

import { InvestmentCard } from './InvestmentCard'
import { InvestmentCompositionChart } from './InvestmentCompositionChart'
import { MonthlyEvolutionTable } from './MonthlyEvolutionTable'
import { PatrimonialEvolutionChart } from './PatrimonialEvolutionChart'
import type { InvestmentResult } from '../types/Investment'

interface InvestmentResultsProps {
  result: InvestmentResult
}

export function InvestmentResults({ result }: InvestmentResultsProps) {
  // Os componentes de gráfico esperam um array; passamos um array unitário.
  const results = [result]

  return (
    <div className="flex flex-col gap-6">
      {/* Card com todos os indicadores */}
      <div className="max-w-sm">
        <InvestmentCard result={result} />
      </div>

      {/* Gráficos lado a lado em telas grandes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PatrimonialEvolutionChart results={results} />
        <InvestmentCompositionChart results={results} />
      </div>

      {/* Evolução mensal detalhada */}
      <MonthlyEvolutionTable results={results} />
    </div>
  )
}
