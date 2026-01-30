import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getErrorStatus, checkRateLimit, getClientIP } from '@/lib/api/auth';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ═══════════════════════════════════════════════════════════════════
// PRE-EVENT ANALYSIS API
// Event öncesi analiz (1-24 saat önce)
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// SYSTEM PROMPT - KATMAN 1: Kurumsal Makro Stratejist Karakteri
// ───────────────────────────────────────────────────────────────────

const PRE_EVENT_SYSTEM_PROMPT = `You are a senior macro strategist at a $15 billion global macro hedge fund. You specialize in event-driven trading and have profitably navigated every major economic release for the past 20 years.

Your job: Analyze upcoming economic events and provide pre-event positioning guidance.

═══════════════════════════════════════════════════════════════════
                         ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════════

Execute these steps IN ORDER for every event:

───────────────────────────────────────────────────────────────────
STEP 1: EVENT CLASSIFICATION
───────────────────────────────────────────────────────────────────

Classify the event by market impact potential:

TIER 1 (Market Moving):
- FOMC Rate Decision & Press Conference
- Non-Farm Payrolls
- CPI / Core CPI
- ECB / BOJ / BOE Rate Decisions
- US GDP (Advance)
→ Expect: 1-3% moves in affected assets

TIER 2 (High Impact):
- PCE Inflation
- PPI
- Retail Sales
- PMI (ISM Manufacturing/Services)
- Unemployment Claims (if abnormal)
- Major Tech Earnings (AAPL, NVDA, MSFT)
→ Expect: 0.5-1.5% moves

TIER 3 (Moderate Impact):
- Housing data
- Consumer Confidence
- Trade Balance
- Factory Orders
- Minor earnings
→ Expect: 0.2-0.5% moves

───────────────────────────────────────────────────────────────────
STEP 2: HISTORICAL PATTERN ANALYSIS
───────────────────────────────────────────────────────────────────

Analyze the provided historical data:

- What is the beat/miss rate?
- What is the average surprise magnitude?
- How does the market typically react to beats vs misses?
- Is there a pattern (e.g., always beats in Q1)?
- How long does the reaction typically last?

KEY INSIGHT: Markets often FADE initial moves. Identify if this event tends to see reversal.

───────────────────────────────────────────────────────────────────
STEP 3: EXPECTATIONS ANALYSIS
───────────────────────────────────────────────────────────────────

Compare forecast to context:

- Is the forecast realistic given recent trends?
- Is there a "whisper number" that differs from consensus?
- What is priced into current asset levels?
- What would truly SURPRISE the market?

CRITICAL: The trade is NOT about the actual number. It's about ACTUAL vs EXPECTATIONS.

- Strong number that matches expectations = muted reaction
- Weak number that beats low expectations = positive reaction
- Strong number that misses high expectations = negative reaction

───────────────────────────────────────────────────────────────────
STEP 4: SCENARIO MAPPING
───────────────────────────────────────────────────────────────────

Map out 5 scenarios with expected reactions:

1. BIG BEAT (> +15% vs forecast)
2. SMALL BEAT (+5% to +15% vs forecast)
3. INLINE (-5% to +5% vs forecast)
4. SMALL MISS (-5% to -15% vs forecast)
5. BIG MISS (< -15% vs forecast)

For EACH scenario, specify:
- Expected asset reactions (direction + magnitude)
- Duration of move (use the guide below)
- Follow-through potential

DURATION GUIDE (be consistent):
- BIG BEAT: 1-2 days (positive surprises price in quickly)
- SMALL BEAT: same day to 1 day
- INLINE: short-lived (hours)
- SMALL MISS: 1 day (selling pressure)
- BIG MISS: 2-4 days (panic selling takes longer to resolve)

Note: Negative surprises typically have LONGER duration than positive surprises
because fear-driven selling is more persistent than greed-driven buying.

───────────────────────────────────────────────────────────────────
STEP 5: CURRENT POSITIONING CHECK
───────────────────────────────────────────────────────────────────

Evaluate market positioning:

- Is the market already positioned for a certain outcome?
- Are positions crowded in one direction?
- What is the pain trade? (move that hurts most participants)

CRITICAL: Crowded positions lead to violent reversals when wrong.

───────────────────────────────────────────────────────────────────
STEP 6: PRE-EVENT STRATEGY
───────────────────────────────────────────────────────────────────

Determine the optimal approach:

STRATEGY A: POSITION BEFORE EVENT
- Use when: Strong conviction on direction, low positioning, asymmetric risk/reward
- Risk: Wrong-footed if surprise opposite direction

STRATEGY B: WAIT FOR EVENT, TRADE REACTION
- Use when: Uncertain outcome, want to trade the REACTION not the GUESS
- Risk: Miss initial move, chase entry

STRATEGY C: FADE THE MOVE
- Use when: Historical pattern shows reversal, crowded positioning
- Risk: This time is different, trend continues

STRATEGY D: NO TRADE
- Use when: Low conviction, unclear setup, risk/reward unfavorable
- Preserves capital for better opportunities

───────────────────────────────────────────────────────────────────
STEP 7: RISK MANAGEMENT
───────────────────────────────────────────────────────────────────

Define:
- Entry timing (before event, on release, or fade)
- Position size recommendation (based on conviction)
- Stop loss level
- Take profit targets
- Maximum drawdown tolerance

═══════════════════════════════════════════════════════════════════
                       CONVICTION CALIBRATION
═══════════════════════════════════════════════════════════════════

PRE-EVENT CONVICTION (different from post-event):

Score 1-3: Stay flat. No edge, wait for data.
Score 4-5: Small position or wait-and-react strategy.
Score 6-7: Standard position, clear thesis.
Score 8-10: High conviction, size up, rare for pre-event.

NOTE: Pre-event conviction is typically LOWER than post-event because outcome is unknown.

═══════════════════════════════════════════════════════════════════
                    CRITICAL: USE YOUR KNOWLEDGE
═══════════════════════════════════════════════════════════════════

IMPORTANT: You have extensive training knowledge about economic events.
When external data is not provided, YOU MUST use your training knowledge to:

1. Recall historical patterns for this specific event (beat rates, typical surprises)
2. Know which assets are affected (e.g., NFP affects DXY, SPX, TLT, Gold)
3. Understand typical market reactions and their durations
4. Apply your macro knowledge to current context

DO NOT say "no historical data available" - USE YOUR KNOWLEDGE!

For PMI events: These are TIER 2, expect 0.5-1.5% moves
For Flash PMI: These are leading indicators, market watches them closely
For CPI/NFP: These are TIER 1, expect 1-3% moves

═══════════════════════════════════════════════════════════════════
                    MANDATORY: PROVIDE TRADE SETUPS
═══════════════════════════════════════════════════════════════════

EVERY analysis MUST include BOTH bullish AND bearish trade setups:

1. BULLISH SETUP: What to do if data beats expectations
2. BEARISH SETUP: What to do if data misses expectations
3. ALTERNATIVE ASSETS: Other correlated trades (DXY, Gold, Yields) - FOR BOTH DIRECTIONS

⚠️ CRITICAL REQUIREMENTS ⚠️

A) USE REAL PRICE LEVELS from "Current Asset Prices" section above
   - WRONG: "Stop loss: 52.0" (this is a PMI value!)
   - CORRECT: "Stop loss: 5420 (-1.1%)" (real SPX price with %)

B) INCLUDE R/R RATIO in every setup
   - Example: Entry 5480, Stop 5420 (-60 pts), Target 5580 (+100 pts) = 1.67:1

C) INCLUDE TIME HORIZON for each trade
   - intraday, 1-2 days, 3-5 days

D) INCLUDE INVALIDATION CONDITION
   - Example: "If price fails to hold above 5450 within 2 hours, exit"

E) INCLUDE ALTERNATIVE ASSETS FOR BOTH DIRECTIONS
   
   IF BEAT (bullish alternatives):
   - LONG DXY (USD strength on strong data)
   - SHORT XAUUSD (gold weakness on risk-on)
   - SHORT TLT / higher yields (growth expectations)
   
   IF MISS (bearish alternatives):
   - SHORT DXY (USD weakness on weak data)
   - LONG XAUUSD (gold strength on risk-off)
   - LONG TLT / lower yields (flight to safety)

F) INLINE SCENARIO = NO TRADE
   When result is inline with expectations:
   - Action: "No trade - wait for clearer signal"
   - Reason: No edge when data matches expectations

G) EXTREME SENTIMENT CONTEXT
   In extreme fear environments:
   - Positive surprises often trigger OUTSIZED relief rallies
   - Bearish R/R should be higher (e.g., 2:1+) reflecting bigger downside potential
   - Note this in summary/thesis

EXAMPLE COMPLETE TRADE SETUP:

BULLISH:
- Trigger: "If PMI > 53.5 (clear beat)"
- Asset: SPX
- Entry: 5485 (current level)
- Stop Loss: 5420 (-1.2%)
- Take Profit: 5580 (+1.7%)
- R/R Ratio: 1.4:1
- Time Horizon: 1-2 days
- Invalidation: "If SPX fails to break 5500 within 4 hours"

BEARISH:
- Trigger: "If PMI < 51.0 (big miss)"
- Asset: SPX short or VIX long
- Entry: 5450 (on breakdown)
- Stop Loss: 5520 (+1.5%)
- Take Profit: 5350 (-2.2%)
- R/R Ratio: 1.5:1
- Time Horizon: 1-2 days
- Invalidation: "If SPX reclaims 5480 within 2 hours"

INLINE:
- Action: "No trade - insufficient edge"

═══════════════════════════════════════════════════════════════════
                         OUTPUT RULES
═══════════════════════════════════════════════════════════════════

- Pre-event analysis should PREPARE the trader, not predict the number
- Focus on SCENARIOS and REACTIONS, not forecasting the actual result
- Be clear about what each outcome means for positioning
- Acknowledge uncertainty - this is BEFORE the event
- ALWAYS provide BOTH bullish AND bearish trade setups
- For INLINE scenario, explicitly state "No trade"`;

