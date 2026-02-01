/**
 * GET /api/calendar/analysis-status?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns which events have pre/post analysis in DB (for list badges / clickability).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function toUtcDatePart(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
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

    const [preRes, postRes] = await Promise.all([
      supabase
        .from('event_pre_analyses')
        .select('event_name,event_date')
        .gte('event_date', fromTs)
        .lt('event_date', toTs)
        .order('event_date', { ascending: false })
        .limit(5000),
      supabase
        .from('event_post_analyses')
        .select('event_name,event_date')
        .gte('event_date', fromTs)
        .lt('event_date', toTs)
        .order('event_date', { ascending: false })
        .limit(5000),
    ]);

    if (preRes.error) {
      console.error('[analysis-status] pre fetch error:', preRes.error);
      return NextResponse.json({ success: false, error: 'Failed to fetch pre analyses' }, { status: 500 });
    }
    if (postRes.error) {
      console.error('[analysis-status] post fetch error:', postRes.error);
      return NextResponse.json({ success: false, error: 'Failed to fetch post analyses' }, { status: 500 });
    }

    const items: Array<{ date: string; name: string; kind: 'pre' | 'post' }> = [];
    for (const row of preRes.data ?? []) {
      const date = toUtcDatePart((row as any).event_date);
      const name = String((row as any).event_name ?? '').trim();
      if (!date || !name) continue;
      items.push({ date, name, kind: 'pre' });
    }
    for (const row of postRes.data ?? []) {
      const date = toUtcDatePart((row as any).event_date);
      const name = String((row as any).event_name ?? '').trim();
      if (!date || !name) continue;
      items.push({ date, name, kind: 'post' });
    }

    return NextResponse.json({ success: true, items });
  } catch (e) {
    console.error('[analysis-status] error:', e);
    return NextResponse.json({ success: false, error: 'Unknown error' }, { status: 500 });
  }
}

