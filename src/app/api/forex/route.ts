import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

// Major forex pairs with Yahoo Finance symbols
const forexPairs = [
  { symbol: 'EUR/USD', yahooSymbol: 'EURUSD=X', base: 'EUR', quote: 'USD', name: 'Euro / US Dollar' },
  { symbol: 'GBP/USD', yahooSymbol: 'GBPUSD=X', base: 'GBP', quote: 'USD', name: 'British Pound / US Dollar' },
  { symbol: 'USD/JPY', yahooSymbol: 'USDJPY=X', base: 'USD', quote: 'JPY', name: 'US Dollar / Japanese Yen' },
  { symbol: 'USD/CHF', yahooSymbol: 'USDCHF=X', base: 'USD', quote: 'CHF', name: 'US Dollar / Swiss Franc' },
  { symbol: 'AUD/USD', yahooSymbol: 'AUDUSD=X', base: 'AUD', quote: 'USD', name: 'Australian Dollar / US Dollar' },
  { symbol: 'USD/CAD', yahooSymbol: 'USDCAD=X', base: 'USD', quote: 'CAD', name: 'US Dollar / Canadian Dollar' },
  { symbol: 'NZD/USD', yahooSymbol: 'NZDUSD=X', base: 'NZD', quote: 'USD', name: 'New Zealand Dollar / US Dollar' },
  { symbol: 'EUR/GBP', yahooSymbol: 'EURGBP=X', base: 'EUR', quote: 'GBP', name: 'Euro / British Pound' },
  { symbol: 'EUR/JPY', yahooSymbol: 'EURJPY=X', base: 'EUR', quote: 'JPY', name: 'Euro / Japanese Yen' },
  { symbol: 'GBP/JPY', yahooSymbol: 'GBPJPY=X', base: 'GBP', quote: 'JPY', name: 'British Pound / Japanese Yen' },
  { symbol: 'EUR/CHF', yahooSymbol: 'EURCHF=X', base: 'EUR', quote: 'CHF', name: 'Euro / Swiss Franc' },
  { symbol: 'AUD/JPY', yahooSymbol: 'AUDJPY=X', base: 'AUD', quote: 'JPY', name: 'Australian Dollar / Japanese Yen' },
  { symbol: 'USD/TRY', yahooSymbol: 'USDTRY=X', base: 'USD', quote: 'TRY', name: 'US Dollar / Turkish Lira' },
  { symbol: 'EUR/TRY', yahooSymbol: 'EURTRY=X', base: 'EUR', quote: 'TRY', name: 'Euro / Turkish Lira' },
  { symbol: 'USD/MXN', yahooSymbol: 'USDMXN=X', base: 'USD', quote: 'MXN', name: 'US Dollar / Mexican Peso' },
  { symbol: 'USD/ZAR', yahooSymbol: 'USDZAR=X', base: 'USD', quote: 'ZAR', name: 'US Dollar / South African Rand' },
  { symbol: 'USD/SGD', yahooSymbol: 'USDSGD=X', base: 'USD', quote: 'SGD', name: 'US Dollar / Singapore Dollar' },
  { symbol: 'USD/HKD', yahooSymbol: 'USDHKD=X', base: 'USD', quote: 'HKD', name: 'US Dollar / Hong Kong Dollar' },
  { symbol: 'USD/CNY', yahooSymbol: 'USDCNY=X', base: 'USD', quote: 'CNY', name: 'US Dollar / Chinese Yuan' },
  { symbol: 'USD/INR', yahooSymbol: 'USDINR=X', base: 'USD', quote: 'INR', name: 'US Dollar / Indian Rupee' },
];

// Currency flag emojis
const currencyFlags: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  CHF: '🇨🇭',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  NZD: '🇳🇿',
  TRY: '🇹🇷',
  MXN: '🇲🇽',
  ZAR: '🇿🇦',
  SGD: '🇸🇬',
  HKD: '🇭🇰',
  CNY: '🇨🇳',
  INR: '🇮🇳',
};

// Currency flag images from flagcdn
const currencyFlagImages: Record<string, string> = {
  USD: 'https://flagcdn.com/w40/us.png',
  EUR: 'https://flagcdn.com/w40/eu.png',
  GBP: 'https://flagcdn.com/w40/gb.png',
  JPY: 'https://flagcdn.com/w40/jp.png',
  CHF: 'https://flagcdn.com/w40/ch.png',
  AUD: 'https://flagcdn.com/w40/au.png',
  CAD: 'https://flagcdn.com/w40/ca.png',
  NZD: 'https://flagcdn.com/w40/nz.png',
  TRY: 'https://flagcdn.com/w40/tr.png',
  MXN: 'https://flagcdn.com/w40/mx.png',
  ZAR: 'https://flagcdn.com/w40/za.png',
  SGD: 'https://flagcdn.com/w40/sg.png',
  HKD: 'https://flagcdn.com/w40/hk.png',
  CNY: 'https://flagcdn.com/w40/cn.png',
  INR: 'https://flagcdn.com/w40/in.png',
};

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success, reset } = await checkRateLimit(`public:${clientIP}:forex`, 'general');
    if (!success) {
      return NextResponse.json({
        error: 'Too many requests',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    // Fetch forex prices from Yahoo Finance (25s timeout, retry once on timeout)
    const fetchWithTimeout = async (url: string, timeoutMs = 25000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: controller.signal,
          next: { revalidate: 60 },
        });
        return res;
      } finally {
        clearTimeout(id);
      }
    };

    async function fetchPair(
      pair: (typeof forexPairs)[0],
      index: number
    ): Promise<{ symbol: string; name: string; flag: string; baseLogo: string; quoteLogo: string; price: number; change24h: number; high24h: number; low24h: number; volume24h: number; rank: number } | null> {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${pair.yahooSymbol}?interval=1d&range=1d`;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetchWithTimeout(url);
          if (!response.ok) {
            console.error(`Failed to fetch ${pair.yahooSymbol}`);
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
            symbol: pair.symbol,
            name: pair.name,
            flag: `${currencyFlags[pair.base] || '💱'}${currencyFlags[pair.quote] || ''}`,
            baseLogo: currencyFlagImages[pair.base] || '',
            quoteLogo: currencyFlagImages[pair.quote] || '',
            price: currentPrice,
            change24h: changePercent,
            high24h: meta.regularMarketDayHigh || currentPrice * 1.002,
            low24h: meta.regularMarketDayLow || currentPrice * 0.998,
            volume24h: meta.regularMarketVolume || 0,
            rank: index + 1,
          };
        } catch (error) {
          if (attempt === 2) {
            console.error(`Error fetching ${pair.symbol} (after 2 attempts):`, error);
            return null;
          }
        }
      }
      return null;
    }

    const forexData = await Promise.all(forexPairs.map((pair, index) => fetchPair(pair, index)));
    
    // Filter out failed requests
    const validData = forexData.filter(f => f !== null);
    
    return NextResponse.json({ forex: validData });
  } catch (error) {
    console.error('Error fetching forex data:', error);
    return NextResponse.json({ error: 'Failed to fetch forex data' }, { status: 500 });
  }
}
