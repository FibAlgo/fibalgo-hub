/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ MACROECONOMIC DATA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Economic indicators and central bank data:
 * - CPI, GDP, Unemployment
 * - Fed Funds Rate, Treasury Yields
 * - Dollar Index (DXY)
 * - Fear & Greed Index
 * 
 * Sources: FRED API (free), Yahoo Finance, Alternative.me
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface EconomicIndicator {
  name: string;
  value: number;
  previousValue: number;
  change: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastUpdated: string;
  source: string;
}

export interface TreasuryYields {
  us2y: number;
  us5y: number;
  us10y: number;
  us30y: number;
  spread2s10s: number;  // 10y - 2y (negative = inverted)
  isInverted: boolean;
  timestamp: number;
}

export interface DXYData {
  value: number;
  change: number;
  changePercent: number;
  trend: 'strengthening' | 'weakening' | 'neutral';
  level: 'strong' | 'normal' | 'weak';
  timestamp: number;
}

export interface FearGreedIndex {
  value: number;
  label: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  previousValue: number;
  weekAgo: number;
  monthAgo: number;
  timestamp: number;
}

export interface MarketRegime {
  riskAppetite: 'risk-on' | 'risk-off' | 'neutral';
  volatilityRegime: 'low' | 'normal' | 'elevated' | 'crisis';
  yieldCurve: 'steep' | 'flat' | 'inverted';
  dollarStrength: 'strong' | 'normal' | 'weak';
  overallSentiment: 'bullish' | 'neutral' | 'bearish';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREASURY YIELDS (Yahoo Finance)
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchTreasuryYields(): Promise<TreasuryYields> {
  const symbols = ['^IRX', '^FVX', '^TNX', '^TYX']; // 13w, 5y, 10y, 30y
  const yields: number[] = [];
  
  for (const symbol of symbols) {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      
      if (response.ok) {
        const data = await response.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
        yields.push(price);
      } else {
        yields.push(0);
      }
    } catch {
      yields.push(0);
    }
  }
  
