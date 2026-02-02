import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseFmpEventDateMs } from '@/lib/data/fmp-news-utils';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ═══════════════════════════════════════════════════════
// CALENDAR ANALYSIS SYSTEM PROMPT
// KATMAN 1 — Kurumsal Makro Stratejist Karakteri
// ═══════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are a senior macro strategist at a $15 billion global macro hedge fund. You specialize in event-driven trading and have profitably navigated every major economic release for the past 20 years.

Your job: Analyze upcoming economic events for a given period and provide comprehensive market outlook and positioning guidance.

═══════════════════════════════════════════════════════════════════
                         ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════════

Execute these steps IN ORDER for period analysis:

───────────────────────────────────────────────────────────────────
STEP 1: EVENT CLASSIFICATION & PRIORITIZATION
───────────────────────────────────────────────────────────────────

Classify each event by market impact potential:

TIER 1 (Market Moving) - 🔴 CRITICAL:
- FOMC Rate Decision & Press Conference
- Non-Farm Payrolls (NFP)
- CPI / Core CPI
- ECB / BOJ / BOE Rate Decisions
- US GDP (Advance)
- Major crypto events (ETF decisions, Halvings)
→ Expect: 1-3% moves in affected assets

TIER 2 (High Impact) - 🟠 HIGH:
- PCE Inflation
- PPI
- Retail Sales
- PMI (ISM Manufacturing/Services)
- Unemployment Claims (if abnormal)
- Major Tech Earnings (AAPL, NVDA, MSFT, GOOGL, TSLA)
- Token Unlocks (>5% of supply)
- Major Exchange Listings
→ Expect: 0.5-1.5% moves

TIER 3 (Moderate Impact) - 🟡 MEDIUM:
- Housing data (Housing Starts, Building Permits)
- Consumer Confidence
- Trade Balance
- Factory Orders
- Minor earnings
- Crypto AMAs, Team Updates
→ Expect: 0.2-0.5% moves

───────────────────────────────────────────────────────────────────
STEP 2: THEMATIC CLUSTERING
───────────────────────────────────────────────────────────────────

Group events into dominant themes:

MONETARY POLICY THEME:
- Central bank decisions
- Fed speakers
- Rate expectations shifts

INFLATION THEME:
- CPI, PPI, PCE
- Wage data
- Commodity prices

GROWTH THEME:
- GDP, PMI, Retail Sales
- Employment data
- Corporate earnings

CRYPTO THEME:
- Token unlocks (bearish pressure)
- Exchange listings (bullish)
- Network upgrades (bullish if successful)
- Regulatory events (variable)

Identify which theme DOMINATES this period.

───────────────────────────────────────────────────────────────────
STEP 3: EVENT CLUSTERING & RISK WINDOWS
───────────────────────────────────────────────────────────────────

Identify:
- Days with MULTIPLE high-impact events (volatility clusters)
- Gaps with NO significant events (consolidation windows)
- Sequence effects (e.g., CPI → FOMC = compounding impact)

CRITICAL: Multiple Tier 1 events in same week = EXTREME volatility risk

───────────────────────────────────────────────────────────────────
STEP 4: MARKET REGIME ASSESSMENT
───────────────────────────────────────────────────────────────────

Determine the likely market regime for this period:

RISK-ON Environment:
- Fear & Greed > 60
- VIX < 15
- Positive earnings expectations
- Dovish Fed expectations
→ Good news AMPLIFIES, bad news gets bought

RISK-OFF Environment:
- Fear & Greed < 30
- VIX > 25
- Recession fears
- Hawkish Fed expectations
→ Bad news AMPLIFIES, good news gets discounted

NEUTRAL/TRANSITIONAL:
- Mixed signals
- Waiting for key data
- Range-bound expectations

───────────────────────────────────────────────────────────────────
STEP 5: SCENARIO ANALYSIS
───────────────────────────────────────────────────────────────────

For the KEY events in this period, map out scenarios:

BULLISH SCENARIO: What combination of outcomes leads to risk-on?
BEARISH SCENARIO: What combination leads to risk-off?
BASE CASE: Most likely outcome path

