import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM API CONFIGURATION - Add your premium API keys here
// ═══════════════════════════════════════════════════════════════════════════════
const PREMIUM_CALENDAR_API_KEY = process.env.PREMIUM_CALENDAR_API_KEY;
const PREMIUM_CALENDAR_API_URL = process.env.PREMIUM_CALENDAR_API_URL;

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
// PREMIUM API INTEGRATION - Implement your premium API calls here
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch economic calendar from premium API
 * TODO: Implement your premium API integration here
 * 
 * Expected return format:
 * {
 *   title: string,
 *   date: string (YYYY-MM-DD),
 *   time: string (HH:MM),
 *   country: string (US, EU, GB, etc),
 *   importance: 'high' | 'medium' | 'low',
 *   previous: string,
 *   forecast: string,
 *   actual: string (CRITICAL for post-event analysis!)
 * }
 */
async function fetchEconomicCalendar(from: string, to: string): Promise<CalendarEvent[]> {
  // ═══════════════════════════════════════════════════════════════════════════
  // TODO: PREMIUM API INTEGRATION
  // Replace this placeholder with your premium API call
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (!PREMIUM_CALENDAR_API_KEY || !PREMIUM_CALENDAR_API_URL) {
    console.warn('⚠️ Premium Calendar API not configured. Add PREMIUM_CALENDAR_API_KEY and PREMIUM_CALENDAR_API_URL to .env.local');
    return [];
  }

  try {
    const response = await fetch(
      `${PREMIUM_CALENDAR_API_URL}/economic-calendar?from=${from}&to=${to}`,
      {
        headers: {
          'Authorization': `Bearer ${PREMIUM_CALENDAR_API_KEY}`,
          'Content-Type': 'application/json'
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      console.error('Premium API error:', response.status);
      return [];
    }

    const data = await response.json();
    
    // Transform to our format - adjust based on your API's response structure
    return data.events?.map((event: any, index: number) => ({
      id: `econ-${index}-${event.date}`,
      title: event.title || event.name || event.event,
      description: `${getCountryFlag(event.country)} ${event.country} Economic Data`,
      date: event.date?.split('T')[0],
      time: event.time,
      importance: mapImpact(event.impact || event.importance),
      category: getCategory(event.title || event.name || ''),
      country: event.country,
      previous: event.previous,
      forecast: event.forecast || event.consensus,
      actual: event.actual, // CRITICAL: This enables post-event analysis!
      type: 'macro' as const
    })) || [];

  } catch (error) {
    console.error('Error fetching premium economic calendar:', error);
    return [];
  }
}

/**
 * Fetch earnings calendar from premium API
 * TODO: Implement your premium API integration here
 */
async function fetchEarningsCalendar(from: string, to: string): Promise<CalendarEvent[]> {
  // ═══════════════════════════════════════════════════════════════════════════
  // TODO: PREMIUM API INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Placeholder - implement your premium API call here
  return [];
}

/**
 * Fetch crypto events from premium API
 * TODO: Implement your premium API integration here
 */
async function fetchCryptoEvents(from: string, to: string): Promise<CalendarEvent[]> {
  // ═══════════════════════════════════════════════════════════════════════════
  // TODO: PREMIUM API INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Placeholder - implement your premium API call here
  return [];
}

/**
 * Fetch IPO calendar from premium API
 * TODO: Implement your premium API integration here
 */
async function fetchIPOCalendar(from: string, to: string): Promise<CalendarEvent[]> {
  // ═══════════════════════════════════════════════════════════════════════════
  // TODO: PREMIUM API INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Placeholder - implement your premium API call here
  return [];
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
    const from = searchParams.get('from') || new Date().toISOString().split('T')[0];
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + 3); // 3 months ahead
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

    // Get summary stats
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

    // Fetch AI analyses from database
    let analyses = null;
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: analysesData } = await supabase
        .from('calendar_analyses')
        .select('*')
        .in('period_type', ['daily', 'weekly', 'monthly'])
        .order('analyzed_at', { ascending: false })
        .limit(3);
      
      if (analysesData && analysesData.length > 0) {
        analyses = {
          daily: analysesData.find(a => a.period_type === 'daily') || null,
          weekly: analysesData.find(a => a.period_type === 'weekly') || null,
          monthly: analysesData.find(a => a.period_type === 'monthly') || null
        };
      }
    } catch (e) {
      console.error('Failed to fetch calendar analyses:', e);
    }

    return NextResponse.json({
      success: true,
      events,
      summary,
      analyses,
      range: { from, to },
      message: events.length === 0 ? '⚠️ No events found. Configure PREMIUM_CALENDAR_API_KEY and PREMIUM_CALENDAR_API_URL in .env.local' : undefined
    });

  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