  // Fetch 2-year separately (^TWOYEAR or approximate)
  let us2y = 4.5; // Default fallback
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/2YY=F?interval=1d&range=5d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      us2y = data?.chart?.result?.[0]?.meta?.regularMarketPrice || 4.5;
    }
  } catch {}
  
  const us10y = yields[2] || 4.0;
  const spread = us10y - us2y;
  
  return {
    us2y,
    us5y: yields[1] || 4.0,
    us10y,
    us30y: yields[3] || 4.5,
    spread2s10s: spread,
    isInverted: spread < 0,
    timestamp: Date.now()
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOLLAR INDEX (DXY)
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchDXY(): Promise<DXYData> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1mo',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!response.ok) {
      return { value: 104, change: 0, changePercent: 0, trend: 'neutral', level: 'normal', timestamp: Date.now() };
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice || 104;
    const prevClose = result?.meta?.previousClose || price;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;
    
    // Calculate trend from recent history
    const closes = result?.indicators?.quote?.[0]?.close?.filter((c: number) => c) || [];
    const recentAvg = closes.slice(-5).reduce((a: number, b: number) => a + b, 0) / 5;
    const olderAvg = closes.slice(-20, -5).reduce((a: number, b: number) => a + b, 0) / 15;
    
    let trend: DXYData['trend'];
    if (recentAvg > olderAvg * 1.01) trend = 'strengthening';
    else if (recentAvg < olderAvg * 0.99) trend = 'weakening';
    else trend = 'neutral';
    
    let level: DXYData['level'];
    if (price > 108) level = 'strong';
    else if (price < 100) level = 'weak';
    else level = 'normal';
    
    return {
      value: price,
      change,
      changePercent,
      trend,
      level,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('DXY fetch error:', error);
    return { value: 104, change: 0, changePercent: 0, trend: 'neutral', level: 'normal', timestamp: Date.now() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEAR & GREED INDEX (Crypto)
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchFearGreedIndex(): Promise<FearGreedIndex> {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=31');
    
    if (!response.ok) {
      return { 
        value: 50, 
        label: 'Neutral', 
        previousValue: 50, 
        weekAgo: 50, 
        monthAgo: 50, 
        timestamp: Date.now() 
      };
    }
    
    const data = await response.json();
    const entries = data.data || [];
    
    const current = parseInt(entries[0]?.value || '50');
    const previous = parseInt(entries[1]?.value || '50');
    const weekAgo = parseInt(entries[7]?.value || '50');
    const monthAgo = parseInt(entries[30]?.value || '50');
    
    let label: FearGreedIndex['label'];
    if (current <= 20) label = 'Extreme Fear';
    else if (current <= 40) label = 'Fear';
    else if (current <= 60) label = 'Neutral';
    else if (current <= 80) label = 'Greed';
    else label = 'Extreme Greed';
    
    return {
      value: current,
      label,
      previousValue: previous,
      weekAgo,
      monthAgo,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Fear & Greed fetch error:', error);
    return { 
      value: 50, 
      label: 'Neutral', 
      previousValue: 50, 
      weekAgo: 50, 
      monthAgo: 50, 
      timestamp: Date.now() 
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CNN FEAR & GREED (Stock Market)
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchCNNFearGreed(): Promise<{ value: number; label: string } | null> {
  // CNN doesn't have a public API, we estimate from VIX and market breadth
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const vix = data?.chart?.result?.[0]?.meta?.regularMarketPrice || 20;
    
    // Inverse VIX as fear/greed proxy
    // VIX 10 = Greed 90, VIX 40 = Fear 10
    const fearGreed = Math.max(0, Math.min(100, 100 - (vix - 10) * 3));
    
    let label: string;
    if (fearGreed <= 25) label = 'Extreme Fear';
    else if (fearGreed <= 45) label = 'Fear';
    else if (fearGreed <= 55) label = 'Neutral';
    else if (fearGreed <= 75) label = 'Greed';
    else label = 'Extreme Greed';
    
    return { value: Math.round(fearGreed), label };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET REGIME DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function detectMarketRegime(): Promise<MarketRegime> {
  const [fearGreed, yields, dxy] = await Promise.all([
    fetchFearGreedIndex(),
    fetchTreasuryYields(),
    fetchDXY()
  ]);
  
  // Fetch VIX for volatility regime
  let vix = 18;
  try {
    const vixResponse = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (vixResponse.ok) {
      const vixData = await vixResponse.json();
      vix = vixData?.chart?.result?.[0]?.meta?.regularMarketPrice || 18;
    }
  } catch {}
  
  // Determine risk appetite
  let riskAppetite: MarketRegime['riskAppetite'];
  if (fearGreed.value >= 60 && vix < 20) riskAppetite = 'risk-on';
  else if (fearGreed.value <= 40 || vix > 25) riskAppetite = 'risk-off';
  else riskAppetite = 'neutral';
  
  // Volatility regime
  let volatilityRegime: MarketRegime['volatilityRegime'];
  if (vix < 15) volatilityRegime = 'low';
  else if (vix < 22) volatilityRegime = 'normal';
  else if (vix < 35) volatilityRegime = 'elevated';
  else volatilityRegime = 'crisis';
  
  // Yield curve
  let yieldCurve: MarketRegime['yieldCurve'];
  if (yields.spread2s10s < -0.5) yieldCurve = 'inverted';
  else if (yields.spread2s10s > 0.5) yieldCurve = 'steep';
  else yieldCurve = 'flat';
  
  // Dollar strength
  const dollarStrength = dxy.level;
  
  // Overall sentiment
  let overallSentiment: MarketRegime['overallSentiment'];
  const bullishSignals = [
    fearGreed.value >= 55,
    vix < 20,
    !yields.isInverted,
    dxy.trend === 'weakening'
  ].filter(Boolean).length;
  
  if (bullishSignals >= 3) overallSentiment = 'bullish';
  else if (bullishSignals <= 1) overallSentiment = 'bearish';
  else overallSentiment = 'neutral';
  
  return {
    riskAppetite,
    volatilityRegime,
    yieldCurve,
    dollarStrength,
    overallSentiment
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE MACRO SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

export interface MacroSnapshot {
  fearGreed: FearGreedIndex;
  treasuryYields: TreasuryYields;
  dxy: DXYData;
  vix: { value: number; level: string };
  regime: MarketRegime;
  timestamp: number;
}

export async function fetchMacroSnapshot(): Promise<MacroSnapshot> {
  const [fearGreed, yields, dxy, regime] = await Promise.all([
    fetchFearGreedIndex(),
    fetchTreasuryYields(),
    fetchDXY(),
    detectMarketRegime()
  ]);
  
  // Fetch VIX
  let vix = { value: 18, level: 'normal' };
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      const value = data?.chart?.result?.[0]?.meta?.regularMarketPrice || 18;
      let level = 'normal';
      if (value < 15) level = 'low';
      else if (value > 25) level = 'elevated';
      else if (value > 35) level = 'high';
      vix = { value, level };
    }
  } catch {}
  
  return {
    fearGreed,
    treasuryYields: yields,
    dxy,
    vix,
    regime,
    timestamp: Date.now()
  };
}
