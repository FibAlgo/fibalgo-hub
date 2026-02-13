import { NextResponse } from 'next/server';

/**
 * Binance public API proxy — fetches OHLCV kline data.
 * Avoids CORS issues by proxying through our own server.
 *
 * Query params:
 *  symbol   — e.g. "BTCUSDT" (default)
 *  interval — e.g. "1h", "4h", "1d" (default "1h")
 *  limit    — number of bars, max 1000 (default 300)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';
  const interval = searchParams.get('interval') || '1h';
  const limit = Math.min(Number(searchParams.get('limit') || '300'), 1000);

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 60 } }); // cache 60s

    if (!res.ok) {
      return NextResponse.json(
        { error: `Binance API error: ${res.status}` },
        { status: res.status }
      );
    }

    const raw: unknown[][] = await res.json();

    // Binance kline format:
    // [openTime, open, high, low, close, volume, closeTime, ...]
    const bars = raw.map((k) => ({
      time: Math.floor(Number(k[0]) / 1000), // ms → seconds
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[5] as string),
    }));

    return NextResponse.json(bars, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('Binance kline fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Binance data' },
      { status: 500 }
    );
  }
}
