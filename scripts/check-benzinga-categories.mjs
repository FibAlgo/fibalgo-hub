
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const MASSIVE_BENZINGA_NEWS_URL = 'https://api.massive.com/benzinga/v2/news';

function channelsToCategory(channels) {
  if (!Array.isArray(channels) || channels.length === 0) return 'stocks';
  const name = String(channels[0] || '').toLowerCase();
  if (name.includes('crypto') || name.includes('bitcoin')) return 'crypto';
  if (name.includes('forex') || name.includes('fx')) return 'forex';
  if (name.includes('option') || name.includes('stock')) return 'stocks';
  return 'stocks';
}

function inc(map, key) {
  const k = key && String(key).trim() ? String(key).trim() : 'unknown';
  map[k] = (map[k] || 0) + 1;
}

function normalizeNextUrl(nextUrl, apiKey) {
  if (!nextUrl) return null;
  let url;
  try {
    url = new URL(nextUrl, MASSIVE_BENZINGA_NEWS_URL);
  } catch {
    return null;
  }

  if (apiKey && !url.searchParams.get('apiKey')) {
    url.searchParams.set('apiKey', apiKey);
  }
  return url.toString();
}

async function fetchAllBenzingaNewsLastHours({
  lookbackHours = 24,
  limitPerPage = 1000,
  maxPages = 10,
}) {
  const apiKey = process.env.MASSIVE_API_KEY || '';
  if (!apiKey) {
    console.error('Missing env var MASSIVE_API_KEY');
    return [];
  }

  const publishedSince = Math.floor((Date.now() - lookbackHours * 60 * 60 * 1000) / 1000);
  const channelsFilter = (process.env.BENZINGA_CHANNELS || '').trim();
  const params = new URLSearchParams({
    apiKey,
    limit: String(limitPerPage),
    published: String(publishedSince),
    sort: 'published.desc',
  });
  if (channelsFilter) params.set('channels', channelsFilter);

  let url = `${MASSIVE_BENZINGA_NEWS_URL}?${params.toString()}`;
  const all = [];
  const timeoutMs = Number(process.env.BENZINGA_TIMEOUT_MS || 20000);

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Massive Benzinga API error: ${res.status} ${body}`);
    }

    const json = await res.json();
    const results = Array.isArray(json?.results) ? json.results : [];
    all.push(...results);

    console.log(`Page ${page}: +${results.length} (total ${all.length})`);

    const nextUrl = normalizeNextUrl(json?.next_url, apiKey);
    if (!nextUrl || results.length === 0) break;
    url = nextUrl;
  }

  return all;
}

async function analyzeBenzingaCategories() {
  console.log('Fetching Benzinga news (Massive API) for the last 24 hours...');

  try {
    const items = await fetchAllBenzingaNewsLastHours({
      lookbackHours: 24,
      limitPerPage: Number(process.env.BENZINGA_LIMIT_PER_PAGE || 1000),
      maxPages: Number(process.env.BENZINGA_MAX_PAGES || 10),
    });

    const channelsFilter = (process.env.BENZINGA_CHANNELS || '').trim();

    if (!items.length) {
      console.log('No news items found in the last 24 hours (or API returned empty).');
      return;
    }

    const categoryCounts = Object.create(null);
    const channelCounts = Object.create(null);
    const sourceCounts = Object.create(null);

    for (const item of items) {
      const channels = item?.channels;
      inc(categoryCounts, channelsToCategory(channels));
      inc(sourceCounts, item?.author || 'Benzinga');

      if (Array.isArray(channels) && channels.length) {
        for (const ch of channels) inc(channelCounts, ch);
      } else {
        inc(channelCounts, 'unknown');
      }
    }

    const sortEntries = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const topN = (entries, n) => entries.slice(0, n);

    console.log(`\nFetched ${items.length} items (24h window).`);
    if (channelsFilter) console.log(`Server-side channels filter: ${channelsFilter}`);

    console.log('\n--- Category (inferred from first channel) ---');
    for (const [k, v] of sortEntries(categoryCounts)) console.log(`${k}: ${v}`);

    console.log('\n--- Top channels (all channel tags) ---');
    for (const [k, v] of topN(sortEntries(channelCounts), 30)) console.log(`${k}: ${v}`);

    console.log('\n--- Top authors ---');
    for (const [k, v] of topN(sortEntries(sourceCounts), 20)) console.log(`${k}: ${v}`);

    console.log(
      `\nControls: BENZINGA_LIMIT_PER_PAGE (default 1000), BENZINGA_MAX_PAGES (default 10)`
    );
  } catch (error) {
    console.error('Failed to fetch/analyze Benzinga news:', error?.message || error);
    process.exitCode = 1;
  }
}

await analyzeBenzingaCategories();
