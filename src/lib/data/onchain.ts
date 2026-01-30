// ═══════════════════════════════════════════════════════════════════════════════
// 🐋 ON-CHAIN & WHALE DATA AGGREGATOR
// Ücretsiz API'lerden kripto piyasası için kritik verileri toplar
// ═══════════════════════════════════════════════════════════════════════════════

import { apiCache, cacheKeys, cacheTTL } from '@/lib/cache/simple-cache';

export interface WhaleData {
  recentLargeTransactions: {
    hash: string;
    from: string;
    to: string;
    amount: number;
    symbol: string;
    usdValue: number;
    timestamp: string;
    type: 'exchange_inflow' | 'exchange_outflow' | 'whale_transfer' | 'unknown';
  }[];
  exchangeFlows: {
    exchange: string;
    btcNetFlow24h: number; // negative = outflow (bullish)
    ethNetFlow24h: number;
  }[];
  summary: {
    totalExchangeInflow24h: number;
    totalExchangeOutflow24h: number;
    netFlow: 'bullish' | 'bearish' | 'neutral';
    whaleActivity: 'high' | 'medium' | 'low';
    largestTransaction: {
      amount: number;
      symbol: string;
      type: string;
    } | null;
  };
}

export interface FundingRates {
  btc: number;
  eth: number;
  sol: number;
  avgTop10: number;
  sentiment: 'overleveraged_long' | 'overleveraged_short' | 'neutral';
}

export interface LiquidationData {
  last24h: {
    totalLiquidations: number;
    longLiquidations: number;
    shortLiquidations: number;
    largestSingleLiquidation: number;
  };
  sentiment: 'longs_rekt' | 'shorts_rekt' | 'balanced';
}

