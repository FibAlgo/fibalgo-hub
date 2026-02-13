/**
 * ═══════════════════════════════════════════════════════════════
 * SEARCH ENGINE PING — IndexNow + Sitemap Ping
 * ═══════════════════════════════════════════════════════════════
 *
 * Notifies ALL major search engines about site content.
 *
 * 1. IndexNow API → Bing, Yandex, Seznam.cz, Naver, Yep
 * 2. Google Ping → /ping?sitemap=...
 * 3. Bing Sitemap Ping → /ping?sitemap=...
 *
 * Two modes:
 *  - notifySearchEngines(slug)   → single blog post (called after publish)
 *  - pingAllPages()              → FULL SITE (all pages × all locales)
 */

const SITE_URL = 'https://fibalgo.com';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const INDEXNOW_KEY = 'be7fb56cfe924b0ab6c97b4971af199e';
const INDEXNOW_KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

// All IndexNow-compatible search engines
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',        // Generic (routes to all)
  'https://www.bing.com/indexnow',             // Bing
  'https://yandex.com/indexnow',               // Yandex
  'https://search.seznam.cz/indexnow',         // Seznam (Czech)
  'https://searchadvisor.naver.com/indexnow',  // Naver (Korea)
];

// Sitemap ping endpoints
const SITEMAP_PING_URLS = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
];

// Static pages that exist on the site (public-facing, indexable)
const STATIC_PAGES = [
  '/',
  '/about',
  '/library',
  '/education',
  '/blog',
  '/privacy-policy',
  '/terms-of-service',
];

// All 30 locales
const LOCALES = [
  'en', 'tr', 'es', 'de', 'fr', 'it', 'pt', 'nl', 'pl', 'ru',
  'uk', 'ar', 'ja', 'ko', 'zh', 'hi', 'th', 'vi', 'id', 'ms',
  'sv', 'da', 'fi', 'no', 'cs', 'ro', 'hu', 'el', 'he', 'bn',
];

/**
 * Generate all locale URLs for a given path.
 * English = no prefix, others = /{locale}/path
 */
function generateLocaleUrls(path: string): string[] {
  const urls: string[] = [];
  for (const locale of LOCALES) {
    if (locale === 'en') {
      urls.push(`${SITE_URL}${path}`);
    } else {
      urls.push(`${SITE_URL}/${locale}${path}`);
    }
  }
  return urls;
}

/**
 * Submit URLs to IndexNow in batches (max 10,000 per request).
 */
async function submitToIndexNow(urls: string[]): Promise<{ engine: string; status: number | string }[]> {
  const results: { engine: string; status: number | string }[] = [];

  // IndexNow accepts max 10,000 URLs per request — batch if needed
  const batchSize = 10000;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    try {
      const body = JSON.stringify({
        host: 'fibalgo.com',
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList: batch,
      });

      const res = await fetch(INDEXNOW_ENDPOINTS[0], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body,
        signal: AbortSignal.timeout(15000),
      });

      results.push({ engine: 'IndexNow (all)', status: res.status });
      console.log(`[IndexNow] api.indexnow.org → ${res.status} (${batch.length} URLs, batch ${Math.floor(i / batchSize) + 1})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      results.push({ engine: 'IndexNow (all)', status: `error: ${msg}` });
      console.error(`[IndexNow] api.indexnow.org failed:`, msg);
    }
  }

  // Also ping individual engines directly for reliability
  const directPings = INDEXNOW_ENDPOINTS.slice(1).map(async (endpoint) => {
    const engineName = new URL(endpoint).hostname;
    try {
      const body = JSON.stringify({
        host: 'fibalgo.com',
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList: urls.slice(0, 100), // First 100 URLs for individual pings
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body,
        signal: AbortSignal.timeout(10000),
      });
      results.push({ engine: engineName, status: res.status });
      console.log(`[IndexNow] ${engineName} → ${res.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      results.push({ engine: engineName, status: `error: ${msg}` });
    }
  });

  await Promise.allSettled(directPings);
  return results;
}

/**
 * Ping Google & Bing sitemap endpoints.
 */
