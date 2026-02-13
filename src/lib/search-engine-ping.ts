/**
 * ═══════════════════════════════════════════════════════════════
 * SEARCH ENGINE PING — IndexNow + Sitemap Ping
 * ═══════════════════════════════════════════════════════════════
 *
 * Notifies ALL major search engines when new content is published.
 *
 * 1. IndexNow API → Bing, Yandex, Seznam.cz, Naver, Yep
 * 2. Google Ping → /ping?sitemap=...
 * 3. Bing Sitemap Ping → /ping?sitemap=...
 * 4. Yandex Sitemap Ping → /ping?sitemap=...
 *
 * Called automatically after each blog post is published.
 */

const SITE_URL = 'https://fibalgo.com';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const INDEXNOW_KEY = 'be7fb56cfe924b0ab6c97b4971af199e';
const INDEXNOW_KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

// All IndexNow-compatible search engines
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',      // Generic (routes to all)
  'https://www.bing.com/indexnow',           // Bing
  'https://yandex.com/indexnow',             // Yandex
  'https://search.seznam.cz/indexnow',       // Seznam (Czech)
  'https://searchadvisor.naver.com/indexnow', // Naver (Korea)
];

// Sitemap ping endpoints (legacy but still supported)
const SITEMAP_PING_URLS = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
];

/**
 * Ping IndexNow with a list of URLs.
 * One request to api.indexnow.org automatically distributes to all
 * IndexNow-participating engines, but we also ping each directly for reliability.
 */
async function pingIndexNow(urls: string[]): Promise<{ engine: string; status: number | string }[]> {
  const results: { engine: string; status: number | string }[] = [];

  // Primary: Bulk submission via api.indexnow.org (distributes to all engines)
  try {
    const body = JSON.stringify({
      host: 'fibalgo.com',
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: urls,
    });

    const res = await fetch(INDEXNOW_ENDPOINTS[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
      signal: AbortSignal.timeout(10000),
    });

    results.push({ engine: 'IndexNow (all)', status: res.status });
    console.log(`[IndexNow] api.indexnow.org → ${res.status} (${urls.length} URLs)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    results.push({ engine: 'IndexNow (all)', status: `error: ${msg}` });
    console.error(`[IndexNow] api.indexnow.org failed:`, msg);
  }

  // Fallback: Also ping individual engines with GET for single URL
  // (in case the bulk endpoint had issues)
  if (urls.length <= 5) {
    const directPings = INDEXNOW_ENDPOINTS.slice(1).map(async (endpoint) => {
      const engineName = new URL(endpoint).hostname;
      try {
        const params = new URLSearchParams({
          url: urls[0],
          key: INDEXNOW_KEY,
          keyLocation: INDEXNOW_KEY_LOCATION,
        });
        const res = await fetch(`${endpoint}?${params}`, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
        });
        results.push({ engine: engineName, status: res.status });
        console.log(`[IndexNow] ${engineName} → ${res.status}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        results.push({ engine: engineName, status: `error: ${msg}` });
      }
    });

    await Promise.allSettled(directPings);
  }

  return results;
}

/**
 * Ping Google & Bing sitemap endpoints (legacy method, still works).
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

/**
 * Main function: Notify all search engines about new blog post URLs.
 * Generates URLs for all 30 locales of the given slug.
 *
 * @param slug - The blog post slug (e.g. "forex-trading-strategies")
 * @param locales - Array of locale codes to generate URLs for
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

  // Generate URLs for all available locales
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

  // Also notify about sitemap itself (so engines re-crawl it)
  urls.push(SITEMAP_URL);

  // Execute all pings in parallel
  const [indexNow, sitemapPing] = await Promise.all([
    pingIndexNow(urls),
    pingSitemaps(),
  ]);

  console.log(`[Search Engine Ping] ✅ Done — ${urls.length} URLs submitted to ${indexNow.length + sitemapPing.length} engines`);

  return {
    indexNow,
    sitemapPing,
    urlsSubmitted: urls.length,
  };
}

/**
 * Quick ping for a single URL (useful for page updates).
 */
export async function pingUrl(url: string): Promise<void> {
  try {
    await fetch(`${INDEXNOW_ENDPOINTS[0]}?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    console.log(`[IndexNow] Quick ping: ${url}`);
  } catch {
    // Non-blocking — failures are OK
  }
}
