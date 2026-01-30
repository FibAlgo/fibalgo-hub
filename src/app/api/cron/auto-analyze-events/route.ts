import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// ═══════════════════════════════════════════════════════════════════
// AUTOMATED EVENT ANALYSIS CRON JOB
// Otomatik Pre-Event ve Post-Event analiz tetikleme
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// HELPER: Get upcoming high-impact events (next 24 hours)
// ───────────────────────────────────────────────────────────────────

async function getUpcomingEvents(): Promise<any[]> {
  try {
    // Fetch from ForexFactory
    const response = await fetch(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    );

    if (!response.ok) return [];

    const events = await response.json();
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Filter to high impact events in next 24 hours
    return events.filter((event: any) => {
      const eventDate = new Date(event.date);
      return (
        eventDate > now &&
        eventDate <= in24Hours &&
        event.impact?.toLowerCase() === 'high'
      );
    });
  } catch (error) {
    console.error('Failed to fetch upcoming events:', error);
    return [];
  }
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Get recently released events (last 30 minutes)
// ───────────────────────────────────────────────────────────────────

async function getRecentlyReleasedEvents(): Promise<any[]> {
  try {
    const response = await fetch(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      { next: { revalidate: 300 } }
    );

    if (!response.ok) return [];

    const events = await response.json();
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Filter to high impact events that just released with actual data
    return events.filter((event: any) => {
      const eventDate = new Date(event.date);
      return (
        eventDate >= thirtyMinutesAgo &&
        eventDate <= now &&
        event.impact?.toLowerCase() === 'high' &&
        event.actual !== undefined &&
        event.actual !== null &&
        event.actual !== ''
      );
    });
  } catch (error) {
    console.error('Failed to fetch recently released events:', error);
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
// HELPER: Check if post-event analysis already exists
// ───────────────────────────────────────────────────────────────────

async function hasPostEventAnalysis(eventName: string, eventDate: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const { data } = await supabase
    .from('event_post_analyses')
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
// ───────────────────────────────────────────────────────────────────

async function triggerPreEventAnalysis(event: any): Promise<{ success: boolean; analysisId?: string; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/api/calendar/pre-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: event.title,
        date: event.date.split('T')[0],
        time: event.date.split('T')[1]?.substring(0, 5) || '00:00',
        timezone: 'ET',
        country: event.country,
        currency: getCurrency(event.country),
        importance: event.impact?.toLowerCase() || 'high',
        forecast: event.forecast ? parseFloat(event.forecast) : null,
        previous: event.previous ? parseFloat(event.previous) : null
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

// ───────────────────────────────────────────────────────────────────
// HELPER: Trigger post-event analysis
// ───────────────────────────────────────────────────────────────────

async function triggerPostEventAnalysis(event: any): Promise<{ success: boolean; analysisId?: string; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/api/calendar/post-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: event.title,
        releaseTime: event.date,
        actual: parseFloat(event.actual),
        forecast: event.forecast ? parseFloat(event.forecast) : null,
        previous: event.previous ? parseFloat(event.previous) : null,
        country: event.country,
        currency: getCurrency(event.country)
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
      postEventAnalyses: [] as any[],
      errors: [] as string[]
    };

    // ─────────────────────────────────────────────────────────────────
    // STEP 1: Process upcoming events for Pre-Event analysis
    // ─────────────────────────────────────────────────────────────────
    
    console.log('Fetching upcoming events for pre-event analysis...');
    const upcomingEvents = await getUpcomingEvents();
    console.log(`Found ${upcomingEvents.length} upcoming high-impact events`);

    for (const event of upcomingEvents) {
      // Check if already analyzed
      const exists = await hasPreEventAnalysis(event.title, event.date);
      if (exists) {
        console.log(`Pre-event analysis already exists for: ${event.title}`);
        continue;
      }

      // Calculate time until event
      const eventTime = new Date(event.date);
      const now = new Date();
      const hoursUntil = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Only analyze if 1-24 hours away
      if (hoursUntil >= 1 && hoursUntil <= 24) {
        console.log(`Triggering pre-event analysis for: ${event.title} (${hoursUntil.toFixed(1)} hours away)`);
        
        const result = await triggerPreEventAnalysis(event);
        
        if (result.success) {
          results.preEventAnalyses.push({
            event: event.title,
            analysisId: result.analysisId,
            hoursUntil: hoursUntil.toFixed(1)
          });
        } else {
          results.errors.push(`Pre-event failed for ${event.title}: ${result.error}`);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 2: Process recently released events for Post-Event analysis
    // ─────────────────────────────────────────────────────────────────
    
    console.log('Fetching recently released events for post-event analysis...');
    const recentEvents = await getRecentlyReleasedEvents();
    console.log(`Found ${recentEvents.length} recently released high-impact events`);

    for (const event of recentEvents) {
      // Check if already analyzed
      const exists = await hasPostEventAnalysis(event.title, event.date);
      if (exists) {
        console.log(`Post-event analysis already exists for: ${event.title}`);
        continue;
      }

      console.log(`Triggering post-event analysis for: ${event.title} (Actual: ${event.actual})`);
      
      const result = await triggerPostEventAnalysis(event);
      
      if (result.success) {
        results.postEventAnalyses.push({
          event: event.title,
          analysisId: result.analysisId,
          actual: event.actual,
          forecast: event.forecast
        });
      } else {
        results.errors.push(`Post-event failed for ${event.title}: ${result.error}`);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 3: Update market context (every run)
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
      recentEventsChecked: recentEvents.length,
      preEventAnalysesCreated: results.preEventAnalyses.length,
      postEventAnalysesCreated: results.postEventAnalyses.length,
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
