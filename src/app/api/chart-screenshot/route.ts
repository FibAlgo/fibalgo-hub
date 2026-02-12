import { NextRequest, NextResponse } from 'next/server';

const BUCKET_NAME = 'screenshots';
const VALID_KEYS = ['pez', 'prz', 'screener', 'smartTrading', 'oscillator', 'technicalAnalysis'];

/**
 * GET /api/chart-screenshot?key=pez
 * 
 * Supabase Storage'dan ilgili indikatör screenshot URL'sini döner.
 * key parametresi verilmezse "smartTrading" kullanılır.
 * Response: { url: string, updatedAt: string, key: string }
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase config missing' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    let key = searchParams.get('key') || 'smartTrading';

    // Validate key
    if (!VALID_KEYS.includes(key)) {
      key = 'smartTrading';
    }

    const fileName = `chart-${key}.png`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;

    // Verify file exists with HEAD request
    const head = await fetch(publicUrl, { method: 'HEAD' });

    if (!head.ok) {
      // Fallback: try legacy filename
      const legacyUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/tradingview-chart.png`;
      const legacyHead = await fetch(legacyUrl, { method: 'HEAD' });

      if (!legacyHead.ok) {
        return NextResponse.json(
          { error: 'Screenshot not found', url: null, updatedAt: null, key },
          { status: 404 }
        );
      }

      const legacyModified = legacyHead.headers.get('last-modified');
      return NextResponse.json(
        {
          url: `${legacyUrl}?t=${Date.now()}`,
          updatedAt: legacyModified ? new Date(legacyModified).toISOString() : new Date().toISOString(),
          key,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    const lastModified = head.headers.get('last-modified');
    const updatedAt = lastModified
      ? new Date(lastModified).toISOString()
      : new Date().toISOString();

    return NextResponse.json(
      {
        url: `${publicUrl}?t=${Date.now()}`,
        updatedAt,
        key,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('Chart screenshot API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