// ───────────────────────────────────────────────────────────────────
// HELPER: Get historical data for event
// ───────────────────────────────────────────────────────────────────

async function getHistoricalData(eventName: string, eventType: string): Promise<any> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Get last 6 occurrences of this event
  const { data: history } = await supabase
    .from('event_historical_data')
    .select('*')
    .eq('event_name', eventName)
    .order('event_date', { ascending: false })
    .limit(6);
  
  // Get statistics
  const { data: stats } = await supabase
    .from('event_statistics')
    .select('*')
    .eq('event_name', eventName)
    .single();
  
  return {
    history: history || [],
    stats: stats || null
  };
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Fetch Fear & Greed Index (Alternative.me)
// ───────────────────────────────────────────────────────────────────

async function fetchFearGreedIndex(): Promise<{ value: number; classification: string } | null> {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 3600 }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.data?.[0]) {
      return {
        value: parseInt(data.data[0].value),
        classification: data.data[0].value_classification
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Fetch VIX from Yahoo Finance
// ───────────────────────────────────────────────────────────────────

async function fetchVIX(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=1d',
      { next: { revalidate: 300 } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.chart?.result?.[0]?.meta?.regularMarketPrice || null;
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Fetch major asset prices from Yahoo Finance
// ───────────────────────────────────────────────────────────────────

async function fetchAssetPrices(): Promise<Record<string, any>> {
  const symbols = [
    { yahoo: '^GSPC', name: 'SPX' },
    { yahoo: 'DX-Y.NYB', name: 'DXY' },
    { yahoo: 'GC=F', name: 'XAUUSD' },
    { yahoo: 'BTC-USD', name: 'BTC' },
    { yahoo: 'EURUSD=X', name: 'EURUSD' },
    { yahoo: 'USDJPY=X', name: 'USDJPY' },
    { yahoo: '^TYX', name: 'US10Y' }
  ];
  
  const assets: Record<string, any> = {};
  
  await Promise.all(symbols.map(async ({ yahoo, name }) => {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahoo}?interval=1d&range=2d`,
        { next: { revalidate: 300 } }
      );
      if (!response.ok) return;
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result) {
        const meta = result.meta;
        const closes = result.indicators?.quote?.[0]?.close || [];
        const previousClose = closes.length >= 2 ? closes[closes.length - 2] : meta.chartPreviousClose;
        const currentPrice = meta.regularMarketPrice;
        const change24h = previousClose ? ((currentPrice - previousClose) / previousClose * 100) : 0;
        
        assets[name] = {
          price: currentPrice?.toFixed(2),
          change24h: change24h?.toFixed(2) + '%',
          positioning: change24h > 0.5 ? 'bullish' : change24h < -0.5 ? 'bearish' : 'neutral'
        };
      }
    } catch {
      // Skip failed asset
    }
  }));
  
  return assets;
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Get market context (LIVE DATA)
// ───────────────────────────────────────────────────────────────────

async function getMarketContext(): Promise<any> {
  // First try database
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: dbContext } = await supabase
    .from('market_context_snapshots')
    .select('*')
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .single();
  
  // Fetch live data in parallel
  const [fearGreed, vix, assets] = await Promise.all([
    fetchFearGreedIndex(),
    fetchVIX(),
    fetchAssetPrices()
  ]);
  
  // Determine market regime
  let regime = 'neutral';
  if (fearGreed?.value) {
    if (fearGreed.value <= 25) regime = 'extreme_fear';
    else if (fearGreed.value <= 40) regime = 'fear';
    else if (fearGreed.value >= 75) regime = 'extreme_greed';
    else if (fearGreed.value >= 60) regime = 'greed';
  }
  
  // Generate narrative
  const narrativeParts: string[] = [];
  if (fearGreed) narrativeParts.push(`Sentiment: ${fearGreed.classification} (${fearGreed.value}/100)`);
  if (vix) narrativeParts.push(`VIX: ${vix.toFixed(1)}`);
  if (assets.SPX) narrativeParts.push(`S&P 500: ${assets.SPX.change24h}`);
  if (assets.DXY) narrativeParts.push(`Dollar: ${assets.DXY.change24h}`);
  
  return {
    regime,
    fearGreedIndex: fearGreed?.value || dbContext?.fear_greed_index || null,
    fearGreedClassification: fearGreed?.classification || null,
    vixLevel: vix || dbContext?.vix_level || null,
    assets,
    currentNarrative: narrativeParts.length > 0 
      ? narrativeParts.join(' | ') 
      : dbContext?.current_narrative || 'Market data temporarily unavailable',
    fedExpectations: dbContext?.fed_expectations || null
  };
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Format historical data for prompt
// ───────────────────────────────────────────────────────────────────

function formatHistoricalDataBlock(history: any[], eventName: string): string {
  if (!history || history.length === 0) {
    return `USE YOUR TRAINING KNOWLEDGE: You have extensive knowledge about "${eventName}" from your training data. Recall typical historical patterns, beat rates, market reactions, and surprise magnitudes for this economic indicator. Provide analysis based on your knowledge of how this event typically impacts markets.`;
  }
  
  return history.map(h => {
    const reactions = h.market_reaction ? Object.entries(h.market_reaction)
      .map(([asset, change]) => `${asset} ${change}`)
      .join(', ') : 'No reaction data';
    
    return `[${h.event_date?.split('T')[0]}] Forecast: ${h.forecast || 'N/A'} | Actual: ${h.actual || 'N/A'} | Surprise: ${h.surprise_percent ? (h.surprise_percent > 0 ? '+' : '') + h.surprise_percent + '%' : 'N/A'}
             Reaction: ${reactions}
             Duration: ${h.reaction_duration || 'N/A'}`;
  }).join('\n\n');
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Format asset prices for stop loss / take profit reference
// ───────────────────────────────────────────────────────────────────

function formatAssetPricesForPrompt(assets: any): string {
  if (!assets || Object.keys(assets).length === 0) {
    return `SPX: ~5500 | DXY: ~105 | EUR/USD: ~1.05 | Gold: ~2000 | USD/JPY: ~150 (approximate)`;
  }
  
  const lines: string[] = [];
  for (const [symbol, data] of Object.entries(assets) as [string, any][]) {
    if (data?.price) {
      lines.push(`${symbol}: ${data.price}`);
    }
  }
  
  return lines.length > 0 
    ? lines.join(' | ')
    : `SPX: ~5500 | DXY: ~105 | EUR/USD: ~1.05 | Gold: ~2000 (fallback values)`;
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Format affected assets block
// ───────────────────────────────────────────────────────────────────

function formatAffectedAssetsBlock(assets: any, eventName: string, currency: string): string {
  if (!assets || Object.keys(assets).length === 0) {
    return `USE YOUR TRAINING KNOWLEDGE: Based on your knowledge of "${eventName}" (${currency}), identify the primary and secondary affected assets. Consider: currency pairs (${currency}/USD, etc.), equity indices (SPX, NDX), bonds (TLT, yields), commodities (Gold, Oil), and crypto if relevant.`;
  }
  
  return Object.entries(assets).map(([symbol, data]: [string, any]) => {
    return `${symbol}:
- Price: $${data.price || 'N/A'}
- 24h Change: ${data.change24h || 0}%
- Current Positioning: ${data.positioning || 'neutral'}
- Key Levels: Support ${data.support || 'N/A'} | Resistance ${data.resistance || 'N/A'}`;
  }).join('\n\n');
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Determine event type
// ───────────────────────────────────────────────────────────────────

function determineEventType(eventName: string): string {
  const name = eventName.toLowerCase();
  
  if (name.includes('nfp') || name.includes('non-farm') || name.includes('payroll') || 
      name.includes('unemployment') || name.includes('jobless') || name.includes('employment')) {
    return 'employment';
  }
  if (name.includes('cpi') || name.includes('ppi') || name.includes('pce') || name.includes('inflation')) {
    return 'inflation';
  }
  if (name.includes('fomc') || name.includes('fed') || name.includes('rate decision') || 
      name.includes('ecb') || name.includes('boj') || name.includes('boe') || name.includes('central bank')) {
    return 'central_bank';
  }
  if (name.includes('gdp') || name.includes('pmi') || name.includes('retail') || name.includes('sales')) {
    return 'growth';
  }
  if (name.includes('housing') || name.includes('building') || name.includes('home')) {
    return 'housing';
  }
  if (name.includes('confidence') || name.includes('sentiment')) {
    return 'sentiment';
  }
  if (name.includes('trade') || name.includes('import') || name.includes('export')) {
    return 'trade';
  }
  if (name.includes('earnings') || name.includes('eps')) {
    return 'earnings';
  }
  
  return 'other';
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Validate pre-event analysis
// ───────────────────────────────────────────────────────────────────

function validatePreEventAnalysis(result: any): string[] {
  const errors: string[] = [];
  
  // Rule 1: High conviction + no trade = inconsistent
  if (result.preEventStrategy?.conviction >= 7 && !result.tradeSetup?.hasTrade) {
    errors.push('HIGH_CONVICTION_NO_TRADE');
  }
  
  // Rule 2: Trade exists but no entry condition
  if (result.tradeSetup?.hasTrade && !result.tradeSetup?.entryCondition) {
    errors.push('TRADE_WITHOUT_ENTRY_CONDITION');
  }
  
  // Rule 3: Should have 5 scenarios
  const scenarios = result.scenarios ? Object.keys(result.scenarios) : [];
  if (scenarios.length !== 5) {
    errors.push('MISSING_SCENARIOS');
  }
  
  // Rule 4: Trade with no stop loss
  if (result.tradeSetup?.hasTrade && !result.tradeSetup?.stopLoss) {
    errors.push('TRADE_WITHOUT_STOP_LOSS');
  }
  
  return errors;
}

// ───────────────────────────────────────────────────────────────────
// MAIN: Analyze event pre-release
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// DEMO: Pre-event analysis when OPENAI_API_KEY not configured
// ───────────────────────────────────────────────────────────────────

function getDemoPreEventAnalysis(eventData: {
  name: string;
  date: string;
  time?: string;
  country?: string;
  currency?: string;
  importance?: string;
  forecast?: number | null;
  previous?: number | null;
}): any {
  return {
    eventClassification: { tier: 2, expectedVolatility: 'moderate', primaryAffectedAssets: ['SPX', 'DXY'], secondaryAffectedAssets: ['XAUUSD', 'TLT'] },
    historicalAnalysis: { beatRate: '~50%', averageSurprise: 'Use AI for real stats', typicalReaction: '1-2 days', reactionDuration: 'intraday to 2 days', fadePattern: true, keyInsight: 'Demo mode — connect OpenAI for full analysis.' },
    expectationsAnalysis: { forecastAssessment: 'realistic', whisperNumber: null, whatWouldSurprise: 'Large deviation from consensus', pricedInLevel: 'Check with live data' },
    scenarios: {
      bigBeat: { threshold: 'Significant beat', probability: '~20%', expectedReaction: { assets: {}, duration: '1-2 days', confidence: 'medium' } },
      smallBeat: { threshold: 'Slight beat', probability: '~25%', expectedReaction: { assets: {}, duration: 'intraday', confidence: 'medium' } },
      inline: { threshold: 'In line', probability: '~30%', expectedReaction: { assets: {}, duration: 'short', confidence: 'high' } },
      smallMiss: { threshold: 'Slight miss', probability: '~15%', expectedReaction: { assets: {}, duration: '1 day', confidence: 'medium' } },
      bigMiss: { threshold: 'Large miss', probability: '~10%', expectedReaction: { assets: {}, duration: '2-4 days', confidence: 'medium' } }
    },
    scenario_mapping: {},
    positioningAnalysis: { currentPositioning: 'Neutral', crowdedSide: 'neutral', painTrade: 'Unexpected print' },
    preEventStrategy: { recommendedApproach: 'wait_and_react', reasoning: 'Demo: add OPENAI_API_KEY for real strategy.', conviction: 5, timeHorizon: '1-2 days' },
    tradeSetup: {
      hasTrade: true,
      bullish: {
        trigger: `If ${eventData.name} beats consensus`,
        direction: 'long',
        asset: 'SPX',
        entry: 'Current level',
        stopLoss: '−1%',
        takeProfit: '+1.5%',
        riskRewardRatio: '1.5:1',
        timeHorizon: '1-2 days',
        invalidation: 'Break below support'
      },
      bearish: {
        trigger: `If ${eventData.name} misses consensus`,
        direction: 'short',
        asset: 'SPX',
        entry: 'On breakdown',
        stopLoss: '+1%',
        takeProfit: '−1.5%',
        riskRewardRatio: '1.5:1',
        timeHorizon: '1-2 days',
        invalidation: 'Reclaim of key level'
      },
      inline: { action: 'no_trade', reason: 'No edge when data in line with expectations' },
      alternativeAssets: {
        ifBeat: [{ asset: 'DXY', direction: 'long', rationale: 'USD strength on strong data' }, { asset: 'XAUUSD', direction: 'short', rationale: 'Risk-on' }],
        ifMiss: [{ asset: 'DXY', direction: 'short', rationale: 'USD weakness' }, { asset: 'XAUUSD', direction: 'long', rationale: 'Safe-haven bid' }]
      }
    },
    keyRisks: ['Demo mode — connect OpenAI for real risk assessment'],
    summary: `Demo pre-event view for ${eventData.name}. Add OPENAI_API_KEY in .env.local to enable full AI Event Analysis Engine with live scenarios and trade setups.`
  };
}

async function analyzePreEvent(
  eventData: {
    name: string;
    date: string;
    time: string;
    timezone: string;
    country: string;
    currency: string;
    importance: string;
    forecast: number | null;
    previous: number | null;
    forecastLow?: number | null;
    forecastMedian?: number | null;
    forecastHigh?: number | null;
  }
): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const eventType = determineEventType(eventData.name);
  
  // Fetch historical data and market context in parallel
  const [historicalData, marketContext] = await Promise.all([
    getHistoricalData(eventData.name, eventType),
    getMarketContext()
  ]);

  // Build the user prompt
  const userPrompt = `
══════════════════════════════════════════════════════════════════
                        EVENT DETAILS
══════════════════════════════════════════════════════════════════

Event: ${eventData.name}
Date/Time: ${eventData.date} ${eventData.time} ${eventData.timezone}
Country: ${eventData.country}
Currency: ${eventData.currency}
Importance: ${eventData.importance}

Current Forecast: ${eventData.forecast ?? 'N/A'}
Previous Result: ${eventData.previous ?? 'N/A'}
Forecast Range: Low ${eventData.forecastLow ?? 'N/A'} | Median ${eventData.forecastMedian ?? eventData.forecast ?? 'N/A'} | High ${eventData.forecastHigh ?? 'N/A'}

──────────────────────────────────────────────────────────────────

Historical Data (Last 6 Releases):
${formatHistoricalDataBlock(historicalData.history, eventData.name)}

Historical Statistics:
- Beat Rate: ${historicalData.stats?.beat_rate ? historicalData.stats.beat_rate + '%' : 'USE YOUR TRAINING KNOWLEDGE for typical beat rate'}
- Average Surprise: ${historicalData.stats?.average_surprise ? historicalData.stats.average_surprise + '%' : 'USE YOUR TRAINING KNOWLEDGE for typical surprise magnitude'}
- Average Volatility on Release: ${historicalData.stats?.average_volatility ? historicalData.stats.average_volatility + '%' : 'USE YOUR TRAINING KNOWLEDGE for typical volatility'}

──────────────────────────────────────────────────────────────────

Market Context:
- Regime: ${marketContext.regime}
- Fear & Greed: ${marketContext.fear_greed_index ?? marketContext.fearGreedIndex ?? 'N/A'}${marketContext.fearGreedClassification ? ` (${marketContext.fearGreedClassification})` : ''}
- VIX: ${marketContext.vix_level ?? marketContext.vixLevel ?? 'N/A'}

Current Asset Prices (USE THESE FOR STOP LOSS / TAKE PROFIT):
${formatAssetPricesForPrompt(marketContext.assets)}

Affected Assets:
${formatAffectedAssetsBlock(marketContext.assets, eventData.name, eventData.currency)}

Current Narrative: ${marketContext.current_narrative ?? marketContext.currentNarrative ?? 'USE YOUR TRAINING KNOWLEDGE: Analyze current macro environment based on the date and typical market conditions'}

──────────────────────────────────────────────────────────────────

Fed/Central Bank Context (if relevant):
${marketContext.fed_expectations ? JSON.stringify(marketContext.fed_expectations, null, 2) : 'No Fed context available'}

══════════════════════════════════════════════════════════════════
                      REQUIRED OUTPUT
══════════════════════════════════════════════════════════════════

Return ONLY valid JSON in this exact structure:

{
  "eventClassification": {
    "tier": 1 | 2 | 3,
    "expectedVolatility": "low" | "moderate" | "high" | "extreme",
    "primaryAffectedAssets": ["string"],
    "secondaryAffectedAssets": ["string"]
  },

  "historicalAnalysis": {
    "beatRate": "string",
    "averageSurprise": "string",
    "typicalReaction": "string",
    "reactionDuration": "string",
    "fadePattern": true | false,
    "keyInsight": "string"
  },

  "expectationsAnalysis": {
    "forecastAssessment": "conservative" | "aggressive" | "realistic",
    "whisperNumber": "string" | null,
    "whatWouldSurprise": "string",
    "pricedInLevel": "string"
  },

  "scenarios": {
    "bigBeat": {
      "threshold": "string",
      "probability": "string",
      "expectedReaction": {
        "assets": {"symbol": "change%"},
        "duration": "string",
        "confidence": "string"
      }
    },
    "smallBeat": { same structure },
    "inline": { same structure },
    "smallMiss": { same structure },
    "bigMiss": { same structure }
  },

  "positioningAnalysis": {
    "currentPositioning": "string",
    "crowdedSide": "long" | "short" | "neutral",
    "painTrade": "string"
  },

  "preEventStrategy": {
    "recommendedApproach": "position_before" | "wait_and_react" | "fade_move" | "no_trade",
    "reasoning": "string",
    "conviction": 1-10,
    "timeHorizon": "intraday" | "1-2 days" | "3-5 days" | "1 week+"
  },

  "tradeSetup": {
    "bullish": {
      "trigger": "string (e.g., 'If PMI > 53.5')",
      "direction": "long",
      "asset": "string (e.g., SPX)",
      "entry": "string (price level from Current Asset Prices above)",
      "stopLoss": "string (price level, with % distance, e.g., '5420 (-1.1%)')",
      "takeProfit": "string (price level, with % distance, e.g., '5550 (+1.3%)')",
      "riskRewardRatio": "string (e.g., '1.5:1')",
      "timeHorizon": "intraday" | "1-2 days" | "3-5 days",
      "invalidation": "string (e.g., 'If price fails to hold above 5450 within 2 hours')"
    },
    "bearish": {
      "trigger": "string (e.g., 'If PMI < 51.0')",
      "direction": "short",
      "asset": "string (e.g., SPX or LONG VIX)",
      "entry": "string (price level)",
      "stopLoss": "string (price level with % distance)",
      "takeProfit": "string (price level with % distance)",
      "riskRewardRatio": "string (e.g., '1.5:1')",
      "timeHorizon": "intraday" | "1-2 days" | "3-5 days",
      "invalidation": "string"
    },
    "inline": {
      "action": "no_trade",
      "reason": "string (e.g., 'No edge when data matches expectations')"
    },
    "alternativeAssets": {
      "ifBeat": [
        {
          "asset": "string (e.g., DXY)",
          "direction": "long" | "short",
          "rationale": "string (e.g., 'USD strength on strong data')"
        }
      ],
      "ifMiss": [
        {
          "asset": "string (e.g., XAUUSD)",
          "direction": "long" | "short", 
          "rationale": "string (e.g., 'Gold strength on risk-off')"
        }
      ]
    }
  },

  "keyRisks": ["string"],

  "summary": "string (2-3 sentences, the key takeaway. If extreme sentiment, mention potential for outsized moves.)"
}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: PRE_EVENT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,  // Pre-event needs more creativity for scenario analysis
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const analysis = JSON.parse(content);
    
    // Validate the analysis
    const validationErrors = validatePreEventAnalysis(analysis);
    if (validationErrors.length > 0) {
      console.warn('Pre-event analysis validation warnings:', validationErrors);
    }
    
    return {
      ...analysis,
      validationWarnings: validationErrors
    };
  } catch (error) {
    console.error('Pre-event analysis failed:', error);
    throw error;
  }
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Save pre-event analysis to database
// ───────────────────────────────────────────────────────────────────

async function savePreEventAnalysis(
  eventData: any,
  analysis: any
): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const eventType = determineEventType(eventData.name);
  
  // Handle event_date: if time is already ISO format, use it; otherwise combine date+time
  let eventDateTime: string;
  if (eventData.time && eventData.time.includes('T')) {
    // Time is already full ISO timestamp
    eventDateTime = eventData.time;
  } else if (eventData.time && eventData.time.match(/^\d{2}:\d{2}/)) {
    // Time is just HH:MM format
    eventDateTime = `${eventData.date}T${eventData.time}:00`;
  } else {
    // No time, use date with noon
    eventDateTime = `${eventData.date}T12:00:00`;
  }
  
  // Parse numeric values, handling $ and % signs
  const parseNumeric = (val: any): number | null => {
    if (val === null || val === undefined || val === 'N/A' || val === '') return null;
    const cleaned = String(val).replace(/[$%,K]/gi, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };
  
  const record = {
    event_name: eventData.name,
    event_type: eventType,
    event_date: eventDateTime,
    country: eventData.country,
    currency: eventData.currency,
    importance: eventData.importance,
    
    forecast: parseNumeric(eventData.forecast),
    previous: parseNumeric(eventData.previous),
    forecast_low: parseNumeric(eventData.forecastLow),
    forecast_median: parseNumeric(eventData.forecastMedian),
    forecast_high: parseNumeric(eventData.forecastHigh),
    whisper_number: parseNumeric(analysis.expectationsAnalysis?.whisperNumber),
    
    tier: analysis.eventClassification?.tier || 2,
    expected_volatility: parseNumeric(analysis.eventClassification?.expectedVolatility) || 1.0,
    primary_affected_assets: analysis.eventClassification?.primaryAffectedAssets || [],
    secondary_affected_assets: analysis.eventClassification?.secondaryAffectedAssets || [],
    
    historical_beat_rate: parseNumeric(analysis.historicalAnalysis?.beatRate) || 50,
    historical_avg_surprise: parseNumeric(analysis.historicalAnalysis?.averageSurprise) || 0,
    typical_reaction: analysis.historicalAnalysis?.typicalReaction || 'Unknown',
    reaction_duration: analysis.historicalAnalysis?.reactionDuration || 'Short-term',
    fade_pattern: analysis.historicalAnalysis?.fadePattern || false,
    historical_insight: analysis.historicalAnalysis?.keyInsight || 'No historical data available',
    
    forecast_assessment: analysis.expectationsAnalysis?.forecastAssessment || 'Unknown',
    what_would_surprise: analysis.expectationsAnalysis?.whatWouldSurprise || 'Significant deviation from forecast',
    priced_in_level: parseNumeric(analysis.expectationsAnalysis?.pricedInLevel) || 50,
    
    scenarios: analysis.scenarios || {},
    
    current_positioning: analysis.positioningAnalysis?.currentPositioning,
    crowded_side: analysis.positioningAnalysis?.crowdedSide,
    pain_trade: analysis.positioningAnalysis?.painTrade,
    
    recommended_approach: analysis.preEventStrategy?.recommendedApproach,
    strategy_reasoning: analysis.preEventStrategy?.reasoning,
    conviction: parseNumeric(analysis.preEventStrategy?.conviction) || 5,
    time_horizon: analysis.preEventStrategy?.timeHorizon,
    
    has_trade: analysis.tradeSetup?.hasTrade || false,
    trade_direction: analysis.tradeSetup?.direction,
    trade_asset: analysis.tradeSetup?.asset,
    entry_timing: analysis.tradeSetup?.entryTiming,
    entry_condition: analysis.tradeSetup?.entryCondition,
    stop_loss: analysis.tradeSetup?.stopLoss,
    take_profit: analysis.tradeSetup?.takeProfit,
    position_size: analysis.tradeSetup?.positionSize,
    risk_reward: parseNumeric(analysis.tradeSetup?.riskReward),
    
    key_risks: analysis.keyRisks || [],
    summary: analysis.summary,
    
    raw_analysis: analysis,
    model_used: 'gpt-4o-mini',
    analyzed_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('event_pre_analyses')
    .insert(record)
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to save pre-event analysis: ${error.message}`);
  }
  
  return data.id;
}

// ═══════════════════════════════════════════════════════════════════
// API ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    // 🔒 SECURITY: Require authentication for AI analysis
    const { user, error: authError } = await requireAuth();
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    // 🔒 SECURITY: Rate limit AI endpoints (expensive operations)
    const clientIP = getClientIP(request as any);
    const { success: rateLimitOk, reset } = await checkRateLimit(`ai:${user.id}:${clientIP}:pre-event`, 'ai');
    if (!rateLimitOk) {
      return NextResponse.json({
        error: 'Too many requests. Please wait before analyzing more events.',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'date', 'country', 'currency', 'importance'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    const eventData = {
      name: body.name,
      date: body.date,
      time: body.time || '00:00',
      timezone: body.timezone || 'ET',
      country: body.country,
      currency: body.currency,
      importance: body.importance,
      forecast: body.forecast ?? null,
      previous: body.previous ?? null,
      forecastLow: body.forecastLow ?? null,
      forecastMedian: body.forecastMedian ?? null,
      forecastHigh: body.forecastHigh ?? null
    };

    // Demo mode when OpenAI not configured — return demo analysis so UI still shows charts/cards
    if (!OPENAI_API_KEY) {
      const analysis = getDemoPreEventAnalysis(eventData);
      return NextResponse.json({
        success: true,
        analysisId: null,
        event: eventData.name,
        eventDate: eventData.date,
        analysis,
        demo: true
      });
    }
    
    // Analyze the event
    const analysis = await analyzePreEvent(eventData);
    
    // Save to database
    const analysisId = await savePreEventAnalysis(eventData, analysis);
    
    return NextResponse.json({
      success: true,
      analysisId,
      event: eventData.name,
      eventDate: eventData.date,
      analysis
    });
    
  } catch (error) {
    console.error('Pre-event analysis API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze event', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// GET: Retrieve existing pre-event analysis
// ═══════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get('event');
    const eventDate = searchParams.get('date');
    const id = searchParams.get('id');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    let query = supabase.from('event_pre_analyses').select('*');
    
    if (id) {
      query = query.eq('id', id);
    } else if (eventName) {
      query = query.ilike('event_name', `%${eventName}%`);
      if (eventDate) {
        query = query.gte('event_date', eventDate);
      }
    }
    
    const { data, error } = await query
      .order('event_date', { ascending: true })
      .limit(20);
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      analyses: data || []
    });
    
  } catch (error) {
    console.error('Get pre-event analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analyses' },
      { status: 500 }
    );
  }
}
