/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🪙 COINGECKO API - Kapsamlı Crypto Verileri
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ücretsiz API - Rate limit: 50 calls/minute
 * API Key gerektirmez!
 * 
 * Veriler:
 * - Price, market cap, volume
 * - Historical prices (1y+)
 * - Global market data
 * - Trending coins
 * - Exchange data
 * - DeFi TVL
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  circulating_supply: number;
  total_supply: number;
  last_updated: string;
}

export interface GlobalMarketData {
  total_market_cap: number;
  total_volume_24h: number;
  btc_dominance: number;
  eth_dominance: number;
  market_cap_change_24h: number;
  active_cryptocurrencies: number;
  markets: number;
  defi_market_cap: number;
  defi_volume_24h: number;
}

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  price_btc: number;
  score: number;
}

export interface CoinOHLC {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ExchangeInfo {
  id: string;
  name: string;
  trust_score: number;
  trade_volume_24h_btc: number;
  country: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASE FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

async function geckoFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${COINGECKO_BASE}${endpoint}`, {
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 60 } // 1 minute cache
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn('CoinGecko rate limited');
      }
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`CoinGecko API error for ${endpoint}:`, error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE DATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current prices for multiple coins
 */
export async function getCoinPrices(
  coinIds: string[],
  currency: string = 'usd'
): Promise<CoinPrice[]> {
  const ids = coinIds.join(',');
  const data = await geckoFetch<CoinPrice[]>(
    `/coins/markets?vs_currency=${currency}&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=7d`
  );
  return data || [];
}

/**
 * Get top N coins by market cap
 */
export async function getTopCoins(
  limit: number = 100,
  currency: string = 'usd'
): Promise<CoinPrice[]> {
  const data = await geckoFetch<CoinPrice[]>(
    `/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=7d`
  );
  return data || [];
}

/**
 * Simple price lookup
 */
export async function getSimplePrice(
  coinIds: string[],
  currencies: string[] = ['usd']
): Promise<Record<string, Record<string, number>> | null> {
  const ids = coinIds.join(',');
  const vs = currencies.join(',');
  return geckoFetch(`/simple/price?ids=${ids}&vs_currencies=${vs}&include_24hr_change=true&include_market_cap=true`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORICAL DATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get OHLC data for charting
 * @param days - 1, 7, 14, 30, 90, 180, 365, max
 */
export async function getCoinOHLC(
  coinId: string,
  days: number = 30,
  currency: string = 'usd'
): Promise<CoinOHLC[]> {
  const data = await geckoFetch<number[][]>(
    `/coins/${coinId}/ohlc?vs_currency=${currency}&days=${days}`
  );
  
  if (!data) return [];
  
  return data.map(candle => ({
    timestamp: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4]
  }));
}

/**
 * Get historical prices (daily)
 */
export async function getCoinHistory(
  coinId: string,
  days: number = 365,
  currency: string = 'usd'
): Promise<{ timestamp: number; price: number; volume: number; marketCap: number }[]> {
  const data = await geckoFetch<{
    prices: number[][];
    market_caps: number[][];
    total_volumes: number[][];
  }>(`/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}`);
  
  if (!data) return [];
  
  return data.prices.map((price, i) => ({
    timestamp: price[0],
    price: price[1],
    volume: data.total_volumes[i]?.[1] || 0,
    marketCap: data.market_caps[i]?.[1] || 0
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL MARKET DATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get global crypto market stats
 */
export async function getGlobalMarketData(): Promise<GlobalMarketData | null> {
  const data = await geckoFetch<{ data: any }>('/global');
  
  if (!data?.data) return null;
  
  const d = data.data;
  return {
    total_market_cap: d.total_market_cap?.usd || 0,
    total_volume_24h: d.total_volume?.usd || 0,
    btc_dominance: d.market_cap_percentage?.btc || 0,
    eth_dominance: d.market_cap_percentage?.eth || 0,
    market_cap_change_24h: d.market_cap_change_percentage_24h_usd || 0,
    active_cryptocurrencies: d.active_cryptocurrencies || 0,
    markets: d.markets || 0,
    defi_market_cap: 0, // Separate endpoint
    defi_volume_24h: 0
  };
}

/**
 * Get DeFi market data
 */
export async function getDefiData(): Promise<{
  defi_market_cap: number;
  defi_volume_24h: number;
  defi_dominance: number;
  top_coin: string;
} | null> {
  const data = await geckoFetch<{ data: any }>('/global/decentralized_finance_defi');
  
  if (!data?.data) return null;
  
  return {
    defi_market_cap: parseFloat(data.data.defi_market_cap || '0'),
    defi_volume_24h: parseFloat(data.data.trading_volume_24h || '0'),
    defi_dominance: parseFloat(data.data.defi_dominance || '0'),
    top_coin: data.data.top_coin_name || 'Unknown'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRENDING & SENTIMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get trending coins (last 24h)
 */
export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  const data = await geckoFetch<{ coins: { item: any }[] }>('/search/trending');
  
  if (!data?.coins) return [];
  
  return data.coins.map(c => ({
    id: c.item.id,
    name: c.item.name,
    symbol: c.item.symbol,
    market_cap_rank: c.item.market_cap_rank,
    price_btc: c.item.price_btc,
    score: c.item.score
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCHANGE DATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get top exchanges by trust score
 */
export async function getTopExchanges(limit: number = 10): Promise<ExchangeInfo[]> {
  const data = await geckoFetch<any[]>(`/exchanges?per_page=${limit}`);
  
  if (!data) return [];
  
  return data.map(e => ({
    id: e.id,
    name: e.name,
    trust_score: e.trust_score || 0,
    trade_volume_24h_btc: e.trade_volume_24h_btc || 0,
    country: e.country || 'Unknown'
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// COIN ID MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

export const COIN_IDS = {
  // Major
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  
  // Stablecoins
  USDT: 'tether',
  USDC: 'usd-coin',
  DAI: 'dai',
  BUSD: 'binance-usd',
  
  // DeFi
  AAVE: 'aave',
  MKR: 'maker',
  CRV: 'curve-dao-token',
  LDO: 'lido-dao',
  
  // Layer 2
  ARB: 'arbitrum',
  OP: 'optimism',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CryptoMarketSnapshot {
  global: GlobalMarketData;
  btc: CoinPrice;
  eth: CoinPrice;
  trending: TrendingCoin[];
  defi: {
    defi_market_cap: number;
    defi_dominance: number;
  };
  sentiment: {
    greed: number; // from alt.me
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  timestamp: number;
}

export async function getCryptoMarketSnapshot(): Promise<CryptoMarketSnapshot | null> {
  try {
    const [global, prices, trending, defi] = await Promise.all([
      getGlobalMarketData(),
      getCoinPrices(['bitcoin', 'ethereum']),
      getTrendingCoins(),
      getDefiData()
    ]);
    
    if (!global || prices.length < 2) return null;
    
    const btc = prices.find(p => p.id === 'bitcoin')!;
    const eth = prices.find(p => p.id === 'ethereum')!;
    
    // Determine sentiment from price changes
    const avgChange = (btc.price_change_percentage_24h + eth.price_change_percentage_24h) / 2;
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (avgChange > 3) trend = 'bullish';
    if (avgChange < -3) trend = 'bearish';
    
    return {
      global,
      btc,
      eth,
      trending: trending.slice(0, 5),
      defi: {
        defi_market_cap: defi?.defi_market_cap || 0,
        defi_dominance: defi?.defi_dominance || 0
      },
      sentiment: {
        greed: 50, // Would need to fetch from alternative.me
        trend
      },
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Crypto snapshot error:', error);
    return null;
  }
}
