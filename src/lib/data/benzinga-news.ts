/**
 * Benzinga News – Massive.com API üzerinden (FMP yerine).
 * Stage 2 piyasa verisi için FMP (fmp-data-executor) kullanılmaya devam eder.
 *
 * Massive API: GET https://api.massive.com/benzinga/v2/news
 * Auth: apiKey query param (MASSIVE_API_KEY)
 * Docs: https://massive.com/docs/rest/partners/benzinga/news
 * Param: published (integer seconds veya yyyy-mm-dd), limit, sort
 * Response: { status, results: [...] } – dizi doğrudan değil, results içinde.
 */

export interface MassiveBenzingaItem {
  benzinga_id: number;
  author?: string;
  published?: string;
  last_updated?: string;
  title: string;
  teaser?: string;
  body?: string;
  url?: string;
  tickers?: string[];
  channels?: string[];
  tags?: string[];
}

export interface NewsItemFromSource {
  id: string;
  title: string;
  url: string;
  source: string;
  published_on: number;
  content: string;
  category: string;
  tickers: string[];
}

const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY || '';
const MASSIVE_BENZINGA_NEWS_URL = 'https://api.massive.com/benzinga/v2/news';

function parsePublished(published: string | undefined): number {
  if (!published) return Math.floor(Date.now() / 1000);
  const ms = Date.parse(published);
  return Number.isNaN(ms) ? Math.floor(Date.now() / 1000) : Math.floor(ms / 1000);
}

function channelsToCategory(channels: string[] | undefined): string {
  if (!channels?.length) return 'stocks';
  const name = (channels[0] || '').toLowerCase();
  if (name.includes('crypto') || name.includes('bitcoin')) return 'crypto';
  if (name.includes('forex') || name.includes('fx')) return 'forex';
  if (name.includes('option') || name.includes('stock')) return 'stocks';
  return 'stocks';
}

/**
 * Massive Benzinga endpoint'inden son N saatte yayınlanan haberleri çeker.
 * İçerik: makale (body) varsa body, yoksa title. AI'ya sadece zaman + bu içerik iletilir.
 * Cron ile uyumlu NewsItemFromSource[] döner.
 *
 * channels: Sadece bu kanala ait haberler (örn. "Latest" = site /recent ile uyumlu).
 * Verilmezse tüm kanallar döner (earnings, insights vb. dahil).
 */
export async function fetchBenzingaNews(options?: {
  lookbackHours?: number;
  pageSize?: number;
  displayOutput?: 'headline' | 'abstract' | 'full';
  /** Massive API channels filtresi – örn. "Latest" = benzinga.com/recent ile uyumlu */
  channels?: string;
}): Promise<NewsItemFromSource[]> {
  if (!MASSIVE_API_KEY) {
    console.warn('[Benzinga] MASSIVE_API_KEY not configured');
    return [];
  }

  const lookbackHours = options?.lookbackHours ?? 2;
  const limit = Math.min(options?.pageSize ?? 500, 50000);

  // Massive: published = integer timestamp (seconds) veya yyyy-mm-dd
  const publishedSince = Math.floor((Date.now() - lookbackHours * 60 * 60 * 1000) / 1000);
  const params = new URLSearchParams({
    apiKey: MASSIVE_API_KEY,
    limit: String(limit),
    published: String(publishedSince),
    sort: 'published.desc',
  });
  if (options?.channels?.trim()) {
    params.set('channels', options.channels.trim());
  }

  try {
    const res = await fetch(`${MASSIVE_BENZINGA_NEWS_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[Benzinga/Massive] API error', res.status, await res.text());
      return [];
    }

    const json = (await res.json()) as {
      status?: string;
      results?: MassiveBenzingaItem[];
      next_url?: string;
      request_id?: string;
    };
    const data = json.results;
    if (!Array.isArray(data) || data.length === 0) return [];

    const windowStart = Date.now() / 1000 - lookbackHours * 3600;
    const items: NewsItemFromSource[] = data
      .filter((a) => a?.title)
      .map((a) => {
        const published_on = parsePublished(a.published);
        // Sadece makale varsa makale, yoksa title (teaser kullanılmıyor; AI'ya sadece bunlar iletilir)
        const rawBody = (a.body || '').trim();
        const content = rawBody ? rawBody.slice(0, 12000) : (a.title || '').trim();
        const tickers = (a.tickers || []).map((t) => String(t).toUpperCase()).filter(Boolean);
        const category = channelsToCategory(a.channels);

        return {
          id: `benzinga-${a.benzinga_id}`,
          title: (a.title || '').trim(),
          url: (a.url || '').trim() || `https://www.benzinga.com/news/${a.benzinga_id}`,
          source: (a.author || 'Benzinga').trim(),
          published_on,
          content: content || (a.title || '').trim(),
          category,
          tickers,
        };
      })
      .filter((item) => item.published_on >= windowStart);

    return items;
  } catch (e) {
    console.error('[Benzinga/Massive] fetch error:', e);
    return [];
  }
}
