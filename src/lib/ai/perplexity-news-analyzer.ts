/**
 * #######################################################################
 * #                                                                     #
 * #   ⛔ KULLANICI SPESİFİK OLARAK "BU KODU DEĞİŞTİR" DEMEDİĞİ SÜRECE   #
 * #                    BU KODU DEĞİŞTİRME ASLA!                         #
 * #                                                                     #
 * #   Bu dosya 3-Stage AI Trading Analyst sisteminin CORE kodudur.      #
 * #   Stage 1, Stage 2, Stage 3 mantığı ve promptları burada.           #
 * #   DOKUNMA!                                                          #
 * #                                                                     #
 * #######################################################################
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🤖 PERPLEXITY AI NEWS ANALYSIS SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 3 Aşamalı AI Trading Analyst:
 * 
 * STAGE 1: Claude 4.5 Haiku → Haber analizi + required_data listesi
 * STAGE 2: Perplexity Sonar → AI Search ile veri toplama (paralel)
 * STAGE 3: Claude 4.5 Sonnet → Final trading kararı
 * 
 * Avantajlar:
 * - Gerçek zamanlı web araması (Perplexity)
 * - Düşük maliyet (~$0.06/haber)
 * - Hızlı işlem (~8-10 saniye)
 * - Vercel uyumlu (Puppeteer yok)
 */

import Anthropic from '@anthropic-ai/sdk';

// ═══════════════════════════════════════════════════════════════════════════════
// API KEYS
// ═══════════════════════════════════════════════════════════════════════════════

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface NewsInput {
  title: string;
  article: string;
  date: string;
  source?: string;
  url?: string;
}

