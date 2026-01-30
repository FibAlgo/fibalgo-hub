import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getErrorStatus, checkRateLimit, getClientIP } from '@/lib/api/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ═══════════════════════════════════════════════════════════════════
// HISTORICAL DATA SERVICE
// Son 6 ayın event verilerini yönetme
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// Known event mappings for better data fetching
// ───────────────────────────────────────────────────────────────────

const EVENT_MAPPINGS: Record<string, {
  type: string;
  primaryAssets: string[];
  currency: string;
  country: string;
}> = {
  'non-farm payrolls': {
    type: 'employment',
    primaryAssets: ['DXY', 'SPX', 'USDJPY', 'XAUUSD', 'TLT'],
    currency: 'USD',
    country: 'US'
  },
  'nfp': {
    type: 'employment',
    primaryAssets: ['DXY', 'SPX', 'USDJPY', 'XAUUSD', 'TLT'],
    currency: 'USD',
    country: 'US'
  },
  'cpi': {
    type: 'inflation',
    primaryAssets: ['DXY', 'TLT', 'SPX', 'XAUUSD'],
    currency: 'USD',
    country: 'US'
  },
  'core cpi': {
    type: 'inflation',
    primaryAssets: ['DXY', 'TLT', 'SPX'],
    currency: 'USD',
    country: 'US'
  },
  'pce': {
    type: 'inflation',
    primaryAssets: ['DXY', 'TLT', 'SPX'],
    currency: 'USD',
    country: 'US'
  },
  'fomc': {
    type: 'central_bank',
    primaryAssets: ['DXY', 'SPX', 'TLT', 'XAUUSD', 'BTC'],
    currency: 'USD',
    country: 'US'
  },
  'fed': {
    type: 'central_bank',
    primaryAssets: ['DXY', 'SPX', 'TLT'],
    currency: 'USD',
    country: 'US'
  },
  'gdp': {
    type: 'growth',
    primaryAssets: ['DXY', 'SPX'],
    currency: 'USD',
    country: 'US'
  },
  'retail sales': {
    type: 'growth',
    primaryAssets: ['SPX', 'DXY'],
    currency: 'USD',
    country: 'US'
  },
  'pmi': {
    type: 'growth',
    primaryAssets: ['SPX', 'DXY'],
    currency: 'USD',
    country: 'US'
  },
  'ecb': {
    type: 'central_bank',
    primaryAssets: ['EURUSD', 'DAX'],
    currency: 'EUR',
    country: 'EU'
  },
  'boj': {
    type: 'central_bank',
    primaryAssets: ['USDJPY', 'Nikkei'],
    currency: 'JPY',
    country: 'JP'
  },
  'boe': {
    type: 'central_bank',
    primaryAssets: ['GBPUSD', 'FTSE'],
    currency: 'GBP',
    country: 'UK'
  }
};

// ───────────────────────────────────────────────────────────────────
// HELPER: Get event mapping
// ───────────────────────────────────────────────────────────────────

