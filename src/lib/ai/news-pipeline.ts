/**
 * 🔄 NEWS ANALYSIS PIPELINE
 * 
 * Flow:
 * 1. Haber gelir
 * 2. GPT-5.2 Strategist → Analiz framework oluşturur
 * 3. requiredData'ya göre database güncellenir (API'lerden çekilir)
 * 4. Database'den ilgili veriler çekilir
 * 5. GPT-4o Executor → Final analiz
 */

import { NEWS_STRATEGIST_PROMPT } from './news-strategist';
import { NEWS_EXECUTOR_PROMPT } from './news-executor';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface NewsInput {
  id: string;
  headline: string;  // Ignored by strategist
  body: string;
  source?: string;
  publishedAt?: string;
}

interface StrategistOutput {
  informationNature: {
    classification: string;
    confidence: number;
    reasoning: string;
  };
  marketImpactLogic: {
    shouldMoveMarkets: boolean;
    reasoning: string;
    challengedBeliefs: string[];
    transmissionMechanisms: Array<{
      channel: string;
      direction: string;
      magnitude: string;
    }>;
  };
  requiredData: {
    marketPrices: Array<{
      symbol: string;
      type: string;
      reason: string;
    }>;
    timeWindows: Array<{ period: string; reason: string }>;
    volatilityMetrics: string[];
    macroInputs: string[];
    positioningProxies: string[];
    historicalComparables: Array<{
      event: string;
      date: string;
      relevance: string;
      transferableLessons: string[];
      nonTransferableAspects: string[];
    }>;
  };
  nonReactionConditions: {
    conditions: string[];
    invalidationSignals: string[];
  };
  analysisHorizons: {
    immediate: { relevant: boolean; focus: string[]; timeframe: string };
    shortTerm: { relevant: boolean; focus: string[]; timeframe: string };
    mediumTerm: { relevant: boolean; focus: string[]; timeframe: string };
    longTerm: { relevant: boolean; focus: string[]; timeframe: string; structuralImplications: string[] };
  };
  historicalComparisonLogic: {
    comparisonNeeded: boolean;
    validAnalogCriteria: string[];
    invalidAnalogWarnings: string[];
  };
  cognitiveTraps: {
    headlineBias: string;
    confirmationBias: string;
    pricedInRisk: string;
    reflexiveNarrativeRisk: string;
    otherTraps: string[];
  };
  outputDesign: {
    executiveSummaryFocus: string;
    assetImpactLogic: Array<{ asset: string; impactChain: string; confidence: number }>;
    scenarioMatrix: {
      base: { probability: number; description: string; implications: string[] };
      upside: { probability: number; trigger: string; implications: string[] };
      downside: { probability: number; trigger: string; implications: string[] };
    };
    keyMonitoringPoints: string[];
  };
  executorInstructions: {
    mandatoryTasks: string[];
    forbiddenBehaviors: string[];
    outputConstraints: string[];
    confidenceFloor: number;
    absoluteBans: string[];
  };
  epistemicAssessment: {
    known: string[];
    implied: string[];
    unknown: string[];
    incrementalInfoScore: number;
  };
}

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  source: string;
  timestamp: string;
}

