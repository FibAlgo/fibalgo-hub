/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ FRED API - Federal Reserve Economic Data
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Makroekonomik veriler:
 * - CPI, PCE (Inflation)
 * - GDP, Unemployment
 * - Fed Funds Rate, Treasury Yields
 * - Money Supply, Consumer Confidence
 * 
 * API Key: https://fred.stlouisfed.org/docs/api/api_key.html (FREE)
 * Rate Limit: 120 requests/minute
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FRED SERIES IDs
// ═══════════════════════════════════════════════════════════════════════════════

export const FRED_SERIES = {
  // Inflation
  CPI: 'CPIAUCSL',           // Consumer Price Index
  CPI_CORE: 'CPILFESL',      // Core CPI (ex food & energy)
  PCE: 'PCEPI',              // Personal Consumption Expenditures
  PCE_CORE: 'PCEPILFE',      // Core PCE (Fed's preferred)
  PPI: 'PPIACO',             // Producer Price Index
  
  // Employment
  UNEMPLOYMENT: 'UNRATE',     // Unemployment Rate
  NONFARM_PAYROLLS: 'PAYEMS', // Total Nonfarm Payrolls
  INITIAL_CLAIMS: 'ICSA',     // Initial Jobless Claims
  CONTINUING_CLAIMS: 'CCSA',  // Continuing Claims
  
  // GDP & Growth
  GDP: 'GDP',                 // Nominal GDP
  REAL_GDP: 'GDPC1',          // Real GDP
  GDP_GROWTH: 'A191RL1Q225SBEA', // Real GDP Growth Rate
  
  // Interest Rates
  FED_FUNDS: 'FEDFUNDS',      // Effective Fed Funds Rate
  FED_FUNDS_TARGET: 'DFEDTARU', // Fed Funds Target Upper
  PRIME_RATE: 'DPRIME',       // Bank Prime Loan Rate
  
  // Treasury Yields
  T3M: 'DGS3MO',              // 3-Month Treasury
  T2Y: 'DGS2',                // 2-Year Treasury
  T5Y: 'DGS5',                // 5-Year Treasury
  T10Y: 'DGS10',              // 10-Year Treasury
  T30Y: 'DGS30',              // 30-Year Treasury
  
  // Yield Curve
  YIELD_SPREAD_10Y2Y: 'T10Y2Y', // 10Y-2Y Spread
  YIELD_SPREAD_10Y3M: 'T10Y3M', // 10Y-3M Spread
  
  // Money Supply
  M1: 'M1SL',                 // M1 Money Supply
  M2: 'M2SL',                 // M2 Money Supply
  
  // Consumer & Business
  CONSUMER_SENTIMENT: 'UMCSENT', // U of Michigan Consumer Sentiment
  RETAIL_SALES: 'RSXFS',      // Retail Sales
  INDUSTRIAL_PRODUCTION: 'INDPRO', // Industrial Production
  
  // Housing
  HOUSING_STARTS: 'HOUST',    // Housing Starts
  EXISTING_HOME_SALES: 'EXHOSLUSM495S',
  CASE_SHILLER: 'CSUSHPISA',  // Case-Shiller Home Price Index
  
  // Dollar & Commodities
  TRADE_WEIGHTED_DOLLAR: 'DTWEXBGS', // Trade Weighted Dollar
  GOLD_PRICE: 'GOLDAMGBD228NLBM',
  OIL_PRICE: 'DCOILWTICO',    // WTI Crude
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface FREDDataPoint {
  date: string;
  value: number;
}

export interface FREDSeriesInfo {
  id: string;
  title: string;
  frequency: string;
  units: string;
  lastUpdated: string;
}

export interface FREDResponse {
  series: FREDSeriesInfo;
  observations: FREDDataPoint[];
}

export interface InflationData {
  cpi: { current: number; yoy: number; mom: number };
  coreCpi: { current: number; yoy: number };
  pce: { current: number; yoy: number };
  corePce: { current: number; yoy: number };
  trend: 'rising' | 'falling' | 'stable';
  lastUpdated: string;
}

export interface EmploymentData {
  unemploymentRate: number;
  nonfarmPayrolls: number;
  payrollsChange: number;
  initialClaims: number;
  initialClaimsChange: number;
  trend: 'strengthening' | 'weakening' | 'stable';
  lastUpdated: string;
}

export interface InterestRateData {
  fedFunds: number;
  fedFundsTarget: number;
  t2y: number;
  t10y: number;
  t30y: number;
  yieldSpread10y2y: number;
  curveStatus: 'normal' | 'flat' | 'inverted';
  lastUpdated: string;
}

export interface MacroSnapshot {
  inflation: InflationData;
  employment: EmploymentData;
  interestRates: InterestRateData;
  gdp: { value: number; growth: number };
  consumerSentiment: number;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRED API CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';

/**
 * Fetch data for a single FRED series
 */
export async function fetchFREDSeries(
  seriesId: string,
  options: {
    limit?: number;
    sortOrder?: 'asc' | 'desc';
    observationStart?: string;
    observationEnd?: string;
  } = {}
): Promise<FREDDataPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  
  if (!apiKey) {
    console.warn('FRED_API_KEY not configured - using fallback data');
    return [];
  }
  
  try {
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: apiKey,
      file_type: 'json',
      sort_order: options.sortOrder || 'desc',
      limit: String(options.limit || 10)
    });
    
    if (options.observationStart) {
      params.append('observation_start', options.observationStart);
    }
    if (options.observationEnd) {
      params.append('observation_end', options.observationEnd);
    }
    
    const response = await fetch(
      `${FRED_BASE_URL}/series/observations?${params}`
    );
    
    if (!response.ok) {
      console.error(`FRED API error for ${seriesId}:`, response.statusText);
      return [];
    }
    
    const data = await response.json();
    
    return (data.observations || [])
      .filter((obs: { value: string }) => obs.value !== '.')
      .map((obs: { date: string; value: string }) => ({
        date: obs.date,
        value: parseFloat(obs.value)
      }));
  } catch (error) {
    console.error(`FRED fetch error for ${seriesId}:`, error);
    return [];
  }
}

