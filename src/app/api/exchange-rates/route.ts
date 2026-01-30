import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

// Cache exchange rates for 30 minutes
let cachedRates: { usdToTry: number; eurToTry: number; timestamp: number } | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success, reset } = await checkRateLimit(`public:${clientIP}:exchange-rates`, 'general');
    if (!success) {
      return NextResponse.json({
        error: 'Too many requests',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    // Return cached rates if still valid
    if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_DURATION) {
      return NextResponse.json(cachedRates);
    }

    // Fetch fresh rates
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/TRY', {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      // Return default rates if API fails
      return NextResponse.json({
        usdToTry: 35.50,
        eurToTry: 38.20,
        timestamp: Date.now(),
      });
    }

    const data = await response.json();
    
    // API returns rates FROM TRY, we need TO TRY, so we invert
    const usdToTry = 1 / data.rates.USD;
    const eurToTry = 1 / data.rates.EUR;

    cachedRates = {
      usdToTry,
      eurToTry,
      timestamp: Date.now(),
    };

    return NextResponse.json(cachedRates);
  } catch (error) {
    console.error('Exchange rates API error:', error);
    // Return default rates on error
    return NextResponse.json({
      usdToTry: 35.50,
      eurToTry: 38.20,
      timestamp: Date.now(),
    });
  }
}