export interface Stage1Analysis {
  title: string;
  analysis: string;
  should_build_infrastructure: boolean;
  infrastructure_reasoning: string;
  category: 'forex' | 'cryptocurrency' | 'stocks' | 'commodities' | 'indices' | 'macro' | '';
  affected_assets: string[];
  required_data: string[];
  // Legacy fields (optional)
  trading_styles_applicable?: ('scalping' | 'day_trading' | 'swing_trading' | 'position_trading')[];
  immediate_impact?: string;
  tradeable_potential?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

export interface TradePosition {
  asset: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  trade_type: 'scalping' | 'day_trading' | 'swing_trading' | 'position_trading';
  momentum_duration_minutes?: number;
  reasoning?: string;
  // Legacy fields (optional)
  position_size_percent?: number;
  risk_reward_ratio?: string;
  momentum_duration?: string;
  entry_reasoning?: string;
  stop_loss_reasoning?: string;
  take_profit_reasoning?: string;
}

export interface Stage3Decision {
  trade_decision: 'TRADE' | 'NO TRADE';
  conviction?: number;
  importance_score: number;
  category?: 'forex' | 'cryptocurrency' | 'stocks' | 'commodities' | 'indices' | 'macro';
  info_quality?: 'VERIFIED' | 'SPECULATIVE' | 'RUMOR';
  market_impact?: number;
  market_regime?: 'RISK-ON' | 'RISK-OFF';
  risk_mode?: 'NORMAL' | 'ELEVATED' | 'HIGH RISK';
  positions: TradePosition[];
  main_risks: string[];
  overall_assessment: string;
}

export interface PerplexityData {
  query: string;
  data: string;
  citations: string[];
}

export interface AnalysisResult {
  news: NewsInput;
  stage1: Stage1Analysis;
  collectedData: PerplexityData[];
  stage3: Stage3Decision;
  costs: {
    claudeHaiku: { input: number; output: number; cost: number };
    perplexity: { prompt: number; completion: number; cost: number; requests: number };
    claudeSonnet: { input: number; output: number; cost: number };
    total: number;
  };
  timing: {
    stage1Ms: number;
    stage2Ms: number;
    stage3Ms: number;
    totalMs: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const STAGE_1_PROMPT = `You are an investor specializing in analyzing financial news (Scalping, Day Trading, Swing Trading, Position Trading).

NEWS DATE: {NEWS_DATE}

NEWS ARTICLE:
{NEWS_ARTICLE}

1. First, create a concise headline/title (max 100 characters) that summarizes the key point of this news for traders.

2. Analyze this news from a Scalping, Day Trading, Swing Trading, or Position Trading perspective, taking into account its publication date.

3. Based on your analysis of this news, would you start building a trading infrastructure for it?
(Remember, building a trading infrastructure for a news story is very difficult and costly. You need to make an important decision here.)
- Answer "YES" if: This news is important; I would research it and build a trading infrastructure for it.
- Answer "NO" if: This news is not important; it's not worth researching and building a trading infrastructure for it.

IF YOUR ANSWER IS "YES", also answer questions 4-5-6:

4. Determine the category of this news (forex, cryptocurrency, stocks, commodities, indices, macro).

5. Identify and note the assets that this news will affect. (Write using TradingView asset data)

6. If you were to trade based on this news, what data would you need? I can provide you with all this data; please request only the most important data(s) you need to analyze this news. (Do not request unnecessary data)

IF YOUR ANSWER IS "NO", leave fields 4-5-6 empty but still provide title and analysis.

Respond in JSON:
{
  "title": "Concise headline summarizing the news (max 100 chars)",
  "analysis": "Your detailed analysis of the news...",
  "should_build_infrastructure": true or false,
  "infrastructure_reasoning": "Why you decided YES or NO for building trading infrastructure...",
  "category": "forex/cryptocurrency/stocks/commodities/indices/macro or empty if NO",
  "affected_assets": ["NASDAQ:AAPL", "BINANCE:BTCUSDT"] or [] if NO,
  "required_data": ["search query 1", "search query 2"] or [] if NO
}`;

const STAGE_3_PROMPT = `You are an investor specializing in analyzing financial news (Scalping, Day Trading, Swing Trading, Position Trading).

You previously analyzed this news:
{PREVIOUS_ANALYSIS}

5. I have tried to provide you with all the information you requested. Please examine and analyze it in detail:
{COLLECTED_DATA}

6. Would you trade based on this data (remember, you don't have to trade. You have all the necessary data; you should make an important decision based on this data)?

7. What is your conviction level for this trade? (Rate out of 10. How strongly do you believe in this trade?)

8. If you decided to trade, how important is this news overall? (Rate out of 10.)

9. Based on this news and data, in which asset did you trade? (Write using TradingView asset data)

10. List the assets you traded as TradingView assets.

11. Were the positions you traded buy or sell?

12. What is your percentage confidence level in the positions you traded?

13. Please specify the type of position you held in these trades (Scalping, Day Trading, Swing Trading, Position Trading).

14. What is the estimated momentum duration of your positions in these trades? (Please specify the time in minutes)

15. What is the quality level of this news? (VERIFIED/SPECULATIVE/RUMOR)

16. What is the market impact of this news on a scale of 10?

17. What is the market regime for this news? (RISK-ON if bullish/growth favoring, RISK-OFF if defensive/safe-haven favoring)

18. What is the risk mode of this news? (NORMAL/ELEVATED/HIGH RISK)

19. What is the primary category of this news? (forex/cryptocurrency/stocks/commodities/indices/macro)

20. What are the main risks of this transaction?

Respond in JSON:
{
  "trade_decision": "TRADE" or "NO TRADE",
  "conviction": 8,
  "importance_score": 8,
  "category": "forex" or "cryptocurrency" or "stocks" or "commodities" or "indices" or "macro",
  "info_quality": "VERIFIED" or "SPECULATIVE" or "RUMOR",
  "market_impact": 7,
  "market_regime": "RISK-ON" or "RISK-OFF",
  "risk_mode": "NORMAL" or "ELEVATED" or "HIGH RISK",
  "positions": [
    {
      "asset": "NASDAQ:AAPL",
      "direction": "BUY" or "SELL",
      "confidence": 85,
      "trade_type": "scalping" or "day_trading" or "swing_trading" or "position_trading",
      "momentum_duration_minutes": 240,
      "reasoning": "Why you opened this position..."
    }
  ],
  "main_risks": ["Risk 1", "Risk 2", "Risk 3"],
  "overall_assessment": "Write a numbered list: (1) First key point. (2) Second key point. (3) Third key point. Use this format for clarity."
}`;

// ═══════════════════════════════════════════════════════════════════════════════
// PERPLEXITY AI SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

interface PerplexityResponse {
  id: string;
  model: string;
  choices: {
    message: {
      content: string;
    };
  }[];
  citations?: string[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

async function searchWithPerplexity(query: string): Promise<{ data: string; citations: string[]; usage: { prompt_tokens: number; completion_tokens: number } } | null> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a financial research assistant. Provide factual, data-driven answers with specific numbers, dates, and sources. Be concise but comprehensive. Focus on trading-relevant information.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.1,
        max_tokens: 800,
        return_citations: true,
        search_recency_filter: 'month'
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status}`);
      return null;
    }

    const data: PerplexityResponse = await response.json();
    
    const content = data.choices[0]?.message?.content || '';
    const citations = data.citations || [];
    
    return { 
      data: content, 
      citations,
      usage: data.usage
    };
  } catch (error) {
    console.error(`Perplexity error: ${error}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeNewsWithPerplexity(news: NewsInput): Promise<AnalysisResult> {
  const timings = {
    stage1Start: Date.now(),
    stage1End: 0,
    stage2Start: 0,
    stage2End: 0,
    stage3Start: 0,
    stage3End: 0,
  };
  
  // Token tracking
  let claudeHaikuTokens = { input: 0, output: 0 };
  let perplexityTokens = { prompt: 0, completion: 0 };
  let perplexityRequests = 0;
  let claudeSonnetTokens = { input: 0, output: 0 };
  
  // Format date
  const formattedDate = new Date(news.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  
  // ========== STAGE 1 (Claude 4.5 Haiku) ==========
  // Send article if available (>50 chars), otherwise send title as fallback
  const newsContent = news.article && news.article.length > 50 ? news.article : news.title;
  
  const stage1Prompt = STAGE_1_PROMPT
    .replace('{NEWS_DATE}', formattedDate)
    .replace('{NEWS_ARTICLE}', newsContent);
  
  const stage1Response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: stage1Prompt + '\n\nRespond ONLY with valid JSON, no other text.' }]
  });
  
