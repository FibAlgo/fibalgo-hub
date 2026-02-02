/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧠 NEWS ANALYSIS API (Perplexity 3-Stage)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POST /api/ai/analyze-news
 *
 * Uses perplexity-news-analyzer: Stage 1 (DeepSeek) → Stage 2 (Perplexity) → Stage 3 (DeepSeek).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeNewsWithPerplexity,
  analyzeNewsBatchWithPerplexity,
  type NewsInput,
  type AnalysisResult,
} from '@/lib/ai/perplexity-news-analyzer';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, requirePremium, getErrorStatus, checkRateLimit, getClientIP, supabaseAdmin } from '@/lib/api/auth';

// ──────────────────────────────────────────────────────────────────────────────
// Distributed per-news lock (prevents concurrent DeepSeek double-burn)
// Uses public.news_analysis_locks (news_id PRIMARY KEY) created by migration.
// We ONLY lock when news.id is provided (same key used for DB upsert).
// ──────────────────────────────────────────────────────────────────────────────

const NEWS_LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes
type LockAcquireResult = { ok: true; lockedBy: string } | { ok: false; reason: 'locked' | 'db_error' };

async function acquireNewsAnalysisLock(newsId: string, lockedBy: string): Promise<LockAcquireResult> {
  const now = Date.now();
  const expiresAtIso = new Date(now + NEWS_LOCK_TTL_MS).toISOString();
  const nowIso = new Date(now).toISOString();

  // Best-effort cleanup of expired lock for this key
  try {
    await supabaseAdmin
      .from('news_analysis_locks')
      .delete()
      .eq('news_id', newsId)
      .lt('lock_expires_at', nowIso);
  } catch {
    // ignore
  }

  const { error } = await supabaseAdmin
    .from('news_analysis_locks')
    .insert({
      news_id: newsId,
      locked_by: lockedBy,
      lock_expires_at: expiresAtIso,
      locked_at: new Date(now).toISOString(),
      attempts: 1,
    });

  if (!error) return { ok: true, lockedBy };
  const code = (error as any).code;
  if (code === '23505') return { ok: false, reason: 'locked' };
  console.error('[AnalyzeNewsAPI][Lock] acquire failed:', newsId, error.message);
  return { ok: false, reason: 'db_error' };
}

async function releaseNewsAnalysisLock(newsId: string, lockedBy: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('news_analysis_locks')
      .delete()
      .eq('news_id', newsId)
      .eq('locked_by', lockedBy);
  } catch (e) {
    console.warn('[AnalyzeNewsAPI][Lock] release failed:', newsId, e);
  }
}

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
      const lockOwner = `api:analyze-news:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
      const lockKey = news.id?.trim();
      let lockHeldBy: string | null = null;

      if (lockKey) {
        const lock = await acquireNewsAnalysisLock(lockKey, lockOwner);
        if (!lock.ok) {
          return NextResponse.json(
            { error: 'Analysis already in progress for this news item. Please retry in a moment.', reason: lock.reason },
            { status: 409 }
          );
        }
        lockHeldBy = lock.lockedBy;
      }

      try {
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
      } finally {
        if (lockKey && lockHeldBy) {
          await releaseNewsAnalysisLock(lockKey, lockHeldBy);
        }
      }
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

    const lockOwner = `api:analyze-news-batch:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
    const heldLocks: Array<{ newsId: string; lockedBy: string }> = [];
    const skipped: Array<{ id?: string; reason: string }> = [];

    // Acquire locks for items with id; skip locked ones to prevent double-burn.
    const batchItems: Array<{ input: any; originalIndex: number; id?: string }> = [];
    for (let i = 0; i < news.length; i++) {
      const n = news[i] as ApiNewsInput;
      const id = (n.id || '').trim() || undefined;
      if (id) {
        const lock = await acquireNewsAnalysisLock(id, lockOwner);
        if (!lock.ok) {
          skipped.push({ id, reason: 'locked' });
          continue;
        }
        heldLocks.push({ newsId: id, lockedBy: lock.lockedBy });
      }

      batchItems.push({
        originalIndex: i,
        id,
        input: {
          title: n.headline?.trim() || n.body.slice(0, 120).trim(),
          content: n.body.trim(),
          source: n.source,
        },
      });
    }

    if (batchItems.length === 0) {
      return NextResponse.json({ success: false, error: 'All items are currently locked (analysis in progress).', skipped }, { status: 409 });
    }

    let batchResult: any;
    try {
      const batchInput = batchItems.map(b => b.input);
      batchResult = await analyzeNewsBatchWithPerplexity(batchInput);
    } finally {
      // Release locks after analysis completes (concurrency protection only)
      for (const l of heldLocks) {
        await releaseNewsAnalysisLock(l.newsId, l.lockedBy);
      }
    }

    if (user && batchResult.analyses.length > 0) {
      try {
        const supabase = await createClient();
        const records = batchResult.analyses
          .map((a: any, i: number) => {
            const originalIndex = batchItems[i]?.originalIndex ?? i;
            const item = news[originalIndex] as ApiNewsInput;
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
          .filter((r: unknown): r is NonNullable<typeof r> => r != null);
        if (records.length > 0) {
          await supabase.from('news_analyses').upsert(records, { onConflict: 'news_id' });
        }
      } catch (dbError) {
        console.warn('Failed to save batch to database:', dbError);
      }
    }

    return NextResponse.json({ success: true, data: batchResult, skipped });
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
