import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getErrorStatus, checkRateLimit, getClientIP } from '@/lib/api/auth';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ═══════════════════════════════════════════════════════════════════
// POST-EVENT ANALYSIS API
// Gerçek veri gelince analiz (dakikalar içinde)
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// SYSTEM PROMPT - KATMAN 1: Kurumsal Makro Stratejist Karakteri
// ───────────────────────────────────────────────────────────────────

const POST_EVENT_SYSTEM_PROMPT = `You are a senior macro strategist at a $15 billion global macro hedge fund. The economic data has just been released. You need to analyze the result and provide IMMEDIATE trading guidance.

Your job: Analyze the just-released economic data and provide actionable trade recommendations.

═══════════════════════════════════════════════════════════════════
                         ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════════

Execute these steps RAPIDLY for post-event analysis:

───────────────────────────────────────────────────────────────────
STEP 1: SURPRISE CALCULATION
───────────────────────────────────────────────────────────────────

Calculate the surprise:
- Actual vs Forecast: What's the deviation?
- Actual vs Previous: What's the trend?
- Actual vs Whisper: What's the real surprise?

Classify the result:
- BIG BEAT: > +15% vs forecast
- SMALL BEAT: +5% to +15% vs forecast
- INLINE: -5% to +5% vs forecast
- SMALL MISS: -5% to -15% vs forecast
- BIG MISS: < -15% vs forecast

───────────────────────────────────────────────────────────────────
STEP 2: COMPONENT ANALYSIS (if applicable)
───────────────────────────────────────────────────────────────────

For complex reports, analyze components:

NFP Example:
- Headline number vs expectations
- Unemployment rate change
- Wage growth (average hourly earnings)
- Labor force participation
- Revisions to prior months

CPI Example:
- Headline CPI vs core CPI
- Month-over-month vs year-over-year
- Shelter component
- Energy component
- Services vs goods

CRITICAL: Sometimes headline beats but components are weak (or vice versa).

───────────────────────────────────────────────────────────────────
STEP 3: IMMEDIATE MARKET REACTION CHECK
───────────────────────────────────────────────────────────────────

Assess initial market reaction:
- Is the reaction consistent with the data?
- Is the market over-reacting or under-reacting?
- Are there divergences between assets?

WARNING SIGNS:
- Strong data but weak price action = bearish underlying trend
- Weak data but strong price action = bullish underlying trend
- These divergences are VERY informative

───────────────────────────────────────────────────────────────────
STEP 4: IMPLICATIONS ANALYSIS
───────────────────────────────────────────────────────────────────

What does this mean for:

MONETARY POLICY:
- Does this change Fed/ECB/BOJ expectations?
- Rate cut/hike probability shift?
- Balance sheet policy implications?

ECONOMIC OUTLOOK:
- Does this confirm or challenge the current narrative?
- Soft landing, hard landing, or no landing?
- Recession risk assessment

RISK APPETITE:
- Risk-on or risk-off implications?
- Sector rotation implications?

───────────────────────────────────────────────────────────────────
STEP 5: TRADE DECISION
───────────────────────────────────────────────────────────────────

Determine action:

TRADE THE CONTINUATION:
- Data confirms trend, reaction justified
- Join the move with trend

FADE THE MOVE:
- Over-reaction, reversion expected
- Trade against initial reaction

WAIT FOR CONFIRMATION:
- Mixed signals, need more clarity
- Set alerts for key levels

NO TRADE:
- Unclear implications
- Risk/reward unfavorable

───────────────────────────────────────────────────────────────────
STEP 6: EXECUTION PLAN
───────────────────────────────────────────────────────────────────

Specify:
- Entry: Now, on pullback, or on breakout
- Stop loss: Technical level or percentage
- Target: Based on historical reaction magnitude
- Time horizon: Intraday, days, or longer
- Position size: Based on conviction

═══════════════════════════════════════════════════════════════════
                       CONVICTION CALIBRATION
═══════════════════════════════════════════════════════════════════

POST-EVENT CONVICTION:

Score 1-3: No clear signal. Stay flat.
Score 4-5: Weak signal. Small position if any.
Score 6-7: Clear signal. Standard position.
Score 8-9: Strong signal. Size up.
Score 10: Extreme clarity. Rare, maximum conviction.

═══════════════════════════════════════════════════════════════════
                         URGENCY LEVELS
═══════════════════════════════════════════════════════════════════

IMMEDIATE (seconds-minutes):
- Big surprise, clear direction
- Act now or miss the move

SOON (minutes-hours):
- Moderate surprise
- Can wait for better entry

PATIENT (hours-days):
- Inline result, gradual positioning
- No rush

═══════════════════════════════════════════════════════════════════
                    CRITICAL: USE YOUR KNOWLEDGE
═══════════════════════════════════════════════════════════════════

IMPORTANT: You have extensive training knowledge about economic events.
USE YOUR TRAINING KNOWLEDGE to:

1. Know typical market reactions to this event's surprises
2. Understand Fed/central bank implications
3. Identify which assets move and by how much
4. Apply historical patterns to current situation

DO NOT say "no historical data" - USE YOUR KNOWLEDGE to analyze!

═══════════════════════════════════════════════════════════════════
                    MANDATORY: PROVIDE TRADE SETUP
═══════════════════════════════════════════════════════════════════

Post-event analysis MUST include a trade recommendation with:
1. Specific asset (e.g., "DXY", "EURUSD", "SPX")
2. Direction (long/short)
3. Entry level or condition
4. Stop loss (specific level)
5. Take profit target

If big surprise: conviction should be 7+
If inline: can recommend "wait" with lower conviction

⚠️ CRITICAL: PRICE LEVELS FOR TRADE SETUPS ⚠️

Stop loss and take profit MUST use REAL ASSET PRICE LEVELS, NOT economic data values!

WRONG: "Stop loss: 52.0" (this is a PMI value, not a price!)
CORRECT: "Stop loss: 5420 (below reaction low)" (this is an SPX price)

Current approximate levels (use as reference):
- S&P 500 (SPX): ~5400-6000 range
- Dollar Index (DXY): ~100-108 range  
- EUR/USD: ~1.02-1.10 range
- USD/JPY: ~140-160 range
- Gold (XAU/USD): ~1900-2400 range
- 10Y Yield: ~3.5-5.0% range

Example trade setup:
- Asset: SPX
- Direction: LONG
- Entry: "Buy on pullback to 5450"
- Stop Loss: "5420 (below pre-release low)"
- Take Profit: "5520 (1.5:1 risk/reward)"

═══════════════════════════════════════════════════════════════════
                         OUTPUT RULES
═══════════════════════════════════════════════════════════════════

- Be DECISIVE - the data is out, no more uncertainty about the number
- Focus on IMPLICATIONS, not just the number itself
- Compare reaction to historical patterns
- Provide SPECIFIC levels for entry, stop, and target
- ALWAYS recommend an actionable trade when there's a clear signal`;

