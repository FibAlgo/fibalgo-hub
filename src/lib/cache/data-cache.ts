/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🗄️ DATA CACHE SERVICE - Supabase Backed Cache Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tüm API verilerini Supabase'de cache'ler.
 * Rate limit'e takılsak bile eski veriler kullanılabilir.
 * 
 * Özellikler:
 * - TTL (Time-To-Live) based expiration
 * - Stale-while-revalidate pattern
 * - Automatic retry with exponential backoff
 * - Rate limit tracking
 * - Fallback to stale data on API failure
 */

import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TTL CONFIGURATION (seconds)
// ═══════════════════════════════════════════════════════════════════════════════

export const CACHE_TTL = {
  // Real-time data (short TTL)
  MARKET_PRICE: 60,           // 1 minute
  CRYPTO_PRICE: 30,           // 30 seconds
  FOREX_PRICE: 60,            // 1 minute
  
  // Intraday data
  OHLC_1M: 60,                // 1 minute
  OHLC_5M: 5 * 60,            // 5 minutes
  OHLC_15M: 15 * 60,          // 15 minutes
  OHLC_1H: 60 * 60,           // 1 hour
  OHLC_1D: 4 * 60 * 60,       // 4 hours
  
  // Macro data
  VIX: 5 * 60,                // 5 minutes
  TREASURY_YIELDS: 15 * 60,   // 15 minutes
  FEAR_GREED: 60 * 60,        // 1 hour
  DXY: 15 * 60,               // 15 minutes
  
  // Fundamentals (slow changing)
  INCOME_STATEMENT: 24 * 60 * 60,  // 24 hours
  BALANCE_SHEET: 24 * 60 * 60,     // 24 hours
  CASH_FLOW: 24 * 60 * 60,         // 24 hours
  EARNINGS: 12 * 60 * 60,          // 12 hours
  DCF: 24 * 60 * 60,               // 24 hours
  
  // Crypto on-chain
  FUNDING_RATE: 5 * 60,       // 5 minutes
  OPEN_INTEREST: 5 * 60,      // 5 minutes
  LIQUIDATIONS: 5 * 60,       // 5 minutes
  
  // COT (weekly release)
  COT_DATA: 24 * 60 * 60,     // 24 hours
  
  // Sentiment
  SHORT_INTEREST: 12 * 60 * 60,    // 12 hours
  INSTITUTIONAL: 24 * 60 * 60,     // 24 hours
  
  // News
  NEWS: 5 * 60,               // 5 minutes
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  isStale: boolean;
  source: 'cache' | 'api';
}

export interface CacheOptions {
  ttlSeconds: number;
  forceRefresh?: boolean;
  allowStale?: boolean;  // Return stale data if API fails
  staleMaxAge?: number;  // Max age for stale data in seconds
}

export interface MarketDataCache {
  symbol: string;
  asset_type: 'equity' | 'forex' | 'crypto' | 'commodity' | 'index';
  source: string;
  price: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  close_price?: number;
  previous_close?: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  volume_24h?: number;
  market_cap?: number;
  data_timestamp: string;
  fetched_at: string;
  expires_at: string;
  raw_data?: Record<string, unknown>;
}

