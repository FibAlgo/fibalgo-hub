import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP } from '@/lib/api/auth';
import { parseFmpEventDateToParts } from '@/lib/data/fmp-news-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ═══════════════════════════════════════════════════════════════════════════════
// FMP API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

let ipo403Logged = false;
let earnings403Logged = false;
let economic403Logged = false;
let fallbackLogged = false;
let ipoEndpointUnavailable = false;
let earningsEndpointUnavailable = false;
let economicEndpointUnavailable = false;

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  importance: 'high' | 'medium' | 'low';
  category: string;
  country: string;
  previous?: string;
  forecast?: string;
  actual?: string;
  type: 'macro' | 'earnings' | 'ipo' | 'crypto';
}

// Map impact to our format
const mapImpact = (impact: string): 'high' | 'medium' | 'low' => {
  switch (impact?.toLowerCase()) {
    case 'high':
    case '3':
      return 'high';
    case 'medium':
    case '2':
      return 'medium';
    default:
      return 'low';
  }
};

// Map country code to flag emoji
const getCountryFlag = (country: string): string => {
  const flags: Record<string, string> = {
    'US': '🇺🇸',
    'EU': '🇪🇺',
    'GB': '🇬🇧',
    'JP': '🇯🇵',
    'CN': '🇨🇳',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'CA': '🇨🇦',
    'AU': '🇦🇺',
    'CH': '🇨🇭',
  };
  return flags[country] || '🌍';
};

// Get category from event name
const getCategory = (event: string): 'fed' | 'economic' | 'other' => {
  const fedKeywords = ['FOMC', 'Fed', 'Interest Rate', 'Federal Reserve', 'Powell', 'Central Bank', 'ECB', 'BOJ', 'BOE'];
  const isFed = fedKeywords.some(keyword => event.toLowerCase().includes(keyword.toLowerCase()));
  return isFed ? 'fed' : 'economic';
};

// ═══════════════════════════════════════════════════════════════════════════════
// FMP API INTEGRATION — Calendar is sourced only from FMP when FMP_API_KEY is set.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch economic calendar from FMP API
 */
