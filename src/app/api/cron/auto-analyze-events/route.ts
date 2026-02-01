import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseFmpEventDateMs, parseFmpEventDateToParts } from '@/lib/data/fmp-news-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';

// ═══════════════════════════════════════════════════════════════════
// AUTOMATED EVENT ANALYSIS CRON JOB
// Event saatinden 2 saat önce otomatik pre-event analiz tetikleme
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// HELPER: Normalize FMP response
// ───────────────────────────────────────────────────────────────────

function normalizeFmpCalendarResponse(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data;
  return [];
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Get upcoming high-impact events (next 2 hours)
// 2 saat içinde gerçekleşecek high-impact eventleri getir
// ───────────────────────────────────────────────────────────────────

async function getUpcomingEventsWithin2Hours(): Promise<any[]> {
  if (!FMP_API_KEY) {
    console.warn('[AutoAnalyze] FMP_API_KEY not set');
    return [];
  }
  
  try {
    const now = new Date();
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // Fetch today and tomorrow to cover edge cases
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `${FMP_STABLE_BASE}/economic-calendar?from=${today}&to=${tomorrow}&apikey=${FMP_API_KEY}`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error('[AutoAnalyze] FMP API error:', response.status);
      return [];
    }
    
    const raw = await response.json().catch(() => null);
    const events = normalizeFmpCalendarResponse(raw);
    
    // Filter to high impact events within next 2 hours
    const filtered = events.filter((event: any) => {
      // Only high impact
      const impact = event.impact?.toLowerCase();
      if (impact !== 'high' && impact !== '3') return false;
      
      // Parse event time
      const eventMs = parseFmpEventDateMs(event.date, event.time);
      if (eventMs == null) return false;
      
      const nowMs = now.getTime();
      const in2HoursMs = in2Hours.getTime();
      
      // Event must be in the future but within 2 hours
      // Event zamanı şu andan büyük VE 2 saat içinde olmalı
      return eventMs > nowMs && eventMs <= in2HoursMs;
    });
    
    console.log(`[AutoAnalyze] Found ${filtered.length} high-impact events within 2 hours`);
    return filtered;
    
  } catch (error) {
    console.error('[AutoAnalyze] Failed to fetch upcoming events:', error);
    return [];
  }
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Check if pre-event analysis already exists
// ───────────────────────────────────────────────────────────────────

async function hasPreEventAnalysis(eventName: string, eventDate: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const { data } = await supabase
    .from('event_pre_analyses')
    .select('id')
    .ilike('event_name', `%${eventName}%`)
    .gte('event_date', eventDate.split('T')[0])
    .limit(1);
  
  return (data?.length ?? 0) > 0;
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Determine currency from country code
// ───────────────────────────────────────────────────────────────────

function getCurrency(country: string): string {
  const currencyMap: Record<string, string> = {
    'USD': 'USD',
    'EUR': 'EUR',
    'GBP': 'GBP',
    'JPY': 'JPY',
    'AUD': 'AUD',
    'NZD': 'NZD',
    'CAD': 'CAD',
    'CHF': 'CHF',
    'CNY': 'CNY'
  };
  
  return currencyMap[country] || 'USD';
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Trigger pre-event analysis
// FMP event verisini pre-event API'ye gönder
// ───────────────────────────────────────────────────────────────────

async function triggerPreEventAnalysis(event: any): Promise<{ success: boolean; analysisId?: string; error?: string }> {
  try {
    // Parse FMP date format: "2024-01-15 14:30:00" or "2024-01-15T14:30:00"
    const { date, time } = parseFmpEventDateToParts(event.date, event.time);
    
    const response = await fetch(`${BASE_URL}/api/calendar/pre-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: event.title,
        date: date,
        time: time || '00:00',
        timezone: 'UTC', // FMP times are UTC
        country: event.country,
        currency: event.currency || getCurrency(event.country),
        importance: event.impact?.toLowerCase() || 'high',
        forecast: event.forecast != null ? parseFloat(String(event.forecast)) : null,
        previous: event.previous != null ? parseFloat(String(event.previous)) : null,
        type: 'macro' // Economic calendar = macro events
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    return { success: true, analysisId: result.analysisId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN CRON HANDLER
// ═══════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
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

    const results = {
      preEventAnalyses: [] as any[],
      errors: [] as string[]
    };

    // ─────────────────────────────────────────────────────────────────
    // STEP 1: Process upcoming events for Pre-Event analysis
    // 2 saat içindeki high-impact eventleri analiz et
    // ─────────────────────────────────────────────────────────────────
    
    console.log('[AutoAnalyze] Fetching upcoming events within 2 hours...');
    const upcomingEvents = await getUpcomingEventsWithin2Hours();
    console.log(`[AutoAnalyze] Found ${upcomingEvents.length} upcoming high-impact events within 2 hours`);

    for (const event of upcomingEvents) {
      const eventName = event.event || event.title || event.name;
      const { date: eventDate, time: eventTime } = parseFmpEventDateToParts(event.date, event.time);
      
      // Check if already analyzed
      const exists = await hasPreEventAnalysis(eventName, eventDate);
      if (exists) {
        console.log(`[AutoAnalyze] Pre-event analysis already exists for: ${eventName}`);
        continue;
      }

      // Calculate time until event
      const eventMs = parseFmpEventDateMs(event.date, event.time);
      if (!eventMs) continue;
      
      const now = new Date();
      const hoursUntil = (eventMs - now.getTime()) / (1000 * 60 * 60);
      const minutesUntil = Math.round(hoursUntil * 60);

      // Analyze all events within 2 hours (already filtered by getUpcomingEventsWithin2Hours)
      console.log(`[AutoAnalyze] Triggering pre-event analysis for: ${eventName} (${minutesUntil} minutes away)`);
      
      const result = await triggerPreEventAnalysis({
        title: eventName,
        date: event.date,
        country: event.country,
        impact: event.impact,
        forecast: event.estimate ?? event.forecast,
        previous: event.previous,
        // Additional FMP fields
        currency: event.currency,
        actual: event.actual
      });
      
      if (result.success) {
        results.preEventAnalyses.push({
          event: eventName,
          analysisId: result.analysisId,
          minutesUntil,
          hoursUntil: hoursUntil.toFixed(2)
        });
        console.log(`[AutoAnalyze] ✅ Analysis created for: ${eventName}`);
      } else {
        results.errors.push(`Pre-event failed for ${eventName}: ${result.error}`);
        console.error(`[AutoAnalyze] ❌ Analysis failed for: ${eventName}`, result.error);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 2: Update market context (every run)
    // ─────────────────────────────────────────────────────────────────
    
    try {
      await fetch(`${BASE_URL}/api/calendar/market-context?refresh=true`);
      console.log('Market context updated');
    } catch (error) {
      results.errors.push(`Market context update failed: ${error}`);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      upcomingEventsChecked: upcomingEvents.length,
      preEventAnalysesCreated: results.preEventAnalyses.length,
      results
    });

  } catch (error) {
    console.error('Auto-analyze events error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to auto-analyze events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support POST for Vercel Cron
export async function POST(request: Request) {
  return GET(request);
}
