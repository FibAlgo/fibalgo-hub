/**
 * ═══════════════════════════════════════════════════════════════
 * 🌐 ADMIN: FULL SITE SEARCH ENGINE PING
 * ═══════════════════════════════════════════════════════════════
 * 
 * Submits ALL site pages (static + blog) × ALL 30 locales
 * to ALL search engines via IndexNow + Sitemap ping.
 * 
 * POST /api/admin/ping-search-engines
 * Authorization: Bearer <CRON_SECRET>
 * 
 * This sends:
 *  - 7 static pages × 30 locales = 210 URLs
 *  - N blog posts × 30 locales = N×30 URLs
 *  - sitemap.xml
 * 
 * To: Google, Bing, Yandex, Naver, Seznam, Yep
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pingAllPages } from '@/lib/search-engine-ping';

const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all published blog post slugs from DB
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    const blogSlugs = (posts || []).map((p: { slug: string }) => p.slug);

    console.log(`[Admin Ping] 🌐 Starting full site ping — ${blogSlugs.length} blog posts + 7 static pages × 30 locales`);

    // Ping ALL pages to ALL search engines
    const result = await pingAllPages(blogSlugs);

    return NextResponse.json({
      success: true,
      message: `Full site submitted to all search engines`,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin Ping] 💥 Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET also works (for easy browser/cron triggering)
export async function GET(request: NextRequest) {
  return POST(request);
}
