/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧠 META-PROMPTING NEWS ANALYSIS SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 2 Aşamalı Akıllı Analiz:
 * 
 * AŞAMA 1: GPT-4o (Stratejist) - Haberi okur, analiz stratejisi oluşturur
 * AŞAMA 2: GPT-4o-mini (Executor) - Stratejiyi uygular, analiz üretir
 * 
 * Bu yaklaşım:
 * - Daha akıllı (stratejik düşünme + execution ayrı)
 * - Daha ucuz (~%30-40 tasarruf)
 * - Daha tutarlı (strateji sonucu standart)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface NewsItem {
  id: string;
  title: string;
  content?: string;
  source?: string;
  publishedAt?: string;
  tickers?: string[];
}

interface AnalysisStrategy {
  newsType: string;
  keyFactors: string[];
  affectedAssets: {
    symbol: string;
    reason: string;
    expectedImpact: 'strong_positive' | 'positive' | 'neutral' | 'negative' | 'strong_negative';
  }[];
  historicalContext: string;
  criticalQuestions: string[];
  potentialTraps: string[];
  timeHorizon: 'intraday' | 'days' | 'weeks' | 'structural';
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  breakingNews: {
    isBreaking: boolean;
    urgencyLevel: 'critical' | 'elevated' | 'normal';
    responseWindow: 'minutes' | 'hours' | 'days';
  };
  informationQuality: {
    sourceType: 'primary' | 'secondary';
    confidence: 'confirmed' | 'likely' | 'speculative';
  };
  noveltyAssessment: {
    isNew: boolean;
    pricedInScore: number;
    reasoning: string;
  };
  marketContextFit: {
    currentRegime: 'risk-on' | 'risk-off' | 'neutral';
    regimeEffect: 'amplifies' | 'dampens' | 'neutral';
    priceActionConflict: boolean;
  };
  flowAnalysis: {
    primaryActors: string[];
    forcedFlows: boolean;
    expectedMagnitude: 'negligible' | 'minor' | 'moderate' | 'significant' | 'massive';
  };
  analysis: {
    headline: string;
    sentiment: 'strong_bullish' | 'bullish' | 'lean_bullish' | 'neutral' | 'lean_bearish' | 'bearish' | 'strong_bearish';
    conviction: number;
    timeHorizon: 'intraday' | 'days' | 'weeks' | 'structural';
    thesis: string;
    secondOrderEffects: string;
    keyRisk: string;
  };
  trade: {
    wouldTrade: boolean;
    direction: 'long' | 'short' | 'none';
    primaryAsset: string;
    alternativeAssets: string[];
    rationale: string;
    invalidation: string;
    riskReward: 'poor' | 'fair' | 'good' | 'excellent';
  };
  meta: {
    relatedAssets: string[];
    category: 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices' | 'macro';
  };
}

interface ValidationError {
  rule: string;
  message: string;
  severity: 'warning' | 'error';
}