interface FetchedData {
  marketPrices: MarketData[];
  macroData: Record<string, number>;
  volatilityData: Record<string, number>;
  positioningData: Record<string, unknown>;
  fundingRates: Record<string, number>;
  openInterest: Record<string, number>;
  ohlcData: Record<string, unknown>;
  treasuryYields: Record<string, number>;
  cotData: Record<string, unknown>;
  fundamentals: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: CALL GPT-5.2 STRATEGIST
// ═══════════════════════════════════════════════════════════════════════════════

async function callStrategist(newsBody: string): Promise<StrategistOutput> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',  // veya gpt-5.2 mevcut olduğunda
      messages: [
        { role: 'system', content: NEWS_STRATEGIST_PROMPT },
        { role: 'user', content: newsBody }
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    throw new Error(`Strategist API error: ${await response.text()}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: FETCH & UPDATE DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function supabaseQuery(table: string, query: string = '') {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  return response.json();
}

async function supabaseUpsert(table: string, data: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Symbol'e göre hangi API'den çekeceğimizi belirle
function getAssetType(symbol: string): string {
  const upper = symbol.toUpperCase();
  
  if (upper.includes('USDT') || upper.includes('BTC') || upper.includes('ETH')) {
    return 'crypto';
  }
  if (upper.includes('USD') && upper.length === 6) {
    return 'forex';
  }
  if (['VIX', 'DXY', 'SPX', 'NDX', 'DJI'].includes(upper)) {
    return 'index';
  }
  if (['GOLD', 'SILVER', 'OIL', 'WTI', 'NATGAS'].includes(upper)) {
    return 'commodity';
  }
  return 'equity';
}

// Database'den cache'lenmiş veriyi al
async function getCachedMarketData(symbol: string): Promise<MarketData | null> {
  try {
    const data = await supabaseQuery(
      'market_data_cache',
      `?symbol=eq.${encodeURIComponent(symbol)}&order=fetched_at.desc&limit=1`
    );
    
    if (data && data.length > 0) {
      const cached = data[0];
      return {
        symbol: cached.symbol,
        price: cached.price,
        change: cached.change || 0,
        changePercent: cached.change_percent || 0,
        source: `${cached.source}_cached`,
        timestamp: cached.data_timestamp,
      };
    }
  } catch (error) {
    console.error(`Error getting cached data for ${symbol}:`, error);
  }
  return null;
}

// API'den veri çek ve database'e kaydet - RATE LIMIT DURUMUNDA CACHE KULLAN
async function fetchAndCacheMarketData(symbol: string): Promise<MarketData | null> {
  const assetType = getAssetType(symbol);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60000); // 1 dakika TTL

  try {
    let price = 0;
    let change = 0;
    let changePercent = 0;
    let source = '';

    if (assetType === 'crypto') {
      // Binance API
      const cleanSymbol = symbol.replace('BINANCE:', '').replace('/', '');
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${cleanSymbol}`);
      
      // Rate limit kontrolü (429) veya hata durumunda cache'e fallback
      if (response.status === 429 || !response.ok) {
        console.warn(`API rate limit or error for ${symbol}, falling back to cache`);
        return await getCachedMarketData(symbol);
      }
      
      const data = await response.json();
      price = parseFloat(data.lastPrice);
      change = parseFloat(data.priceChange);
      changePercent = parseFloat(data.priceChangePercent);
      source = 'binance';
    } else {
      // Yahoo Finance API
      const yahooSymbol = symbol.replace(':', '.').replace('NASDAQ:', '').replace('NYSE:', '');
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`);
      
      // Rate limit kontrolü (429) veya hata durumunda cache'e fallback
      if (response.status === 429 || !response.ok) {
        console.warn(`API rate limit or error for ${symbol}, falling back to cache`);
        return await getCachedMarketData(symbol);
      }
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result) {
        const meta = result.meta;
        price = meta.regularMarketPrice || 0;
        const prevClose = meta.previousClose || meta.chartPreviousClose || 0;
        change = price - prevClose;
        changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
        source = 'yahoo';
      }
    }

    if (price > 0) {
      const marketData: MarketData = {
        symbol,
        price,
        change,
        changePercent,
        source,
        timestamp: now.toISOString(),
      };

      // Database'e kaydet
      await supabaseUpsert('market_data_cache', {
        symbol,
        asset_type: assetType,
        source,
        price,
        change,
        change_percent: changePercent,
        data_timestamp: now.toISOString(),
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        raw_data: marketData,
      });

      return marketData;
    }
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    // Herhangi bir hata durumunda cache'e fallback
    console.warn(`Falling back to cache for ${symbol}`);
    return await getCachedMarketData(symbol);
  }

  // API'den veri alınamadıysa cache'e bak
  return await getCachedMarketData(symbol);
}

// Database'den cache'lenmiş macro verisini al
async function getCachedMacroData(indicator: string): Promise<number | null> {
  try {
    const data = await supabaseQuery(
      'macro_data_cache',
      `?indicator=eq.${encodeURIComponent(indicator)}&order=fetched_at.desc&limit=1`
    );
    
    if (data && data.length > 0) {
      return data[0].value;
    }
  } catch (error) {
    console.error(`Error getting cached macro data for ${indicator}:`, error);
  }
  return null;
}

// Macro verileri çek - RATE LIMIT DURUMUNDA CACHE KULLAN
async function fetchMacroData(indicators: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  for (const indicator of indicators) {
    const lower = indicator.toLowerCase();

    if (lower.includes('vix')) {
      // VIX from Yahoo
      try {
        const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d');
        if (response.status === 429 || !response.ok) {
          const cached = await getCachedMacroData('VIX');
          if (cached !== null) result['VIX'] = cached;
        } else {
          const data = await response.json();
          result['VIX'] = data.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
        }
      } catch {
        const cached = await getCachedMacroData('VIX');
        if (cached !== null) result['VIX'] = cached;
      }
    }

    if (lower.includes('fear') || lower.includes('greed')) {
      // Fear & Greed
      try {
        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        if (response.status === 429 || !response.ok) {
          const cached = await getCachedMacroData('FEAR_GREED');
          if (cached !== null) result['FEAR_GREED'] = cached;
        } else {
          const data = await response.json();
          result['FEAR_GREED'] = parseInt(data.data[0].value);
        }
      } catch {
        const cached = await getCachedMacroData('FEAR_GREED');
        if (cached !== null) result['FEAR_GREED'] = cached;
      }
    }

    if (lower.includes('dxy') || lower.includes('dollar')) {
      // DXY from Yahoo
      try {
        const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1d');
        if (response.status === 429 || !response.ok) {
          const cached = await getCachedMacroData('DXY');
          if (cached !== null) result['DXY'] = cached;
        } else {
          const data = await response.json();
          result['DXY'] = data.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
        }
      } catch {
        const cached = await getCachedMacroData('DXY');
        if (cached !== null) result['DXY'] = cached;
      }
    }
  }

  // Cache to database (sadece yeni veri varsa)
  for (const [key, value] of Object.entries(result)) {
    if (value > 0) {
      await supabaseUpsert('macro_data_cache', {
        indicator: key,
        category: 'macro',
        value,
        source: 'api',
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString(), // 5 min TTL
      });
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNDING RATE - Binance Perpetual
// ═══════════════════════════════════════════════════════════════════════════════

async function getCachedFundingRate(symbol: string): Promise<number | null> {
  try {
    const data = await supabaseQuery(
      'crypto_onchain_cache',
      `?symbol=eq.${encodeURIComponent(symbol)}&metric_type=eq.funding_rate&order=fetched_at.desc&limit=1`
    );
    if (data && data.length > 0) return data[0].value;
  } catch (error) {
    console.error(`Error getting cached funding rate for ${symbol}:`, error);
  }
  return null;
}

async function fetchAndCacheFundingRate(symbol: string): Promise<number | null> {
  const cleanSymbol = symbol.replace('BINANCE:', '').replace('/', '').toUpperCase();
  
  try {
    const response = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${cleanSymbol}&limit=1`);
    
