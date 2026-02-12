import { NextRequest, NextResponse } from 'next/server';

const BUCKET_NAME = 'screenshots';
const VALID_KEYS = ['pez', 'prz', 'screener', 'smartTrading', 'oscillator', 'technicalAnalysis'];
const VALID_ASSETS = ['btc', 'gold'];

/**
 * GET /api/chart-screenshot?key=pez&asset=btc
 * 
 * Supabase Storage'dan ilgili indikatör screenshot URL'sini döner.
 * key parametresi verilmezse "smartTrading" kullanılır.
 * asset parametresi verilmezse "btc" kullanılır.
 * 
 * File naming: chart-{key}-{asset}.png (e.g. chart-smartTrading-btc.png)
 * Fallback chain: chart-{key}-{asset}.png → chart-{key}.png → tradingview-chart.png
 * 
 * Response: { url: string, updatedAt: string, key: string, asset: string }
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
    let asset = searchParams.get('asset') || 'btc';

    // Validate
    if (!VALID_KEYS.includes(key)) key = 'smartTrading';
    if (!VALID_ASSETS.includes(asset)) asset = 'btc';

    const cacheHeaders = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    };

    // Try: chart-{key}-{asset}.png
    const assetFileName = `chart-${key}-${asset}.png`;
    const assetUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${assetFileName}`;
    const assetHead = await fetch(assetUrl, { method: 'HEAD' });

    if (assetHead.ok) {
      const lastModified = assetHead.headers.get('last-modified');
      return NextResponse.json(
        {
          url: `${assetUrl}?t=${Date.now()}`,
          updatedAt: lastModified ? new Date(lastModified).toISOString() : new Date().toISOString(),
          key,
          asset,
        },
        { headers: cacheHeaders }
      );
    }

    // Fallback 1: chart-{key}.png (old format without asset)
    const legacyKeyFileName = `chart-${key}.png`;
    const legacyKeyUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${legacyKeyFileName}`;
    const legacyKeyHead = await fetch(legacyKeyUrl, { method: 'HEAD' });

    if (legacyKeyHead.ok) {
      const lastModified = legacyKeyHead.headers.get('last-modified');
      return NextResponse.json(
        {
          url: `${legacyKeyUrl}?t=${Date.now()}`,
          updatedAt: lastModified ? new Date(lastModified).toISOString() : new Date().toISOString(),
          key,
          asset,
        },
        { headers: cacheHeaders }
      );
    }

    // Fallback 2: tradingview-chart.png (original single-file format)
    const originalUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/tradingview-chart.png`;
    const originalHead = await fetch(originalUrl, { method: 'HEAD' });

    if (originalHead.ok) {
      const lastModified = originalHead.headers.get('last-modified');
      return NextResponse.json(
        {
          url: `${originalUrl}?t=${Date.now()}`,
          updatedAt: lastModified ? new Date(lastModified).toISOString() : new Date().toISOString(),
          key,
          asset,
        },
        { headers: cacheHeaders }
      );
    }

    return NextResponse.json(
      { error: 'Screenshot not found', url: null, updatedAt: null, key, asset },
      { status: 404 }
    );
  } catch (err) {
    console.error('Chart screenshot API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
