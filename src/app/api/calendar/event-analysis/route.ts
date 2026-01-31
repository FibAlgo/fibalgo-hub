/**
 * GET /api/calendar/event-analysis?name=...&date=...
 * Geçmiş event'e tıklandığında popup için: DB'den pre + post analizini döner.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
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
            country: preAnalysis.country ?? 'US',
            currency: preAnalysis.currency ?? 'USD',
            forecast: preAnalysis.forecast,
            previous: preAnalysis.previous,
            actual: null,
            surprise_direction: null,
            surprise_category: null,
          }
        : null;

    return NextResponse.json({
      success: true,
      event,
      preAnalysis: preAnalysis ? { ...preAnalysis, raw_analysis: (preAnalysis as any).raw_analysis } : null,
      postAnalysis: postAnalysis ? { ...postAnalysis, raw_analysis: (postAnalysis as any).raw_analysis } : null,
    });
  } catch (error) {
    console.error('[event-analysis] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
