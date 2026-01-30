/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 UNIFIED DATA LAYER - FibAlgo
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Central export for all data fetching modules.
 * Use this as the single entry point for AI analysis.
 * 
 * Modules:
 * - market-data.ts: Price quotes (Yahoo, Finnhub, Binance)
 * - volatility.ts: VIX, realized vol, ATR
 * - macro-data.ts: Treasury yields, DXY, Fear/Greed
 * - fred-api.ts: FRED economic data (CPI, GDP, unemployment)
 * - fundamentals.ts: Basic company metrics (Finnhub)
 * - fmp-api.ts: Full financial statements (FMP)
 * - sentiment.ts: Short interest, social sentiment
 * - news-metadata.ts: News categorization & scoring
 * - historical.ts: Historical events database
 * - onchain.ts: Crypto on-chain data
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Market Prices & Intraday
export {
  fetchQuote,
  fetchMultipleQuotes,
  fetchFinnhubQuote,
  fetchFinnhubCandles,
  fetchYahooQuote,
  fetchYahooIntraday,
  fetchBinanceQuote,
  fetchBinanceKlines,
  type MarketPrice,
  type IntradayCandle,
  type IntradayHistory,
  type AssetType
} from './market-data';

// Volatility Metrics
export {
  fetchVIX,
  fetchVolatilityMetrics,
  fetchVolatilitySpread,
  type VolatilityMetrics,
  type VIXData,
  type VolatilitySpread
} from './volatility';

// Macroeconomic Data
export {
  fetchTreasuryYields,
  fetchDXY,
  fetchFearGreedIndex,
  fetchCNNFearGreed,
  detectMarketRegime,
  fetchMacroSnapshot,
  type EconomicIndicator,
  type TreasuryYields,
  type DXYData,
  type FearGreedIndex,
  type MarketRegime,
  type MacroSnapshot
} from './macro-data';

// Company Fundamentals (Finnhub - Basic)
export {
  fetchCompanyProfile,
  fetchKeyMetrics,
  fetchEarningsHistory,
  fetchEarningsCalendar,
  fetchYahooKeyStats,
  fetchAnalystRecommendations,
  fetchPriceTarget,
  fetchFundamentalSnapshot,
  fetchSectorPeers,
  fetchMultipleFundamentals,
  type EarningsData,
  type EarningsCalendar,
  type CompanyProfile,
  type KeyMetrics,
  type FundamentalSnapshot,
  type AnalystRecommendation,
  type PriceTarget,
  type SectorPeers
} from './fundamentals';

// Full Financial Statements (FMP API)
export {
  fetchIncomeStatement,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchFinancialRatios,
  fetchTTMRatios,
  fetchDCFValuation,
  fetchGrowthMetrics,
  fetchCompleteFinancials,
  formatFinancialsForAI,
  screenStocks,
  type IncomeStatement,
  type BalanceSheet,
  type CashFlowStatement,
  type FinancialRatios,
  type DCFValuation,
  type GrowthMetrics,
  type FinancialSnapshot as FMPFinancialSnapshot
} from './fmp-api';

// FRED Macroeconomic Data
export {
  FRED_SERIES,
  fetchFREDSeries,
  fetchFREDSeriesInfo,
  fetchMultipleFREDSeries,
  fetchInflationData,
  fetchEmploymentData,
  fetchInterestRateData,
  fetchGDPData,
  fetchConsumerSentiment,
  fetchFREDMacroSnapshot,
  fetchUpcomingReleases,
  formatMacroForAI,
  type FREDDataPoint,
  type FREDSeriesInfo,
  type InflationData,
  type EmploymentData,
  type InterestRateData,
  type MacroSnapshot as FREDMacroSnapshot,
  type EconomicRelease
} from './fred-api';

