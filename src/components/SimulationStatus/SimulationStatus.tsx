import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import type { SimulationStatus } from '../../types/Simulation'
import { formatDate } from '../../utils/FinancialFormat'

interface SimulationStatusProps {
  status: SimulationStatus
  lastCalculatedAt: string | null
  /** Se verdadeiro, os parâmetros foram alterados desde a última execução */
  isDirty: boolean
}

export function SimulationStatusBadge({
  status,
  lastCalculatedAt,
  isDirty,
}: SimulationStatusProps) {
  const lastDate = lastCalculatedAt ? formatDate(new Date(lastCalculatedAt)) : null

  if (status === 'not_simulated') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-xs text-slate-500">
        <Clock size={13} />
        <span>Nenhuma simulação executada.</span>
      </div>
    )
  }

  if (isDirty || status === 'outdated') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
        <span>
          Os parâmetros foram alterados desde a última simulação
          {lastDate ? ` (${lastDate})` : ''}.{' '}
          <strong className="text-amber-200">Execute novamente para atualizar os resultados.</strong>
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400">
      <CheckCircle size={13} />
      <span>
        Resultados atualizados
        {lastDate ? ` · última execução em ${lastDate}` : ''}.
      </span>
    </div>
  )
}