/**
 * Fetch series metadata
 */
export async function fetchFREDSeriesInfo(seriesId: string): Promise<FREDSeriesInfo | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;
  
  try {
    const response = await fetch(
      `${FRED_BASE_URL}/series?series_id=${seriesId}&api_key=${apiKey}&file_type=json`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const series = data.seriess?.[0];
    
    if (!series) return null;
    
    return {
      id: series.id,
      title: series.title,
      frequency: series.frequency,
      units: series.units,
      lastUpdated: series.last_updated
    };
  } catch {
    return null;
  }
}

/**
 * Fetch multiple series in parallel
 */
export async function fetchMultipleFREDSeries(
  seriesIds: string[],
  limit: number = 5
): Promise<Map<string, FREDDataPoint[]>> {
  const results = new Map<string, FREDDataPoint[]>();
  
  const batchSize = 10; // FRED rate limit friendly
  for (let i = 0; i < seriesIds.length; i += batchSize) {
    const batch = seriesIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(id => fetchFREDSeries(id, { limit }))
    );
    
    batch.forEach((id, index) => {
      results.set(id, batchResults[index]);
    });
    
    // Small delay between batches
    if (i + batchSize < seriesIds.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIGH-LEVEL DATA FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch inflation indicators
 */
export async function fetchInflationData(): Promise<InflationData> {
  const series = await fetchMultipleFREDSeries([
    FRED_SERIES.CPI,
    FRED_SERIES.CPI_CORE,
    FRED_SERIES.PCE,
    FRED_SERIES.PCE_CORE
  ], 13); // 13 months for YoY
  
  const cpiData = series.get(FRED_SERIES.CPI) || [];
  const coreCpiData = series.get(FRED_SERIES.CPI_CORE) || [];
  const pceData = series.get(FRED_SERIES.PCE) || [];
  const corePceData = series.get(FRED_SERIES.PCE_CORE) || [];
  
  const calcYoY = (data: FREDDataPoint[]): number => {
    if (data.length < 13) return 0;
    return ((data[0].value - data[12].value) / data[12].value) * 100;
  };
  
  const calcMoM = (data: FREDDataPoint[]): number => {
    if (data.length < 2) return 0;
    return ((data[0].value - data[1].value) / data[1].value) * 100;
  };
  
  const cpiYoY = calcYoY(cpiData);
  const prevCpiYoY = cpiData.length > 1 ? calcYoY(cpiData.slice(1)) : cpiYoY;
  
  let trend: InflationData['trend'];
  if (cpiYoY < prevCpiYoY - 0.2) trend = 'falling';
  else if (cpiYoY > prevCpiYoY + 0.2) trend = 'rising';
  else trend = 'stable';
  
  return {
    cpi: {
      current: cpiData[0]?.value || 0,
      yoy: cpiYoY,
      mom: calcMoM(cpiData)
    },
    coreCpi: {
      current: coreCpiData[0]?.value || 0,
      yoy: calcYoY(coreCpiData)
    },
    pce: {
      current: pceData[0]?.value || 0,
      yoy: calcYoY(pceData)
    },
    corePce: {
      current: corePceData[0]?.value || 0,
      yoy: calcYoY(corePceData)
    },
    trend,
    lastUpdated: cpiData[0]?.date || ''
  };
}

/**
 * Fetch employment data
 */
export async function fetchEmploymentData(): Promise<EmploymentData> {
  const series = await fetchMultipleFREDSeries([
    FRED_SERIES.UNEMPLOYMENT,
    FRED_SERIES.NONFARM_PAYROLLS,
    FRED_SERIES.INITIAL_CLAIMS
  ], 3);
  
  const unemployment = series.get(FRED_SERIES.UNEMPLOYMENT) || [];
  const payrolls = series.get(FRED_SERIES.NONFARM_PAYROLLS) || [];
  const claims = series.get(FRED_SERIES.INITIAL_CLAIMS) || [];
  
  const unemploymentRate = unemployment[0]?.value || 0;
  const payrollsChange = payrolls.length >= 2 
    ? payrolls[0].value - payrolls[1].value 
    : 0;
  const claimsChange = claims.length >= 2
    ? claims[0].value - claims[1].value
    : 0;
  
  let trend: EmploymentData['trend'];
  if (payrollsChange > 100 && claimsChange < 0) trend = 'strengthening';
  else if (payrollsChange < 0 || claimsChange > 50000) trend = 'weakening';
  else trend = 'stable';
  
  return {
    unemploymentRate,
    nonfarmPayrolls: payrolls[0]?.value || 0,
    payrollsChange,
    initialClaims: claims[0]?.value || 0,
    initialClaimsChange: claimsChange,
    trend,
    lastUpdated: unemployment[0]?.date || ''
  };
}

/**
 * Fetch interest rate data
 */
export async function fetchInterestRateData(): Promise<InterestRateData> {
  const series = await fetchMultipleFREDSeries([
    FRED_SERIES.FED_FUNDS,
    FRED_SERIES.FED_FUNDS_TARGET,
    FRED_SERIES.T2Y,
    FRED_SERIES.T10Y,
    FRED_SERIES.T30Y,
    FRED_SERIES.YIELD_SPREAD_10Y2Y
  ], 1);
  
  const fedFunds = series.get(FRED_SERIES.FED_FUNDS)?.[0]?.value || 0;
  const target = series.get(FRED_SERIES.FED_FUNDS_TARGET)?.[0]?.value || 0;
  const t2y = series.get(FRED_SERIES.T2Y)?.[0]?.value || 0;
  const t10y = series.get(FRED_SERIES.T10Y)?.[0]?.value || 0;
  const t30y = series.get(FRED_SERIES.T30Y)?.[0]?.value || 0;
  const spread = series.get(FRED_SERIES.YIELD_SPREAD_10Y2Y)?.[0]?.value || t10y - t2y;
  
  let curveStatus: InterestRateData['curveStatus'];
  if (spread < -0.2) curveStatus = 'inverted';
  else if (spread < 0.5) curveStatus = 'flat';
  else curveStatus = 'normal';
  
  return {
    fedFunds,
    fedFundsTarget: target,
    t2y,
    t10y,
    t30y,
    yieldSpread10y2y: spread,
    curveStatus,
    lastUpdated: new Date().toISOString().split('T')[0]
  };
}

/**
 * Fetch GDP data
 */
export async function fetchGDPData(): Promise<{ value: number; growth: number }> {
  const series = await fetchMultipleFREDSeries([
    FRED_SERIES.REAL_GDP,
    FRED_SERIES.GDP_GROWTH
  ], 2);
  
  const gdp = series.get(FRED_SERIES.REAL_GDP)?.[0]?.value || 0;
  const growth = series.get(FRED_SERIES.GDP_GROWTH)?.[0]?.value || 0;
  
  return { value: gdp, growth };
}

/**
 * Fetch consumer sentiment
 */
export async function fetchConsumerSentiment(): Promise<number> {
  const data = await fetchFREDSeries(FRED_SERIES.CONSUMER_SENTIMENT, { limit: 1 });
  return data[0]?.value || 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE MACRO SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch complete macroeconomic snapshot
 */
export async function fetchFREDMacroSnapshot(): Promise<MacroSnapshot> {
  const [inflation, employment, interestRates, gdp, sentiment] = await Promise.all([
    fetchInflationData(),
    fetchEmploymentData(),
    fetchInterestRateData(),
    fetchGDPData(),
    fetchConsumerSentiment()
  ]);
  
  return {
    inflation,
    employment,
    interestRates,
    gdp,
    consumerSentiment: sentiment,
    timestamp: Date.now()
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ECONOMIC CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════

export interface EconomicRelease {
  seriesId: string;
  name: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  importance: 'high' | 'medium' | 'low';
  lastRelease: string;
  lastValue: number;
  previousValue: number;
}

export async function fetchUpcomingReleases(): Promise<EconomicRelease[]> {
  const importantSeries = [
    { id: FRED_SERIES.CPI, name: 'CPI', freq: 'monthly' as const, importance: 'high' as const },
    { id: FRED_SERIES.UNEMPLOYMENT, name: 'Unemployment Rate', freq: 'monthly' as const, importance: 'high' as const },
    { id: FRED_SERIES.NONFARM_PAYROLLS, name: 'Nonfarm Payrolls', freq: 'monthly' as const, importance: 'high' as const },
    { id: FRED_SERIES.PCE_CORE, name: 'Core PCE', freq: 'monthly' as const, importance: 'high' as const },
    { id: FRED_SERIES.INITIAL_CLAIMS, name: 'Initial Jobless Claims', freq: 'weekly' as const, importance: 'medium' as const },
    { id: FRED_SERIES.RETAIL_SALES, name: 'Retail Sales', freq: 'monthly' as const, importance: 'medium' as const },
    { id: FRED_SERIES.CONSUMER_SENTIMENT, name: 'Consumer Sentiment', freq: 'monthly' as const, importance: 'medium' as const },
    { id: FRED_SERIES.REAL_GDP, name: 'Real GDP', freq: 'quarterly' as const, importance: 'high' as const },
  ];
  
  const results: EconomicRelease[] = [];
  
  for (const series of importantSeries) {
    const data = await fetchFREDSeries(series.id, { limit: 2 });
    
    if (data.length >= 2) {
      results.push({
        seriesId: series.id,
        name: series.name,
        frequency: series.freq,
        importance: series.importance,
        lastRelease: data[0].date,
        lastValue: data[0].value,
        previousValue: data[1].value
      });
    }
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT FOR AI
// ═══════════════════════════════════════════════════════════════════════════════

export function formatMacroForAI(snapshot: MacroSnapshot): string {
  const { inflation, employment, interestRates, gdp, consumerSentiment } = snapshot;
  
  let text = '## Macroeconomic Conditions\n\n';
  
  // Inflation
  text += '### Inflation\n';
  text += `- CPI YoY: ${inflation.cpi.yoy.toFixed(1)}% (${inflation.trend})\n`;
  text += `- Core CPI YoY: ${inflation.coreCpi.yoy.toFixed(1)}%\n`;
  text += `- Core PCE YoY: ${inflation.corePce.yoy.toFixed(1)}% (Fed target: 2%)\n\n`;
  
  // Employment
  text += '### Employment\n';
  text += `- Unemployment Rate: ${employment.unemploymentRate.toFixed(1)}%\n`;
  text += `- Payrolls Change: ${employment.payrollsChange > 0 ? '+' : ''}${(employment.payrollsChange / 1000).toFixed(0)}K\n`;
  text += `- Initial Claims: ${(employment.initialClaims / 1000).toFixed(0)}K (${employment.trend})\n\n`;
  
  // Interest Rates
  text += '### Interest Rates\n';
  text += `- Fed Funds Rate: ${interestRates.fedFunds.toFixed(2)}%\n`;
  text += `- 2Y Treasury: ${interestRates.t2y.toFixed(2)}%\n`;
  text += `- 10Y Treasury: ${interestRates.t10y.toFixed(2)}%\n`;
  text += `- 10Y-2Y Spread: ${interestRates.yieldSpread10y2y.toFixed(2)}% (${interestRates.curveStatus})\n\n`;
  
  // GDP & Sentiment
  text += '### Growth & Sentiment\n';
  text += `- Real GDP Growth: ${gdp.growth.toFixed(1)}%\n`;
  text += `- Consumer Sentiment: ${consumerSentiment.toFixed(1)}\n`;
  
  return text;
}
