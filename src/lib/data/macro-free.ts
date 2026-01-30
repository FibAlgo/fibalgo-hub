/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌐 FREE MACRO DATA - API Key Gerektirmeyen Makro Veriler
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * FRED alternatifi olarak ücretsiz kaynaklar:
 * - Yahoo Finance (Treasury yields, market data)
 * - World Bank API (GDP, unemployment - tarihsel)
 * - Treasury Direct (ABD devlet tahvil verileri)
 * 
 * Hiçbir API key gerektirmez!
 */

// ═══════════════════════════════════════════════════════════════════════════════
// YAHOO FINANCE - TREASURY & MACRO ETFs
// ═══════════════════════════════════════════════════════════════════════════════

const YAHOO_MACRO_SYMBOLS = {
  // Treasury Yields (ETF proxies)
  T_BILL_3M: '^IRX',       // 13-week T-Bill yield
  T_NOTE_5Y: '^FVX',       // 5-year Treasury yield
  T_NOTE_10Y: '^TNX',      // 10-year Treasury yield
  T_BOND_30Y: '^TYX',      // 30-year Treasury yield
  
  // Market Indices
  SP500: '^GSPC',
  DOW: '^DJI',
  NASDAQ: '^IXIC',
  VIX: '^VIX',
  
  // Dollar
  DXY: 'DX-Y.NYB',
  
  // Commodities
  GOLD: 'GC=F',
  OIL_WTI: 'CL=F',
  NATURAL_GAS: 'NG=F',
  
  // Inflation-linked
  TIPS_ETF: 'TIP',         // iShares TIPS Bond ETF
  INFLATION_EXPECT: 'RINF', // ProShares Inflation Expectations ETF
} as const;

export interface MacroIndicator {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  previousClose: number;
  timestamp: number;
}

export interface TreasuryYields {
  t3m: number;
  t5y: number;
  t10y: number;
  t30y: number;
  spread10y2y: number;   // Calculated
  spread10y3m: number;   // Calculated
  curveStatus: 'normal' | 'flat' | 'inverted';
  timestamp: number;
}

export interface FreeMacroSnapshot {
  treasuryYields: TreasuryYields;
  vix: number;
  dxy: number;
  gold: number;
  oil: number;
  sp500: { value: number; change: number };
  fearGreed: number;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// YAHOO FINANCE FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchYahooQuote(symbol: string): Promise<MacroIndicator | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) return null;
    
    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const closes = quotes?.close || [];
    
    const currentPrice = meta.regularMarketPrice || closes[closes.length - 1];
    const previousClose = meta.previousClose || closes[closes.length - 2] || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;
    
