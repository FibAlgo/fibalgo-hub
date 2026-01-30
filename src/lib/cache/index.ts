/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🗄️ CACHE LAYER - Unified Export
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tüm cache fonksiyonlarını tek noktadan export eder.
 * 
 * Kullanım:
 *   import { cachedFetch, cleanupExpiredCache, getCacheStats } from '@/lib/cache';
 * 
 *   // Cached data fetch
 *   const price = await cachedFetch.equity('AAPL');
 *   
 *   // Cache cleanup (cron job)
 *   await cleanupExpiredCache();
 */

// Core cache service
export {
  CACHE_TTL,
  getCachedMarketData,
  setCachedMarketData,
  fetchMarketDataWithCache,
  getCachedMacroData,
  setCachedMacroData,
  fetchMacroDataWithCache,
  getCachedFundamentals,
  setCachedFundamentals,
  fetchFundamentalsWithCache,
  getCachedCryptoOnchain,
  setCachedCryptoOnchain,
  getCachedCOT,
  setCachedCOT,
  logAPICall,
  checkRateLimit,
  cleanupExpiredCache,
  getCacheStats,
  cacheDB,
  type CacheEntry,
  type CacheOptions,
  type MarketDataCache,
  type MacroDataCache,
  type FundamentalsCache,
  type CryptoOnchainCache,
  type COTCache
} from './data-cache';

// Cached fetchers (main interface)
export {
  cachedFetch,
  getCachedEquityPrice,
  getCachedCryptoPrice,
  getCachedForexPrice,
  getCachedCommodityPrice,
  getCachedIndexPrice,
  getCachedVIX,
  getCachedFearGreed,
  getCachedTreasuryYields,
  getCachedMacroSnapshot,
  getCachedIncomeStatement,
  getCachedBalanceSheet,
  getCachedCashFlow,
  getCachedDCF,
  getCachedFundingRates,
  getCachedOpenInterest,
  getCachedCOTSummary,
  getCachedMultiplePrices,
  getCachedMarketContext
} from './cached-fetchers';

// Re-export simple cache for backward compatibility
export * from './simple-cache';
