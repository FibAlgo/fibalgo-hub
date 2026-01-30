import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const signal = searchParams.get('signal');
    const onlyTradeable = searchParams.get('tradeable') === 'true';

    // Build query
    let query = supabase
      .from('news_analyses')
      .select(`
        id,
        news_id,
        title,
        source,
        url,
        published_at,
        category,
        sentiment,
        score,
        summary,
        impact,
        risk,
        trading_pairs,
        signal,
        signal_blocked,
        block_reason,
        would_trade,
        time_horizon,
        risk_mode,
        is_breaking,
        ai_analysis
      `)
      .order('published_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (signal) {
      query = query.eq('signal', signal);
    }

    if (onlyTradeable) {
      query = query.eq('would_trade', true).eq('signal_blocked', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching news signals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch signals' },
        { status: 500 }
      );
    }

    // Calculate stats
    const stats = {
      total: data?.length || 0,
      buySignals: data?.filter(s => s.signal === 'BUY' || s.signal === 'STRONG_BUY').length || 0,
      sellSignals: data?.filter(s => s.signal === 'SELL' || s.signal === 'STRONG_SELL').length || 0,
      noTrade: data?.filter(s => s.signal === 'NO_TRADE').length || 0,
      tradeable: data?.filter(s => s.would_trade && !s.signal_blocked).length || 0,
      breaking: data?.filter(s => s.is_breaking).length || 0,
    };

    return NextResponse.json({
      signals: data || [],
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('News signals API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
