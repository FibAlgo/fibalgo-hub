import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase config missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(FILE_NAME);

    // Check if file actually exists by listing
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { search: FILE_NAME, limit: 1 });

    if (error || !files || files.length === 0) {
      return NextResponse.json(
        { error: 'Screenshot not found', url: null, updatedAt: null },
        { status: 404 }
      );
    }

    const file = files[0];
    const updatedAt = file.updated_at || file.created_at || new Date().toISOString();

    return NextResponse.json(
      {
        url: `${urlData.publicUrl}?t=${new Date(updatedAt).getTime()}`, // cache-bust
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