    return {
      name: meta.symbol,
      value: currentPrice,
      change,
      changePercent,
      previousClose,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Yahoo fetch error for ${symbol}:`, error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREASURY YIELDS (Yahoo Finance)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTreasuryYields(): Promise<TreasuryYields> {
  const [t3m, t5y, t10y, t30y] = await Promise.all([
    fetchYahooQuote(YAHOO_MACRO_SYMBOLS.T_BILL_3M),
    fetchYahooQuote(YAHOO_MACRO_SYMBOLS.T_NOTE_5Y),
    fetchYahooQuote(YAHOO_MACRO_SYMBOLS.T_NOTE_10Y),
    fetchYahooQuote(YAHOO_MACRO_SYMBOLS.T_BOND_30Y)
  ]);
  
  // Yahoo returns yields as percentages (e.g., 4.25 for 4.25%)
  const yields = {
    t3m: t3m?.value || 0,
    t5y: t5y?.value || 0,
    t10y: t10y?.value || 0,
    t30y: t30y?.value || 0
  };
  
  // 2Y yaklaşık hesaplaması (3M ve 5Y ortalaması - gerçek değil ama proxy)
  const t2yApprox = (yields.t3m + yields.t5y) / 2;
  
  const spread10y2y = yields.t10y - t2yApprox;
  const spread10y3m = yields.t10y - yields.t3m;
  
  let curveStatus: 'normal' | 'flat' | 'inverted' = 'normal';
  if (spread10y2y < -0.1) curveStatus = 'inverted';
  else if (spread10y2y < 0.25) curveStatus = 'flat';
  
  return {
    ...yields,
    spread10y2y,
    spread10y3m,
    curveStatus,
    timestamp: Date.now()
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEAR & GREED INDEX (Alternative.me - Free, No API Key)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getFearGreedIndex(): Promise<{
  value: number;
  classification: string;
  timestamp: number;
}> {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=1');
    
    if (!response.ok) {
      return { value: 50, classification: 'Neutral', timestamp: Date.now() };
    }
    
    const data = await response.json();
    const latest = data.data?.[0];
    
    return {
      value: parseInt(latest?.value || '50'),
      classification: latest?.value_classification || 'Neutral',
      timestamp: Date.now()
    };
  } catch {
    return { value: 50, classification: 'Neutral', timestamp: Date.now() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL MACRO SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

export async function getFreeMacroSnapshot(): Promise<FreeMacroSnapshot> {
  const [
    treasuryYields,
    vixData,
    dxyData,
    goldData,
    oilData,
    sp500Data,
    fearGreed
  ] = await Promise.all([
    getTreasuryYields(),
    fetchYahooQuote(YAHOO_MACRO_SYMBOLS.VIX),
    fetchYahooQuote(YAHOO_MACRO_SYMBOLS.DXY),
    fetchYahooQuote(YAHOO_MACRO_SYMBOLS.GOLD),
    fetchYahooQuote(YAHOO_MACRO_SYMBOLS.OIL_WTI),
    fetchYahooQuote(YAHOO_MACRO_SYMBOLS.SP500),
    getFearGreedIndex()
  ]);
  
  return {
    treasuryYields,
    vix: vixData?.value || 0,
    dxy: dxyData?.value || 0,
    gold: goldData?.value || 0,
    oil: oilData?.value || 0,
    sp500: {
      value: sp500Data?.value || 0,
      change: sp500Data?.changePercent || 0
    },
    fearGreed: fearGreed.value,
    timestamp: Date.now()
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD BANK API - TARİHSEL MAKRO VERİLER (Free, No API Key)
// ═══════════════════════════════════════════════════════════════════════════════

const WORLD_BANK_INDICATORS = {
  GDP_CURRENT: 'NY.GDP.MKTP.CD',           // GDP (current US$)
  GDP_GROWTH: 'NY.GDP.MKTP.KD.ZG',         // GDP growth (annual %)
  INFLATION_CPI: 'FP.CPI.TOTL.ZG',         // Inflation, consumer prices
  UNEMPLOYMENT: 'SL.UEM.TOTL.ZS',          // Unemployment (% of labor force)
  INTEREST_RATE: 'FR.INR.RINR',            // Real interest rate
  CURRENT_ACCOUNT: 'BN.CAB.XOKA.GD.ZS',    // Current account balance (% GDP)
  DEBT_TO_GDP: 'GC.DOD.TOTL.GD.ZS',        // Central govt debt (% GDP)
} as const;

export interface WorldBankDataPoint {
  year: number;
  value: number | null;
}

export interface CountryMacroData {
  country: string;
  indicator: string;
  data: WorldBankDataPoint[];
}

/**
 * World Bank'tan ülke makro verisi çek
 * @param country ISO 3166-1 alpha-2 code (US, TR, DE, etc.)
 * @param indicator World Bank indicator code
 * @param years Kaç yıllık veri
 */
export async function getWorldBankData(
  country: string,
  indicator: string,
  years: number = 10
): Promise<CountryMacroData | null> {
  try {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - years;
    
    const response = await fetch(
      `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&date=${startYear}:${currentYear}&per_page=50`
    );
    
    if (!response.ok) return null;
    
    const [, dataArray] = await response.json();
    
    if (!dataArray || !Array.isArray(dataArray)) return null;
    
    const data: WorldBankDataPoint[] = dataArray
      .map((item: { date: string; value: number | null }) => ({
        year: parseInt(item.date),
        value: item.value
      }))
      .filter((d: WorldBankDataPoint) => d.value !== null)
      .sort((a: WorldBankDataPoint, b: WorldBankDataPoint) => a.year - b.year);
    
    return {
      country,
      indicator,
      data
    };
  } catch (error) {
    console.error(`World Bank API error:`, error);
    return null;
  }
}

/**
 * ABD temel makro göstergeleri (tarihsel)
 */
export async function getUSMacroHistory(): Promise<{
  gdpGrowth: WorldBankDataPoint[];
  inflation: WorldBankDataPoint[];
  unemployment: WorldBankDataPoint[];
}> {
  const [gdp, cpi, unemp] = await Promise.all([
    getWorldBankData('US', WORLD_BANK_INDICATORS.GDP_GROWTH),
    getWorldBankData('US', WORLD_BANK_INDICATORS.INFLATION_CPI),
    getWorldBankData('US', WORLD_BANK_INDICATORS.UNEMPLOYMENT)
  ]);
  
  return {
    gdpGrowth: gdp?.data || [],
    inflation: cpi?.data || [],
    unemployment: unemp?.data || []
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HARDCODED RECENT MACRO DATA (Fallback)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * API'ler çalışmazsa kullanılacak fallback veriler
 * Bu veriler periyodik olarak güncellenebilir
 */
export const FALLBACK_MACRO_DATA = {
  // Ocak 2026 itibarıyla yaklaşık değerler
  inflation: {
    cpiYoY: 2.9,        // %2.9 yıllık CPI
    coreCpiYoY: 3.2,    // %3.2 çekirdek CPI
    pceYoY: 2.6,        // %2.6 PCE
    trend: 'falling' as const
  },
  employment: {
    unemploymentRate: 4.1,  // %4.1 işsizlik
    nonfarmPayrolls: 156000, // Aylık istihdam artışı
    trend: 'stable' as const
  },
  interestRates: {
    fedFunds: 4.50,     // Fed funds rate
    t2y: 4.20,
    t10y: 4.50,
    t30y: 4.70,
    spread10y2y: 0.30,
    curveStatus: 'normal' as const
  },
  gdp: {
    realGdpGrowth: 2.5,  // %2.5 reel GDP büyümesi
    nominalGdp: 29500    // Milyar USD
  },
  consumerSentiment: 72,  // U of Michigan
  lastUpdated: '2026-01-15'
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED MACRO ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface MacroEnvironment {
  regime: 'risk-on' | 'risk-off' | 'neutral';
  inflationOutlook: 'hot' | 'cooling' | 'cold';
  growthOutlook: 'expanding' | 'slowing' | 'contracting';
  fedBias: 'hawkish' | 'neutral' | 'dovish';
  signals: string[];
}

export async function analyzeMacroEnvironment(): Promise<MacroEnvironment> {
  const snapshot = await getFreeMacroSnapshot();
  const signals: string[] = [];
  
  // VIX Analysis
  let regime: 'risk-on' | 'risk-off' | 'neutral' = 'neutral';
  if (snapshot.vix < 15) {
    regime = 'risk-on';
    signals.push('VIX düşük: Risk iştahı yüksek');
  } else if (snapshot.vix > 25) {
    regime = 'risk-off';
    signals.push('VIX yüksek: Piyasa stresi');
  }
  
  // Fear & Greed
  if (snapshot.fearGreed < 25) {
    signals.push('Extreme Fear: Potansiyel alım fırsatı');
  } else if (snapshot.fearGreed > 75) {
    signals.push('Extreme Greed: Dikkatli ol');
  }
  
  // Yield Curve
  if (snapshot.treasuryYields.curveStatus === 'inverted') {
    signals.push('Verim eğrisi ters: Resesyon sinyali');
  }
  
  // DXY
  if (snapshot.dxy > 105) {
    signals.push('Dolar güçlü: EM ve emtia baskı altında');
  } else if (snapshot.dxy < 100) {
    signals.push('Dolar zayıf: Risk varlıkları destekli');
  }
  
  // Inflation/Growth outlook from fallback
  const inflationOutlook = FALLBACK_MACRO_DATA.inflation.cpiYoY > 3.5 ? 'hot' : 
                           FALLBACK_MACRO_DATA.inflation.cpiYoY < 2.5 ? 'cold' : 'cooling';
  
  const growthOutlook = FALLBACK_MACRO_DATA.gdp.realGdpGrowth > 2.5 ? 'expanding' :
                        FALLBACK_MACRO_DATA.gdp.realGdpGrowth < 1 ? 'contracting' : 'slowing';
  
  // Fed bias
  let fedBias: 'hawkish' | 'neutral' | 'dovish' = 'neutral';
  if (inflationOutlook === 'hot') {
    fedBias = 'hawkish';
    signals.push('Enflasyon sıcak: Fed şahin');
  } else if (inflationOutlook === 'cold' && growthOutlook === 'slowing') {
    fedBias = 'dovish';
    signals.push('Enflasyon soğuk + büyüme yavaş: Fed güvercin');
  }
  
  return {
    regime,
    inflationOutlook,
    growthOutlook,
    fedBias,
    signals
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  YAHOO_MACRO_SYMBOLS,
  WORLD_BANK_INDICATORS,
  fetchYahooQuote
};
