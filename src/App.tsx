import { AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react'
import { useCallback, useState } from 'react'
import { SimulationTabs, type TabKey } from './components/SimulationTabs'
import { useInvestmentSimulation } from './hooks/useInvestmentSimulation'
import { useSimulationStorage } from './hooks/useSimulationStorage'
import { CDISimulation } from './pages/CDISimulation'
import { Comparison } from './pages/Comparison'
import { FixedRateSimulation } from './pages/FixedRateSimulation'
import { IPCASimulation } from './pages/IPCASimulation'

// ----------------------------------------------------------------
// Modal de confirmação de reset
// ----------------------------------------------------------------
function ResetConfirmModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-5">
          <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-slate-100 mb-1">Restaurar padrão</h2>
            <p className="text-sm text-slate-400">
              Isso irá redefinir os parâmetros e apagar todos os resultados salvos das três
              modalidades. Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-medium text-white transition"
          >
            Restaurar
          </button>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// App principal
// ----------------------------------------------------------------
export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('prefixado')
  const [showResetModal, setShowResetModal] = useState(false)

  // ---- Estado persistido das três simulações ----
  const { state, updateSimulation, resetAll } = useSimulationStorage()

  // ---- Hook independente por modalidade ----
  // Cada hook gerencia seus próprios parâmetros e dirty flag.
  // onUpdate persiste somente a modalidade correspondente.
  const prefixadoSim = useInvestmentSimulation(
    state.prefixado,
    useCallback((sim) => updateSimulation('prefixado', sim), [updateSimulation])
  )
  const cdiSim = useInvestmentSimulation(
    state.cdi,
    useCallback((sim) => updateSimulation('cdi', sim), [updateSimulation])
  )
  const ipcaSim = useInvestmentSimulation(
    state.ipca,
    useCallback((sim) => updateSimulation('ipca', sim), [updateSimulation])
  )

  // ---- Indicadores para as tabs ----
  const calculatedTabs = {
    prefixado: state.prefixado.result !== null,
    cdi: state.cdi.result !== null,
    ipca: state.ipca.result !== null,
  }
  const outdatedTabs = {
    prefixado: prefixadoSim.isDirty,
    cdi: cdiSim.isDirty,
    ipca: ipcaSim.isDirty,
  }

  function handleReset() {
    resetAll()
    setShowResetModal(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">

      {/* ---- Cabeçalho global ---- */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600/20 border border-indigo-500/30 p-2">
              <TrendingUp size={20} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 leading-tight">
                Simulador de Renda Fixa
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Compare rentabilidade, tributação e evolução do patrimônio
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500 transition"
          >
            <RefreshCw size={13} />
            Restaurar padrão
          </button>
        </div>
      </header>

      {/* ---- Navegação por abas ---- */}
      <SimulationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        calculatedTabs={calculatedTabs}
        outdatedTabs={outdatedTabs}
      />

      {/* ---- Conteúdo das abas ---- */}
      {/* Todas as abas são montadas ao mesmo tempo (não desmontadas ao trocar),
          preservando o estado local dos formulários sem perder o que o usuário digitou. */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        <div className={activeTab === 'prefixado' ? 'block' : 'hidden'}>
          <FixedRateSimulation sim={prefixadoSim} />
        </div>

        <div className={activeTab === 'cdi' ? 'block' : 'hidden'}>
          <CDISimulation sim={cdiSim} />
        </div>

        <div className={activeTab === 'ipca' ? 'block' : 'hidden'}>
          <IPCASimulation sim={ipcaSim} />
        </div>

        <div className={activeTab === 'comparativo' ? 'block' : 'hidden'}>
          <Comparison simulations={state} />
        </div>

      </main>

      {/* ---- Aviso legal (sempre visível no rodapé) ---- */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex gap-3">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/80 leading-relaxed">
            <strong className="text-amber-300">Simulação para fins informativos.</strong>{' '}
            CDI e IPCA são premissas projetadas pelo usuário — as taxas reais variam ao longo
            do tempo. Resultados são estimativas e não constituem garantia de rentabilidade.
            Tributação pode variar conforme produto, instituição e legislação vigente.
            Não estão considerados custos de custódia ou taxas de administração.
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-slate-700">
          Simulador de Renda Fixa · Todos os cálculos realizados localmente no navegador
        </p>
      </footer>

      {/* ---- Modal de confirmação de reset ---- */}
      {showResetModal && (
        <ResetConfirmModal
          onConfirm={handleReset}
          onCancel={() => setShowResetModal(false)}
        />
      )}
    </div>
  )
}