// FREE Macro Data (No API Key Required!)
export {
  getTreasuryYields as getFreeTreasuryYields,
  getFearGreedIndex as getFreeFearGreed,
  getFreeMacroSnapshot,
  getWorldBankData,
  getUSMacroHistory,
  analyzeMacroEnvironment,
  FALLBACK_MACRO_DATA,
  YAHOO_MACRO_SYMBOLS,
  WORLD_BANK_INDICATORS,
  type TreasuryYields as FreeTreasuryYields,
  type FreeMacroSnapshot,
  type MacroEnvironment,
  type CountryMacroData,
  type WorldBankDataPoint
} from './macro-free';

// Positioning & Sentiment
export {
  fetchCBOEPutCallRatio,
  fetchShortInterest,
  fetchSocialSentiment,
  fetchInstitutionalOwnership,
  fetchInsiderTransactions,
  fetchPositioningSummary,
  fetchMarketSentiment,
  type COTData,
  type PutCallRatio,
  type ShortInterest,
  type SocialSentiment,
  type InstitutionalOwnership,
  type InsiderTransaction,
  type PositioningSummary,
  type MarketSentiment
} from './sentiment';

// News Metadata
export {
  NEWS_SOURCES,
  getSourceReliability,
  categorizeNews,
  analyzeSentiment,
  estimateImpact,
  extractKeywords,
  extractSymbols,
  processNewsToMetadata,
  fetchFinnhubNews,
  generateNewsSummary,
  findRelatedNews,
  type NewsSource,
  type NewsMetadata,
  type NewsContext,
  type NewsSummary
} from './news-metadata';

// Historical Analogs
export {
  HISTORICAL_EVENTS,
  findHistoricalAnalogs,
  getEventsByCategory,
  getAverageOutcome,
  formatHistoricalContext,
  type HistoricalEvent,
  type HistoricalAnalog
} from './historical';

// CoinGecko - Comprehensive Crypto Data
export {
  getCoinPrices,
  getTopCoins,
  getSimplePrice,
  getCoinOHLC,
  getCoinHistory,
  getGlobalMarketData,
  getDefiData,
  getTrendingCoins,
  getTopExchanges,
  getCryptoMarketSnapshot,
  COIN_IDS,
  type CoinPrice,
  type GlobalMarketData,
  type TrendingCoin,
  type CoinOHLC,
  type ExchangeInfo,
  type CryptoMarketSnapshot
} from './coingecko';

// CFTC COT Data - Commitments of Traders
export {
  CFTC_MARKETS,
  fetchCOTData,
  getCOTSummary,
  getAllCOTSummaries,
  getCOTWithFallback,
  analyzeCOT,
  getCOTSignals,
  FALLBACK_COT_DATA,
  type COTReport,
  type COTSummary,
  type COTAnalysis
} from './cot-data';

// API Reference
export {
  API_MASTER_REFERENCE,
  API_KEYS_REQUIRED,
  DATA_COVERAGE
} from './api-master-reference';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

import { fetchQuote, fetchMultipleQuotes } from './market-data';
import { fetchVolatilityMetrics, fetchVIX } from './volatility';
import { fetchMacroSnapshot, type MacroSnapshot } from './macro-data';
import { fetchFundamentalSnapshot, type FundamentalSnapshot } from './fundamentals';
import { fetchPositioningSummary, fetchMarketSentiment, type PositioningSummary, type MarketSentiment } from './sentiment';
import { processNewsToMetadata, type NewsMetadata } from './news-metadata';
import { findHistoricalAnalogs, formatHistoricalContext, type HistoricalAnalog } from './historical';

/**
 * Complete market context for AI analysis
 */
export interface MarketContext {
  timestamp: number;
  macro: MacroSnapshot;
  marketSentiment: MarketSentiment;
  majorIndices: {
    spy: { price: number; change: number };
    qqq: { price: number; change: number };
    iwm: { price: number; change: number };
    vix: { value: number; level: string };
  };
  volatility: {
    vix: number;
    realized: number;
    percentile: number;
  };
}

/**
 * Complete asset context for AI analysis
 */