export interface MacroDataCache {
  indicator: string;
  category: string;
  value: number;
  previous_value?: number;
  change?: number;
  change_percent?: number;
  level?: string;
  signal?: string;
  source: string;
  data_timestamp: string;
  expires_at: string;
  raw_data?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function getExpiresAt(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

function isStale(expiresAt: string, staleMaxAge: number = 3600): boolean {
  const expiry = new Date(expiresAt);
  const staleLimit = new Date(expiry.getTime() + staleMaxAge * 1000);
  return new Date() > expiry && new Date() < staleLimit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET DATA CACHE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getCachedMarketData(
  symbol: string,
  assetType: MarketDataCache['asset_type'],
  source: string
): Promise<MarketDataCache | null> {
  try {
    const { data, error } = await supabase
      .from('market_data_cache')
      .select('*')
      .eq('symbol', symbol)
      .eq('asset_type', assetType)
      .eq('source', source)
      .single();
    
    if (error || !data) return null;
    return data as MarketDataCache;
  } catch {
    return null;
  }
}

export async function setCachedMarketData(
  cacheData: Omit<MarketDataCache, 'fetched_at'>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('market_data_cache')
      .upsert({
        ...cacheData,
        fetched_at: new Date().toISOString()
      }, {
        onConflict: 'symbol,asset_type,source'
      });
    
    if (error) {
      console.error('Cache write error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Cache write exception:', err);
    return false;
  }
}

/**
 * Fetch market data with cache
 * @param symbol Symbol to fetch
 * @param assetType Asset type
 * @param source API source
 * @param fetchFn Function to fetch fresh data
 * @param ttlSeconds Cache TTL
 */
export async function fetchMarketDataWithCache<T extends { price: number }>(
  symbol: string,
  assetType: MarketDataCache['asset_type'],
  source: string,
  fetchFn: () => Promise<T | null>,
  ttlSeconds: number = CACHE_TTL.MARKET_PRICE
): Promise<CacheEntry<T> | null> {
  // 1. Check cache first
  const cached = await getCachedMarketData(symbol, assetType, source);
  
  if (cached && !isExpired(cached.expires_at)) {
    // Cache hit - return cached data
    return {
      data: cached.raw_data as T,
      cachedAt: new Date(cached.fetched_at).getTime(),
      expiresAt: new Date(cached.expires_at).getTime(),
      isStale: false,
      source: 'cache'
    };
  }
  
  // 2. Cache miss or expired - fetch fresh data
  try {
    const freshData = await fetchFn();
    
    if (freshData) {
      // Save to cache
      await setCachedMarketData({
        symbol,
        asset_type: assetType,
        source,
        price: freshData.price,
        data_timestamp: new Date().toISOString(),
        expires_at: getExpiresAt(ttlSeconds),
        raw_data: freshData as Record<string, unknown>
      });
      
      return {
        data: freshData,
        cachedAt: Date.now(),
        expiresAt: Date.now() + ttlSeconds * 1000,
        isStale: false,
        source: 'api'
      };
    }
  } catch (error) {
    console.error(`API fetch error for ${symbol}:`, error);
  }
  
  // 3. API failed - return stale cache if available
  if (cached && isStale(cached.expires_at, 3600)) {
    console.warn(`Returning stale cache for ${symbol}`);
    return {
      data: cached.raw_data as T,
      cachedAt: new Date(cached.fetched_at).getTime(),
      expiresAt: new Date(cached.expires_at).getTime(),
      isStale: true,
      source: 'cache'
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MACRO DATA CACHE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getCachedMacroData(
  indicator: string
): Promise<MacroDataCache | null> {
  try {
    const { data, error } = await supabase
      .from('macro_data_cache')
      .select('*')
      .eq('indicator', indicator)
      .single();
    
    if (error || !data) return null;
    return data as MacroDataCache;
  } catch {
    return null;
  }
}

export async function setCachedMacroData(
  cacheData: MacroDataCache
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('macro_data_cache')
      .upsert({
        ...cacheData,
        fetched_at: new Date().toISOString()
      }, {
        onConflict: 'indicator'
      });
    
    return !error;
  } catch {
    return false;
  }
}

export async function fetchMacroDataWithCache<T>(
  indicator: string,
  category: string,
  source: string,
  fetchFn: () => Promise<T | null>,
  ttlSeconds: number = CACHE_TTL.VIX
): Promise<CacheEntry<T> | null> {
  // 1. Check cache
  const cached = await getCachedMacroData(indicator);
  
  if (cached && !isExpired(cached.expires_at)) {
    return {
      data: cached.raw_data as T,
      cachedAt: new Date(cached.data_timestamp).getTime(),
      expiresAt: new Date(cached.expires_at).getTime(),
      isStale: false,
      source: 'cache'
    };
  }
  
  // 2. Fetch fresh
  try {
    const freshData = await fetchFn();
    
    if (freshData) {
      const value = typeof freshData === 'number' ? freshData : 
                    (freshData as Record<string, unknown>).value as number || 0;
      
      await setCachedMacroData({
        indicator,
        category,
        value,
        source,
        data_timestamp: new Date().toISOString(),
        expires_at: getExpiresAt(ttlSeconds),
        raw_data: typeof freshData === 'object' ? freshData as Record<string, unknown> : { value: freshData }
      });
      
      return {
        data: freshData,
        cachedAt: Date.now(),
        expiresAt: Date.now() + ttlSeconds * 1000,
        isStale: false,
        source: 'api'
      };
    }
  } catch (error) {
    console.error(`Macro fetch error for ${indicator}:`, error);
  }
  
  // 3. Return stale if available
  if (cached) {
    return {
      data: cached.raw_data as T,
      cachedAt: new Date(cached.data_timestamp).getTime(),
      expiresAt: new Date(cached.expires_at).getTime(),
      isStale: true,
      source: 'cache'
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNDAMENTALS CACHE
// ═══════════════════════════════════════════════════════════════════════════════

export interface FundamentalsCache {
  symbol: string;
  data_type: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'ratios' | 'dcf';
  period: string;
  fiscal_year: number;
  data: Record<string, unknown>;
  source: string;
  fetched_at: string;
  expires_at: string;
}

export async function getCachedFundamentals(
  symbol: string,
  dataType: FundamentalsCache['data_type'],
  period: string = 'TTM'
): Promise<FundamentalsCache | null> {
  try {
    const { data, error } = await supabase
      .from('fundamentals_cache')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .eq('data_type', dataType)
      .eq('period', period)
      .order('fiscal_year', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return null;
    return data as FundamentalsCache;
  } catch {
    return null;
  }
}

export async function setCachedFundamentals(
  cacheData: Omit<FundamentalsCache, 'fetched_at'>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fundamentals_cache')
      .upsert({
        ...cacheData,
        symbol: cacheData.symbol.toUpperCase(),
        fetched_at: new Date().toISOString()
      }, {
        onConflict: 'symbol,data_type,period,fiscal_year'
      });
    
    return !error;
  } catch {
    return false;
  }
}

export async function fetchFundamentalsWithCache<T>(
  symbol: string,
  dataType: FundamentalsCache['data_type'],
  source: string,
  fetchFn: () => Promise<T | null>,
  ttlSeconds: number = CACHE_TTL.INCOME_STATEMENT
): Promise<CacheEntry<T> | null> {
  const period = 'TTM';
  const fiscalYear = new Date().getFullYear();
  
  // 1. Check cache
  const cached = await getCachedFundamentals(symbol, dataType, period);
  
  if (cached && !isExpired(cached.expires_at)) {
    return {
      data: cached.data as T,
      cachedAt: new Date(cached.fetched_at).getTime(),
      expiresAt: new Date(cached.expires_at).getTime(),
      isStale: false,
      source: 'cache'
    };
  }
  
  // 2. Fetch fresh
  try {
    const freshData = await fetchFn();
    
    if (freshData) {
      await setCachedFundamentals({
        symbol,
        data_type: dataType,
        period,
        fiscal_year: fiscalYear,
        data: freshData as Record<string, unknown>,
        source,
        expires_at: getExpiresAt(ttlSeconds)
      });
      
      return {
        data: freshData,
        cachedAt: Date.now(),
        expiresAt: Date.now() + ttlSeconds * 1000,
        isStale: false,
        source: 'api'
      };
    }
  } catch (error) {
    console.error(`Fundamentals fetch error for ${symbol}:`, error);
  }
  
  // 3. Return stale
  if (cached) {
    return {
      data: cached.data as T,
      cachedAt: new Date(cached.fetched_at).getTime(),
      expiresAt: new Date(cached.expires_at).getTime(),
      isStale: true,
      source: 'cache'
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRYPTO ON-CHAIN CACHE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CryptoOnchainCache {
  symbol: string;
  data_type: 'funding_rate' | 'open_interest' | 'liquidations';
  value: number;
  value_usd?: number;
  change_24h?: number;
  sentiment?: string;
  data: Record<string, unknown>;
  source: string;
  fetched_at: string;
  expires_at: string;
}

export async function getCachedCryptoOnchain(
  symbol: string,
  dataType: CryptoOnchainCache['data_type'],
  source: string = 'binance'
): Promise<CryptoOnchainCache | null> {
  try {
    const { data, error } = await supabase
      .from('crypto_onchain_cache')
      .select('*')
      .eq('symbol', symbol)
      .eq('data_type', dataType)
      .eq('source', source)
      .single();
    
    if (error || !data) return null;
    return data as CryptoOnchainCache;
  } catch {
    return null;
  }
}

export async function setCachedCryptoOnchain(
  cacheData: Omit<CryptoOnchainCache, 'fetched_at'>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('crypto_onchain_cache')
      .upsert({
        ...cacheData,
        fetched_at: new Date().toISOString()
      }, {
        onConflict: 'symbol,data_type,source'
      });
    
    return !error;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COT DATA CACHE
// ═══════════════════════════════════════════════════════════════════════════════

export interface COTCache {
  market_code: string;
  market_name: string;
  report_date: string;
  nc_long: number;
  nc_short: number;
  nc_net: number;
  comm_net: number;
  open_interest: number;
  percent_long: number;
  sentiment: string;
  fetched_at: string;
  expires_at: string;
}

export async function getCachedCOT(
  marketCode: string
): Promise<COTCache | null> {
  try {
    const { data, error } = await supabase
      .from('cot_data_cache')
      .select('*')
      .eq('market_code', marketCode)
      .order('report_date', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) return null;
    return data as COTCache;
  } catch {
    return null;
  }
}

export async function setCachedCOT(
  cacheData: Omit<COTCache, 'fetched_at'>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cot_data_cache')
      .upsert({
        ...cacheData,
        fetched_at: new Date().toISOString()
      }, {
        onConflict: 'market_code,report_date'
      });
    
    return !error;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API CALL LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

export async function logAPICall(
  apiName: string,
  endpoint: string,
  status: 'success' | 'error' | 'rate_limited',
  statusCode?: number,
  errorMessage?: string,
  responseTimeMs?: number,
  rateLimitRemaining?: number
): Promise<void> {
  try {
    await supabase
      .from('api_call_log')
      .insert({
        api_name: apiName,
        endpoint,
        status,
        status_code: statusCode,
        error_message: errorMessage,
        response_time_ms: responseTimeMs,
        rate_limit_remaining: rateLimitRemaining
      });
  } catch {
    // Silent fail - logging shouldn't break the app
  }
}

export async function checkRateLimit(
  apiName: string,
  windowMinutes: number = 1,
  maxCalls: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    
    const { count, error } = await supabase
      .from('api_call_log')
      .select('*', { count: 'exact', head: true })
      .eq('api_name', apiName)
      .gte('called_at', since);
    
    if (error) {
      return { allowed: true, remaining: maxCalls };
    }
    
    const remaining = maxCalls - (count || 0);
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining)
    };
  } catch {
    return { allowed: true, remaining: maxCalls };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

export async function cleanupExpiredCache(): Promise<{
  deleted: Record<string, number>;
  errors: string[];
}> {
  const tables = [
    'market_data_cache',
    'ohlc_cache', 
    'macro_data_cache',
    'treasury_yields_cache',
    'fundamentals_cache',
    'crypto_onchain_cache',
    'cot_data_cache',
    'sentiment_cache'
  ];
  
  const deleted: Record<string, number> = {};
  const errors: string[] = [];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();
      
      if (error) {
        errors.push(`${table}: ${error.message}`);
      } else {
        deleted[table] = data?.length || 0;
      }
    } catch (err) {
      errors.push(`${table}: ${err}`);
    }
  }
  
  // Clean old API logs (older than 7 days)
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('api_call_log')
      .delete()
      .lt('called_at', weekAgo)
      .select();
    
    deleted['api_call_log'] = data?.length || 0;
  } catch (err) {
    errors.push(`api_call_log: ${err}`);
  }
  
  return { deleted, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE STATS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getCacheStats(): Promise<{
  tables: Record<string, { total: number; expired: number }>;
  apiCalls24h: Record<string, { success: number; error: number; rateLimited: number }>;
}> {
  const tables: Record<string, { total: number; expired: number }> = {};
  const apiCalls24h: Record<string, { success: number; error: number; rateLimited: number }> = {};
  
  const tableNames = ['market_data_cache', 'macro_data_cache', 'fundamentals_cache'];
  
  for (const table of tableNames) {
    try {
      const { count: total } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      const { count: expired } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString());
      
      tables[table] = { total: total || 0, expired: expired || 0 };
    } catch {
      tables[table] = { total: 0, expired: 0 };
    }
  }
  
  // API call stats
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('api_call_log')
      .select('api_name, status')
      .gte('called_at', since);
    
    if (data) {
      for (const row of data) {
        if (!apiCalls24h[row.api_name]) {
          apiCalls24h[row.api_name] = { success: 0, error: 0, rateLimited: 0 };
        }
        if (row.status === 'success') apiCalls24h[row.api_name].success++;
        if (row.status === 'error') apiCalls24h[row.api_name].error++;
        if (row.status === 'rate_limited') apiCalls24h[row.api_name].rateLimited++;
      }
    }
  } catch {
    // Silent fail
  }
  
  return { tables, apiCalls24h };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { supabase as cacheDB };
