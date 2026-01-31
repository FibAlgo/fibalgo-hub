/**
 * Dev-only: News analysis test (no auth).
 * POST /api/dev/test-news-analysis
 * Body: { news: { body: string, headline?: string, source?: string } }
 * Only available when NODE_ENV === 'development'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeNewsWithPerplexity, type NewsInput } from '@/lib/ai/perplexity-news-analyzer';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const news = body?.news;
    if (!news || typeof news.body !== 'string' || !news.body.trim()) {
      return NextResponse.json(
        { error: 'Invalid body. Send { news: { body: string, headline?: string } }' },
        { status: 400 }
      );
    }

    const newsInput: NewsInput = {
      title: news.headline?.trim() || news.body.slice(0, 120).trim(),
      article: news.body.trim(),
      date: news.publishedAt || new Date().toISOString(),
      source: news.source,
    };

    const result = await analyzeNewsWithPerplexity(newsInput);

    const hasParseError =
      result.stage1?.title === 'Analysis Error' ||
      (typeof result.stage1?.analysis === 'string' &&
        (result.stage1.analysis.includes('Parse error') || result.stage1.analysis.includes('işlenemedi')));

    return NextResponse.json({
      success: true,
      parseError: hasParseError,
      stage1Title: result.stage1?.title,
      stage1AnalysisSnippet:
        typeof result.stage1?.analysis === 'string'
          ? result.stage1.analysis.slice(0, 200)
          : result.stage1?.analysis,
      timing: result.timing,
      full: result,
    });
  } catch (error) {
    console.error('Test news analysis error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
