import { NextRequest, NextResponse } from 'next/server';
import { analyzeNewsBatch, NewsItem } from '@/lib/ai/news-analysis';
import { requireAuth, getErrorStatus, checkRateLimit, getClientIP } from '@/lib/api/auth';

// 
//  MAIN API HANDLER  WRAPPER AROUND SHARED LOGIC
// 

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require authentication to prevent abuse of AI API
    const { user, error: authError } = await requireAuth();
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    // 🔒 SECURITY: Rate limit AI endpoints (expensive operations)
    const { success: rateLimitOk, reset } = await checkRateLimit(`ai:${user.id}`, 'ai');
    if (!rateLimitOk) {
      return NextResponse.json({ 
        error: 'Too many requests. Please wait before analyzing more news.',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    const { news }: { news: NewsItem[] } = await request.json();

    if (!news || news.length === 0) {
      return NextResponse.json(
        { error: 'No news items provided' },
        { status: 400 }
      );
    }

    const result = await analyzeNewsBatch(news);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('News analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