function getEventMapping(eventName: string): typeof EVENT_MAPPINGS[string] | null {
  const name = eventName.toLowerCase();
  
  for (const [key, value] of Object.entries(EVENT_MAPPINGS)) {
    if (name.includes(key)) {
      return value;
    }
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// GET: Get historical data for an event
// ═══════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get('event');
    const eventType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '6');
    
    if (!eventName && !eventType) {
      return NextResponse.json(
        { error: 'Either event name or type is required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Build query
    let query = supabase
      .from('event_historical_data')
      .select('*')
      .order('event_date', { ascending: false })
      .limit(limit);
    
    if (eventName) {
      query = query.ilike('event_name', `%${eventName}%`);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    
    const { data: history, error: historyError } = await query;
    
    if (historyError) {
      throw new Error(`Database error: ${historyError.message}`);
    }
    
    // Get statistics
    let statsQuery = supabase.from('event_statistics').select('*');
    if (eventName) {
      statsQuery = statsQuery.ilike('event_name', `%${eventName}%`);
    }
    
    const { data: stats } = await statsQuery.limit(1).single();
    
    // Calculate additional metrics
    const metrics = calculateMetrics(history || []);
    
    return NextResponse.json({
      success: true,
      eventName: eventName || eventType,
      historyCount: history?.length || 0,
      history: history || [],
      statistics: stats || null,
      calculatedMetrics: metrics
    });
    
  } catch (error) {
    console.error('Get historical data error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve historical data' },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Calculate metrics from historical data
// ───────────────────────────────────────────────────────────────────

function calculateMetrics(history: any[]): any {
  if (!history || history.length === 0) {
    return {
      beatRate: null,
      avgSurprise: null,
      avgVolatility: null,
      fadePattern: null
    };
  }
  
  const beats = history.filter(h => h.surprise_direction === 'beat').length;
  const misses = history.filter(h => h.surprise_direction === 'miss').length;
  const inlines = history.filter(h => h.surprise_direction === 'inline').length;
  
  const surprises = history
    .filter(h => h.surprise_percent !== null)
    .map(h => Math.abs(h.surprise_percent));
  
  const avgSurprise = surprises.length > 0
    ? surprises.reduce((a, b) => a + b, 0) / surprises.length
    : null;
  
  // Analyze fade patterns (did initial moves reverse?)
  // This would require more detailed price data
  const fadePattern = false; // Placeholder
  
  return {
    beatRate: `${Math.round((beats / history.length) * 100)}%`,
    missRate: `${Math.round((misses / history.length) * 100)}%`,
    inlineRate: `${Math.round((inlines / history.length) * 100)}%`,
    avgSurprise: avgSurprise ? `${avgSurprise.toFixed(1)}%` : null,
    totalOccurrences: history.length,
    fadePattern
  };
}

// ═══════════════════════════════════════════════════════════════════
// POST: Add new historical data entry
// ═══════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    // 🔒 SECURITY: Require authentication for data modification
    const { user, error: authError } = await requireAuth();
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    // 🔒 SECURITY: Rate limit AI/compute-heavy endpoint
    const clientIP = getClientIP(request as any);
    const { success: rateLimitOk, reset } = await checkRateLimit(`ai:${user.id}:${clientIP}:historical`, 'ai');
    if (!rateLimitOk) {
      return NextResponse.json({
        error: 'Too many requests. Please wait before trying again.',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['eventName', 'eventDate', 'actual'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get event mapping for defaults
    const mapping = getEventMapping(body.eventName);
    
    // Calculate surprise
    let surprisePercent = null;
    let surpriseDirection = 'unknown';
    
    if (body.forecast && body.actual) {
      surprisePercent = ((body.actual - body.forecast) / Math.abs(body.forecast)) * 100;
      
      if (surprisePercent > 5) {
        surpriseDirection = 'beat';
      } else if (surprisePercent < -5) {
        surpriseDirection = 'miss';
      } else {
        surpriseDirection = 'inline';
      }
    }
    
    const record = {
      event_name: body.eventName,
      event_type: body.eventType || mapping?.type || 'other',
      event_date: body.eventDate,
      country: body.country || mapping?.country || 'US',
      currency: body.currency || mapping?.currency || 'USD',
      forecast: body.forecast,
      actual: body.actual,
      previous: body.previous,
      surprise_percent: surprisePercent,
      surprise_direction: surpriseDirection,
      market_reaction: body.marketReaction || {},
      reaction_duration: body.reactionDuration,
      components: body.components || {}
    };
    
    const { data, error } = await supabase
      .from('event_historical_data')
      .insert(record)
      .select('id')
      .single();
    
    if (error) {
      throw new Error(`Failed to save historical data: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      id: data.id,
      eventName: body.eventName,
      surprise: {
        percent: surprisePercent,
        direction: surpriseDirection
      }
    });
    
  } catch (error) {
    console.error('Add historical data error:', error);
    return NextResponse.json(
      { error: 'Failed to add historical data' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// PUT: Bulk import historical data
// ═══════════════════════════════════════════════════════════════════

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    if (!Array.isArray(body.events)) {
      return NextResponse.json(
        { error: 'events array is required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const records = body.events.map((event: any) => {
      const mapping = getEventMapping(event.eventName || event.event_name);
      
      let surprisePercent = null;
      let surpriseDirection = 'unknown';
      
      const forecast = event.forecast || event.estimate;
      const actual = event.actual;
      
      if (forecast && actual) {
        surprisePercent = ((actual - forecast) / Math.abs(forecast)) * 100;
        
        if (surprisePercent > 5) {
          surpriseDirection = 'beat';
        } else if (surprisePercent < -5) {
          surpriseDirection = 'miss';
        } else {
          surpriseDirection = 'inline';
        }
      }
      
      return {
        event_name: event.eventName || event.event_name,
        event_type: event.eventType || event.event_type || mapping?.type || 'other',
        event_date: event.eventDate || event.event_date || event.date,
        country: event.country || mapping?.country || 'US',
        currency: event.currency || mapping?.currency || 'USD',
        forecast: forecast,
        actual: actual,
        previous: event.previous || event.prev,
        surprise_percent: surprisePercent,
        surprise_direction: surpriseDirection,
        market_reaction: event.marketReaction || event.market_reaction || {},
        reaction_duration: event.reactionDuration || event.reaction_duration,
        components: event.components || {}
      };
    });
    
    const { data, error } = await supabase
      .from('event_historical_data')
      .insert(records)
      .select('id');
    
    if (error) {
      throw new Error(`Failed to bulk import: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      imported: data?.length || 0
    });
    
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk import historical data' },
      { status: 500 }
    );
  }
}
