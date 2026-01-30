/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏢 COMPANY FUNDAMENTALS DATA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Company-level data for stock analysis:
 * - Earnings (EPS, revenue, guidance)
 * - Balance sheet metrics (debt, cash)
 * - Valuation ratios (P/E, P/S)
 * - Upcoming events (earnings dates)
 * 
 * Sources: Finnhub (free tier), Yahoo Finance
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface EarningsData {
  symbol: string;
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  epsSurprise: number | null;
  epsSurprisePercent: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  revenueSurprise: number | null;
}

export interface EarningsCalendar {
  symbol: string;
  date: string;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  hour: 'bmo' | 'amc' | 'tbd'; // before market open / after market close
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  employees: number;
  website: string;
  country: string;
  exchange: string;
  ipo: string;
  logo: string;
}

export interface KeyMetrics {
  symbol: string;
  marketCap: number;
  peRatio: number;
  forwardPE: number;
  pegRatio: number;
  psRatio: number;
  pbRatio: number;
  evToEbitda: number;
  dividendYield: number;
  beta: number;
  eps: number;
  revenue: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  roe: number;
  roa: number;
  debtToEquity: number;
  currentRatio: number;
  freeCashFlow: number;
}

export interface FundamentalSnapshot {
  profile: CompanyProfile | null;
  metrics: KeyMetrics | null;
  lastEarnings: EarningsData | null;
  nextEarnings: EarningsCalendar | null;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINNHUB API - COMPANY PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.error('FINNHUB_API_KEY not configured');
    return null;
  }
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data || !data.name) return null;
    
    return {
      symbol: data.ticker || symbol,
      name: data.name,
      sector: data.finnhubIndustry || '',
      industry: data.finnhubIndustry || '',
      marketCap: data.marketCapitalization || 0,
      employees: data.employeeTotal || 0,
      website: data.weburl || '',
      country: data.country || '',
      exchange: data.exchange || '',
      ipo: data.ipo || '',
      logo: data.logo || ''
    };
  } catch (error) {
    console.error('Company profile fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINNHUB API - KEY METRICS
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchKeyMetrics(symbol: string): Promise<KeyMetrics | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const m = data.metric || {};
    
    return {
      symbol,
      marketCap: m.marketCapitalization || 0,
      peRatio: m.peBasicExclExtraTTM || 0,
      forwardPE: m.peExclExtraAnnual || 0,
      pegRatio: m.pegRatio || 0,
      psRatio: m.psTTM || 0,
      pbRatio: m.pbQuarterly || 0,
      evToEbitda: m.enterpriseValueEbitdaTTM || 0,
      dividendYield: m.dividendYieldIndicatedAnnual || 0,
      beta: m.beta || 1,
      eps: m.epsBasicExclExtraItemsAnnual || 0,
      revenue: m.revenuePerShareAnnual || 0,
      grossMargin: m.grossMargin5Y || 0,
      operatingMargin: m.operatingMargin5Y || 0,
      netMargin: m.netProfitMargin5Y || 0,
      roe: m.roeRfy || 0,
      roa: m.roaRfy || 0,
      debtToEquity: m.totalDebtToEquityQuarterly || 0,
      currentRatio: m.currentRatioQuarterly || 0,
      freeCashFlow: m.freeCashFlowAnnual || 0
    };
  } catch (error) {
    console.error('Key metrics fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINNHUB API - EARNINGS HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchEarningsHistory(symbol: string, limit: number = 4): Promise<EarningsData[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/earnings?symbol=${symbol}&token=${apiKey}`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (!Array.isArray(data)) return [];
    
    return data.slice(0, limit).map((e: Record<string, unknown>) => ({
      symbol,
      date: (e.period as string) || '',
      epsActual: (e.actual as number) || null,
      epsEstimate: (e.estimate as number) || null,
      epsSurprise: (e.surprise as number) || null,
      epsSurprisePercent: (e.surprisePercent as number) || null,
      revenueActual: null,
      revenueEstimate: null,
      revenueSurprise: null
    }));
  } catch (error) {
    console.error('Earnings history fetch error:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINNHUB API - EARNINGS CALENDAR (Upcoming)
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchEarningsCalendar(
  symbol?: string,
  from?: string,
  to?: string
): Promise<EarningsCalendar[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  
  try {
    // Get date range (next 30 days if not specified)
    const fromDate = from || new Date().toISOString().split('T')[0];
    const toDate = to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let url = `https://finnhub.io/api/v1/calendar/earnings?from=${fromDate}&to=${toDate}&token=${apiKey}`;
    if (symbol) {
      url += `&symbol=${symbol}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    const earnings = data.earningsCalendar || [];
    
    return earnings.map((e: Record<string, unknown>) => ({
      symbol: (e.symbol as string) || '',
      date: (e.date as string) || '',
      epsEstimate: (e.epsEstimate as number) || null,
      revenueEstimate: (e.revenueEstimate as number) || null,
      hour: (e.hour as 'bmo' | 'amc' | 'tbd') || 'tbd'
    }));
  } catch (error) {
    console.error('Earnings calendar fetch error:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// YAHOO FINANCE - SUPPLEMENTARY DATA
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchYahooKeyStats(symbol: string): Promise<Partial<KeyMetrics> | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=defaultKeyStatistics,financialData`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const stats = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics || {};
    const financial = data?.quoteSummary?.result?.[0]?.financialData || {};
    
    return {
      symbol,
      peRatio: stats.trailingPE?.raw || 0,
      forwardPE: stats.forwardPE?.raw || 0,
      pegRatio: stats.pegRatio?.raw || 0,
      pbRatio: stats.priceToBook?.raw || 0,
      beta: stats.beta?.raw || 1,
      eps: stats.trailingEps?.raw || 0,
      grossMargin: (financial.grossMargins?.raw || 0) * 100,
      operatingMargin: (financial.operatingMargins?.raw || 0) * 100,
      netMargin: (financial.profitMargins?.raw || 0) * 100,
      roe: (financial.returnOnEquity?.raw || 0) * 100,
      roa: (financial.returnOnAssets?.raw || 0) * 100,
      debtToEquity: financial.debtToEquity?.raw || 0,
      currentRatio: financial.currentRatio?.raw || 0,
      freeCashFlow: financial.freeCashflow?.raw || 0
    };
  } catch (error) {
    console.error('Yahoo key stats fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYST RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnalystRecommendation {
  symbol: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  period: string;
  consensus: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
}

export async function fetchAnalystRecommendations(symbol: string): Promise<AnalystRecommendation[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${apiKey}`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (!Array.isArray(data)) return [];
    
    return data.slice(0, 4).map((r: Record<string, number | string>) => {
      const total = (r.strongBuy as number) + (r.buy as number) + (r.hold as number) + (r.sell as number) + (r.strongSell as number);
      const buyPct = ((r.strongBuy as number) + (r.buy as number)) / total;
      const sellPct = ((r.sell as number) + (r.strongSell as number)) / total;
      
      let consensus: AnalystRecommendation['consensus'];
      if (buyPct > 0.6) consensus = (r.strongBuy as number) > (r.buy as number) ? 'Strong Buy' : 'Buy';
      else if (sellPct > 0.4) consensus = (r.strongSell as number) > (r.sell as number) ? 'Strong Sell' : 'Sell';
      else consensus = 'Hold';
      
      return {
        symbol,
        strongBuy: r.strongBuy as number,
        buy: r.buy as number,
        hold: r.hold as number,
        sell: r.sell as number,
        strongSell: r.strongSell as number,
        period: r.period as string,
        consensus
      };
    });
  } catch (error) {
    console.error('Analyst recommendations fetch error:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE TARGETS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PriceTarget {
  symbol: string;
  high: number;
  low: number;
  mean: number;
  median: number;
  numberOfAnalysts: number;
  currentPrice: number;
  upsidePercent: number;
}

export async function fetchPriceTarget(symbol: string): Promise<PriceTarget | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  
  try {
    // Fetch price target
    const targetResponse = await fetch(
      `https://finnhub.io/api/v1/stock/price-target?symbol=${symbol}&token=${apiKey}`
    );
    
    if (!targetResponse.ok) return null;
    
    const targetData = await targetResponse.json();
    
    // Fetch current price
    const quoteResponse = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
    );
    
    let currentPrice = 0;
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      currentPrice = quoteData.c || 0;
    }
    
    const mean = targetData.targetMean || 0;
    const upsidePercent = currentPrice > 0 ? ((mean - currentPrice) / currentPrice) * 100 : 0;
    
    return {
      symbol,
      high: targetData.targetHigh || 0,
      low: targetData.targetLow || 0,
      mean,
      median: targetData.targetMedian || 0,
      numberOfAnalysts: targetData.lastUpdated ? 1 : 0,
      currentPrice,
      upsidePercent
    };
  } catch (error) {
    console.error('Price target fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE FUNDAMENTAL SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchFundamentalSnapshot(symbol: string): Promise<FundamentalSnapshot> {
  const [profile, metrics, earningsHistory, upcomingEarnings] = await Promise.all([
    fetchCompanyProfile(symbol),
    fetchKeyMetrics(symbol),
    fetchEarningsHistory(symbol, 1),
    fetchEarningsCalendar(symbol)
  ]);
  
  return {
    profile,
    metrics,
    lastEarnings: earningsHistory[0] || null,
    nextEarnings: upcomingEarnings.find(e => e.symbol === symbol) || null,
    timestamp: Date.now()
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

export interface SectorPeers {
  symbol: string;
  sector: string;
  peers: string[];
}

export async function fetchSectorPeers(symbol: string): Promise<SectorPeers | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  
  try {
    const [profileResponse, peersResponse] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/stock/peers?symbol=${symbol}&token=${apiKey}`)
    ]);
    
    let sector = '';
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      sector = profileData.finnhubIndustry || '';
    }
    
    let peers: string[] = [];
    if (peersResponse.ok) {
      const peersData = await peersResponse.json();
      if (Array.isArray(peersData)) {
        peers = peersData.filter((p: string) => p !== symbol).slice(0, 10);
      }
    }
    
    return { symbol, sector, peers };
  } catch (error) {
    console.error('Sector peers fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH FUNDAMENTALS (Multiple Symbols)
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchMultipleFundamentals(
  symbols: string[]
): Promise<Map<string, FundamentalSnapshot>> {
  const results = new Map<string, FundamentalSnapshot>();
  
  // Process in parallel with concurrency limit
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(symbol => fetchFundamentalSnapshot(symbol))
    );
    
    batch.forEach((symbol, index) => {
      results.set(symbol, batchResults[index]);
    });
    
    // Rate limiting pause
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINNHUB API - SEC FILINGS (Financials Reported)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SECFiling {
  symbol: string;
  form: string; // "10-K", "10-Q", etc.
  filedDate: string;
  acceptedDate: string;
  reportDate: string;
  year: number;
  quarter: number;
}

export async function fetchSECFilings(symbol: string, limit: number = 10): Promise<SECFiling[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/financials-reported?symbol=${symbol}&token=${apiKey}`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const reports = data.data || [];
    
    return reports.slice(0, limit).map((r: Record<string, unknown>) => ({
      symbol: (r.symbol as string) || symbol,
      form: (r.form as string) || '',
      filedDate: (r.filedDate as string) || '',
      acceptedDate: (r.acceptedDate as string) || '',
      reportDate: (r.startDate as string) || '',
      year: (r.year as number) || 0,
      quarter: (r.quarter as number) || 0
    }));
  } catch (error) {
    console.error('SEC filings fetch error:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINNHUB API - RECOMMENDATION TRENDS
// ═══════════════════════════════════════════════════════════════════════════════

export interface RecommendationTrend {
  symbol: string;
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export async function fetchRecommendationTrends(symbol: string): Promise<RecommendationTrend[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${apiKey}`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (!Array.isArray(data)) return [];
    
    return data.slice(0, 12).map((r: Record<string, unknown>) => ({
      symbol,
      period: (r.period as string) || '',
      strongBuy: (r.strongBuy as number) || 0,
      buy: (r.buy as number) || 0,
      hold: (r.hold as number) || 0,
      sell: (r.sell as number) || 0,
      strongSell: (r.strongSell as number) || 0
    }));
  } catch (error) {
    console.error('Recommendation trends fetch error:', error);
    return [];
  }
}
