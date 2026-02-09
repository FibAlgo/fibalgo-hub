/**
 * ═══════════════════════════════════════════════════════════════
 * 🤖 AI BLOG — FULL AUTOPILOT CRON JOB
 * ═══════════════════════════════════════════════════════════════
 * 
 * Runs 2x daily (09:00 UTC + 21:00 UTC)
 * Each run generates 1 blog post and AUTO-PUBLISHES immediately.
 * No admin approval needed — fully autonomous.
 * 
 * Total: 2 posts per day → ~730 posts per year
 * Keyword pool: 217 keywords → ~3+ years of unique content
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAndAutoPublish, getBlogStats } from '@/lib/ai-blog-writer';

const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[AI Blog Cron] 🚀 Auto-generating and publishing...');
    const result = await generateAndAutoPublish();

    if (!result.success) {
      console.error('[AI Blog Cron] ❌ Failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

    console.log(`[AI Blog Cron] ✅ Published: "${result.title}" (${result.wordCount} words) → /blog/${result.slug}`);

    // Fetch stats for monitoring
    let stats = null;
    try {
      stats = await getBlogStats();
    } catch { /* stats are optional */ }

    return NextResponse.json({
      success: true,
      message: `Auto-published: "${result.title}"`,
      post: {
        slug: result.slug,
        title: result.title,
        wordCount: result.wordCount,
        keyword: result.keyword,
      },
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AI Blog Cron] 💥 Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
