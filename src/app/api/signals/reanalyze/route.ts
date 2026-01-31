import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeNewsWithPerplexity, type AnalysisResult } from '@/lib/ai/perplexity-news-analyzer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Perplexity AnalysisResult → news_analyses update format */
function mapPerplexityResultToDbFormat(result: AnalysisResult) {
  const { stage1, stage3 } = result;
  const firstPos = stage3.positions?.[0];

  let signal = 'NO_TRADE';
  if (stage3.trade_decision === 'TRADE' && firstPos) {
    if (firstPos.direction === 'BUY') signal = stage3.importance_score >= 8 ? 'STRONG_BUY' : 'BUY';
    else if (firstPos.direction === 'SELL') signal = stage3.importance_score >= 8 ? 'STRONG_SELL' : 'SELL';
  }

  let timeHorizon: 'short' | 'swing' | 'macro' = 'swing';
  if (firstPos?.trade_type === 'scalping' || firstPos?.trade_type === 'day_trading') timeHorizon = 'short';
  else if (firstPos?.trade_type === 'position_trading') timeHorizon = 'macro';

  let riskMode = 'neutral';
  if (stage3.risk_mode === 'ELEVATED') riskMode = 'elevated';
  else if (stage3.risk_mode === 'HIGH RISK') riskMode = 'high';

  return {
    sentiment: firstPos?.direction === 'BUY' ? 'bullish' : firstPos?.direction === 'SELL' ? 'bearish' : 'neutral',
    score: stage3.importance_score,
    summary: stage3.overall_assessment || '',
    risk: stage3.main_risks?.[0] || '',
    signal,
    would_trade: stage3.trade_decision === 'TRADE',
    time_horizon: timeHorizon,
    risk_mode: riskMode,
    is_breaking: stage3.importance_score >= 8,
    trading_pairs: stage3.positions?.map(p => p.asset) || [],
    ai_analysis: {
      stage1: result.stage1,
      stage3: result.stage3,
      timing: result.timing,
      costs: result.costs,
    },
    analyzed_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { newsIds, reanalyzeAll } = await request.json();

    let query = supabase
      .from('news_analyses')
      .select('*')
      .order('published_at', { ascending: false });

    if (newsIds && newsIds.length > 0) {
      query = query.in('id', newsIds);
    } else if (reanalyzeAll) {
      query = query.limit(5);
    } else {
      return NextResponse.json({ error: 'newsIds or reanalyzeAll required' }, { status: 400 });
    }

    const { data: newsItems, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching news:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }

    if (!newsItems || newsItems.length === 0) {
      return NextResponse.json({ error: 'No news found' }, { status: 404 });
    }

    const results: Array<{ id: string; success: boolean; signal?: string; conviction?: number; wouldTrade?: boolean; error?: string }> = [];

    for (const newsItem of newsItems) {
      try {
        console.log(`[Reanalyze] Processing: ${newsItem.title?.substring(0, 50)}...`);

        const result = await analyzeNewsWithPerplexity({
          title: newsItem.title || '',
          article: (newsItem as { body?: string }).body || newsItem.title || '',
          date: newsItem.published_at || new Date().toISOString(),
          source: newsItem.source,
        });

        const dbUpdate = mapPerplexityResultToDbFormat(result);

        const { error: updateError } = await supabase
          .from('news_analyses')
          .update({
            ...dbUpdate,
            ai_analysis: {
              ...dbUpdate.ai_analysis,
              stage1: result.stage1,
              timing: result.timing,
            },
          })
          .eq('id', newsItem.id);

        if (updateError) {
          console.error(`Error updating news ${newsItem.id}:`, updateError);
          results.push({ id: newsItem.id, success: false, error: updateError.message });
        } else {
          results.push({
            id: newsItem.id,
            success: true,
            signal: dbUpdate.signal,
            conviction: dbUpdate.score,
            wouldTrade: dbUpdate.would_trade,
          });
        }
      } catch (err) {
        console.error(`Error analyzing news ${newsItem.id}:`, err);
        results.push({
          id: newsItem.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      analyzed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('Reanalyze API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