export interface AssetContext {
  symbol: string;
  price: { current: number; change: number; changePercent: number };
  fundamentals: FundamentalSnapshot | null;
  positioning: PositioningSummary | null;
  volatility: { realized: number; atr: number } | null;
}

/**
 * Complete news context for AI analysis
 */
export interface NewsAnalysisContext {
  news: NewsMetadata;
  marketContext: MarketContext;
  assetContexts: Map<string, AssetContext>;
  historicalAnalogs: HistoricalAnalog[];
  formattedHistory: string;
}

/**
 * Fetch complete market context
 */
export async function fetchMarketContext(): Promise<MarketContext> {
  const [macro, marketSentiment, indices, vixData] = await Promise.all([
    fetchMacroSnapshot(),
    fetchMarketSentiment(),
    fetchMultipleQuotes(['SPY', 'QQQ', 'IWM']),
    fetchVIX()
  ]);
  
  const spy = indices.get('SPY');
  const qqq = indices.get('QQQ');
  const iwm = indices.get('IWM');
  
  return {
    timestamp: Date.now(),
    macro,
    marketSentiment,
    majorIndices: {
      spy: { price: spy?.price || 0, change: spy?.changePercent || 0 },
      qqq: { price: qqq?.price || 0, change: qqq?.changePercent || 0 },
      iwm: { price: iwm?.price || 0, change: iwm?.changePercent || 0 },
      vix: { value: vixData.value, level: vixData.level }
    },
    volatility: {
      vix: vixData.value,
      realized: 15,
      percentile: 50
    }
  };
}

/**
 * Fetch complete asset context
 */
export async function fetchAssetContext(symbol: string): Promise<AssetContext> {
  const [quote, fundamentals, positioning] = await Promise.all([
    fetchQuote(symbol),
    fetchFundamentalSnapshot(symbol),
    fetchPositioningSummary(symbol)
  ]);
  
  return {
    symbol,
    price: {
      current: quote?.price || 0,
      change: quote?.change || 0,
      changePercent: quote?.changePercent || 0
    },
    fundamentals,
    positioning,
    volatility: null // Can be calculated if historical data available
  };
}

/**
 * Build complete context for news analysis
 */
export async function buildNewsAnalysisContext(
  rawNews: {
    headline: string;
    summary?: string;
    source: string;
    datetime?: number | string;
    url?: string;
    related?: string[];
  }
): Promise<NewsAnalysisContext> {
  // Process news metadata
  const news = processNewsToMetadata(rawNews);
  
  // Fetch market context
  const marketContext = await fetchMarketContext();
  
  // Fetch asset contexts for related symbols
  const assetContexts = new Map<string, AssetContext>();
  const symbols = news.symbols.slice(0, 5); // Limit to 5 symbols
  
  if (symbols.length > 0) {
    const contexts = await Promise.all(
      symbols.map(symbol => fetchAssetContext(symbol))
    );
    contexts.forEach((ctx, i) => {
      assetContexts.set(symbols[i], ctx);
    });
  }
  
  // Find historical analogs
  const historicalAnalogs = findHistoricalAnalogs({
    category: news.category,
    keywords: news.keywords,
    sentiment: news.sentiment,
    vix: marketContext.volatility.vix,
    marketTrend: marketContext.macro.regime.overallSentiment === 'bullish' ? 'bullish' :
                 marketContext.macro.regime.overallSentiment === 'bearish' ? 'bearish' : 'sideways'
  });
  
  const formattedHistory = formatHistoricalContext(historicalAnalogs);
  
  return {
    news,
    marketContext,
    assetContexts,
    historicalAnalogs,
    formattedHistory
  };
}

/**
 * Format context as prompt for AI
 */
