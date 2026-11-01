import { ChevronDown, ChevronUp, Edit2, PlusCircle, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { InvestmentCategory, InvestmentProduct, TaxRegime } from '../types/Investment'
import { formatCategory, formatProductRate, formatTaxRegime } from '../utils/FinancialFormat'

interface InvestmentManagerProps {
  products: InvestmentProduct[]
  onChange: (products: InvestmentProduct[]) => void
}

interface ProductFormState {
  name: string
  category: InvestmentCategory
  annualRate: string
  taxRegime: TaxRegime
  description: string
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  category: 'prefixado',
  annualRate: '',
  taxRegime: 'regressivo',
  description: '',
}

const inputCls =
  'w-full rounded-lg border border-slate-600 bg-slate-700/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition'

const labelCls = 'text-xs font-medium text-slate-400 mb-1 block'

function getRateHint(category: InvestmentCategory): string {
  switch (category) {
    case 'prefixado':
      return 'Taxa anual fixa em % a.a. (ex: 14.50)'
    case 'cdi':
      return 'Percentual do CDI (ex: 106 para 106% do CDI)'
    case 'ipca':
      return 'Spread sobre o IPCA em % a.a. (ex: 7.00 para IPCA + 7%)'
  }
}

function getRatePlaceholder(category: InvestmentCategory): string {
  switch (category) {
    case 'prefixado':
      return '14,50'
    case 'cdi':
      return '106,00'
    case 'ipca':
      return '7,00'
  }
}

function getRateLabel(category: InvestmentCategory): string {
  switch (category) {
    case 'prefixado':
      return 'Taxa (% a.a.)'
    case 'cdi':
      return 'Percentual do CDI (%)'
    case 'ipca':
      return 'Spread sobre IPCA (% a.a.)'
  }
}

/** Converte o valor do formulário para o formato interno do produto */
function parseRate(category: InvestmentCategory, raw: string): number {
  const num = parseFloat(raw.replace(',', '.'))
  if (isNaN(num)) return 0
  // Para CDI, guardamos em decimal direto: 106% → 1.06
  if (category === 'cdi') return num / 100
  // Para prefixado e IPCA+, guardamos em decimal: 14.5% → 0.145
  return num / 100
}

/** Converte o valor interno para exibição no formulário */
function formatRateForForm(_category: InvestmentCategory, rate: number): string {
  // Para todos os casos, o valor interno é o decimal
  // CDI: 1.06 → "106.00"; Prefixado/IPCA: 0.145 → "14.50"
  return (rate * 100).toFixed(2)
}

function generateId(): string {
  return `product-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function ProductModal({
  initial,
  onSave,
  onClose,
}: {
  initial: ProductFormState
  onSave: (form: ProductFormState) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<ProductFormState>(initial)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Informe um nome para o investimento.')
      return
    }
    const rate = parseFloat(form.annualRate.replace(',', '.'))
    if (isNaN(rate) || rate <= 0) {
      setError('Informe uma taxa válida e maior que zero.')
      return
    }
    setError('')
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-100">
            {initial.name ? 'Editar investimento' : 'Novo investimento'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Nome</label>
            <input
              className={inputCls}
              placeholder="Ex: CDB 110% CDI"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Modalidade</label>
            <select
              className={inputCls}
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as InvestmentCategory, annualRate: '' })
              }
            >
              <option value="prefixado">Prefixado</option>
              <option value="cdi">CDI (% do CDI)</option>
              <option value="ipca">IPCA+ (IPCA + spread)</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>{getRateLabel(form.category)}</label>
            <input
              className={inputCls}
              type="number"
              step="0.01"
              min="0.01"
              placeholder={getRatePlaceholder(form.category)}
              value={form.annualRate}
              onChange={(e) => setForm({ ...form, annualRate: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">{getRateHint(form.category)}</p>
          </div>

          <div>
            <label className={labelCls}>Tributação</label>
            <select
              className={inputCls}
              value={form.taxRegime}
              onChange={(e) => setForm({ ...form, taxRegime: e.target.value as TaxRegime })}
            >
              <option value="regressivo">Tabela regressiva (CDB, Tesouro, etc.)</option>
              <option value="isento">Isento de IR (LCI, LCA)</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Descrição (opcional)</label>
            <input
              className={inputCls}
              placeholder="Ex: CDB Banco XYZ, vencimento 2026"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const CATEGORY_COLORS: Record<InvestmentCategory, string> = {
  prefixado: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  cdi: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ipca: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export function InvestmentManager({ products, onChange }: InvestmentManagerProps) {
  const [open, setOpen] = useState(true)
  const [modal, setModal] = useState<{ form: ProductFormState; editId: string | null } | null>(
    null
  )

  function openAdd() {
    setModal({ form: { ...EMPTY_FORM }, editId: null })
  }

  function openEdit(product: InvestmentProduct) {
    setModal({
      form: {
        name: product.name,
        category: product.category,
        annualRate: formatRateForForm(product.category, product.annualRate),
        taxRegime: product.taxRegime,
        description: product.description ?? '',
      },
      editId: product.id,
    })
  }

  function handleSave(form: ProductFormState) {
    const rate = parseRate(form.category, form.annualRate)
    if (modal?.editId) {
      onChange(
        products.map((p) =>
          p.id === modal.editId
            ? {
                ...p,
                name: form.name.trim(),
                category: form.category,
                annualRate: rate,
                taxRegime: form.taxRegime,
                description: form.description.trim() || undefined,
              }
            : p
        )
      )
    } else {
      const newProduct: InvestmentProduct = {
        id: generateId(),
        name: form.name.trim(),
        category: form.category,
        annualRate: rate,
        taxRegime: form.taxRegime,
        description: form.description.trim() || undefined,
      }
      onChange([...products, newProduct])
    }
    setModal(null)
  }

  function handleRemove(id: string) {
    onChange(products.filter((p) => p.id !== id))
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-700 bg-slate-800/70 backdrop-blur overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 hover:text-slate-100 transition text-left"
          >
            <span className="font-semibold text-slate-100">Produtos financeiros</span>
            {open ? (
              <ChevronUp size={18} className="text-slate-400" />
            ) : (
              <ChevronDown size={18} className="text-slate-400" />
            )}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition"
          >
            <PlusCircle size={13} />
            Adicionar
          </button>
        </div>

        {open && (
          <div className="p-4 flex flex-col gap-2">
            {products.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-6">
                Nenhum produto configurado. Clique em "Adicionar" para começar.
              </p>
            )}
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-700/30 px-4 py-3 hover:bg-slate-700/50 transition"
              >
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[product.category]}`}
                >
                  {formatCategory(product.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{product.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatProductRate(product.category, product.annualRate)}
                    {' · '}
                    {formatTaxRegime(product.taxRegime)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(product)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-600 hover:text-slate-200 transition"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleRemove(product.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition"
                    title="Remover"
                    disabled={products.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ProductModal
          initial={modal.form}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