// ───────────────────────────────────────────────────────────────────
// HELPER: Get pre-event analysis if exists
// ───────────────────────────────────────────────────────────────────

async function getPreEventAnalysis(eventName: string, eventDate: string): Promise<any> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const { data } = await supabase
    .from('event_pre_analyses')
    .select('*')
    .ilike('event_name', `%${eventName}%`)
    .gte('event_date', eventDate)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single();
  
  return data;
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Get historical data for comparison
// ───────────────────────────────────────────────────────────────────

async function getHistoricalComparison(eventName: string): Promise<any> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Get statistics
  const { data: stats } = await supabase
    .from('event_statistics')
    .select('*')
    .ilike('event_name', `%${eventName}%`)
    .limit(1)
    .single();
  
  return stats;
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Format component breakdown
// ───────────────────────────────────────────────────────────────────

function formatComponentBreakdown(components: any, eventType: string): string {
  if (!components || Object.keys(components).length === 0) {
    return 'No component breakdown available.';
  }
  
  const lines: string[] = [];
  
  if (eventType === 'employment' || eventType === 'nfp') {
    lines.push('NFP Components:');
    if (components.headline) lines.push(`- Headline: ${components.headline}K (vs ${components.headlineForecast || 'N/A'}K forecast) ${components.headline > (components.headlineForecast || 0) ? '✅ BEAT' : '❌ MISS'}`);
    if (components.unemployment) lines.push(`- Unemployment: ${components.unemployment}% (vs ${components.unemploymentForecast || 'N/A'}% forecast) ${parseFloat(components.unemployment) <= parseFloat(components.unemploymentForecast || '100') ? '✅ BETTER' : '⚠️ WORSE'}`);
    if (components.wageGrowth) lines.push(`- Avg Hourly Earnings: ${components.wageGrowth}% MoM (vs ${components.wageForecast || 'N/A'}% forecast) ${parseFloat(components.wageGrowth) > parseFloat(components.wageForecast || '0') ? '⚠️ HOT' : '✅ COOL'}`);
    if (components.participation) lines.push(`- Participation Rate: ${components.participation}% ${components.participationChange ? `(${components.participationChange})` : ''}`);
    if (components.revision) lines.push(`- Prior Revision: ${components.revision > 0 ? '+' : ''}${components.revision}K ${components.revision > 0 ? '✅ BULLISH' : '❌ BEARISH'}`);
  } else if (eventType === 'inflation' || eventType === 'cpi') {
    lines.push('CPI Components:');
    if (components.headline) lines.push(`- Headline CPI: ${components.headline}% YoY ${components.headlineBeat ? '✅' : '❌'}`);
    if (components.core) lines.push(`- Core CPI: ${components.core}% YoY ${components.coreBeat ? '✅' : '❌'}`);
    if (components.mom) lines.push(`- MoM: ${components.mom}%`);
    if (components.shelter) lines.push(`- Shelter: ${components.shelter}%`);
    if (components.energy) lines.push(`- Energy: ${components.energy}%`);
    if (components.services) lines.push(`- Services: ${components.services}%`);
  } else {
    // Generic format
    for (const [key, value] of Object.entries(components)) {
      lines.push(`- ${key}: ${value}`);
    }
  }
  
  return lines.join('\n');
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Format immediate reaction
// ───────────────────────────────────────────────────────────────────

function formatImmediateReaction(reactions: any): string {
  if (!reactions || Object.keys(reactions).length === 0) {
    return 'No immediate reaction data available.';
  }
  
  return Object.entries(reactions)
    .map(([asset, change]) => `${asset}: ${change}`)
    .join(' | ');
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Calculate surprise category
// ───────────────────────────────────────────────────────────────────

function calculateSurpriseCategory(actual: number, forecast: number): { category: string; percent: number; direction: string } {
  if (!forecast || forecast === 0) {
    return { category: 'unknown', percent: 0, direction: 'unknown' };
  }
  
  const percent = ((actual - forecast) / Math.abs(forecast)) * 100;
  
  let category: string;
  let direction: string;
  
  if (percent > 15) {
    category = 'big_beat';
    direction = 'beat';
  } else if (percent > 5) {
    category = 'small_beat';
    direction = 'beat';
  } else if (percent >= -5) {
    category = 'inline';
    direction = 'inline';
  } else if (percent >= -15) {
    category = 'small_miss';
    direction = 'miss';
  } else {
    category = 'big_miss';
    direction = 'miss';
  }
  
  return { category, percent: Math.round(percent * 100) / 100, direction };
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Fetch current asset prices from Yahoo Finance
// ───────────────────────────────────────────────────────────────────

async function fetchCurrentAssetPrices(): Promise<Record<string, string>> {
  const symbols: Record<string, string> = {
    '^GSPC': 'SPX',
    'DX-Y.NYB': 'DXY',
    'GC=F': 'Gold',
    'BTC-USD': 'BTC',
    'EURUSD=X': 'EUR/USD',
    'JPY=X': 'USD/JPY',
    '^TNX': 'US10Y'
  };
  
  const prices: Record<string, string> = {};
  
  await Promise.all(Object.entries(symbols).map(async ([yahooSymbol, name]) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if (result?.meta?.regularMarketPrice) {
          prices[name] = result.meta.regularMarketPrice.toFixed(2);
        }
      }
    } catch {
      // Skip failed asset
    }
  }));
  
  return prices;
}

