import { BarChart2, GitCompare, Percent, TrendingUp } from 'lucide-react'
import type { SimulationKey } from '../../types/Simulation'

export type TabKey = SimulationKey | 'comparativo'

export interface TabConfig {
  key: TabKey
  label: string
  icon: React.ReactNode
  accent: string          // cor do texto ativo
  border: string          // cor da borda inferior ativa
  badge?: string          // cor do badge de status
}

export const TABS: TabConfig[] = [
  {
    key: 'prefixado',
    label: 'Prefixado',
    icon: <Percent size={15} />,
    accent: 'text-violet-400',
    border: 'border-violet-500',
    badge: 'bg-violet-500',
  },
  {
    key: 'cdi',
    label: 'CDI',
    icon: <TrendingUp size={15} />,
    accent: 'text-blue-400',
    border: 'border-blue-500',
    badge: 'bg-blue-500',
  },
  {
    key: 'ipca',
    label: 'IPCA+',
    icon: <BarChart2 size={15} />,
    accent: 'text-emerald-400',
    border: 'border-emerald-500',
    badge: 'bg-emerald-500',
  },
  {
    key: 'comparativo',
    label: 'Comparativo',
    icon: <GitCompare size={15} />,
    accent: 'text-amber-400',
    border: 'border-amber-500',
    badge: 'bg-amber-500',
  },
]

interface SimulationTabsProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  /** Quais abas têm resultado calculado */
  calculatedTabs: Partial<Record<TabKey, boolean>>
  /** Quais abas estão desatualizadas */
  outdatedTabs: Partial<Record<TabKey, boolean>>
}

export function SimulationTabs({
  activeTab,
  onTabChange,
  calculatedTabs,
  outdatedTabs,
}: SimulationTabsProps) {
  return (
    <div className="border-b border-slate-700 bg-slate-900/90 backdrop-blur sticky top-[65px] z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex gap-1" role="tablist">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            const isCalculated = calculatedTabs[tab.key]
            const isOutdated = outdatedTabs[tab.key]

            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.key)}
                className={`
                  relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium
                  border-b-2 transition-all duration-150 whitespace-nowrap
                  ${isActive
                    ? `${tab.accent} ${tab.border}`
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600'
                  }
                `}
              >
                <span className={isActive ? tab.accent : ''}>{tab.icon}</span>
                <span>{tab.label}</span>

                {/* Indicador de resultado disponível */}
                {isCalculated && tab.key !== 'comparativo' && (
                  <span
                    className={`
                      inline-block w-1.5 h-1.5 rounded-full
                      ${isOutdated ? 'bg-amber-400 animate-pulse' : (tab.badge ?? 'bg-slate-400')}
                    `}
                    title={isOutdated ? 'Parâmetros alterados' : 'Simulação calculada'}
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
