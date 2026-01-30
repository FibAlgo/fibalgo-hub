import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 SIGNAL PERFORMANCE TRACKER
// Her sinyalin gerçek performansını takip eder
// Cron: Her 15 dakikada çalışır
// ═══════════════════════════════════════════════════════════════════════════════

interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

// Binance'den fiyat çek (crypto)
async function getBinancePrice(symbol: string): Promise<number | null> {
  try {
    // BINANCE:BTCUSDT -> BTCUSDT
    const ticker = symbol.replace('BINANCE:', '');
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${ticker}`);
    if (!response.ok) return null;
    const data = await response.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

// Yahoo Finance'den fiyat çek (stocks, forex, commodities)
async function getYahooPrice(symbol: string): Promise<number | null> {
  try {
    // Convert TradingView format to Yahoo format
    const yahooSymbol = convertToYahooSymbol(symbol);
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice || null;
  } catch {
    return null;
  }
}

function convertToYahooSymbol(tvSymbol: string): string {
  // NASDAQ:AAPL -> AAPL
  // NYSE:JPM -> JPM
  // FX:EURUSD -> EURUSD=X
  // COMEX:GC1! -> GC=F
  // NYMEX:CL1! -> CL=F
  
  if (tvSymbol.includes(':')) {
    const [exchange, ticker] = tvSymbol.split(':');
    
    if (exchange === 'FX') {
      return `${ticker}=X`;
    }
    if (exchange === 'COMEX' || exchange === 'NYMEX' || exchange === 'CBOT') {
      // Remove the "1!" suffix for futures
      return `${ticker.replace(/\d+!$/, '')}=F`;
    }
    if (exchange === 'TVC') {
      if (ticker === 'DXY') return 'DX-Y.NYB';
      if (ticker === 'VIX') return '^VIX';
      return ticker;
    }
    if (exchange === 'SP') {
      if (ticker === 'SPX') return '^GSPC';
      return ticker;
    }
    if (exchange === 'DJ') {
      if (ticker === 'DJI') return '^DJI';
      return ticker;
    }
    
    return ticker; // NASDAQ:AAPL -> AAPL
  }
  
  return tvSymbol;
}

// Genel fiyat çekme fonksiyonu
async function getCurrentPrice(symbol: string): Promise<number | null> {
  // Crypto ise Binance kullan
  if (symbol.startsWith('BINANCE:')) {
    return getBinancePrice(symbol);
  }
  
  // Diğerleri için Yahoo
  return getYahooPrice(symbol);
}

// Signal performansını hesapla
function calculatePerformance(
  signal: string,
  entryPrice: number,
  currentPrice: number
): { change: number; isWinner: boolean } {
  const change = ((currentPrice - entryPrice) / entryPrice) * 100;
  
  // LONG sinyalleri için pozitif değişim = kazanç
  // SHORT sinyalleri için negatif değişim = kazanç
  const isLong = signal === 'BUY' || signal === 'STRONG_BUY';
  const isWinner = isLong ? change > 0 : change < 0;
  
  return { change, isWinner };
}

export async function GET(request: Request) {
  // 🔒 SECURITY: Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // 1. Son 24 saatteki tüm sinyalleri çek (NO_TRADE hariç)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentSignals, error: fetchError } = await supabase
      .from('news_analyses')
      .select('news_id, signal, trading_pairs, analyzed_at')
      .neq('signal', 'NO_TRADE')
      .gte('analyzed_at', twentyFourHoursAgo)
      .order('analyzed_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching signals:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
    }

    if (!recentSignals || recentSignals.length === 0) {
      return NextResponse.json({ message: 'No recent signals to track' });
    }

    // 2. Mevcut tracking kayıtlarını çek
    const newsIds = recentSignals.map(s => s.news_id);
    const { data: existingTracks } = await supabase
      .from('signal_performance')
      .select('news_id, entry_price, price_1h, price_4h, price_24h, created_at')
      .in('news_id', newsIds);

    const existingMap = new Map(existingTracks?.map(t => [t.news_id, t]) || []);

    // 3. Her sinyal için fiyat güncelle
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const signal of recentSignals) {
      const primaryAsset = signal.trading_pairs?.[0];
      if (!primaryAsset) continue;

      const existing = existingMap.get(signal.news_id);
      const signalAge = Date.now() - new Date(signal.analyzed_at).getTime();
      const ageHours = signalAge / (1000 * 60 * 60);

      try {
        const currentPrice = await getCurrentPrice(primaryAsset);
        if (!currentPrice) continue;

        if (!existing || !existing.entry_price) {
          // Entry price yoksa bu sinyali atla (analyze-news kaydetmiş olmalıydı)
          console.log(`⏭️ Skipping ${signal.news_id} - no entry price`);
          continue;
        } else {
          // Mevcut kaydı güncelle
          const updates: Record<string, any> = { updated_at: new Date().toISOString() };

          // 1h sonrası (45 dakika - 1.5 saat arası)
          if (ageHours >= 0.75 && ageHours < 1.5 && !existing.price_1h) {
            const perf = calculatePerformance(signal.signal, existing.entry_price, currentPrice);
            updates.price_1h = currentPrice;
            updates.change_1h = perf.change;
            updates.is_winner_1h = perf.isWinner;
          }

          // 4h sonrası (3.5 - 5 saat arası)
          if (ageHours >= 3.5 && ageHours < 5 && !existing.price_4h) {
            const perf = calculatePerformance(signal.signal, existing.entry_price, currentPrice);
            updates.price_4h = currentPrice;
            updates.change_4h = perf.change;
            updates.is_winner_4h = perf.isWinner;
          }

          // 24h sonrası (23 - 25 saat arası)
          if (ageHours >= 23 && ageHours < 25 && !existing.price_24h) {
            const perf = calculatePerformance(signal.signal, existing.entry_price, currentPrice);
            updates.price_24h = currentPrice;
            updates.change_24h = perf.change;
            updates.is_winner_24h = perf.isWinner;
          }

          if (Object.keys(updates).length > 1) {
            const { error: updateError } = await supabase
              .from('signal_performance')
              .update(updates)
              .eq('news_id', signal.news_id);

            if (!updateError) updated++;
            else errors++;
          }
        }
      } catch (err) {
        console.error(`Error processing ${signal.news_id}:`, err);
        errors++;
      }

      // Rate limit için kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 4. Genel win rate hesapla
    const { data: winRateData } = await supabase
      .from('signal_performance')
      .select('is_winner_1h, is_winner_4h, is_winner_24h')
      .not('is_winner_24h', 'is', null);

    let winRate24h = 0;
    if (winRateData && winRateData.length > 0) {
      const winners = winRateData.filter(d => d.is_winner_24h).length;
      winRate24h = (winners / winRateData.length) * 100;
    }

    return NextResponse.json({
      success: true,
      processed: recentSignals.length,
      created,
      updated,
      errors,
      stats: {
        totalTracked: winRateData?.length || 0,
        winRate24h: winRate24h.toFixed(1) + '%'
      }
    });

  } catch (error) {
    console.error('Signal tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
