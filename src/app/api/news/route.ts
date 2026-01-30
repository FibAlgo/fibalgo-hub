import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success, reset } = await checkRateLimit(`public:${clientIP}:news`, 'general');
    if (!success) {
      return NextResponse.json({
        error: 'Too many requests',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const period = searchParams.get('period') || ''; // 24h, 7d, 30d - filter by published_at
    const breakingOnly = searchParams.get('breaking') === 'true';
    const signalFilter = searchParams.get('signal'); // STRONG_BUY, BUY, SELL, STRONG_SELL, NO_TRADE
    const tradeableOnly = searchParams.get('tradeable') === 'true';

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let query = supabase
      .from('news_analyses')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (period === '24h' || period === '7d' || period === '30d') {
      const now = Date.now();
      const startMs = period === '7d' ? now - 7 * 24 * 60 * 60 * 1000 : period === '30d' ? now - 30 * 24 * 60 * 60 * 1000 : now - 24 * 60 * 60 * 1000;
      query = query.gte('published_at', new Date(startMs).toISOString());
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (breakingOnly) {
      query = query.eq('is_breaking', true);
    }

    // NEW: Signal filters
    if (signalFilter) {
      query = query.eq('signal', signalFilter);
    }

    if (tradeableOnly) {
      query = query.eq('would_trade', true).eq('signal_blocked', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }

    // Transform to frontend format (YENİ STAGE 1-2-3 FORMAT)
    const news = data?.map((item) => {
      const aiAnalysis = item.ai_analysis;
      const stage1 = aiAnalysis?.stage1;
      const stage3 = aiAnalysis?.stage3;
      
      return {
        id: item.id,
        newsId: item.news_id,
        source: 'FibAlgo',
        handle: '@fibalgo',
        avatar: `https://ui-avatars.com/api/?name=FA&background=0A0A0B&color=00F5FF`,
        // Use stage1.title as headline, fallback to content
        content: stage1?.title || item.content?.substring(0, 200) || 'Analysis available',
        time: getTimeAgo(item.published_at),
        publishedAt: item.published_at,
        createdAt: item.created_at,
        sourceLabel: 'FibAlgo',
        category: item.category,
        isBreaking: item.is_breaking || false,
        sourceCredibility: {
          tier: item.source_credibility_tier || 3,
          score: item.source_credibility_score || 50,
          label: item.source_credibility_label || 'Unknown',
        },
        // AI Analysis - Full Stage 1-2-3 format
        aiAnalysis: aiAnalysis || null,
        // Signal System
        signal: {
          timeHorizon: item.time_horizon || 'short',
          riskMode: item.risk_mode || 'neutral',
          wouldTrade: item.would_trade || false,
          signal: item.signal || 'NO_TRADE',
          signalBlocked: item.signal_blocked || false,
          blockReason: item.block_reason || null,
        },
        // Quick access fields for UI
        tradeDecision: stage3?.trade_decision || 'NO TRADE',
        importanceScore: stage3?.importance_score || 0,
        positions: stage3?.positions || [],
        affectedAssets: stage1?.affected_assets || [],
        tradingStyles: stage1?.trading_styles_applicable || [],
        mainRisks: stage3?.main_risks || [],
        overallAssessment: stage3?.overall_assessment || '',
        tradingPairs: item.trading_pairs || [],
      };
    }) || [];

    return NextResponse.json({ news });

  } catch (error) {
    console.error('Get news error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
