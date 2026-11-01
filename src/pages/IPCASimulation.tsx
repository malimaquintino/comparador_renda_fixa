import type { UseInvestmentSimulationReturn } from '../hooks/useInvestmentSimulation'
import { SimulationPage } from './SimulationPage'

interface IPCASimulationProps {
  sim: UseInvestmentSimulationReturn
}

export function IPCASimulation({ sim }: IPCASimulationProps) {
  return (
    <SimulationPage
      config={{
        title: 'IPCA+',
        subtitle: 'Rentabilidade indexada à inflação acrescida de spread fixo.',
        accentText: 'text-emerald-400',
        accentBorder: 'border-emerald-500/30',
        buttonBg: 'bg-emerald-600',
        buttonHover: 'hover:bg-emerald-500',
      }}
      sim={sim}
    />
  )
}
