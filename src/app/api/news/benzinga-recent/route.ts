import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/api/auth';
import { fetchBenzingaNews } from '@/lib/data/benzinga-news';

/**
 * Benzinga "Latest / Recent" haberlerini Massive API üzerinden döndürür.
 * https://www.benzinga.com/recent ile aynı kaynak (Benzinga), API ile çekilir.
 *
 * GET /api/news/benzinga-recent
 * Query: hours (son N saat, default 24), limit (max 100, default 30), channels (opsiyonel; boş = tüm kanallar)
 */
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success, reset } = await checkRateLimit(
      `public:${clientIP}:benzinga-recent`,
      'general'
    );
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const hours = Math.min(Math.max(1, parseInt(searchParams.get('hours') || '24', 10)), 168); // 1–168 (1 hafta)
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '30', 10)), 100);
    // channels: boş = tüm kanallar. "Latest" veya "News" deneyebilirsin (Massive'daki kanal adına bağlı).
    const channels = searchParams.get('channels');

    const items = await fetchBenzingaNews({
      lookbackHours: hours,
      pageSize: limit,
      channels: channels || undefined,
    });

    return NextResponse.json({
      source: 'benzinga',
      sourceUrl: 'https://www.benzinga.com/recent',
      fetchedAt: new Date().toISOString(),
      hours,
      channels: channels || null,
      count: items.length,
      items,
    });
  } catch (e) {
    console.error('[api/news/benzinga-recent]', e);
    return NextResponse.json(
      { error: 'Failed to fetch Benzinga recent news' },
      { status: 500 }
    );
  }
}
