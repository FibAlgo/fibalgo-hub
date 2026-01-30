/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 FINANCIAL MODELING PREP (FMP) API
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Kapsamlı finansal tablolar:
 * - Income Statement
 * - Balance Sheet
 * - Cash Flow Statement
 * - Financial Ratios
 * - DCF Valuation
 * 
 * API Key: https://financialmodelingprep.com/developer/docs/ (FREE - 250 calls/day)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface IncomeStatement {
  date: string;
  symbol: string;
  period: 'annual' | 'quarter';
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  ebitda: number;
  ebitdaRatio: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsDiluted: number;
  weightedAverageShares: number;
  weightedAverageSharesDiluted: number;
}

export interface BalanceSheet {
  date: string;
  symbol: string;
  period: 'annual' | 'quarter';
  // Assets
  cashAndEquivalents: number;
  shortTermInvestments: number;
  totalCurrentAssets: number;
  propertyPlantEquipment: number;
  goodwill: number;
  intangibleAssets: number;
  totalAssets: number;
  // Liabilities
  accountsPayable: number;
  shortTermDebt: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  totalDebt: number;
  totalLiabilities: number;
  // Equity
  totalStockholdersEquity: number;
  retainedEarnings: number;
}

export interface CashFlowStatement {
  date: string;
  symbol: string;
  period: 'annual' | 'quarter';
  // Operating
  netIncome: number;
  depreciation: number;
  changeInWorkingCapital: number;
  operatingCashFlow: number;
  // Investing
  capitalExpenditure: number;
  acquisitions: number;
  investingCashFlow: number;
  // Financing
  dividendsPaid: number;
  stockRepurchased: number;
  debtRepayment: number;
  financingCashFlow: number;
  // Net
  freeCashFlow: number;
  netChangeInCash: number;
}

export interface FinancialRatios {
  symbol: string;
  date: string;
  // Valuation
  peRatio: number;
  pegRatio: number;
  priceToSales: number;
  priceToBook: number;
  evToEbitda: number;
  evToRevenue: number;
  // Profitability
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roa: number;
  roic: number;
  // Leverage
  debtToEquity: number;
  debtToAssets: number;
  interestCoverage: number;
  // Liquidity
  currentRatio: number;
  quickRatio: number;
  // Efficiency
  assetTurnover: number;
  inventoryTurnover: number;
  receivablesTurnover: number;
}

export interface DCFValuation {
  symbol: string;
  date: string;
  dcf: number;
  price: number;
  upside: number; // percentage
  isUndervalued: boolean;
}

