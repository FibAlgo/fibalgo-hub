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
 * STAGE 1: OpenAI GPT-5.2 (thinking) veya Claude Haiku → Haber analizi + required_data
 * STAGE 2: Perplexity Sonar → AI Search ile veri toplama (paralel)
 * STAGE 3: OpenAI GPT-5.2 (thinking) veya Claude Sonnet → Final trading kararı
 *
 * OPENAI_API_KEY set ise Stage 1 ve Stage 3 GPT-5.2 kullanır; yoksa Claude kullanılır.
 * 
 * Avantajlar:
 * - Gerçek zamanlı web araması (Perplexity)
 * - GPT-5.2 veya Claude ile düşük maliyet
 * - Vercel uyumlu (Puppeteer yok)
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildFmpMarketReactionPack, type MarketReactionPack } from '@/lib/data/fmp-market';
import { getFmpAllowedSymbols, validateAndFixAffectedAssets } from '@/lib/data/fmp-allowed-symbols';
import { FMP_DATA_MENU, type FmpDataRequest } from '@/lib/data/fmp-request-types';
import { executeFmpRequests, type FmpCollectedPack } from '@/lib/data/fmp-data-executor';

// ═══════════════════════════════════════════════════════════════════════════════
// API KEYS
// ═══════════════════════════════════════════════════════════════════════════════

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

/** When set, Stage 1 and Stage 3 use OpenAI GPT-5.2 (thinking) instead of Claude. */
const USE_OPENAI_FOR_STAGE1_AND_STAGE3 = !!OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-5.2';
/** GPT-5.2 thinking: none | low | medium | high | xhigh. high = daha iyi analiz ama pahalı (~$1/25 haber Stage1); low/medium = ucuz. */
const OPENAI_REASONING_EFFORT = (process.env.OPENAI_REASONING_EFFORT as 'none' | 'low' | 'medium' | 'high' | 'xhigh') || 'high';

async function openaiChatCompletion(
  prompt: string,
  maxTokens: number
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: maxTokens,
      reasoning_effort: OPENAI_REASONING_EFFORT,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  const usage = {
    prompt_tokens: data.usage?.prompt_tokens ?? 0,
    completion_tokens: data.usage?.completion_tokens ?? 0,
  };
  return { content, usage };
}

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

export type ActionType = 'OPEN' | 'CLOSE' | 'HOLD' | 'SCALE_IN' | 'SCALE_OUT' | 'HEDGE' | 'REVERSE';
export type MemoryDirection = 'BUY' | 'SELL' | 'HOLD';
export type FlipRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PositionMemoryItem {
  asset: string;
  lastSignal?: {
    direction: MemoryDirection;
    signal?: string;
    conviction?: number; // 1-10
    timeHorizon?: 'short' | 'swing' | 'macro';
    minutesAgo?: number;
  };
  trendLast5?: MemoryDirection[];
  openPositionState?: {
    status: 'UNKNOWN' | 'OPEN' | 'CLOSED';
    direction?: 'LONG' | 'SHORT';
    entryPrice?: number;
    pnlPercent?: number;
    note?: string;
  };
  volatilityRegime?: string;
  marketRegime?: string;
  flipRisk?: FlipRisk;
  /**
   * Son 3 kayıt: UI'da gösterilen yazı + tam tarih + trade pozisyonları. Token patlamasın diye sadece bu 3 veri.
   */
  recentAnalyses?: Array<{
    /** İlgili haberin tam tarihi (ISO) */
    publishedAt?: string;
    /** FibAlgo agent'ta gösterilen yazı (başlık / özet) */
    displayText?: string;
    /** Stage 3 trade pozisyonları */
    positions?: Array<{ asset?: string; direction?: string; confidence?: number; trade_type?: string }>;
  }>;
}

export interface PositionMemorySummary {
  generatedAt: string;
  window: {
    shortHours: number;
    swingHours: number;
    macroDays: number;
  };
  assets: PositionMemoryItem[];
}

