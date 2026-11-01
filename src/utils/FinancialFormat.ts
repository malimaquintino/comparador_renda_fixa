/**
 * FinancialFormat
 *
 * Utilitários de formatação financeira com padrão brasileiro (pt-BR).
 *
 * Convenções:
 * - Moeda: R$ 1.234,56
 * - Percentual: 14,50% a.a.
 * - Datas: dd/mm/aaaa
 */

// ----------------------------------------------------------------
// Formatação de moeda
// ----------------------------------------------------------------

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const BRL_COMPACT_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const NUMBER_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formata um valor como moeda brasileira.
 * Ex: 1234.56 → "R$ 1.234,56"
 */
export function formatCurrency(value: number): string {
  return BRL_FORMATTER.format(value)
}

/**
 * Formata um valor como moeda sem centavos (para valores grandes).
 * Ex: 1234567 → "R$ 1.234.567"
 */
export function formatCurrencyCompact(value: number): string {
  return BRL_COMPACT_FORMATTER.format(value)
}

/**
 * Formata um número com 2 casas decimais no padrão brasileiro.
 * Ex: 1234.56 → "1.234,56"
 */
export function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value)
}

/**
 * Formata valores no eixo dos gráficos — usa K/M para compactar.
 * Ex: 1500000 → "R$ 1,5M" | 150000 → "R$ 150K"
 */
export function formatChartValue(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K`
  }
  return formatCurrency(value)
}

// ----------------------------------------------------------------
// Formatação de percentuais
// ----------------------------------------------------------------

/**
 * Formata um decimal como percentual com N casas decimais.
 * Ex: 0.1450 → "14,50%"
 *
 * @param value - Valor decimal (0.145 = 14,5%)
 * @param decimals - Casas decimais (padrão: 2)
 */
export function formatPercent(value: number, decimals = 2): string {
  return (value * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%'
}

/**
 * Formata um percentual já em forma de porcentagem (não decimal).
 * Ex: 14.50 → "14,50%"
 */
export function formatPercentRaw(value: number, decimals = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%'
}

/**
 * Formata a taxa de um produto conforme sua modalidade.
 *
 * - Prefixado: "14,50% a.a."
 * - CDI: "106,00% do CDI"
 * - IPCA+: "IPCA + 7,00% a.a."
 */
export function formatProductRate(
  category: 'prefixado' | 'cdi' | 'ipca',
  annualRate: number
): string {
  switch (category) {
    case 'prefixado':
      return `${formatPercentRaw(annualRate * 100)} a.a.`
    case 'cdi':
      return `${formatPercentRaw(annualRate * 100)} do CDI`
    case 'ipca':
      return `IPCA + ${formatPercentRaw(annualRate * 100)} a.a.`
  }
}

/**
 * Formata a taxa efetiva anual de um produto.
 * Ex: 0.1450 → "14,50% a.a."
 */
export function formatEffectiveRate(effectiveRate: number): string {
  return `${formatPercentRaw(effectiveRate * 100)} a.a.`
}

// ----------------------------------------------------------------
// Formatação de datas
// ----------------------------------------------------------------

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

const DATE_SHORT_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

/**
 * Formata uma data no padrão brasileiro completo.
 * Ex: new Date('2024-01-15') → "15/01/2024"
 */
export function formatDate(date: Date): string {
  return DATE_FORMATTER.format(date)
}

/**
 * Formata uma data de forma abreviada (mês/ano).
 * Ex: new Date('2024-01-15') → "jan. 2024"
 */
export function formatDateShort(date: Date): string {
  return DATE_SHORT_FORMATTER.format(date)
}

/**
 * Converte string ISO (YYYY-MM-DD) para Date no fuso horário local.
 * Evita o problema de UTC offset que faz a data aparecer um dia antes.
 */
export function parseLocalDate(isoString: string): Date {
  const [year, month, day] = isoString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Converte Date para string ISO no formato YYYY-MM-DD.
 */
export function toISODateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ----------------------------------------------------------------
// Formatação de prazos
// ----------------------------------------------------------------

/**
 * Formata um prazo em meses de forma legível.
 * Ex: 24 → "24 meses (2 anos)"
 * Ex: 6 → "6 meses"
 */
export function formatTerm(months: number): string {
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) {
    return `${months} meses (${years} ${years === 1 ? 'ano' : 'anos'})`
  }
  return `${months} meses (${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'})`
}

// ----------------------------------------------------------------
// Formatação do nome da modalidade
// ----------------------------------------------------------------

/**
 * Retorna o label da modalidade em português.
 */
export function formatCategory(category: 'prefixado' | 'cdi' | 'ipca'): string {
  const labels = {
    prefixado: 'Prefixado',
    cdi: 'CDI',
    ipca: 'IPCA+',
  }
  return labels[category]
}

/**
 * Retorna o label do regime tributário em português.
 */
export function formatTaxRegime(regime: 'regressivo' | 'isento' | 'especifico'): string {
  const labels = {
    regressivo: 'Tabela regressiva',
    isento: 'Isento de IR',
    especifico: 'Regime específico',
  }
  return labels[regime]
}