Assign probabilities to each scenario.

───────────────────────────────────────────────────────────────────
STEP 6: POSITIONING IMPLICATIONS
───────────────────────────────────────────────────────────────────

Based on event calendar and scenarios:

ASSETS TO WATCH:
- Which assets are most affected by this period's events?
- Which have asymmetric risk/reward?

POSITIONING GUIDANCE:
- Should traders be defensive or aggressive?
- Reduce exposure before key events or position for breakout?
- Which sectors/assets to overweight/underweight?

HEDGE RECOMMENDATIONS:
- Are hedges warranted given event density?
- Specific hedge strategies if needed

───────────────────────────────────────────────────────────────────
STEP 7: ACTIONABLE SUMMARY
───────────────────────────────────────────────────────────────────

Provide:
- Overall period outlook (bullish/bearish/neutral)
- Confidence level (1-10)
- Key dates to watch
- Primary risks
- Trading implications

═══════════════════════════════════════════════════════════════════
                       CONVICTION CALIBRATION
═══════════════════════════════════════════════════════════════════

OUTLOOK SCORE (1-10):

1-2: Extremely bearish, high risk, reduce exposure
3-4: Bearish bias, cautious positioning
5:   Neutral, mixed signals, no clear direction
6-7: Bullish bias, constructive setup
8-9: Strongly bullish, favorable conditions
10:  Extremely bullish, rare

═══════════════════════════════════════════════════════════════════
                    CRYPTO-SPECIFIC GUIDELINES
═══════════════════════════════════════════════════════════════════

TOKEN UNLOCKS:
- >5% of circulating supply = HIGH impact, bearish pressure
- 1-5% of supply = MEDIUM impact
- <1% of supply = LOW impact
- Consider: Vesting schedule, team vs investor tokens

EXCHANGE LISTINGS:
- Tier 1 exchange (Binance, Coinbase) = HIGH impact, bullish
- Tier 2 exchange = MEDIUM impact
- DEX listing = LOW impact

NETWORK UPGRADES:
- Successful upgrade = bullish (but often "sell the news")
- Failed/delayed upgrade = bearish

═══════════════════════════════════════════════════════════════════
                         OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════

Return ONLY valid JSON. Be DECISIVE - traders need clear guidance.
Focus on ACTIONABLE insights, not just event listing.
Prioritize the MOST IMPORTANT events, don't give equal weight to all.