export interface StockScreenerResult {
  symbol: string;
  companyName: string;
  marketCap: number;
  sector: string;
  industry: string;
  price: number;
  beta: number;
  volume: number;
  lastAnnualDividend: number;
  country: string;
  exchange: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FMP API CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

async function fmpFetch<T>(endpoint: string): Promise<T | null> {
  const apiKey = process.env.FMP_API_KEY;
  
  if (!apiKey) {
    console.warn('FMP_API_KEY not configured');
    return null;
  }
  
  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const response = await fetch(`${FMP_BASE_URL}${endpoint}${separator}apikey=${apiKey}`);
    
    if (!response.ok) {
      console.error(`FMP API error: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('FMP fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL STATEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch income statement
 */
export async function fetchIncomeStatement(
  symbol: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 5
): Promise<IncomeStatement[]> {
  const data = await fmpFetch<IncomeStatement[]>(
    `/income-statement/${symbol}?period=${period}&limit=${limit}`
  );
  return data || [];
}

/**
 * Fetch balance sheet
 */
export async function fetchBalanceSheet(
  symbol: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 5
): Promise<BalanceSheet[]> {
  const data = await fmpFetch<BalanceSheet[]>(
    `/balance-sheet-statement/${symbol}?period=${period}&limit=${limit}`
  );
  return data || [];
}

/**
 * Fetch cash flow statement
 */
export async function fetchCashFlow(
  symbol: string,
  period: 'annual' | 'quarter' = 'annual',
  limit: number = 5
): Promise<CashFlowStatement[]> {
  const data = await fmpFetch<CashFlowStatement[]>(
    `/cash-flow-statement/${symbol}?period=${period}&limit=${limit}`
  );
  return data || [];
}

/**
 * Fetch financial ratios
 */
export async function fetchFinancialRatios(
  symbol: string,
  limit: number = 5
): Promise<FinancialRatios[]> {
  const data = await fmpFetch<FinancialRatios[]>(
    `/ratios/${symbol}?limit=${limit}`
  );
  return data || [];
}

/**
 * Fetch TTM (Trailing Twelve Months) ratios
 */
export async function fetchTTMRatios(symbol: string): Promise<FinancialRatios | null> {
  const data = await fmpFetch<FinancialRatios[]>(`/ratios-ttm/${symbol}`);
  return data?.[0] || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALUATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch DCF valuation
 */
export async function fetchDCFValuation(symbol: string): Promise<DCFValuation | null> {
  const data = await fmpFetch<DCFValuation[]>(`/discounted-cash-flow/${symbol}`);
  
  if (!data?.[0]) return null;
  
  const dcf = data[0];
  return {
    ...dcf,
    upside: ((dcf.dcf - dcf.price) / dcf.price) * 100,
    isUndervalued: dcf.dcf > dcf.price
  };
}

/**
 * Fetch enterprise value
 */
export async function fetchEnterpriseValue(symbol: string): Promise<{
  symbol: string;
  date: string;
  enterpriseValue: number;
  marketCap: number;
  totalDebt: number;
  cashAndEquivalents: number;
} | null> {
  const data = await fmpFetch<Array<{
    symbol: string;
    date: string;
    enterpriseValue: number;
    marketCapitalization: number;
    addTotalDebt: number;
    minusCashAndCashEquivalents: number;
  }>>(`/enterprise-values/${symbol}?limit=1`);
  
  if (!data?.[0]) return null;
  
  return {
    symbol: data[0].symbol,
    date: data[0].date,
    enterpriseValue: data[0].enterpriseValue,
    marketCap: data[0].marketCapitalization,
    totalDebt: data[0].addTotalDebt,
    cashAndEquivalents: data[0].minusCashAndCashEquivalents
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROWTH METRICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface GrowthMetrics {
  revenueGrowth: number;
  grossProfitGrowth: number;
  ebitdaGrowth: number;
  operatingIncomeGrowth: number;
  netIncomeGrowth: number;
  epsGrowth: number;
  freeCashFlowGrowth: number;
  bookValueGrowth: number;
}

export async function fetchGrowthMetrics(symbol: string): Promise<GrowthMetrics | null> {
  const data = await fmpFetch<GrowthMetrics[]>(`/financial-growth/${symbol}?limit=1`);
  return data?.[0] || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEY METRICS
// ═══════════════════════════════════════════════════════════════════════════════

export interface KeyMetrics {
  symbol: string;
  date: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  bookValuePerShare: number;
  tangibleBookValuePerShare: number;
  shareholdersEquityPerShare: number;
  interestDebtPerShare: number;
  marketCap: number;
  enterpriseValue: number;
  peRatio: number;
  priceToSalesRatio: number;
  pocfratio: number;
  pfcfRatio: number;
  pbRatio: number;
  ptbRatio: number;
  evToSales: number;
  enterpriseValueOverEBITDA: number;
  evToOperatingCashFlow: number;
  evToFreeCashFlow: number;
  earningsYield: number;
  freeCashFlowYield: number;
  debtToEquity: number;
  debtToAssets: number;
  netDebtToEBITDA: number;
  currentRatio: number;
  interestCoverage: number;
  incomeQuality: number;
  dividendYield: number;
  payoutRatio: number;
  salesGeneralAndAdministrativeToRevenue: number;
  researchAndDevelopementToRevenue: number;
  intangiblesToTotalAssets: number;
  capexToOperatingCashFlow: number;
  capexToRevenue: number;
  capexToDepreciation: number;
  stockBasedCompensationToRevenue: number;
  grahamNumber: number;
  roic: number;
  returnOnTangibleAssets: number;
  grahamNetNet: number;
  workingCapital: number;
  tangibleAssetValue: number;
  netCurrentAssetValue: number;
  investedCapital: number;
  averageReceivables: number;
  averagePayables: number;
  averageInventory: number;
  daysSalesOutstanding: number;
  daysPayablesOutstanding: number;
  daysOfInventoryOnHand: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  roe: number;
  capexPerShare: number;
}

export async function fetchKeyMetrics(
  symbol: string,
  limit: number = 5
): Promise<KeyMetrics[]> {
  const data = await fmpFetch<KeyMetrics[]>(
    `/key-metrics/${symbol}?limit=${limit}`
  );
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK SCREENER
// ═══════════════════════════════════════════════════════════════════════════════

export async function screenStocks(params: {
  marketCapMoreThan?: number;
  marketCapLowerThan?: number;
  priceMoreThan?: number;
  priceLowerThan?: number;
  betaMoreThan?: number;
  betaLowerThan?: number;
  volumeMoreThan?: number;
  dividendMoreThan?: number;
  sector?: string;
  industry?: string;
  exchange?: string;
  limit?: number;
}): Promise<StockScreenerResult[]> {
  const queryParams = new URLSearchParams();
  
  if (params.marketCapMoreThan) queryParams.append('marketCapMoreThan', String(params.marketCapMoreThan));
  if (params.marketCapLowerThan) queryParams.append('marketCapLowerThan', String(params.marketCapLowerThan));
  if (params.priceMoreThan) queryParams.append('priceMoreThan', String(params.priceMoreThan));
  if (params.priceLowerThan) queryParams.append('priceLowerThan', String(params.priceLowerThan));
  if (params.betaMoreThan) queryParams.append('betaMoreThan', String(params.betaMoreThan));
  if (params.betaLowerThan) queryParams.append('betaLowerThan', String(params.betaLowerThan));
  if (params.volumeMoreThan) queryParams.append('volumeMoreThan', String(params.volumeMoreThan));
  if (params.dividendMoreThan) queryParams.append('dividendMoreThan', String(params.dividendMoreThan));
  if (params.sector) queryParams.append('sector', params.sector);
  if (params.industry) queryParams.append('industry', params.industry);
  if (params.exchange) queryParams.append('exchange', params.exchange);
  queryParams.append('limit', String(params.limit || 50));
  
  const data = await fmpFetch<StockScreenerResult[]>(
    `/stock-screener?${queryParams.toString()}`
  );
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE FINANCIAL SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

export interface FinancialSnapshot {
  symbol: string;
  incomeStatement: IncomeStatement | null;
  balanceSheet: BalanceSheet | null;
  cashFlow: CashFlowStatement | null;
  ratios: FinancialRatios | null;
  dcf: DCFValuation | null;
  growth: GrowthMetrics | null;
  timestamp: number;
}

export async function fetchCompleteFinancials(symbol: string): Promise<FinancialSnapshot> {
  const [income, balance, cashFlow, ratios, dcf, growth] = await Promise.all([
    fetchIncomeStatement(symbol, 'annual', 1),
    fetchBalanceSheet(symbol, 'annual', 1),
    fetchCashFlow(symbol, 'annual', 1),
    fetchTTMRatios(symbol),
    fetchDCFValuation(symbol),
    fetchGrowthMetrics(symbol)
  ]);
  
  return {
    symbol,
    incomeStatement: income[0] || null,
    balanceSheet: balance[0] || null,
    cashFlow: cashFlow[0] || null,
    ratios,
    dcf,
    growth,
    timestamp: Date.now()
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT FOR AI
// ═══════════════════════════════════════════════════════════════════════════════

export function formatFinancialsForAI(snapshot: FinancialSnapshot): string {
  const { symbol, incomeStatement, balanceSheet, cashFlow, ratios, dcf, growth } = snapshot;
  
  let text = `## ${symbol} Financial Analysis\n\n`;
  
  // Income Statement Highlights
  if (incomeStatement) {
    text += '### Income Statement\n';
    text += `- Revenue: $${(incomeStatement.revenue / 1e9).toFixed(2)}B\n`;
    text += `- Gross Margin: ${(incomeStatement.grossProfitRatio * 100).toFixed(1)}%\n`;
    text += `- Operating Margin: ${(incomeStatement.operatingIncomeRatio * 100).toFixed(1)}%\n`;
    text += `- Net Margin: ${(incomeStatement.netIncomeRatio * 100).toFixed(1)}%\n`;
    text += `- EPS: $${incomeStatement.eps.toFixed(2)}\n\n`;
  }
  
  // Balance Sheet Highlights
  if (balanceSheet) {
    text += '### Balance Sheet\n';
    text += `- Cash: $${(balanceSheet.cashAndEquivalents / 1e9).toFixed(2)}B\n`;
    text += `- Total Debt: $${(balanceSheet.totalDebt / 1e9).toFixed(2)}B\n`;
    text += `- Net Debt: $${((balanceSheet.totalDebt - balanceSheet.cashAndEquivalents) / 1e9).toFixed(2)}B\n`;
    text += `- Equity: $${(balanceSheet.totalStockholdersEquity / 1e9).toFixed(2)}B\n\n`;
  }
  
  // Cash Flow Highlights
  if (cashFlow) {
    text += '### Cash Flow\n';
    text += `- Operating CF: $${(cashFlow.operatingCashFlow / 1e9).toFixed(2)}B\n`;
    text += `- CapEx: $${(cashFlow.capitalExpenditure / 1e9).toFixed(2)}B\n`;
    text += `- Free Cash Flow: $${(cashFlow.freeCashFlow / 1e9).toFixed(2)}B\n\n`;
  }
  
  // Valuation Ratios
  if (ratios) {
    text += '### Valuation\n';
    text += `- P/E Ratio: ${ratios.peRatio.toFixed(1)}\n`;
    text += `- P/S Ratio: ${ratios.priceToSales.toFixed(1)}\n`;
    text += `- P/B Ratio: ${ratios.priceToBook.toFixed(1)}\n`;
    text += `- EV/EBITDA: ${ratios.evToEbitda.toFixed(1)}\n`;
    text += `- ROE: ${(ratios.roe * 100).toFixed(1)}%\n`;
    text += `- ROIC: ${(ratios.roic * 100).toFixed(1)}%\n\n`;
  }
  
  // DCF Valuation
  if (dcf) {
    text += '### DCF Valuation\n';
    text += `- Fair Value: $${dcf.dcf.toFixed(2)}\n`;
    text += `- Current Price: $${dcf.price.toFixed(2)}\n`;
    text += `- Upside: ${dcf.upside >= 0 ? '+' : ''}${dcf.upside.toFixed(1)}%\n`;
    text += `- Status: ${dcf.isUndervalued ? '✅ Undervalued' : '⚠️ Overvalued'}\n\n`;
  }
  
  // Growth
  if (growth) {
    text += '### Growth Rates (YoY)\n';
    text += `- Revenue Growth: ${(growth.revenueGrowth * 100).toFixed(1)}%\n`;
    text += `- EPS Growth: ${(growth.epsGrowth * 100).toFixed(1)}%\n`;
    text += `- FCF Growth: ${(growth.freeCashFlowGrowth * 100).toFixed(1)}%\n`;
  }
  
  return text;
}