interface AnalysisStats {
  total: number;
  tradeable: number;
  bullish: number;
  bearish: number;
  breaking: number;
  highConviction: number;
  validationWarnings: number;
  validationErrors: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════════

const EXCHANGE_MAP: Record<string, string> = {
  'XNAS': 'NASDAQ',
  'XNYS': 'NYSE',
  'XASE': 'AMEX',
  'ARCX': 'ARCA',
  'BATS': 'BATS',
  'XNMS': 'NASDAQ',
  'XNCM': 'NASDAQ',
  'XNGS': 'NASDAQ',
};

const CRYPTO_EXCHANGES: Record<string, string> = {
  'BTC': 'BINANCE:BTCUSDT',
  'ETH': 'BINANCE:ETHUSDT',
  'SOL': 'BINANCE:SOLUSDT',
  'XRP': 'BINANCE:XRPUSDT',
  'BNB': 'BINANCE:BNBUSDT',
  'DOGE': 'BINANCE:DOGEUSDT',
  'ADA': 'BINANCE:ADAUSDT',
  'AVAX': 'BINANCE:AVAXUSDT',
  'LINK': 'BINANCE:LINKUSDT',
  'MATIC': 'BINANCE:MATICUSDT',
  'DOT': 'BINANCE:DOTUSDT',
  'SHIB': 'BINANCE:SHIBUSDT',
  'LTC': 'BINANCE:LTCUSDT',
};

const FOREX_MAP: Record<string, string> = {
  'EURUSD': 'FX:EURUSD',
  'GBPUSD': 'FX:GBPUSD',
  'USDJPY': 'FX:USDJPY',
  'USDCHF': 'FX:USDCHF',
  'AUDUSD': 'FX:AUDUSD',
  'USDCAD': 'FX:USDCAD',
  'NZDUSD': 'FX:NZDUSD',
};

const INDICES_MAP: Record<string, string> = {
  'SPX': 'SP:SPX',
  'SPY': 'AMEX:SPY',
  'QQQ': 'NASDAQ:QQQ',
  'DJI': 'DJ:DJI',
  'VIX': 'CBOE:VIX',
  'DXY': 'TVC:DXY',
};

const COMMODITIES_MAP: Record<string, string> = {
  'GOLD': 'COMEX:GC1!',
  'SILVER': 'COMEX:SI1!',
  'OIL': 'NYMEX:CL1!',
  'CRUDE': 'NYMEX:CL1!',
  'WTI': 'NYMEX:CL1!',
  'NATGAS': 'NYMEX:NG1!',
};

// ═══════════════════════════════════════════════════════════════════════════════
// AŞAMA 1: STRATEJİST PROMPT (GPT-4o)
// ═══════════════════════════════════════════════════════════════════════════════

const STRATEGIST_SYSTEM_PROMPT = `You are an elite financial news strategist at a top hedge fund. Your job is to READ a news article deeply and create a CUSTOM ANALYSIS STRATEGY for it.

You do NOT analyze the news yourself. You create the blueprint for how it SHOULD be analyzed.

OUTPUT FORMAT (JSON):
{
  "newsType": "earnings|fda|fed|merger|geopolitical|crypto_regulatory|macro_data|analyst_rating|insider_activity|sector_rotation|other",
  "keyFactors": [
    "What specific data points matter most for THIS news",
    "What numbers/percentages should be extracted",
    "What comparisons should be made (vs expectations, vs history)"
  ],
  "affectedAssets": [
    {
      "symbol": "NASDAQ:AAPL or BINANCE:BTCUSDT format",
      "reason": "Why this asset is affected",
      "expectedImpact": "strong_positive|positive|neutral|negative|strong_negative"
    }
  ],
  "historicalContext": "What happened in similar past events? Include specific examples with dates and outcomes if possible.",
  "criticalQuestions": [
    "What questions MUST be answered to properly analyze this?",
    "What would change the conclusion entirely?"
  ],
  "potentialTraps": [
    "Common mistakes traders make with this type of news",
    "Hidden risks that aren't obvious"
  ],
  "timeHorizon": "intraday|days|weeks|structural",
  "urgencyLevel": "critical|high|medium|low"
}

RULES:
1. Be SPECIFIC to THIS news, not generic
2. Include at least 3 affected assets when relevant
3. Historical context should reference REAL patterns (earnings beats, FDA approvals, etc.)
4. Critical questions should be actionable
5. Always include at least 2 potential traps
6. Use proper TradingView ticker format for all symbols`;

// ═══════════════════════════════════════════════════════════════════════════════
// AŞAMA 2: EXECUTOR PROMPT (GPT-4o-mini)
// ═══════════════════════════════════════════════════════════════════════════════

function buildExecutorPrompt(strategy: AnalysisStrategy): string {
  return `You are executing a financial news analysis. Follow the strategy EXACTLY.

═══════════════════════════════════════════════════════════════════════════════
ANALYSIS STRATEGY (from senior analyst)
═══════════════════════════════════════════════════════════════════════════════

NEWS TYPE: ${strategy.newsType}
URGENCY: ${strategy.urgencyLevel}
TIME HORIZON: ${strategy.timeHorizon}

KEY FACTORS TO ANALYZE:
${strategy.keyFactors.map((f, i) => `${i + 1}. ${f}`).join('\n')}

AFFECTED ASSETS:
${strategy.affectedAssets.map(a => `• ${a.symbol}: ${a.reason} (Expected: ${a.expectedImpact})`).join('\n')}

HISTORICAL CONTEXT:
${strategy.historicalContext}

CRITICAL QUESTIONS TO ANSWER:
${strategy.criticalQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

POTENTIAL TRAPS TO AVOID:
${strategy.potentialTraps.map((t, i) => `⚠️ ${i + 1}. ${t}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════════════════

Based on the above strategy, analyze the news and produce a JSON response with:

{
  "breakingNews": {
    "isBreaking": boolean,
    "urgencyLevel": "critical|elevated|normal",
    "responseWindow": "minutes|hours|days"
  },
  "informationQuality": {
    "sourceType": "primary|secondary",
    "confidence": "confirmed|likely|speculative"
  },
  "noveltyAssessment": {
    "isNew": boolean,
    "pricedInScore": 1-10 (10 = fully priced in),
    "reasoning": "Why this score"
  },
  "marketContextFit": {
    "currentRegime": "risk-on|risk-off|neutral",
    "regimeEffect": "amplifies|dampens|neutral",
    "priceActionConflict": boolean
  },
  "flowAnalysis": {
    "primaryActors": ["Who is buying/selling"],
    "forcedFlows": boolean,
    "expectedMagnitude": "negligible|minor|moderate|significant|massive"
  },
  "analysis": {
    "headline": "Your AI-written summary (1-2 sentences)",
    "sentiment": "strong_bullish|bullish|lean_bullish|neutral|lean_bearish|bearish|strong_bearish",
    "conviction": 1-10,
    "timeHorizon": "intraday|days|weeks|structural",
    "thesis": "Your main argument (2-3 sentences)",
    "secondOrderEffects": "Ripple effects on related assets",
    "keyRisk": "The #1 thing that could go wrong"
  },
  "trade": {
    "wouldTrade": boolean,
    "direction": "long|short|none",
    "primaryAsset": "Best asset to trade (TradingView format)",
    "alternativeAssets": ["Other options"],
    "rationale": "Why this trade",
    "invalidation": "Specific price/event that would invalidate",
    "riskReward": "poor|fair|good|excellent"
  },
  "meta": {
    "relatedAssets": ["All mentioned assets in TradingView format"],
    "category": "crypto|forex|stocks|commodities|indices|macro"
  }
}

IMPORTANT:
- Answer ALL critical questions from the strategy
- Avoid ALL traps mentioned
- Use the historical context to calibrate expectations
- Primary asset MUST be from the affected assets list
- Be decisive - if conviction < 5, set wouldTrade = false`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET DATA FETCHERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchFearGreedIndex(): Promise<{ value: number; label: string }> {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=1');
    const data = await response.json();
    const value = parseInt(data.data[0].value);
    return {
      value,
      label: data.data[0].value_classification
    };
  } catch {
    return { value: 50, label: 'Neutral' };
  }
}

async function fetchBTCPrice(): Promise<{ price: number; change24h: number }> {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    const data = await response.json();
    return {
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent)
    };
  } catch {
    return { price: 0, change24h: 0 };
  }
}

async function fetchVIX(): Promise<number> {
  // VIX için Yahoo Finance veya başka API kullanılabilir
  // Şimdilik mock değer
  return 18.5;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICKER RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveTradingViewTickers(assets: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  
  for (const asset of assets) {
    // Already in TradingView format
    if (asset.includes(':')) {
      result[asset] = asset;
      continue;
    }
    
    const upperAsset = asset.toUpperCase();
    
    // Check mappings
    if (CRYPTO_EXCHANGES[upperAsset]) {
      result[asset] = CRYPTO_EXCHANGES[upperAsset];
    } else if (FOREX_MAP[upperAsset]) {
      result[asset] = FOREX_MAP[upperAsset];
    } else if (INDICES_MAP[upperAsset]) {
      result[asset] = INDICES_MAP[upperAsset];
    } else if (COMMODITIES_MAP[upperAsset]) {
      result[asset] = COMMODITIES_MAP[upperAsset];
    } else {
      // Default fallback - assume NASDAQ listing
      result[asset] = `NASDAQ:${upperAsset}`;
    }
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateAnalysis(analysis: AnalysisResult): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // High conviction but no trade
  if (analysis.analysis.conviction >= 7 && !analysis.trade.wouldTrade) {
    errors.push({
      rule: 'HIGH_CONVICTION_NO_TRADE',
      message: 'High conviction but no trade recommendation',
      severity: 'warning'
    });
  }
  
  // Trade without rationale
  if (analysis.trade.wouldTrade && !analysis.trade.rationale) {
    errors.push({
      rule: 'TRADE_NO_RATIONALE',
      message: 'Trade recommended without rationale',
      severity: 'error'
    });
  }
  
  // Missing primary asset
  if (analysis.trade.wouldTrade && !analysis.trade.primaryAsset) {
    errors.push({
      rule: 'TRADE_NO_ASSET',
      message: 'Trade recommended without primary asset',
      severity: 'error'
    });
  }
  
  // Breaking news but low urgency
  if (analysis.breakingNews.isBreaking && analysis.breakingNews.urgencyLevel === 'normal') {
    errors.push({
      rule: 'BREAKING_LOW_URGENCY',
      message: 'Breaking news marked but urgency is normal',
      severity: 'warning'
    });
  }
  
  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

async function retryFetch(url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      if (retries <= 0) {
        throw new Error('Rate limit exceeded after retries');
      }
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return retryFetch(url, options, retries - 1, backoff * 2);
    }
    
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, backoff));
    return retryFetch(url, options, retries - 1, backoff * 2);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 MAIN ANALYSIS PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeNewsBatch(news: NewsItem[]) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const results: Array<{
    newsItem: NewsItem;
    analysis: AnalysisResult;
    strategy: AnalysisStrategy;
    validationErrors: ValidationError[];
    extractedAssets: string[];
    tradingViewTickers: Record<string, string | null>;
  }> = [];

  // Fetch market context once for all news
  const [fearGreed, btcData] = await Promise.all([
    fetchFearGreedIndex(),
    fetchBTCPrice()
  ]);

  const marketContext = `
Current Market Context:
- Fear & Greed Index: ${fearGreed.value} (${fearGreed.label})
- BTC Price: $${btcData.price.toLocaleString()} (${btcData.change24h >= 0 ? '+' : ''}${btcData.change24h.toFixed(2)}%)
`;

  for (const newsItem of news) {
    try {
      // ══════════════════════════════════════════════════
      // AŞAMA 1: STRATEJİ OLUŞTUR (GPT-4o)
      // ══════════════════════════════════════════════════
      
      const newsText = `${newsItem.title}${newsItem.content ? `\n\n${newsItem.content}` : ''}${newsItem.source ? `\n\nSource: ${newsItem.source}` : ''}`;
      
      const strategyResponse = await retryFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Stratejist - akıllı model
          messages: [
            { role: 'system', content: STRATEGIST_SYSTEM_PROMPT },
            { role: 'user', content: `${marketContext}\n\n═══════════════════════════════════════\nNEWS TO CREATE STRATEGY FOR:\n═══════════════════════════════════════\n\n${newsText}` }
          ],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        }),
      });

      if (!strategyResponse.ok) {
        console.error('Strategy API error:', await strategyResponse.text());
        continue;
      }

      const strategyData = await strategyResponse.json();
      const strategyText = strategyData.choices[0]?.message?.content || '{}';
      
      let strategy: AnalysisStrategy;
      try {
        strategy = JSON.parse(strategyText);
      } catch {
        console.error('Failed to parse strategy:', strategyText);
        continue;
      }

      // Extract assets from strategy
      const extractedAssets = strategy.affectedAssets.map(a => a.symbol);
      const tradingViewTickers = await resolveTradingViewTickers(extractedAssets);

      // ══════════════════════════════════════════════════
      // AŞAMA 2: ANALİZ YÜRÜT (GPT-4o-mini)
      // ══════════════════════════════════════════════════
      
      const executorPrompt = buildExecutorPrompt(strategy);
      
      const analysisResponse = await retryFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Executor - hızlı ve ucuz
          messages: [
            { role: 'system', content: executorPrompt },
            { role: 'user', content: `${marketContext}\n\n═══════════════════════════════════════\nNEWS TO ANALYZE:\n═══════════════════════════════════════\n\n${newsText}` }
          ],
          temperature: 0.2,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        }),
      });

      if (!analysisResponse.ok) {
        console.error('Analysis API error:', await analysisResponse.text());
        continue;
      }

      const analysisData = await analysisResponse.json();
      const analysisText = analysisData.choices[0]?.message?.content || '{}';
      
      let analysis: AnalysisResult;
      try {
        analysis = JSON.parse(analysisText);
      } catch {
        console.error('Failed to parse analysis:', analysisText);
        continue;
      }

      // ══════════════════════════════════════════════════
      // AŞAMA 3: KALİTE KONTROL
      // ══════════════════════════════════════════════════
      
      const validationErrors = validateAnalysis(analysis);
      
      // Kritik hata varsa trade'i engelle
      const hasCriticalError = validationErrors.some(e => e.severity === 'error');
      if (hasCriticalError && analysis.trade.wouldTrade) {
        analysis.trade.wouldTrade = false;
        analysis.trade.direction = 'none';
        analysis.trade.rationale = 'BLOCKED: Quality control detected inconsistencies';
      }

      results.push({
        newsItem,
        analysis,
        strategy,
        validationErrors,
        extractedAssets,
        tradingViewTickers
      });

    } catch (error) {
      console.error(`Error analyzing news ${newsItem.id}:`, error);
      continue;
    }
  }

  // Aggregate stats
  const stats: AnalysisStats = {
    total: results.length,
    tradeable: results.filter(r => r.analysis.trade.wouldTrade).length,
    bullish: results.filter(r => ['strong_bullish', 'bullish', 'lean_bullish'].includes(r.analysis.analysis.sentiment)).length,
    bearish: results.filter(r => ['strong_bearish', 'bearish', 'lean_bearish'].includes(r.analysis.analysis.sentiment)).length,
    breaking: results.filter(r => r.analysis.breakingNews.isBreaking).length,
    highConviction: results.filter(r => r.analysis.analysis.conviction >= 7).length,
    validationWarnings: results.reduce((sum, r) => sum + r.validationErrors.filter(e => e.severity === 'warning').length, 0),
    validationErrors: results.reduce((sum, r) => sum + r.validationErrors.filter(e => e.severity === 'error').length, 0),
  };

  return {
    analyses: results,
    stats,
    meta: {
      pipeline: 'meta-prompting-v1',
      strategistModel: 'gpt-4o',
      executorModel: 'gpt-4o-mini',
      timestamp: new Date().toISOString(),
    }
  };
}
