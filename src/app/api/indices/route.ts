import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

// Major world indices with Yahoo Finance symbols
const indices = [
  { symbol: 'SPX', yahooSymbol: '^GSPC', name: 'S&P 500', country: 'US' },
  { symbol: 'DJI', yahooSymbol: '^DJI', name: 'Dow Jones', country: 'US' },
  { symbol: 'IXIC', yahooSymbol: '^IXIC', name: 'NASDAQ Composite', country: 'US' },
  { symbol: 'RUT', yahooSymbol: '^RUT', name: 'Russell 2000', country: 'US' },
  { symbol: 'FTSE', yahooSymbol: '^FTSE', name: 'FTSE 100', country: 'GB' },
  { symbol: 'DAX', yahooSymbol: '^GDAXI', name: 'DAX 40', country: 'DE' },
  { symbol: 'CAC', yahooSymbol: '^FCHI', name: 'CAC 40', country: 'FR' },
  { symbol: 'N225', yahooSymbol: '^N225', name: 'Nikkei 225', country: 'JP' },
  { symbol: 'HSI', yahooSymbol: '^HSI', name: 'Hang Seng', country: 'HK' },
  { symbol: 'SSEC', yahooSymbol: '000001.SS', name: 'Shanghai Composite', country: 'CN' },
  { symbol: 'KOSPI', yahooSymbol: '^KS11', name: 'KOSPI', country: 'KR' },
  { symbol: 'ASX', yahooSymbol: '^AXJO', name: 'ASX 200', country: 'AU' },
  { symbol: 'BVSP', yahooSymbol: '^BVSP', name: 'Bovespa', country: 'BR' },
  { symbol: 'TSX', yahooSymbol: '^GSPTSE', name: 'TSX Composite', country: 'CA' },
  { symbol: 'BIST', yahooSymbol: 'XU100.IS', name: 'BIST 100', country: 'TR' },
];

// Country flags
const countryFlags: Record<string, string> = {
  US: '🇺🇸',
  GB: '🇬🇧',
  DE: '🇩🇪',
  FR: '🇫🇷',
  JP: '🇯🇵',
  HK: '🇭🇰',
  CN: '🇨🇳',
  KR: '🇰🇷',
  AU: '🇦🇺',
  BR: '🇧🇷',
  CA: '🇨🇦',
  TR: '🇹🇷',
};

// Country flag images
const countryFlagImages: Record<string, string> = {
  US: 'https://flagcdn.com/w40/us.png',
  GB: 'https://flagcdn.com/w40/gb.png',
  DE: 'https://flagcdn.com/w40/de.png',
  FR: 'https://flagcdn.com/w40/fr.png',
  JP: 'https://flagcdn.com/w40/jp.png',
  HK: 'https://flagcdn.com/w40/hk.png',
  CN: 'https://flagcdn.com/w40/cn.png',
  KR: 'https://flagcdn.com/w40/kr.png',
  AU: 'https://flagcdn.com/w40/au.png',
  BR: 'https://flagcdn.com/w40/br.png',
  CA: 'https://flagcdn.com/w40/ca.png',
  TR: 'https://flagcdn.com/w40/tr.png',
};

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success, reset } = await checkRateLimit(`public:${clientIP}:indices`, 'general');
    if (!success) {
      return NextResponse.json({
        error: 'Too many requests',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    // Fetch all index prices from Yahoo Finance in parallel
    const indicesData = await Promise.all(
      indices.map(async (index, i) => {
        try {
          const response = await fetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(index.yahooSymbol)}?interval=1d&range=1d`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
              next: { revalidate: 60 }
            }
          );
          
          if (!response.ok) {
            console.error(`Failed to fetch ${index.yahooSymbol}`);
            return null;
          }
          
          const data = await response.json();
          const result = data.chart?.result?.[0];
          const meta = result?.meta;
          
          if (!meta) return null;
          
          const currentPrice = meta.regularMarketPrice || 0;
          const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
          const changePercent = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
          
          return {
            symbol: index.symbol,
            name: index.name,
            country: index.country,
            flag: countryFlags[index.country] || '🏳️',
            flagImage: countryFlagImages[index.country] || '',
            price: currentPrice,
            change24h: changePercent,
            high24h: meta.regularMarketDayHigh || currentPrice * 1.01,
            low24h: meta.regularMarketDayLow || currentPrice * 0.99,
            rank: i + 1,
          };
        } catch (error) {
          console.error(`Error fetching ${index.symbol}:`, error);
          return null;
        }
      })
    );
    
    // Filter out failed requests
    const validData = indicesData.filter(idx => idx !== null);
    
    return NextResponse.json({ indices: validData });
  } catch (error) {
    console.error('Error fetching indices data:', error);
    return NextResponse.json({ error: 'Failed to fetch indices data' }, { status: 500 });
  }
}
