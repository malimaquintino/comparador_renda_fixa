import type { UseInvestmentSimulationReturn } from '../hooks/useInvestmentSimulation'
import { SimulationPage } from './SimulationPage'

interface FixedRateSimulationProps {
  sim: UseInvestmentSimulationReturn
}

export function FixedRateSimulation({ sim }: FixedRateSimulationProps) {
  return (
    <SimulationPage
      config={{
        title: 'Prefixado',
        subtitle: 'Taxa de juros anual fixa, definida no momento da contratação.',
        accentText: 'text-violet-400',
        accentBorder: 'border-violet-500/30',
        buttonBg: 'bg-violet-600',
        buttonHover: 'hover:bg-violet-500',
      }}
      sim={sim}
    />
  )
}
