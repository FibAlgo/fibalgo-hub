/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🗓️ EVENT ANALYSIS SYSTEM (3-Stage Pipeline)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Haber analiz sistemi (perplexity-news-analyzer.ts) ile aynı yapı:
 * 
 * STAGE 1: OpenAI GPT-5.2 → Event sınıflandırma + fmp_requests + web queries
 * STAGE 2: FMP Data Fetch + Perplexity Web Search (paralel)
 * STAGE 3: OpenAI GPT-5.2 → Final event analysis (UI kartlarına uygun çıktı)
 *
 * Tek seferlik analiz: upcoming'da üretilir, live/post'ta aynı analiz gösterilir.
 */

import { getFmpAllowedSymbols, validateAndFixAffectedAssets } from '@/lib/data/fmp-allowed-symbols';
import { FMP_DATA_MENU, type FmpDataRequest } from '@/lib/data/fmp-request-types';
import { executeFmpRequests, type FmpCollectedPack } from '@/lib/data/fmp-data-executor';
import type { PositionMemorySummary } from './perplexity-news-analyzer';

// ═══════════════════════════════════════════════════════════════════════════════
// API KEYS & CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = 'gpt-5.2';
const OPENAI_REASONING_EFFORT = (process.env.OPENAI_REASONING_EFFORT as 'none' | 'low' | 'medium' | 'high' | 'xhigh') || 'high';
const OPENAI_STAGE3_MAX_TOKENS =
  (Number.parseInt(process.env.OPENAI_STAGE3_MAX_TOKENS || '', 10) || 5500);
// Stage 3 needs LONG JSON output. With high reasoning effort, some thinking models can spend the entire
// completion budget on reasoning tokens and return empty message.content (finish_reason: "length").
// Keep Stage 1 high if you want, but make Stage 3 "output-first".
const OPENAI_STAGE3_REASONING_EFFORT =
  (process.env.OPENAI_STAGE3_REASONING_EFFORT as 'none' | 'low' | 'medium' | 'high' | 'xhigh') || 'low';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type EventType = 'macro' | 'earnings' | 'ipo' | 'crypto';

export interface EventInput {
  name: string;
  date: string;
  time: string;
  timezone: string;
  country: string;
  currency: string;
  importance: string;
  /** Event type: macro (economic), earnings, ipo, crypto */
  type: EventType;
  // Macro events
  forecast: number | null;
  previous: number | null;
  forecastLow?: number | null;
  forecastMedian?: number | null;
  forecastHigh?: number | null;
  // Earnings events
  symbol?: string;
  companyName?: string;
  epsEstimate?: number | null;
  revenueEstimate?: number | null;
  epsActual?: number | null;
  revenueActual?: number | null;
  // IPO events
  priceRangeLow?: number | null;
  priceRangeHigh?: number | null;
  ipoPrice?: number | null;
  shares?: number | null;
  exchange?: string;
}

export interface Stage1EventAnalysis {
  title: string;
  analysis: string;
  category: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices' | 'macro' | '';
  affected_assets: string[];
  fmp_requests: FmpDataRequest[];
  required_web_metrics: string[];
  event_tier: 1 | 2 | 3;
  expected_volatility: 'low' | 'moderate' | 'high' | 'extreme';
}

export interface ScenarioTrade {
  asset: string;
  direction: 'long' | 'short';
  trigger: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  riskRewardRatio: string;
  timeHorizon: string;
  invalidation: string;
  confidence: number;
}

export interface ScenarioPlaybook {
  label: string;
  /** Array of trades for this scenario - can be 0, 1, or multiple assets */
  trades?: ScenarioTrade[];
  /** If no trade for this scenario */
  action?: 'no_trade';
  reason?: string;
  watchNext?: string;
  notes?: string;
}

export interface Stage3EventDecision {
  /** 1-10. Urgency to act around the event (for UI meters). */
  urgency_score?: number;
  /** 1-10. Market moving potential for this event (for UI meters). */
  market_mover_score?: number;
  /** 1-10. Overall conviction score (can mirror preEventStrategy.conviction). */
  conviction_score?: number;
  eventClassification: {
    tier: 1 | 2 | 3;
    expectedVolatility: 'low' | 'moderate' | 'high' | 'extreme';
    primaryAffectedAssets: string[];
    secondaryAffectedAssets: string[];
  };
  historicalAnalysis: {
    beatRate: string;
    averageSurprise: string;
    typicalReaction: string;
    reactionDuration: string;
    fadePattern: boolean;
    keyInsight: string;
  };
  expectationsAnalysis: {
    forecastAssessment: 'conservative' | 'aggressive' | 'realistic';
    whisperNumber: string | null;
    whatWouldSurprise: string;
    pricedInLevel: string;
  };
  scenarios: {
    bigBeat: { threshold: string; probability: string; expectedReaction: { assets: Record<string, string>; duration: string; confidence: string } };
    smallBeat: { threshold: string; probability: string; expectedReaction: { assets: Record<string, string>; duration: string; confidence: string } };
    inline: { threshold: string; probability: string; expectedReaction: { assets: Record<string, string>; duration: string; confidence: string } };
    smallMiss: { threshold: string; probability: string; expectedReaction: { assets: Record<string, string>; duration: string; confidence: string } };
    bigMiss: { threshold: string; probability: string; expectedReaction: { assets: Record<string, string>; duration: string; confidence: string } };
  };
  scenarioPlaybook: {
    bigBeat: ScenarioPlaybook;
    smallBeat: ScenarioPlaybook;
    inline: ScenarioPlaybook;
    smallMiss: ScenarioPlaybook;
    bigMiss: ScenarioPlaybook;
  };
  positioningAnalysis: {
    currentPositioning: string;
    crowdedSide: 'long' | 'short' | 'neutral';
    painTrade: string;
  };
  preEventStrategy: {
    recommendedApproach: 'position_before' | 'wait_and_react' | 'fade_move' | 'no_trade';
    reasoning: string;
    conviction: number;
    timeHorizon: string;
  };
  tradeSetup: {
    hasTrade: boolean;
    bullish?: {
      trigger: string;
      direction: 'long';
      asset: string;
      entry: string;
      stopLoss: string;
      takeProfit: string;
      riskRewardRatio: string;
      timeHorizon: string;
      invalidation: string;
    };
    bearish?: {
      trigger: string;
      direction: 'short';
      asset: string;
      entry: string;
      stopLoss: string;
      takeProfit: string;
      riskRewardRatio: string;
      timeHorizon: string;
      invalidation: string;
    };
    inline?: {
      action: 'no_trade';
      reason: string;
    };
    alternativeAssets?: {
      ifBeat: Array<{ asset: string; direction: 'long' | 'short'; rationale: string }>;
      ifMiss: Array<{ asset: string; direction: 'long' | 'short'; rationale: string }>;
    };
  };
  keyRisks: string[];
  summary: string;
  /** TradingView format assets for charts (e.g., FX:EURUSD, TVC:DXY) */
  tradingview_assets?: string[];
}

export interface PerplexityData {
  query: string;
  data: string;
  citations: string[];
}

export interface EventAnalysisResult {
  event: EventInput;
  stage1: Stage1EventAnalysis;
  collectedData: PerplexityData[];
  collected_fmp_data: FmpCollectedPack | null;
  stage3: Stage3EventDecision;
  /** Position memory from news analysis (READ-ONLY, event does NOT write to position history) */
  position_memory?: PositionMemorySummary | null;
  pipeline: {
    mode: 'single_upcoming';
    generatedAt: string;
    models: {
      stage1: { model: string; reasoning_effort: string };
      stage2_fmp: { provider: 'fmp' };
      stage2_web: { provider: 'perplexity'; model: string | null };
      stage3: { model: string; reasoning_effort: string };
    };
  };
  costs: {
    openai: { stage1: { input: number; output: number; cost: number }; stage3: { input: number; output: number; cost: number }; totalCost: number };
    perplexity: { prompt: number; completion: number; cost: number; requests: number };
    total: number;
  };
  timing: {
    stage1Ms: number;
    stage2Ms: number;
    stage3Ms: number;
    totalMs: number;
  };
}

/**
 * Options for event analysis.
 * Event analysis READS position memory but does NOT WRITE to it.
 * Only news analysis writes to position history.
 */
