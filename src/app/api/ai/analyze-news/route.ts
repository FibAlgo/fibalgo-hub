/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧠 NEWS ANALYSIS API (Perplexity 3-Stage)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/ai/analyze-news
 *
 * Uses perplexity-news-analyzer: Stage 1 (GPT-5.2/Claude) → Stage 2 (Perplexity) → Stage 3 (GPT-5.2/Claude).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeNewsWithPerplexity,
  analyzeNewsBatchWithPerplexity,
  type NewsInput,
  type AnalysisResult,
} from '@/lib/ai/perplexity-news-analyzer';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, requirePremium, getErrorStatus, checkRateLimit, getClientIP } from '@/lib/api/auth';

interface ApiNewsInput {
  id?: string;
  headline?: string;
  body: string;
  source?: string;
  publishedAt?: string;
  tickers?: string[];
}

function validateNewsInput(news: unknown): news is ApiNewsInput {
  if (!news || typeof news !== 'object') return false;
  const n = news as Record<string, unknown>;
  return typeof n.body === 'string' && n.body.trim().length > 0;
}

function toPerplexityNewsInput(n: ApiNewsInput): NewsInput {
  return {
    title: n.headline?.trim() || n.body.slice(0, 120).trim(),
    article: n.body.trim(),
    date: n.publishedAt || new Date().toISOString(),
    source: n.source,
  };
}

function sentimentFromResult(result: AnalysisResult): 'bullish' | 'bearish' | 'neutral' {
  const pos = result.stage3.positions?.[0];
  if (!pos) return 'neutral';
  if (pos.direction === 'BUY') return 'bullish';
  if (pos.direction === 'SELL') return 'bearish';
  return 'neutral';
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require PREMIUM subscription for AI analysis (expensive operations)
    const { user, error: authError, subscription } = await requirePremium();
    if (authError || !user) {
      // Return 403 for subscription issues, 401 for auth issues
      const status = authError === 'Premium subscription required' ? 403 : getErrorStatus(authError || 'Unauthorized');
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status });
    }

    const clientIP = getClientIP(request);
    const { success: rateLimitOk, reset } = await checkRateLimit(`ai:${user.id}:${clientIP}:analyze-news`, 'ai');
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before analyzing more news.', retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { news, options } = body as { news: ApiNewsInput | ApiNewsInput[]; options?: Record<string, unknown> };

    // Single news
    if (!Array.isArray(news)) {
      if (!validateNewsInput(news)) {
        return NextResponse.json(
          { error: 'Invalid news input. Required: body (string, non-empty). id, headline, source, publishedAt optional.' },
          { status: 400 }
        );
      }

      const newsInput = toPerplexityNewsInput(news);
      const result = await analyzeNewsWithPerplexity(newsInput, options);

      if (user && news.id) {
        try {
          const supabase = await createClient();
          await supabase.from('news_analyses').upsert({
            news_id: news.id,
            user_id: user.id,
            category: result.stage1.category || 'unknown',
            sentiment: sentimentFromResult(result),
            summary: result.stage3.overall_assessment || '',
            analysis: result,
            strategy: result.stage1,
            created_at: new Date().toISOString(),
          }, { onConflict: 'news_id' });
        } catch (dbError) {
          console.warn('Failed to save analysis to database:', dbError);
        }
      }

      return NextResponse.json({ success: true, data: result });
    }

    // Batch (max 20)
    if (news.length > 20) {
      return NextResponse.json({ error: 'Batch limit is 20 news items per request.' }, { status: 400 });
    }

    for (const item of news) {
      if (!validateNewsInput(item)) {
        return NextResponse.json(
          { error: `Invalid news input for id: ${(item as ApiNewsInput).id || 'unknown'}` },
          { status: 400 }
        );
      }
    }

    const batchInput = news.map(n => ({
      title: n.headline?.trim() || n.body.slice(0, 120).trim(),
      content: n.body.trim(),
      source: n.source,
    }));
    const batchResult = await analyzeNewsBatchWithPerplexity(batchInput);

    if (user && batchResult.analyses.length > 0) {
      try {
        const supabase = await createClient();
        const records = batchResult.analyses
          .map((a, i) => {
            const item = news[i] as ApiNewsInput;
            if (!item.id) return null;
            const sentiment = a.analysis?.analysis?.sentiment === 'bullish' ? 'bullish' : a.analysis?.analysis?.sentiment === 'bearish' ? 'bearish' : 'neutral';
            return {
              news_id: item.id,
              user_id: user.id,
              category: a.analysis?.meta?.category || 'unknown',
              sentiment,
              summary: a.analysis?.trade?.rationale || a.analysis?.analysis?.thesis || '',
              analysis: a,
              strategy: null,
              created_at: new Date().toISOString(),
            };
          })
          .filter((r): r is NonNullable<typeof r> => r != null);
        if (records.length > 0) {
          await supabase.from('news_analyses').upsert(records, { onConflict: 'news_id' });
        }
      } catch (dbError) {
        console.warn('Failed to save batch to database:', dbError);
      }
    }

    return NextResponse.json({ success: true, data: batchResult });
  } catch (error) {
    console.error('News analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/ai/analyze-news',
    pipeline: 'perplexity-3stage',
    stages: [
      { name: 'Stage 1', role: 'GPT-5.2/Claude: Haber analizi + required_data' },
      { name: 'Stage 2', role: 'Perplexity Sonar: Veri toplama' },
      { name: 'Stage 3', role: 'GPT-5.2/Claude: Final trading kararı' },
    ],
    inputSchema: {
      news: { id: 'string (optional)', headline: 'string (optional)', body: 'string (required)', source: 'string (optional)', publishedAt: 'string (optional)' },
      options: 'AnalyzeWithPerplexityOptions (optional)',
    },
    limits: { maxBatchSize: 20 },
  });
}
