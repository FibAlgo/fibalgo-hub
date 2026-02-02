/**
 * GET /api/calendar/event-analyses?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns full pre-event and post-event analyses for the Agent Analyze tab.
 * Includes all fields needed for SharedEventCards display.
 * Also fetches actual data from FMP API for events without post-analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';

function hasActualValue(v: any): boolean {
  if (v === null || v === undefined) return false;
  // numeric 0 is a valid actual value (e.g., 0.0)
  if (typeof v === 'number') return !Number.isNaN(v);
  const s = String(v).trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (lower === 'n/a' || lower === 'na' || lower === '-' || lower === '—') return false;
  return true;
}

function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function normalizeFmpResponse(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data;
  return [];
}

// Store FMP event with more details for better matching
interface FmpEventData {
  actual: any;
  forecast: any;
  previous: any;
  country?: string;
  eventName: string;
  date: string;
}

// Fetch actual data from FMP API for a date range
async function fetchFmpActualData(from: string, to: string): Promise<FmpEventData[]> {
  const results: FmpEventData[] = [];
  
  if (!FMP_API_KEY) return results;
  
  try {
    const url = `${FMP_STABLE_BASE}/economic-calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`;
    const response = await fetch(url, { cache: 'no-store' });
    const raw = await response.json().catch(() => null);
    const events = normalizeFmpResponse(raw);
    
    for (const e of events) {
      if (hasActualValue(e.actual)) {
        results.push({
          actual: e.actual,
          forecast: e.estimate ?? e.forecast ?? null,
          previous: e.previous ?? null,
          country: (e.country || '').toUpperCase(),
          eventName: (e.event || e.title || e.name || '').toLowerCase().trim(),
          date: (e.date || '').slice(0, 10)
        });
      }
    }
    
    console.log(`[event-analyses] FMP returned ${events.length} events, ${results.length} with actual data`);
  } catch (error) {
    console.error('[event-analyses] FMP fetch error:', error);
  }
  
  return results;
}

// Normalize event name for matching (remove date parts, country prefixes, etc.)
function normalizeEventName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\(jan\)|\(feb\)|\(mar\)|\(apr\)|\(may\)|\(jun\)|\(jul\)|\(aug\)|\(sep\)|\(oct\)|\(nov\)|\(dec\)/gi, '')
    .replace(/\(q[1-4]\)/gi, '')
    .replace(/january|february|march|april|may|june|july|august|september|october|november|december/gi, '')
    .replace(/nbs|caixin|s&p global|hcob|hsbc|jibun bank/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Find matching FMP data for an event
function findFmpMatch(fmpData: FmpEventData[], eventName: string, eventDate: string, eventCountry?: string): FmpEventData | null {
  const normalizedName = normalizeEventName(eventName);
  const normalizedDate = (eventDate || '').slice(0, 10);
  const normalizedCountry = (eventCountry || '').toUpperCase();
  
  // Try to find best match
  let bestMatch: FmpEventData | null = null;
  let bestScore = 0;
  
  for (const fmp of fmpData) {
    // Date must match
    if (fmp.date !== normalizedDate) continue;
    
    const fmpNormalizedName = normalizeEventName(fmp.eventName);
    
    // Calculate match score
    let score = 0;
    
    // Country match bonus
    if (normalizedCountry && fmp.country === normalizedCountry) {
      score += 50;
    }
    
    // Name match scoring
    if (fmpNormalizedName === normalizedName) {
      score += 100; // Exact match
    } else if (fmpNormalizedName.includes(normalizedName) || normalizedName.includes(fmpNormalizedName)) {
      score += 70; // Contains match
    } else {
      // Check for key words match
      const fmpWords = fmpNormalizedName.split(' ').filter(w => w.length > 2);
      const eventWords = normalizedName.split(' ').filter(w => w.length > 2);
      const commonWords = fmpWords.filter(w => eventWords.includes(w));
      if (commonWords.length >= 2) {
        score += 40 + (commonWords.length * 10);
      } else if (commonWords.length === 1 && commonWords[0].length > 4) {
        score += 30;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = fmp;
    }
  }
  
  // Only return if we have a reasonable match
  if (bestScore >= 40) {
    console.log(`[event-analyses] Matched "${eventName}" (${eventCountry}) -> FMP "${bestMatch?.eventName}" (${bestMatch?.country}) score=${bestScore}, actual=${bestMatch?.actual}`);
    return bestMatch;
  }
  
  return null;
}

// Convert snake_case DB fields to camelCase for UI
function transformPreAnalysis(row: any): any {
  if (!row) return null;
  
  return {
    id: row.id,
    eventName: row.event_name,
    eventType: row.event_type,
    eventDate: row.event_date,
    eventCategory: row.event_category || 'macro',
    country: row.country,
    currency: row.currency,
    importance: row.importance,
    
    // Forecast data
    forecast: row.forecast,
    previous: row.previous,
    whisperNumber: row.whisper_number,
    
    // Classification
    eventClassification: {
      tier: row.tier,
      expectedVolatility: row.expected_volatility,
      primaryAffectedAssets: row.primary_affected_assets || [],
      secondaryAffectedAssets: row.secondary_affected_assets || [],
    },
    
    // Historical
    historicalAnalysis: {
      beatRate: row.historical_beat_rate ? `${row.historical_beat_rate}%` : null,
      averageSurprise: row.historical_avg_surprise ? `${row.historical_avg_surprise}%` : null,
      typicalReaction: row.typical_reaction,
      reactionDuration: row.reaction_duration,
      fadePattern: row.fade_pattern,
      keyInsight: row.historical_insight,
    },
    
    // Expectations
    expectationsAnalysis: {
      forecastAssessment: row.forecast_assessment,
      whisperNumber: row.whisper_number,
      whatWouldSurprise: row.what_would_surprise,
      pricedInLevel: row.priced_in_level,
    },
    
    // Scenarios
    scenarios: row.scenarios || {},
    scenarioPlaybook: row.scenario_playbook || null,
    
    // Positioning
    positioningAnalysis: {
      currentPositioning: row.current_positioning,
      crowdedSide: row.crowded_side,
      painTrade: row.pain_trade,
    },
    
    // Strategy
    preEventStrategy: {
      recommendedApproach: row.recommended_approach,
      reasoning: row.strategy_reasoning,
      conviction: row.conviction,
      timeHorizon: row.time_horizon,
    },

    // Scores (persisted in DB; used by Terminal meters)
    urgency_score: row.urgency_score,
    market_mover_score: row.market_mover_score,
    conviction_score: row.conviction_score,
    
    // Trade setup
    tradeSetup: {
      hasTrade: row.has_trade,
      direction: row.trade_direction,
      asset: row.trade_asset,
      trigger: row.entry_condition,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
    },
    
    // Risks and summary
    keyRisks: row.key_risks || [],
    summary: row.summary,
    tradingview_assets: row.tradingview_assets || row.primary_affected_assets || [],
    
    // Earnings-specific
    symbol: row.symbol,
    companyName: row.company_name,
    epsEstimate: row.eps_estimate,
    epsWhisper: row.eps_whisper,
    revenueEstimate: row.revenue_estimate,
    revenueWhisper: row.revenue_whisper,
    guidanceExpectation: row.guidance_expectation,
    sectorImpact: row.sector_impact,
    
    // IPO-specific
    exchange: row.exchange,
    priceRangeLow: row.price_range_low,
    priceRangeHigh: row.price_range_high,
    ipoPrice: row.ipo_price,
    sharesOffered: row.shares_offered,
    demandAssessment: row.demand_assessment,
    
    // Metadata
    modelUsed: row.model_used,
    analyzedAt: row.analyzed_at,
  };
}

function transformPostAnalysis(row: any): any {
  if (!row) return null;
  
  return {
    id: row.id,
    preAnalysisId: row.pre_analysis_id,
    eventName: row.event_name,
    eventDate: row.event_date,
    country: row.country,
    
    // Actual data
    actual: row.actual,
    forecast: row.forecast,
    previous: row.previous,
    releasedAt: row.released_at,
    
    // Surprise assessment
    surpriseAssessment: row.surprise_assessment,
    surpriseMagnitude: row.surprise_magnitude,
    
    // Market reaction
    marketReaction: row.market_reaction || {},
    
    // Position update
    positionUpdate: row.position_update || {},
    
    // Summary
    headline: row.headline,
    summary: row.summary,
    tradingview_assets: row.tradingview_assets || [],
    
    // Metadata
    modelUsed: row.model_used,
    analyzedAt: row.analyzed_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    if (!from || !to) {
      return NextResponse.json({ success: false, error: 'from and to are required' }, { status: 400 });
    }

    if (!SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not set' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const fromTs = `${from}T00:00:00.000Z`;
    const toTs = `${nextDay(to)}T00:00:00.000Z`;
    
    const now = new Date();

    // Fetch pre-event analyses (for upcoming events)
    const { data: preRows, error: preError } = await supabase
      .from('event_pre_analyses')
      .select('*')
      .gte('event_date', fromTs)
      .lt('event_date', toTs)
      .order('event_date', { ascending: true })
      .limit(100);

    if (preError) {
      console.error('[event-analyses] pre fetch error:', preError);
      return NextResponse.json({ success: false, error: 'Failed to fetch pre analyses' }, { status: 500 });
    }

    // Fetch post-event analyses (for released events)
    const { data: postRows, error: postError } = await supabase
      .from('event_post_analyses')
      .select('*')
      .gte('event_date', fromTs)
      .lt('event_date', toTs)
      .order('released_at', { ascending: false })
      .limit(100);

    if (postError) {
      console.error('[event-analyses] post fetch error:', postError);
      return NextResponse.json({ success: false, error: 'Failed to fetch post analyses' }, { status: 500 });
    }

    // Transform and categorize analyses
    const preAnalyses = (preRows || []).map(transformPreAnalysis);
    const postAnalyses = (postRows || []).map(transformPostAnalysis);
    
    // Fetch actual data from FMP for events that might have been released
    const fmpData = await fetchFmpActualData(from, to);
    console.log(`[event-analyses] Fetched ${fmpData.size} events with actual data from FMP`);
    
    // Categorize pre-event analyses into upcoming vs live
    const upcomingAnalyses: any[] = [];
    const liveAnalyses: any[] = [];
    const releasedAnalyses: any[] = [];
    
    for (const pre of preAnalyses) {
      const eventDate = new Date(pre.eventDate);
      const diffMs = eventDate.getTime() - now.getTime();
      const hoursUntil = diffMs / (1000 * 60 * 60);
      const minutesAgo = -diffMs / (1000 * 60);
      
      // Check if we have post analysis with actual data
      const post = postAnalyses.find(p => 
        p.eventName?.toLowerCase().includes(pre.eventName?.toLowerCase().slice(0, 20)) ||
        pre.eventName?.toLowerCase().includes(p.eventName?.toLowerCase().slice(0, 20))
      );
      const postHasActual = hasActualValue(post?.actual);
      
      // Also check FMP data for actual value
      const fmpMatch = findFmpMatch(fmpData, pre.eventName, pre.eventDate?.slice(0, 10), pre.country);
      const fmpHasActual = hasActualValue(fmpMatch?.actual);
      const hasActual = postHasActual || fmpHasActual;
      const actualValue = postHasActual ? post?.actual : (fmpHasActual ? fmpMatch?.actual : null);
      
      if (hoursUntil > 0) {
        // Upcoming event (not yet started)
        upcomingAnalyses.push({
          event: {
            id: pre.id,
            name: pre.eventName,
            title: pre.eventName,
            date: pre.eventDate?.slice(0, 10),
            time: pre.eventDate,
            country: pre.country,
            currency: pre.currency,
            importance: pre.importance,
            type: pre.eventCategory,
            forecast: pre.forecast,
            previous: pre.previous,
          },
          analysis: pre,
          hoursUntil: Math.round(hoursUntil * 10) / 10,
        });
      } else if (eventDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
        // Event has started and is within the last 24 hours
        // Show as live/post-event card until end of day or 24 hours
        liveAnalyses.push({
          event: {
            id: pre.id,
            name: pre.eventName,
            title: pre.eventName,
            date: pre.eventDate?.slice(0, 10),
            time: pre.eventDate,
            country: pre.country,
            currency: pre.currency,
            importance: pre.importance,
            type: pre.eventCategory,
            forecast: fmpMatch?.forecast ?? pre.forecast,
            previous: fmpMatch?.previous ?? pre.previous,
            actual: actualValue, // Use actual from post-analysis or FMP
          },
          analysis: pre,
          postAnalysis: post || null,
          fmpData: fmpMatch || null, // Include FMP data for debugging
          minutesAgo: Math.round(minutesAgo),
          hasActual: hasActual, // True if either post-analysis or FMP has actual
        });
      }
    }
    
    // Add post analyses that don't have a matching pre-analysis
    for (const post of postAnalyses) {
      const eventDate = new Date(post.eventDate);
      const minutesAgo = (now.getTime() - eventDate.getTime()) / (1000 * 60);
      
      // Only include recently released (within 24 hours)
      if (minutesAgo > 0 && minutesAgo <= 1440) {
        // Check if already in liveAnalyses
        const alreadyIncluded = liveAnalyses.some(l => 
          l.postAnalysis?.id === post.id || 
          l.event.name?.toLowerCase().includes(post.eventName?.toLowerCase().slice(0, 20))
        );
        
        if (!alreadyIncluded) {
          releasedAnalyses.push({
            event: {
              id: post.id,
              name: post.eventName,
              title: post.eventName,
              date: post.eventDate?.slice(0, 10),
              time: post.eventDate,
              country: post.country,
              actual: post.actual,
              forecast: post.forecast,
              previous: post.previous,
            },
            analysis: post,
            minutesAgo: Math.round(minutesAgo),
            hasActual: true,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        preEvent: upcomingAnalyses,
        liveEvent: [...releasedAnalyses, ...liveAnalyses],
        totalPre: preAnalyses.length,
        totalPost: postAnalyses.length,
      }
    });
  } catch (e) {
    console.error('[event-analyses] error:', e);
    return NextResponse.json({ success: false, error: 'Unknown error' }, { status: 500 });
  }
}