export interface EventAnalysisOptions {
  /**
   * Callback to fetch position memory from news_analyses table.
   * Event analysis uses this READ-ONLY to see current positions from news trades.
   */
  getPositionMemory?: (params: {
    affectedAssets: string[];
    eventDateIso: string;
    category: string;
  }) => Promise<PositionMemorySummary | null>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPENAI HELPER
// ═══════════════════════════════════════════════════════════════════════════════

async function openaiChatCompletion(
  prompt: string,
  maxTokens: number,
  debugLabel: 'stage1' | 'stage3' | 'stage3_retry' | 'stage3_repair' | 'other' = 'other',
  reasoningEffort: 'none' | 'low' | 'medium' | 'high' | 'xhigh' = OPENAI_REASONING_EFFORT
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  
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
      reasoning_effort: reasoningEffort,
    }),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }
  
  const data = (await res.json()) as any;
  
  // Debug: Log response structure (lightweight) so we can tell Stage1 vs Stage3
  try {
    const firstChoice = data.choices?.[0];
    const content = firstChoice?.message?.content ?? '';
    console.log(`[OpenAI][${debugLabel}] keys:`, Object.keys(data));
    console.log(`[OpenAI][${debugLabel}] choices:`, data.choices?.length ?? 0);
    console.log(`[OpenAI][${debugLabel}] contentLen:`, content.length);
    console.log(`[OpenAI][${debugLabel}] contentHead:`, content.slice(0, 220));
    console.log(`[OpenAI][${debugLabel}] usage:`, data.usage || null);
    // When content is empty, log the full choice payload (often has finish_reason/refusal/tool_calls)
    if (!content || content.length === 0) {
      console.log(`[OpenAI][${debugLabel}] firstChoiceRaw:`, JSON.stringify(firstChoice || null).slice(0, 1200));
    }
  } catch {
    // ignore
  }
  
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERPLEXITY HELPER
// ═══════════════════════════════════════════════════════════════════════════════

async function searchWithPerplexity(
  query: string
): Promise<{ data: string; citations: string[]; usage: { prompt_tokens: number; completion_tokens: number } } | null> {
  if (!PERPLEXITY_API_KEY) return null;
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a financial research assistant. Provide factual, data-driven answers with specific numbers, dates, and sources. Be concise but comprehensive. Focus on trading-relevant information for economic events.',
          },
          { role: 'user', content: query },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        return_citations: true,
        search_recency_filter: 'week',
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    return {
      data: content,
      citations,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0 },
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON PARSING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function extractFirstJsonObject(str: string): string | null {
  const start = str.indexOf('{');
  if (start === -1) return null;
  let depth = 1;
  let i = start + 1;
  let inString = false;
  let escape = false;
  while (i < str.length) {
    const c = str[i];
    if (escape) { escape = false; i++; continue; }
    if (c === '\\' && inString) { escape = true; i++; continue; }
    if (!inString) {
      if (c === '"') { inString = true; i++; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return str.slice(start, i + 1); }
    } else {
      if (c === '"') inString = false;
    }
    i++;
  }
  return null;
}

function tryNormalizeJsonContent(raw: string): string[] {
  const candidates: string[] = [];
  let s = String(raw || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  candidates.push(s);
  candidates.push(s.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());
  const codeBlockMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) candidates.push(codeBlockMatch[1].trim());
  const extracted = extractFirstJsonObject(s);
  if (extracted) candidates.push(extracted);
  return [...new Set(candidates)].filter(Boolean);
}

function parseJsonSafe(raw: string): any | null {
  const candidates = tryNormalizeJsonContent(raw);
  const fixTrailing = (s: string) => s.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  
  for (const c of candidates) {
    try { return JSON.parse(c); } catch { /* next */ }
    try { return JSON.parse(fixTrailing(c)); } catch { /* next */ }
    const ext = extractFirstJsonObject(fixTrailing(c));
    if (ext) {
      try { return JSON.parse(ext); } catch { /* next */ }
    }
  }
  return null;
}

function normalizeRecommendedApproach(value: any): 'position_before' | 'wait_and_react' | 'fade_move' | 'no_trade' | null {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, '_').replace(/-/g, '_');
  if (cleaned === 'position_before') return 'position_before';
  if (cleaned === 'wait_and_react' || cleaned === 'wait_react' || cleaned === 'wait_and_reaction') return 'wait_and_react';
  if (cleaned === 'fade_move' || cleaned === 'fade_the_move') return 'fade_move';
  if (cleaned === 'no_trade' || cleaned === 'notrade' || cleaned === 'none') return 'no_trade';
  return null;
}

function clampScore10(v: any, fallback: number): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  const r = Math.round(n);
  return Math.max(1, Math.min(10, r));
}

