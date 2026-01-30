import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeNews } from '@/lib/ai/news-pipeline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Executor output'unu database formatına dönüştür
function mapExecutorOutputToDbFormat(executorOutput: Record<string, unknown>) {
  const signal = executorOutput.signal as Record<string, unknown> || {};
  const timing = executorOutput.timing as Record<string, unknown> || {};
  const riskAssessment = executorOutput.riskAssessment as Record<string, unknown> || {};
  const marketContext = executorOutput.marketContext as Record<string, unknown> || {};
  const noveltyScore = executorOutput.noveltyScore as Record<string, unknown> || {};

  return {
    // Top-level fields
    sentiment: signal.direction === 'STRONG_BUY' || signal.direction === 'BUY' ? 'bullish' :
               signal.direction === 'STRONG_SELL' || signal.direction === 'SELL' ? 'bearish' : 'neutral',
    score: signal.conviction || 5,
    summary: executorOutput.executiveSummary || '',
    risk: riskAssessment.keyRisk || '',
    signal: signal.direction || 'NO_TRADE',
    would_trade: signal.wouldTrade || false,
    time_horizon: timing.timeHorizon === 'immediate' ? 'short' :
                  timing.timeHorizon === 'short' ? 'short' :
                  timing.timeHorizon === 'swing' ? 'swing' : 'macro',
    risk_mode: marketContext.riskMode || 'neutral',
    is_breaking: noveltyScore.isBreakingNews || false,
    trading_pairs: signal.alternativeAssets || [],
    
    // Full AI analysis JSON
    ai_analysis: {
      executiveSummary: executorOutput.executiveSummary,
      signal: executorOutput.signal,
      timing: executorOutput.timing,
      riskAssessment: executorOutput.riskAssessment,
      marketContext: executorOutput.marketContext,
      scenarioMatrix: executorOutput.scenarioMatrix,
      noveltyScore: executorOutput.noveltyScore,
      flowAnalysis: executorOutput.flowAnalysis,
      monitoringPoints: executorOutput.monitoringPoints,
      confidenceLevel: executorOutput.confidenceLevel,
    },
    
    analyzed_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { newsIds, reanalyzeAll } = await request.json();

    // Haberleri al
    let query = supabase
      .from('news_analyses')
      .select('*')
      .order('published_at', { ascending: false });

    if (newsIds && newsIds.length > 0) {
      query = query.in('id', newsIds);
    } else if (reanalyzeAll) {
      query = query.limit(5); // Son 5 haberi al
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

    const results = [];

    for (const newsItem of newsItems) {
      try {
        console.log(`[Reanalyze] Processing: ${newsItem.title?.substring(0, 50)}...`);

        // Pipeline'ı çalıştır
        const pipelineResult = await analyzeNews({
          id: newsItem.id,
          headline: newsItem.title || '',
          body: newsItem.title || '', // Şimdilik title'ı body olarak kullan
          source: newsItem.source,
          publishedAt: newsItem.published_at,
        });

        // Executor output'unu database formatına dönüştür
        const dbUpdate = mapExecutorOutputToDbFormat(
          pipelineResult.analysis as Record<string, unknown>
        );

        // Database'i güncelle
        const { error: updateError } = await supabase
          .from('news_analyses')
          .update({
            ...dbUpdate,
            // Strategist output'unu da sakla
            ai_analysis: {
              ...dbUpdate.ai_analysis,
              strategist: pipelineResult.strategist,
              timing: pipelineResult.timing,
              meta: pipelineResult.meta,
            },
          })
          .eq('id', newsItem.id);

        if (updateError) {
          console.error(`Error updating news ${newsItem.id}:`, updateError);
          results.push({
            id: newsItem.id,
            success: false,
            error: updateError.message,
          });
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
