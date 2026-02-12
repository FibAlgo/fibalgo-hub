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
import { after } from 'next/server';
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

    console.log(`[AI Blog Cron] ✅ Published: "${result.title}" (${result.wordCount} words) → /education/${result.slug}`);

    // ── AUTO-TRANSLATE: Use after() to trigger translation in a separate function ──
    // after() runs inside this function's maxDuration (300s).
    // translate-blog runs as its OWN serverless instance with 800s maxDuration.
    // We only need to trigger it — NOT wait for completion.
    // Safety net: /api/cron/translate-blogs runs every 30 min to catch any failures.
    after(async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) 
          || 'http://localhost:3001';
        
        const translateUrl = `${baseUrl}/api/translate-blog`;
        
        // Use AbortController with 10s timeout — we only need to confirm
        // the request was received, not wait for all 29 translations.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch(translateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRON_SECRET}`,
          },
          body: JSON.stringify({ slug: result.slug }),
          signal: controller.signal,
        }).catch(() => null); // Silently handle abort/network errors
        
        clearTimeout(timeout);
        
        if (res && res.ok) {
          console.log(`[AI Blog Cron] 🌍 Translation triggered for "${result.slug}" → 29 languages`);
        } else if (res) {
          console.error(`[AI Blog Cron] ⚠️ Translation trigger returned: ${res.status}`);
        } else {
          // Request was sent but we aborted before getting full response — that's OK.
          // The translate-blog function continues running independently.
          console.log(`[AI Blog Cron] 🌍 Translation request sent for "${result.slug}" (running independently)`);
        }
      } catch (err) {
        console.error(`[AI Blog Cron] ⚠️ Translation trigger error (safety net cron will retry):`, err);
      }
    });

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
      translationTriggered: true,
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