export interface Stage1Analysis {
  title: string;
  analysis: string;
  should_build_infrastructure: boolean;
  infrastructure_reasoning: string;
  category: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices' | 'macro' | '';
  affected_assets: string[];
  /**
   * Legacy: Perplexity search queries (kept for backward compatibility)
   */
  required_data: string[];
  /**
   * New: deterministic market-data collection plan (FMP-driven).
   * Stage 2 will fetch these from FMP (quote + intraday OHLCV) and derive metrics.
   */
  required_fmp_data?: {
    quote?: boolean;
    intraday?: Array<{
      interval: '1min' | '5min' | '15min' | '30min' | '1hour' | '4hour';
      lookback_minutes: number; // e.g. 120
    }>;
    benchmarks?: string[]; // optional TradingView assets (e.g., TVC:DXY, CBOE:VIX)
  };
  /**
   * Optional: use Perplexity to compute "external impact" metrics (narrative/priced-in/second-order effects).
   * Keep this small (0-2 queries).
   */
  required_web_metrics?: string[];
  /**
   * FMP data requests: Haiku lists which FMP data types it needs (quote, profile, intraday, earnings, etc.).
   * Stage 2 executes these and passes COLLECTED_FMP_DATA to Stage 3.
   */
  fmp_requests?: FmpDataRequest[];
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
  category?: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices' | 'macro';
  info_quality?: 'VERIFIED' | 'SPECULATIVE' | 'RUMOR';
  market_impact?: number;
  market_regime?: 'RISK-ON' | 'RISK-OFF';
  risk_mode?: 'NORMAL' | 'ELEVATED' | 'HIGH RISK';
  action_type?: ActionType;
  reason_for_action?: string;
  invalidation_signal?: string;
  position_memory?: PositionMemorySummary;
  positions: TradePosition[];
  /** Assets affected by this news in TradingView format (e.g. NASDAQ:AAPL, AMEX:SPY, TVC:DXY). Used for chart buttons. */
  tradingview_assets?: string[];
  main_risks: string[];
  overall_assessment: string;
}

export interface PerplexityData {
  query: string;
  data: string;
  citations: string[];
}

export interface ExternalImpactPack {
  provider: 'perplexity';
  generatedAt: string;
  metrics: {
    narrative_bias: 'bullish' | 'bearish' | 'mixed' | 'unclear';
    priced_in_likelihood_0_10: number;
    confidence_0_10: number;
    second_order_effects: string[];
    key_invalidation_triggers: string[];
  };
  sources: string[];
  notes?: string;
}

export interface AnalysisResult {
  news: NewsInput;
  stage1: Stage1Analysis;
  collectedData: PerplexityData[];
  stage3: Stage3Decision;
  market_reaction?: MarketReactionPack | null;
  /** FMP data fetched from Stage 1 fmp_requests (quote, profile, intraday, earnings, etc.) */
  collected_fmp_data?: FmpCollectedPack | null;
  external_impact?: ExternalImpactPack | null;
  stage2_debug?: {
    external_impact_raw?: {
      prompt: string;
      response: string;
      citations: string[];
    } | null;
  } | null;
  costs: {
    claudeHaiku: { input: number; output: number; cost: number; model?: string };
    perplexity: { prompt: number; completion: number; cost: number; requests: number };
    claudeSonnet: { input: number; output: number; cost: number };
    /** Set when Stage 1 & 3 use OpenAI GPT-5.2 (thinking). */
    openaiGpt52?: {
      stage1: { input: number; output: number; cost: number };
      stage3: { input: number; output: number; cost: number };
      totalCost: number;
    };
    total: number;
  };
  timing: {
    stage1Ms: number;
    stage2Ms: number;
    stage3Ms: number;
    totalMs: number;
  };
}

export interface PositionMemoryFetcherArgs {
  affectedAssets: string[];
  publishedAtIso: string;
  category?: Stage1Analysis['category'];
}

export interface AnalyzeWithPerplexityOptions {
  getPositionMemory?: (args: PositionMemoryFetcherArgs) => Promise<PositionMemorySummary | null>;
  /** Use Sonnet for Stage 1 instead of Haiku (cost test: 2x Sonnet, no Haiku) */
  useSonnetForStage1?: boolean;
  /** Skip all Perplexity calls (external impact + legacy collectedData) */
  skipPerplexity?: boolean;
}

function compactMarketReactionForStage3(mr: MarketReactionPack | null): unknown {
  if (!mr) return null;
  return {
    provider: mr.provider,
    generatedAt: mr.generatedAt,
    assets: (mr.assets || []).map((a) => {
      const candles = a.intraday?.candles || [];
      // Keep only a tiny trace (<=20 closes) to preserve micro-structure without token blow-up
      const lastCloses = candles
        .slice(0, 20)
        .map((c) => (typeof (c as any)?.close === 'number' ? Number((c as any).close.toFixed(6)) : null))
        .filter((x) => typeof x === 'number' && Number.isFinite(x));

      return {
        tvAsset: a.tvAsset,
        fmpSymbol: a.fmpSymbol,
        status: a.status,
        error: a.error,
        quote: a.quote
          ? {
              price: a.quote.price ?? null,
              change: a.quote.change ?? null,
              changesPercentage: a.quote.changesPercentage ?? null,
              dayHigh: a.quote.dayHigh ?? null,
              dayLow: a.quote.dayLow ?? null,
              open: a.quote.open ?? null,
              previousClose: a.quote.previousClose ?? null,
              volume: a.quote.volume ?? null,
              timestamp: a.quote.timestamp ?? null,
            }
          : null,
        intraday: a.intraday
          ? {
              interval: a.intraday.interval,
              lookbackMinutes: a.intraday.lookbackMinutes,
              derived: a.intraday.derived,
              lastCloses,
            }
          : null,
      };
    }),
  };
}

