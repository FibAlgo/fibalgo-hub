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
 *  - pingAllPages()              → FULL SITE — fetches sitemap.xml, extracts
 *                                   every URL, submits ALL to IndexNow.
 *                                   100% automatic — any page in the sitemap
 *                                   is included. No manual lists to maintain.
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
 * Extract all <loc>...</loc> URLs from sitemap XML.
 * Works with both standard sitemaps and sitemap indexes.
 */
function extractUrlsFromSitemapXml(xml: string): string[] {
  const urls: string[] = [];
  const regex = /<loc>\s*(https?:\/\/[^<]+?)\s*<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

/**
 * Fetch sitemap.xml from production and extract ALL URLs.
 * This is the single source of truth — whatever is in the sitemap
 * gets submitted to search engines. No manual lists to maintain.
 */
async function fetchAllSitemapUrls(): Promise<string[]> {
  try {
    const res = await fetch(SITEMAP_URL, {
      headers: { 'User-Agent': 'FibAlgo-IndexNow-Bot/1.0' },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.error(`[Sitemap Fetch] Failed to fetch sitemap: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const urls = extractUrlsFromSitemapXml(xml);

    console.log(`[Sitemap Fetch] ✅ Extracted ${urls.length} URLs from sitemap.xml`);
    return urls;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error(`[Sitemap Fetch] ❌ Error fetching sitemap:`, msg);
    return [];
  }
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
 * 🌐 FULL SITE PING — Fetches sitemap.xml and submits EVERY URL to all search engines.
 * 
 * This is 100% automatic:
 * - Fetches the live sitemap.xml from production
 * - Extracts every single <loc> URL
 * - Submits ALL of them to IndexNow (Bing, Yandex, Seznam, Naver)
 * - Pings Google & Bing sitemap endpoints
 * 
 * Any new page, blog post, category, or locale added to the sitemap
 * is automatically included — zero manual maintenance.
 */
export async function pingAllPages(): Promise<{
  indexNow: { engine: string; status: number | string }[];
  sitemapPing: { engine: string; status: number | string }[];
  urlsSubmitted: number;
  breakdown: {
    staticPages: number;
    blogPages: number;
    categoryPages: number;
    otherPages: number;
    total: number;
  };
}> {
  console.log(`[Full Site Ping] 🌐 Fetching sitemap.xml and submitting ALL URLs to all search engines...`);

  // Fetch ALL URLs from the live sitemap — single source of truth
  const allUrls = await fetchAllSitemapUrls();

  if (allUrls.length === 0) {
    console.error(`[Full Site Ping] ❌ No URLs found in sitemap — aborting`);
    return {
      indexNow: [],
      sitemapPing: [],
      urlsSubmitted: 0,
      breakdown: { staticPages: 0, blogPages: 0, categoryPages: 0, otherPages: 0, total: 0 },
    };
  }

  // Add sitemap URL itself
  const urls = [...allUrls, SITEMAP_URL];

  // Categorize for reporting
  let blogCount = 0;
  let categoryCount = 0;
  let staticCount = 0;
  for (const url of allUrls) {
    const path = url.replace(SITE_URL, '').replace(/^\/[a-z]{2}\//, '/').replace(/^\/[a-z]{2}$/, '/');
    if (path.startsWith('/education/category/')) {
      categoryCount++;
    } else if (path.startsWith('/education/') && path !== '/education' && path !== '/education/') {
      blogCount++;
    } else {
      staticCount++;
    }
  }

  console.log(`[Full Site Ping] 📄 Static pages: ${staticCount}`);
  console.log(`[Full Site Ping] 📝 Blog pages: ${blogCount}`);
  console.log(`[Full Site Ping] 🏷️ Category pages: ${categoryCount}`);
  console.log(`[Full Site Ping] 📊 Total: ${urls.length} URLs (including sitemap.xml)`);

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
      categoryPages: categoryCount,
      otherPages: urls.length - staticCount - blogCount - categoryCount,
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
