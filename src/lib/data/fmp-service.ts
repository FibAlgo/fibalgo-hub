/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 FMP COMPREHENSIVE SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Single source of truth for all FMP API calls.
 * Uses the Stable API (https://financialmodelingprep.com/stable)
 * 
 * Features:
 * - Automatic symbol mapping (SPX -> ^GSPC, VIX -> ^VIX, DXY -> DXUSD)
 * - All major data categories: quotes, charts, fundamentals, macro, technicals
 * - Batch operations for efficiency
 * - Type-safe interfaces
 * 
 * API Reference: docs/FMP-API-CATALOG.md
 */

const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOL MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map common index/asset symbols to FMP-compatible format.
 * FMP uses Yahoo-style ^ prefix for major indices.
 */
export function mapToFmpSymbol(symbol: string): string {
  const upper = (symbol || '').toUpperCase().trim();
  
  // Remove common prefixes
  const cleaned = upper
    .replace(/^(TVC:|CBOE:|SP:|NASDAQ:|NYSE:|AMEX:|FX:|OANDA:|FOREXCOM:)/, '');
  
  switch (cleaned) {
    // S&P 500
    case 'SPX': case 'SP500': case 'GSPC': return '^GSPC';
    // VIX
    case 'VIX': return '^VIX';
    // Dollar Index
    case 'DXY': case 'USDX': return 'DXUSD';
    // Nasdaq 100
    case 'NDX': case 'NASDAQ100': return '^NDX';
    // Nasdaq Composite
    case 'IXIC': case 'COMP': return '^IXIC';
    // Dow Jones
    case 'DJI': case 'DJIA': case 'DOW': return '^DJI';
    // Russell 2000
    case 'RUT': case 'RTY': return '^RUT';
    // Gold
    case 'GOLD': case 'XAUUSD': case 'GC1!': return 'GCUSD';
    // Silver
    case 'SILVER': case 'XAGUSD': case 'SI1!': return 'SIUSD';
    // Crude Oil
    case 'OIL': case 'WTI': case 'CL1!': return 'CLUSD';
    // Natural Gas
    case 'NATGAS': case 'NG1!': return 'NGUSD';
    default: return cleaned;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

function getApiKey(): string | null {
  return process.env.FMP_API_KEY || null;
}

async function fmpFetch<T>(path: string, timeout = 15000): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[FMP] API key not configured');
    return null;
  }
  
  const sep = path.includes('?') ? '&' : '?';
  const url = `${FMP_STABLE_BASE}${path}${sep}apikey=${apiKey}`;
  
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    const res = await fetch(url, { 
      cache: 'no-store',
      signal: controller.signal 
    });
    clearTimeout(id);
    
    if (!res.ok) {
      console.error(`[FMP] HTTP ${res.status} for ${path}`);
      return null;
    }
    
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[FMP] Fetch error for ${path}:`, e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface FmpQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changesPercentage: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  previousClose: number;
  volume: number;
  avgVolume?: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  timestamp?: number;
}

export interface FmpCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface FmpProfile {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  country: string;
  exchange: string;
  marketCap: number;
  price: number;
  beta: number;
  volAvg: number;
  description: string;
  ceo: string;
  employees: number;
  website: string;
  ipoDate: string;
}

export interface FmpEarning {
  date: string;
  symbol: string;
  eps: number;
  epsEstimated: number;
  revenue: number;
  revenueEstimated: number;
}

export interface FmpDividend {
  date: string;
  dividend: number;
  recordDate: string;
  paymentDate: string;
  declarationDate: string;
}

export interface FmpTreasuryRate {
  date: string;
  month1: number;
  month2: number;
  month3: number;
  month6: number;
  year1: number;
  year2: number;
  year5: number;
  year7: number;
  year10: number;
  year20: number;
  year30: number;
}

export interface FmpEconomicIndicator {
  date: string;
  value: number;
}

export interface FmpTechnicalIndicator {
  date: string;
  value: number;
  // For Bollinger Bands
  upper?: number;
  lower?: number;
  middle?: number;
}

export interface FmpSectorPerformance {
  sector: string;
  changesPercentage: number;
}

export interface FmpGainerLoser {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

export interface FmpMarketHours {
  stockExchangeName: string;
  isTheStockMarketOpen: boolean;
  isTheEuronextMarketOpen: boolean;
  isTheForexMarketOpen: boolean;
  isTheCryptoMarketOpen: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. QUOTES & PRICES
// ═══════════════════════════════════════════════════════════════════════════════

/** Get single quote with automatic symbol mapping */
export async function getQuote(symbol: string): Promise<FmpQuote | null> {
  const mapped = mapToFmpSymbol(symbol);
  const data = await fmpFetch<FmpQuote[]>(`/quote?symbol=${encodeURIComponent(mapped)}`);
  return data?.[0] || null;
}

/** Get multiple quotes efficiently */
export async function getQuotes(symbols: string[]): Promise<Map<string, FmpQuote>> {
  const mapped = symbols.map(s => mapToFmpSymbol(s));
  const unique = [...new Set(mapped)];
  const results = new Map<string, FmpQuote>();
  
  if (unique.length === 0) return results;
  
  // Use batch endpoint for efficiency
  const path = `/batch-quote?symbols=${unique.map(s => encodeURIComponent(s)).join(',')}`;
  const data = await fmpFetch<FmpQuote[]>(path);
  
  if (data) {
    for (const q of data) {
      results.set(q.symbol, q);
    }
  }
  
  return results;
}

/** Get all index quotes */
export async function getAllIndexQuotes(): Promise<FmpQuote[]> {
  const data = await fmpFetch<FmpQuote[]>('/batch-index-quotes');
  return data || [];
}

/** Get all forex quotes */
export async function getAllForexQuotes(): Promise<FmpQuote[]> {
  const data = await fmpFetch<FmpQuote[]>('/batch-forex-quotes');
  return data || [];
}

/** Get all commodity quotes */
export async function getAllCommodityQuotes(): Promise<FmpQuote[]> {
  const data = await fmpFetch<FmpQuote[]>('/batch-commodity-quotes');
  return data || [];
}

/** Get all crypto quotes */
export async function getAllCryptoQuotes(): Promise<FmpQuote[]> {
  const data = await fmpFetch<FmpQuote[]>('/batch-crypto-quotes');
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CHARTS (INTRADAY & EOD)
// ═══════════════════════════════════════════════════════════════════════════════

export type FmpInterval = '1min' | '5min' | '15min' | '30min' | '1hour' | '4hour';

/** Get intraday chart data */
export async function getIntradayChart(
  symbol: string, 
  interval: FmpInterval = '1hour',
  limit = 100
): Promise<FmpCandle[]> {
  const mapped = mapToFmpSymbol(symbol);
  const data = await fmpFetch<FmpCandle[]>(
    `/historical-chart/${interval}?symbol=${encodeURIComponent(mapped)}`
  );
  return data?.slice(0, limit) || [];
}

/** Get EOD (daily) chart data */
export async function getEodChart(
  symbol: string,
  from?: string,
  to?: string,
  limit = 100
): Promise<FmpCandle[]> {
  const mapped = mapToFmpSymbol(symbol);
  let path = `/historical-price-eod/light?symbol=${encodeURIComponent(mapped)}`;
  if (from) path += `&from=${from}`;
  if (to) path += `&to=${to}`;
  
  const data = await fmpFetch<FmpCandle[]>(path);
  return data?.slice(0, limit) || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. COMPANY DATA
// ═══════════════════════════════════════════════════════════════════════════════

/** Get company profile */
export async function getProfile(symbol: string): Promise<FmpProfile | null> {
  const data = await fmpFetch<FmpProfile[]>(`/profile?symbol=${encodeURIComponent(symbol)}`);
  return data?.[0] || null;
}

/** Get key executives */
export async function getKeyExecutives(symbol: string): Promise<Array<{
  name: string;
  title: string;
  pay: number;
  currencyPay: string;
}>> {
  const data = await fmpFetch<any[]>(`/key-executives?symbol=${encodeURIComponent(symbol)}`);
  return data || [];
}

/** Get stock peers (similar companies) */
export async function getStockPeers(symbol: string): Promise<string[]> {
  const data = await fmpFetch<Array<{ peersList: string[] }>>(`/stock-peers?symbol=${encodeURIComponent(symbol)}`);
  return data?.[0]?.peersList || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. FINANCIAL STATEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Get income statement */
export async function getIncomeStatement(
  symbol: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 4
): Promise<any[]> {
  const data = await fmpFetch<any[]>(
    `/income-statement?symbol=${encodeURIComponent(symbol)}&period=${period}&limit=${limit}`
  );
  return data || [];
}

/** Get balance sheet */
export async function getBalanceSheet(
  symbol: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 4
): Promise<any[]> {
  const data = await fmpFetch<any[]>(
    `/balance-sheet-statement?symbol=${encodeURIComponent(symbol)}&period=${period}&limit=${limit}`
  );
  return data || [];
}

/** Get cash flow statement */
export async function getCashFlow(
  symbol: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 4
): Promise<any[]> {
  const data = await fmpFetch<any[]>(
    `/cash-flow-statement?symbol=${encodeURIComponent(symbol)}&period=${period}&limit=${limit}`
  );
  return data || [];
}

/** Get key metrics */
export async function getKeyMetrics(
  symbol: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 4
): Promise<any[]> {
  const data = await fmpFetch<any[]>(
    `/key-metrics?symbol=${encodeURIComponent(symbol)}&period=${period}&limit=${limit}`
  );
  return data || [];
}

/** Get financial ratios */
export async function getRatios(
  symbol: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 4
): Promise<any[]> {
  const data = await fmpFetch<any[]>(
    `/ratios?symbol=${encodeURIComponent(symbol)}&period=${period}&limit=${limit}`
  );
  return data || [];
}

/** Get financial scores (Altman Z-Score, Piotroski, etc.) */
export async function getFinancialScores(symbol: string): Promise<any | null> {
  const data = await fmpFetch<any[]>(`/financial-scores?symbol=${encodeURIComponent(symbol)}`);
  return data?.[0] || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. EARNINGS & DIVIDENDS
// ═══════════════════════════════════════════════════════════════════════════════

/** Get earnings history */
export async function getEarnings(symbol: string, limit = 8): Promise<FmpEarning[]> {
  const data = await fmpFetch<FmpEarning[]>(`/earnings?symbol=${encodeURIComponent(symbol)}`);
  return data?.slice(0, limit) || [];
}

/** Get dividends history */
export async function getDividends(symbol: string): Promise<FmpDividend[]> {
  const data = await fmpFetch<FmpDividend[]>(`/dividends?symbol=${encodeURIComponent(symbol)}`);
  return data || [];
}

/** Get earnings calendar (upcoming) */
export async function getEarningsCalendar(from?: string, to?: string): Promise<any[]> {
  const today = new Date().toISOString().slice(0, 10);
  const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  const data = await fmpFetch<any[]>(
    `/earnings-calendar?from=${from || today}&to=${to || weekLater}`
  );
  return data || [];
}

/** Get dividends calendar (upcoming) */
export async function getDividendsCalendar(from?: string, to?: string): Promise<any[]> {
  const today = new Date().toISOString().slice(0, 10);
  const monthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  const data = await fmpFetch<any[]>(
    `/dividends-calendar?from=${from || today}&to=${to || monthLater}`
  );
  return data || [];
}

/** Get IPO calendar (upcoming) */
export async function getIpoCalendar(from?: string, to?: string): Promise<any[]> {
  const today = new Date().toISOString().slice(0, 10);
  const monthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  const data = await fmpFetch<any[]>(
    `/ipos-calendar?from=${from || today}&to=${to || monthLater}`
  );
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ANALYST DATA
// ═══════════════════════════════════════════════════════════════════════════════

/** Get analyst estimates */
export async function getAnalystEstimates(symbol: string, limit = 4): Promise<any[]> {
  const data = await fmpFetch<any[]>(
    `/analyst-estimates?symbol=${encodeURIComponent(symbol)}&limit=${limit}`
  );
  return data || [];
}

/** Get price target summary */
export async function getPriceTargetSummary(symbol: string): Promise<any | null> {
  const data = await fmpFetch<any>(`/price-target-summary?symbol=${encodeURIComponent(symbol)}`);
  return data || null;
}

/** Get analyst ratings */
export async function getAnalystRatings(symbol: string): Promise<any | null> {
  const data = await fmpFetch<any[]>(`/ratings-snapshot?symbol=${encodeURIComponent(symbol)}`);
  return data?.[0] || null;
}

/** Get upgrade/downgrade history */
export async function getGrades(symbol: string, limit = 10): Promise<any[]> {
  const data = await fmpFetch<any[]>(`/grades?symbol=${encodeURIComponent(symbol)}`);
  return data?.slice(0, limit) || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ECONOMIC DATA (MACRO)
// ═══════════════════════════════════════════════════════════════════════════════

/** Get treasury rates */
export async function getTreasuryRates(days = 30): Promise<FmpTreasuryRate[]> {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  const data = await fmpFetch<FmpTreasuryRate[]>(
    `/treasury-rates?from=${from}&to=${to}`
  );
  return data || [];
}

/** 
 * Get economic indicator data
 * Common indicators: GDP, realGDP, nominalPotentialGDP, realGDPPerCapita,
 * federalFunds, CPI, inflationRate, unemployment, 
 * retailSales, durableGoods, etc.
 */
export async function getEconomicIndicator(
  name: string,
  days = 365
): Promise<FmpEconomicIndicator[]> {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  const data = await fmpFetch<FmpEconomicIndicator[]>(
    `/economic-indicators?name=${encodeURIComponent(name)}&from=${from}&to=${to}`
  );
  return data || [];
}

/** Get economic calendar (scheduled events) */
export async function getEconomicCalendar(from?: string, to?: string): Promise<any[]> {
  const today = new Date().toISOString().slice(0, 10);
  const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  const data = await fmpFetch<any[]>(
    `/economic-calendar?from=${from || today}&to=${to || weekLater}`
  );
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. TECHNICAL INDICATORS
// ═══════════════════════════════════════════════════════════════════════════════

type TechnicalIndicatorType = 'sma' | 'ema' | 'wma' | 'rsi' | 'atr' | 'adx' | 'williams' | 'bollinger' | 'standarddeviation';

/** Get technical indicator data */
export async function getTechnicalIndicator(
  symbol: string,
  type: TechnicalIndicatorType,
  periodLength = 14,
  timeframe = '1day'
): Promise<FmpTechnicalIndicator[]> {
  const mapped = mapToFmpSymbol(symbol);
  const data = await fmpFetch<FmpTechnicalIndicator[]>(
    `/technical-indicators/${type}?symbol=${encodeURIComponent(mapped)}&periodLength=${periodLength}&timeframe=${timeframe}`
  );
  return data || [];
}

/** Convenience: Get RSI */
export async function getRSI(symbol: string, period = 14, timeframe = '1day'): Promise<FmpTechnicalIndicator[]> {
  return getTechnicalIndicator(symbol, 'rsi', period, timeframe);
}

/** Convenience: Get SMA */
export async function getSMA(symbol: string, period = 20, timeframe = '1day'): Promise<FmpTechnicalIndicator[]> {
  return getTechnicalIndicator(symbol, 'sma', period, timeframe);
}

/** Convenience: Get EMA */
export async function getEMA(symbol: string, period = 20, timeframe = '1day'): Promise<FmpTechnicalIndicator[]> {
  return getTechnicalIndicator(symbol, 'ema', period, timeframe);
}

/** Convenience: Get ATR */
export async function getATR(symbol: string, period = 14, timeframe = '1day'): Promise<FmpTechnicalIndicator[]> {
  return getTechnicalIndicator(symbol, 'atr', period, timeframe);
}

/** Convenience: Get Bollinger Bands */
export async function getBollingerBands(symbol: string, period = 20, timeframe = '1day'): Promise<FmpTechnicalIndicator[]> {
  return getTechnicalIndicator(symbol, 'bollinger', period, timeframe);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. MARKET PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════

/** Get sector performance */
export async function getSectorPerformance(): Promise<FmpSectorPerformance[]> {
  const data = await fmpFetch<FmpSectorPerformance[]>('/sector-performance-snapshot');
  return data || [];
}

/** Get biggest gainers */
export async function getBiggestGainers(): Promise<FmpGainerLoser[]> {
  const data = await fmpFetch<FmpGainerLoser[]>('/biggest-gainers');
  return data || [];
}

/** Get biggest losers */
export async function getBiggestLosers(): Promise<FmpGainerLoser[]> {
  const data = await fmpFetch<FmpGainerLoser[]>('/biggest-losers');
  return data || [];
}

/** Get most active stocks */
export async function getMostActive(): Promise<FmpGainerLoser[]> {
  const data = await fmpFetch<FmpGainerLoser[]>('/most-actives');
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. INSIDER & INSTITUTIONAL
// ═══════════════════════════════════════════════════════════════════════════════

/** Get insider trading activity */
export async function getInsiderTrading(symbol: string, limit = 20): Promise<any[]> {
  const data = await fmpFetch<any[]>(`/insider-trading/search?symbol=${encodeURIComponent(symbol)}`);
  return data?.slice(0, limit) || [];
}

/** Get insider trading statistics */
export async function getInsiderStats(symbol: string): Promise<any | null> {
  const data = await fmpFetch<any>(`/insider-trading/statistics?symbol=${encodeURIComponent(symbol)}`);
  return data || null;
}

/** Get institutional ownership */
export async function getInstitutionalOwnership(symbol: string): Promise<any[]> {
  const data = await fmpFetch<any[]>(`/institutional-ownership/symbol-positions-summary?symbol=${encodeURIComponent(symbol)}`);
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. INDEX CONSTITUENTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Get S&P 500 constituents */
export async function getSP500Constituents(): Promise<Array<{ symbol: string; name: string; sector: string }>> {
  const data = await fmpFetch<any[]>('/sp500-constituent');
  return data || [];
}

/** Get Nasdaq 100 constituents */
export async function getNasdaq100Constituents(): Promise<Array<{ symbol: string; name: string; sector: string }>> {
  const data = await fmpFetch<any[]>('/nasdaq-constituent');
  return data || [];
}

/** Get Dow Jones constituents */
export async function getDowJonesConstituents(): Promise<Array<{ symbol: string; name: string; sector: string }>> {
  const data = await fmpFetch<any[]>('/dow-jones-constituent');
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. ETF DATA
// ═══════════════════════════════════════════════════════════════════════════════

/** Get ETF holdings */
export async function getEtfHoldings(symbol: string): Promise<any[]> {
  const data = await fmpFetch<any[]>(`/etf/holdings?symbol=${encodeURIComponent(symbol)}`);
  return data || [];
}

/** Get ETF info */
export async function getEtfInfo(symbol: string): Promise<any | null> {
  const data = await fmpFetch<any[]>(`/etf/info?symbol=${encodeURIComponent(symbol)}`);
  return data?.[0] || null;
}

/** Get ETF sector weightings */
export async function getEtfSectorWeightings(symbol: string): Promise<any[]> {
  const data = await fmpFetch<any[]>(`/etf/sector-weightings?symbol=${encodeURIComponent(symbol)}`);
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. NEWS
// ═══════════════════════════════════════════════════════════════════════════════

/** Get stock news */
export async function getStockNews(symbol: string, limit = 20): Promise<any[]> {
  const data = await fmpFetch<any[]>(`/news/stock?symbols=${encodeURIComponent(symbol)}&limit=${limit}`);
  return data || [];
}

/** Get general market news */
export async function getGeneralNews(limit = 20): Promise<any[]> {
  const data = await fmpFetch<any[]>(`/news/general-latest?limit=${limit}`);
  return data || [];
}

/** Get forex news */
export async function getForexNews(limit = 20): Promise<any[]> {
  const data = await fmpFetch<any[]>(`/news/forex-latest?limit=${limit}`);
  return data || [];
}

/** Get crypto news */
export async function getCryptoNews(limit = 20): Promise<any[]> {
  const data = await fmpFetch<any[]>(`/news/crypto-latest?limit=${limit}`);
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. MARKET STATUS
// ═══════════════════════════════════════════════════════════════════════════════

/** Get market hours/status */
export async function getMarketHours(): Promise<FmpMarketHours | null> {
  const data = await fmpFetch<FmpMarketHours>('/is-market-open');
  return data || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 15. COMPREHENSIVE SNAPSHOTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get comprehensive market snapshot for analysis.
 * Fetches key indices, commodities, and forex in one call.
 */
export async function getMarketSnapshot(): Promise<{
  indices: FmpQuote[];
  commodities: FmpQuote[];
  forex: FmpQuote[];
  treasuryRates: FmpTreasuryRate[];
  sectorPerformance: FmpSectorPerformance[];
  gainers: FmpGainerLoser[];
  losers: FmpGainerLoser[];
  timestamp: string;
}> {
  const [indices, commodities, forex, treasury, sectors, gainers, losers] = await Promise.all([
    getAllIndexQuotes(),
    getAllCommodityQuotes(),
    getAllForexQuotes(),
    getTreasuryRates(5),
    getSectorPerformance(),
    getBiggestGainers(),
    getBiggestLosers(),
  ]);
  
  return {
    indices,
    commodities,
    forex,
    treasuryRates: treasury,
    sectorPerformance: sectors,
    gainers: gainers.slice(0, 10),
    losers: losers.slice(0, 10),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get comprehensive stock analysis data.
 */
export async function getStockAnalysis(symbol: string): Promise<{
  quote: FmpQuote | null;
  profile: FmpProfile | null;
  keyMetrics: any[];
  ratios: any[];
  earnings: FmpEarning[];
  estimates: any[];
  priceTarget: any | null;
  insiderStats: any | null;
  technicals: {
    rsi: FmpTechnicalIndicator[];
    sma20: FmpTechnicalIndicator[];
    sma50: FmpTechnicalIndicator[];
  };
  timestamp: string;
}> {
  const [quote, profile, keyMetrics, ratios, earnings, estimates, priceTarget, insiderStats, rsi, sma20, sma50] = 
    await Promise.all([
      getQuote(symbol),
      getProfile(symbol),
      getKeyMetrics(symbol, 'annual', 2),
      getRatios(symbol, 'annual', 2),
      getEarnings(symbol, 4),
      getAnalystEstimates(symbol, 2),
      getPriceTargetSummary(symbol),
      getInsiderStats(symbol),
      getRSI(symbol, 14, '1day'),
      getSMA(symbol, 20, '1day'),
      getSMA(symbol, 50, '1day'),
    ]);
  
  return {
    quote,
    profile,
    keyMetrics,
    ratios,
    earnings,
    estimates,
    priceTarget,
    insiderStats,
    technicals: {
      rsi: rsi.slice(0, 5),
      sma20: sma20.slice(0, 5),
      sma50: sma50.slice(0, 5),
    },
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const FmpService = {
  // Symbol mapping
  mapToFmpSymbol,
  
  // Quotes
  getQuote,
  getQuotes,
  getAllIndexQuotes,
  getAllForexQuotes,
  getAllCommodityQuotes,
  getAllCryptoQuotes,
  
  // Charts
  getIntradayChart,
  getEodChart,
  
  // Company
  getProfile,
  getKeyExecutives,
  getStockPeers,
  
  // Financials
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getKeyMetrics,
  getRatios,
  getFinancialScores,
  
  // Earnings & Dividends
  getEarnings,
  getDividends,
  getEarningsCalendar,
  getDividendsCalendar,
  getIpoCalendar,
  
  // Analyst
  getAnalystEstimates,
  getPriceTargetSummary,
  getAnalystRatings,
  getGrades,
  
  // Economic
  getTreasuryRates,
  getEconomicIndicator,
  getEconomicCalendar,
  
  // Technical
  getTechnicalIndicator,
  getRSI,
  getSMA,
  getEMA,
  getATR,
  getBollingerBands,
  
  // Market Performance
  getSectorPerformance,
  getBiggestGainers,
  getBiggestLosers,
  getMostActive,
  
  // Insider & Institutional
  getInsiderTrading,
  getInsiderStats,
  getInstitutionalOwnership,
  
  // Index Constituents
  getSP500Constituents,
  getNasdaq100Constituents,
  getDowJonesConstituents,
  
  // ETF
  getEtfHoldings,
  getEtfInfo,
  getEtfSectorWeightings,
  
  // News
  getStockNews,
  getGeneralNews,
  getForexNews,
  getCryptoNews,
  
  // Market Status
  getMarketHours,
  
  // Comprehensive
  getMarketSnapshot,
  getStockAnalysis,
};

export default FmpService;
