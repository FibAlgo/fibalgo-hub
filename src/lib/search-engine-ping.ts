/**
 * ═══════════════════════════════════════════════════════════════
 * SEARCH ENGINE PING — IndexNow + Google Indexing API + Sitemap
 * ═══════════════════════════════════════════════════════════════
 *
 * Notifies ALL major search engines about site content.
 *
 * 1. IndexNow API    → Bing, Yandex, Seznam.cz, Naver (INSTANT)
 * 2. Google Indexing API → Direct URL submission to Google (FAST)
 * 3. Google Ping     → /ping?sitemap=... (fallback)
 * 4. Bing Sitemap    → /ping?sitemap=...
 *
 * Two modes:
 *  - notifySearchEngines(slug)   → single blog post (called after publish)
 *  - pingAllPages()              → FULL SITE — fetches sitemap.xml, extracts
 *                                   every URL, submits ALL to IndexNow +
 *                                   Google Indexing API.
 */

import { GoogleAuth } from 'google-auth-library';

const SITE_URL = 'https://fibalgo.com';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const INDEXNOW_KEY = 'be7fb56cfe924b0ab6c97b4971af199e';
const INDEXNOW_KEY_LOCATION = `${SITE_URL}/api/indexnow-key`;

// Google Indexing API config
const GOOGLE_INDEXING_API = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

/**
 * Get Google service account credentials from env var.
 * Set GOOGLE_SERVICE_ACCOUNT_JSON with the full JSON content.
 */
function getGoogleCredentials(): Record<string, string> | null {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;
  try {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch { return null; }
}

/**
 * Get authenticated Google client for Indexing API
 */
async function getGoogleAuthClient() {
  const credentials = getGoogleCredentials();
  if (!credentials) return null;

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });

  return auth.getClient();
}

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
 * Submit URLs to Google Indexing API.
 * Uses service account auth — much faster than sitemap ping.
 * Google Indexing API supports URL_UPDATED and URL_DELETED.
 * Rate limit: ~200 requests/day for new properties, scales up over time.
 */
async function submitToGoogleIndexing(
  urls: string[],
): Promise<{ engine: string; status: number | string }[]> {
  const results: { engine: string; status: number | string }[] = [];

  let client;
  try {
    client = await getGoogleAuthClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error(`[Google Indexing] ❌ Auth failed:`, msg);
    results.push({ engine: 'Google Indexing API', status: `auth-error: ${msg}` });
    return results;
  }

  if (!client) {
    console.warn(`[Google Indexing] ⚠️ No credentials found — skipping Google Indexing API`);
    results.push({ engine: 'Google Indexing API', status: 'no-credentials' });
    return results;
  }

  // Google Indexing API accepts single URL per request
  // We batch with concurrency limit to avoid rate limiting
  const CONCURRENCY = 5;
  let successCount = 0;
  let errorCount = 0;
  const rateLimitErrors: string[] = [];

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);

    const batchResults = await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const accessToken = await client.getAccessToken();
          const token = typeof accessToken === 'string' ? accessToken : accessToken?.token;

          const res = await fetch(GOOGLE_INDEXING_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              url,
              type: 'URL_UPDATED',
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (res.ok) {
            successCount++;
          } else if (res.status === 429) {
            rateLimitErrors.push(url);
          } else {
            errorCount++;
            const text = await res.text().catch(() => '');
            console.error(`[Google Indexing] ❌ ${url} → ${res.status}: ${text.slice(0, 200)}`);
          }
          return res.status;
        } catch (err) {
          errorCount++;
          const msg = err instanceof Error ? err.message : 'unknown';
          console.error(`[Google Indexing] ❌ ${url} → error: ${msg}`);
          return `error: ${msg}`;
        }
      }),
    );

    // If we hit rate limits, stop sending more
    if (rateLimitErrors.length > 0) {
      console.warn(`[Google Indexing] ⚠️ Rate limited at URL ${i + batch.length}/${urls.length} — stopping`);
      break;
    }

    // Small delay between batches to be kind to the API
    if (i + CONCURRENCY < urls.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const status = rateLimitErrors.length > 0
    ? `${successCount} ok, ${rateLimitErrors.length} rate-limited, ${errorCount} errors`
    : `${successCount} ok, ${errorCount} errors`;

  results.push({ engine: 'Google Indexing API', status });
  console.log(`[Google Indexing] 📊 ${status} (${urls.length} total URLs)`);

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
  googleIndexing: { engine: string; status: number | string }[];
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

  const [indexNow, googleIndexing, sitemapPing] = await Promise.all([
    submitToIndexNow(urls),
    submitToGoogleIndexing(urls),
    pingSitemaps(),
  ]);

  const totalEngines = indexNow.length + googleIndexing.length + sitemapPing.length;
  console.log(`[Search Engine Ping] ✅ Done — ${urls.length} URLs submitted to ${totalEngines} engines (incl. Google Indexing API)`);

  return { indexNow, googleIndexing, sitemapPing, urlsSubmitted: urls.length };
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
  googleIndexing: { engine: string; status: number | string }[];
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
      googleIndexing: [],
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

  // For Google Indexing API, prioritize blog pages (most important for SEO)
  // Google has daily quota (~200 for new properties), so send blog pages first
  const prioritizedUrls = [...urls].sort((a, b) => {
    const aIsBlog = a.includes('/education/') && !a.includes('/category/');
    const bIsBlog = b.includes('/education/') && !b.includes('/category/');
    if (aIsBlog && !bIsBlog) return -1;
    if (!aIsBlog && bIsBlog) return 1;
    return 0;
  });

  // Submit everything
  const [indexNow, googleIndexing, sitemapPing] = await Promise.all([
    submitToIndexNow(urls),
    submitToGoogleIndexing(prioritizedUrls),
    pingSitemaps(),
  ]);

  const totalEngines = indexNow.length + googleIndexing.length + sitemapPing.length;
  console.log(`[Full Site Ping] ✅ Done — ${urls.length} URLs → ${totalEngines} engines (incl. Google Indexing API)`);

  return {
    indexNow,
    googleIndexing,
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