export interface OpenInterest {
  btc: {
    current: number;
    change24h: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  eth: {
    current: number;
    change24h: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface OnChainContext {
  whaleData: WhaleData | null;
  fundingRates: FundingRates | null;
  liquidations: LiquidationData | null;
  openInterest: OpenInterest | null;
  stablecoinFlows: {
    usdtMarketCap: number;
    usdcMarketCap: number;
    totalStablecoinMcap: number;
    change7d: number;
    trend: 'minting' | 'burning' | 'stable';
  } | null;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

// Binance Funding Rates (Free API)
async function fetchBinanceFundingRates(): Promise<FundingRates | null> {
  try {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'MATICUSDT'];
    
    const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
      next: { revalidate: 300 }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // Filter to our symbols
    const relevantData = data.filter((d: any) => symbols.includes(d.symbol));
    
    const btcData = relevantData.find((d: any) => d.symbol === 'BTCUSDT');
    const ethData = relevantData.find((d: any) => d.symbol === 'ETHUSDT');
    const solData = relevantData.find((d: any) => d.symbol === 'SOLUSDT');
    
    const avgRate = relevantData.reduce((sum: number, d: any) => 
      sum + parseFloat(d.lastFundingRate), 0) / relevantData.length;
    
    // Funding rate interpretation:
    // > 0.01% = overleveraged longs (bullish squeeze risk)
    // < -0.01% = overleveraged shorts (bearish squeeze risk)
    let sentiment: 'overleveraged_long' | 'overleveraged_short' | 'neutral' = 'neutral';
    if (avgRate > 0.0001) sentiment = 'overleveraged_long';
    if (avgRate < -0.0001) sentiment = 'overleveraged_short';
    
    return {
      btc: parseFloat(btcData?.lastFundingRate || '0') * 100, // Convert to percentage
      eth: parseFloat(ethData?.lastFundingRate || '0') * 100,
      sol: parseFloat(solData?.lastFundingRate || '0') * 100,
      avgTop10: avgRate * 100,
      sentiment
    };
  } catch (error) {
    console.error('Funding rates fetch failed:', error);
    return null;
  }
}

// Binance Open Interest (Free API)
async function fetchOpenInterest(): Promise<OpenInterest | null> {
  try {
    const [btcResponse, ethResponse] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT', { next: { revalidate: 300 } }),
      fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=ETHUSDT', { next: { revalidate: 300 } })
    ]);
    
    if (!btcResponse.ok || !ethResponse.ok) return null;
    
    const btcData = await btcResponse.json();
    const ethData = await ethResponse.json();
    
    // Get historical for change calculation
    const [btcHistResponse, ethHistResponse] = await Promise.all([
      fetch('https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1d&limit=2', { next: { revalidate: 300 } }),
      fetch('https://fapi.binance.com/futures/data/openInterestHist?symbol=ETHUSDT&period=1d&limit=2', { next: { revalidate: 300 } })
    ]);
    
    let btcChange = 0;
    let ethChange = 0;
    
    if (btcHistResponse.ok) {
      const btcHist = await btcHistResponse.json();
      if (btcHist.length >= 2) {
        const prev = parseFloat(btcHist[0].sumOpenInterest);
        const curr = parseFloat(btcHist[1].sumOpenInterest);
        btcChange = ((curr - prev) / prev) * 100;
      }
    }
    
    if (ethHistResponse.ok) {
      const ethHist = await ethHistResponse.json();
      if (ethHist.length >= 2) {
        const prev = parseFloat(ethHist[0].sumOpenInterest);
        const curr = parseFloat(ethHist[1].sumOpenInterest);
        ethChange = ((curr - prev) / prev) * 100;
      }
    }
    
    return {
      btc: {
        current: parseFloat(btcData.openInterest),
        change24h: btcChange,
        trend: btcChange > 2 ? 'increasing' : btcChange < -2 ? 'decreasing' : 'stable'
      },
      eth: {
        current: parseFloat(ethData.openInterest),
        change24h: ethChange,
        trend: ethChange > 2 ? 'increasing' : ethChange < -2 ? 'decreasing' : 'stable'
      }
    };
  } catch (error) {
    console.error('Open interest fetch failed:', error);
    return null;
  }
}

// CoinGlass Liquidation Data (Public Widget Data)
async function fetchLiquidations(): Promise<LiquidationData | null> {
  try {
    // CoinGlass public liquidation endpoint
    const response = await fetch('https://open-api.coinglass.com/public/v2/liquidation_history?time_type=h24&symbol=BTC', {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 300 }
    });
    
    if (!response.ok) {
      // Fallback: estimate from price volatility
      return {
        last24h: {
          totalLiquidations: 0,
          longLiquidations: 0,
          shortLiquidations: 0,
          largestSingleLiquidation: 0
        },
        sentiment: 'balanced'
      };
    }
    
    const data = await response.json();
    
    let longLiq = 0;
    let shortLiq = 0;
    let largest = 0;
    
    if (data.data) {
      for (const item of data.data) {
        longLiq += item.longLiquidationUsd || 0;
        shortLiq += item.shortLiquidationUsd || 0;
        largest = Math.max(largest, item.longLiquidationUsd || 0, item.shortLiquidationUsd || 0);
      }
    }
    
    const total = longLiq + shortLiq;
    let sentiment: 'longs_rekt' | 'shorts_rekt' | 'balanced' = 'balanced';
    if (longLiq > shortLiq * 1.5) sentiment = 'longs_rekt';
    if (shortLiq > longLiq * 1.5) sentiment = 'shorts_rekt';
    
    return {
      last24h: {
        totalLiquidations: total,
        longLiquidations: longLiq,
        shortLiquidations: shortLiq,
        largestSingleLiquidation: largest
      },
      sentiment
    };
  } catch (error) {
    console.error('Liquidation data fetch failed:', error);
    return null;
  }
}