function deriveMarketMoverScore(tier: any, vol: any): number {
  const t = Number(tier);
  let base = t === 1 ? 9 : t === 2 ? 7 : 5;
  const v = String(vol || '').toLowerCase();
  if (v === 'extreme') base += 2;
  else if (v === 'high') base += 1;
  else if (v === 'low') base -= 1;
  return Math.max(1, Math.min(10, base));
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 1 PROMPTS (by event type)
// ═══════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────────
// MACRO EVENTS (CPI, NFP, FOMC, GDP, PMI, etc.)
// ────────────────────────────────────────────────────────────────────────────────

const STAGE_1_PROMPT_MACRO = `You are an event-driven macro analyst. You are receiving an upcoming economic/financial EVENT (not a news article).

CONTEXT — REAL-TIME EVENT: This event will happen soon. You need to classify it and determine what data is needed for a full trade-ready analysis.

IMPORTANT: ALL events proceed to full Stage 3 analysis. Stage 1 is ONLY for classification and data planning.
Even low-impact events get analyzed - Stage 3 will decide if there's a trade or not.

EVENT DATE: {EVENT_DATE}
EVENT NAME: {EVENT_NAME}
COUNTRY: {EVENT_COUNTRY}
CURRENCY: {EVENT_CURRENCY}
IMPORTANCE: {EVENT_IMPORTANCE}
FORECAST: {EVENT_FORECAST}
PREVIOUS: {EVENT_PREVIOUS}

IMPORTANT CONSTRAINTS (must follow):
- Price/market data comes from FMP only. In "fmp_requests" list exactly what you need from the menu below.
{FMP_DATA_MENU}
- "required_web_metrics": web queries for narrative/context (0–3 queries max): whisper numbers, market expectations, key components traders watch, policy implications.

ALLOWED FMP SYMBOLS (CRITICAL — affected_assets and fmp_requests.symbols MUST use ONLY these):
{ALLOWED_FMP_SYMBOLS}
- Do NOT use prefixes (no "FX:", "NASDAQ:"). Output the bare FMP symbol only.

TASKS:
1. Create a concise title for this event (max 80 chars).
2. Provide brief analysis of why this event matters (2-3 sentences).
3. Classify the event tier:
   - TIER 1: FOMC, NFP, CPI, ECB/BOJ/BOE decisions, GDP → expect 1-3% moves
   - TIER 2: PCE, PPI, Retail Sales, PMI, Major earnings → expect 0.5-1.5% moves
   - TIER 3: Housing, Confidence, Trade Balance → expect 0.2-0.5% moves
4. Determine category: forex | crypto | stocks | commodities | indices | macro
5. List affected_assets (FMP symbols only, from ALLOWED list) - can be 1 or many
6. List fmp_requests: what FMP data you need (quote, intraday, profile, etc.)
7. List required_web_metrics: 0-3 web queries for context (whisper, expectations, components)

Respond ONLY with valid JSON:
{
  "title": "string (max 80 chars)",
  "analysis": "Why this event matters (2-3 sentences)",
  "category": "forex" | "crypto" | "stocks" | "commodities" | "indices" | "macro",
  "affected_assets": ["SPY", "DXY", "EURUSD"] (FMP symbols from ALLOWED list - can be 1 or many),
  "fmp_requests": [
    { "type": "quote", "symbols": ["SPY", "DXY"] },
    { "type": "intraday", "symbols": ["SPY"], "params": { "interval": "5min", "lookback_minutes": 120 } }
  ],
  "required_web_metrics": ["CPI whisper number expectations February 2026", "What components traders focus on for CPI"],
  "event_tier": 1 | 2 | 3,
  "expected_volatility": "low" | "moderate" | "high" | "extreme"
}`;

// ────────────────────────────────────────────────────────────────────────────────
// EARNINGS EVENTS (Company earnings reports)
// ────────────────────────────────────────────────────────────────────────────────

const STAGE_1_PROMPT_EARNINGS = `You are an equity analyst specializing in earnings events. You are receiving an upcoming EARNINGS report.

CONTEXT — EARNINGS EVENT: This company will report earnings soon. Classify and determine data needs.

IMPORTANT: ALL events proceed to full Stage 3 analysis. Stage 1 is ONLY for classification and data planning.

COMPANY: {SYMBOL} ({COMPANY_NAME})
EARNINGS DATE: {EVENT_DATE}
EPS ESTIMATE: {EPS_ESTIMATE}
REVENUE ESTIMATE: {REVENUE_ESTIMATE}
PREVIOUS EPS: {PREVIOUS_EPS}

IMPORTANT CONSTRAINTS (must follow):
- Price/market data comes from FMP only. In "fmp_requests" list exactly what you need from the menu below.
{FMP_DATA_MENU}
- "required_web_metrics": web queries for context (0–3 max): whisper numbers, guidance expectations, key metrics to watch.

ALLOWED FMP SYMBOLS:
{ALLOWED_FMP_SYMBOLS}

TASKS:
1. Create a concise title (max 80 chars).
2. Analyze why this earnings matters (2-3 sentences).
3. Classify the event tier:
   - TIER 1: Mega-cap (AAPL, NVDA, MSFT, AMZN, GOOGL, META, TSLA) → market-moving
   - TIER 2: Large-cap / sector leaders → sector impact
   - TIER 3: Mid/small-cap → stock-specific
4. Category: always "stocks" for earnings
5. affected_assets: the stock + related ETFs/sector plays
6. fmp_requests: quote, profile, earnings, key_metrics, etc.
7. required_web_metrics: whisper EPS, guidance expectations, key metrics

Respond ONLY with valid JSON:
{
  "title": "NVDA Q4 Earnings",
  "analysis": "Why this earnings matters...",
  "category": "stocks",
  "affected_assets": ["NVDA", "SMH", "QQQ", "AMD"],
  "fmp_requests": [
    { "type": "quote", "symbols": ["NVDA", "SMH", "AMD"] },
    { "type": "profile", "symbols": ["NVDA"] },
    { "type": "earnings", "symbols": ["NVDA"] }
  ],
  "required_web_metrics": ["NVDA Q4 2026 whisper EPS", "NVDA data center revenue expectations"],
  "event_tier": 1 | 2 | 3,
  "expected_volatility": "low" | "moderate" | "high" | "extreme"
}`;

// ────────────────────────────────────────────────────────────────────────────────
// IPO EVENTS (Initial Public Offerings)
// ────────────────────────────────────────────────────────────────────────────────

const STAGE_1_PROMPT_IPO = `You are an IPO analyst. You are receiving an upcoming IPO event.

CONTEXT — IPO EVENT: This company is going public. Classify and determine data needs.

IMPORTANT: ALL events proceed to full Stage 3 analysis. Stage 1 is ONLY for classification and data planning.

COMPANY: {COMPANY_NAME}
IPO DATE: {EVENT_DATE}
SYMBOL: {SYMBOL}
EXCHANGE: {EXCHANGE}
PRICE RANGE: {PRICE_RANGE_LOW} - {PRICE_RANGE_HIGH}
SHARES OFFERED: {SHARES}

IMPORTANT CONSTRAINTS:
- Price/market data comes from FMP only.
{FMP_DATA_MENU}
- "required_web_metrics": web queries for context (0–3 max): demand, valuation, comparables.

ALLOWED FMP SYMBOLS:
{ALLOWED_FMP_SYMBOLS}

TASKS:
1. Create a concise title (max 80 chars).
2. Analyze why this IPO matters (2-3 sentences).
3. Classify the event tier:
   - TIER 1: High-profile/unicorn IPO (>$10B valuation)
   - TIER 2: Notable IPO (>$1B valuation)
   - TIER 3: Smaller IPO
4. Category: always "stocks" for IPOs
5. affected_assets: comparable companies, sector ETFs
6. fmp_requests: quote for comparables, sector ETFs
7. required_web_metrics: demand, valuation, institutional interest

Respond ONLY with valid JSON:
{
  "title": "Reddit IPO",
  "analysis": "Why this IPO matters...",
  "category": "stocks",
  "affected_assets": ["XLK", "QQQ", "SNAP", "META"],
  "fmp_requests": [
    { "type": "quote", "symbols": ["SNAP", "META", "XLK"] }
  ],
  "required_web_metrics": ["Reddit IPO demand", "Reddit IPO valuation vs comparables"],
  "event_tier": 1 | 2 | 3,
  "expected_volatility": "low" | "moderate" | "high" | "extreme"
}`;

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 3 PROMPTS (by event type)
// ═══════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────────
// MACRO EVENTS Stage 3
// ────────────────────────────────────────────────────────────────────────────────

const STAGE_3_PROMPT_MACRO = `You are a senior macro strategist at a $15 billion global macro hedge fund. You specialize in event-driven trading.

CRITICAL SYSTEM NOTE:
- This is the ONLY analysis run for this event (no post-event re-analysis).
- Your output must remain useful when the event is upcoming, live, AND after it becomes past.
- Therefore you MUST cover ALL 5 plausible outcomes with complete trade playbooks.

You previously classified this event:
{STAGE1_ANALYSIS}

EVENT DETAILS:
{EVENT_DETAILS}

COLLECTED FMP DATA (quote, profile, intraday, etc.):
{COLLECTED_FMP_DATA}

WEB RESEARCH (Perplexity):
{WEB_RESEARCH}

POSITION MEMORY (READ-ONLY from News Analysis):
{POSITION_MEMORY}
- This shows CURRENT POSITIONS from the news analysis system (not events).
- Use this to AVOID CONFLICTING with existing news-based trades.
- If you see an open position, consider whether the event could invalidate it.
- DO NOT assume these positions are from events - they are from news trades only.

═══════════════════════════════════════════════════════════════════
                         ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════════

Execute ALL steps:

STEP 1: EVENT CLASSIFICATION
- Confirm tier (1/2/3), volatility expectation, primary & secondary assets

STEP 2: HISTORICAL PATTERN ANALYSIS
- Beat/miss rate, average surprise, typical reaction, duration, fade pattern

STEP 3: EXPECTATIONS ANALYSIS
- Forecast assessment, whisper number (from web research), what would surprise

STEP 4: SCENARIO MAPPING (ALL 5 SCENARIOS)
For each scenario, provide:
1. bigBeat (> +15% vs forecast)
2. smallBeat (+5% to +15%)
3. inline (-5% to +5%)
4. smallMiss (-5% to -15%)
5. bigMiss (< -15%)

Each scenario needs: threshold, probability, expected asset reactions, duration

STEP 5: SCENARIO PLAYBOOK (MANDATORY FOR ALL 5)
For EACH scenario, you have two options:

OPTION A - TRADE(S):
- trades: array of 1 or MORE trade setups (can trade multiple assets)
- Each trade: { asset, direction, trigger, entry, stopLoss, takeProfit, riskRewardRatio, timeHorizon, invalidation, confidence }

OPTION B - NO TRADE:
- action: "no_trade"
- reason: why no trade for this scenario
- watchNext: what to monitor

IMPORTANT:
- ANY scenario can be "no_trade" (not just inline)
- A scenario can have 1, 2, 3+ trades on different assets
- Low-impact events might have all 5 scenarios as "no_trade" - that's fine!

STEP 6: POSITIONING ANALYSIS
- Current positioning, crowded side, pain trade

STEP 7: PRE-EVENT STRATEGY
- Recommended approach, reasoning, conviction (1-10), time horizon

STEP 8: TRADE SETUP SUMMARY
- Bullish setup (if beat), Bearish setup (if miss), Inline (no trade)
- Alternative assets for beat/miss

⚠️ CRITICAL REQUIREMENTS ⚠️

A) USE REAL PRICE LEVELS from COLLECTED FMP DATA
   - WRONG: "Stop loss: 52.0" (this is a PMI value!)
   - CORRECT: "Stop loss: 5420 (-1.1%)" (real SPX price)

B) INCLUDE R/R RATIO in every setup (e.g., "1.5:1")

C) INCLUDE TIME HORIZON: intraday | 1-2 days | 3-5 days

D) INCLUDE INVALIDATION CONDITION

E) TradingView ASSETS for charts: Use EXCHANGE:SYMBOL format
   - FX:EURUSD, TVC:DXY, CBOE:VIX, SP:SPX, NASDAQ:NDX, COMEX:GC1!

═══════════════════════════════════════════════════════════════════
                         REQUIRED OUTPUT
═══════════════════════════════════════════════════════════════════

Return ONLY valid JSON:
{
  "urgency_score": 1-10,
  "market_mover_score": 1-10,
  "conviction_score": 1-10,
  "eventClassification": {
    "tier": 1 | 2 | 3,
    "expectedVolatility": "low" | "moderate" | "high" | "extreme",
    "primaryAffectedAssets": ["SPX", "DXY"],
    "secondaryAffectedAssets": ["XAUUSD", "TLT"]
  },
  "historicalAnalysis": {
    "beatRate": "55%",
    "averageSurprise": "10%",
    "typicalReaction": "DXY +0.5% on hot prints",
    "reactionDuration": "4-6 hours",
    "fadePattern": true,
    "keyInsight": "string"
  },
  "expectationsAnalysis": {
    "forecastAssessment": "realistic",
    "whisperNumber": "0.2% (from web research)" | null,
    "whatWouldSurprise": "0.5%+ would shock",
    "pricedInLevel": "~0.3% priced in"
  },
  "scenarios": {
    "bigBeat": { "threshold": ">0.5%", "probability": "15%", "expectedReaction": { "assets": {"DXY": "+0.8%", "SPX": "-1%"}, "duration": "4-8h", "confidence": "high" } },
    "smallBeat": { same structure },
    "inline": { same structure },
    "smallMiss": { same structure },
    "bigMiss": { same structure }
  },
  "scenarioPlaybook": {
    "bigBeat": {
      "label": "Hot Print Playbook",
      "trades": [
        {
          "asset": "SPX",
          "direction": "short",
          "trigger": "If CPI > 0.5%",
          "entry": "5500",
          "stopLoss": "5550 (+0.9%)",
          "takeProfit": "5400 (-1.8%)",
          "riskRewardRatio": "2:1",
          "timeHorizon": "intraday",
          "invalidation": "If SPX reclaims 5530 within 2h",
          "confidence": 75
        },
        {
          "asset": "DXY",
          "direction": "long",
          "trigger": "If CPI > 0.5%",
          "entry": "104.50",
          "stopLoss": "104.00",
          "takeProfit": "105.50",
          "riskRewardRatio": "2:1",
          "timeHorizon": "1-2 days",
          "invalidation": "If fails to hold 104.20",
          "confidence": 70
        }
      ],
      "notes": "Watch Fed speakers post-release"
    },
    "smallBeat": {
      "label": "Modest Beat",
      "trades": [{ /* single trade or multiple */ }],
      "notes": "..."
    },
    "inline": {
      "label": "No Trade - Inline",
      "action": "no_trade",
      "reason": "No edge when inline with expectations",
      "watchNext": "Focus on core components and Fed reaction"
    },
    "smallMiss": {
      "label": "Modest Miss",
      "trades": [{ /* ... */ }],
      "notes": "..."
    },
    "bigMiss": {
      "label": "Big Miss - No Trade",
      "action": "no_trade",
      "reason": "Low probability scenario, wait for confirmation",
      "watchNext": "Monitor Fed response"
    }
  },
  "positioningAnalysis": {
    "currentPositioning": "Market slightly long USD",
    "crowdedSide": "long",
    "painTrade": "Soft CPI causing USD unwind"
  },
  "preEventStrategy": {
    "recommendedApproach": "wait_and_react",
    "reasoning": "Outcome uncertain, trade the reaction",
    "conviction": 6,
    "timeHorizon": "intraday"
  },
  "tradeSetup": {
    "hasTrade": true,
    "bullish": {
      "trigger": "If CPI < 0.2%",
      "direction": "long",
      "asset": "SPX",
      "entry": "5520",
      "stopLoss": "5470 (-0.9%)",
      "takeProfit": "5620 (+1.8%)",
      "riskRewardRatio": "2:1",
      "timeHorizon": "1-2 days",
      "invalidation": "If fails to hold 5500 within 4h"
    },
    "bearish": {
      "trigger": "If CPI > 0.4%",
      "direction": "short",
      "asset": "SPX",
      "entry": "5500",
      "stopLoss": "5550 (+1%)",
      "takeProfit": "5400 (-2%)",
      "riskRewardRatio": "2:1",
      "timeHorizon": "1-2 days",
      "invalidation": "If reclaims 5540"
    },
    "inline": {
      "action": "no_trade",
      "reason": "No edge when data matches"
    },
    "alternativeAssets": {
      "ifBeat": [{ "asset": "DXY", "direction": "long", "rationale": "USD strength" }],
      "ifMiss": [{ "asset": "XAUUSD", "direction": "long", "rationale": "Gold bid on dovish" }]
    }
  },
  "keyRisks": ["Core CPI divergence", "Fed speaker comments", "Geopolitical headlines"],
  "summary": "CPI is Tier 1. Whisper 0.2% vs consensus 0.3%. Wait-and-react. Hot (>0.4%) = short SPX, long DXY. Soft (<0.2%) = long SPX, gold.",
  "tradingview_assets": ["SP:SPX", "TVC:DXY", "COMEX:GC1!", "TVC:VIX"]
}`;

// ────────────────────────────────────────────────────────────────────────────────
// EARNINGS EVENTS Stage 3
// ────────────────────────────────────────────────────────────────────────────────

const STAGE_3_PROMPT_EARNINGS = `You are a senior equity analyst at a top hedge fund. You specialize in earnings-driven trading.

CRITICAL SYSTEM NOTE:
- This is the ONLY analysis run for this earnings event.
- Your output must remain useful before, during, and after the earnings call.
- Cover ALL plausible outcomes with complete trade playbooks.

You previously classified this earnings event:
{STAGE1_ANALYSIS}

EARNINGS DETAILS:
{EVENT_DETAILS}

COLLECTED FMP DATA:
{COLLECTED_FMP_DATA}

WEB RESEARCH (Perplexity):
{WEB_RESEARCH}

POSITION MEMORY (READ-ONLY from News Analysis):
{POSITION_MEMORY}

═══════════════════════════════════════════════════════════════════
                    EARNINGS ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════════

STEP 1: EARNINGS CLASSIFICATION
- Tier (1/2/3), market cap, sector importance
- Primary asset (the stock) + secondary (sector ETF, competitors)

STEP 2: EXPECTATIONS ANALYSIS
- EPS estimate vs whisper, Revenue estimate vs whisper
- Guidance expectations (raised/maintained/lowered)
- Key metrics to watch (e.g., subscriber growth, ASP, margins)

STEP 3: SCENARIO MAPPING (6 SCENARIOS)
For earnings, use these scenarios:
1. beatBoth: EPS beat + Revenue beat
2. beatEpsMissRev: EPS beat + Revenue miss
3. missEpsBeatRev: EPS miss + Revenue beat
4. missBoth: EPS miss + Revenue miss
5. inline: Both inline
6. guidanceSurprise: Strong/Weak guidance (most important for reaction)

Each scenario: threshold, probability, expected stock reaction, duration

STEP 4: SCENARIO PLAYBOOK (MANDATORY FOR ALL 6)
For EACH scenario, provide:
- trades: array of trade setups (can be 0, 1, or multiple assets)
- OR action: "no_trade" with reason

STEP 5: SECTOR IMPACT
- Will this earnings affect the sector? Competitors?
- Sympathy plays (if NVDA beats, AMD may move)

STEP 6: TRADE SETUP SUMMARY
- Long setup (if beats + good guidance)
- Short setup (if misses + weak guidance)
- Sector plays

Return ONLY valid JSON:
{
  "eventClassification": {
    "tier": 1 | 2 | 3,
    "expectedVolatility": "low" | "moderate" | "high" | "extreme",
    "primaryAffectedAssets": ["NVDA"],
    "secondaryAffectedAssets": ["SMH", "AMD", "QQQ"]
  },
  "expectationsAnalysis": {
    "epsEstimate": "5.20",
    "epsWhisper": "5.35",
    "revenueEstimate": "24B",
    "revenueWhisper": "25B",
    "guidanceExpectation": "Raised expected",
    "keyMetrics": ["Data Center revenue", "AI chip demand", "Gross margins"]
  },
  "scenarios": {
    "beatBoth": { "threshold": "EPS > 5.35 AND Rev > 25B", "probability": "35%", "expectedReaction": { "stock": "+8-12%", "duration": "2-3 days" } },
    "beatEpsMissRev": { "threshold": "EPS > 5.35 AND Rev < 24B", "probability": "10%", "expectedReaction": { "stock": "-2-5%", "duration": "1 day" } },
    "missEpsBeatRev": { "threshold": "EPS < 5.20 AND Rev > 25B", "probability": "10%", "expectedReaction": { "stock": "+2-4%", "duration": "1 day" } },
    "missBoth": { "threshold": "EPS < 5.20 AND Rev < 24B", "probability": "10%", "expectedReaction": { "stock": "-10-15%", "duration": "3-5 days" } },
    "inline": { "threshold": "EPS 5.20-5.35 AND Rev 24-25B", "probability": "20%", "expectedReaction": { "stock": "-2% to +2%", "duration": "1 day" } },
    "guidanceSurprise": { "threshold": "Guidance raised/cut significantly", "probability": "15%", "expectedReaction": { "stock": "±10-20%", "duration": "1 week" } }
  },
  "scenarioPlaybook": {
    "beatBoth": {
      "label": "Strong Beat Playbook",
      "trades": [
        { "asset": "NVDA", "direction": "long", "trigger": "If EPS > 5.35 + Rev > 25B", "entry": "After hours on beat", "stopLoss": "-5%", "takeProfit": "+12%", "riskRewardRatio": "2.4:1", "timeHorizon": "2-3 days", "invalidation": "Weak guidance", "confidence": 80 },
        { "asset": "SMH", "direction": "long", "trigger": "Sector sympathy", "entry": "Next day open", "stopLoss": "-3%", "takeProfit": "+5%", "riskRewardRatio": "1.7:1", "timeHorizon": "1-2 days", "invalidation": "Broad market selloff", "confidence": 65 }
      ],
      "notes": "Watch guidance call closely"
    },
    "beatEpsMissRev": { "label": "Mixed - Wait", "action": "no_trade", "reason": "Mixed signals, wait for guidance clarity", "watchNext": "Guidance call" },
    "missEpsBeatRev": { "label": "Revenue Focus", "trades": [...], "notes": "..." },
    "missBoth": { "label": "Short on Miss", "trades": [...], "notes": "..." },
    "inline": { "label": "No Trade", "action": "no_trade", "reason": "No edge on inline", "watchNext": "Guidance" },
    "guidanceSurprise": { "label": "Guidance Trade", "trades": [...], "notes": "Guidance is king" }
  },
  "sectorImpact": {
    "affectsSector": true,
    "sympathyPlays": [
      { "asset": "AMD", "correlation": "high", "direction": "same" },
      { "asset": "SMH", "correlation": "high", "direction": "same" }
    ]
  },
  "preEventStrategy": {
    "recommendedApproach": "wait_and_react",
    "reasoning": "Earnings are binary, wait for results",
    "conviction": 7,
    "timeHorizon": "2-3 days"
  },
  "tradeSetup": {
    "hasTrade": true,
    "bullish": { "trigger": "Beat + strong guidance", "asset": "NVDA", ... },
    "bearish": { "trigger": "Miss + weak guidance", "asset": "NVDA", ... },
    "sectorPlay": { "asset": "SMH", "direction": "follows NVDA", ... }
  },
  "keyRisks": ["Guidance disappointment", "Valuation concerns", "Sector rotation"],
  "summary": "NVDA Tier 1 earnings. Whisper 5.35 vs est 5.20. Beat + guidance = +10%. Miss = -12%. Wait for results.",
  "tradingview_assets": ["NASDAQ:NVDA", "NASDAQ:AMD", "AMEX:SMH"]
}`;

// ────────────────────────────────────────────────────────────────────────────────
// IPO EVENTS Stage 3
// ────────────────────────────────────────────────────────────────────────────────

const STAGE_3_PROMPT_IPO = `You are an IPO specialist at a top investment bank. You analyze IPO trading opportunities.

CRITICAL SYSTEM NOTE:
- This is the ONLY analysis run for this IPO.
- Cover pricing and first-day trading scenarios.

You previously classified this IPO:
{STAGE1_ANALYSIS}

IPO DETAILS:
{EVENT_DETAILS}

COLLECTED FMP DATA:
{COLLECTED_FMP_DATA}

WEB RESEARCH (Perplexity):
{WEB_RESEARCH}

POSITION MEMORY (READ-ONLY):
{POSITION_MEMORY}

═══════════════════════════════════════════════════════════════════
                    IPO ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════════

STEP 1: IPO CLASSIFICATION
- Tier, valuation, sector, comparable companies
- Demand assessment (oversubscribed, at range, undersubscribed)

STEP 2: PRICING SCENARIOS (4 SCENARIOS)
1. pricedAbove: Priced above range (strong demand)
2. pricedAtRange: Priced at top of range
3. pricedBelowRange: Priced below range (weak demand)
4. withdrawn: IPO withdrawn/postponed

STEP 3: FIRST-DAY TRADING SCENARIOS
- Hot IPO pop (>30%), Moderate pop (10-30%), Flat (<10%), Broken (<0%)

STEP 4: SCENARIO PLAYBOOK
For each scenario, provide trades (0, 1, or multiple) or no_trade

STEP 5: COMPARABLE ANALYSIS
- How priced vs peers? Discount/premium?

Return ONLY valid JSON:
{
  "eventClassification": {
    "tier": 1 | 2 | 3,
    "expectedVolatility": "high",
    "primaryAffectedAssets": ["RDDT"],
    "secondaryAffectedAssets": ["SNAP", "META", "XLK"]
  },
  "ipoAnalysis": {
    "priceRange": "$31-34",
    "expectedPricing": "Top of range ($34)",
    "valuation": "$6.5B",
    "demandAssessment": "Oversubscribed 10x",
    "comparableValuation": "Premium to SNAP, discount to META"
  },
  "scenarios": {
    "pricedAbove": { "threshold": ">$34", "probability": "40%", "expectedFirstDay": "+25-40%" },
    "pricedAtRange": { "threshold": "$31-34", "probability": "45%", "expectedFirstDay": "+10-25%" },
    "pricedBelowRange": { "threshold": "<$31", "probability": "10%", "expectedFirstDay": "Flat to -10%" },
    "withdrawn": { "threshold": "IPO pulled", "probability": "5%", "expectedFirstDay": "N/A" }
  },
  "scenarioPlaybook": {
    "pricedAbove": {
      "label": "Hot IPO",
      "trades": [
        { "asset": "RDDT", "direction": "long", "trigger": "If priced >$34", "entry": "At open", "stopLoss": "-15%", "takeProfit": "+30%", "riskRewardRatio": "2:1", "timeHorizon": "1 day", "invalidation": "Opens flat", "confidence": 70 }
      ],
      "notes": "Expect volatility, consider selling into strength"
    },
    "pricedAtRange": { "label": "Standard IPO", "trades": [...], "notes": "..." },
    "pricedBelowRange": { "label": "Weak Demand - Avoid", "action": "no_trade", "reason": "Weak demand signals risk", "watchNext": "First day trading" },
    "withdrawn": { "label": "No Trade", "action": "no_trade", "reason": "IPO cancelled", "watchNext": "Market conditions" }
  },
  "preEventStrategy": {
    "recommendedApproach": "wait_and_react",
    "reasoning": "Wait for pricing, then assess first-day action",
    "conviction": 6,
    "timeHorizon": "1-3 days"
  },
  "tradeSetup": {
    "hasTrade": true,
    "bullish": { "trigger": "Hot pricing + strong open", "asset": "RDDT", ... },
    "bearish": { "trigger": "Weak pricing + broken deal", "asset": "RDDT", ... }
  },
  "keyRisks": ["Lock-up expiry", "Valuation concerns", "Market conditions"],
  "summary": "RDDT IPO. Expected top of range. If hot (>$34), could pop 30%+. Wait for pricing.",
  "tradingview_assets": ["NYSE:RDDT", "NYSE:SNAP", "NASDAQ:META"]
}`;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeEvent(
  event: EventInput,
  options: EventAnalysisOptions = {}
): Promise<EventAnalysisResult> {
  const timings = {
    stage1Start: Date.now(),
    stage1End: 0,
    stage2Start: 0,
    stage2End: 0,
    stage3Start: 0,
    stage3End: 0,
  };

  // Token tracking
  let openaiStage1Tokens = { input: 0, output: 0 };
  let openaiStage3Tokens = { input: 0, output: 0 };
  let perplexityTokens = { prompt: 0, completion: 0 };
  let perplexityRequests = 0;

  // Position memory (READ-ONLY from news trades)
  let positionMemory: PositionMemorySummary | null = null;

  // Get FMP allowed symbols
  const { allowedSet, promptBlock } = await getFmpAllowedSymbols();

  // ========== STAGE 1 (Event Type Specific) ==========
  let stage1PromptBase: string;
  
  switch (event.type) {
    case 'earnings':
      stage1PromptBase = STAGE_1_PROMPT_EARNINGS
        .replace('{EVENT_DATE}', `${event.date} ${event.time} ${event.timezone}`)
        .replace('{SYMBOL}', event.symbol || event.name.split(' ')[0])
        .replace('{COMPANY_NAME}', event.companyName || event.name)
        .replace('{EPS_ESTIMATE}', event.epsEstimate?.toString() ?? event.forecast?.toString() ?? 'N/A')
        .replace('{REVENUE_ESTIMATE}', event.revenueEstimate?.toString() ?? 'N/A')
        .replace('{PREVIOUS_EPS}', event.previous?.toString() ?? 'N/A')
        .replace('{FMP_DATA_MENU}', FMP_DATA_MENU)
        .replace('{ALLOWED_FMP_SYMBOLS}', promptBlock);
      break;
      
    case 'ipo':
      stage1PromptBase = STAGE_1_PROMPT_IPO
        .replace('{EVENT_DATE}', `${event.date} ${event.time} ${event.timezone}`)
        .replace('{COMPANY_NAME}', event.companyName || event.name)
        .replace('{SYMBOL}', event.symbol || 'TBD')
        .replace('{EXCHANGE}', event.exchange || 'N/A')
        .replace('{PRICE_RANGE_LOW}', event.priceRangeLow?.toString() ?? 'N/A')
        .replace('{PRICE_RANGE_HIGH}', event.priceRangeHigh?.toString() ?? 'N/A')
        .replace('{SHARES}', event.shares?.toString() ?? 'N/A')
        .replace('{FMP_DATA_MENU}', FMP_DATA_MENU)
        .replace('{ALLOWED_FMP_SYMBOLS}', promptBlock);
      break;
      
    case 'crypto':
      // Crypto uses macro prompt for now (can be specialized later)
      stage1PromptBase = STAGE_1_PROMPT_MACRO
        .replace('{EVENT_DATE}', `${event.date} ${event.time} ${event.timezone}`)
        .replace('{EVENT_NAME}', event.name)
        .replace('{EVENT_COUNTRY}', event.country)
        .replace('{EVENT_CURRENCY}', event.currency)
        .replace('{EVENT_IMPORTANCE}', event.importance)
        .replace('{EVENT_FORECAST}', event.forecast?.toString() ?? 'N/A')
        .replace('{EVENT_PREVIOUS}', event.previous?.toString() ?? 'N/A')
        .replace('{FMP_DATA_MENU}', FMP_DATA_MENU)
        .replace('{ALLOWED_FMP_SYMBOLS}', promptBlock);
      break;
      
    case 'macro':
    default:
      stage1PromptBase = STAGE_1_PROMPT_MACRO
        .replace('{EVENT_DATE}', `${event.date} ${event.time} ${event.timezone}`)
        .replace('{EVENT_NAME}', event.name)
        .replace('{EVENT_COUNTRY}', event.country)
        .replace('{EVENT_CURRENCY}', event.currency)
        .replace('{EVENT_IMPORTANCE}', event.importance)
        .replace('{EVENT_FORECAST}', event.forecast?.toString() ?? 'N/A')
        .replace('{EVENT_PREVIOUS}', event.previous?.toString() ?? 'N/A')
        .replace('{FMP_DATA_MENU}', FMP_DATA_MENU)
        .replace('{ALLOWED_FMP_SYMBOLS}', promptBlock);
      break;
  }
  
  const stage1Prompt = stage1PromptBase;

  const stage1Response = await openaiChatCompletion(
    stage1Prompt + '\n\nRespond ONLY with valid JSON.',
    1500,
    'stage1',
    OPENAI_REASONING_EFFORT
  );
  openaiStage1Tokens = { input: stage1Response.usage.prompt_tokens, output: stage1Response.usage.completion_tokens };

  let stage1Data = parseJsonSafe(stage1Response.content) as Stage1EventAnalysis | null;
  if (!stage1Data) {
    console.error('[Stage 1] Failed to parse, using fallback');
    stage1Data = {
      title: event.name,
      analysis: 'Failed to parse Stage 1 response - proceeding with defaults',
      category: 'macro',
      affected_assets: ['SPY', 'DXY'],
      fmp_requests: [{ type: 'quote', symbols: ['SPY', 'DXY'] }],
      required_web_metrics: [`${event.name} forecast expectations whisper number`],
      event_tier: 2,
      expected_volatility: 'moderate',
    };
  }

  // Validate FMP symbols
  if (Array.isArray(stage1Data.affected_assets)) {
    stage1Data.affected_assets = validateAndFixAffectedAssets(stage1Data.affected_assets, allowedSet);
  }
  if (Array.isArray(stage1Data.fmp_requests)) {
    for (const req of stage1Data.fmp_requests) {
      if (Array.isArray(req.symbols)) {
        req.symbols = validateAndFixAffectedAssets(req.symbols, allowedSet);
      }
    }
  }

  timings.stage1End = Date.now();
  timings.stage2Start = Date.now();

  // NOTE: No early exit - ALL events proceed to Stage 3.
  // Stage 3 decides trade/no-trade for each scenario.

  // ========== STAGE 2A: FMP Data Fetch ==========
  let collectedFmpData: FmpCollectedPack | null = null;
  const fmpRequests = Array.isArray(stage1Data.fmp_requests) ? stage1Data.fmp_requests : [];
  if (fmpRequests.length > 0) {
    try {
      collectedFmpData = await executeFmpRequests(fmpRequests, {
        allowedSymbols: allowedSet,
        newsDate: `${event.date}T${event.time}`,
      });
    } catch (e) {
      console.warn('[Stage 2A] FMP data fetch failed:', e);
    }
  }

  // ========== STAGE 2B: Perplexity Web Research ==========
  const webQueries = Array.isArray(stage1Data.required_web_metrics) 
    ? stage1Data.required_web_metrics.slice(0, 3) 
    : [];
  
  const collectedData: PerplexityData[] = [];
  
  for (const query of webQueries) {
    const result = await searchWithPerplexity(query);
    perplexityRequests++;
    if (result?.data) {
      perplexityTokens.prompt += result.usage.prompt_tokens;
      perplexityTokens.completion += result.usage.completion_tokens;
      collectedData.push({ query, data: result.data, citations: result.citations });
    }
  }

  timings.stage2End = Date.now();

  // ========== STAGE 2C: Position Memory (READ-ONLY from news trades) ==========
  // Event analysis READS position memory but does NOT WRITE to it.
  try {
    const assets = Array.isArray(stage1Data.affected_assets) ? stage1Data.affected_assets : [];
    if (options?.getPositionMemory && assets.length > 0) {
      positionMemory = await options.getPositionMemory({
        affectedAssets: assets.slice(0, 8),
        eventDateIso: `${event.date}T${event.time}`,
        category: stage1Data.category || 'macro',
      });
    }
  } catch (e) {
    console.warn('[Stage 2C] Position memory fetch failed:', e);
    positionMemory = null;
  }

  timings.stage3Start = Date.now();

  // ========== STAGE 3: Final Analysis (Event Type Specific) ==========
  
  // Build event details block based on type
  let eventDetailsBlock: string;
  
  switch (event.type) {
    case 'earnings':
      eventDetailsBlock = `
EARNINGS EVENT:
Company: ${event.symbol || event.name.split(' ')[0]} (${event.companyName || event.name})
Date/Time: ${event.date} ${event.time} ${event.timezone}
EPS Estimate: ${event.epsEstimate ?? event.forecast ?? 'N/A'}
Revenue Estimate: ${event.revenueEstimate ?? 'N/A'}
Previous EPS: ${event.previous ?? 'N/A'}
`;
      break;
      
    case 'ipo':
      eventDetailsBlock = `
IPO EVENT:
Company: ${event.companyName || event.name}
Symbol: ${event.symbol || 'TBD'}
Date/Time: ${event.date} ${event.time} ${event.timezone}
Exchange: ${event.exchange || 'N/A'}
Price Range: $${event.priceRangeLow ?? 'N/A'} - $${event.priceRangeHigh ?? 'N/A'}
IPO Price: ${event.ipoPrice ?? 'TBD'}
Shares Offered: ${event.shares ?? 'N/A'}
`;
      break;
      
    case 'macro':
    default:
      eventDetailsBlock = `
MACRO/ECONOMIC EVENT:
Event: ${event.name}
Date/Time: ${event.date} ${event.time} ${event.timezone}
Country: ${event.country}
Currency: ${event.currency}
Importance: ${event.importance}
Forecast: ${event.forecast ?? 'N/A'}
Previous: ${event.previous ?? 'N/A'}
Forecast Range: Low ${event.forecastLow ?? 'N/A'} | Median ${event.forecastMedian ?? event.forecast ?? 'N/A'} | High ${event.forecastHigh ?? 'N/A'}
`;
      break;
  }

  const fmpDataBlock = collectedFmpData && Object.keys(collectedFmpData.byType).length > 0
    ? JSON.stringify(collectedFmpData, null, 2).slice(0, 4000)
    : '(No FMP data available)';

  const webResearchBlock = collectedData.length > 0
    ? collectedData.map((r, i) => {
        const sources = (r.citations || []).slice(0, 3).join(', ');
        return `(${i + 1}) QUERY: ${r.query}\nANSWER:\n${r.data.slice(0, 1500)}\nSOURCES: ${sources || 'N/A'}`;
      }).join('\n\n')
    : '(No web research available - PERPLEXITY_API_KEY not set or no queries)';

  const positionMemoryBlock = positionMemory
    ? JSON.stringify(positionMemory, null, 2).slice(0, 2000)
    : '(No position memory available - no recent news trades on these assets)';

  // Select Stage 3 prompt based on event type
  let stage3PromptBase: string;
  
  switch (event.type) {
    case 'earnings':
      stage3PromptBase = STAGE_3_PROMPT_EARNINGS;
      break;
    case 'ipo':
      stage3PromptBase = STAGE_3_PROMPT_IPO;
      break;
    case 'crypto':
    case 'macro':
    default:
      stage3PromptBase = STAGE_3_PROMPT_MACRO;
      break;
  }

  const stage3Prompt = stage3PromptBase
    .replace('{STAGE1_ANALYSIS}', JSON.stringify(stage1Data))
    .replace('{EVENT_DETAILS}', eventDetailsBlock)
    .replace('{COLLECTED_FMP_DATA}', fmpDataBlock)
    .replace('{WEB_RESEARCH}', webResearchBlock)
    .replace('{POSITION_MEMORY}', positionMemoryBlock);

  const stage3Response = await openaiChatCompletion(
    stage3Prompt + '\n\nRespond ONLY with valid JSON.',
    OPENAI_STAGE3_MAX_TOKENS,
    'stage3',
    OPENAI_STAGE3_REASONING_EFFORT
  );
  openaiStage3Tokens = { input: stage3Response.usage.prompt_tokens, output: stage3Response.usage.completion_tokens };

  // Some Stage 3 calls return an empty content string (contentLen: 0) while still returning 200.
  // In that case, retry once with a shorter prompt (smaller context blocks + fewer completion tokens).
  let stage3Content = stage3Response.content || '';
  if (!stage3Content.trim()) {
    console.warn('[Stage 3] Empty content received. Retrying with shorter prompt...');
    const shortFmpDataBlock = collectedFmpData && Object.keys(collectedFmpData.byType).length > 0
      ? JSON.stringify(collectedFmpData, null, 2).slice(0, 1500)
      : '(No FMP data available)';
    const shortWebResearchBlock = collectedData.length > 0
      ? collectedData.slice(0, 2).map((r, i) => {
          const sources = (r.citations || []).slice(0, 2).join(', ');
          return `(${i + 1}) QUERY: ${r.query}\nANSWER:\n${r.data.slice(0, 500)}\nSOURCES: ${sources || 'N/A'}`;
        }).join('\n\n')
      : '(No web research available)';
    const shortPositionMemoryBlock = positionMemory
      ? JSON.stringify(positionMemory, null, 2).slice(0, 800)
      : '(No position memory available)';

    const stage3PromptShort = stage3PromptBase
      .replace('{STAGE1_ANALYSIS}', JSON.stringify(stage1Data))
      .replace('{EVENT_DETAILS}', eventDetailsBlock)
      .replace('{COLLECTED_FMP_DATA}', shortFmpDataBlock)
      .replace('{WEB_RESEARCH}', shortWebResearchBlock)
      .replace('{POSITION_MEMORY}', shortPositionMemoryBlock);

    const retry = await openaiChatCompletion(
      stage3PromptShort + '\n\nRespond ONLY with valid JSON.',
      Math.min(2500, OPENAI_STAGE3_MAX_TOKENS),
      'stage3_retry',
      OPENAI_STAGE3_REASONING_EFFORT
    );
    openaiStage3Tokens = {
      input: openaiStage3Tokens.input + retry.usage.prompt_tokens,
      output: openaiStage3Tokens.output + retry.usage.completion_tokens,
    };
    stage3Content = retry.content || '';
  }

  let stage3Data = parseJsonSafe(stage3Content) as Stage3EventDecision | null;
  if (!stage3Data) {
    console.error('[Stage 3] Failed to parse (attempt 1).');
    console.error('[Stage 3] Raw response length:', stage3Content?.length ?? 0);
    console.error('[Stage 3] Raw response head:', stage3Content?.slice(0, 1200));
    console.error('[Stage 3] Raw response tail:', stage3Content?.slice(-400));

    // One-shot repair attempt: ask the model to output VALID JSON only.
    try {
      const repairPrompt = [
        'You must return ONLY valid JSON matching the Stage 3 schema below.',
        'No markdown, no code fences, no commentary.',
        'If the previous output was empty or invalid, regenerate a correct JSON from scratch using the context.',
        'Rules:',
        '- Output MUST be a single JSON object (no markdown, no code fences, no commentary).',
        '- Keep strings concise.',
        '- Ensure all required keys exist with correct inner structure.',
        '',
        'REQUIRED_SCHEMA (example skeleton):',
        JSON.stringify({
          eventClassification: { tier: 1, expectedVolatility: 'moderate', primaryAffectedAssets: ['SPX'], secondaryAffectedAssets: ['DXY'] },
          historicalAnalysis: { beatRate: '55%', averageSurprise: '10%', typicalReaction: '...', reactionDuration: '...', fadePattern: true, keyInsight: '...' },
          expectationsAnalysis: { forecastAssessment: 'realistic', whisperNumber: null, whatWouldSurprise: '...', pricedInLevel: '...' },
          scenarios: {
            bigBeat: { threshold: '...', probability: '...', expectedReaction: { assets: {}, duration: '...', confidence: '...' } },
            smallBeat: { threshold: '...', probability: '...', expectedReaction: { assets: {}, duration: '...', confidence: '...' } },
            inline: { threshold: '...', probability: '...', expectedReaction: { assets: {}, duration: '...', confidence: '...' } },
            smallMiss: { threshold: '...', probability: '...', expectedReaction: { assets: {}, duration: '...', confidence: '...' } },
            bigMiss: { threshold: '...', probability: '...', expectedReaction: { assets: {}, duration: '...', confidence: '...' } },
          },
          scenarioPlaybook: {
            bigBeat: { label: '...', trades: [] },
            smallBeat: { label: '...', trades: [] },
            inline: { label: '...', action: 'no_trade', reason: '...', watchNext: '...' },
            smallMiss: { label: '...', trades: [] },
            bigMiss: { label: '...', action: 'no_trade', reason: '...', watchNext: '...' },
          },
          positioningAnalysis: { currentPositioning: '...', crowdedSide: 'neutral', painTrade: '...' },
          preEventStrategy: { recommendedApproach: 'wait_and_react', reasoning: '...', conviction: 5, timeHorizon: 'intraday' },
          tradeSetup: { hasTrade: false, inline: { action: 'no_trade', reason: '...' } },
          keyRisks: ['...'],
          summary: '...',
        }, null, 2),
        '',
        'CONTEXT_STAGE1_JSON:',
        JSON.stringify(stage1Data, null, 2),
        '',
        'CONTEXT_EVENT_DETAILS:',
        eventDetailsBlock,
        '',
        'CONTEXT_FMP_DATA:',
        fmpDataBlock.slice(0, 1500),
        '',
        'CONTEXT_WEB_RESEARCH:',
        webResearchBlock.slice(0, 1200),
        '',
        'CONTEXT_POSITION_MEMORY:',
        positionMemoryBlock.slice(0, 800),
        '',
        'PREVIOUS_OUTPUT_START',
        stage3Content || '',
        'PREVIOUS_OUTPUT_END',
      ].join('\n');

      const repaired = await openaiChatCompletion(
        repairPrompt,
        OPENAI_STAGE3_MAX_TOKENS,
        'stage3_repair',
        // repair must emit JSON; keep reasoning low to avoid consuming budget
        OPENAI_STAGE3_REASONING_EFFORT
      );
      openaiStage3Tokens = {
        input: openaiStage3Tokens.input + repaired.usage.prompt_tokens,
        output: openaiStage3Tokens.output + repaired.usage.completion_tokens,
      };

      stage3Data = parseJsonSafe(repaired.content) as Stage3EventDecision | null;
      if (!stage3Data) {
        console.error('[Stage 3] Failed to parse (attempt 2).');
        console.error('[Stage 3] Repaired raw head:', repaired.content?.slice(0, 1200));
        console.error('[Stage 3] Repaired raw tail:', repaired.content?.slice(-400));
      } else {
        console.log('[Stage 3] Parse recovered via repair.');
      }
    } catch (e) {
      console.error('[Stage 3] Repair attempt failed:', e);
    }
  }

  if (!stage3Data) {
    console.error('[Stage 3] Using fallback after parse failure.');
    stage3Data = {
      eventClassification: { tier: stage1Data.event_tier, expectedVolatility: stage1Data.expected_volatility, primaryAffectedAssets: stage1Data.affected_assets, secondaryAffectedAssets: [] },
      historicalAnalysis: { beatRate: 'N/A', averageSurprise: 'N/A', typicalReaction: 'N/A', reactionDuration: 'N/A', fadePattern: false, keyInsight: 'Parse error' },
      expectationsAnalysis: { forecastAssessment: 'realistic', whisperNumber: null, whatWouldSurprise: 'N/A', pricedInLevel: 'N/A' },
      scenarios: {
        bigBeat: { threshold: 'N/A', probability: '20%', expectedReaction: { assets: {}, duration: 'N/A', confidence: 'low' } },
        smallBeat: { threshold: 'N/A', probability: '25%', expectedReaction: { assets: {}, duration: 'N/A', confidence: 'low' } },
        inline: { threshold: 'N/A', probability: '30%', expectedReaction: { assets: {}, duration: 'N/A', confidence: 'low' } },
        smallMiss: { threshold: 'N/A', probability: '15%', expectedReaction: { assets: {}, duration: 'N/A', confidence: 'low' } },
        bigMiss: { threshold: 'N/A', probability: '10%', expectedReaction: { assets: {}, duration: 'N/A', confidence: 'low' } },
      },
      scenarioPlaybook: {
        bigBeat: { label: 'Fallback', action: 'no_trade', reason: 'Parse error' },
        smallBeat: { label: 'Fallback', action: 'no_trade', reason: 'Parse error' },
        inline: { label: 'Fallback', action: 'no_trade', reason: 'Parse error' },
        smallMiss: { label: 'Fallback', action: 'no_trade', reason: 'Parse error' },
        bigMiss: { label: 'Fallback', action: 'no_trade', reason: 'Parse error' },
      },
      positioningAnalysis: { currentPositioning: 'Unknown', crowdedSide: 'neutral', painTrade: 'Unknown' },
      preEventStrategy: { recommendedApproach: 'wait_and_react', reasoning: 'Parse error - defaulting to wait', conviction: 5, timeHorizon: 'intraday' },
      tradeSetup: { hasTrade: false, inline: { action: 'no_trade', reason: 'Parse error' } },
      keyRisks: ['JSON parse error - analysis incomplete'],
      summary: 'Analysis failed due to parsing error.',
    };
  }

  // Normalize / harden critical fields (prevents DB NOT NULL failures)
  try {
    // Ensure eventClassification core fields exist (UI expects tier/expectedVolatility/assets)
    if (!(stage3Data as any).eventClassification) (stage3Data as any).eventClassification = {};
    if (typeof (stage3Data as any).eventClassification.tier !== 'number') (stage3Data as any).eventClassification.tier = stage1Data.event_tier;
    if (!(stage3Data as any).eventClassification.expectedVolatility) (stage3Data as any).eventClassification.expectedVolatility = stage1Data.expected_volatility;
    if (!Array.isArray((stage3Data as any).eventClassification.primaryAffectedAssets)) (stage3Data as any).eventClassification.primaryAffectedAssets = stage1Data.affected_assets || [];
    if (!Array.isArray((stage3Data as any).eventClassification.secondaryAffectedAssets)) (stage3Data as any).eventClassification.secondaryAffectedAssets = [];

    const ra = normalizeRecommendedApproach((stage3Data as any)?.preEventStrategy?.recommendedApproach);
    if (!(stage3Data as any).preEventStrategy) (stage3Data as any).preEventStrategy = {};
    if (!(stage3Data as any).preEventStrategy.reasoning) (stage3Data as any).preEventStrategy.reasoning = '';
    if (!(stage3Data as any).preEventStrategy.timeHorizon) (stage3Data as any).preEventStrategy.timeHorizon = 'intraday';
    if (typeof (stage3Data as any).preEventStrategy.conviction !== 'number') (stage3Data as any).preEventStrategy.conviction = 5;
    if (!ra) {
      // infer a safe value rather than leaving null
      const hasTrade = Boolean((stage3Data as any)?.tradeSetup?.hasTrade);
      (stage3Data as any).preEventStrategy.recommendedApproach = hasTrade ? 'wait_and_react' : 'no_trade';
      console.warn('[Stage 3] recommendedApproach missing/invalid; inferred:', (stage3Data as any).preEventStrategy.recommendedApproach);
    } else {
      (stage3Data as any).preEventStrategy.recommendedApproach = ra;
    }

    // Ensure tradeSetup.hasTrade is boolean (some repairs omit it)
    if (!(stage3Data as any).tradeSetup) (stage3Data as any).tradeSetup = {};
    if (typeof (stage3Data as any).tradeSetup.hasTrade !== 'boolean') (stage3Data as any).tradeSetup.hasTrade = false;

    // Ensure summary is present (UI uses it heavily)
    if (typeof (stage3Data as any).summary !== 'string' || !(stage3Data as any).summary.trim()) {
      (stage3Data as any).summary = (stage3Data as any).preEventStrategy?.reasoning || 'No summary provided.';
    }

    // Ensure keyRisks is an array
    if (!Array.isArray((stage3Data as any).keyRisks)) (stage3Data as any).keyRisks = [];

    // Ensure scores exist and are 1-10 integers
    const conviction = clampScore10((stage3Data as any)?.preEventStrategy?.conviction, 5);
    (stage3Data as any).conviction_score = clampScore10((stage3Data as any).conviction_score, conviction);
    (stage3Data as any).urgency_score = clampScore10((stage3Data as any).urgency_score, conviction);
    const mm = deriveMarketMoverScore((stage3Data as any)?.eventClassification?.tier, (stage3Data as any)?.eventClassification?.expectedVolatility);
    (stage3Data as any).market_mover_score = clampScore10((stage3Data as any).market_mover_score, mm);
  } catch (e) {
    console.error('[Stage 3] normalize preEventStrategy failed:', e);
  }

  // Validate TradingView format
  const tvFormat = /^[A-Za-z0-9]+:[A-Za-z0-9.!]+$/;
  if (Array.isArray(stage3Data.tradingview_assets)) {
    stage3Data.tradingview_assets = stage3Data.tradingview_assets.filter(s => typeof s === 'string' && tvFormat.test(s.trim()));
  }

  timings.stage3End = Date.now();

  // ========== COST CALCULATION ==========
  const stage1Cost = (openaiStage1Tokens.input / 1e6) * 1.75 + (openaiStage1Tokens.output / 1e6) * 14;
  const stage3Cost = (openaiStage3Tokens.input / 1e6) * 1.75 + (openaiStage3Tokens.output / 1e6) * 14;
  const perplexityTokenCost = (perplexityTokens.prompt / 1e6) * 1 + (perplexityTokens.completion / 1e6) * 1;
  const perplexityRequestCost = perplexityRequests * 0.005;
  const perplexityCost = perplexityTokenCost + perplexityRequestCost;

  return {
    event,
    stage1: stage1Data,
    collectedData,
    collected_fmp_data: collectedFmpData,
    stage3: stage3Data,
    position_memory: positionMemory,
    pipeline: {
      mode: 'single_upcoming',
      generatedAt: new Date().toISOString(),
      models: {
        stage1: { model: OPENAI_MODEL, reasoning_effort: OPENAI_REASONING_EFFORT },
        stage2_fmp: { provider: 'fmp' },
        stage2_web: { provider: 'perplexity', model: PERPLEXITY_API_KEY ? 'sonar' : null },
        stage3: { model: OPENAI_MODEL, reasoning_effort: OPENAI_REASONING_EFFORT },
      },
    },
    costs: {
      openai: {
        stage1: { ...openaiStage1Tokens, cost: stage1Cost },
        stage3: { ...openaiStage3Tokens, cost: stage3Cost },
        totalCost: stage1Cost + stage3Cost,
      },
      perplexity: { ...perplexityTokens, cost: perplexityCost, requests: perplexityRequests },
      total: stage1Cost + stage3Cost + perplexityCost,
    },
    timing: {
      stage1Ms: timings.stage1End - timings.stage1Start,
      stage2Ms: timings.stage2End - timings.stage2Start,
      stage3Ms: timings.stage3End - timings.stage3Start,
      totalMs: timings.stage3End - timings.stage1Start,
    },
  };
}
