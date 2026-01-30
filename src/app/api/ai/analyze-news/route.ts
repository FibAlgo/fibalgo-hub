/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧠 NEWS ANALYSIS API - V2 (Elite Strategist)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * POST /api/ai/analyze-news
 * 
 * Uses 2-stage meta-prompting:
 * 1. Strategist (GPT-4o): Designs analysis framework, ignores headline
 * 2. Executor (GPT-4o-mini): Executes analysis per strategy
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  analyzeNewsV2, 
  analyzeNewsBatchV2, 
  type NewsInput, 
  type AnalysisOptions 
} from '@/lib/ai/news-strategist-v2';
import { createClient } from '@/lib/supabase/server';

// Rate limiting
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
};

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    return true;
  }
  
  if (record.count >= RATE_LIMIT.maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// Validation
function validateNewsInput(news: unknown): news is NewsInput {
  if (!news || typeof news !== 'object') return false;
  const n = news as Record<string, unknown>;
  
  return (
    typeof n.id === 'string' &&
    typeof n.body === 'string' &&
    n.body.trim().length > 0
  );
}

export async function POST(request: NextRequest) {
  try {
    // Auth check (optional - remove if public)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const identifier = user?.id || request.headers.get('x-forwarded-for') || 'anonymous';
    
    // Rate limit
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before trying again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Single news or batch
    const { news, options } = body as {
      news: NewsInput | NewsInput[];
      options?: AnalysisOptions;
    };

    // Validate options
    const validOptions: AnalysisOptions = {
      modelTier: options?.modelTier || 'standard',
      includeMarketContext: options?.includeMarketContext !== false,
      skipExecutor: options?.skipExecutor === true,
    };

    // Single news analysis
    if (!Array.isArray(news)) {
      if (!validateNewsInput(news)) {
        return NextResponse.json(
          { error: 'Invalid news input. Required: id (string), body (string, non-empty). Headline is optional and will be ignored.' },
          { status: 400 }
        );
      }

      const result = await analyzeNewsV2(news, validOptions);

      // Optionally save to database
      if (user) {
        try {
          await supabase.from('news_analyses').upsert({
            news_id: news.id,
            user_id: user.id,
            category: result.analysis.meta?.newsCategory || 'unknown',
            sentiment: result.analysis.executiveSummary?.overallSentiment || 'neutral',
            summary: result.analysis.executiveSummary?.signal || '',
            analysis: result,
            strategy: result.strategy,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'news_id',
          });
        } catch (dbError) {
          console.warn('Failed to save analysis to database:', dbError);
        }
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // Batch analysis
    if (news.length > 20) {
      return NextResponse.json(
        { error: 'Batch limit is 20 news items per request.' },
        { status: 400 }
      );
    }

    // Validate all news items
    for (const item of news) {
      if (!validateNewsInput(item)) {
        return NextResponse.json(
          { error: `Invalid news input for id: ${(item as {id?: string}).id || 'unknown'}` },
          { status: 400 }
        );
      }
    }

    const batchResult = await analyzeNewsBatchV2(news, validOptions);

    // Save batch to database
    if (user && batchResult.results.length > 0) {
      try {
        const records = batchResult.results.map(r => ({
          news_id: r.newsId,
          user_id: user.id,
          category: r.analysis.meta?.newsCategory || 'unknown',
          sentiment: r.analysis.executiveSummary?.overallSentiment || 'neutral',
          summary: r.analysis.executiveSummary?.signal || '',
          analysis: r,
          strategy: r.strategy,
          created_at: new Date().toISOString(),
        }));

        await supabase.from('news_analyses').upsert(records, {
          onConflict: 'news_id',
        });
      } catch (dbError) {
        console.warn('Failed to save batch to database:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      data: batchResult,
    });

  } catch (error) {
    console.error('News analysis error:', error);
    
    return NextResponse.json(
      { 
        error: 'Analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET - Health check and info
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/ai/analyze-news',
    version: 'v2',
    pipeline: 'meta-prompting',
    stages: [
      { name: 'Strategist', model: 'gpt-4o', role: 'Design analysis framework, ignore headline' },
      { name: 'Executor', model: 'gpt-4o-mini', role: 'Execute analysis per strategy' },
    ],
    inputSchema: {
      news: {
        id: 'string (required)',
        headline: 'string (IGNORED - intentionally)',
        body: 'string (required, this is what gets analyzed)',
        source: 'string (optional)',
        publishedAt: 'string (optional)',
        tickers: 'string[] (optional)',
      },
      options: {
        modelTier: "'premium' | 'standard' | 'economy' (default: 'standard')",
        includeMarketContext: 'boolean (default: true)',
        skipExecutor: 'boolean (default: false, for debugging)',
      },
    },
    limits: {
      maxBatchSize: 20,
      rateLimit: '10 requests per minute',
    },
    notes: [
      'Headlines are intentionally IGNORED to prevent headline bias',
      'Only the body/content of the news is analyzed',
      'The strategist designs the analysis framework',
      'The executor follows the framework exactly',
    ],
  });
}