async function fetchEconomicCalendar(from: string, to: string): Promise<CalendarEvent[]> {
  if (!FMP_API_KEY) {
    console.warn('[Calendar] Calendar API key not set — add to .env.local and restart dev server');
    return [];
  }
  if (economicEndpointUnavailable) return [];

  try {
    const response = await fetch(
      `${FMP_BASE_URL}/economic_calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        economicEndpointUnavailable = true;
        if (!economic403Logged) {
          economic403Logged = true;
          console.warn('[Calendar] Economic calendar not accessible (401/403/404). Using fallback.');
        }
        return [];
      }
      console.error('FMP economic calendar error:', response.status);
      return [];
    }

    const data = await response.json();
    const count = Array.isArray(data) ? data.length : 0;
    console.log(`[Calendar] Economic calendar: ${count} events (from=${from} to=${to})`);

    return (data || []).map((event: any, index: number) => {
      const { date, time } = parseFmpEventDateToParts(
        event.date,
        event.date?.split?.(' ')[1] || event.time
      );
      return {
        id: `econ-${index}-${event.date}`,
        title: event.event || event.title || event.name,
        description: `${getCountryFlag(event.country)} ${event.country} Economic Data`,
        date,
        time,
        importance: mapImpact(event.impact),
        category: getCategory(event.event || event.title || ''),
        country: event.country,
        previous: event.previous,
        forecast: event.estimate ?? event.forecast,
        actual: event.actual,
        type: 'macro' as const
      };
    });

  } catch (error) {
    console.error('Error fetching economic calendar:', error);
    return [];
  }
}

/**
 * Fetch earnings calendar from FMP API
 */
async function fetchEarningsCalendar(from: string, to: string): Promise<CalendarEvent[]> {
  if (!FMP_API_KEY) return [];
  if (earningsEndpointUnavailable) return [];

  try {
    const response = await fetch(
      `${FMP_BASE_URL}/earning_calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`,
      // Avoid caching error responses (403/404) in Next/Vercel fetch cache.
      { cache: 'no-store' }
    );

    if (!response.ok) {
      // Many FMP plans do not allow earnings calendar; avoid spamming logs on every request.
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        earningsEndpointUnavailable = true;
        if (!earnings403Logged) {
          earnings403Logged = true;
          console.warn('Earnings calendar not accessible (401/403/404). Disabling earnings events.');
        }
        return [];
      }
      console.error('Earnings calendar error:', response.status);
      return [];
    }

    const data = await response.json();

    return (data || []).map((event: any, index: number) => {
      const { date, time } = parseFmpEventDateToParts(event.date, event.time);
      return {
        id: `earn-${event.symbol || index}-${event.date}`,
        title: `${event.symbol || 'Earnings'} Earnings`,
        description: event.company || event.companyName || undefined,
        date,
        time,
      importance: 'medium',
      category: 'earnings',
      country: 'US',
      previous: event.eps || event.epsActual,
      forecast: event.epsEstimated || event.epsEstimate,
      actual: event.epsActual || null,
      type: 'earnings' as const
      };
    });
  } catch (error) {
    console.error('Error fetching earnings calendar:', error);
    return [];
  }
}

/**
 * Fetch crypto events from FMP API (not available)
 */
async function fetchCryptoEvents(from: string, to: string): Promise<CalendarEvent[]> {
  return [];
}

/**
 * Fetch IPO calendar from FMP API
 */
async function fetchIPOCalendar(from: string, to: string): Promise<CalendarEvent[]> {
  if (!FMP_API_KEY) return [];
  if (ipoEndpointUnavailable) return [];

  try {
    const response = await fetch(
      `${FMP_BASE_URL}/ipo_calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`,
      // Avoid caching error responses (403/404) in Next/Vercel fetch cache.
      { cache: 'no-store' }
    );

    if (!response.ok) {
      // Many FMP plans do not allow IPO calendar; avoid spamming logs on every request.
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        ipoEndpointUnavailable = true;
        if (!ipo403Logged) {
          ipo403Logged = true;
          console.warn('IPO calendar not accessible (401/403/404). Disabling IPO events.');
        }
        return [];
      }
      console.error('FMP IPO calendar error:', response.status);
      return [];
    }

    const data = await response.json();

    return (data || []).map((event: any, index: number) => {
      const { date, time } = parseFmpEventDateToParts(event.date, event.time);
      return {
        id: `ipo-${event.symbol || index}-${event.date}`,
        title: `${event.company || event.companyName || 'IPO'} IPO`,
        description: event.exchange ? `${event.exchange} Listing` : undefined,
        date,
        time,
      importance: 'medium',
      category: 'ipo',
      country: event.country || 'US',
      previous: event.priceRange || event.price,
      forecast: null,
      actual: null,
      type: 'ipo' as const
      };
    });
  } catch (error) {
    console.error('Error fetching IPO calendar:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN API HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success, reset } = await checkRateLimit(`public:${clientIP}:calendar`, 'general');
    if (!success) {
      return NextResponse.json({
        error: 'Too many requests',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    // Default: fetch all events FMP has — 1 year back, 1 year ahead (calendar UI has date picker)
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 1);
    const from = searchParams.get('from') || fromDate.toISOString().split('T')[0];
    const toDate = new Date();
    toDate.setFullYear(toDate.getFullYear() + 1);
    const to = searchParams.get('to') || toDate.toISOString().split('T')[0];
    const type = searchParams.get('type') || 'all'; // economic, earnings, ipo, crypto, all

    const events: CalendarEvent[] = [];

    // Fetch Economic Calendar
    if (type === 'all' || type === 'economic') {
      const economicEvents = await fetchEconomicCalendar(from, to);
      events.push(...economicEvents);
    }

    // Fetch Earnings Calendar
    if (type === 'all' || type === 'earnings') {
      const earningsEvents = await fetchEarningsCalendar(from, to);
      events.push(...earningsEvents);
    }

    // Fetch IPO Calendar
    if (type === 'all' || type === 'ipo') {
      const ipoEvents = await fetchIPOCalendar(from, to);
      events.push(...ipoEvents);
    }

    // Fetch Crypto Events
    if (type === 'all' || type === 'crypto') {
      const cryptoEvents = await fetchCryptoEvents(from, to);
      events.push(...cryptoEvents);
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Fetch AI analyses from database
    let analyses: { daily: any; weekly: any; monthly: any } | null = null;
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: analysesData } = await supabase
        .from('calendar_analyses')
        .select('*')
        .in('period_type', ['daily', 'weekly', 'monthly'])
        .order('analyzed_at', { ascending: false })
        .limit(3);

      if (analysesData && analysesData.length > 0) {
        const mapRow = (row: any) => row ? { ...row, summary: row.executive_summary ?? row.summary ?? row.notes ?? '' } : null;
        analyses = {
          daily: mapRow(analysesData.find(a => a.period_type === 'daily') ?? null),
          weekly: mapRow(analysesData.find(a => a.period_type === 'weekly') ?? null),
          monthly: mapRow(analysesData.find(a => a.period_type === 'monthly') ?? null)
        };
      }
    } catch (e) {
      console.error('Failed to fetch calendar analyses:', e);
    }

    // Demo: show MARKET OUTLOOK when OpenAI not connected (no analyses in DB)
    if (!analyses || (!analyses.daily && !analyses.weekly && !analyses.monthly)) {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      analyses = {
        daily: {
          period_type: 'daily',
          period_start: today,
          period_end: today,
          confidence: 6,
          outlook_score: 6,
          macro_bias: 'neutral',
          volatility_regime: 'stable',
          summary: 'Demo outlook: Event-driven session. Focus on high-impact releases; consider reduced size ahead of key prints. Real AI analysis requires OPENAI_API_KEY.',
          executive_summary: 'Demo outlook: Event-driven session. Focus on high-impact releases; consider reduced size ahead of key prints. Real AI analysis requires OPENAI_API_KEY.',
          _demo: true
        },
        weekly: {
          period_type: 'weekly',
          period_start: weekStart.toISOString().split('T')[0],
          period_end: weekEnd.toISOString().split('T')[0],
          confidence: 5,
          outlook_score: 5,
          macro_bias: 'neutral',
          volatility_regime: 'moderate',
          summary: 'Demo weekly outlook: Mixed data week. Watch central bank tone and inflation prints for direction. Connect OpenAI for full AI Event Analysis Engine.',
          executive_summary: 'Demo weekly outlook: Mixed data week. Watch central bank tone and inflation prints for direction. Connect OpenAI for full AI Event Analysis Engine.',
          _demo: true
        },
        monthly: {
          period_type: 'monthly',
          period_start: monthStart.toISOString().split('T')[0],
          period_end: monthEnd.toISOString().split('T')[0],
          confidence: 5,
          outlook_score: 5,
          macro_bias: 'neutral',
          volatility_regime: 'moderate',
          summary: 'Demo monthly outlook: Macro regime in focus. Fed path and growth data will set the tone. Add OPENAI_API_KEY to enable live AI calendar analysis.',
          executive_summary: 'Demo monthly outlook: Macro regime in focus. Fed path and growth data will set the tone. Add OPENAI_API_KEY to enable live AI calendar analysis.',
          _demo: true
        }
      };
    }

    // Fallback: if no FMP events returned, use daily key events from analysis (e.g. when FMP key missing or API error)
    if (events.length === 0 && analyses?.daily?.key_events?.length) {
      const toMs = Date.parse(`${to}T23:59:59Z`);
      const fromMs = Date.now() - 2 * 24 * 60 * 60 * 1000; // include last 2 days so local/test shows something
      const fallbackEvents: CalendarEvent[] = analyses.daily.key_events.map((event: any, index: number) => {
        const eventDate = event.time ? new Date(event.time) : new Date();
        return {
          id: `analysis-${index}-${event.time || index}`,
          title: event.event || 'Event',
          description: event.country ? `${getCountryFlag(event.country)} ${event.country}` : undefined,
          date: eventDate.toISOString().split('T')[0],
          time: eventDate.toISOString().split('T')[1]?.slice(0, 5),
          importance: mapImpact(event.impact || event.importance || 'low'),
          category: getCategory(event.event || ''),
          country: event.country || 'US',
          previous: event.prev ?? null,
          forecast: event.estimate ?? null,
          actual: event.actual ?? null,
          type: 'macro'
        };
      }).filter((e: CalendarEvent) => {
        const ms = Date.parse(`${e.date}T00:00:00Z`);
        if (!Number.isFinite(ms)) return true;
        return ms >= fromMs && ms <= toMs;
      });

      if (!fallbackLogged) {
        fallbackLogged = true;
        console.log(`[Calendar] No events from calendar API; using ${fallbackEvents.length} key_events from analysis as fallback`);
      }
      events.push(...fallbackEvents);
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Get summary stats (after fallback)
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() + 7);
    
    const summary = {
      total: events.length,
      today: events.filter(e => e.date === today).length,
      thisWeek: events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= new Date() && eventDate <= thisWeek;
      }).length,
      highImpact: events.filter(e => e.importance === 'high').length,
      categories: {
        economic: events.filter(e => e.category === 'economic').length,
        fed: events.filter(e => e.category === 'fed').length,
        earnings: events.filter(e => e.category === 'earnings').length,
        crypto: events.filter(e => e.category === 'crypto').length,
        ipo: events.filter(e => e.category === 'ipo').length
      }
    };

    return NextResponse.json({
      success: true,
      events,
      summary,
      analyses,
      range: { from, to },
      message: events.length === 0 ? '⚠️ No events found. Configure calendar API key in .env.local' : undefined
    });

  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
