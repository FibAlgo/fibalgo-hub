/**
 * ═══════════════════════════════════════════════════════════════
 * 🌍 TRANSLATION SAFETY-NET CRON
 * ═══════════════════════════════════════════════════════════════
 * 
 * Runs every 30 minutes.
 * Finds any published blog posts that are missing translations
 * and triggers the translate-blog API for them.
 * 
 * This ensures NO blog post is left untranslated, even if the
 * initial after() trigger in generate-blog fails.
 * 
 * Also retries any failed translations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 800; // 13 min — awaits full translation of 1 post into 29 languages

const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TARGET_LOCALES = 29; // Total non-English languages

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient<any>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Get all published blog post slugs
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('slug, title')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (postsError || !posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No published posts found',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Get translation counts per slug
    const { data: translations } = await supabase
      .from('blog_post_translations')
      .select('slug, locale, translation_status');

    // Build a map: slug → { completed: Set, failed: Set }
    const translationMap = new Map<string, { completed: Set<string>; failed: Set<string> }>();
    
    if (translations) {
      for (const t of translations) {
        if (!translationMap.has(t.slug)) {
          translationMap.set(t.slug, { completed: new Set(), failed: new Set() });
        }
        const entry = translationMap.get(t.slug)!;
        if (t.translation_status === 'completed') {
          entry.completed.add(t.locale);
        } else if (t.translation_status === 'failed') {
          entry.failed.add(t.locale);
        }
      }
    }

    // 3. Find posts that need translations
    const needsTranslation: { slug: string; title: string; missing: number; failed: number }[] = [];

    for (const post of posts) {
      const entry = translationMap.get(post.slug);
      const completedCount = entry ? entry.completed.size : 0;
      const failedCount = entry ? entry.failed.size : 0;

      if (completedCount < TARGET_LOCALES) {
        needsTranslation.push({
          slug: post.slug,
          title: post.title,
          missing: TARGET_LOCALES - completedCount,
          failed: failedCount,
        });
      }
    }

    if (needsTranslation.length === 0) {
      console.log('[Translate Cron] ✅ All posts fully translated');
      return NextResponse.json({
        success: true,
        message: 'All posts fully translated',
        totalPosts: posts.length,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Translate ONE post per cron run to stay within 300s limit
    // Prioritize: posts with failed translations first, then newest posts
    needsTranslation.sort((a, b) => {
      // Failed translations get priority (retry)
      if (a.failed > 0 && b.failed === 0) return -1;
      if (b.failed > 0 && a.failed === 0) return 1;
      // Then by most missing
      return b.missing - a.missing;
    });

    const target = needsTranslation[0];
    console.log(`[Translate Cron] 🌍 Translating "${target.slug}" (${target.missing} missing, ${target.failed} failed)`);

    // If there are failed translations, delete them first so they get retried
    if (target.failed > 0) {
      await supabase
        .from('blog_post_translations')
        .delete()
        .eq('slug', target.slug)
        .eq('translation_status', 'failed');
      console.log(`[Translate Cron] 🗑️ Cleared ${target.failed} failed translations for retry`);
    }

    // 5. Call translate-blog API directly (same process, no HTTP overhead)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) 
      || 'http://localhost:3001';

    const res = await fetch(`${baseUrl}/api/translate-blog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({ slug: target.slug }),
    });

    let translateResult = null;
    if (res.ok) {
      translateResult = await res.json();
      console.log(`[Translate Cron] ✅ "${target.slug}": ${translateResult.translated} translated, ${translateResult.failed} failed`);
    } else {
      console.error(`[Translate Cron] ❌ Translation API returned ${res.status}`);
    }

    return NextResponse.json({
      success: true,
      processed: target.slug,
      result: translateResult,
      pendingPosts: needsTranslation.length - 1,
      queue: needsTranslation.slice(1, 6).map(p => `${p.slug} (${p.missing} missing)`),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Translate Cron] 💥 Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
