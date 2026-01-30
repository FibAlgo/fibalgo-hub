/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 MARKET DATA FETCHER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Real-time and historical market prices for:
 * - Equities (stocks)
 * - Forex
 * - Commodities
 * - Crypto
 * - Indices
 * 
 * Sources: Finnhub, Yahoo Finance, Binance, Polygon/Massive
 */

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  timestamp: number;
  source: string;
}

export interface IntradayCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IntradayHistory {
  symbol: string;
  interval: string;
  candles: IntradayCandle[];
  source: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINNHUB - Stocks & Forex
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchFinnhubQuote(symbol: string): Promise<MarketPrice | null> {
  if (!FINNHUB_API_KEY) return null;
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data.c) return null; // No current price
    
    return {
      symbol,
      price: data.c,
      change: data.d || 0,
      changePercent: data.dp || 0,
      high: data.h || data.c,
      low: data.l || data.c,
      open: data.o || data.c,
      previousClose: data.pc || data.c,
      volume: 0, // Finnhub quote doesn't include volume
      timestamp: data.t || Date.now(),
      source: 'finnhub'
    };
  } catch (error) {
    console.error('Finnhub quote error:', error);
    return null;
  }
}

export async function fetchFinnhubCandles(
  symbol: string, 
  resolution: '1' | '5' | '15' | '30' | '60' | 'D' = '5',
  from?: number,
  to?: number
): Promise<IntradayHistory | null> {
  if (!FINNHUB_API_KEY) return null;
  
  const now = Math.floor(Date.now() / 1000);
  const defaultFrom = now - 86400; // 24 hours ago
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from || defaultFrom}&to=${to || now}&token=${FINNHUB_API_KEY}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.s !== 'ok' || !data.c) return null;
    
    const candles: IntradayCandle[] = data.t.map((t: number, i: number) => ({
      timestamp: t * 1000,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i]
    }));
    
    return {
      symbol,
      interval: resolution,
      candles,
      source: 'finnhub'
    };
  } catch (error) {
    console.error('Finnhub candles error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// YAHOO FINANCE - Stocks, ETFs, Indices
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchYahooQuote(symbol: string): Promise<MarketPrice | null> {
  try {
    // Convert TradingView format to Yahoo format
    let yahooSymbol = symbol;
    if (symbol.includes(':')) {
      const [exchange, ticker] = symbol.split(':');
      yahooSymbol = ticker;
      
      // Handle special cases
      if (exchange === 'FX') yahooSymbol = `${ticker}=X`;
      if (exchange === 'COMEX') yahooSymbol = `${ticker.replace(/\d+!$/, '')}=F`;
      if (exchange === 'NYMEX') yahooSymbol = `${ticker.replace(/\d+!$/, '')}=F`;
      if (ticker === 'SPX') yahooSymbol = '^GSPC';
      if (ticker === 'DJI') yahooSymbol = '^DJI';
      if (ticker === 'VIX') yahooSymbol = '^VIX';
      if (ticker === 'DXY') yahooSymbol = 'DX-Y.NYB';
    }
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.meta?.regularMarketPrice) return null;
    
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    const prevClose = meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice;
    
    return {
      symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - prevClose,
      changePercent: ((meta.regularMarketPrice - prevClose) / prevClose) * 100,
      high: meta.regularMarketDayHigh || meta.regularMarketPrice,
      low: meta.regularMarketDayLow || meta.regularMarketPrice,
      open: meta.regularMarketOpen || meta.regularMarketPrice,
      previousClose: prevClose,
      volume: meta.regularMarketVolume || 0,
      timestamp: Date.now(),
      source: 'yahoo'
    };
  } catch (error) {
    console.error('Yahoo quote error:', error);
    return null;
  }
}

export async function fetchYahooIntraday(
  symbol: string,
  interval: '1m' | '5m' | '15m' | '30m' | '1h' = '5m',
  range: '1d' | '5d' = '1d'
): Promise<IntradayHistory | null> {
  try {
    let yahooSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null;
    
    const quote = result.indicators.quote[0];
    const candles: IntradayCandle[] = result.timestamp.map((t: number, i: number) => ({
      timestamp: t * 1000,
      open: quote.open[i] || 0,
      high: quote.high[i] || 0,
      low: quote.low[i] || 0,
      close: quote.close[i] || 0,
      volume: quote.volume[i] || 0
    })).filter((c: IntradayCandle) => c.close > 0);
    
    return {
      symbol,
      interval,
      candles,
      source: 'yahoo'
    };
  } catch (error) {
    console.error('Yahoo intraday error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BINANCE - Crypto
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchBinanceQuote(symbol: string): Promise<MarketPrice | null> {
  try {
    // Convert to Binance format
    let binanceSymbol = symbol;
    if (symbol.includes(':')) {
      binanceSymbol = symbol.split(':')[1];
    }
    binanceSymbol = binanceSymbol.replace('/', '').toUpperCase();
    if (!binanceSymbol.endsWith('USDT') && !binanceSymbol.endsWith('BUSD')) {
      binanceSymbol = `${binanceSymbol}USDT`;
    }
    
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      symbol,
      price: parseFloat(data.lastPrice),
      change: parseFloat(data.priceChange),
      changePercent: parseFloat(data.priceChangePercent),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      open: parseFloat(data.openPrice),
      previousClose: parseFloat(data.prevClosePrice),
      volume: parseFloat(data.volume),
      timestamp: data.closeTime,
      source: 'binance'
    };
  } catch (error) {
    console.error('Binance quote error:', error);
    return null;
  }
}

export async function fetchBinanceKlines(
  symbol: string,
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' = '5m',
  limit: number = 288 // 24 hours for 5m
): Promise<IntradayHistory | null> {
  try {
    let binanceSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
    binanceSymbol = binanceSymbol.replace('/', '').toUpperCase();
    if (!binanceSymbol.endsWith('USDT')) binanceSymbol = `${binanceSymbol}USDT`;
    
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    const candles: IntradayCandle[] = data.map((k: any[]) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
    
    return {
      symbol,
      interval,
      candles,
      source: 'binance'
    };
  } catch (error) {
    console.error('Binance klines error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL FETCHER - Auto-detects asset type
// ═══════════════════════════════════════════════════════════════════════════════

export type AssetType = 'crypto' | 'stock' | 'forex' | 'commodity' | 'index' | 'unknown';

export function detectAssetType(symbol: string): AssetType {
  const upper = symbol.toUpperCase();
  
  // Crypto detection
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT', 'SHIB', 'LTC', 'USDT', 'USDC'];
  if (upper.includes('BINANCE:') || cryptoSymbols.some(c => upper.includes(c))) {
    return 'crypto';
  }
  
  // Forex detection
  const forexPairs = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
  if (upper.includes('FX:') || forexPairs.filter(f => upper.includes(f)).length >= 2) {
    return 'forex';
  }
  
  // Commodity detection
  if (upper.includes('COMEX:') || upper.includes('NYMEX:') || 
      ['GOLD', 'SILVER', 'OIL', 'CRUDE', 'GC', 'SI', 'CL', 'NG'].some(c => upper.includes(c))) {
    return 'commodity';
  }
  
  // Index detection
  if (['SPX', 'SPY', 'QQQ', 'DJI', 'VIX', 'DXY', 'NDX'].some(i => upper.includes(i))) {
    return 'index';
  }
  
  // Stock detection (default for exchange prefixes)
  if (upper.includes('NASDAQ:') || upper.includes('NYSE:') || upper.includes('AMEX:')) {
    return 'stock';
  }
  
  return 'stock'; // Default to stock
}

export async function fetchQuote(symbol: string): Promise<MarketPrice | null> {
  const assetType = detectAssetType(symbol);
  
  switch (assetType) {
    case 'crypto':
      return fetchBinanceQuote(symbol);
    
    case 'stock':
    case 'index':
    case 'forex':
    case 'commodity':
      // Try Yahoo first, fallback to Finnhub
      const yahooResult = await fetchYahooQuote(symbol);
      if (yahooResult) return yahooResult;
      
      const ticker = symbol.includes(':') ? symbol.split(':')[1] : symbol;
      return fetchFinnhubQuote(ticker);
    
    default:
      return fetchYahooQuote(symbol);
  }
}

export async function fetchIntraday(
  symbol: string,
  interval: '1m' | '5m' | '15m' | '30m' | '1h' = '5m'
): Promise<IntradayHistory | null> {
  const assetType = detectAssetType(symbol);
  
  switch (assetType) {
    case 'crypto':
      return fetchBinanceKlines(symbol, interval);
    
    default:
      return fetchYahooIntraday(symbol, interval);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH FETCHER - Multiple symbols at once
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchMultipleQuotes(symbols: string[]): Promise<Map<string, MarketPrice>> {
  const results = new Map<string, MarketPrice>();
  
  // Group by asset type for efficient fetching
  const cryptoSymbols = symbols.filter(s => detectAssetType(s) === 'crypto');
  const otherSymbols = symbols.filter(s => detectAssetType(s) !== 'crypto');
  
  // Fetch crypto in batch from Binance
  if (cryptoSymbols.length > 0) {
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (response.ok) {
        const allTickers = await response.json() as Array<{
          symbol: string;
          lastPrice: string;
          priceChange: string;
          priceChangePercent: string;
          highPrice: string;
          lowPrice: string;
          openPrice: string;
          prevClosePrice: string;
          volume: string;
          closeTime: number;
        }>;
        const tickerMap = new Map(allTickers.map((t) => [t.symbol, t]));
        
        for (const symbol of cryptoSymbols) {
          let binanceSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
          binanceSymbol = binanceSymbol.replace('/', '').toUpperCase();
          if (!binanceSymbol.endsWith('USDT')) binanceSymbol = `${binanceSymbol}USDT`;
          
          const data = tickerMap.get(binanceSymbol);
          if (data) {
            results.set(symbol, {
              symbol,
              price: parseFloat(data.lastPrice),
              change: parseFloat(data.priceChange),
              changePercent: parseFloat(data.priceChangePercent),
              high: parseFloat(data.highPrice),
              low: parseFloat(data.lowPrice),
              open: parseFloat(data.openPrice),
              previousClose: parseFloat(data.prevClosePrice),
              volume: parseFloat(data.volume),
              timestamp: data.closeTime,
              source: 'binance'
            });
          }
        }
      }
    } catch (error) {
      console.error('Batch crypto fetch error:', error);
    }
  }
  
  // Fetch others in parallel (with rate limiting)
  const chunks = [];
  for (let i = 0; i < otherSymbols.length; i += 5) {
    chunks.push(otherSymbols.slice(i, i + 5));
  }
  
  for (const chunk of chunks) {
    const promises = chunk.map(async (symbol) => {
      const quote = await fetchQuote(symbol);
      if (quote) results.set(symbol, quote);
    });
    await Promise.all(promises);
    
    // Small delay between chunks to avoid rate limits
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  return results;
}
