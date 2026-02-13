/**
 * ═══════════════════════════════════════════════════════════════
 * 🌐 ADMIN: FULL SITE SEARCH ENGINE PING
 * ═══════════════════════════════════════════════════════════════
 * 
 * Fetches sitemap.xml → extracts EVERY URL → submits to IndexNow.
 * 
 * 100% automatic — no manual page lists. Whatever is in the sitemap
 * gets submitted. New pages, blog posts, categories, locales —
 * all included automatically.
 * 
 * POST /api/admin/ping-search-engines
 * Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
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
    console.log(`[Admin Ping] 🌐 Starting full site ping — fetching ALL URLs from sitemap.xml`);

    // Fetch sitemap → extract all URLs → submit to all search engines
    const result = await pingAllPages();

    return NextResponse.json({
      success: true,
      message: `Full site submitted to all search engines (auto-fetched from sitemap.xml)`,
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
