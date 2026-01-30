import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const PRICE_TTL_MS = 60 * 1000;
const priceCache = new Map<string, { price: number; ts: number }>();

function convertToYahooSymbol(tvSymbol: string): string {
  if (tvSymbol.includes(':')) {
    const [exchange, ticker] = tvSymbol.split(':');

    if (exchange === 'FX') {
      return `${ticker}=X`;
    }
    if (exchange === 'COMEX' || exchange === 'NYMEX' || exchange === 'CBOT') {
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

    return ticker;
  }

  return tvSymbol;
}

async function fetchYahooPrice(tvSymbol: string): Promise<number | null> {
  try {
    const yahooSymbol = convertToYahooSymbol(tvSymbol);
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice || null;
  } catch {
    return null;
  }
}

async function fetchBinancePrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price');
    if (!response.ok) return prices;
    const data: { symbol: string; price: string }[] = await response.json();
    const priceMap = new Map(data.map(item => [item.symbol, parseFloat(item.price)]));
    for (const symbol of symbols) {
      const price = priceMap.get(symbol);
      if (price !== undefined) {
        prices[symbol] = price;
      }
    }
  } catch {
    return prices;
  }

  return prices;
}

async function fetchCurrentPrices(tvSymbols: string[]): Promise<Record<string, number>> {
  const now = Date.now();
  const result: Record<string, number> = {};
  const yahooSymbols: string[] = [];
  const binanceSymbols: string[] = [];

  for (const tvSymbol of tvSymbols) {
    const cached = priceCache.get(tvSymbol);
    if (cached && now - cached.ts < PRICE_TTL_MS) {
      result[tvSymbol] = cached.price;
      continue;
    }

    if (tvSymbol.startsWith('BINANCE:')) {
      binanceSymbols.push(tvSymbol.replace('BINANCE:', ''));
    } else {
      yahooSymbols.push(tvSymbol);
    }
  }

  if (binanceSymbols.length > 0) {
    const binancePrices = await fetchBinancePrices(binanceSymbols);
    for (const [symbol, price] of Object.entries(binancePrices)) {
      const tvSymbol = `BINANCE:${symbol}`;
      result[tvSymbol] = price;
      priceCache.set(tvSymbol, { price, ts: now });
    }
  }

  if (yahooSymbols.length > 0) {
    const yahooPrices = await Promise.all(
      yahooSymbols.map(async (tvSymbol) => ({
        tvSymbol,
        price: await fetchYahooPrice(tvSymbol)
      }))
    );

    for (const { tvSymbol, price } of yahooPrices) {
      if (price !== null) {
        result[tvSymbol] = price;
        priceCache.set(tvSymbol, { price, ts: now });
      }
    }
  }

  return result;
}

