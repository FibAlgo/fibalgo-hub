/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 CACHED DATA FETCHERS - API + Database Cache Entegrasyonu
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bu modül tüm data fetcher'ları cache layer ile wrap eder.
 * Her çağrı önce DB'yi kontrol eder, sonra API'ye gider.
 * 
 * Kullanım:
 *   import { cachedFetch } from '@/lib/cache/cached-fetchers';
 *   const price = await cachedFetch.marketPrice('AAPL');
 * 
 * Avantajlar:
 * - Rate limit'e takılsak bile eski veri döner
 * - İlk çağrı yavaş olabilir ama sonrakiler hızlı
 * - API down olsa bile cached veri kullanılabilir
 */

import {
  fetchMarketDataWithCache,
  fetchMacroDataWithCache,
  fetchFundamentalsWithCache,
  getCachedCryptoOnchain,
  setCachedCryptoOnchain,
  getCachedCOT,
  setCachedCOT,
  logAPICall,
  checkRateLimit,
  CACHE_TTL,
  type CacheEntry,
  type MarketDataCache
} from './data-cache';

// Import existing data fetchers
import {
  fetchYahooQuote,
  fetchBinanceQuote,
  fetchFinnhubQuote,
  type MarketPrice
} from '../data/market-data';

import {
  fetchVIX,
  fetchVolatilityMetrics
} from '../data/volatility';

import {
  getFreeMacroSnapshot,
  getTreasuryYields,
  getFearGreedIndex,
  type FreeMacroSnapshot
} from '../data/macro-free';

import {
  fetchIncomeStatement,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchDCFValuation,
  type IncomeStatement,
  type BalanceSheet,
  type CashFlowStatement,
  type DCFValuation
} from '../data/fmp-api';

import {
  getCOTSummary,
  type COTSummary
} from '../data/cot-data';

// ═══════════════════════════════════════════════════════════════════════════════
// CACHED MARKET PRICES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get stock/ETF price with caching
 */
export async function getCachedEquityPrice(
  symbol: string
): Promise<CacheEntry<MarketPrice> | null> {
  return fetchMarketDataWithCache(
    symbol.toUpperCase(),
    'equity',
    'yahoo',
    () => fetchYahooQuote(symbol),
    CACHE_TTL.MARKET_PRICE
  );
}

/**
 * Get crypto price with caching
 */
export async function getCachedCryptoPrice(
  symbol: string // e.g., 'BTCUSDT'
): Promise<CacheEntry<MarketPrice> | null> {
  return fetchMarketDataWithCache(
    symbol.toUpperCase(),
    'crypto',
    'binance',
    () => fetchBinanceQuote(symbol),
    CACHE_TTL.CRYPTO_PRICE
  );
}

/**
 * Get forex pair price with caching
 */
export async function getCachedForexPrice(
  pair: string // e.g., 'EURUSD=X'
): Promise<CacheEntry<MarketPrice> | null> {
  return fetchMarketDataWithCache(
    pair.toUpperCase(),
    'forex',
    'yahoo',
    () => fetchYahooQuote(pair),
    CACHE_TTL.FOREX_PRICE
  );
}

/**
 * Get commodity price with caching
 */
export async function getCachedCommodityPrice(
  symbol: string // e.g., 'GC=F' for gold
): Promise<CacheEntry<MarketPrice> | null> {
  return fetchMarketDataWithCache(
    symbol.toUpperCase(),
    'commodity',
    'yahoo',
    () => fetchYahooQuote(symbol),
    CACHE_TTL.MARKET_PRICE
  );
}

/**
 * Get index price with caching
 */
