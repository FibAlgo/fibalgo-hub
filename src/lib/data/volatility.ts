/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📈 VOLATILITY METRICS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Implied and realized volatility metrics:
 * - VIX (S&P 500 Implied Volatility)
 * - Asset-specific volatility
 * - Volatility spreads
 * 
 * Sources: CBOE via Yahoo Finance, Calculated from price history
 */

import { fetchYahooIntraday, fetchBinanceKlines } from './market-data';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface VolatilityMetrics {
  symbol: string;
  impliedVol?: number;        // IV from options (if available)
  realizedVol: number;        // Historical volatility (annualized)
  dailyRange: number;         // Average daily range %
  atr: number;                // Average True Range
  volatilityPercentile: number; // Where current vol sits vs history (0-100)
  isElevated: boolean;        // Above 75th percentile
  timestamp: number;
}

export interface VIXData {
  value: number;
  change: number;
  changePercent: number;
  level: 'low' | 'normal' | 'elevated' | 'high' | 'extreme';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIX FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchVIX(): Promise<VIXData> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!response.ok) {
      return { value: 18, change: 0, changePercent: 0, level: 'normal', timestamp: Date.now() };
    }
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice || 18;
    const prevClose = result?.meta?.previousClose || price;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;
    
    let level: VIXData['level'];
    if (price < 15) level = 'low';
    else if (price < 20) level = 'normal';
    else if (price < 25) level = 'elevated';
    else if (price < 35) level = 'high';
    else level = 'extreme';
    
    return {
      value: price,
      change,
      changePercent,
      level,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('VIX fetch error:', error);
    return { value: 18, change: 0, changePercent: 0, level: 'normal', timestamp: Date.now() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REALIZED VOLATILITY CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

function calculateRealizedVolatility(prices: number[], period: number = 20): number {
  if (prices.length < period + 1) return 0;
  
  // Calculate log returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > 0 && prices[i-1] > 0) {
      returns.push(Math.log(prices[i] / prices[i-1]));
    }
  }
  
  if (returns.length < period) return 0;
  
  // Use last N returns
  const recentReturns = returns.slice(-period);
  
  // Calculate standard deviation
  const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
  const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recentReturns.length;
  const stdDev = Math.sqrt(variance);
  
  // Annualize (assuming 252 trading days for stocks, 365 for crypto)
  const annualized = stdDev * Math.sqrt(252) * 100;
  
  return annualized;
}

function calculateATR(candles: { high: number; low: number; close: number }[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i-1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // Simple moving average of true ranges
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((a, b) => a + b, 0) / recentTR.length;
}

function calculateDailyRange(candles: { high: number; low: number; close: number }[]): number {
  if (candles.length === 0) return 0;
  
  const ranges = candles.map(c => ((c.high - c.low) / c.close) * 100);
  return ranges.reduce((a, b) => a + b, 0) / ranges.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET VOLATILITY FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchVolatilityMetrics(symbol: string): Promise<VolatilityMetrics | null> {
  try {
    // Detect if crypto
    const isCrypto = symbol.toUpperCase().includes('BINANCE:') || 
      ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'].some(c => symbol.toUpperCase().includes(c));
    
    let candles;
    if (isCrypto) {
      const history = await fetchBinanceKlines(symbol, '1h', 168); // 7 days of hourly
      candles = history?.candles;
    } else {
      const history = await fetchYahooIntraday(symbol, '1h', '5d');
      candles = history?.candles;
    }
    
    if (!candles || candles.length < 20) return null;
    
    const closes = candles.map(c => c.close);
    const realizedVol = calculateRealizedVolatility(closes, 20);
    const atr = calculateATR(candles, 14);
    const dailyRange = calculateDailyRange(candles);
    
    // Calculate volatility percentile (compare current vs historical)
    const allVols: number[] = [];
    for (let i = 20; i <= closes.length; i++) {
      const subset = closes.slice(i - 20, i);
      allVols.push(calculateRealizedVolatility(subset, 20));
    }
    
    const currentVol = allVols[allVols.length - 1] || realizedVol;
    const sortedVols = [...allVols].sort((a, b) => a - b);
    const percentileIndex = sortedVols.findIndex(v => v >= currentVol);
    const volatilityPercentile = percentileIndex >= 0 
      ? (percentileIndex / sortedVols.length) * 100 
      : 50;
    
    return {
      symbol,
      realizedVol,
      dailyRange,
      atr,
      volatilityPercentile,
      isElevated: volatilityPercentile > 75,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Volatility metrics error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOLATILITY SPREAD (VIX vs Realized)
// ═══════════════════════════════════════════════════════════════════════════════

export interface VolatilitySpread {
  vix: number;
  spyRealizedVol: number;
  spread: number;  // VIX - Realized (positive = fear premium)
  signal: 'fear_high' | 'fear_normal' | 'complacency';
}

export async function fetchVolatilitySpread(): Promise<VolatilitySpread | null> {
  try {
    const [vixData, spyVol] = await Promise.all([
      fetchVIX(),
      fetchVolatilityMetrics('SPY')
    ]);
    
    if (!spyVol) return null;
    
    const spread = vixData.value - spyVol.realizedVol;
    
    let signal: VolatilitySpread['signal'];
    if (spread > 10) signal = 'fear_high';
    else if (spread > 0) signal = 'fear_normal';
    else signal = 'complacency';
    
    return {
      vix: vixData.value,
      spyRealizedVol: spyVol.realizedVol,
      spread,
      signal
    };
  } catch (error) {
    console.error('Volatility spread error:', error);
    return null;
  }
}
