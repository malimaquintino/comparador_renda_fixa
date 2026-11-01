// ============================================================
// Tipos e Interfaces do Simulador de Investimentos em Renda Fixa
// ============================================================

/** Modalidade do investimento */
export type InvestmentCategory = 'prefixado' | 'cdi' | 'ipca'

/** Regime tributário do investimento */
export type TaxRegime =
  | 'regressivo'   // Tabela regressiva padrão de IR (CDB, Tesouro, etc.)
  | 'isento'       // Isento de IR (LCI, LCA)
  | 'especifico'   // Regime tributário específico (extensível no futuro)

/** Produto financeiro configurável pelo usuário */
export interface InvestmentProduct {
  id: string
  /** Nome de exibição, ex: "CDB 110% CDI" */
  name: string
  /** Modalidade: prefixado, cdi ou ipca */
  category: InvestmentCategory
  /**
   * Taxa anual do produto (significado varia conforme categoria):
   * - prefixado: taxa anual fixa em decimal (ex: 0.145 = 14,5%)
   * - cdi: percentual do CDI em decimal (ex: 1.06 = 106% do CDI)
   * - ipca: spread anual sobre IPCA em decimal (ex: 0.07 = IPCA + 7%)
   */
  annualRate: number
  /** Regime de tributação aplicável */
  taxRegime: TaxRegime
  /** Descrição opcional do produto */
  description?: string
}

/** Premissas econômicas da simulação */
export interface EconomicAssumptions {
  /** Taxa CDI anual projetada (decimal, ex: 0.1065 = 10,65%) */
  cdiRate: number
  /** IPCA anual projetado (decimal, ex: 0.045 = 4,5%) */
  ipcaRate: number
  /** Data de início da aplicação */
  startDate: string // ISO date string YYYY-MM-DD
}

/** Parâmetros financeiros da simulação */
export interface FinancialParameters {
  /** Prazo em meses */
  termMonths: number
  /** Valor inicial investido (R$) */
  initialAmount: number
  /** Aporte mensal (R$, pode ser 0) */
  monthlyContribution: number
  /** Dia do mês em que os aportes serão realizados (1–28) */
  contributionDay: number
}

/** Parâmetros completos da simulação */
export interface SimulationParams {
  economic: EconomicAssumptions
  financial: FinancialParameters
  products: InvestmentProduct[]
}

// ============================================================
// Lote de investimento (cada aporte é tratado individualmente)
// ============================================================

/** Um lote individual de investimento (capital inicial ou cada aporte) */
export interface InvestmentLot {
  /** Valor aplicado no lote */
  principal: number
  /** Data da aplicação */
  applicationDate: Date
  /** Data do resgate (final da simulação) */
  redemptionDate: Date
  /** Número de dias corridos entre aplicação e resgate */
  calendarDays: number
}

/** Resultado tributário de um lote */
export interface LotTaxResult {
  lot: InvestmentLot
  /** Rendimento bruto do lote */
  grossEarnings: number
  /** IOF incidente sobre o rendimento (somente se < 30 dias) */
  iof: number
  /** Base de cálculo do IR (rendimento menos IOF) */
  irBase: number
  /** Alíquota de IR aplicada (0 se isento) */
  irRate: number
  /** Valor do IR */
  ir: number
  /** Rendimento líquido após IOF e IR */
  netEarnings: number
  /** Valor líquido do lote ao final */
  netValue: number
}

// ============================================================
// Resultados da simulação
// ============================================================

/** Ponto na série histórica mensal de um investimento */
export interface MonthlyDataPoint {
  /** Data de referência do mês */
  date: Date
  /** Número do mês (1 = primeiro mês) */
  month: number
  /** Total investido até esta data (aportes acumulados) */
  totalInvested: number
  /** Saldo bruto acumulado */
  grossBalance: number
  /** Rendimento bruto acumulado */
  grossEarnings: number
  /** IR estimado no resgate neste momento */
  estimatedIR: number
  /** IOF estimado no resgate neste momento */
  estimatedIOF: number
  /** Valor líquido estimado */
  netBalance: number
  /** Rendimento líquido estimado */
  netEarnings: number
}

/** Resultado consolidado de um investimento */
export interface InvestmentResult {
  product: InvestmentProduct
  /** Série histórica mensal */
  monthlyData: MonthlyDataPoint[]
  /** Total investido (capital inicial + todos os aportes) */
  totalInvested: number
  /** Saldo bruto final */
  grossBalance: number
  /** Rendimento bruto total */
  grossEarnings: number
  /** IOF total estimado */
  totalIOF: number
  /** IR total estimado */
  totalIR: number
  /** Valor líquido final */
  netBalance: number
  /** Rendimento líquido total */
  netEarnings: number
  /** Taxa anual efetiva estimada (decimal) */
  effectiveAnnualRate: number
  /** Rentabilidade nominal acumulada (decimal, ex: 0.25 = 25%) */
  nominalReturn: number
  /** Rentabilidade real acumulada (decimal) */
  realReturn: number
  /** Rentabilidade nominal líquida acumulada */
  nominalNetReturn: number
  /** Rentabilidade real líquida acumulada */
  realNetReturn: number
  /** É o melhor investimento da comparação? */
  isBest: boolean
}

/** Resultado completo de uma simulação */
export interface SimulationResult {
  params: SimulationParams
  results: InvestmentResult[]
  /** Data de cálculo */
  calculatedAt: Date
}

// ============================================================
// Valores padrão
// ============================================================

export const DEFAULT_ECONOMIC_ASSUMPTIONS: EconomicAssumptions = {
  cdiRate: 0.1065,   // 10,65% a.a.
  ipcaRate: 0.045,   // 4,50% a.a.
  startDate: new Date().toISOString().slice(0, 10),
}

export const DEFAULT_FINANCIAL_PARAMETERS: FinancialParameters = {
  termMonths: 24,
  initialAmount: 10000,
  monthlyContribution: 500,
  contributionDay: 5,
}

export const DEFAULT_PRODUCTS: InvestmentProduct[] = [
  {
    id: 'default-prefixado',
    name: 'Prefixado 14,50% a.a.',
    category: 'prefixado',
    annualRate: 0.145,
    taxRegime: 'regressivo',
    description: 'Investimento prefixado com taxa de 14,50% ao ano',
  },
  {
    id: 'default-cdb',
    name: 'CDB 106% CDI',
    category: 'cdi',
    annualRate: 1.06, // 106% do CDI
    taxRegime: 'regressivo',
    description: 'CDB com rentabilidade de 106% do CDI',
  },
  {
    id: 'default-ipca',
    name: 'IPCA+ 7,00% a.a.',
    category: 'ipca',
    annualRate: 0.07, // IPCA + 7%
    taxRegime: 'regressivo',
    description: 'Investimento indexado ao IPCA com spread de 7,00% a.a.',
  },
]

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  economic: DEFAULT_ECONOMIC_ASSUMPTIONS,
  financial: DEFAULT_FINANCIAL_PARAMETERS,
  products: DEFAULT_PRODUCTS,
}
