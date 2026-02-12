import { NextResponse } from 'next/server';

const BUCKET_NAME = 'screenshots';
const FILE_NAME = 'tradingview-chart.png';

/**
 * GET /api/chart-screenshot
 * 
 * Supabase Storage'dan en son TradingView screenshot URL'sini döner.
 * Response: { url: string, updatedAt: string }
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase config missing' },
        { status: 500 }
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${FILE_NAME}`;

    // Verify file exists with HEAD request
    const head = await fetch(publicUrl, { method: 'HEAD' });

    if (!head.ok) {
      return NextResponse.json(
        { error: 'Screenshot not found', url: null, updatedAt: null },
        { status: 404 }
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