async function pingSitemaps(): Promise<{ engine: string; status: number | string }[]> {
  const results: { engine: string; status: number | string }[] = [];

  const pings = SITEMAP_PING_URLS.map(async (url) => {
    const engineName = new URL(url).hostname;
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(8000),
      });
      results.push({ engine: `${engineName} sitemap`, status: res.status });
      console.log(`[Sitemap Ping] ${engineName} → ${res.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      results.push({ engine: `${engineName} sitemap`, status: `error: ${msg}` });
    }
  });

  await Promise.allSettled(pings);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Notify all search engines about a new blog post.
 * Generates URLs for all available locales of the given slug.
 */
export async function notifySearchEngines(
  slug: string,
  locales: string[] = ['en'],
): Promise<{
  indexNow: { engine: string; status: number | string }[];
  sitemapPing: { engine: string; status: number | string }[];
  urlsSubmitted: number;
}> {
  console.log(`[Search Engine Ping] 🔔 Notifying all engines about: ${slug}`);

  const urls: string[] = [];

  // English (default locale, no prefix)
  if (locales.includes('en')) {
    urls.push(`${SITE_URL}/education/${slug}`);
  }

  // All other locales with prefix
  for (const locale of locales) {
    if (locale === 'en') continue;
    urls.push(`${SITE_URL}/${locale}/education/${slug}`);
  }

  // Also notify about sitemap itself
  urls.push(SITEMAP_URL);

  const [indexNow, sitemapPing] = await Promise.all([
    submitToIndexNow(urls),
    pingSitemaps(),
  ]);

  console.log(`[Search Engine Ping] ✅ Done — ${urls.length} URLs submitted to ${indexNow.length + sitemapPing.length} engines`);

  return { indexNow, sitemapPing, urlsSubmitted: urls.length };
}

/**
 * 🌐 FULL SITE PING — Submit ALL pages × ALL locales to all search engines.
 * 
 * This submits:
 * - All static pages (/, /about, /library, etc.) × 30 locales = 210 URLs
 * - All blog post slugs × 30 locales (fetched from DB)
 * - Sitemap URL
 * 
 * Use this for initial setup or periodic re-submission.
 */
export async function pingAllPages(
  blogSlugs: string[] = [],
): Promise<{
  indexNow: { engine: string; status: number | string }[];
  sitemapPing: { engine: string; status: number | string }[];
  urlsSubmitted: number;
  breakdown: {
    staticPages: number;
    blogPages: number;
    total: number;
  };
}> {
  console.log(`[Full Site Ping] 🌐 Submitting ALL site pages to all search engines...`);

  const urls: string[] = [];

  // 1. Static pages × all locales
  for (const page of STATIC_PAGES) {
    urls.push(...generateLocaleUrls(page));
  }
  const staticCount = urls.length;
  console.log(`[Full Site Ping] 📄 Static pages: ${staticCount} URLs (${STATIC_PAGES.length} pages × ${LOCALES.length} locales)`);

  // 2. Blog posts × all locales
  for (const slug of blogSlugs) {
    urls.push(...generateLocaleUrls(`/education/${slug}`));
  }
  const blogCount = urls.length - staticCount;
  console.log(`[Full Site Ping] 📝 Blog pages: ${blogCount} URLs (${blogSlugs.length} posts × ${LOCALES.length} locales)`);

  // 3. Sitemap URL itself
  urls.push(SITEMAP_URL);

  console.log(`[Full Site Ping] 📊 Total: ${urls.length} URLs`);

  // Submit everything
  const [indexNow, sitemapPing] = await Promise.all([
    submitToIndexNow(urls),
    pingSitemaps(),
  ]);

  console.log(`[Full Site Ping] ✅ Done — ${urls.length} URLs → ${indexNow.length + sitemapPing.length} engines`);

  return {
    indexNow,
    sitemapPing,
    urlsSubmitted: urls.length,
    breakdown: {
      staticPages: staticCount,
      blogPages: blogCount,
      total: urls.length,
    },
  };
}

/**
 * Quick ping for a single URL.
 */
export async function pingUrl(url: string): Promise<void> {
  try {
    await fetch(`${INDEXNOW_ENDPOINTS[0]}?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    console.log(`[IndexNow] Quick ping: ${url}`);
  } catch {
    // Non-blocking
  }
}