    if (response.status === 429 || !response.ok) {
      console.warn(`Funding rate API error for ${symbol}, falling back to cache`);
      return await getCachedFundingRate(symbol);
    }
    
    const data = await response.json();
    if (data && data.length > 0) {
      const rate = parseFloat(data[0].fundingRate);
      
      await supabaseUpsert('crypto_onchain_cache', {
        symbol,
        metric_type: 'funding_rate',
        value: rate,
        source: 'binance',
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
      });
      
      return rate;
    }
  } catch (error) {
    console.error(`Error fetching funding rate for ${symbol}:`, error);
    return await getCachedFundingRate(symbol);
  }
  
  return await getCachedFundingRate(symbol);
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPEN INTEREST - Binance Futures
// ═══════════════════════════════════════════════════════════════════════════════

async function getCachedOpenInterest(symbol: string): Promise<number | null> {
  try {
    const data = await supabaseQuery(
      'crypto_onchain_cache',
      `?symbol=eq.${encodeURIComponent(symbol)}&metric_type=eq.open_interest&order=fetched_at.desc&limit=1`
    );
    if (data && data.length > 0) return data[0].value;
  } catch (error) {
    console.error(`Error getting cached OI for ${symbol}:`, error);
  }
  return null;
}

async function fetchAndCacheOpenInterest(symbol: string): Promise<number | null> {
  const cleanSymbol = symbol.replace('BINANCE:', '').replace('/', '').toUpperCase();
  
  try {
    const response = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${cleanSymbol}`);
    
    if (response.status === 429 || !response.ok) {
      console.warn(`OI API error for ${symbol}, falling back to cache`);
      return await getCachedOpenInterest(symbol);
    }
    
    const data = await response.json();
    if (data && data.openInterest) {
      const oi = parseFloat(data.openInterest);
      
      await supabaseUpsert('crypto_onchain_cache', {
        symbol,
        metric_type: 'open_interest',
        value: oi,
        source: 'binance',
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
      });
      
      return oi;
    }
  } catch (error) {
    console.error(`Error fetching OI for ${symbol}:`, error);
    return await getCachedOpenInterest(symbol);
  }
  
  return await getCachedOpenInterest(symbol);
}

// ═══════════════════════════════════════════════════════════════════════════════
// OHLC KLINES - Binance & Yahoo
// ═══════════════════════════════════════════════════════════════════════════════

interface OHLCData {
  symbol: string;
  interval: string;
  candles: Array<{
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  source: string;
}

async function getCachedOHLC(symbol: string, interval: string): Promise<OHLCData | null> {
  try {
    const data = await supabaseQuery(
      'ohlc_cache',
      `?symbol=eq.${encodeURIComponent(symbol)}&interval=eq.${interval}&order=fetched_at.desc&limit=1`
    );
    if (data && data.length > 0) {
      return {
        symbol: data[0].symbol,
        interval: data[0].interval,
        candles: data[0].candles || [],
        source: `${data[0].source}_cached`,
      };
    }
  } catch (error) {
    console.error(`Error getting cached OHLC for ${symbol}:`, error);
  }
  return null;
}

async function fetchAndCacheOHLC(symbol: string, interval: string = '1h', limit: number = 24): Promise<OHLCData | null> {
  const assetType = getAssetType(symbol);
  
  try {
    let candles: OHLCData['candles'] = [];
    let source = '';
    
    if (assetType === 'crypto') {
      const cleanSymbol = symbol.replace('BINANCE:', '').replace('/', '');
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`);
      
      if (response.status === 429 || !response.ok) {
        return await getCachedOHLC(symbol, interval);
      }
      
      const data = await response.json();
      candles = data.map((k: number[]) => ({
        openTime: k[0],
        open: parseFloat(String(k[1])),
        high: parseFloat(String(k[2])),
        low: parseFloat(String(k[3])),
        close: parseFloat(String(k[4])),
        volume: parseFloat(String(k[5])),
      }));
      source = 'binance';
    } else {
      const yahooSymbol = symbol.replace(':', '.').replace('NASDAQ:', '').replace('NYSE:', '');
      const yahooInterval = interval === '1h' ? '1h' : interval === '1d' ? '1d' : '1h';
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${yahooInterval}&range=7d`);
      
      if (response.status === 429 || !response.ok) {
        return await getCachedOHLC(symbol, interval);
      }
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result && result.timestamp) {
        const quotes = result.indicators?.quote?.[0];
        candles = result.timestamp.slice(-limit).map((t: number, i: number) => ({
          openTime: t * 1000,
          open: quotes?.open?.[i] || 0,
          high: quotes?.high?.[i] || 0,
          low: quotes?.low?.[i] || 0,
          close: quotes?.close?.[i] || 0,
          volume: quotes?.volume?.[i] || 0,
        }));
      }
      source = 'yahoo';
    }
    
    if (candles.length > 0) {
      const ohlcData: OHLCData = { symbol, interval, candles, source };
      
      await supabaseUpsert('ohlc_cache', {
        symbol,
        interval,
        candles,
        source,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString(),
      });
      
      return ohlcData;
    }
  } catch (error) {
    console.error(`Error fetching OHLC for ${symbol}:`, error);
    return await getCachedOHLC(symbol, interval);
  }
  
  return await getCachedOHLC(symbol, interval);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREASURY YIELDS - Yahoo Finance
// ═══════════════════════════════════════════════════════════════════════════════

async function getCachedTreasuryYield(tenor: string): Promise<number | null> {
  try {
    const data = await supabaseQuery(
      'treasury_yields_cache',
      `?tenor=eq.${encodeURIComponent(tenor)}&order=fetched_at.desc&limit=1`
    );
    if (data && data.length > 0) return data[0].yield_value;
  } catch (error) {
    console.error(`Error getting cached treasury yield for ${tenor}:`, error);
  }
  return null;
}

async function fetchAndCacheTreasuryYields(): Promise<Record<string, number>> {
  const yields: Record<string, number> = {};
  const tenors = [
    { name: '2Y', symbol: '^IRX' },   // 2-year approximation
    { name: '10Y', symbol: '^TNX' },  // 10-year
    { name: '30Y', symbol: '^TYX' },  // 30-year
  ];
  
  for (const tenor of tenors) {
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${tenor.symbol}?interval=1d&range=1d`);
      
      if (response.status === 429 || !response.ok) {
        const cached = await getCachedTreasuryYield(tenor.name);
        if (cached !== null) yields[tenor.name] = cached;
        continue;
      }
      
      const data = await response.json();
      const yieldValue = data.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
      
      if (yieldValue > 0) {
        yields[tenor.name] = yieldValue;
        
        await supabaseUpsert('treasury_yields_cache', {
          tenor: tenor.name,
          yield_value: yieldValue,
          source: 'yahoo',
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour TTL
        });
      }
    } catch {
      const cached = await getCachedTreasuryYield(tenor.name);
      if (cached !== null) yields[tenor.name] = cached;
    }
  }
  
  return yields;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COT DATA - CFTC
