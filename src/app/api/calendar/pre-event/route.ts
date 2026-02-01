/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🗓️ PRE-EVENT ANALYSIS API
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * POST /api/calendar/pre-event
 * 
 * Uses event-analyzer: Stage 1 (GPT-5.2) → Stage 2 (FMP + Perplexity) → Stage 3 (GPT-5.2)
 * 
 * Tek seferlik analiz: upcoming'da üretilir, live/post'ta aynı analiz gösterilir.
 */

import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireAuth, requirePremium, getErrorStatus, checkRateLimit, getClientIP } from '@/lib/api/auth';
import { analyzeEvent, type EventInput, type EventAnalysisResult } from '@/lib/ai/event-analyzer';
import type { PositionMemorySummary } from '@/lib/ai/perplexity-news-analyzer';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ═══════════════════════════════════════════════════════════════════════════════
// POSITION MEMORY (READ-ONLY from news_analyses)
// Event analysis READS position memory but does NOT WRITE to it.
// ═══════════════════════════════════════════════════════════════════════════════

type MemoryDirection = 'BUY' | 'SELL' | 'HOLD';

function normalizeAssetKey(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .toUpperCase()
    .replace(/^(BINANCE:|COINBASE:|KRAKEN:|BYBIT:|OKX:|NASDAQ:|NYSE:|AMEX:|FX:|FX_IDC:|FOREX:|FOREXCOM:|OANDA:|TVC:|CBOE:|SP:|DJ:|INDEX:|XETR:|COMEX:|NYMEX:)/, '')
    .replace(/[^A-Z0-9]/g, '');
}

function mapSignalToDirection(signal?: string | null): MemoryDirection {
  const s = String(signal || '').toUpperCase();
  if (s.includes('BUY')) return 'BUY';
  if (s.includes('SELL')) return 'SELL';
  return 'HOLD';
}

