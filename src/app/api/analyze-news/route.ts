import { NextRequest, NextResponse } from 'next/server';
import { analyzeNewsBatchWithPerplexity } from '@/lib/ai/perplexity-news-analyzer';
import { requireAuth, getErrorStatus, checkRateLimit, getClientIP } from '@/lib/api/auth';

interface NewsItem {
  id?: string;
  title: string;
  content?: string;
  source?: string;
  publishedAt?: string;
  tickers?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const { success: rateLimitOk, reset } = await checkRateLimit(`ai:${user.id}`, 'ai');
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before analyzing more news.', retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    const { news }: { news: NewsItem[] } = await request.json();

    if (!news || news.length === 0) {
      return NextResponse.json({ error: 'No news items provided' }, { status: 400 });
    }

    const batchInput = news.map(n => ({
      title: n.title,
      content: n.content ?? n.title,
      source: n.source,
    }));
    const result = await analyzeNewsBatchWithPerplexity(batchInput);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('News analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
