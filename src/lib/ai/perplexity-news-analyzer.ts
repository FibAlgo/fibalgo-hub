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
 * STAGE 1: DeepSeek V3.2 (reasoning) → Haber analizi + required_data
 * STAGE 2: Perplexity Sonar + FMP → Veri toplama (FMP yoksa Perplexity fallback)
 * STAGE 3: DeepSeek V3.2 (reasoning) → Final trading kararı
 *
 * DEEPSEEK_API_KEY zorunlu (Stage 1 ve Stage 3).
 * 
 * Avantajlar:
 * - Gerçek zamanlı web araması (Perplexity)
 * - DeepSeek V3.2 reasoning ile analiz (GPT-5 seviyesi, %95 daha ucuz)
 * - Vercel uyumlu (Puppeteer yok)
 */

import { buildFmpMarketReactionPack, type MarketReactionPack } from '@/lib/data/fmp-market';
import { getFmpAllowedSymbols, validateAndFixAffectedAssets } from '@/lib/data/fmp-allowed-symbols';
import { FMP_DATA_MENU, type FmpDataRequest } from '@/lib/data/fmp-request-types';
import { executeFmpRequests, type FmpCollectedPack } from '@/lib/data/fmp-data-executor';

// ═══════════════════════════════════════════════════════════════════════════════
// TRADINGVIEW FORMAT FIXER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TradingView asset format filtresi: sadece zaten EXCHANGE:SYMBOL olanları bırakır, dönüşüm yapmaz.
 */