function formatAssetPricesForPrompt(prices: Record<string, string>): string {
  if (!prices || Object.keys(prices).length === 0) {
    return 'SPX: ~5500 | DXY: ~105 | EUR/USD: ~1.05 | Gold: ~2000 (approximate)';
  }
  
  return Object.entries(prices).map(([name, price]) => `${name}: ${price}`).join(' | ');
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
  
  return 'other';
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Validate post-event analysis
// ───────────────────────────────────────────────────────────────────

function validatePostEventAnalysis(result: any): string[] {
  const errors: string[] = [];
  
  // Rule 1: Big surprise + low conviction = questionable
  if ((result.resultAnalysis?.surpriseCategory === 'big_beat' || 
       result.resultAnalysis?.surpriseCategory === 'big_miss') &&
      result.tradeRecommendation?.conviction < 5) {
    errors.push('BIG_SURPRISE_LOW_CONVICTION');
  }
  
  // Rule 2: Immediate urgency + no trade = inconsistent
  if (result.tradeRecommendation?.urgency === 'immediate' && 
      !result.tradeSetup?.hasTrade) {
    errors.push('IMMEDIATE_URGENCY_NO_TRADE');
  }
  
  // Rule 3: Trade with poor R/R = questionable
  if (result.tradeSetup?.hasTrade && result.tradeSetup?.riskReward === 'poor') {
    errors.push('TRADE_WITH_POOR_RR');
  }
  
  // Rule 4: High conviction + no trade
  if (result.tradeRecommendation?.conviction >= 8 && !result.tradeSetup?.hasTrade) {
    errors.push('HIGH_CONVICTION_NO_TRADE');
  }
  
  return errors;
}

// ───────────────────────────────────────────────────────────────────
// DEMO: Post-event analysis when OPENAI_API_KEY not configured
// ───────────────────────────────────────────────────────────────────

function getDemoPostEventAnalysis(eventData: {
  name: string;
  actual: number;
  forecast?: number | null;
  previous?: number | null;
}): any {
  return {
    resultAnalysis: {
      surpriseCategory: 'inline',
      surprisePercent: 0,
      headlineAssessment: `Demo: ${eventData.name} result in focus. Connect OpenAI for full AI analysis.`,
      componentAnalysis: null,
      overallQuality: 'mixed'
    },
    surprise_assessment: 'in_line',
    headline: `Demo: ${eventData.name} — ${eventData.actual} (vs f’cast ${eventData.forecast ?? 'N/A'}). Add OPENAI_API_KEY for live AI analysis.`,
    marketReaction: { initialReaction: 'Demo', reactionAssessment: 'appropriate', divergences: null, reactionInsight: 'Demo mode.' },
    implications: { monetaryPolicy: {}, economicOutlook: {}, riskAppetite: {} },
    tradeRecommendation: { action: 'wait_confirmation', urgency: 'patient', conviction: 5, reasoning: 'Demo — connect OpenAI for real recommendation.' },
    tradeSetup: {
      hasTrade: false,
      bullish: {
        trigger: 'If follow-through above resistance',
        asset: 'SPX',
        entry: 'On break',
        stopLoss: '−1%',
        takeProfit: '+1.5%',
        riskRewardRatio: '1.5:1',
        timeHorizon: '1-2 days',
        invalidation: 'Failure to hold'
      },
      bearish: {
        trigger: 'If reversal below support',
        asset: 'SPX',
        entry: 'On break',
        stopLoss: '+1%',
        takeProfit: '−1.5%',
        riskRewardRatio: '1.5:1',
        timeHorizon: '1-2 days',
        invalidation: 'Reclaim of level'
      },
      direction: 'none',
      asset: 'SPX',
      entry: { type: 'market', level: '—', condition: '—' },
      stopLoss: '—',
      takeProfit: '—',
      timeHorizon: 'intraday',
      positionSize: 'small',
      riskReward: 'fair'
    },
    scenarios: { inline: { expectedReaction: 'Muted' }, smallBeat: {}, smallMiss: {}, bigBeat: {}, bigMiss: {} },
    scenario_mapping: {},
    immediate_implications: { summary: 'Demo mode — add OPENAI_API_KEY for real implications.' },
    key_takeaway: `Demo post-event view for ${eventData.name}. Add OPENAI_API_KEY to enable full AI Event Analysis Engine.`,
    summary: `Demo post-event view for ${eventData.name}. Add OPENAI_API_KEY in .env.local to enable live AI analysis and trade setups.`,
    calculatedSurprise: { percent: 0, direction: 'inline' },
    demo: true
  };
}

// ───────────────────────────────────────────────────────────────────
// MAIN: Analyze event post-release
// ───────────────────────────────────────────────────────────────────

async function analyzePostEvent(
  eventData: {
    name: string;
    releaseTime: string;
    actual: number;
    forecast: number | null;
    previous: number | null;
    components?: any;
    immediateReaction?: any;
  }
): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const eventType = determineEventType(eventData.name);
  const surprise = calculateSurpriseCategory(eventData.actual, eventData.forecast ?? 0);
  
  // Fetch pre-event analysis, historical data, and current prices in parallel
  const [preAnalysis, historicalStats, currentPrices] = await Promise.all([
    getPreEventAnalysis(eventData.name, eventData.releaseTime.split('T')[0]),
    getHistoricalComparison(eventData.name),
    fetchCurrentAssetPrices()
  ]);

  // Build the user prompt
  const userPrompt = `
══════════════════════════════════════════════════════════════════
                        EVENT RESULT
══════════════════════════════════════════════════════════════════

Event: ${eventData.name}
Released: ${eventData.releaseTime}

ACTUAL: ${eventData.actual}
FORECAST: ${eventData.forecast}
PREVIOUS: ${eventData.previous}

Surprise: ${surprise.percent >= 0 ? '+' : ''}${surprise.percent}% (${surprise.direction.toUpperCase()})

──────────────────────────────────────────────────────────────────

Component Breakdown (if available):
${formatComponentBreakdown(eventData.components, eventType)}

──────────────────────────────────────────────────────────────────

Immediate Market Reaction (first 5 minutes):
${formatImmediateReaction(eventData.immediateReaction)}

──────────────────────────────────────────────────────────────────

Pre-Event Context:
- Market Expectation: ${preAnalysis?.forecast_assessment || 'N/A'}
- Positioning: ${preAnalysis?.current_positioning || 'N/A'}
- Narrative: ${preAnalysis?.strategy_reasoning || 'N/A'}

──────────────────────────────────────────────────────────────────

Historical Comparison:
- Average reaction to similar surprise: ${historicalStats?.average_volatility ? historicalStats.average_volatility + '%' : 'N/A'}
- Typical duration: ${historicalStats?.typical_reaction_duration || 'N/A'}
- Fade pattern: ${historicalStats?.fade_tendency ? 'Yes, initial moves tend to fade' : 'No, moves tend to persist'}

──────────────────────────────────────────────────────────────────

Current Asset Prices (USE THESE FOR STOP LOSS / TAKE PROFIT):
${formatAssetPricesForPrompt(currentPrices)}

══════════════════════════════════════════════════════════════════
                      REQUIRED OUTPUT
══════════════════════════════════════════════════════════════════

Return ONLY valid JSON in this exact structure:

{
  "resultAnalysis": {
    "surpriseCategory": "big_beat" | "small_beat" | "inline" | "small_miss" | "big_miss",
    "surprisePercent": number,
    "headlineAssessment": "string",
    "componentAnalysis": "string" | null,
    "overallQuality": "strong" | "mixed" | "weak"
  },

  "marketReaction": {
    "initialReaction": "string",
    "reactionAssessment": "appropriate" | "over_reaction" | "under_reaction" | "divergent",
    "divergences": "string" | null,
    "reactionInsight": "string"
  },

  "implications": {
    "monetaryPolicy": {
      "fedImpact": "string",
      "rateProbabilityShift": "string",
      "nextMeetingExpectation": "string"
    },
    "economicOutlook": {
      "narrativeChange": "string",
      "recessionRisk": "increased" | "unchanged" | "decreased",
      "growthOutlook": "string"
    },
    "riskAppetite": {
      "shift": "risk_on" | "risk_off" | "neutral",
      "sectorImplications": "string"
    }
  },

  "tradeRecommendation": {
    "action": "trade_continuation" | "fade_move" | "wait_confirmation" | "no_trade",
    "urgency": "immediate" | "soon" | "patient",
    "conviction": 1-10,
    "reasoning": "string"
  },

  "tradeSetup": {
    "hasTrade": true | false,
    "direction": "long" | "short" | "none",
    "asset": "string",
    "entry": {
      "type": "market" | "limit" | "stop",
      "level": "string",
      "condition": "string"
    },
    "stopLoss": "string",
    "takeProfit": "string",
    "timeHorizon": "intraday" | "days" | "weeks",
    "positionSize": "small" | "standard" | "large",
    "riskReward": "poor" | "fair" | "good" | "excellent"
  },

  "alternativeTrades": [
    {
      "asset": "string",
      "direction": "long" | "short",
      "rationale": "string"
    }
  ],

  "keyRisks": ["string"],

  "summary": "string (2-3 sentences, immediate takeaway and action)"
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
          { role: 'system', content: POST_EVENT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,  // Post-event needs more deterministic, fast decisions
        max_tokens: 2500,
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
    const validationErrors = validatePostEventAnalysis(analysis);
    if (validationErrors.length > 0) {
      console.warn('Post-event analysis validation warnings:', validationErrors);
    }
    
    return {
      ...analysis,
      calculatedSurprise: surprise,
      preAnalysisId: preAnalysis?.id || null,
      validationWarnings: validationErrors
    };
  } catch (error) {
    console.error('Post-event analysis failed:', error);
    throw error;
  }
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Save post-event analysis to database
// ───────────────────────────────────────────────────────────────────

async function savePostEventAnalysis(
  eventData: any,
  analysis: any
): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const eventType = determineEventType(eventData.name);
  const surprise = analysis.calculatedSurprise || calculateSurpriseCategory(eventData.actual, eventData.forecast);
  
  const record = {
    pre_analysis_id: analysis.preAnalysisId,
    
    event_name: eventData.name,
    event_type: eventType,
    event_date: eventData.releaseTime.split('T')[0],
    released_at: eventData.releaseTime,
    country: eventData.country || 'US',
    currency: eventData.currency || 'USD',
    
    actual: eventData.actual,
    forecast: eventData.forecast,
    previous: eventData.previous,
    surprise_percent: surprise.percent,
    surprise_direction: surprise.direction,
    
    surprise_category: analysis.resultAnalysis?.surpriseCategory,
    headline_assessment: analysis.resultAnalysis?.headlineAssessment,
    component_analysis: analysis.resultAnalysis?.componentAnalysis,
    overall_quality: analysis.resultAnalysis?.overallQuality,
    
    components: eventData.components || {},
    
    initial_reaction: eventData.immediateReaction || {},
    reaction_assessment: analysis.marketReaction?.reactionAssessment,
    divergences: analysis.marketReaction?.divergences,
    reaction_insight: analysis.marketReaction?.reactionInsight,
    
    monetary_policy_impact: analysis.implications?.monetaryPolicy || {},
    economic_outlook: analysis.implications?.economicOutlook || {},
    risk_appetite_shift: analysis.implications?.riskAppetite?.shift,
    sector_implications: analysis.implications?.riskAppetite?.sectorImplications,
    
    trade_action: analysis.tradeRecommendation?.action,
    urgency: analysis.tradeRecommendation?.urgency,
    conviction: analysis.tradeRecommendation?.conviction || 5,
    trade_reasoning: analysis.tradeRecommendation?.reasoning,
    
    has_trade: analysis.tradeSetup?.hasTrade || false,
    trade_direction: analysis.tradeSetup?.direction,
    trade_asset: analysis.tradeSetup?.asset,
    entry_type: analysis.tradeSetup?.entry?.type,
    entry_level: analysis.tradeSetup?.entry?.level,
    entry_condition: analysis.tradeSetup?.entry?.condition,
    stop_loss: analysis.tradeSetup?.stopLoss,
    take_profit: analysis.tradeSetup?.takeProfit,
    time_horizon: analysis.tradeSetup?.timeHorizon,
    position_size: analysis.tradeSetup?.positionSize,
    risk_reward: analysis.tradeSetup?.riskReward,
    
    alternative_trades: analysis.alternativeTrades || [],
    key_risks: analysis.keyRisks || [],
    summary: analysis.summary,
    
    raw_analysis: analysis,
    model_used: 'gpt-4o-mini',
    analyzed_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('event_post_analyses')
    .insert(record)
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to save post-event analysis: ${error.message}`);
  }
  
  // Also save to historical data for future reference
  await saveToHistoricalData(eventData, surprise);
  
  return data.id;
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Save to historical data
// ───────────────────────────────────────────────────────────────────