export async function getCachedIndexPrice(
  symbol: string // e.g., '^GSPC' for S&P500
): Promise<CacheEntry<MarketPrice> | null> {
  return fetchMarketDataWithCache(
    symbol.toUpperCase(),
    'index',
    'yahoo',
    () => fetchYahooQuote(symbol),
    CACHE_TTL.MARKET_PRICE
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHED MACRO DATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get VIX with caching
 */
export async function getCachedVIX(): Promise<CacheEntry<{ value: number; level: string }> | null> {
  return fetchMacroDataWithCache(
    'VIX',
    'volatility',
    'yahoo',
    async () => {
      const vix = await fetchVIX();
      return vix;
    },
    CACHE_TTL.VIX
  );
}

/**
 * Get Fear & Greed Index with caching
 */
export async function getCachedFearGreed(): Promise<CacheEntry<{ value: number; classification: string }> | null> {
  return fetchMacroDataWithCache(
    'FEAR_GREED',
    'sentiment',
    'alternative.me',
    async () => {
      const fg = await getFearGreedIndex();
      return fg;
    },
    CACHE_TTL.FEAR_GREED
  );
}

/**
 * Get Treasury Yields with caching
 */
export async function getCachedTreasuryYields(): Promise<CacheEntry<{
  t3m: number;
  t5y: number;
  t10y: number;
  t30y: number;
  spread10y2y: number;
  curveStatus: string;
}> | null> {
  return fetchMacroDataWithCache(
    'TREASURY_YIELDS',
    'yields',
    'yahoo',
    async () => {
      const yields = await getTreasuryYields();
      return yields;
    },
    CACHE_TTL.TREASURY_YIELDS
  );
}

/**
 * Get full macro snapshot with caching
 */
export async function getCachedMacroSnapshot(): Promise<CacheEntry<FreeMacroSnapshot> | null> {
  return fetchMacroDataWithCache(
    'MACRO_SNAPSHOT',
    'macro',
    'multi',
    async () => {
      const snapshot = await getFreeMacroSnapshot();
      return snapshot;
    },
    CACHE_TTL.VIX // Use VIX TTL as it's the most volatile component
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHED FUNDAMENTALS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get Income Statement with caching
 */
export async function getCachedIncomeStatement(
  symbol: string
): Promise<CacheEntry<IncomeStatement[]> | null> {
  // Check rate limit first
  const rateCheck = await checkRateLimit('fmp', 1, 5); // 5 per minute to be safe
  
  if (!rateCheck.allowed) {
    console.warn(`Market data rate limit reached. Remaining: ${rateCheck.remaining}`);
  }
  
  return fetchFundamentalsWithCache(
    symbol,
    'income_statement',
    'fmp',
    async () => {
      const startTime = Date.now();
      try {
        const data = await fetchIncomeStatement(symbol);
        await logAPICall('fmp', `/income-statement/${symbol}`, 'success', 200, undefined, Date.now() - startTime);
        return data;
      } catch (error) {
        await logAPICall('fmp', `/income-statement/${symbol}`, 'error', 500, String(error), Date.now() - startTime);
        throw error;
      }
    },
    CACHE_TTL.INCOME_STATEMENT
  );
}

/**
 * Get Balance Sheet with caching
 */
export async function getCachedBalanceSheet(
  symbol: string
): Promise<CacheEntry<BalanceSheet[]> | null> {
  return fetchFundamentalsWithCache(
    symbol,
    'balance_sheet',
    'fmp',
    () => fetchBalanceSheet(symbol),
    CACHE_TTL.BALANCE_SHEET
  );
}

/**
 * Get Cash Flow Statement with caching
 */
export async function getCachedCashFlow(
  symbol: string
): Promise<CacheEntry<CashFlowStatement[]> | null> {
  return fetchFundamentalsWithCache(
    symbol,
    'cash_flow',
    'fmp',
    () => fetchCashFlow(symbol),
    CACHE_TTL.CASH_FLOW
  );
}

/**
 * Get DCF Valuation with caching
 */
export async function getCachedDCF(
  symbol: string
): Promise<CacheEntry<DCFValuation> | null> {
  return fetchFundamentalsWithCache(
    symbol,
    'dcf',
    'fmp',
    () => fetchDCFValuation(symbol),
    CACHE_TTL.DCF
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHED CRYPTO ON-CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get Funding Rates with caching
 */
export async function getCachedFundingRates(
  symbol: string = 'BTCUSDT'
): Promise<{ value: number; sentiment: string; isStale: boolean } | null> {
  // Check cache first
  const cached = await getCachedCryptoOnchain(symbol, 'funding_rate', 'binance');
  
  if (cached && new Date(cached.expires_at) > new Date()) {
    return {
      value: cached.value,
      sentiment: cached.sentiment || 'neutral',
      isStale: false
    };
  }
  
  // Fetch fresh
  try {
    const response = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`);
    if (!response.ok) throw new Error('Binance API error');
    
    const data = await response.json();
    const rate = parseFloat(data.lastFundingRate) * 100;
    
    const sentiment = rate > 0.01 ? 'overleveraged_long' : 
                      rate < -0.01 ? 'overleveraged_short' : 'neutral';
    
    // Save to cache
    await setCachedCryptoOnchain({
      symbol,
      data_type: 'funding_rate',
      value: rate,
      sentiment,
      data: data,
      source: 'binance',
      expires_at: new Date(Date.now() + CACHE_TTL.FUNDING_RATE * 1000).toISOString()
    });
    
    return { value: rate, sentiment, isStale: false };
  } catch (error) {
    console.error('Funding rate fetch error:', error);
    
    // Return stale cache if available
    if (cached) {
      return {
        value: cached.value,
        sentiment: cached.sentiment || 'neutral',
        isStale: true
      };
    }
    
    return null;
  }
}

/**
 * Get Open Interest with caching
 */
export async function getCachedOpenInterest(
  symbol: string = 'BTCUSDT'
): Promise<{ value: number; change24h: number; isStale: boolean } | null> {
  const cached = await getCachedCryptoOnchain(symbol, 'open_interest', 'binance');
  
  if (cached && new Date(cached.expires_at) > new Date()) {
    return {
      value: cached.value,
      change24h: cached.change_24h || 0,
      isStale: false
    };
  }
  
  try {
    const response = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`);
    if (!response.ok) throw new Error('Binance API error');
    
    const data = await response.json();
    const oi = parseFloat(data.openInterest);
    
    // Calculate change (simplified - ideally compare with previous cached value)
    const change24h = cached ? ((oi - cached.value) / cached.value) * 100 : 0;
    
    await setCachedCryptoOnchain({
      symbol,
      data_type: 'open_interest',
      value: oi,
      change_24h: change24h,
      data: data,
      source: 'binance',
      expires_at: new Date(Date.now() + CACHE_TTL.OPEN_INTEREST * 1000).toISOString()
    });
    
    return { value: oi, change24h, isStale: false };
  } catch (error) {
    console.error('Open interest fetch error:', error);
    
    if (cached) {
      return {
        value: cached.value,
        change24h: cached.change_24h || 0,
        isStale: true
      };
    }
    
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHED COT DATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get COT Summary with caching
 */
export async function getCachedCOTSummary(
  market: string // e.g., 'EUR', 'GOLD', 'SP500'
): Promise<{ data: COTSummary; isStale: boolean } | null> {
  const cached = await getCachedCOT(market);
  
  if (cached && new Date(cached.expires_at) > new Date()) {
    return {
      data: {
        commodity: cached.market_name,
        symbol: market,
        netSpeculativePosition: cached.nc_net,
        weeklyChange: 0, // Would need previous week's data
        percentLong: cached.percent_long,
        sentiment: cached.sentiment as COTSummary['sentiment'],
        lastUpdate: cached.report_date
      },
      isStale: false
    };
  }
  
  try {
    const summary = await getCOTSummary(market as 'EUR' | 'GOLD' | 'SP500');
    
    if (summary) {
      await setCachedCOT({
        market_code: market,
        market_name: summary.commodity,
        report_date: summary.lastUpdate,
        nc_long: 0, // Full data would be from fetchCOTData
        nc_short: 0,
        nc_net: summary.netSpeculativePosition,
        comm_net: 0,
        open_interest: 0,
        percent_long: summary.percentLong,
        sentiment: summary.sentiment,
        expires_at: new Date(Date.now() + CACHE_TTL.COT_DATA * 1000).toISOString()
      });
      
      return { data: summary, isStale: false };
    }
  } catch (error) {
    console.error('COT fetch error:', error);
  }
  
  if (cached) {
    return {
      data: {
        commodity: cached.market_name,
        symbol: market,
        netSpeculativePosition: cached.nc_net,
        weeklyChange: 0,
        percentLong: cached.percent_long,
        sentiment: cached.sentiment as COTSummary['sentiment'],
        lastUpdate: cached.report_date
      },
      isStale: true
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED CACHED FETCH INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export const cachedFetch = {
  // Market Prices
  equity: getCachedEquityPrice,
  crypto: getCachedCryptoPrice,
  forex: getCachedForexPrice,
  commodity: getCachedCommodityPrice,
  index: getCachedIndexPrice,
  
  // Macro
  vix: getCachedVIX,
  fearGreed: getCachedFearGreed,
  treasuryYields: getCachedTreasuryYields,
  macroSnapshot: getCachedMacroSnapshot,
  
  // Fundamentals
  incomeStatement: getCachedIncomeStatement,
  balanceSheet: getCachedBalanceSheet,
  cashFlow: getCachedCashFlow,
  dcf: getCachedDCF,
  
  // Crypto On-Chain
  fundingRates: getCachedFundingRates,
  openInterest: getCachedOpenInterest,
  
  // COT
  cot: getCachedCOTSummary,
};

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH FETCH WITH CACHE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch multiple symbols with caching
 */
export async function getCachedMultiplePrices(
  symbols: string[],
  assetType: MarketDataCache['asset_type'] = 'equity'
): Promise<Map<string, CacheEntry<MarketPrice> | null>> {
  const results = new Map<string, CacheEntry<MarketPrice> | null>();
  
  // Fetch in parallel but respect rate limits
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        switch (assetType) {
          case 'crypto':
            return { symbol, result: await getCachedCryptoPrice(symbol) };
          case 'forex':
            return { symbol, result: await getCachedForexPrice(symbol) };
          case 'commodity':
            return { symbol, result: await getCachedCommodityPrice(symbol) };
          case 'index':
            return { symbol, result: await getCachedIndexPrice(symbol) };
          default:
            return { symbol, result: await getCachedEquityPrice(symbol) };
        }
      })
    );
    
    for (const { symbol, result } of batchResults) {
      results.set(symbol, result);
    }
    
    // Small delay between batches to avoid rate limits
    if (i + batchSize < symbols.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  return results;
}

/**
 * Get complete market context with all cached data
 */
export async function getCachedMarketContext(): Promise<{
  macro: FreeMacroSnapshot | null;
  indices: Record<string, MarketPrice | null>;
  crypto: Record<string, { price: MarketPrice | null; funding: number | null; oi: number | null }>;
  isAnyStale: boolean;
  lastUpdated: number;
}> {
  const [
    macro,
    spy,
    qqq,
    btc,
    eth,
    btcFunding,
    ethFunding,
    btcOI,
    ethOI
  ] = await Promise.all([
    getCachedMacroSnapshot(),
    getCachedIndexPrice('^GSPC'),
    getCachedIndexPrice('^NDX'),
    getCachedCryptoPrice('BTCUSDT'),
    getCachedCryptoPrice('ETHUSDT'),
    getCachedFundingRates('BTCUSDT'),
    getCachedFundingRates('ETHUSDT'),
    getCachedOpenInterest('BTCUSDT'),
    getCachedOpenInterest('ETHUSDT')
  ]);
  
  const isAnyStale = [
    macro?.isStale,
    spy?.isStale,
    qqq?.isStale,
    btc?.isStale,
    eth?.isStale,
    btcFunding?.isStale,
    ethFunding?.isStale,
    btcOI?.isStale,
    ethOI?.isStale
  ].some(Boolean);
  
  return {
    macro: macro?.data || null,
    indices: {
      SPY: spy?.data || null,
      QQQ: qqq?.data || null
    },
    crypto: {
      BTC: {
        price: btc?.data || null,
        funding: btcFunding?.value || null,
        oi: btcOI?.value || null
      },
      ETH: {
        price: eth?.data || null,
        funding: ethFunding?.value || null,
        oi: ethOI?.value || null
      }
    },
    isAnyStale,
    lastUpdated: Date.now()
  };
}