  claudeHaikuTokens.input = stage1Response.usage?.input_tokens || 0;
  claudeHaikuTokens.output = stage1Response.usage?.output_tokens || 0;
  
  let stage1Content = (stage1Response.content[0] as { text: string }).text || '{}';
  stage1Content = stage1Content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  
  // Robust JSON parsing with sanitization for Stage 1
  let stage1Data: Stage1Analysis;
  try {
    stage1Data = JSON.parse(stage1Content);
  } catch (parseError) {
    console.warn('Stage 1 JSON parse error, attempting to fix...');
    
    let fixedContent = stage1Content
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/}[^}]*$/, '}');
    
    try {
      stage1Data = JSON.parse(fixedContent);
    } catch {
      console.error('Failed to parse Stage 1 response, using fallback');
      stage1Data = {
        title: 'Analysis Error',
        analysis: 'Parse error - could not analyze news',
        should_build_infrastructure: false,
        infrastructure_reasoning: 'Parse error occurred',
        category: '',
        affected_assets: [],
        required_data: []
      };
    }
  }
  
  const requiredData = stage1Data.required_data || [];
  const shouldBuildInfra = stage1Data.should_build_infrastructure ?? true;
  
  timings.stage1End = Date.now();
  
  // ========== INFRASTRUCTURE DECISION CHECK ==========
  // If AI decided NOT to build infrastructure, return early with minimal result
  if (!shouldBuildInfra) {
    const haikuCost = (claudeHaikuTokens.input * 1.00 + claudeHaikuTokens.output * 5.00) / 1000000;
    
    return {
      news,
      stage1: stage1Data,
      collectedData: [],
      stage3: {
        trade_decision: 'NO TRADE',
        importance_score: 1,
        positions: [],
        main_risks: ['News not worth building trading infrastructure'],
        overall_assessment: stage1Data.infrastructure_reasoning || 'AI decided this news is not worth researching further.'
      },
      costs: {
        claudeHaiku: { input: claudeHaikuTokens.input, output: claudeHaikuTokens.output, cost: haikuCost },
        perplexity: { prompt: 0, completion: 0, cost: 0, requests: 0 },
        claudeSonnet: { input: 0, output: 0, cost: 0 },
        total: haikuCost
      },
      timing: {
        stage1Ms: timings.stage1End - timings.stage1Start,
        stage2Ms: 0,
        stage3Ms: 0,
        totalMs: timings.stage1End - timings.stage1Start
      }
    };
  }
  
  timings.stage2Start = Date.now();
  
  // ========== STAGE 2 (Perplexity AI Search - Parallel) ==========
  interface QueryResult {
    index: number;
    query: string;
    data: string | null;
    citations: string[];
  }
  
  const allResults = await Promise.all(
    requiredData.map(async (query, index): Promise<QueryResult> => {
      const result = await searchWithPerplexity(query);
      
      if (result && result.data) {
        perplexityTokens.prompt += result.usage.prompt_tokens;
        perplexityTokens.completion += result.usage.completion_tokens;
        perplexityRequests++;
        return { index, query, data: result.data, citations: result.citations };
      }
      perplexityRequests++;
      return { index, query, data: null, citations: [] };
    })
  );
  
  // Collect results
  const collectedData: PerplexityData[] = [];
  for (const result of allResults.sort((a, b) => a.index - b.index)) {
    if (result.data) {
      collectedData.push({ query: result.query, data: result.data, citations: result.citations });
    }
  }
  
  timings.stage2End = Date.now();
  timings.stage3Start = Date.now();
  
  // ========== STAGE 3 (Claude 4.5 Sonnet) ==========
  let formattedData = '';
  for (const item of collectedData) {
    formattedData += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    formattedData += `Query: "${item.query}"\n`;
    formattedData += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    formattedData += item.data;
    if (item.citations && item.citations.length > 0) {
      formattedData += `\n\n📚 Sources: ${item.citations.slice(0, 3).join(', ')}`;
    }
    formattedData += `\n`;
  }
  
  const stage3Prompt = STAGE_3_PROMPT
    .replace('{PREVIOUS_ANALYSIS}', JSON.stringify(stage1Data, null, 2))
    .replace('{COLLECTED_DATA}', formattedData || '(No additional data collected)');
  
  const stage3Response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    messages: [{ role: 'user', content: stage3Prompt + '\n\nRespond ONLY with valid JSON, no other text.' }]
  });
  
  claudeSonnetTokens.input = stage3Response.usage?.input_tokens || 0;
  claudeSonnetTokens.output = stage3Response.usage?.output_tokens || 0;
  
  let stage3Content = (stage3Response.content[0] as { text: string }).text || '{}';
  stage3Content = stage3Content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  
  // Robust JSON parsing with sanitization
  let stage3Data: Stage3Decision;
  try {
    stage3Data = JSON.parse(stage3Content);
  } catch (parseError) {
    // Try to fix common JSON issues
    console.warn('Stage 3 JSON parse error, attempting to fix...');
    
    // Remove trailing commas before } or ]
    let fixedContent = stage3Content
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      // Fix unescaped quotes in strings (common issue)
      .replace(/:\s*"([^"]*?)(?<!\\)"([^"]*?)"/g, (match, p1, p2) => {
        if (p2.includes(':') || p2.includes(',') || p2.includes('}')) {
          return `: "${p1}\\"${p2}"`;
        }
        return match;
      })
      // Remove any text after the last }
      .replace(/}[^}]*$/, '}');
    
    try {
      stage3Data = JSON.parse(fixedContent);
    } catch {
      // Fallback: return a safe default
      console.error('Failed to parse Stage 3 response, using fallback');
      stage3Data = {
        trade_decision: 'NO TRADE',
        importance_score: 3,
        positions: [],
        main_risks: ['JSON parse error - analysis incomplete'],
        overall_assessment: 'Analysis failed due to parsing error. Original response could not be processed.'
      };
    }
  }
  
  timings.stage3End = Date.now();
  
  // ========== COST CALCULATION ==========
  // Claude 4.5 Haiku: $1/1M input, $5/1M output
  const haikuCost = (claudeHaikuTokens.input / 1000000) * 1 + (claudeHaikuTokens.output / 1000000) * 5;
  
  // Perplexity Sonar: $1/1M input, $1/1M output + $0.005 per request
  const perplexityTokenCost = (perplexityTokens.prompt / 1000000) * 1 + (perplexityTokens.completion / 1000000) * 1;
  const perplexityRequestCost = perplexityRequests * 0.005;
  const perplexityCost = perplexityTokenCost + perplexityRequestCost;
  
  // Claude 4.5 Sonnet: $3/1M input, $15/1M output
  const sonnetCost = (claudeSonnetTokens.input / 1000000) * 3 + (claudeSonnetTokens.output / 1000000) * 15;
  
  return {
    news,
    stage1: stage1Data,
    collectedData,
    stage3: stage3Data,
    costs: {
      claudeHaiku: { 
        input: claudeHaikuTokens.input, 
        output: claudeHaikuTokens.output, 
        cost: haikuCost 
      },
      perplexity: { 
        prompt: perplexityTokens.prompt, 
        completion: perplexityTokens.completion, 
        cost: perplexityCost,
        requests: perplexityRequests
      },
      claudeSonnet: { 
        input: claudeSonnetTokens.input, 
        output: claudeSonnetTokens.output, 
        cost: sonnetCost 
      },
      total: haikuCost + perplexityCost + sonnetCost
    },
    timing: {
      stage1Ms: timings.stage1End - timings.stage1Start,
      stage2Ms: timings.stage2End - timings.stage2Start,
      stage3Ms: timings.stage3End - timings.stage3Start,
      totalMs: timings.stage3End - timings.stage1Start
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ANALYSIS (for cron job)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BatchAnalysisResult {
  newsItem: NewsInput;
  analysis: {
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
    analysis: {
      headline: string;
      sentiment: string;
      conviction: number;
      timeHorizon: string;
      thesis: string;
      keyRisk: string;
    };
    trade: {
      wouldTrade: boolean;
      direction: 'long' | 'short' | 'none';
      primaryAsset: string;
      alternativeAssets: string[];
      rationale: string;
    };
    meta: {
      relatedAssets: string[];
      category: string;
    };
  } | null;
  validationErrors: Array<{ rule: string; message: string; severity: 'warning' | 'error' }>;
  extractedAssets: string[];
  tradingViewTickers: Record<string, string | null>;
}

/**
 * Convert AnalysisResult to legacy BatchAnalysisResult format
 * This maintains compatibility with existing cron job
 */
function convertToLegacyFormat(result: AnalysisResult): BatchAnalysisResult {
  const { stage1, stage3 } = result;
  
  // Map sentiment from stage3 positions
  let sentiment = 'neutral';
  let direction: 'long' | 'short' | 'none' = 'none';
  let primaryAsset = '';
  let alternativeAssets: string[] = [];
  
  if (stage3.positions && stage3.positions.length > 0) {
    const firstPosition = stage3.positions[0];
    primaryAsset = firstPosition.asset;
    direction = firstPosition.direction === 'BUY' ? 'long' : 'short';
    sentiment = firstPosition.direction === 'BUY' ? 'bullish' : 'bearish';
    alternativeAssets = stage3.positions.slice(1).map(p => p.asset);
  }
  
  // Determine if breaking news
  const isBreaking = stage3.importance_score >= 8;
  const urgencyLevel = stage3.importance_score >= 9 ? 'critical' : stage3.importance_score >= 7 ? 'elevated' : 'normal';
  
  // Map time horizon from trade_type
  let timeHorizon = 'days';
  if (stage3.positions?.[0]?.trade_type === 'scalping') timeHorizon = 'intraday';
  else if (stage3.positions?.[0]?.trade_type === 'day_trading') timeHorizon = 'intraday';
  else if (stage3.positions?.[0]?.trade_type === 'swing_trading') timeHorizon = 'days';
  else if (stage3.positions?.[0]?.trade_type === 'position_trading') timeHorizon = 'weeks';
  
  return {
    newsItem: result.news,
    analysis: {
      breakingNews: {
        isBreaking,
        urgencyLevel,
        responseWindow: timeHorizon === 'intraday' ? 'minutes' : timeHorizon === 'days' ? 'hours' : 'days'
      },
      informationQuality: {
        sourceType: 'primary',
        confidence: stage3.importance_score >= 7 ? 'confirmed' : 'likely'
      },
      noveltyAssessment: {
        isNew: true,
        pricedInScore: Math.max(0, 10 - stage3.importance_score),
        reasoning: stage3.overall_assessment
      },
      marketContextFit: {
        currentRegime: 'neutral',
        regimeEffect: 'neutral',
        priceActionConflict: stage3.trade_decision === 'NO TRADE'
      },
      analysis: {
        headline: stage1.title || result.news.title,
        sentiment,
        conviction: stage3.importance_score,
        timeHorizon,
        thesis: stage1.analysis,
        keyRisk: stage3.main_risks?.[0] || 'No specific risks identified'
      },
      trade: {
        wouldTrade: stage3.trade_decision === 'TRADE',
        direction,
        primaryAsset,
        alternativeAssets,
        rationale: stage3.overall_assessment
      },
      meta: {
        relatedAssets: stage1.affected_assets,
        category: stage1.category
      }
    },
    validationErrors: [],
    extractedAssets: stage1.affected_assets,
    tradingViewTickers: {}
  };
}

/**
 * Analyze a batch of news items
 * Compatible with existing cron job interface
 */
export async function analyzeNewsBatchWithPerplexity(
  newsItems: Array<{ title: string; content?: string; source?: string }>
): Promise<{ analyses: BatchAnalysisResult[] }> {
  const analyses: BatchAnalysisResult[] = [];
  
  for (const item of newsItems) {
    try {
      const newsInput: NewsInput = {
        title: item.title,
        article: item.content || item.title,
        date: new Date().toISOString(),
        source: item.source
      };
      
      const result = await analyzeNewsWithPerplexity(newsInput);
      const legacyResult = convertToLegacyFormat(result);
      analyses.push(legacyResult);
      
    } catch (error) {
      console.error(`Error analyzing news: ${item.title}`, error);
      // Return empty analysis on error
      analyses.push({
        newsItem: {
          title: item.title,
          article: item.content || '',
          date: new Date().toISOString(),
          source: item.source
        },
        analysis: null,
        validationErrors: [{ rule: 'analysis_failed', message: String(error), severity: 'error' }],
        extractedAssets: [],
        tradingViewTickers: {}
      });
    }
  }
  
  return { analyses };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT TYPES FOR EXTERNAL USE
// ═══════════════════════════════════════════════════════════════════════════════

export type { PerplexityResponse };