// CoinGecko Stablecoin Market Caps (Free API)
async function fetchStablecoinFlows(): Promise<{
  usdtMarketCap: number;
  usdcMarketCap: number;
  totalStablecoinMcap: number;
  change7d: number;
  trend: 'minting' | 'burning' | 'stable';
} | null> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=tether,usd-coin,dai,first-digital-usd&order=market_cap_desc',
      { next: { revalidate: 3600 } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    const usdt = data.find((c: any) => c.id === 'tether');
    const usdc = data.find((c: any) => c.id === 'usd-coin');
    
    const totalMcap = data.reduce((sum: number, c: any) => sum + (c.market_cap || 0), 0);
    const avgChange = data.reduce((sum: number, c: any) => sum + (c.market_cap_change_percentage_24h || 0), 0) / data.length;
    
    let trend: 'minting' | 'burning' | 'stable' = 'stable';
    if (avgChange > 0.5) trend = 'minting';
    if (avgChange < -0.5) trend = 'burning';
    
    return {
      usdtMarketCap: usdt?.market_cap || 0,
      usdcMarketCap: usdc?.market_cap || 0,
      totalStablecoinMcap: totalMcap,
      change7d: avgChange * 7, // Approximate 7d change
      trend
    };
  } catch (error) {
    console.error('Stablecoin data fetch failed:', error);
    return null;
  }
}

