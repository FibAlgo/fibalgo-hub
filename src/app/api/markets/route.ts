import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success, reset } = await checkRateLimit(`public:${clientIP}:markets`, 'general');
    if (!success) {
      return NextResponse.json({
        error: 'Too many requests',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    // CoinGecko API - Top 100 coins with all data including logos
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 30 } // Cache for 30 seconds
      }
    );

    if (!response.ok) {
      throw new Error('CoinGecko API error');
    }

    const data = await response.json();

    const formattedData = data.map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      logo: coin.image,
      price: coin.current_price || 0,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume || 0,
      marketCap: coin.market_cap || 0,
      high24h: coin.high_24h || 0,
      low24h: coin.low_24h || 0,
    }));

    return NextResponse.json({ coins: formattedData });
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