function clampText(s: unknown, maxLen: number): string {
  const str = String(s ?? '');
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

function buildRecentAnalysesForAsset(matched: any[]): Array<any> {
  const recent = matched
    .filter((r) => r?.ai_analysis && (r.ai_analysis.stage1 || r.ai_analysis.stage3))
    .slice(0, 3);

  return recent.map((r) => {
    const ai = r.ai_analysis || {};
    const s3 = ai.stage3 || {};
    const displayText = s3?.overall_assessment || r.title || '—';

    return {
      publishedAt: r.published_at,
      displayText: clampText(displayText, 600),
      positions: Array.isArray(s3?.positions) ? s3.positions.slice(0, 5).map((p: any) => ({
        asset: p?.asset,
        direction: p?.direction,
        confidence: p?.confidence,
        trade_type: p?.trade_type,
      })) : undefined,
    };
  });
}

async function buildPositionMemory(
  supabase: SupabaseClient,
  affectedAssets: string[]
): Promise<PositionMemorySummary | null> {
  if (!affectedAssets || affectedAssets.length === 0) return null;

  const keys = affectedAssets.map(normalizeAssetKey).filter(Boolean);
  if (keys.length === 0) return null;

  const now = Date.now();
  const macroDays = 28;
  const sinceIso = new Date(now - macroDays * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('news_analyses')
    .select('news_id, title, published_at, analyzed_at, signal, would_trade, time_horizon, score, risk_mode, trading_pairs, ai_analysis')
    .gte('published_at', sinceIso)
    .order('published_at', { ascending: false })
    .limit(600);

  if (error) {
    console.error('[PositionMemory] supabase error:', error);
    return null;
  }

  // Only include rows we intentionally stored as "position history"
  const rows = (data || [])
    .filter((r: any) => r?.ai_analysis?.meta?.include_in_position_history === true)
    .map((r: any) => {
      const rowAssets: string[] = [];
      const metaFmp = r.ai_analysis?.meta?.fmp_assets;
      if (Array.isArray(metaFmp)) rowAssets.push(...metaFmp.filter(Boolean));
      const stage1Aff = r.ai_analysis?.stage1?.affected_assets;
      if (Array.isArray(stage1Aff)) rowAssets.push(...stage1Aff.filter(Boolean));

      const assetKeys = rowAssets.map(normalizeAssetKey).filter(Boolean);
      return { ...r, _assetKeys: assetKeys };
    });

  const assetsOut = affectedAssets.map((asset) => {
    const k = normalizeAssetKey(asset);
    const matched = rows.filter((r: any) => r._assetKeys.includes(k));

    const last = matched.find((r: any) => r.signal && String(r.signal).toUpperCase() !== 'NO_TRADE');
    const trend = matched
      .filter((r: any) => r.signal)
      .slice(0, 5)
      .map((r: any) => mapSignalToDirection(r.signal));

    return {
      asset,
      lastSignal: last
        ? {
            direction: mapSignalToDirection(last.signal),
            publishedAt: last.published_at,
            minutesAgo: Math.round((now - new Date(last.published_at).getTime()) / 60000),
          }
        : undefined,
      trendLast5: trend.length > 0 ? trend : undefined,
      recentAnalyses: buildRecentAnalysesForAsset(matched),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    window: { shortHours: 6, swingHours: 72, macroDays },
    assets: assetsOut.filter((a) => a.lastSignal || (a.recentAnalyses && a.recentAnalyses.length > 0)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO ANALYSIS (when OpenAI not configured)
// ═══════════════════════════════════════════════════════════════════════════════

function getDemoPreEventAnalysis(eventData: EventInput): any {
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
    scenarioPlaybook: {
      bigBeat: {
        label: 'Big beat playbook',
        primaryTrade: { trigger: `If ${eventData.name} beats`, direction: 'long', asset: 'SPX', entry: 'Current', stopLoss: '-1%', takeProfit: '+1.5%', riskRewardRatio: '1.5:1', timeHorizon: '1-2 days', invalidation: 'Break below support' },
        alternativeTrades: [{ asset: 'DXY', direction: 'long', rationale: 'USD strength' }],
        notes: 'Demo'
      },
      smallBeat: { label: 'Small beat', primaryTrade: { trigger: 'Modest beat', direction: 'long', asset: 'SPX', entry: 'On pullback', stopLoss: '-0.8%', takeProfit: '+1.2%', riskRewardRatio: '1.5:1', timeHorizon: 'intraday', invalidation: 'Fade' }, alternativeTrades: [], notes: 'Demo' },
      inline: { label: 'Inline', action: 'no_trade', reason: 'No edge', watchNext: 'Wait for components' },
      smallMiss: { label: 'Small miss', primaryTrade: { trigger: 'Modest miss', direction: 'short', asset: 'SPX', entry: 'Breakdown', stopLoss: '+0.8%', takeProfit: '-1.3%', riskRewardRatio: '1.6:1', timeHorizon: 'intraday', invalidation: 'Reclaim' }, alternativeTrades: [], notes: 'Demo' },
      bigMiss: { label: 'Big miss', primaryTrade: { trigger: 'Large miss', direction: 'short', asset: 'SPX', entry: 'Fade bounces', stopLoss: '+1.2%', takeProfit: '-2.2%', riskRewardRatio: '1.8:1', timeHorizon: '1-2 days', invalidation: 'Dovish repricing' }, alternativeTrades: [{ asset: 'TLT', direction: 'long', rationale: 'Flight to safety' }], notes: 'Demo' }
    },
    positioningAnalysis: { currentPositioning: 'Neutral', crowdedSide: 'neutral', painTrade: 'Unexpected print' },
    preEventStrategy: { recommendedApproach: 'wait_and_react', reasoning: 'Demo: add OPENAI_API_KEY for real strategy.', conviction: 5, timeHorizon: '1-2 days' },
    tradeSetup: {
      hasTrade: true,
      bullish: { trigger: `If ${eventData.name} beats`, direction: 'long', asset: 'SPX', entry: 'Current', stopLoss: '-1%', takeProfit: '+1.5%', riskRewardRatio: '1.5:1', timeHorizon: '1-2 days', invalidation: 'Break below support' },
      bearish: { trigger: `If ${eventData.name} misses`, direction: 'short', asset: 'SPX', entry: 'On breakdown', stopLoss: '+1%', takeProfit: '-1.5%', riskRewardRatio: '1.5:1', timeHorizon: '1-2 days', invalidation: 'Reclaim' },
      inline: { action: 'no_trade', reason: 'No edge when data in line' },
      alternativeAssets: {
        ifBeat: [{ asset: 'DXY', direction: 'long', rationale: 'USD strength' }],
        ifMiss: [{ asset: 'XAUUSD', direction: 'long', rationale: 'Safe-haven bid' }]
      }
    },
    tradingview_assets: ['SP:SPX', 'TVC:DXY', 'COMEX:GC1!'],
    keyRisks: ['Demo mode — connect OpenAI for real risk assessment'],
    summary: `Demo pre-event view for ${eventData.name}. Add OPENAI_API_KEY to enable full AI Event Analysis Engine.`,
    pipeline: { mode: 'demo', generatedAt: new Date().toISOString() }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Save analysis to database
// ═══════════════════════════════════════════════════════════════════════════════

function determineEventType(eventName: string): string {
  const name = eventName.toLowerCase();
  if (name.includes('nfp') || name.includes('payroll') || name.includes('unemployment') || name.includes('jobless') || name.includes('employment')) return 'employment';
  if (name.includes('cpi') || name.includes('ppi') || name.includes('pce') || name.includes('inflation')) return 'inflation';
  if (name.includes('fomc') || name.includes('fed') || name.includes('rate decision') || name.includes('ecb') || name.includes('boj') || name.includes('boe')) return 'central_bank';
  if (name.includes('gdp') || name.includes('pmi') || name.includes('retail') || name.includes('sales')) return 'growth';
  if (name.includes('housing') || name.includes('building') || name.includes('home')) return 'housing';
  if (name.includes('confidence') || name.includes('sentiment')) return 'sentiment';
  if (name.includes('earnings') || name.includes('eps')) return 'earnings';
  return 'other';
}

async function savePreEventAnalysis(eventData: EventInput, result: EventAnalysisResult): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const eventType = determineEventType(eventData.name);
  const analysis = result.stage3;
  
  let eventDateTime: string;
  if (eventData.time && eventData.time.includes('T')) {
    eventDateTime = eventData.time;
  } else if (eventData.time && eventData.time.match(/^\d{2}:\d{2}/)) {
    eventDateTime = `${eventData.date}T${eventData.time}:00`;
  } else {
    eventDateTime = `${eventData.date}T12:00:00`;
  }
  
  const parseNumeric = (val: any): number | null => {
    if (val === null || val === undefined || val === 'N/A' || val === '') return null;
    const cleaned = String(val).replace(/[$%,K]/gi, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };
  
  // Determine event category from type
  const eventCategory = (() => {
    const type = eventData.type?.toLowerCase() || '';
    if (type.includes('earn') || type === 'earnings') return 'earnings';
    if (type.includes('ipo')) return 'ipo';
    if (type.includes('crypto')) return 'crypto';
    return 'macro';
  })();
  
  const record: Record<string, any> = {
    // Core event info
    event_name: eventData.name,
    event_type: eventType,
    event_date: eventDateTime,
    event_category: eventCategory,
    country: eventData.country,
    currency: eventData.currency,
    importance: eventData.importance,
    
    // Forecast data (macro)
    forecast: parseNumeric(eventData.forecast),
    previous: parseNumeric(eventData.previous),
    forecast_low: parseNumeric(eventData.forecastLow),
    forecast_median: parseNumeric(eventData.forecastMedian),
    forecast_high: parseNumeric(eventData.forecastHigh),
    whisper_number: parseNumeric(analysis.expectationsAnalysis?.whisperNumber),
    
    // Event classification
    tier: analysis.eventClassification?.tier || 2,
    expected_volatility: analysis.eventClassification?.expectedVolatility || 'moderate',
    primary_affected_assets: analysis.eventClassification?.primaryAffectedAssets || [],
    secondary_affected_assets: analysis.eventClassification?.secondaryAffectedAssets || [],
    
    // Historical analysis
    historical_beat_rate: parseNumeric(analysis.historicalAnalysis?.beatRate) || 50,
    historical_avg_surprise: parseNumeric(analysis.historicalAnalysis?.averageSurprise) || 0,
    typical_reaction: analysis.historicalAnalysis?.typicalReaction || 'Unknown',
    reaction_duration: analysis.historicalAnalysis?.reactionDuration || 'Short-term',
    fade_pattern: analysis.historicalAnalysis?.fadePattern || false,
    historical_insight: analysis.historicalAnalysis?.keyInsight || '',
    
    // Expectations analysis
    forecast_assessment: analysis.expectationsAnalysis?.forecastAssessment || 'realistic',
    what_would_surprise: analysis.expectationsAnalysis?.whatWouldSurprise || '',
    priced_in_level: analysis.expectationsAnalysis?.pricedInLevel || '',
    
    // Scenarios (legacy format)
    scenarios: analysis.scenarios || {},
    
    // NEW: Scenario playbook (detailed trade setups per scenario)
    scenario_playbook: analysis.scenarioPlaybook || null,
    
    // Positioning
    current_positioning: analysis.positioningAnalysis?.currentPositioning,
    crowded_side: analysis.positioningAnalysis?.crowdedSide,
    pain_trade: analysis.positioningAnalysis?.painTrade,
    
    // Strategy
    recommended_approach: analysis.preEventStrategy?.recommendedApproach,
    strategy_reasoning: analysis.preEventStrategy?.reasoning,
    conviction: parseNumeric(analysis.preEventStrategy?.conviction) || 5,
    time_horizon: analysis.preEventStrategy?.timeHorizon,
    
    // Trade setup
    has_trade: analysis.tradeSetup?.hasTrade || false,
    trade_direction: analysis.tradeSetup?.bullish?.direction || analysis.tradeSetup?.bearish?.direction,
    trade_asset: analysis.tradeSetup?.bullish?.asset || analysis.tradeSetup?.bearish?.asset,
    entry_condition: analysis.tradeSetup?.bullish?.trigger || analysis.tradeSetup?.bearish?.trigger,
    stop_loss: analysis.tradeSetup?.bullish?.stopLoss || analysis.tradeSetup?.bearish?.stopLoss,
    take_profit: analysis.tradeSetup?.bullish?.takeProfit || analysis.tradeSetup?.bearish?.takeProfit,
    
    // Risks and summary
    key_risks: analysis.keyRisks || [],
    summary: analysis.summary,
    
    // NEW: TradingView assets for charts
    tradingview_assets: analysis.tradingview_assets || [],
    
    // Raw analysis for debugging
    raw_analysis: {
      ...analysis,
      stage1: result.stage1,
      collectedData: result.collectedData,
      collected_fmp_data: result.collected_fmp_data,
      pipeline: result.pipeline,
      costs: result.costs,
      timing: result.timing,
    },
    model_used: result.pipeline.models.stage3.model,
    analyzed_at: new Date().toISOString()
  };
  
  // Add earnings-specific fields (use any for flexible access)
  if (eventCategory === 'earnings') {
    const ed = eventData as any;
    const ea = (analysis as any).expectationsAnalysis || {};
    record.symbol = ed.symbol || ea.symbol || null;
    record.company_name = ed.company || eventData.name || null;
    record.eps_estimate = parseNumeric(ed.epsEstimate || ea.epsEstimate);
    record.eps_whisper = parseNumeric(ea.epsWhisper);
    record.revenue_estimate = parseNumeric(ed.revenueEstimate || ea.revenueEstimate);
    record.revenue_whisper = parseNumeric(ea.revenueWhisper);
    record.guidance_expectation = ea.guidanceExpectation || null;
    record.sector_impact = (analysis as any).sectorImpact || null;
  }
  
  // Add IPO-specific fields (use any for flexible access)
  if (eventCategory === 'ipo') {
    const ed = eventData as any;
    const ea = (analysis as any).expectationsAnalysis || {};
    record.symbol = ed.symbol || null;
    record.company_name = ed.company || eventData.name || null;
    record.exchange = ed.exchange || null;
    record.price_range_low = parseNumeric(ed.priceRangeLow);
    record.price_range_high = parseNumeric(ed.priceRangeHigh);
    record.ipo_price = parseNumeric(ed.ipoPrice);
    record.shares_offered = parseNumeric(ed.sharesOffered);
    record.demand_assessment = ea.demandAssessment || null;
  }
  
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

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    // 🔒 SECURITY: Require PREMIUM subscription for AI analysis (expensive operations)
    const { user, error: authError, subscription } = await requirePremium();
    if (authError || !user) {
      // Return 403 for subscription issues, 401 for auth issues
      const status = authError === 'Premium subscription required' ? 403 : getErrorStatus(authError || 'Unauthorized');
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status });
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
    
    // Determine event type from body or infer from name/category
    const eventType = body.type || 'macro';
    
    const eventData: EventInput = {
      name: body.name,
      date: body.date,
      time: body.time || '00:00',
      timezone: body.timezone || 'ET',
      country: body.country,
      currency: body.currency,
      importance: body.importance,
      type: eventType as 'macro' | 'earnings' | 'ipo' | 'crypto',
      
      // Macro events
      forecast: body.forecast ?? null,
      previous: body.previous ?? null,
      forecastLow: body.forecastLow ?? null,
      forecastMedian: body.forecastMedian ?? null,
      forecastHigh: body.forecastHigh ?? null,
      
      // Earnings events
      symbol: body.symbol ?? undefined,
      companyName: body.companyName ?? body.description ?? undefined,
      epsEstimate: body.epsEstimate ?? body.forecast ?? null,
      revenueEstimate: body.revenueEstimate ?? null,
      epsActual: body.epsActual ?? body.actual ?? null,
      revenueActual: body.revenueActual ?? null,
      
      // IPO events
      priceRangeLow: body.priceRangeLow ?? null,
      priceRangeHigh: body.priceRangeHigh ?? null,
      ipoPrice: body.ipoPrice ?? null,
      shares: body.shares ?? null,
      exchange: body.exchange ?? undefined,
    };

    // Idempotency: analysis is generated ONLY ONCE (upcoming phase)
    // If an analysis already exists for this event/day, return it instead of re-analyzing.
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const dateFrom = `${eventData.date}T00:00:00.000Z`;
      const next = new Date(dateFrom);
      next.setUTCDate(next.getUTCDate() + 1);
      const dateTo = next.toISOString();

      const { data: existingRows, error: existingError } = await supabase
        .from('event_pre_analyses')
        .select('id,event_name,event_date,analyzed_at,raw_analysis')
        .ilike('event_name', `%${String(eventData.name).trim()}%`)
        .gte('event_date', dateFrom)
        .lt('event_date', dateTo)
        .order('analyzed_at', { ascending: false })
        .limit(1);

      if (!existingError && existingRows && existingRows.length > 0) {
        const existing = existingRows[0] as any;
        return NextResponse.json({
          success: true,
          analysisId: existing.id ?? null,
          event: existing.event_name ?? eventData.name,
          eventDate: eventData.date,
          analysis: existing.raw_analysis ?? null,
          reused: true,
        });
      }
    } catch {
      // If idempotency lookup fails, proceed to analysis (fail-open).
    }

    // Demo mode when OpenAI not configured
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
    
    // Create supabase client for position memory
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // ========== RUN 3-STAGE ANALYSIS ==========
    // Event analysis READS position memory but does NOT WRITE to it
    const result = await analyzeEvent(eventData, {
      getPositionMemory: async ({ affectedAssets }) => buildPositionMemory(supabase, affectedAssets),
    });
    
    // Save to database
    const analysisId = await savePreEventAnalysis(eventData, result);
    
    return NextResponse.json({
      success: true,
      analysisId,
      event: eventData.name,
      eventDate: eventData.date,
      analysis: {
        ...result.stage3,
        stage1: result.stage1,
        collectedData: result.collectedData,
        collected_fmp_data: result.collected_fmp_data,
        pipeline: result.pipeline,
        costs: result.costs,
        timing: result.timing,
      }
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