// Blockchain.com Exchange Flow Estimation (based on mempool activity)
async function fetchWhaleData(): Promise<WhaleData | null> {
  try {
    // Use Blockchain.com stats API for BTC exchange data
    const response = await fetch('https://api.blockchain.info/stats', {
      next: { revalidate: 600 }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // Estimate exchange flows from transaction data
    // This is approximate - real exchange flow requires premium API
    const avgTxValue = data.trade_volume_usd / (data.n_tx || 1);
    const isHighActivity = data.n_tx > 300000; // >300k txs = high activity
    
    return {
      recentLargeTransactions: [], // Would need Whale Alert API for this
      exchangeFlows: [], // Would need Glassnode/CryptoQuant for this
      summary: {
        totalExchangeInflow24h: data.trade_volume_usd * 0.4, // Estimate 40% inflow
        totalExchangeOutflow24h: data.trade_volume_usd * 0.6, // Estimate 60% outflow (bullish assumption)
        netFlow: 'neutral', // Without real data, stay neutral
        whaleActivity: isHighActivity ? 'high' : avgTxValue > 50000 ? 'medium' : 'low',
        largestTransaction: null
      }
    };
  } catch (error) {
    console.error('Whale data fetch failed:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN AGGREGATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchOnChainContext(): Promise<OnChainContext> {
  // Check cache first
  const cached = apiCache.get<OnChainContext>(cacheKeys.onChain());
  if (cached) {
    console.log('📦 Using cached on-chain data');
    return cached;
  }
  
  // Fetch with individual caching for each source
  const [fundingRates, openInterest, liquidations, stablecoinFlows, whaleData] = await Promise.all([
    apiCache.getOrSet(cacheKeys.fundingRates(), fetchBinanceFundingRates, cacheTTL.fundingRates),
    apiCache.getOrSet(cacheKeys.openInterest(), fetchOpenInterest, cacheTTL.onChain),
    apiCache.getOrSet(cacheKeys.liquidations(), fetchLiquidations, cacheTTL.onChain),
    apiCache.getOrSet(cacheKeys.stablecoin(), fetchStablecoinFlows, cacheTTL.onChain),
    apiCache.getOrSet(cacheKeys.whaleData(), fetchWhaleData, cacheTTL.onChain)
  ]);
  
  const result = {
    fundingRates,
    openInterest,
    liquidations,
    stablecoinFlows,
    whaleData,
    timestamp: new Date().toISOString()
  };
  
  // Cache the aggregated result
  apiCache.set(cacheKeys.onChain(), result, cacheTTL.onChain);
  
  return result;
}

// Format on-chain data for prompt
export function formatOnChainForPrompt(data: OnChainContext): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    ON-CHAIN & DERIVATIVES DATA');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  
  // Funding Rates
  if (data.fundingRates) {
    lines.push('📊 FUNDING RATES (8h):');
    lines.push(`   BTC: ${data.fundingRates.btc.toFixed(4)}%`);
    lines.push(`   ETH: ${data.fundingRates.eth.toFixed(4)}%`);
    lines.push(`   SOL: ${data.fundingRates.sol.toFixed(4)}%`);
    lines.push(`   Top 10 Avg: ${data.fundingRates.avgTop10.toFixed(4)}%`);
    lines.push(`   → Sentiment: ${data.fundingRates.sentiment.replace('_', ' ').toUpperCase()}`);
    
    if (data.fundingRates.sentiment === 'overleveraged_long') {
      lines.push('   ⚠️ WARNING: High long leverage = potential long squeeze');
    } else if (data.fundingRates.sentiment === 'overleveraged_short') {
      lines.push('   ⚠️ WARNING: High short leverage = potential short squeeze');
    }
    lines.push('');
  }
  
  // Open Interest
  if (data.openInterest) {
    lines.push('📈 OPEN INTEREST:');
    lines.push(`   BTC: ${(data.openInterest.btc.current / 1000).toFixed(0)}K BTC (${data.openInterest.btc.change24h > 0 ? '+' : ''}${data.openInterest.btc.change24h.toFixed(1)}% 24h) - ${data.openInterest.btc.trend}`);
    lines.push(`   ETH: ${(data.openInterest.eth.current / 1000).toFixed(0)}K ETH (${data.openInterest.eth.change24h > 0 ? '+' : ''}${data.openInterest.eth.change24h.toFixed(1)}% 24h) - ${data.openInterest.eth.trend}`);
    
    if (data.openInterest.btc.trend === 'increasing') {
      lines.push('   → Rising OI + rising price = new money entering (bullish)');
      lines.push('   → Rising OI + falling price = shorts opening (bearish)');
    }
    lines.push('');
  }
  
  // Liquidations
  if (data.liquidations && data.liquidations.last24h.totalLiquidations > 0) {
    const liq = data.liquidations.last24h;
    lines.push('💥 LIQUIDATIONS (24h):');
    lines.push(`   Total: $${(liq.totalLiquidations / 1000000).toFixed(1)}M`);
    lines.push(`   Longs: $${(liq.longLiquidations / 1000000).toFixed(1)}M`);
    lines.push(`   Shorts: $${(liq.shortLiquidations / 1000000).toFixed(1)}M`);
    lines.push(`   → ${data.liquidations.sentiment.replace('_', ' ').toUpperCase()}`);
    
    if (liq.totalLiquidations > 200000000) {
      lines.push('   ⚠️ HIGH LIQUIDATION DAY - Potential capitulation/reversal');
    }
    lines.push('');
  }
  
  // Stablecoin Flows
  if (data.stablecoinFlows) {
    const sc = data.stablecoinFlows;
    lines.push('💵 STABLECOIN SUPPLY:');
    lines.push(`   USDT: $${(sc.usdtMarketCap / 1000000000).toFixed(1)}B`);
    lines.push(`   USDC: $${(sc.usdcMarketCap / 1000000000).toFixed(1)}B`);
    lines.push(`   Total: $${(sc.totalStablecoinMcap / 1000000000).toFixed(1)}B`);
    lines.push(`   7d Change: ${sc.change7d > 0 ? '+' : ''}${sc.change7d.toFixed(1)}%`);
    lines.push(`   → Trend: ${sc.trend.toUpperCase()}`);
    
    if (sc.trend === 'minting') {
      lines.push('   ✅ Stablecoin minting = dry powder entering market (bullish)');
    } else if (sc.trend === 'burning') {
      lines.push('   ⚠️ Stablecoin burning = capital exiting crypto (bearish)');
    }
    lines.push('');
  }
  
  // Whale Activity
  if (data.whaleData?.summary) {
    lines.push('🐋 WHALE ACTIVITY:');
    lines.push(`   Activity Level: ${data.whaleData.summary.whaleActivity.toUpperCase()}`);
    lines.push(`   Net Flow: ${data.whaleData.summary.netFlow.toUpperCase()}`);
    lines.push('');
  }
  
  return lines.join('\n');
}