───────────────────────────────────────────────────────────────────`;

// ═══════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════

function getDateRange(periodType: 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (periodType === 'daily') {
    // Today
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (periodType === 'weekly') {
    // This week (Monday to Sunday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(now.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else {
    // This month
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const COINMARKETCAL_API_KEY = process.env.COINMARKETCAL_API_KEY;

// ═══════════════════════════════════════════════════════
// FETCH FOREX/MACRO EVENTS FROM FOREX FACTORY (FREE)
// ═══════════════════════════════════════════════════════

async function fetchForexEvents(startDate: string, endDate: string): Promise<any[]> {
  try {
    const response = await fetch(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('Forex Factory API error:', response.status);
      return [];
    }

    const events = await response.json();
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 86399999; // end of day
    
    return events
      .filter((event: any) => {
        const eventMs = parseFmpEventDateMs(event.date, event.time);
        if (eventMs == null) return false;
        return eventMs >= start && eventMs <= end;
      })
      .map((event: any) => ({
        time: event.date,
        event: event.title,
        country: event.country,
        impact: event.impact?.toLowerCase() === 'holiday' ? 'low' : event.impact?.toLowerCase(),
        actual: event.actual || null,
        estimate: event.forecast || null,
        prev: event.previous || null,
        type: 'macro'
      }));
  } catch (error) {
    console.error('Failed to fetch forex events:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════
// FETCH CRYPTO EVENTS FROM COINMARKETCAL (FREE TIER)
// ═══════════════════════════════════════════════════════

async function fetchCryptoEvents(startDate: string, endDate: string): Promise<any[]> {
  if (!COINMARKETCAL_API_KEY) {
    console.log('COINMARKETCAL_API_KEY not configured, skipping crypto events');
    return [];
  }

  try {
    const response = await fetch(
      `https://developers.coinmarketcal.com/v1/events?dateRangeStart=${startDate}&dateRangeEnd=${endDate}&max=50`,
      {
        headers: {
          'x-api-key': COINMARKETCAL_API_KEY,
          'Accept': 'application/json'
        },
        next: { revalidate: 86400 } // Cache for 24 hours to save API calls
      }
    );

    if (!response.ok) {
      console.error('CoinMarketCal API error:', response.status);
      return [];
    }

    const data = await response.json();
    const events = data.body || [];

    // Determine impact based on coin rank and category
    const getImpact = (event: any): string => {
      const coin = event.coins?.[0];
      const rank = coin?.rank || 999;
      const category = event.categories?.[0]?.name?.toLowerCase() || '';
      
      // High impact: Top 20 coins OR major categories
      if (rank <= 20 || ['tokenomics', 'release', 'hard fork'].includes(category)) {
        return 'high';
      }
      // Medium impact: Top 100 coins OR exchange listings
      if (rank <= 100 || category === 'exchange') {
        return 'medium';
      }
      return 'low';
    };

    return events.map((event: any) => ({
      time: event.date_event,
      event: `${event.coins?.[0]?.symbol || 'CRYPTO'} - ${event.title?.en || event.title}`,
      country: 'CRYPTO',
      impact: getImpact(event),
      actual: null,
      estimate: null,
      prev: null,
      type: 'crypto',
      coin: event.coins?.[0]?.symbol,
      coinRank: event.coins?.[0]?.rank,
      category: event.categories?.[0]?.name
    }));
  } catch (error) {
    console.error('Failed to fetch crypto events:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════
// COMBINED EVENT FETCHER
// ═══════════════════════════════════════════════════════

async function fetchCalendarEvents(startDate: string, endDate: string): Promise<any[]> {
  try {
    // Fetch both forex and crypto events in parallel
    const [forexEvents, cryptoEvents] = await Promise.all([
      fetchForexEvents(startDate, endDate),
      fetchCryptoEvents(startDate, endDate)
    ]);

    console.log(`Fetched ${forexEvents.length} forex events, ${cryptoEvents.length} crypto events`);
    
    // Combine and return
    return [...forexEvents, ...cryptoEvents];
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════
// ANALYZE CALENDAR WITH DEEPSEEK
// ═══════════════════════════════════════════════════════

async function analyzeCalendar(
  events: any[],
  periodType: 'daily' | 'weekly' | 'monthly',
  startDate: string,
  endDate: string
): Promise<any> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  // Sort events by impact and date
  const sortedEvents = events.sort((a, b) => {
    const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const impactA = impactOrder[a.impact?.toLowerCase()] ?? 3;
    const impactB = impactOrder[b.impact?.toLowerCase()] ?? 3;
    if (impactA !== impactB) return impactA - impactB;
    return new Date(a.time).getTime() - new Date(b.time).getTime();
  });

  // Prepare events summary for prompt
  const eventsText = sortedEvents.slice(0, 50).map(e => {
    return `- ${e.time}: [${e.impact?.toUpperCase() || 'N/A'}] ${e.country} - ${e.event} (Actual: ${e.actual || 'TBA'}, Forecast: ${e.estimate || 'N/A'}, Previous: ${e.prev || 'N/A'})`;
  }).join('\n');

  const highImpactCount = events.filter(e => e.impact?.toLowerCase() === 'high').length;
  const mediumImpactCount = events.filter(e => e.impact?.toLowerCase() === 'medium').length;

  const periodLabel = periodType === 'daily' ? 'Today' : periodType === 'weekly' ? 'This Week' : 'This Month';

  // ═══════════════════════════════════════════════════════
  // KATMAN 2 — USER PROMPT (Enhanced)
  // ═══════════════════════════════════════════════════════

  // Group events by category for better analysis
  const macroEvents = sortedEvents.filter(e => e.type === 'macro');
  const cryptoEvents = sortedEvents.filter(e => e.type === 'crypto');
  
  // Identify key events (Tier 1)
  const tier1Keywords = ['FOMC', 'Fed', 'CPI', 'NFP', 'Non-Farm', 'GDP', 'ECB', 'BOJ', 'BOE', 'Rate Decision', 'Halving', 'ETF'];
  const keyEvents = sortedEvents.filter(e => 
    e.impact?.toLowerCase() === 'high' || 
    tier1Keywords.some(keyword => e.event?.toLowerCase().includes(keyword.toLowerCase()))
  );

  const userPrompt = `
══════════════════════════════════════════════════════════════════
                      PERIOD ANALYSIS REQUEST
══════════════════════════════════════════════════════════════════

PERIOD: ${periodLabel}
DATE RANGE: ${startDate} to ${endDate}
TOTAL EVENTS: ${events.length}

EVENT BREAKDOWN:
- 🔴 High Impact: ${highImpactCount}
- 🟠 Medium Impact: ${mediumImpactCount}
- 🟢 Low Impact: ${events.length - highImpactCount - mediumImpactCount}

──────────────────────────────────────────────────────────────────
                        KEY EVENTS (Priority)
──────────────────────────────────────────────────────────────────

${keyEvents.slice(0, 15).map(e => {
  const type = e.type === 'crypto' ? '🪙' : '📊';
  return `${type} [${e.impact?.toUpperCase() || 'N/A'}] ${e.time} - ${e.country} - ${e.event}
   Forecast: ${e.estimate || 'N/A'} | Previous: ${e.prev || 'N/A'}`;
}).join('\n\n') || 'No key events identified.'}

──────────────────────────────────────────────────────────────────
                      MACRO ECONOMIC EVENTS
──────────────────────────────────────────────────────────────────

${macroEvents.slice(0, 20).map(e => 
  `- ${e.time}: [${e.impact?.toUpperCase() || 'N/A'}] ${e.country} - ${e.event} (Forecast: ${e.estimate || 'N/A'}, Prev: ${e.prev || 'N/A'})`
).join('\n') || 'No macro events scheduled.'}

──────────────────────────────────────────────────────────────────
                         CRYPTO EVENTS
──────────────────────────────────────────────────────────────────

${cryptoEvents.slice(0, 20).map(e => {
  const coinInfo = e.coin ? `[${e.coin}${e.coinRank ? ` #${e.coinRank}` : ''}]` : '';
  const category = e.category ? `(${e.category})` : '';
  return `- ${e.time}: [${e.impact?.toUpperCase() || 'N/A'}] ${coinInfo} ${e.event} ${category}`;
}).join('\n') || 'No crypto events scheduled.'}

══════════════════════════════════════════════════════════════════
                      REQUIRED OUTPUT FORMAT
══════════════════════════════════════════════════════════════════

Return ONLY valid JSON in this exact structure:

{
  "periodOverview": {
    "periodType": "${periodType}",
    "dateRange": "${startDate} to ${endDate}",
    "totalEvents": ${events.length},
    "highImpactEvents": ${highImpactCount},
    "eventDensity": "low" | "moderate" | "high" | "extreme"
  },

  "marketRegime": {
    "current": "risk-on" | "risk-off" | "neutral" | "transitional",
    "reasoning": "string explaining the assessment"
  },

  "dominantThemes": [
    {
      "theme": "string (e.g., 'Monetary Policy', 'Inflation Data', 'Crypto Unlocks')",
      "direction": "bullish" | "bearish" | "neutral" | "uncertain",
      "keyEvents": ["event names"],
      "macroRelevance": "high" | "medium" | "low"
    }
  ],

  "keyEvents": [
    {
      "event": "string",
      "time": "string",
      "country": "string",
      "impact": "high" | "medium" | "low",
      "expectedVolatility": "low" | "moderate" | "high" | "extreme",
      "affectedAssets": ["asset symbols"],
      "scenarios": {
        "bullish": "what outcome is bullish",
        "bearish": "what outcome is bearish"
      },
      "tradingImplication": "string"
    }
  ],

  "riskAssessment": {
    "overallRisk": "low" | "moderate" | "elevated" | "high",
    "volatilityExpectation": "low" | "moderate" | "high" | "extreme",
    "riskEvents": ["specific risk events to watch"],
    "hedgeRecommendation": "string"
  },

  "periodOutlook": {
    "outlook": "strongly_bearish" | "bearish" | "slightly_bearish" | "neutral" | "slightly_bullish" | "bullish" | "strongly_bullish",
    "score": 1-10,
    "confidence": 1-10,
    "reasoning": "string"
  },

  "tradingImplications": {
    "strategy": "defensive" | "neutral" | "aggressive",
    "assetsToWatch": ["asset symbols"],
    "sectorsAffected": ["sector names"],
    "positioning": "reduce_exposure" | "maintain" | "increase_exposure",
    "keyLevels": "string describing important price levels if relevant"
  },

  "currenciesToWatch": ["currency codes most affected"],
  
  "cryptoOutlook": {
    "sentiment": "bearish" | "neutral" | "bullish",
    "keyEvents": ["crypto event names"],
    "unlockPressure": "low" | "medium" | "high",
    "narrative": "string"
  },

  "executiveSummary": "2-3 sentence summary of the period outlook and key takeaways",
  
  "detailedAnalysis": "Detailed paragraph explaining the full analysis",

  "actionableInsights": [
    "Specific actionable insight 1",
    "Specific actionable insight 2",
    "Specific actionable insight 3"
  ]
}
`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in DeepSeek response');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('OpenAI analysis failed:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════

export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel sends this automatically for cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if: Vercel cron header OR manual secret param
    const url = new URL(request.url);
    const manualSecret = url.searchParams.get('secret');
    
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
      }
      if (authHeader !== `Bearer ${cronSecret}` && manualSecret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Get period type from query params (default: daily)
    const periodType = (url.searchParams.get('period') || 'daily') as 'daily' | 'weekly' | 'monthly';
    const forceRefresh = url.searchParams.get('force') === 'true';

    if (!['daily', 'weekly', 'monthly'].includes(periodType)) {
      return NextResponse.json({ error: 'Invalid period type' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get date range for the period
    const { start, end } = getDateRange(periodType);
    const startDate = formatDate(start);
    const endDate = formatDate(end);

    // Check if analysis already exists for this period
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from('calendar_analyses')
        .select('*')
        .eq('period_type', periodType)
        .eq('period_start', startDate)
        .single();

      if (existing) {
        return NextResponse.json({
          success: true,
          cached: true,
          analysis: existing
        });
      }
    }

    // Fetch calendar events from Finnhub
    console.log(`Fetching calendar events for ${periodType}: ${startDate} to ${endDate}`);
    const events = await fetchCalendarEvents(startDate, endDate);
    console.log(`Found ${events.length} calendar events`);

    if (events.length === 0) {
      // Still create an analysis noting no significant events
      const noEventsAnalysis = {
        marketRegime: 'neutral',
        macroBias: 'neutral',
        confidence: 5,
        dominantThemes: [],
        liquidityCondition: 'unclear',
        volatilityRegime: 'stable',
        positioningImplication: 'No significant events to drive positioning changes.',
        riskAssessment: '',
        assetsInFocus: [],
        actionability: 'low',
        notes: `No significant economic events scheduled for this ${periodType} period. Markets may trade on technical factors.`,
        keyEvents: [],
        currenciesToWatch: []
      };

      const { data: inserted, error: insertError } = await supabase
        .from('calendar_analyses')
        .upsert({
          period_type: periodType,
          period_start: startDate,
          period_end: endDate,
          // New macro regime fields
          market_regime: noEventsAnalysis.marketRegime,
          macro_bias: noEventsAnalysis.macroBias,
          confidence: noEventsAnalysis.confidence,
          dominant_themes: noEventsAnalysis.dominantThemes,
          liquidity_condition: noEventsAnalysis.liquidityCondition,
          volatility_regime: noEventsAnalysis.volatilityRegime,
          positioning_implication: noEventsAnalysis.positioningImplication,
          risk_assessment: noEventsAnalysis.riskAssessment,
          assets_in_focus: noEventsAnalysis.assetsInFocus,
          actionability: noEventsAnalysis.actionability,
          notes: noEventsAnalysis.notes,
          // Legacy fields for backward compatibility
          overall_outlook: 'neutral',
          outlook_score: 5,
          risk_level: 'low',
          volatility_expectation: 'low',
          currencies_to_watch: noEventsAnalysis.currenciesToWatch,
          sectors_affected: [],
          executive_summary: noEventsAnalysis.notes,
          key_events: noEventsAnalysis.keyEvents,
          risk_events: [],
          event_count: 0,
          high_impact_count: 0,
          events_analyzed: 0,
          model_used: 'deepseek-chat',
          analyzed_at: new Date().toISOString()
        }, { onConflict: 'period_type,period_start' })
        .select()
        .single();

      return NextResponse.json({
        success: true,
        noEvents: true,
        analysis: inserted || noEventsAnalysis
      });
    }

    // If DeepSeek is not configured, store a lightweight summary without analysis
    if (!DEEPSEEK_API_KEY) {
      const highImpactCount = events.filter(e => e.impact?.toLowerCase() === 'high').length;
      const fallbackKeyEvents = events.slice(0, 50).map(e => ({
        time: e.time,
        event: e.event,
        country: e.country,
        impact: e.impact,
        actual: e.actual ?? null,
        estimate: e.estimate ?? null,
        prev: e.prev ?? null,
        type: e.type
      }));

      const fallbackAnalysis = {
        marketRegime: 'neutral',
        macroBias: 'neutral',
        confidence: 4,
        dominantThemes: [],
        liquidityCondition: 'unclear',
        volatilityRegime: 'stable',
        positioningImplication: 'Event-driven period; monitor scheduled releases.',
        riskAssessment: '',
        assetsInFocus: [],
        actionability: 'medium',
        notes: 'DeepSeek disabled; stored calendar events without AI analysis.',
        keyEvents: fallbackKeyEvents,
        currenciesToWatch: []
      };

      const { data: inserted, error: insertError } = await supabase
        .from('calendar_analyses')
        .upsert({
          period_type: periodType,
          period_start: startDate,
          period_end: endDate,
          market_regime: fallbackAnalysis.marketRegime,
          macro_bias: fallbackAnalysis.macroBias,
          confidence: fallbackAnalysis.confidence,
          dominant_themes: fallbackAnalysis.dominantThemes,
          liquidity_condition: fallbackAnalysis.liquidityCondition,
          volatility_regime: fallbackAnalysis.volatilityRegime,
          positioning_implication: fallbackAnalysis.positioningImplication,
          risk_assessment: fallbackAnalysis.riskAssessment,
          assets_in_focus: fallbackAnalysis.assetsInFocus,
          actionability: fallbackAnalysis.actionability,
          notes: fallbackAnalysis.notes,
          overall_outlook: 'neutral',
          outlook_score: 5,
          risk_level: 'low',
          volatility_expectation: 'moderate',
          currencies_to_watch: fallbackAnalysis.currenciesToWatch,
          sectors_affected: [],
          executive_summary: fallbackAnalysis.notes,
          detailed_analysis: fallbackAnalysis.notes,
          trading_implications: JSON.stringify({}),
          key_events: fallbackAnalysis.keyEvents,
          risk_events: [],
          hedge_recommendations: '',
          event_count: events.length,
          high_impact_count: highImpactCount,
          events_analyzed: fallbackKeyEvents.length,
          model_used: 'none',
          analyzed_at: new Date().toISOString()
        }, { onConflict: 'period_type,period_start' })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        return NextResponse.json({
          success: true,
          warning: 'Events fetched but database save failed',
          periodType,
          startDate,
          endDate,
          eventsFound: events.length,
          highImpactCount,
          analysis: fallbackAnalysis
        });
      }

      return NextResponse.json({
        success: true,
        skippedAnalysis: true,
        periodType,
        startDate,
        endDate,
        eventsFound: events.length,
        highImpactCount,
        analysis: inserted
      });
    }

    // Analyze with OpenAI
    console.log('Analyzing calendar with OpenAI...');
    const analysis = await analyzeCalendar(events, periodType, startDate, endDate);

    // Count high impact events
    const highImpactCount = events.filter(e => e.impact?.toLowerCase() === 'high').length;

    // Map new outlook format to legacy format
    const outlookToScore: Record<string, number> = {
      'strongly_bearish': 1,
      'bearish': 3,
      'slightly_bearish': 4,
      'neutral': 5,
      'slightly_bullish': 6,
      'bullish': 7,
      'strongly_bullish': 9
    };

    const outlookToRisk: Record<string, string> = {
      'low': 'low',
      'moderate': 'moderate',
      'elevated': 'high',
      'high': 'high'
    };

    // Extract data from new JSON format
    const periodOutlook = analysis.periodOutlook || {};
    const riskAssessment = analysis.riskAssessment || {};
    const marketRegime = analysis.marketRegime || {};
    const tradingImplications = analysis.tradingImplications || {};
    const cryptoOutlook = analysis.cryptoOutlook || {};

    // Save to database with new format
    const { data: inserted, error: insertError } = await supabase
      .from('calendar_analyses')
      .upsert({
        period_type: periodType,
        period_start: startDate,
        period_end: endDate,
        // New enhanced fields
        market_regime: marketRegime.current || 'neutral',
        macro_bias: periodOutlook.outlook || 'neutral',
        confidence: periodOutlook.confidence || 5,
        dominant_themes: analysis.dominantThemes || [],
        liquidity_condition: riskAssessment.overallRisk || 'moderate',
        volatility_regime: riskAssessment.volatilityExpectation || 'moderate',
        positioning_implication: tradingImplications.positioning || 'maintain',
        risk_assessment: JSON.stringify(riskAssessment),
        assets_in_focus: tradingImplications.assetsToWatch || [],
        actionability: tradingImplications.strategy || 'neutral',
        notes: analysis.detailedAnalysis || '',
        // Legacy fields for backward compatibility
        overall_outlook: periodOutlook.outlook?.replace('slightly_', '').replace('strongly_', '') || 'neutral',
        outlook_score: periodOutlook.score || outlookToScore[periodOutlook.outlook] || 5,
        risk_level: outlookToRisk[riskAssessment.overallRisk] || 'moderate',
        volatility_expectation: riskAssessment.volatilityExpectation || 'moderate',
        currencies_to_watch: analysis.currenciesToWatch || [],
        sectors_affected: tradingImplications.sectorsAffected || [],
        executive_summary: analysis.executiveSummary || '',
        detailed_analysis: analysis.detailedAnalysis || '',
        trading_implications: JSON.stringify(tradingImplications),
        key_events: analysis.keyEvents || [],
        risk_events: riskAssessment.riskEvents || [],
        hedge_recommendations: riskAssessment.hedgeRecommendation || '',
        event_count: events.length,
        high_impact_count: highImpactCount,
        events_analyzed: Math.min(events.length, 50),
        model_used: 'deepseek-chat',
        analyzed_at: new Date().toISOString()
      }, { onConflict: 'period_type,period_start' })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Return analysis anyway even if DB fails
      return NextResponse.json({
        success: true,
        warning: 'Analysis generated but database save failed',
        periodType,
        startDate,
        endDate,
        eventsFound: events.length,
        highImpactCount,
        analysis
      });
    }

    // Cleanup old analyses (keep last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    await supabase
      .from('calendar_analyses')
      .delete()
      .lt('analyzed_at', ninetyDaysAgo.toISOString());

    return NextResponse.json({
      success: true,
      periodType,
      startDate,
      endDate,
      eventsFound: events.length,
      highImpactCount,
      analysis: inserted
    });

  } catch (error) {
    console.error('Calendar analysis error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support POST for Vercel Cron
export async function POST(request: Request) {
  return GET(request);
}
