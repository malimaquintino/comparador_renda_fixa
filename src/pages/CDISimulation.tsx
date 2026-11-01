import type { UseInvestmentSimulationReturn } from '../hooks/useInvestmentSimulation'
import { SimulationPage } from './SimulationPage'

interface CDISimulationProps {
  sim: UseInvestmentSimulationReturn
}

export function CDISimulation({ sim }: CDISimulationProps) {
  return (
    <SimulationPage
      config={{
        title: 'CDI',
        subtitle: 'Rentabilidade atrelada ao CDI — CDB, LCI, LCA e similares.',
        accentText: 'text-blue-400',
        accentBorder: 'border-blue-500/30',
        buttonBg: 'bg-blue-600',
        buttonHover: 'hover:bg-blue-500',
      }}
      sim={sim}
    />
  )
}