export function formatContextForAI(context: NewsAnalysisContext): string {
  const { news, marketContext, assetContexts, formattedHistory } = context;
  
  let prompt = `# News Analysis Context\n\n`;
  
  // News Details
  prompt += `## News\n`;
  prompt += `**Headline:** ${news.headline}\n`;
  prompt += `**Summary:** ${news.summary}\n`;
  prompt += `**Source:** ${news.source} (Reliability: ${news.sourceReliability}/10, ${news.sourceTier})\n`;
  prompt += `**Category:** ${news.category}\n`;
  prompt += `**Initial Sentiment:** ${news.sentiment} (${news.sentimentScore.toFixed(2)})\n`;
  prompt += `**Estimated Impact:** ${news.impact}\n`;
  prompt += `**Related Symbols:** ${news.symbols.join(', ') || 'None'}\n`;
  prompt += `**Keywords:** ${news.keywords.join(', ')}\n\n`;
  
  // Market Context
  prompt += `## Current Market Conditions\n`;
  prompt += `**Date/Time:** ${new Date(context.marketContext.timestamp).toISOString()}\n`;
  prompt += `**SPY:** $${marketContext.majorIndices.spy.price.toFixed(2)} (${marketContext.majorIndices.spy.change >= 0 ? '+' : ''}${marketContext.majorIndices.spy.change.toFixed(2)}%)\n`;
  prompt += `**QQQ:** $${marketContext.majorIndices.qqq.price.toFixed(2)} (${marketContext.majorIndices.qqq.change >= 0 ? '+' : ''}${marketContext.majorIndices.qqq.change.toFixed(2)}%)\n`;
  prompt += `**VIX:** ${marketContext.volatility.vix.toFixed(1)} (${marketContext.majorIndices.vix.level})\n`;
  prompt += `**Market Regime:** ${marketContext.macro.regime.overallSentiment}\n`;
  prompt += `**Risk Appetite:** ${marketContext.macro.regime.riskAppetite}\n`;
  prompt += `**Yield Curve:** ${marketContext.macro.regime.yieldCurve}\n`;
  prompt += `**Fear & Greed:** ${marketContext.macro.fearGreed.value} (${marketContext.macro.fearGreed.label})\n\n`;
  
  // Asset Details
  if (assetContexts.size > 0) {
    prompt += `## Related Assets\n`;
    for (const [symbol, asset] of assetContexts) {
      prompt += `### ${symbol}\n`;
      prompt += `**Price:** $${asset.price.current.toFixed(2)} (${asset.price.changePercent >= 0 ? '+' : ''}${asset.price.changePercent.toFixed(2)}%)\n`;
      
      if (asset.fundamentals?.metrics) {
        const m = asset.fundamentals.metrics;
        prompt += `**P/E:** ${m.peRatio.toFixed(1)} | **P/S:** ${m.psRatio.toFixed(1)} | **Beta:** ${m.beta.toFixed(2)}\n`;
      }
      
      if (asset.positioning) {
        prompt += `**Positioning:** ${asset.positioning.overallSentiment} (Score: ${asset.positioning.score})\n`;
        if (asset.positioning.signals.length > 0) {
          prompt += `**Signals:** ${asset.positioning.signals.join(', ')}\n`;
        }
      }
      prompt += '\n';
    }
  }
  
  // Historical Context
  prompt += formattedHistory;
  
  return prompt;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK DATA CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick health check for all data sources
 */
export async function checkDataSources(): Promise<{
  source: string;
  status: 'ok' | 'error';
  latency: number;
  error?: string;
}[]> {
  const checks = [
    { name: 'Yahoo Finance', fn: () => fetchQuote('SPY') },
    { name: 'Finnhub', fn: () => fetchFundamentalSnapshot('AAPL') },
    { name: 'Fear & Greed', fn: () => fetchMacroSnapshot() },
    { name: 'VIX', fn: () => fetchVIX() },
  ];
  
  const results = await Promise.all(
    checks.map(async (check) => {
      const start = Date.now();
      try {
        await check.fn();
        return {
          source: check.name,
          status: 'ok' as const,
          latency: Date.now() - start
        };
      } catch (error) {
        return {
          source: check.name,
          status: 'error' as const,
          latency: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    })
  );
  
  return results;
}