export async function GET() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    const { data: allPerformance, error: fetchError } = await supabase
      .from('signal_performance')
      .select('news_id, signal, primary_asset, entry_price, price_1h, price_4h, price_24h, change_1h, change_4h, change_24h, is_winner_1h, is_winner_4h, is_winner_24h, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Get news info from news_analyses table (where AI categorizes the news)
    const newsIds = allPerformance?.map(p => p.news_id) || [];
    const { data: newsData } = await supabase
      .from('news_analyses')
      .select('news_id, title, category')
      .in('news_id', newsIds);
    
    const newsInfo = new Map(newsData?.map(n => [n.news_id, { title: n.title, category: n.category }]) || []);

    if (!allPerformance || allPerformance.length === 0) {
      return NextResponse.json({
        total_signals: 0,
        signals_with_1h: 0,
        signals_with_4h: 0,
        signals_with_24h: 0,
        winners_1h: 0,
        winners_4h: 0,
        winners_24h: 0,
        win_rate_1h: 0,
        win_rate_4h: 0,
        win_rate_24h: 0,
        avg_change_1h: 0,
        avg_change_4h: 0,
        avg_change_24h: 0,
        by_signal_type: [],
        recent_signals: [],
        current_streak: 0,
        max_streak: 0,
        last_updated: new Date().toISOString()
      });
    }

    const with1h = allPerformance.filter(p => p.is_winner_1h !== null);
    const with4h = allPerformance.filter(p => p.is_winner_4h !== null);
    const with24h = allPerformance.filter(p => p.is_winner_24h !== null);

    const winners1h = with1h.filter(p => p.is_winner_1h).length;
    const winners4h = with4h.filter(p => p.is_winner_4h).length;
    const winners24h = with24h.filter(p => p.is_winner_24h).length;

    const winRate1h = with1h.length > 0 ? (winners1h / with1h.length) * 100 : 0;
    const winRate4h = with4h.length > 0 ? (winners4h / with4h.length) * 100 : 0;
    const winRate24h = with24h.length > 0 ? (winners24h / with24h.length) * 100 : 0;

    const avgChange1h = with1h.length > 0 ? with1h.reduce((sum, p) => sum + (p.change_1h || 0), 0) / with1h.length : 0;
    const avgChange4h = with4h.length > 0 ? with4h.reduce((sum, p) => sum + (p.change_4h || 0), 0) / with4h.length : 0;
    const avgChange24h = with24h.length > 0 ? with24h.reduce((sum, p) => sum + (p.change_24h || 0), 0) / with24h.length : 0;

    const signalGroups = new Map<string, { count: number; winners_1h: number; winners_4h: number; winners_24h: number }>();
    
    for (const p of allPerformance) {
      const group = signalGroups.get(p.signal) || { count: 0, winners_1h: 0, winners_4h: 0, winners_24h: 0 };
      group.count++;
      if (p.is_winner_1h === true) group.winners_1h++;
      if (p.is_winner_4h === true) group.winners_4h++;
      if (p.is_winner_24h === true) group.winners_24h++;
      signalGroups.set(p.signal, group);
    }

    const bySignalType = Array.from(signalGroups.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      winners_1h: data.winners_1h,
      winners_4h: data.winners_4h,
      winners_24h: data.winners_24h
    }));

    // Fetch current prices for all signals (no limit)
    const currentPrices = await fetchCurrentPrices(
      allPerformance.map(p => p.primary_asset).filter(Boolean)
    );

    const recentSignals = allPerformance.map(p => {
      const info = newsInfo.get(p.news_id);
      const currentPrice = currentPrices[p.primary_asset];
      const entryPrice = p.entry_price || 0;
      const rawChange = entryPrice > 0 && currentPrice
        ? ((currentPrice - entryPrice) / entryPrice) * 100
        : null;
      const isBuy = p.signal === 'BUY' || p.signal === 'LONG' || p.signal === 'STRONG_BUY';
      const pnlChange = rawChange === null ? null : (isBuy ? rawChange : -rawChange);

      return {
        id: p.news_id,
        title: info?.title || 'Unknown',
        category: info?.category || 'general',
        signal: p.signal,
        primary_asset: p.primary_asset,
        entry_price: p.entry_price,
        current_price: currentPrice || null,
        current_change: rawChange,
        current_pnl: pnlChange,
        price_1h: p.price_1h,
        price_4h: p.price_4h,
        price_24h: p.price_24h,
        change_1h: p.change_1h,
        change_4h: p.change_4h,
        change_24h: p.change_24h,
        is_winner_1h: p.is_winner_1h,
        is_winner_4h: p.is_winner_4h,
        is_winner_24h: p.is_winner_24h,
        created_at: p.created_at
      };
    });

    const sortedResults = with24h.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    let currentStreak = 0;
    let maxStreak = 0;
    
    if (sortedResults.length > 0) {
      const firstIsWinner = sortedResults[0].is_winner_24h;
      currentStreak = firstIsWinner ? 1 : 0;
      
      for (let i = 1; i < sortedResults.length; i++) {
        if (sortedResults[i].is_winner_24h === firstIsWinner && firstIsWinner) {
          currentStreak++;
        } else {
          break;
        }
      }

      let tempStreak = 0;
      for (const p of sortedResults) {
        if (p.is_winner_24h) {
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }
    }

    const stats = {
      total_signals: allPerformance.length,
      signals_with_1h: with1h.length,
      signals_with_4h: with4h.length,
      signals_with_24h: with24h.length,
      winners_1h: winners1h,
      winners_4h: winners4h,
      winners_24h: winners24h,
      win_rate_1h: Math.round(winRate1h * 10) / 10,
      win_rate_4h: Math.round(winRate4h * 10) / 10,
      win_rate_24h: Math.round(winRate24h * 10) / 10,
      avg_change_1h: Math.round(avgChange1h * 100) / 100,
      avg_change_4h: Math.round(avgChange4h * 100) / 100,
      avg_change_24h: Math.round(avgChange24h * 100) / 100,
      by_signal_type: bySignalType,
      recent_signals: recentSignals,
      current_streak: currentStreak,
      max_streak: maxStreak,
      last_updated: new Date().toISOString()
    };

    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });

  } catch (error) {
    console.error('Signal stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
