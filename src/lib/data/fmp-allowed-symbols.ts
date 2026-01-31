/**
 * FMP allowed symbols – single source of truth for Stage 1 affected_assets.
 * Uses full static list (fmp-symbols-full) + optional FMP API (stock-list, forex-list, commodities-list).
 */

import {
  ALL_FMP_FOREX,
  ALL_FMP_COMMODITIES,
  ALL_FMP_INDICES,
  ALL_FMP_CRYPTO,
  ALL_FMP_STOCKS_ETFS,
  ALL_FMP_SYMBOLS,
} from './fmp-symbols-full';

const FMP_STABLE_BASE_URL = 'https://financialmodelingprep.com/stable';

function getFmpApiKey(): string | null {
  return process.env.FMP_API_KEY || null;
}

async function fmpFetch<T>(path: string): Promise<T | null> {
  const key = getFmpApiKey();
  if (!key) return null;
  const sep = path.includes('?') ? '&' : '?';
  const url = `${FMP_STABLE_BASE_URL}${path}${sep}apikey=${key}`;
  try {
    const resp = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

let cache: { set: Set<string>; promptBlock: string; source: 'fmp_api' | 'fallback'; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function buildSet(apiStocks: string[], apiForex: string[], apiCommodities: string[]): Set<string> {
  const set = new Set<string>();
  // Base: full static list (all correct FMP spellings)
  for (const s of ALL_FMP_SYMBOLS) set.add(String(s).toUpperCase().trim());
  // Add any extra from API
  for (const s of apiForex) {
    const t = String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (t.length === 6) set.add(t);
  }
  for (const s of apiCommodities) {
    const t = String(s).toUpperCase().trim();
    if (t && /^[A-Z0-9]{2,10}$/.test(t)) set.add(t);
  }
  for (const s of apiStocks) {
    const t = String(s).toUpperCase().trim();
    if (t && /^[A-Z0-9.]{1,10}$/.test(t)) set.add(t);
  }
  return set;
}

function buildPromptBlock(): string {
  const forexList = [...ALL_FMP_FOREX].join(', ');
  const commoditiesList = [...ALL_FMP_COMMODITIES].join(', ');
  const indicesList = [...ALL_FMP_INDICES].join(', ');
  const cryptoList = [...ALL_FMP_CRYPTO].join(', ');
  const stockExamples = [...new Set(ALL_FMP_STOCKS_ETFS)].slice(0, 200).join(', ');
  return `- Forex (use ONLY these exact 6-letter symbols): ${forexList}
- Commodities (use ONLY these): ${commoditiesList}
- Indices (use ONLY these): ${indicesList}
- Crypto (use ONLY these BASEUSD symbols): ${cryptoList}
- Stocks/ETFs: use ONLY the exact ticker (no suffix). Examples: ${stockExamples}. Do NOT use "AAPLUSD" or "SBUXUSD" – use "AAPL", "SBUX".`;
}

export interface FmpAllowedSymbolsResult {
  allowedSet: Set<string>;
  promptBlock: string;
  source: 'fmp_api' | 'fallback';
}

/**
 * Returns allowed FMP symbol set and prompt text. Uses full static list (all correct spellings)
 * and optionally merges in FMP API stock-list, forex-list, commodities-list when available.
 */
export async function getFmpAllowedSymbols(): Promise<FmpAllowedSymbolsResult> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { allowedSet: cache.set, promptBlock: cache.promptBlock, source: cache.source };
  }

  const [stockData, forexData, commoditiesData] = await Promise.all([
    fmpFetch<Array<{ symbol?: string }>>('/stock-list'),
    fmpFetch<Array<{ symbol?: string; ticker?: string }>>('/forex-list'),
    fmpFetch<Array<{ symbol?: string }>>('/commodities-list'),
  ]);

  const apiStocks: string[] = [];
  if (Array.isArray(stockData) && stockData.length > 0) {
    for (const row of stockData) {
      const r = row as { symbol?: string; ticker?: string };
      const s = r?.symbol ?? r?.ticker;
      if (typeof s === 'string' && /^[A-Z0-9.]{1,10}$/.test(s.trim())) apiStocks.push(s.trim().toUpperCase());
    }
  }

  const apiForex: string[] = [];
  if (Array.isArray(forexData) && forexData.length > 0) {
    for (const row of forexData) {
      const s = (row?.symbol ?? row?.ticker ?? '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (s.length === 6) apiForex.push(s);
    }
  }

  const apiCommodities: string[] = [];
  if (Array.isArray(commoditiesData) && commoditiesData.length > 0) {
    for (const row of commoditiesData) {
      const s = (row?.symbol ?? '').toString().toUpperCase().trim();
      if (s && /^[A-Z0-9]{2,10}$/.test(s)) apiCommodities.push(s);
    }
  }

  const allowedSet = buildSet(apiStocks, apiForex, apiCommodities);
  const promptBlock = buildPromptBlock();
  const source: 'fmp_api' | 'fallback' = apiStocks.length > 0 || apiForex.length > 0 || apiCommodities.length > 0 ? 'fmp_api' : 'fallback';

  cache = {
    set: allowedSet,
    promptBlock,
    source,
    fetchedAt: Date.now(),
  };
  return { allowedSet, promptBlock, source };
}

/**
 * Validate and fix affected_assets: only keep symbols in allowedSet; fix common mistakes (e.g. AAPLUSD -> AAPL).
 */
export function validateAndFixAffectedAssets(
  assets: string[],
  allowedSet: Set<string>
): string[] {
  const out: string[] = [];
  for (const a of assets ?? []) {
    const raw = String(a ?? '').trim().toUpperCase().replace(/\$/g, '');
    if (!raw) continue;
    if (allowedSet.has(raw)) {
      out.push(raw);
      continue;
    }
    // Fix stock+USD suffix (AAPLUSD -> AAPL)
    if (raw.endsWith('USD') && raw.length >= 7) {
      const base = raw.slice(0, -3);
      if (allowedSet.has(base)) {
        out.push(base);
        continue;
      }
    }
    // Already correct or unknown – skip (do not pass invalid symbols to FMP)
  }
  return [...new Set(out)];
}