function clampText(s: unknown, maxLen: number): string {
  const str = String(s ?? '');
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

function pickBestQueries(rawQueries: string[]): string[] {
  // Cost target: keep Perplexity requests low while preserving quality.
  // We pick the most "verification/market reaction" oriented queries.
  const uniq = Array.from(
    new Set(
      (rawQueries || [])
        .map((q) => String(q || '').trim())
        .filter(Boolean)
    )
  );

  const score = (q: string) => {
    const s = q.toLowerCase();
    let v = 0;
    if (/(official|press release|sec|federal reserve|boj|opec|earnings|guidance|filing|8-k|regulator)/.test(s)) v += 4; // verification
    if (/(price reaction|intraday|market reaction|rall(y|ied)|selloff|break(s|ing) (key )?level|volume spike|volatility|iv|options|open interest)/.test(s)) v += 3; // market reaction
    if (/(today|last 24 hours|last hour|minutes|latest)/.test(s)) v += 2; // recency
    if (s.length > 120) v -= 1;
    return v;
  };

  const ranked = uniq
    .map((q) => ({ q, s: score(q) }))
    .sort((a, b) => b.s - a.s);

  // Hard cap: 2 queries max to hit <$0.05 while preserving quality
  return ranked.slice(0, 2).map((x) => x.q);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const STAGE_1_PROMPT = `You are an investor specializing in analyzing financial news (Scalping, Day Trading, Swing Trading, Position Trading).

CONTEXT — REAL-TIME NEWS: You are receiving this news in real time, as it has just been published. The headline and article are from a live feed. For news-driven trading, real-time receipt is critical: speed and recency directly affect edge and execution. Keep this in mind when deciding whether to build infrastructure and when analyzing impact.

NEWS DATE: {NEWS_DATE}

NEWS ARTICLE:
{NEWS_ARTICLE}

IMPORTANT CONSTRAINTS (must follow):
- Price/market data comes from FMP only. In "fmp_requests" list exactly what you need from the menu below (type + symbols from ALLOWED list).
{FMP_DATA_MENU}
- "required_web_metrics": only for narrative/external context (0–2 queries max): priced-in likelihood, spillover, official reactions.

ALLOWED FMP SYMBOLS (CRITICAL — affected_assets and fmp_requests.symbols MUST use ONLY these):
{ALLOWED_FMP_SYMBOLS}
- Do NOT use prefixes (no "FX:", "NASDAQ:", "BINANCE:"). Output the bare FMP symbol only.
- Do NOT use "AAPLUSD" or "SBUXUSD"; use "AAPL", "SBUX". Stocks are ticker only.

1. First, create a concise headline/title (max 100 characters) that summarizes the key point of this news for traders.

2. Analyze this news from a Scalping, Day Trading, Swing Trading, or Position Trading perspective, taking into account its publication date.

3. Based on your analysis of this news, would you start building a trading infrastructure for it?
(Remember, building a trading infrastructure for a news story is very difficult and costly. You need to make an important decision here.)
- Answer "YES" if: This news is important; I would research it and build a trading infrastructure for it.
- Answer "NO" if: This news is not important; it's not worth researching and building a trading infrastructure for it.

Do NOT answer "NO" solely because the affected tickers are not in the ALLOWED FMP symbol list. If the news is important (e.g. M&A, bankruptcy, earnings, macro), answer "YES". Then either: (a) pick the closest or most relevant symbols from the ALLOWED list (e.g. sector ETF, index, or related liquid ticker), or (b) leave affected_assets and fmp_requests empty so downstream can still store the analysis. Say "NO" only when the news is genuinely low-impact or noise.

IF YOUR ANSWER IS "YES", also answer questions 4-5-6:

4. Determine the category of this news (forex, crypto, stocks, commodities, indices, macro).

5. Identify and note the assets that this news will affect. (Write using FMP-ready canonical symbols only)

6. What FMP data do you need to evaluate this news? Put each need in "fmp_requests": { "type": "<from menu>", "symbols": ["from ALLOWED list"] }. Optional: "params" for intraday/eod/financials.

IF YOUR ANSWER IS "NO", leave fields 4-5-6 empty but still provide title and analysis.

Respond in JSON:
{
  "title": "Concise headline (max 100 chars)",
  "analysis": "Your analysis...",
  "should_build_infrastructure": true or false,
  "infrastructure_reasoning": "Explain in a professional, institutional tone why trading should or should not be pursued on this news. Do NOT start with 'NO —' or 'YES —'. Write a clear rationale (e.g. single-company event, tickers not in list, low impact, risk/reward).",
  "category": "forex|crypto|stocks|commodities|indices|macro or empty",
  "affected_assets": ["AAPL", "EURUSD"] or [] (ONLY from ALLOWED list),
  "fmp_requests": [
    { "type": "quote", "symbols": ["AAPL"] },
    { "type": "earnings", "symbols": ["AAPL"] }
  ] or [] (each type from menu, symbols from ALLOWED list; 1–5 items),
  "required_web_metrics": [] or 1–2 queries for narrative only,
  "required_data": []
}`;

const STAGE_3_PROMPT = `You are an investor specializing in analyzing financial news (Scalping, Day Trading, Swing Trading, Position Trading).

You previously analyzed this news:
{PREVIOUS_ANALYSIS}

5. I have tried to provide you with all the information you requested. Please examine and analyze it in detail:
{COLLECTED_DATA}

COLLECTED FMP DATA (from your fmp_requests – quote, profile, intraday, earnings, etc.):
{COLLECTED_FMP_DATA}

POSITION MEMORY (from database, may be empty):
{POSITION_MEMORY}

MARKET REACTION (from FMP, deterministic):
{MARKET_REACTION}

EXTERNAL IMPACT METRICS (from web research, optional):
{EXTERNAL_IMPACT}

Important:
- If MARKET_REACTION is missing or has no_data/no_api_key, do NOT claim specific intraday prices.
- In that case, explicitly state "market price data unavailable" and lower confidence / prefer NO TRADE.

How to use position memory (per asset: last 3 items, each with publishedAt, displayText, positions):
- publishedAt = exact news date; displayText = headline/summary shown in FibAlgo UI; positions = trade positions then.
- Compare past vs current: use dates and past positions to stay consistent; if you reverse view, explain invalidation.

CONSISTENCY (guidance):
- Use position memory and past analyses to stay internally consistent.
- If your current conclusion differs from the recent bias, explain the invalidation clearly.
- Always set action_type and reason_for_action.

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

19. What is the primary category of this news? (forex/crypto/stocks/commodities/indices/macro)

20. What are the main risks of this transaction?

21. CRITICAL — Chart assets: List ALL assets for charts in TradingView format ONLY. Every asset MUST be EXCHANGE:SYMBOL (e.g. FX:EURUSD, TVC:DXY, CBOE:VIX, SP:SPX, NASDAQ:NDX, COMEX:GC1!). NEVER use bare tickers (DXY, EURUSD, VIX). Use: FX: for forex, TVC: for DXY/gold/oil, CBOE: for VIX, BINANCE: for crypto, NASDAQ/NYSE/AMEX: for stocks, SP: for S&P 500, COMEX: for gold futures (GC1!). This is the only format the chart accepts.

Respond in JSON:
{
  "trade_decision": "TRADE" or "NO TRADE",
  "conviction": 8,
  "importance_score": 8,
  "category": "forex" or "crypto" or "stocks" or "commodities" or "indices" or "macro",
  "info_quality": "VERIFIED" or "SPECULATIVE" or "RUMOR",
  "market_impact": 7,
  "market_regime": "RISK-ON" or "RISK-OFF",
  "risk_mode": "NORMAL" or "ELEVATED" or "HIGH RISK",
  "action_type": "OPEN" or "CLOSE" or "HOLD" or "SCALE_IN" or "SCALE_OUT" or "HEDGE" or "REVERSE",
  "reason_for_action": "Short explanation focused on why this action makes sense now.",
  "invalidation_signal": "If reversing/contradicting last signal, specify what would invalidate the prior thesis (or empty string).",
  "positions": [
    {
      "asset": "FX:EURUSD",
      "direction": "BUY" or "SELL",
      "confidence": 85,
      "trade_type": "scalping" or "day_trading" or "swing_trading" or "position_trading",
      "momentum_duration_minutes": 240,
      "reasoning": "Why you opened this position..."
    }
  ],
  "tradingview_assets": ["FX:EURUSD", "TVC:DXY", "CBOE:VIX"],
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
        max_tokens: 1000,
        return_citations: true,
        // API only supports day/week/month/year. 'day' = last 24h (most recency we can request).
        search_recency_filter: 'day'
      }),
    });

    if (!response.ok) {
      console.error(`Web search API error: ${response.status}`);
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
    console.error(`Web search error: ${error}`);
    return null;
  }
}

async function getExternalImpactPack(
  webQueries: string[]
): Promise<{
  pack: ExternalImpactPack | null;
  usage?: { prompt_tokens: number; completion_tokens: number };
  raw?: { prompt: string; response: string; citations: string[] };
}> {
  const queries = Array.from(new Set((webQueries || []).map((q) => String(q || '').trim()).filter(Boolean))).slice(0, 2);
  if (queries.length === 0) return { pack: null };

  const prompt = `You are a market-impact analyst. Your task: produce a compact METRICS JSON about how this news is perceived externally.

Rules:
- Do NOT invent exact price numbers or OHLC. If asked, say "unknown" and focus on narrative/expectations.
- Prefer citing reputable sources (official statements, major outlets).
- Output MUST be valid JSON only.

Based on these web research prompts:
${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Return JSON:
{
  "narrative_bias": "bullish" | "bearish" | "mixed" | "unclear",
  "priced_in_likelihood_0_10": 0-10,
  "confidence_0_10": 0-10,
  "second_order_effects": ["..."],
  "key_invalidation_triggers": ["..."],
  "sources": ["url1","url2"]
}`;

  const result = await searchWithPerplexity(prompt);
  if (!result?.data) return { pack: null, usage: result?.usage, raw: result ? { prompt, response: result.data || '', citations: result.citations || [] } : undefined };

  let text = result.data.trim();
  text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // if it isn't JSON, fail closed
    parsed = null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      pack: null,
      usage: result.usage,
      raw: { prompt, response: result.data, citations: result.citations || [] },
    };
  }

  const sources = Array.isArray(parsed.sources) ? parsed.sources.filter(Boolean).slice(0, 3) : [];
  const pack: ExternalImpactPack = {
    provider: 'perplexity',
    generatedAt: new Date().toISOString(),
    metrics: {
      narrative_bias: (parsed.narrative_bias as any) || 'unclear',
      priced_in_likelihood_0_10: Math.max(0, Math.min(10, Number(parsed.priced_in_likelihood_0_10 ?? 5))),
      confidence_0_10: Math.max(0, Math.min(10, Number(parsed.confidence_0_10 ?? 5))),
      second_order_effects: Array.isArray(parsed.second_order_effects) ? parsed.second_order_effects.filter(Boolean).slice(0, 6) : [],
      key_invalidation_triggers: Array.isArray(parsed.key_invalidation_triggers) ? parsed.key_invalidation_triggers.filter(Boolean).slice(0, 6) : [],
    },
    sources,
    notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 400) : undefined,
  };

  return { pack, usage: result.usage, raw: { prompt, response: result.data, citations: result.citations || [] } };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeNewsWithPerplexity(news: NewsInput, options?: AnalyzeWithPerplexityOptions): Promise<AnalysisResult> {
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
  let openaiStage1Tokens = { input: 0, output: 0 };
  let openaiStage3Tokens = { input: 0, output: 0 };
  
  // Format date
  const formattedDate = new Date(news.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  
  // ========== FMP ALLOWED SYMBOLS (single source of truth for affected_assets) ==========
  const { allowedSet, promptBlock } = await getFmpAllowedSymbols();

  // ========== STAGE 1 (Claude Haiku or Sonnet) ==========
  const useSonnetForStage1 = !!options?.useSonnetForStage1;
  // Yapay zekaya sadece: yayın zamanı (NEWS_DATE) + içerik (makale varsa makale, yoksa title)
  const newsContent = (news.article && news.article.trim()) ? news.article : (news.title || '');

  const stage1Prompt = STAGE_1_PROMPT
    .replace('{NEWS_DATE}', formattedDate)
    .replace('{NEWS_ARTICLE}', newsContent)
    .replace('{FMP_DATA_MENU}', FMP_DATA_MENU)
    .replace('{ALLOWED_FMP_SYMBOLS}', promptBlock);
  
  let stage1Content: string;
  if (USE_OPENAI_FOR_STAGE1_AND_STAGE3) {
    const stage1Response = await openaiChatCompletion(
      stage1Prompt + '\n\nRespond ONLY with valid JSON, no other text.',
      2000
    );
    openaiStage1Tokens.input = stage1Response.usage.prompt_tokens;
    openaiStage1Tokens.output = stage1Response.usage.completion_tokens;
    stage1Content = stage1Response.content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  } else {
    const stage1Response = await anthropic.messages.create({
      model: useSonnetForStage1 ? 'claude-sonnet-4-5-20250929' : 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: stage1Prompt + '\n\nRespond ONLY with valid JSON, no other text.' }]
    });
    claudeHaikuTokens.input = stage1Response.usage?.input_tokens || 0;
    claudeHaikuTokens.output = stage1Response.usage?.output_tokens || 0;
    stage1Content = (stage1Response.content[0] as { text: string }).text || '{}';
    stage1Content = stage1Content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  
  // Robust JSON parsing with sanitization for Stage 1
  let stage1Data: Stage1Analysis;
  try {
    stage1Data = JSON.parse(stage1Content);
  } catch (parseError) {
    console.warn('Initial analysis JSON parse error, attempting to fix...');
    
    let fixedContent = stage1Content
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/}[^}]*$/, '}');
    
    try {
      stage1Data = JSON.parse(fixedContent);
    } catch {
      console.error('Failed to parse initial analysis response, using fallback');
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

  // Enforce FMP allowed symbols only (from FMP API / fallback list); fix e.g. AAPLUSD -> AAPL
  if (Array.isArray(stage1Data.affected_assets) && stage1Data.affected_assets.length > 0) {
    stage1Data.affected_assets = validateAndFixAffectedAssets(stage1Data.affected_assets, allowedSet);
  }
  if (Array.isArray(stage1Data.fmp_requests)) {
    for (const req of stage1Data.fmp_requests) {
      if (Array.isArray(req.symbols) && req.symbols.length > 0) {
        req.symbols = validateAndFixAffectedAssets(req.symbols, allowedSet);
      }
    }
  }

  // Legacy Perplexity queries (if any). We'll use Perplexity only for web metrics now.
  const requiredData = pickBestQueries(stage1Data.required_data || []);
  const webMetricQueries = pickBestQueries(stage1Data.required_web_metrics || []);
  const shouldBuildInfra = stage1Data.should_build_infrastructure ?? true;
  
  timings.stage1End = Date.now();
  
  // ========== INFRASTRUCTURE DECISION CHECK ==========
  // If AI decided NOT to build infrastructure, return early with minimal result
  if (!shouldBuildInfra) {
    const stage1CostOpenAI = USE_OPENAI_FOR_STAGE1_AND_STAGE3
      ? (openaiStage1Tokens.input / 1e6) * 1.75 + (openaiStage1Tokens.output / 1e6) * 14
      : 0;
    const haikuCost = USE_OPENAI_FOR_STAGE1_AND_STAGE3
      ? 0
      : (claudeHaikuTokens.input * 1.00 + claudeHaikuTokens.output * 5.00) / 1000000;
    const totalEarly = USE_OPENAI_FOR_STAGE1_AND_STAGE3 ? stage1CostOpenAI : haikuCost;
    // Kullanıcıya sadece açıklama göster; "NO —" / "YES —" önekini kaldır
    const rawReason = stage1Data.infrastructure_reasoning || 'This news does not present actionable trading opportunities.';
    const displayReason = rawReason.replace(/^(NO\s*[—\-]\s*|YES\s*[—\-]\s*)/i, '').trim();

    return {
      news,
      stage1: stage1Data,
      collectedData: [],
      stage3: {
        trade_decision: 'NO TRADE',
        importance_score: 1,
        positions: [],
        main_risks: ['News not worth building trading infrastructure'],
        overall_assessment: displayReason
      },
      market_reaction: null,
      external_impact: null,
      costs: {
        claudeHaiku: { input: claudeHaikuTokens.input, output: claudeHaikuTokens.output, cost: haikuCost },
        perplexity: { prompt: 0, completion: 0, cost: 0, requests: 0 },
        claudeSonnet: { input: 0, output: 0, cost: 0 },
        ...(USE_OPENAI_FOR_STAGE1_AND_STAGE3 && {
          openaiGpt52: {
            stage1: { input: openaiStage1Tokens.input, output: openaiStage1Tokens.output, cost: stage1CostOpenAI },
            stage3: { input: 0, output: 0, cost: 0 },
            totalCost: stage1CostOpenAI
          }
        }),
        total: totalEarly
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
  
  // ========== STAGE 2A (FMP Market Reaction – deterministic) ==========
  let marketReaction: MarketReactionPack | null = null;
  try {
    const fmpAssets = Array.isArray(stage1Data.affected_assets) ? stage1Data.affected_assets : [];
    // Always attempt to fetch market reaction for the top 1-3 assets.
    marketReaction = await buildFmpMarketReactionPack(fmpAssets);
  } catch (e) {
    console.warn('[Stage2A] FMP market reaction failed:', e);
    marketReaction = null;
  }

  // ========== STAGE 2A2 (FMP Data Requests – Haiku’nin istediği ek FMP verileri) ==========
  let collectedFmpData: FmpCollectedPack | null = null;
  const fmpRequests = Array.isArray(stage1Data.fmp_requests) ? stage1Data.fmp_requests : [];
  if (fmpRequests.length > 0) {
    try {
      collectedFmpData = await executeFmpRequests(fmpRequests, {
        allowedSymbols: allowedSet,
        newsDate: news.date,
      });
    } catch (e) {
      console.warn('[Analysis] Market data requests failed:', e);
    }
  }

  // ========== STAGE 2B (Perplexity – external impact metrics, optional) ==========
  let externalImpact: ExternalImpactPack | null = null;
  let stage2Debug: AnalysisResult['stage2_debug'] = null;

  // ========== STAGE 2C (Legacy Perplexity AI Search - Parallel) ==========
  interface QueryResult {
    index: number;
    query: string;
    data: string | null;
    citations: string[];
  }
  
  // External impact metrics: single Perplexity request (skip if skipPerplexity)
  const webMetricQueriesToRun = options?.skipPerplexity ? [] : webMetricQueries;
  if (webMetricQueriesToRun.length > 0) {
    perplexityRequests++;
    const ext = await getExternalImpactPack(webMetricQueriesToRun);
    externalImpact = ext.pack;
    if (ext.raw) {
      stage2Debug = stage2Debug || {};
      stage2Debug.external_impact_raw = ext.raw;
    }
    if (ext.usage) {
      perplexityTokens.prompt += ext.usage.prompt_tokens;
      perplexityTokens.completion += ext.usage.completion_tokens;
    }
  }

  // Legacy collectedData queries (skip if skipPerplexity)
  const requiredDataToRun = options?.skipPerplexity ? [] : requiredData;
  const allResults = await Promise.all(
    requiredDataToRun.map(async (query, index): Promise<QueryResult> => {
      const result = await searchWithPerplexity(query);
      perplexityRequests++;
      if (result && result.data) {
        perplexityTokens.prompt += result.usage.prompt_tokens;
        perplexityTokens.completion += result.usage.completion_tokens;
        return { index, query, data: result.data, citations: result.citations };
      }
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

  // Optional: position memory injected from DB by caller (cron/service routes)
  let positionMemory: PositionMemorySummary | null = null;
  try {
    const assets = Array.isArray(stage1Data.affected_assets) ? stage1Data.affected_assets : [];
    if (options?.getPositionMemory && assets.length > 0) {
      positionMemory = await options.getPositionMemory({
        // Haberle ilgili bütün assetlerin position history'si Stage 3'e gitsin (makul üst sınır: 8)
        affectedAssets: assets.slice(0, 8),
        publishedAtIso: formattedDate,
        category: stage1Data.category,
      });
    }
  } catch (e) {
    console.warn('[Analysis] Position memory fetch failed:', e);
    positionMemory = null;
  }
  
  // ========== STAGE 3 (Claude 4.5 Sonnet) ==========
  let formattedData = '';
  for (const item of collectedData) {
    formattedData += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    formattedData += `Query: "${item.query}"\n`;
    formattedData += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    // Limit token bloat: include a trimmed preview only
    formattedData += clampText(item.data, 1400);
    if (item.citations && item.citations.length > 0) {
      formattedData += `\n\n📚 Sources: ${item.citations.slice(0, 2).join(', ')}`;
    }
    formattedData += `\n`;
  }
  
  const collectedFmpDataForPrompt =
    collectedFmpData && Object.keys(collectedFmpData.byType).length > 0
      ? clampText(JSON.stringify(collectedFmpData), 3200)
      : '(No FMP data requested or fetched)';

  const stage3Prompt = STAGE_3_PROMPT
    // Minify JSON to reduce Sonnet input tokens (quality unchanged)
    .replace('{PREVIOUS_ANALYSIS}', JSON.stringify(stage1Data))
    .replace('{COLLECTED_DATA}', formattedData || '(No additional data collected)')
    .replace('{COLLECTED_FMP_DATA}', collectedFmpDataForPrompt)
    .replace('{POSITION_MEMORY}', positionMemory ? JSON.stringify(positionMemory) : '(No position memory available)')
    .replace('{MARKET_REACTION}', marketReaction ? JSON.stringify(compactMarketReactionForStage3(marketReaction)) : '(No market reaction available)')
    .replace('{EXTERNAL_IMPACT}', externalImpact ? JSON.stringify(externalImpact) : '(No external impact metrics)');
  
  let stage3Content: string;
  if (USE_OPENAI_FOR_STAGE1_AND_STAGE3) {
    const stage3Response = await openaiChatCompletion(
      stage3Prompt + '\n\nRespond ONLY with valid JSON, no other text.',
      2000
    );
    openaiStage3Tokens.input = stage3Response.usage.prompt_tokens;
    openaiStage3Tokens.output = stage3Response.usage.completion_tokens;
    stage3Content = stage3Response.content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  } else {
    const stage3Response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{ role: 'user', content: stage3Prompt + '\n\nRespond ONLY with valid JSON, no other text.' }]
    });
    claudeSonnetTokens.input = stage3Response.usage?.input_tokens || 0;
    claudeSonnetTokens.output = stage3Response.usage?.output_tokens || 0;
    stage3Content = (stage3Response.content[0] as { text: string }).text || '{}';
    stage3Content = stage3Content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  
  // Robust JSON parsing with sanitization
  let stage3Data: Stage3Decision;
  try {
    stage3Data = JSON.parse(stage3Content);
  } catch (parseError) {
    // Try to fix common JSON issues
    console.warn('Final analysis JSON parse error, attempting to fix...');
    
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
      console.error('Failed to parse final analysis response, using fallback');
      stage3Data = {
        trade_decision: 'NO TRADE',
        importance_score: 3,
        action_type: 'HOLD',
        reason_for_action: 'Fallback: failed to parse Stage 3 response.',
        invalidation_signal: '',
        positions: [],
        tradingview_assets: [],
        main_risks: ['JSON parse error - analysis incomplete'],
        overall_assessment: 'Analysis failed due to parsing error. Original response could not be processed.'
      };
    }
  }

  // Ensure memory is carried through for UI even if model omitted it
  if (positionMemory && !stage3Data.position_memory) {
    stage3Data.position_memory = positionMemory;
  }

  // Enforce TradingView format only (EXCHANGE:SYMBOL). No fallback — charts use only these.
  const tvFormat = /^[A-Za-z0-9]+:[A-Za-z0-9.!]+$/;
  const keepTv = (s: unknown): s is string => typeof s === 'string' && tvFormat.test(s.trim());
  if (Array.isArray(stage3Data.tradingview_assets)) {
    stage3Data.tradingview_assets = stage3Data.tradingview_assets.filter(keepTv).map((s: string) => s.trim());
  } else {
    stage3Data.tradingview_assets = [];
  }
  if (Array.isArray(stage3Data.positions)) {
    stage3Data.positions = stage3Data.positions
      .map((p) => ({ ...p, asset: typeof p.asset === 'string' ? p.asset.trim() : '' }))
      .filter((p) => keepTv(p.asset));
    if (stage3Data.tradingview_assets.length === 0 && stage3Data.positions.length > 0) {
      stage3Data.tradingview_assets = [...new Set(stage3Data.positions.map((p) => p.asset))];
    }
  }

  timings.stage3End = Date.now();
  
  // ========== COST CALCULATION ==========
  // Stage 1: OpenAI GPT-5.2 $1.75/1M in, $14/1M out OR Claude Haiku/Sonnet
  const stage1Cost = USE_OPENAI_FOR_STAGE1_AND_STAGE3
    ? (openaiStage1Tokens.input / 1e6) * 1.75 + (openaiStage1Tokens.output / 1e6) * 14
    : useSonnetForStage1
      ? (claudeHaikuTokens.input / 1e6) * 3 + (claudeHaikuTokens.output / 1e6) * 15
      : (claudeHaikuTokens.input / 1e6) * 1 + (claudeHaikuTokens.output / 1e6) * 5;
  // Perplexity: $1/1M + $0.005/request (0 if skipPerplexity)
  const perplexityTokenCost = (perplexityTokens.prompt / 1000000) * 1 + (perplexityTokens.completion / 1000000) * 1;
  const perplexityRequestCost = perplexityRequests * 0.005;
  const perplexityCost = perplexityTokenCost + perplexityRequestCost;
  // Stage 3: OpenAI GPT-5.2 $1.75/1M in, $14/1M out OR Claude Sonnet
  const stage3Cost = USE_OPENAI_FOR_STAGE1_AND_STAGE3
    ? (openaiStage3Tokens.input / 1e6) * 1.75 + (openaiStage3Tokens.output / 1e6) * 14
    : (claudeSonnetTokens.input / 1e6) * 3 + (claudeSonnetTokens.output / 1e6) * 15;

  return {
    news,
    stage1: stage1Data,
    collectedData,
    stage3: stage3Data,
    market_reaction: marketReaction,
    collected_fmp_data: collectedFmpData,
    external_impact: externalImpact,
    stage2_debug: stage2Debug,
    costs: {
      claudeHaiku: { 
        input: claudeHaikuTokens.input, 
        output: claudeHaikuTokens.output, 
        cost: USE_OPENAI_FOR_STAGE1_AND_STAGE3 ? 0 : stage1Cost,
        model: useSonnetForStage1 ? 'sonnet' : 'haiku'
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
        cost: USE_OPENAI_FOR_STAGE1_AND_STAGE3 ? 0 : stage3Cost 
      },
      ...(USE_OPENAI_FOR_STAGE1_AND_STAGE3 && {
        openaiGpt52: {
          stage1: { input: openaiStage1Tokens.input, output: openaiStage1Tokens.output, cost: stage1Cost },
          stage3: { input: openaiStage3Tokens.input, output: openaiStage3Tokens.output, cost: stage3Cost },
          totalCost: stage1Cost + stage3Cost
        }
      }),
      total: stage1Cost + perplexityCost + stage3Cost
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