// ═══════════════════════════════════════════════════════════════════════════════

interface COTData {
  market: string;
  commercialLong: number;
  commercialShort: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  reportDate: string;
}

async function getCachedCOT(market: string): Promise<COTData | null> {
  try {
    const data = await supabaseQuery(
      'cot_data_cache',
      `?market=ilike.%${encodeURIComponent(market)}%&order=report_date.desc&limit=1`
    );
    if (data && data.length > 0) {
      return {
        market: data[0].market,
        commercialLong: data[0].commercial_long || 0,
        commercialShort: data[0].commercial_short || 0,
        nonCommercialLong: data[0].non_commercial_long || 0,
        nonCommercialShort: data[0].non_commercial_short || 0,
        reportDate: data[0].report_date,
      };
    }
  } catch (error) {
    console.error(`Error getting cached COT for ${market}:`, error);
  }
  return null;
}

async function fetchAndCacheCOT(market: string): Promise<COTData | null> {
  // CFTC data is weekly, so we primarily use cache with long TTL
  // API fetch is only for periodic updates
  try {
    // Try cache first since COT is weekly data
    const cached = await getCachedCOT(market);
    if (cached) {
      // Check if data is less than 7 days old
      const reportDate = new Date(cached.reportDate);
      const daysSinceReport = (Date.now() - reportDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceReport < 7) {
        return cached;
      }
    }
    
    // Fetch new data from CFTC
    const response = await fetch(
      `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?$where=market_and_exchange_names like '%${market}%'&$order=report_date_as_yyyy_mm_dd DESC&$limit=1`
    );
    
    if (response.status === 429 || !response.ok) {
      return cached;
    }
    
    const data = await response.json();
    if (data && data.length > 0) {
      const row = data[0];
      const cotData: COTData = {
        market: row.market_and_exchange_names || market,
        commercialLong: parseInt(row.comm_positions_long_all) || 0,
        commercialShort: parseInt(row.comm_positions_short_all) || 0,
        nonCommercialLong: parseInt(row.noncomm_positions_long_all) || 0,
        nonCommercialShort: parseInt(row.noncomm_positions_short_all) || 0,
        reportDate: row.report_date_as_yyyy_mm_dd || new Date().toISOString(),
      };
      
      await supabaseUpsert('cot_data_cache', {
        market: cotData.market,
        commercial_long: cotData.commercialLong,
        commercial_short: cotData.commercialShort,
        non_commercial_long: cotData.nonCommercialLong,
        non_commercial_short: cotData.nonCommercialShort,
        report_date: cotData.reportDate,
        source: 'cftc',
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 day TTL
      });
      
      return cotData;
    }
  } catch (error) {
    console.error(`Error fetching COT for ${market}:`, error);
  }
  
  return await getCachedCOT(market);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPANY FUNDAMENTALS - Finnhub
// ═══════════════════════════════════════════════════════════════════════════════

interface FundamentalsData {
  symbol: string;
  name: string;
  marketCap: number;
  peRatio: number;
  eps: number;
  roe: number;
  recommendations: { buy: number; hold: number; sell: number };
}

async function getCachedFundamentals(symbol: string): Promise<FundamentalsData | null> {
  try {
    const data = await supabaseQuery(
      'fundamentals_cache',
      `?symbol=eq.${encodeURIComponent(symbol)}&order=fetched_at.desc&limit=1`
    );
    if (data && data.length > 0) {
      return {
        symbol: data[0].symbol,
        name: data[0].name || '',
        marketCap: data[0].market_cap || 0,
        peRatio: data[0].pe_ratio || 0,
        eps: data[0].eps || 0,
        roe: data[0].roe || 0,
        recommendations: data[0].recommendations || { buy: 0, hold: 0, sell: 0 },
      };
    }
  } catch (error) {
    console.error(`Error getting cached fundamentals for ${symbol}:`, error);
  }
  return null;
}

async function fetchAndCacheFundamentals(symbol: string): Promise<FundamentalsData | null> {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  if (!FINNHUB_KEY) {
    return await getCachedFundamentals(symbol);
  }
  
  try {
    // Fetch profile and metrics in parallel
    const [profileRes, metricsRes, recsRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_KEY}`),
      fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${FINNHUB_KEY}`),
    ]);
    
    if (profileRes.status === 429 || metricsRes.status === 429) {
      return await getCachedFundamentals(symbol);
    }
    
    const profile = profileRes.ok ? await profileRes.json() : {};
    const metrics = metricsRes.ok ? await metricsRes.json() : {};
    const recs = recsRes.ok ? await recsRes.json() : [];
    
    const m = metrics.metric || {};
    const latestRec = recs[0] || {};
    
    const fundamentals: FundamentalsData = {
      symbol,
      name: profile.name || '',
      marketCap: profile.marketCapitalization || 0,
      peRatio: m.peBasicExclExtraTTM || 0,
      eps: m.epsBasicExclExtraItemsTTM || 0,
      roe: m.roeTTM || 0,
      recommendations: {
        buy: (latestRec.strongBuy || 0) + (latestRec.buy || 0),
        hold: latestRec.hold || 0,
        sell: (latestRec.sell || 0) + (latestRec.strongSell || 0),
      },
    };
    
    await supabaseUpsert('fundamentals_cache', {
      symbol,
      name: fundamentals.name,
      market_cap: fundamentals.marketCap,
      pe_ratio: fundamentals.peRatio,
      eps: fundamentals.eps,
      roe: fundamentals.roe,
      recommendations: fundamentals.recommendations,
      source: 'finnhub',
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour TTL
    });
    
    return fundamentals;
  } catch (error) {
    console.error(`Error fetching fundamentals for ${symbol}:`, error);
    return await getCachedFundamentals(symbol);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DATA FETCHER - Strategist'in istediği tüm verileri çek
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchRequiredData(requiredData: StrategistOutput['requiredData']): Promise<FetchedData> {
  // Market prices
  const marketPrices: MarketData[] = [];
  for (const item of requiredData.marketPrices) {
    const data = await fetchAndCacheMarketData(item.symbol);
    if (data) marketPrices.push(data);
  }

  // Macro data
  const macroData = await fetchMacroData(requiredData.macroInputs);

  // Volatility
  const volatilityData: Record<string, number> = {};
  if (requiredData.volatilityMetrics.length > 0) {
    const vixData = await fetchMacroData(['VIX']);
    Object.assign(volatilityData, vixData);
  }

  // Funding Rates - crypto sembolleri için
  const fundingRates: Record<string, number> = {};
  for (const item of requiredData.marketPrices) {
    if (getAssetType(item.symbol) === 'crypto') {
      const rate = await fetchAndCacheFundingRate(item.symbol);
      if (rate !== null) fundingRates[item.symbol] = rate;
    }
  }

  // Open Interest - crypto sembolleri için
  const openInterest: Record<string, number> = {};
  for (const item of requiredData.marketPrices) {
    if (getAssetType(item.symbol) === 'crypto') {
      const oi = await fetchAndCacheOpenInterest(item.symbol);
      if (oi !== null) openInterest[item.symbol] = oi;
    }
  }

  // OHLC Data - timeWindows'a göre çek
  const ohlcData: Record<string, unknown> = {};
  for (const item of requiredData.marketPrices) {
    // En az 1 saatlik veri çek
    const ohlc = await fetchAndCacheOHLC(item.symbol, '1h', 24);
    if (ohlc) ohlcData[item.symbol] = ohlc;
  }

  // Treasury Yields - macro inputs içinde treasury/yield/bond varsa
  let treasuryYields: Record<string, number> = {};
  const needsTreasury = requiredData.macroInputs.some(
    m => m.toLowerCase().includes('treasury') || 
         m.toLowerCase().includes('yield') || 
         m.toLowerCase().includes('bond')
  );
  if (needsTreasury) {
    treasuryYields = await fetchAndCacheTreasuryYields();
  }

  // COT/Positioning Data - positioningProxies'e göre çek
  const cotData: Record<string, unknown> = {};
  for (const proxy of requiredData.positioningProxies) {
    // COT market name mapping
    let cotMarket = proxy;
    if (proxy.toLowerCase().includes('btc') || proxy.toLowerCase().includes('bitcoin')) {
      cotMarket = 'BITCOIN';
    } else if (proxy.toLowerCase().includes('gold')) {
      cotMarket = 'GOLD';
    } else if (proxy.toLowerCase().includes('oil') || proxy.toLowerCase().includes('crude')) {
      cotMarket = 'CRUDE OIL';
    } else if (proxy.toLowerCase().includes('euro') || proxy.toLowerCase().includes('eur')) {
      cotMarket = 'EURO FX';
    }
    
    const cot = await fetchAndCacheCOT(cotMarket);
    if (cot) cotData[proxy] = cot;
  }

  // Company Fundamentals - equity sembolleri için
  const fundamentals: Record<string, unknown> = {};
  for (const item of requiredData.marketPrices) {
    if (getAssetType(item.symbol) === 'equity') {
      const fund = await fetchAndCacheFundamentals(item.symbol);
      if (fund) fundamentals[item.symbol] = fund;
    }
  }

  return {
    marketPrices,
    macroData,
    volatilityData,
    positioningData: cotData,
    fundingRates,
    openInterest,
    ohlcData,
    treasuryYields,
    cotData,
    fundamentals,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: CALL GPT-4o EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

async function callExecutor(
  newsBody: string,
  strategistOutput: StrategistOutput,
  fetchedData: FetchedData
): Promise<unknown> {
  const executorInput = `
## NEWS CONTENT
${newsBody}

---

## STRATEGIST INSTRUCTIONS (from GPT-5.2)
${JSON.stringify(strategistOutput, null, 2)}

---

## MARKET DATA (fetched from database)
${JSON.stringify(fetchedData, null, 2)}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: NEWS_EXECUTOR_PROMPT },
        { role: 'user', content: executorInput }
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    throw new Error(`Executor API error: ${await response.text()}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeNews(news: NewsInput) {
  const startTime = Date.now();

  // Step 1: GPT-5.2 Strategist
  console.log('[Pipeline] Step 1: Calling Strategist...');
  const strategistOutput = await callStrategist(news.body);
  const strategistTime = Date.now() - startTime;
  console.log(`[Pipeline] Strategist completed in ${strategistTime}ms`);

  // Step 2: Fetch & cache required data
  console.log('[Pipeline] Step 2: Fetching required data...');
  const fetchedData = await fetchRequiredData(strategistOutput.requiredData);
  const dataFetchTime = Date.now() - startTime - strategistTime;
  console.log(`[Pipeline] Data fetch completed in ${dataFetchTime}ms`);

  // Step 3: GPT-4o Executor
  console.log('[Pipeline] Step 3: Calling Executor...');
  const executorOutput = await callExecutor(news.body, strategistOutput, fetchedData);
  const executorTime = Date.now() - startTime - strategistTime - dataFetchTime;
  console.log(`[Pipeline] Executor completed in ${executorTime}ms`);

  const totalTime = Date.now() - startTime;

  return {
    newsId: news.id,
    strategist: strategistOutput,
    data: fetchedData,
    analysis: executorOutput,
    timing: {
      strategistMs: strategistTime,
      dataFetchMs: dataFetchTime,
      executorMs: executorTime,
      totalMs: totalTime,
    },
    meta: {
      pipeline: 'news-analysis-v1',
      strategistModel: 'gpt-4o', // gpt-5.2 when available
      executorModel: 'gpt-4o',
      timestamp: new Date().toISOString(),
    }
  };
}

export { callStrategist, fetchRequiredData, callExecutor };
