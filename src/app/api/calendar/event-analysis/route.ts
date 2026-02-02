/**
 * GET /api/calendar/event-analysis?name=...&date=...
 * Geçmiş event'e tıklandığında popup için: DB'den pre + post analizini döner.
 * FMP'den güncel actual data da çekilir.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';

function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function hasActualValue(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'number') return !Number.isNaN(v);
  const s = String(v).trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (lower === 'n/a' || lower === 'na' || lower === '-' || lower === '—') return false;
  return true;
}

function normalizeFmpResponse(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data;
  return [];
}

// Normalize event name for matching (remove date parts, country prefixes, etc.)
function normalizeEventNameForMatch(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\(jan\)|\(feb\)|\(mar\)|\(apr\)|\(may\)|\(jun\)|\(jul\)|\(aug\)|\(sep\)|\(oct\)|\(nov\)|\(dec\)/gi, '')
    .replace(/\(q[1-4]\)/gi, '')
    .replace(/january|february|march|april|may|june|july|august|september|october|november|december/gi, '')
    .replace(/nbs|caixin|s&p global|hcob|hsbc|jibun bank/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch actual data from FMP API
async function fetchFmpActualData(eventName: string, date: string, country?: string): Promise<{
  actual: number | string | null;
  forecast: number | string | null;
  previous: number | string | null;
} | null> {
  if (!FMP_API_KEY) return null;
  
  try {
    const url = `${FMP_STABLE_BASE}/economic-calendar?from=${date}&to=${date}&apikey=${FMP_API_KEY}`;
    const response = await fetch(url, { cache: 'no-store' });
    const raw = await response.json().catch(() => null);
    const events = normalizeFmpResponse(raw);
    
    // Find matching event with scoring
    const normalizedName = normalizeEventNameForMatch(eventName);
    const normalizedCountry = (country || '').toUpperCase();
    
    let bestMatch: any = null;
    let bestScore = 0;
    
    for (const e of events) {
      if (!hasActualValue(e.actual)) continue;
      
      const fmpName = normalizeEventNameForMatch(e.event || e.title || e.name || '');
      const fmpCountry = (e.country || '').toUpperCase();
      
      let score = 0;
      
      // Country match bonus
      if (normalizedCountry && fmpCountry === normalizedCountry) {
        score += 50;
      }
      
      // Name matching
      if (fmpName === normalizedName) {
        score += 100;
      } else if (fmpName.includes(normalizedName) || normalizedName.includes(fmpName)) {
        score += 70;
      } else {
        const fmpWords = fmpName.split(' ').filter((w: string) => w.length > 2);
        const eventWords = normalizedName.split(' ').filter(w => w.length > 2);
        const commonWords = fmpWords.filter((w: string) => eventWords.includes(w));
        if (commonWords.length >= 2) {
          score += 40 + (commonWords.length * 10);
        } else if (commonWords.length === 1 && commonWords[0].length > 4) {
          score += 30;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = e;
      }
    }
    
    if (bestScore >= 40 && bestMatch) {
      console.log(`[event-analysis] Matched "${eventName}" -> FMP "${bestMatch.event}" score=${bestScore}, actual=${bestMatch.actual}`);
      return {
        actual: bestMatch.actual,
        forecast: bestMatch.estimate ?? bestMatch.forecast ?? null,
        previous: bestMatch.previous ?? null
      };
    }
    
    return null;
  } catch (error) {
    console.error('[event-analysis] FMP fetch error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const date = searchParams.get('date');

    if (!name || !date) {
      return NextResponse.json(
        { success: false, error: 'name and date are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Event date range for that day (UTC)
    const dateFrom = `${date}T00:00:00.000Z`;
    const dateTo = `${nextDay(date)}T00:00:00.000Z`;

    // 1) Post-event analysis (event_name + event_date that day)
    const { data: postRows, error: postError } = await supabase
      .from('event_post_analyses')
      .select('*')
      .ilike('event_name', `%${name.trim()}%`)
      .gte('event_date', dateFrom)
      .lt('event_date', dateTo)
      .order('released_at', { ascending: false })
      .limit(1);

    if (postError) {
      console.error('[event-analysis] post fetch error:', postError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch post-event analysis' },
        { status: 500 }
      );
    }

    const postAnalysis = postRows?.[0] ?? null;
    let preAnalysis: Record<string, unknown> | null = null;

    // 2) Pre-event: linked from post or fetch by event_name + date
    if (postAnalysis?.pre_analysis_id) {
      const { data: preRow } = await supabase
        .from('event_pre_analyses')
        .select('*')
        .eq('id', postAnalysis.pre_analysis_id)
        .single();
      preAnalysis = preRow;
    }

    if (!preAnalysis) {
      const { data: preRows } = await supabase
        .from('event_pre_analyses')
        .select('*')
        .ilike('event_name', `%${name.trim()}%`)
        .gte('event_date', dateFrom)
        .lt('event_date', dateTo)
        .order('event_date', { ascending: false })
        .limit(1);
      preAnalysis = preRows?.[0] ?? null;
    }

    // Fetch fresh actual data from FMP if we don't have it in post-analysis
    let fmpData: { actual: number | string | null; forecast: number | string | null; previous: number | string | null } | null = null;
    const eventCountry = (preAnalysis as any)?.country || (postAnalysis as any)?.country || null;
    if (!postAnalysis?.actual) {
      fmpData = await fetchFmpActualData(name, date, eventCountry);
    }

    // Build event object with actual data from either post-analysis or FMP
    const actualFromFmp = fmpData?.actual ?? null;
    const hasActual = hasActualValue(postAnalysis?.actual) || hasActualValue(actualFromFmp);
    
    const event = postAnalysis
      ? {
          name: postAnalysis.event_name,
          date,
          released_at: postAnalysis.released_at,
          country: postAnalysis.country ?? 'US',
          currency: postAnalysis.currency ?? 'USD',
          actual: postAnalysis.actual,
          forecast: postAnalysis.forecast,
          previous: postAnalysis.previous,
          surprise_direction: postAnalysis.surprise_direction,
          surprise_category: postAnalysis.surprise_category,
        }
      : preAnalysis
        ? {
            name: preAnalysis.event_name,
            date,
            event_date: preAnalysis.event_date,
            country: (preAnalysis as any).country ?? 'US',
            currency: (preAnalysis as any).currency ?? 'USD',
            forecast: fmpData?.forecast ?? (preAnalysis as any).forecast,
            previous: fmpData?.previous ?? (preAnalysis as any).previous,
            actual: actualFromFmp,
            surprise_direction: actualFromFmp ? (
              Number(actualFromFmp) > Number(fmpData?.forecast ?? (preAnalysis as any).forecast ?? 0) ? 'beat' : 
              Number(actualFromFmp) < Number(fmpData?.forecast ?? (preAnalysis as any).forecast ?? 0) ? 'miss' : 'inline'
            ) : null,
            surprise_category: null,
          }
        : null;

    return NextResponse.json({
      success: true,
      event,
      preAnalysis: preAnalysis ? { ...preAnalysis, raw_analysis: (preAnalysis as any).raw_analysis } : null,
      postAnalysis: postAnalysis ? { ...postAnalysis, raw_analysis: (postAnalysis as any).raw_analysis } : null,
      fmpActualData: fmpData, // Include FMP data for debugging/display
    });
  } catch (error) {
    console.error('[event-analysis] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