function fixTradingViewFormat(assets: string[]): string[] {
  if (!Array.isArray(assets)) return [];
  const isTvFormat = (s: string) => /^[A-Z0-9]+:[A-Z0-9.!]+$/i.test(s);
  return assets
    .filter((asset) => typeof asset === 'string')
    .map((asset) => asset.trim())
    .filter((s): s is string => Boolean(s) && isTvFormat(s));
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADINGVIEW SLUG RESOLVER (uses TradingView symbols page redirect)
// ═══════════════════════════════════════════════════════════════════════════════

async function resolveTradingViewSlug(raw: string): Promise<string | null> {
  const query = String(raw || '').trim().toLowerCase();
  if (!query) return null;
  const url = `https://www.tradingview.com/symbols/${encodeURIComponent(query)}/`;
  try {
    const resp = await fetch(url, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const finalUrl = resp.url || url;
    const match = finalUrl.match(/\/symbols\/([^/]+)\//i);
    if (!match) return null;
    const slug = match[1]?.trim();
    return slug ? slug.toUpperCase() : null;
  } catch {
    return null;
  }
}

async function resolveTradingViewSlugs(assets: string[]): Promise<string[]> {
  const attempts = Array.isArray(assets) ? assets : [];
  const results = await Promise.all(attempts.map((a) => resolveTradingViewSlug(a)));
  return [...new Set(results.filter((x): x is string => Boolean(x)))];
}

// ═══════════════════════════════════════════════════════════════════════════════
// API KEYS
// ═══════════════════════════════════════════════════════════════════════════════

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

const DEEPSEEK_MODEL = 'deepseek-reasoner';
// Use a non-reasoning model for JSON repair/formatting to avoid chain-of-thought consuming tokens.
const DEEPSEEK_JSON_MODEL = process.env.DEEPSEEK_JSON_MODEL || 'deepseek-chat';

// DeepSeek token caps (output tokens). Keep configurable to tune cost vs truncation.
const DEEPSEEK_STAGE1_MAX_TOKENS = Number(process.env.DEEPSEEK_STAGE1_MAX_TOKENS ?? 6000);
const DEEPSEEK_STAGE3_MAX_TOKENS = Number(process.env.DEEPSEEK_STAGE3_MAX_TOKENS ?? 8000);

function strictJsonSuffix(schemaName: string): string {
  return (
    `\n\nIMPORTANT (${schemaName}):\n` +
    `- Output ONLY a single valid JSON object.\n` +
    `- Do NOT include markdown, code fences, comments, explanations, or any text outside the JSON.\n` +
    `- The first non-whitespace character MUST be '{' and the last MUST be '}'.\n`
  );
}

async function deepseekChatCompletion(
  prompt: string,
  maxTokens: number,
  model: string = DEEPSEEK_MODEL
): Promise<{ content: string; reasoning_content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a strict JSON generator. Output ONLY valid JSON. No markdown, no backticks, no extra text. Start with { and end with }.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const msg = data.choices?.[0]?.message;
  // DeepSeek Reasoner: reasoning_content may contain chain-of-thought. We prefer `content` (final answer).
  // We'll only fall back to reasoning_content at the *parsing* layer if needed.
  const content = msg?.content ?? '';
  const reasoningContent = msg?.reasoning_content ?? '';
  const usage = {
    prompt_tokens: data.usage?.prompt_tokens ?? 0,
    completion_tokens: data.usage?.completion_tokens ?? 0,
  };
  return { content, reasoning_content: reasoningContent, usage };
}

function buildStage1RepairPrompt(raw: string): string {
  return `You will be given an AI response that may include analysis text, markdown, or partial JSON.

Task: Output ONLY a single VALID JSON object matching this exact schema (no markdown, no code fences, no extra keys):
{
  "title": string,
  "analysis": string,
  "should_build_infrastructure": boolean,
  "infrastructure_reasoning": string,
  "category": "forex"|"crypto"|"stocks"|"commodities"|"indices"|"macro"|"earnings",
  "affected_assets": string[],
  "fmp_requests": any[],
  "required_web_metrics": string[],
  "required_data": string[]
}

Rules:
- Output MUST start with '{' and end with '}'. No leading/trailing text.
- Keep strings SHORT to avoid truncation: title<=100 chars, analysis<=600 chars, infrastructure_reasoning<=400 chars.
- Keep arrays small: affected_assets<=8, fmp_requests<=8, required_web_metrics<=2, required_data<=0.
- If you cannot infer an item safely, use empty string/empty array and set should_build_infrastructure=false.
- If should_build_infrastructure=false, still set category (choose the closest) and keep affected_assets/fmp_requests empty arrays.
- Ensure the JSON parses with JSON.parse (no trailing commas).

RAW INPUT:
${raw}
`;
}

function buildStage3RepairPrompt(raw: string): string {
  return `You will be given an AI response that may include analysis text, markdown, or partial JSON.

Task: Output ONLY a single VALID JSON object matching this exact schema (no markdown, no code fences, no extra keys):
{
  "trade_decision": "TRADE"|"NO TRADE",
  "news_sentiment": "BULLISH"|"BEARISH"|"NEUTRAL",
  "importance_score": number,
  "is_breaking": boolean,
  "breaking_reason": string,
  "action_type": "OPEN"|"CLOSE"|"HOLD"|"SCALE_IN"|"SCALE_OUT"|"HEDGE"|"REVERSE",
  "reason_for_action": string,
  "invalidation_signal": string,
  "positions": any[],
  "tradingview_assets": string[],
  "main_risks": string[],
  "overall_assessment": string
}

Rules:
- Output MUST start with '{' and end with '}'. No leading/trailing text.
- Keep strings SHORT to avoid truncation: reason_for_action<=350 chars, invalidation_signal<=220 chars, overall_assessment<=420 chars.
- breaking_reason<=220 chars.
- Keep arrays small: positions<=3, tradingview_assets<=6, main_risks<=6.
- tradingview_assets: Use valid TradingView EXCHANGE:SYMBOL format that exists in TradingView platform
- If unsure, default to NO TRADE, NEUTRAL, importance_score=3, action_type=HOLD.
- Ensure the JSON parses with JSON.parse (no trailing commas).

RAW INPUT:
${raw}
`;
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
  volatilityRegime?: string;
  marketRegime?: string;
  /**
   * Son 3 TRADE pozisyonu: UI'da gösterilen yazı + tam tarih + trade pozisyonları.
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
  assets: PositionMemoryItem[];
}

export interface Stage1Analysis {
  title: string;
  analysis: string;
  should_build_infrastructure: boolean;
  infrastructure_reasoning: string;
  category: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices' | 'macro' | 'earnings';
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
  news_sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  conviction?: number;
  importance_score: number;
  /** Whether this news should be labeled as BREAKING in UI/notifications. */
  is_breaking?: boolean;
  /** Short justification for breaking decision (kept concise). */
  breaking_reason?: string;
  category?: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices' | 'macro' | 'earnings';
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
    /** Set when Stage 1 & 3 use DeepSeek V3.2 (reasoning). */
    deepseek?: {
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
  /** Debug logs for troubleshooting - NOT shown in UI */
  debug_logs?: DebugLogEntry[];
}

/** Debug log entry for tracking issues */
export interface DebugLogEntry {
  timestamp: string;
  stage: 'stage1' | 'stage2' | 'stage3' | 'general';
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

export interface PositionMemoryFetcherArgs {
  affectedAssets: string[];
  publishedAtIso: string;
  category?: Stage1Analysis['category'];
}

export interface AnalyzeWithPerplexityOptions {
  getPositionMemory?: (args: PositionMemoryFetcherArgs) => Promise<PositionMemorySummary | null>;
  /** Skip all Perplexity calls (external impact + legacy collectedData + FMP fallback) */
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

  // Hard cap: 2 queries max to control Perplexity costs
  return ranked.slice(0, 2).map((x) => x.q);
}

/** Stage 1’de istenen veri FMP’de yoksa true (Perplexity fallback kullanılacak). */
function isFmpDataMissing(pack: FmpCollectedPack | null, requestType: string): boolean {
  if (!pack?.byType) return true;
  const value = pack.byType[requestType as keyof typeof pack.byType];
  if (value === undefined || value === null) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return true;
  return false;
}

/** Eksik FMP isteği için Perplexity’de aranacak kısa İngilizce sorgu. */
function fmpRequestToPerplexityQuery(req: FmpDataRequest): string {
  const type = (req?.type || '').replace(/_/g, ' ');
  const symbols = Array.isArray(req?.symbols) ? req.symbols.join(', ') : '';
  const params = req?.params || {};
  const indicator = (params.indicator_name as string) || '';
  if (type === 'quote' || type === 'batch quote') return `${symbols} stock current price and today change latest`;
  if (type === 'profile') return `${symbols} company profile market cap latest`;
  if (type === 'intraday') return `${symbols} stock intraday price movement today`;
  if (type === 'eod') return `${symbols} stock daily closing price recent days`;
  if (type === 'income statement' || type === 'balance sheet' || type === 'cash flow') return `${symbols} ${type} financials latest`;
  if (type === 'key metrics' || type === 'ratios') return `${symbols} key metrics ratios valuation latest`;
  if (type === 'earnings') return `${symbols} latest earnings report EPS revenue`;
  if (type === 'dividends') return `${symbols} dividend history yield`;
  if (type === 'analyst estimates' || type === 'price target') return `${symbols} analyst estimates price target`;
  if (type === 'earnings calendar') return 'earnings calendar upcoming US stocks';
  if (type === 'economic indicators') return `US ${indicator || 'GDP unemployment inflation'} latest economic data`;
  if (type === 'treasury rates') return 'US treasury rates 10 year 2 year latest';
  if (type === 'key executives') return `${symbols} key executives management`;
  if (type === 'insider trading') return `${symbols} insider trading activity recent`;
  if (type === 'rsi' || type === 'atr' || type === 'bollinger bands') return `${symbols} ${type} technical indicator latest`;
  return `${symbols} ${type} latest data`.trim() || 'financial market data latest';
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

3. Based on your analysis of this news, would you start building a trading infrastructure for it? (Yes, this news is important; I would research it and build a trading infrastructure for it. / No, this news is not important; it's not worth researching and building a trading infrastructure for it.)

Do NOT answer "NO" solely because the affected tickers are not in the ALLOWED FMP symbol list. If the news is important, answer "YES". Then either: (a) pick the closest or most relevant symbols from the ALLOWED list (e.g. sector ETF, index, or related liquid ticker), or (b) leave affected_assets and fmp_requests empty so downstream can still store the analysis.

IF YOUR ANSWER IS "YES", also answer questions 4-5-6:

4. REQUIRED - Determine the category of this news. You MUST choose exactly one from: forex, crypto, stocks, commodities, indices, macro, earnings. Do NOT leave empty or use any other value.

5. Identify and note the assets that this news will affect. (Write using FMP-ready canonical symbols only)

6. What FMP data do you need to evaluate this news? Put each need in "fmp_requests": { "type": "<from menu>", "symbols": ["from ALLOWED list"] }. Optional: "params" for intraday/eod/financials.

IF YOUR ANSWER IS "NO", you MUST still choose a valid "category" value, but keep "affected_assets" and "fmp_requests" as empty arrays.

Respond in JSON:
{
  "title": "Concise headline (max 100 chars)",
  "analysis": "Your analysis...",
  "should_build_infrastructure": true or false,
  "infrastructure_reasoning": "Explain in a professional, institutional tone why trading should or should not be pursued on this news. Do NOT start with 'NO —' or 'YES —'. Write a clear rationale (e.g. single-company event, tickers not in list, low impact, risk/reward).",
  "category": "forex" or "crypto" or "stocks" or "commodities" or "indices" or "macro" or "earnings" (REQUIRED - must choose one),
  "affected_assets": ["AAPL", "EURUSD"] or [] (ONLY from ALLOWED list),
  "fmp_requests": [
    { "type": "quote", "symbols": ["AAPL"] },
    { "type": "earnings", "symbols": ["AAPL"] },
    { "type": "market_snapshot" },
    { "type": "treasury_rates" }
  ] or [] (each type from menu, symbols from ALLOWED list; no limit on FMP requests),
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

6. Based on this analysis, the importance of the news, the data, and the fact that you were one of the first to receive the news, would you open a position? (Remember, you don't have to trade, but it would be foolish not to take advantage of an opportunity. You need to make a logical and important decision.)

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

19. What is the primary category of this news? You MUST choose one: forex, crypto, stocks, commodities, indices, macro, earnings

20. What are the main risks of this transaction?

21. CRITICAL — Chart assets: List ONLY assets that EXIST in TradingView in exact EXCHANGE:SYMBOL format. NEVER include assets that don't exist in TradingView. MANDATORY format examples: FX:EURUSD (forex), TVC:DXY (dollar index), CBOE:VIX (volatility), NASDAQ:AAPL (stocks), BINANCE:BTCUSDT (crypto), COMEX:GC1! (gold futures), SP:SPX (S&P 500). DO NOT include: (1) Assets without exchange prefix (DXY, EURUSD, VIX), (2) Invalid/non-existent symbols, (3) Custom tickers, (4) Assets you're unsure about. When in doubt, EXCLUDE the asset. Only include assets you are 100% certain exist in TradingView with that exact format.

22. Regardless of trading positions and data, if you analyze this news, what type of news do you think it is: bullish, bearish, or neutral?

23. Is this BREAKING news? (true/false) — EXTREMELY STRICT: Only mark as breaking if this news would cause IMMEDIATE market-wide structural shifts that force ALL major market participants to reposition within MINUTES. Must meet ALL criteria: (1) Completely unexpected/surprise nature, (2) Forces immediate repricing of major asset classes, (3) Creates urgent systemic risk or opportunity, (4) Requires immediate institutional response. Examples that qualify: Fed surprise emergency rate cuts/hikes, major central bank interventions, sudden geopolitical warfare/invasions, systemic bank failures, regulatory market shutdowns, major currency pegs breaking. DO NOT mark as breaking: scheduled economic data (even if surprising numbers), earnings (even massive beats/misses), routine policy announcements, analyst calls, company updates, minor geopolitical tensions, sector-specific news, or anything that was anticipated or scheduled.

24. If you marked this as breaking news, provide a brief reason why it qualifies as a market maker event that forces immediate institutional repositioning (max 200 chars). If not breaking, write "Not breaking news."

Respond in JSON:
{
  "trade_decision": "TRADE" or "NO TRADE",
  "news_sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "conviction": 8,
  "importance_score": 8,
  "is_breaking": true or false,
  "breaking_reason": "Brief explanation if breaking, or 'Not breaking news.'",
  "category": "forex" or "crypto" or "stocks" or "commodities" or "indices" or "macro" or "earnings",
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
  "tradingview_assets": ["FX:EURUSD", "SP:SPX", "NASDAQ:AAPL"],
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
  // Limit to 2 queries to control Perplexity costs
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

/** Extract first complete JSON object from string (handles extra text before/after or inside markdown). */
function extractFirstJsonObject(str: string): string | null {
  const start = str.indexOf('{');
  if (start === -1) return null;
  let depth = 1;
  let i = start + 1;
  let inString = false;
  let escape = false;
  while (i < str.length) {
    const c = str[i];
    if (escape) {
      escape = false;
      i++;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      i++;
      continue;
    }
    if (!inString) {
      if (c === '"') {
        inString = true;
        i++;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return str.slice(start, i + 1);
      }
    } else {
      if (c === '"') inString = false;
    }
    i++;
  }
  return null;
}

/** Try to get parseable JSON from raw LLM output: strip BOM/control chars, try code blocks. */
function tryNormalizeJsonContent(raw: string): string[] {
  const candidates: string[] = [];
  let s = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  candidates.push(s);
  candidates.push(s.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());
  const codeBlockMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) candidates.push(codeBlockMatch[1].trim());
  const extracted = extractFirstJsonObject(s);
  if (extracted) candidates.push(extracted);
  return [...new Set(candidates)].filter(Boolean);
}

function parseJsonWithRepairs<T>(raw: string): T | null {
  const candidates = tryNormalizeJsonContent(raw);
  const fixTrailing = (s: string) =>
    s.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/}[^}]*$/, '}');

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try simple trailing-comma + truncation repair
      try {
        return JSON.parse(fixTrailing(candidate)) as T;
      } catch {
        const ext = extractFirstJsonObject(fixTrailing(candidate));
        if (ext) {
          try {
            return JSON.parse(ext) as T;
          } catch {
            /* next */
          }
        }
      }
    }
  }
  return null;
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

  // Debug logs collection - will be saved to database for troubleshooting
  const debugLogs: DebugLogEntry[] = [];
  const addLog = (stage: DebugLogEntry['stage'], level: DebugLogEntry['level'], message: string, data?: Record<string, unknown>) => {
    debugLogs.push({
      timestamp: new Date().toISOString(),
      stage,
      level,
      message,
      data
    });
  };
  
  // Token tracking
  let perplexityTokens = { prompt: 0, completion: 0 };
  let perplexityRequests = 0;
  let openaiStage1Tokens = { input: 0, output: 0 };
  let openaiStage3Tokens = { input: 0, output: 0 };
  
  // Format date
  const formattedDate = new Date(news.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  
  // ========== FMP ALLOWED SYMBOLS (single source of truth for affected_assets) ==========
  const { allowedSet, promptBlock } = await getFmpAllowedSymbols();

  // ========== STAGE 1 (DeepSeek V3.2 reasoning) ==========
  // Yapay zekaya sadece: yayın zamanı (NEWS_DATE) + içerik (makale varsa makale, yoksa title)
  const newsContent = (news.article && news.article.trim()) ? news.article : (news.title || '');

  const stage1Prompt = STAGE_1_PROMPT
    .replace('{NEWS_DATE}', formattedDate)
    .replace('{NEWS_ARTICLE}', newsContent)
    .replace('{FMP_DATA_MENU}', FMP_DATA_MENU)
    .replace('{ALLOWED_FMP_SYMBOLS}', promptBlock);
  
  addLog('stage1', 'info', 'Starting Stage 1 DeepSeek call', { 
    model: DEEPSEEK_MODEL,
    promptLength: stage1Prompt.length,
    maxTokens: DEEPSEEK_STAGE1_MAX_TOKENS,
    newsTitle: news.title?.slice(0, 100)
  });

  let stage1Response;
  try {
    stage1Response = await deepseekChatCompletion(
      stage1Prompt + strictJsonSuffix('Stage 1'),
      DEEPSEEK_STAGE1_MAX_TOKENS,
    );
  } catch (apiError) {
    const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
    addLog('stage1', 'error', 'DeepSeek API call failed', { error: errMsg });
    throw apiError;
  }

  openaiStage1Tokens.input = stage1Response.usage.prompt_tokens;
  openaiStage1Tokens.output = stage1Response.usage.completion_tokens;
  const stage1ContentRaw = stage1Response.content ?? '';
  const stage1ReasoningRaw = stage1Response.reasoning_content ?? '';

  addLog('stage1', 'info', 'Stage 1 API response received', {
    inputTokens: openaiStage1Tokens.input,
    outputTokens: openaiStage1Tokens.output,
    hitMaxTokens: openaiStage1Tokens.output >= Math.max(1, DEEPSEEK_STAGE1_MAX_TOKENS - 20),
    contentLength: stage1ContentRaw.length,
    contentPreview: stage1ContentRaw.slice(0, 200),
    reasoningLength: stage1ReasoningRaw.length
  });

  let stage1Data: Stage1Analysis | null = null;
  let stage1RawUsed = '';
  let stage1RawSource: 'content' | 'reasoning_content' | 'repair_content' | 'repair_reasoning_content' | 'none' =
    'none';

  if (stage1ContentRaw.trim()) {
    stage1Data = parseJsonWithRepairs<Stage1Analysis>(stage1ContentRaw);
    if (stage1Data) {
      stage1RawUsed = stage1ContentRaw;
      stage1RawSource = 'content';
    }
  }

  if (!stage1Data && stage1ReasoningRaw.trim()) {
    stage1Data = parseJsonWithRepairs<Stage1Analysis>(stage1ReasoningRaw);
    if (stage1Data) {
      stage1RawUsed = stage1ReasoningRaw;
      stage1RawSource = 'reasoning_content';
    }
  }

  if (!stage1Data) {
    // Last resort: ask DeepSeek to re-emit strict JSON from the raw output.
    const rawForRepair = `${stage1ContentRaw}\n\n---\n\n${stage1ReasoningRaw}`.trim().slice(0, 12000);
    addLog('stage1', 'warn', 'Stage 1 parse failed; attempting JSON repair retry', {
      contentLength: stage1ContentRaw.length,
      reasoningLength: stage1ReasoningRaw.length,
      repairInputLength: rawForRepair.length,
    });

    try {
      const repairResp = await deepseekChatCompletion(buildStage1RepairPrompt(rawForRepair), 1200, DEEPSEEK_JSON_MODEL);
      openaiStage1Tokens.input += repairResp.usage.prompt_tokens;
      openaiStage1Tokens.output += repairResp.usage.completion_tokens;

      const repairContent = repairResp.content ?? '';
      const repairReasoning = repairResp.reasoning_content ?? '';

      stage1Data = parseJsonWithRepairs<Stage1Analysis>(repairContent);
      if (stage1Data) {
        stage1RawUsed = repairContent;
        stage1RawSource = 'repair_content';
      } else {
        stage1Data = parseJsonWithRepairs<Stage1Analysis>(repairReasoning);
        if (stage1Data) {
          stage1RawUsed = repairReasoning;
          stage1RawSource = 'repair_reasoning_content';
        }
      }

      addLog('stage1', 'info', 'Stage 1 repair attempt completed', {
        repaired: Boolean(stage1Data),
        totalInputTokens: openaiStage1Tokens.input,
        totalOutputTokens: openaiStage1Tokens.output,
        repairContentLength: repairContent.length,
        repairReasoningLength: repairReasoning.length,
        repairHitMaxTokens: repairResp.usage.completion_tokens >= 1190,
        repairModel: DEEPSEEK_JSON_MODEL,
      });
    } catch (repairError) {
      const errMsg = repairError instanceof Error ? repairError.message : String(repairError);
      addLog('stage1', 'error', 'Stage 1 JSON repair retry failed', { error: errMsg });
    }
  }

  if (!stage1RawUsed) stage1RawUsed = stage1ContentRaw;

  if (!stage1Data) {
    // DETAILED ERROR LOGGING - this is the critical part for debugging
    addLog('stage1', 'error', 'JSON PARSE FAILED - Raw response could not be parsed', {
      sourceUsed: stage1RawSource,
      contentLength: stage1ContentRaw.length,
      contentStart: stage1ContentRaw.slice(0, 500),
      contentEnd: stage1ContentRaw.slice(-500),
      reasoningLength: stage1ReasoningRaw.length,
      reasoningStart: stage1ReasoningRaw.slice(0, 500),
      reasoningEnd: stage1ReasoningRaw.slice(-500),
      rawUsedLength: stage1RawUsed.length,
      rawUsedStart: stage1RawUsed.slice(0, 500),
      rawUsedEnd: stage1RawUsed.slice(-500),
      rawUsedAsJson: JSON.stringify(stage1RawUsed.slice(0, 1000)), // Shows escape chars
      charCodes: stage1RawUsed.slice(0, 50).split('').map(c => c.charCodeAt(0)), // Check for weird chars
      inputTokens: openaiStage1Tokens.input,
      outputTokens: openaiStage1Tokens.output,
      newsTitle: news.title,
      newsSource: news.source
    });

    console.error('[Stage 1] PARSE FAILED - Check debug_logs in database');
    console.error('[Stage 1] Content length:', stage1ContentRaw.length);
    console.error('[Stage 1] Reasoning length:', stage1ReasoningRaw.length);
    console.error('[Stage 1] Used source:', stage1RawSource);
    console.error('[Stage 1] First 200 (used):', stage1RawUsed.slice(0, 200));
    
    stage1Data = {
      title: 'Analysis Error',
      analysis: `JSON parse failed. Check debug_logs column in database for full raw response.`,
      should_build_infrastructure: false,
      infrastructure_reasoning: `Parse error - content length: ${stage1ContentRaw.length}, reasoning length: ${stage1ReasoningRaw.length}`,
      category: 'macro',
      affected_assets: [],
      required_data: []
    } as Stage1Analysis;
  } else {
    // Normalize to protect downstream logic from partial/invalid model output
    const allowedCats = new Set<Stage1Analysis['category']>([
      'forex',
      'crypto',
      'stocks',
      'commodities',
      'indices',
      'macro',
      'earnings',
    ]);
    stage1Data.title = typeof stage1Data.title === 'string' ? stage1Data.title : 'Untitled';
    stage1Data.analysis = typeof stage1Data.analysis === 'string' ? stage1Data.analysis : '';
    stage1Data.infrastructure_reasoning =
      typeof stage1Data.infrastructure_reasoning === 'string' ? stage1Data.infrastructure_reasoning : '';
    stage1Data.should_build_infrastructure =
      typeof stage1Data.should_build_infrastructure === 'boolean' ? stage1Data.should_build_infrastructure : true;
    stage1Data.category = allowedCats.has(stage1Data.category as Stage1Analysis['category'])
      ? (stage1Data.category as Stage1Analysis['category'])
      : 'macro';
    stage1Data.affected_assets = Array.isArray(stage1Data.affected_assets)
      ? stage1Data.affected_assets.filter((x): x is string => typeof x === 'string').map((s) => s.trim())
      : [];
    stage1Data.required_data = Array.isArray(stage1Data.required_data)
      ? stage1Data.required_data.filter((x): x is string => typeof x === 'string').map((s) => s.trim())
      : [];
    stage1Data.required_web_metrics = Array.isArray(stage1Data.required_web_metrics)
      ? stage1Data.required_web_metrics.filter((x): x is string => typeof x === 'string').map((s) => s.trim())
      : [];
    stage1Data.fmp_requests = Array.isArray(stage1Data.fmp_requests) ? stage1Data.fmp_requests : [];

    addLog('stage1', 'info', 'Stage 1 parsed successfully', {
      title: stage1Data.title?.slice(0, 100),
      category: stage1Data.category,
      shouldBuild: stage1Data.should_build_infrastructure,
      affectedAssets: stage1Data.affected_assets,
      parsedFrom: stage1RawSource
    });
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
    const stage1Cost = (openaiStage1Tokens.input / 1e6) * 0.28 + (openaiStage1Tokens.output / 1e6) * 0.42;
    // Kullanıcıya sadece açıklama göster; "NO —" / "YES —" önekini kaldır
    const rawReason = stage1Data.infrastructure_reasoning || 'This news does not present actionable trading opportunities.';
    const displayReason = rawReason.replace(/^(NO\s*[—\-]\s*|YES\s*[—\-]\s*)/i, '').trim();

    addLog('general', 'info', 'Early exit - infrastructure not needed', { reason: displayReason });
    
    return {
      news,
      stage1: stage1Data,
      collectedData: [],
      stage3: {
        trade_decision: 'NO TRADE',
        news_sentiment: 'NEUTRAL',
        importance_score: 1,
        positions: [],
        main_risks: ['News filtered out at Stage 1 - no market relevance'],
        overall_assessment: displayReason
      },
      market_reaction: null,
      external_impact: null,
      costs: {
        claudeHaiku: { input: 0, output: 0, cost: 0 },
        perplexity: { prompt: 0, completion: 0, cost: 0, requests: 0 },
        claudeSonnet: { input: 0, output: 0, cost: 0 },
        deepseek: {
          stage1: { input: openaiStage1Tokens.input, output: openaiStage1Tokens.output, cost: stage1Cost },
          stage3: { input: 0, output: 0, cost: 0 },
          totalCost: stage1Cost
        },
        total: stage1Cost
      },
      timing: {
        stage1Ms: timings.stage1End - timings.stage1Start,
        stage2Ms: 0,
        stage3Ms: 0,
        totalMs: timings.stage1End - timings.stage1Start
      },
      debug_logs: debugLogs.length > 0 ? debugLogs : undefined
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
  
  // Stage 2 FMP fallback: Stage 1’de istenen veriler FMP’de yoksa Perplexity ile topla
  const missingFmpRequests = (options?.skipPerplexity ? [] : fmpRequests).filter((req) =>
    isFmpDataMissing(collectedFmpData, req.type)
  );
  // Limit FMP fallback to Perplexity to 3 queries to control costs
  if (missingFmpRequests.length > 0) {
    const fallbackCap = 3;
    for (const req of missingFmpRequests.slice(0, fallbackCap)) {
      const query = fmpRequestToPerplexityQuery(req);
      const result = await searchWithPerplexity(query);
      perplexityRequests++;
      if (result?.data) {
        perplexityTokens.prompt += result.usage.prompt_tokens;
        perplexityTokens.completion += result.usage.completion_tokens;
        collectedData.push({
          query: `[FMP fallback – data not in FMP] ${query}`,
          data: result.data,
          citations: result.citations,
        });
      }
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
        // No limit - send all affected assets for position memory
        affectedAssets: assets,
        publishedAtIso: formattedDate,
        category: stage1Data.category,
      });
    }
  } catch (e) {
    console.warn('[Analysis] Position memory fetch failed:', e);
    positionMemory = null;
  }
  
  // ========== STAGE 3 prompt build ==========
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
  
  // ========== STAGE 3 (DeepSeek V3.2 reasoning) ==========
  addLog('stage3', 'info', 'Starting Stage 3 DeepSeek call', {
    model: DEEPSEEK_MODEL,
    promptLength: stage3Prompt.length,
    maxTokens: DEEPSEEK_STAGE3_MAX_TOKENS
  });

  let stage3Response;
  try {
    stage3Response = await deepseekChatCompletion(
      stage3Prompt + strictJsonSuffix('Stage 3'),
      DEEPSEEK_STAGE3_MAX_TOKENS,
    );
  } catch (apiError) {
    const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
    addLog('stage3', 'error', 'Stage 3 DeepSeek API call failed', { error: errMsg });
    throw apiError;
  }

  openaiStage3Tokens.input = stage3Response.usage.prompt_tokens;
  openaiStage3Tokens.output = stage3Response.usage.completion_tokens;
  const stage3ContentRaw = stage3Response.content ?? '';
  const stage3ReasoningRaw = stage3Response.reasoning_content ?? '';

  addLog('stage3', 'info', 'Stage 3 API response received', {
    inputTokens: openaiStage3Tokens.input,
    outputTokens: openaiStage3Tokens.output,
    hitMaxTokens: openaiStage3Tokens.output >= Math.max(1, DEEPSEEK_STAGE3_MAX_TOKENS - 20),
    contentLength: stage3ContentRaw.length,
    contentPreview: stage3ContentRaw.slice(0, 200),
    reasoningLength: stage3ReasoningRaw.length
  });

  const parseStage3 = (raw: string): Stage3Decision | undefined => {
    const stage3Candidates = tryNormalizeJsonContent(raw);
    const fixTrailing3 = (s: string) =>
      s.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/}[^}]*$/, '}');

    for (const candidate of stage3Candidates) {
      try {
        return JSON.parse(candidate) as Stage3Decision;
      } catch {
        try {
          return JSON.parse(fixTrailing3(candidate)) as Stage3Decision;
        } catch {
          const ext = extractFirstJsonObject(fixTrailing3(candidate));
          if (ext) {
            try {
              return JSON.parse(ext) as Stage3Decision;
            } catch {
              /* next candidate */
            }
          }
        }
      }
    }
    return undefined;
  };

  let stage3Data: Stage3Decision | undefined = undefined;
  let stage3RawSource: 'content' | 'reasoning_content' | 'repair_content' | 'repair_reasoning_content' | 'none' =
    'none';

  if (stage3ContentRaw.trim()) {
    stage3Data = parseStage3(stage3ContentRaw);
    if (stage3Data) stage3RawSource = 'content';
  }

  if (!stage3Data && stage3ReasoningRaw.trim()) {
    stage3Data = parseStage3(stage3ReasoningRaw);
    if (stage3Data) stage3RawSource = 'reasoning_content';
  }

  if (!stage3Data) {
    const rawForRepair = `${stage3ContentRaw}\n\n---\n\n${stage3ReasoningRaw}`.trim().slice(0, 12000);
    addLog('stage3', 'warn', 'Stage 3 parse failed; attempting JSON repair retry', {
      contentLength: stage3ContentRaw.length,
      reasoningLength: stage3ReasoningRaw.length,
      repairInputLength: rawForRepair.length,
    });

    try {
      const repairResp = await deepseekChatCompletion(buildStage3RepairPrompt(rawForRepair), 1400, DEEPSEEK_JSON_MODEL);
      openaiStage3Tokens.input += repairResp.usage.prompt_tokens;
      openaiStage3Tokens.output += repairResp.usage.completion_tokens;

      const repairContent = repairResp.content ?? '';
      const repairReasoning = repairResp.reasoning_content ?? '';

      stage3Data = parseStage3(repairContent);
      if (stage3Data) {
        stage3RawSource = 'repair_content';
      } else {
        stage3Data = parseStage3(repairReasoning);
        if (stage3Data) stage3RawSource = 'repair_reasoning_content';
      }

      addLog('stage3', 'info', 'Stage 3 repair attempt completed', {
        repaired: Boolean(stage3Data),
        totalInputTokens: openaiStage3Tokens.input,
        totalOutputTokens: openaiStage3Tokens.output,
        repairContentLength: repairContent.length,
        repairReasoningLength: repairReasoning.length,
        repairHitMaxTokens: repairResp.usage.completion_tokens >= 1390,
        repairModel: DEEPSEEK_JSON_MODEL,
      });
    } catch (repairError) {
      const errMsg = repairError instanceof Error ? repairError.message : String(repairError);
      addLog('stage3', 'error', 'Stage 3 JSON repair retry failed', { error: errMsg });
    }
  }

  if (!stage3Data) {
    // DETAILED ERROR LOGGING for Stage 3
    addLog('stage3', 'error', 'STAGE 3 JSON PARSE FAILED', {
      sourceUsed: stage3RawSource,
      contentLength: stage3ContentRaw.length,
      contentStart: stage3ContentRaw.slice(0, 500),
      contentEnd: stage3ContentRaw.slice(-500),
      reasoningLength: stage3ReasoningRaw.length,
      reasoningStart: stage3ReasoningRaw.slice(0, 500),
      reasoningEnd: stage3ReasoningRaw.slice(-500),
      rawUsedStart: (stage3ContentRaw || stage3ReasoningRaw).slice(0, 500),
      rawUsedEnd: (stage3ContentRaw || stage3ReasoningRaw).slice(-500),
      rawUsedAsJson: JSON.stringify((stage3ContentRaw || stage3ReasoningRaw).slice(0, 1000)),
      charCodes: (stage3ContentRaw || stage3ReasoningRaw).slice(0, 50).split('').map(c => c.charCodeAt(0)),
      inputTokens: openaiStage3Tokens.input,
      outputTokens: openaiStage3Tokens.output
    });

    console.error('[Stage 3] PARSE FAILED - Check debug_logs in database');
    
    stage3Data = {
      trade_decision: 'NO TRADE',
      news_sentiment: 'NEUTRAL',
      importance_score: 3,
      action_type: 'HOLD',
      reason_for_action: 'Fallback: failed to parse Stage 3 response. Check debug_logs.',
      invalidation_signal: '',
      positions: [],
      tradingview_assets: [],
      main_risks: ['JSON parse error - analysis incomplete'],
      overall_assessment: 'Analysis failed due to parsing error. Check debug_logs column in database.'
    };
  } else {
    // Normalize Stage 3 output (model sometimes omits/changes types)
    stage3Data.trade_decision = stage3Data.trade_decision === 'TRADE' ? 'TRADE' : 'NO TRADE';
    stage3Data.news_sentiment =
      stage3Data.news_sentiment === 'BULLISH'
        ? 'BULLISH'
        : stage3Data.news_sentiment === 'BEARISH'
          ? 'BEARISH'
          : 'NEUTRAL';
    stage3Data.importance_score =
      typeof stage3Data.importance_score === 'number' && Number.isFinite(stage3Data.importance_score)
        ? stage3Data.importance_score
        : 3;
    stage3Data.action_type =
      stage3Data.action_type &&
      ['OPEN', 'CLOSE', 'HOLD', 'SCALE_IN', 'SCALE_OUT', 'HEDGE', 'REVERSE'].includes(stage3Data.action_type)
        ? stage3Data.action_type
        : 'HOLD';
    stage3Data.reason_for_action =
      typeof stage3Data.reason_for_action === 'string' ? stage3Data.reason_for_action : '';
    stage3Data.invalidation_signal =
      typeof stage3Data.invalidation_signal === 'string' ? stage3Data.invalidation_signal : '';
    stage3Data.positions = Array.isArray(stage3Data.positions) ? stage3Data.positions : [];
    stage3Data.tradingview_assets = Array.isArray(stage3Data.tradingview_assets) ? stage3Data.tradingview_assets : [];
    stage3Data.main_risks = Array.isArray(stage3Data.main_risks) ? stage3Data.main_risks : [];
    stage3Data.overall_assessment =
      typeof stage3Data.overall_assessment === 'string' ? stage3Data.overall_assessment : '';

    stage3Data.is_breaking = typeof stage3Data.is_breaking === 'boolean' ? stage3Data.is_breaking : undefined;
    stage3Data.breaking_reason = typeof stage3Data.breaking_reason === 'string' ? stage3Data.breaking_reason : undefined;

    addLog('stage3', 'info', 'Stage 3 parsed successfully', {
      tradeDecision: stage3Data.trade_decision,
      sentiment: stage3Data.news_sentiment,
      importanceScore: stage3Data.importance_score,
      positionsCount: stage3Data.positions?.length || 0,
      parsedFrom: stage3RawSource
    });
  }

  // Ensure memory is carried through for UI even if model omitted it
  if (positionMemory && !stage3Data.position_memory) {
    stage3Data.position_memory = positionMemory;
  }

  // Resolve TradingView assets via TradingView symbols redirect (no mapping/heuristic)
  const rawAssets = Array.isArray(stage3Data.tradingview_assets) ? stage3Data.tradingview_assets : [];
  const positionAssets = Array.isArray(stage3Data.positions) ? stage3Data.positions.map((p) => p.asset) : [];
  const sourceAssets = rawAssets.length > 0 ? rawAssets : positionAssets;

  const resolved = await resolveTradingViewSlugs(sourceAssets);
  stage3Data.tradingview_assets = resolved;

  // Update positions with resolved slugs if available
  if (Array.isArray(stage3Data.positions)) {
    stage3Data.positions = await Promise.all(stage3Data.positions.map(async (pos) => {
      const slug = await resolveTradingViewSlug(pos.asset);
      return { ...pos, asset: slug || pos.asset };
    }));
  }

  timings.stage3End = Date.now();
  
  // ========== COST CALCULATION ==========
  const stage1Cost = (openaiStage1Tokens.input / 1e6) * 0.28 + (openaiStage1Tokens.output / 1e6) * 0.42;
  const perplexityTokenCost = (perplexityTokens.prompt / 1000000) * 1 + (perplexityTokens.completion / 1000000) * 1;
  const perplexityRequestCost = perplexityRequests * 0.005;
  const perplexityCost = perplexityTokenCost + perplexityRequestCost;
  const stage3Cost = (openaiStage3Tokens.input / 1e6) * 0.28 + (openaiStage3Tokens.output / 1e6) * 0.42;

  // Final log summary
  const hasErrors = debugLogs.some(l => l.level === 'error');
  if (hasErrors) {
    addLog('general', 'warn', 'Analysis completed WITH ERRORS - check error logs above');
  } else {
    addLog('general', 'info', 'Analysis completed successfully');
  }

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
      claudeHaiku: { input: 0, output: 0, cost: 0 },
      perplexity: { 
        prompt: perplexityTokens.prompt, 
        completion: perplexityTokens.completion, 
        cost: perplexityCost,
        requests: perplexityRequests
      },
      claudeSonnet: { input: 0, output: 0, cost: 0 },
      deepseek: {
        stage1: { input: openaiStage1Tokens.input, output: openaiStage1Tokens.output, cost: stage1Cost },
        stage3: { input: openaiStage3Tokens.input, output: openaiStage3Tokens.output, cost: stage3Cost },
        totalCost: stage1Cost + stage3Cost
      },
      total: stage1Cost + perplexityCost + stage3Cost
    },
    timing: {
      stage1Ms: timings.stage1End - timings.stage1Start,
      stage2Ms: timings.stage2End - timings.stage2Start,
      stage3Ms: timings.stage3End - timings.stage3Start,
      totalMs: timings.stage3End - timings.stage1Start
    },
    debug_logs: debugLogs.length > 0 ? debugLogs : undefined
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
  
  // Determine if breaking news (prefer explicit Stage 3 field)
  const isBreaking = typeof stage3.is_breaking === 'boolean' ? stage3.is_breaking : stage3.importance_score >= 8;
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
