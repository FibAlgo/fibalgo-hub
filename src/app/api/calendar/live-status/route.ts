import { NextRequest, NextResponse } from 'next/server';
import { parseFmpEventDateToParts } from '@/lib/data/fmp-news-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE EVENT STATUS API — Polls FMP for actual data on live events
// ═══════════════════════════════════════════════════════════════════════════════

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';

interface LiveEventStatus {
  eventId: string;
  eventName: string;
  hasActual: boolean;
  actual?: string | number | null;
  forecast?: string | number | null;
  previous?: string | number | null;
  updatedAt: string;
}

function normalizeFmpCalendarResponse(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data;
  return [];
}

/**
 * Check if specific events have actual data released
 * POST body: { events: [{ id, name, date, time, type }] }
 */
export async function POST(request: NextRequest) {
  try {
    if (!FMP_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'FMP_API_KEY not configured' 
      }, { status: 500 });
    }

    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No events provided' 
      }, { status: 400 });
    }

    // Group events by type for efficient API calls
    const macroEvents = events.filter((e: any) => e.type === 'macro' || !e.type);
    const earningsEvents = events.filter((e: any) => e.type === 'earnings');

    const results: LiveEventStatus[] = [];
    const now = new Date().toISOString();

    // Check macro/economic events
    if (macroEvents.length > 0) {
      const dates = [...new Set(macroEvents.map((e: any) => e.date))];
      const from = dates.sort()[0];
      const to = dates.sort().reverse()[0];

      try {
        const url = `${FMP_STABLE_BASE}/economic-calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`;
        const response = await fetch(url, { cache: 'no-store' });
        const raw = await response.json().catch(() => null);
        const fmpEvents = normalizeFmpCalendarResponse(raw);

        for (const event of macroEvents) {
          // Find matching FMP event by name and date
          const matchingFmpEvent = fmpEvents.find((fmp: any) => {
            const fmpName = fmp.event || fmp.title || fmp.name || '';
            const { date: fmpDate } = parseFmpEventDateToParts(fmp.date, fmp.time);
            
            // Match by name similarity and date
            const nameMatches = fmpName.toLowerCase().includes(event.name?.toLowerCase()?.substring(0, 15) || '') ||
                               event.name?.toLowerCase()?.includes(fmpName.toLowerCase().substring(0, 15) || '');
            const dateMatches = fmpDate === event.date;
            
            return nameMatches && dateMatches;
          });

          if (matchingFmpEvent) {
            const hasActual = matchingFmpEvent.actual !== null && 
                             matchingFmpEvent.actual !== undefined && 
                             matchingFmpEvent.actual !== '';
            
            results.push({
              eventId: event.id,
              eventName: event.name,
              hasActual,
              actual: hasActual ? matchingFmpEvent.actual : null,
              forecast: matchingFmpEvent.estimate ?? matchingFmpEvent.forecast,
              previous: matchingFmpEvent.previous,
              updatedAt: now
            });
          } else {
            // Event not found in FMP response - still waiting
            results.push({
              eventId: event.id,
              eventName: event.name,
              hasActual: false,
              actual: null,
              forecast: event.forecast,
              previous: event.previous,
              updatedAt: now
            });
          }
        }
      } catch (error) {
        console.error('[LiveStatus] Error checking macro events:', error);
        // Return events as not having actual data on error
        for (const event of macroEvents) {
          results.push({
            eventId: event.id,
            eventName: event.name,
            hasActual: false,
            actual: null,
            updatedAt: now
          });
        }
      }
    }

    // Check earnings events
    if (earningsEvents.length > 0) {
      const dates = [...new Set(earningsEvents.map((e: any) => e.date))];
      const from = dates.sort()[0];
      const to = dates.sort().reverse()[0];

      try {
        const url = `${FMP_STABLE_BASE}/earnings-calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`;
        const response = await fetch(url, { cache: 'no-store' });
        const raw = await response.json().catch(() => null);
        const fmpEvents = normalizeFmpCalendarResponse(raw);

        for (const event of earningsEvents) {
          // Find matching earnings event by symbol
          const symbol = event.symbol || event.name?.split(' ')[0];
          const matchingFmpEvent = fmpEvents.find((fmp: any) => {
            return fmp.symbol === symbol && fmp.date === event.date;
          });

          if (matchingFmpEvent) {
            const hasActual = matchingFmpEvent.epsActual !== null && 
                             matchingFmpEvent.epsActual !== undefined;
            
            results.push({
              eventId: event.id,
              eventName: event.name,
              hasActual,
              actual: hasActual ? matchingFmpEvent.epsActual : null,
              forecast: matchingFmpEvent.epsEstimated || matchingFmpEvent.epsEstimate,
              previous: matchingFmpEvent.eps,
              updatedAt: now
            });
          } else {
            results.push({
              eventId: event.id,
              eventName: event.name,
              hasActual: false,
              actual: null,
              updatedAt: now
            });
          }
        }
      } catch (error) {
        console.error('[LiveStatus] Error checking earnings events:', error);
        for (const event of earningsEvents) {
          results.push({
            eventId: event.id,
            eventName: event.name,
            hasActual: false,
            actual: null,
            updatedAt: now
          });
        }
      }
    }

    console.log(`[LiveStatus] Checked ${events.length} events, ${results.filter(r => r.hasActual).length} have actual data`);

    return NextResponse.json({
      success: true,
      results,
      checkedAt: now
    });

  } catch (error) {
    console.error('[LiveStatus] API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check live status' },
      { status: 500 }
    );
  }
}