async function saveToHistoricalData(eventData: any, surprise: any): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const eventType = determineEventType(eventData.name);
  
  await supabase
    .from('event_historical_data')
    .insert({
      event_name: eventData.name,
      event_type: eventType,
      event_date: eventData.releaseTime,
      country: eventData.country || 'US',
      currency: eventData.currency || 'USD',
      forecast: eventData.forecast,
      actual: eventData.actual,
      previous: eventData.previous,
      surprise_percent: surprise.percent,
      surprise_direction: surprise.direction,
      market_reaction: eventData.immediateReaction || {},
      components: eventData.components || {}
    });
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
    const { success: rateLimitOk, reset } = await checkRateLimit(`ai:${user.id}:${clientIP}:post-event`, 'ai');
    if (!rateLimitOk) {
      return NextResponse.json({
        error: 'Too many requests. Please wait before analyzing more events.',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    const body = await request.json();
    
    // Validate required fields - actual is required, forecast can be N/A
    if (!body.name || body.actual === undefined || body.actual === null) {
      return NextResponse.json(
        { error: 'Missing required field: name or actual' },
        { status: 400 }
      );
    }
    
    // Parse numeric values, handling $ signs and N/A
    const parseNumeric = (val: any): number | null => {
      if (val === null || val === undefined || val === 'N/A' || val === '') return null;
      const cleaned = String(val).replace(/[$%,]/g, '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };
    
    const actualValue = parseNumeric(body.actual);
    if (actualValue === null) {
      return NextResponse.json(
        { error: 'Invalid actual value' },
        { status: 400 }
      );
    }
    
    const eventData = {
      name: body.name,
      releaseTime: body.releaseTime || new Date().toISOString(),
      actual: actualValue,
      forecast: parseNumeric(body.forecast),
      previous: parseNumeric(body.previous),
      country: body.country || 'US',
      currency: body.currency || 'USD',
      components: body.components || null,
      immediateReaction: body.immediateReaction || null
    };

    // Demo mode when OpenAI not configured — return demo analysis so UI still shows
    if (!OPENAI_API_KEY) {
      const analysis = getDemoPostEventAnalysis(eventData);
      return NextResponse.json({
        success: true,
        analysisId: null,
        event: eventData.name,
        actual: eventData.actual,
        forecast: eventData.forecast,
        surprise: analysis.calculatedSurprise,
        analysis,
        demo: true
      });
    }
    
    // Analyze the event
    const analysis = await analyzePostEvent(eventData);
    
    // Save to database
    const analysisId = await savePostEventAnalysis(eventData, analysis);
    
    return NextResponse.json({
      success: true,
      analysisId,
      event: eventData.name,
      actual: eventData.actual,
      forecast: eventData.forecast,
      surprise: analysis.calculatedSurprise,
      analysis
    });
    
  } catch (error) {
    console.error('Post-event analysis API error:', error);
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
// GET: Retrieve existing post-event analysis
// ═══════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get('event');
    const eventDate = searchParams.get('date');
    const id = searchParams.get('id');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    let query = supabase.from('event_post_analyses').select('*');
    
    if (id) {
      query = query.eq('id', id);
    } else if (eventName) {
      query = query.ilike('event_name', `%${eventName}%`);
      if (eventDate) {
        query = query.gte('event_date', eventDate);
      }
    }
    
    const { data, error } = await query
      .order('released_at', { ascending: false })
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
    console.error('Get post-event analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analyses' },
      { status: 500 }
    );
  }
}
