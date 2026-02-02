/**
 * FMP Data Executor – Stage 1'den gelen fmp_requests listesini çalıştırır,
 * FMP Stable API'yi çağırır ve sonuçları Stage 3'e verilecek yapıda döner.
 * 
 * ÖNEMLİ: İstek sayısı sınırı YOK - AI istediği kadar veri talep edebilir.
 *
 * Katalog: docs/FMP-API-CATALOG.md
 */

import type { FmpDataRequest, FmpRequestType } from './fmp-request-types';
import { fetchFmpQuote, fetchFmpIntraday, mapToFmpSymbol } from './fmp-market';
import type { FmpInterval } from './fmp-market';

const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';

function getApiKey(): string | null {
  return process.env.FMP_API_KEY || null;
}

async function fmpFetch<T>(pathWithQuery: string, timeout = 15000): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  
  const sep = pathWithQuery.includes('?') ? '&' : '?';
  const url = `${FMP_STABLE_BASE}${pathWithQuery}${sep}apikey=${apiKey}`;
  
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface FmpCollectedPack {
  generatedAt: string;
  byType: Partial<Record<FmpRequestType, Record<string, unknown> | unknown[]>>;
  errors: string[];
  requestCount: number;
  successCount: number;
}

// Symbol mapping helper
function mapSymbols(symbols: string[]): string[] {
  return symbols.map(s => mapToFmpSymbol(s));
}

// No limit on symbol count anymore
function clampSymbols(
  symbols: string[] | undefined,
  allowedSet: Set<string> | null
): string[] {
  const list = Array.isArray(symbols) ? symbols.filter(Boolean) : [];
  if (!allowedSet || allowedSet.size === 0) return list;
  return list.filter((s) => allowedSet.has(String(s).trim().toUpperCase()));
}

export async function executeFmpRequests(
  requests: FmpDataRequest[],
  options: {
    allowedSymbols?: Set<string> | null;
    newsDate?: string; // ISO date for calendar/economic windows
  } = {}
): Promise<FmpCollectedPack> {
  const allowedSet = options.allowedSymbols ?? null;
  const byType: FmpCollectedPack['byType'] = {};
  const errors: string[] = [];
  const newsDate = options.newsDate ? new Date(options.newsDate) : new Date();

  // NO LIMIT - process all requests
  const list = Array.isArray(requests) ? requests : [];
  let successCount = 0;

  for (const req of list) {
    const type = (req?.type as FmpRequestType) || '';
    const rawSymbols = clampSymbols(req?.symbols, allowedSet);
    const symbols = mapSymbols(rawSymbols); // Apply FMP mapping
    const params = req?.params || {};

    try {
      switch (type) {
        // ═══ QUOTES ═══
        case 'quote': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols.length ? symbols : []) {
            const q = await fetchFmpQuote(sym);
            if (q) out[sym] = q;
          }
          if (Object.keys(out).length) { byType.quote = out; successCount++; }
          break;
        }
        case 'batch_quote': {
          if (symbols.length) {
            const path = `/batch-quote?symbols=${symbols.map((s) => encodeURIComponent(s)).join(',')}`;
            const data = await fmpFetch<unknown[]>(path);
            if (data?.length) { byType.batch_quote = data; successCount++; }
          }
          break;
        }
        case 'batch_index_quotes': {
          const data = await fmpFetch<unknown[]>('/batch-index-quotes');
          if (data?.length) { byType.batch_index_quotes = data; successCount++; }
          break;
        }
        case 'batch_forex_quotes': {
          const data = await fmpFetch<unknown[]>('/batch-forex-quotes');
          if (data?.length) { byType.batch_forex_quotes = data; successCount++; }
          break;
        }
        case 'batch_commodity_quotes': {
          const data = await fmpFetch<unknown[]>('/batch-commodity-quotes');
          if (data?.length) { byType.batch_commodity_quotes = data; successCount++; }
          break;
        }
        case 'batch_crypto_quotes': {
          const data = await fmpFetch<unknown[]>('/batch-crypto-quotes');
          if (data?.length) { byType.batch_crypto_quotes = data; successCount++; }
          break;
        }

        // ═══ CHARTS ═══
        case 'intraday': {
          const interval = (params.interval as FmpInterval) || '1hour';
          const lookback = Math.min(Math.max(Number(params.lookback_minutes) || 120, 1), 4320);
          const limit = Math.ceil(lookback / (interval === '1min' ? 1 : interval === '5min' ? 5 : 60));
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const candles = await fetchFmpIntraday(sym, interval, limit);
            if (candles.length) out[sym] = { interval, lookback_minutes: lookback, candles };
          }
          if (Object.keys(out).length) { byType.intraday = out; successCount++; }
          break;
        }
        case 'eod': {
          const lookbackDays = Math.min(Math.max(Number(params.lookback_days) || 30, 1), 365);
          const to = newsDate;
          const from = new Date(to);
          from.setDate(from.getDate() - lookbackDays);
          const fromStr = from.toISOString().slice(0, 10);
          const toStr = to.toISOString().slice(0, 10);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/historical-price-eod/light?symbol=${encodeURIComponent(sym)}&from=${fromStr}&to=${toStr}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.eod = out; successCount++; }
          break;
        }

        // ═══ COMPANY ═══
        case 'profile': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/profile?symbol=${encodeURIComponent(sym)}`);
            const row = Array.isArray(data) ? data[0] : null;
            if (row) out[sym] = row;
          }
          if (Object.keys(out).length) { byType.profile = out; successCount++; }
          break;
        }
        case 'key_executives': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/key-executives?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.key_executives = out; successCount++; }
          break;
        }
        case 'stock_peers': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<Array<{ peersList: string[] }>>(`/stock-peers?symbol=${encodeURIComponent(sym)}`);
            if (data?.[0]?.peersList) out[sym] = data[0].peersList;
          }
          if (Object.keys(out).length) { byType.stock_peers = out; successCount++; }
          break;
        }

        // ═══ FINANCIALS ═══
        case 'income_statement': {
          const period = (params.period as string) || 'annual';
          const limit = Math.min(Number(params.limit) || 4, 10);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/income-statement?symbol=${encodeURIComponent(sym)}&period=${period}&limit=${limit}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.income_statement = out; successCount++; }
          break;
        }
        case 'balance_sheet': {
          const period = (params.period as string) || 'annual';
          const limit = Math.min(Number(params.limit) || 4, 10);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/balance-sheet-statement?symbol=${encodeURIComponent(sym)}&period=${period}&limit=${limit}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.balance_sheet = out; successCount++; }
          break;
        }
        case 'cash_flow': {
          const period = (params.period as string) || 'annual';
          const limit = Math.min(Number(params.limit) || 4, 10);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/cash-flow-statement?symbol=${encodeURIComponent(sym)}&period=${period}&limit=${limit}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.cash_flow = out; successCount++; }
          break;
        }
        case 'key_metrics': {
          const period = (params.period as string) || 'annual';
          const limit = Math.min(Number(params.limit) || 4, 10);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/key-metrics?symbol=${encodeURIComponent(sym)}&period=${period}&limit=${limit}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.key_metrics = out; successCount++; }
          break;
        }
        case 'ratios': {
          const period = (params.period as string) || 'annual';
          const limit = Math.min(Number(params.limit) || 4, 10);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/ratios?symbol=${encodeURIComponent(sym)}&period=${period}&limit=${limit}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.ratios = out; successCount++; }
          break;
        }
        case 'financial_scores': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/financial-scores?symbol=${encodeURIComponent(sym)}`);
            if (data?.[0]) out[sym] = data[0];
          }
          if (Object.keys(out).length) { byType.financial_scores = out; successCount++; }
          break;
        }

        // ═══ EARNINGS & DIVIDENDS ═══
        case 'earnings': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/earnings?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 8);
          }
          if (Object.keys(out).length) { byType.earnings = out; successCount++; }
          break;
        }
        case 'dividends': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/dividends?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 20);
          }
          if (Object.keys(out).length) { byType.dividends = out; successCount++; }
          break;
        }
        case 'earnings_calendar': {
          const from = new Date(newsDate);
          from.setDate(from.getDate() - 7);
          const to = new Date(newsDate);
          to.setDate(to.getDate() + 30);
          const data = await fmpFetch<unknown[]>(
            `/earnings-calendar?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`
          );
          if (Array.isArray(data) && data.length) { byType.earnings_calendar = data.slice(0, 100); successCount++; }
          break;
        }
        case 'dividends_calendar': {
          const from = new Date(newsDate);
          const to = new Date(newsDate);
          to.setDate(to.getDate() + 30);
          const data = await fmpFetch<unknown[]>(
            `/dividends-calendar?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`
          );
          if (Array.isArray(data) && data.length) { byType.dividends_calendar = data.slice(0, 50); successCount++; }
          break;
        }
        case 'ipo_calendar': {
          const from = new Date(newsDate);
          const to = new Date(newsDate);
          to.setDate(to.getDate() + 60);
          const data = await fmpFetch<unknown[]>(
            `/ipos-calendar?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`
          );
          if (Array.isArray(data) && data.length) { byType.ipo_calendar = data; successCount++; }
          break;
        }

        // ═══ ANALYST ═══
        case 'analyst_estimates': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/analyst-estimates?symbol=${encodeURIComponent(sym)}&limit=4`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.analyst_estimates = out; successCount++; }
          break;
        }
        case 'price_target': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown>(`/price-target-summary?symbol=${encodeURIComponent(sym)}`);
            if (data != null) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.price_target = out; successCount++; }
          break;
        }
        case 'analyst_ratings': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/ratings-snapshot?symbol=${encodeURIComponent(sym)}`);
            if (data?.[0]) out[sym] = data[0];
          }
          if (Object.keys(out).length) { byType.analyst_ratings = out; successCount++; }
          break;
        }
        case 'grades': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/grades?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 10);
          }
          if (Object.keys(out).length) { byType.grades = out; successCount++; }
          break;
        }

        // ═══ ECONOMIC (MACRO) ═══
        case 'treasury_rates': {
          const from = new Date(newsDate);
          from.setDate(from.getDate() - 30);
          const data = await fmpFetch<unknown[]>(
            `/treasury-rates?from=${from.toISOString().slice(0, 10)}&to=${newsDate.toISOString().slice(0, 10)}`
          );
          if (Array.isArray(data) && data.length) { byType.treasury_rates = data; successCount++; }
          break;
        }
        case 'economic_indicators': {
          const name = (params.indicator_name as string) || 'GDP';
          const from = new Date(newsDate);
          from.setFullYear(from.getFullYear() - 2);
          const data = await fmpFetch<unknown[]>(
            `/economic-indicators?name=${encodeURIComponent(name)}&from=${from.toISOString().slice(0, 10)}&to=${newsDate.toISOString().slice(0, 10)}`
          );
          if (Array.isArray(data) && data.length) { byType.economic_indicators = data; successCount++; }
          break;
        }
        case 'economic_calendar': {
          const from = new Date(newsDate);
          from.setDate(from.getDate() - 3);
          const to = new Date(newsDate);
          to.setDate(to.getDate() + 14);
          const data = await fmpFetch<unknown[]>(
            `/economic-calendar?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`
          );
          if (Array.isArray(data) && data.length) { byType.economic_calendar = data.slice(0, 100); successCount++; }
          break;
        }

        // ═══ TECHNICAL INDICATORS ═══
        case 'rsi': {
          const periodLength = Math.min(Math.max(Number(params.period_length) || 14, 2), 100);
          const timeframe = (params.timeframe as string) || '1day';
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/technical-indicators/rsi?symbol=${encodeURIComponent(sym)}&periodLength=${periodLength}&timeframe=${encodeURIComponent(timeframe)}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 20);
          }
          if (Object.keys(out).length) { byType.rsi = out; successCount++; }
          break;
        }
        case 'sma': {
          const periodLength = Math.min(Math.max(Number(params.period_length) || 20, 2), 200);
          const timeframe = (params.timeframe as string) || '1day';
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/technical-indicators/sma?symbol=${encodeURIComponent(sym)}&periodLength=${periodLength}&timeframe=${encodeURIComponent(timeframe)}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 20);
          }
          if (Object.keys(out).length) { byType.sma = out; successCount++; }
          break;
        }
        case 'ema': {
          const periodLength = Math.min(Math.max(Number(params.period_length) || 20, 2), 200);
          const timeframe = (params.timeframe as string) || '1day';
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/technical-indicators/ema?symbol=${encodeURIComponent(sym)}&periodLength=${periodLength}&timeframe=${encodeURIComponent(timeframe)}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 20);
          }
          if (Object.keys(out).length) { byType.ema = out; successCount++; }
          break;
        }
        case 'atr': {
          const periodLength = Math.min(Math.max(Number(params.period_length) || 14, 2), 100);
          const timeframe = (params.timeframe as string) || '1day';
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/technical-indicators/atr?symbol=${encodeURIComponent(sym)}&periodLength=${periodLength}&timeframe=${encodeURIComponent(timeframe)}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 20);
          }
          if (Object.keys(out).length) { byType.atr = out; successCount++; }
          break;
        }
        case 'bollinger_bands': {
          const periodLength = Math.min(Math.max(Number(params.period_length) || 20, 2), 100);
          const timeframe = (params.timeframe as string) || '1day';
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/technical-indicators/bollinger?symbol=${encodeURIComponent(sym)}&periodLength=${periodLength}&timeframe=${encodeURIComponent(timeframe)}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 20);
          }
          if (Object.keys(out).length) { byType.bollinger_bands = out; successCount++; }
          break;
        }
        case 'adx': {
          const periodLength = Math.min(Math.max(Number(params.period_length) || 14, 2), 100);
          const timeframe = (params.timeframe as string) || '1day';
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/technical-indicators/adx?symbol=${encodeURIComponent(sym)}&periodLength=${periodLength}&timeframe=${encodeURIComponent(timeframe)}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 20);
          }
          if (Object.keys(out).length) { byType.adx = out; successCount++; }
          break;
        }
        case 'williams': {
          const periodLength = Math.min(Math.max(Number(params.period_length) || 14, 2), 100);
          const timeframe = (params.timeframe as string) || '1day';
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/technical-indicators/williams?symbol=${encodeURIComponent(sym)}&periodLength=${periodLength}&timeframe=${encodeURIComponent(timeframe)}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 20);
          }
          if (Object.keys(out).length) { byType.williams = out; successCount++; }
          break;
        }

        // ═══ MARKET PERFORMANCE ═══
        case 'sector_performance': {
          try {
            const data = await fmpFetch<unknown[]>('/sector-performance-snapshot');
            if (Array.isArray(data) && data.length) { byType.sector_performance = data; successCount++; }
          } catch {
            // FMP may return 400 for this endpoint (plan/params); fmpFetch returns null, no throw – defensive only
          }
          break;
        }
        case 'biggest_gainers': {
          const data = await fmpFetch<unknown[]>('/biggest-gainers');
          if (Array.isArray(data) && data.length) { byType.biggest_gainers = data.slice(0, 20); successCount++; }
          break;
        }
        case 'biggest_losers': {
          const data = await fmpFetch<unknown[]>('/biggest-losers');
          if (Array.isArray(data) && data.length) { byType.biggest_losers = data.slice(0, 20); successCount++; }
          break;
        }
        case 'most_active': {
          const data = await fmpFetch<unknown[]>('/most-actives');
          if (Array.isArray(data) && data.length) { byType.most_active = data.slice(0, 20); successCount++; }
          break;
        }

        // ═══ INSIDER & INSTITUTIONAL ═══
        case 'insider_trading': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/insider-trading/search?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 20);
          }
          if (Object.keys(out).length) { byType.insider_trading = out; successCount++; }
          break;
        }
        case 'insider_stats': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown>(`/insider-trading/statistics?symbol=${encodeURIComponent(sym)}`);
            if (data != null) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.insider_stats = out; successCount++; }
          break;
        }
        case 'institutional_ownership': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/institutional-ownership/symbol-positions-summary?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 10);
          }
          if (Object.keys(out).length) { byType.institutional_ownership = out; successCount++; }
          break;
        }

        // ═══ INDEX CONSTITUENTS ═══
        case 'sp500_constituents': {
          const data = await fmpFetch<unknown[]>('/sp500-constituent');
          if (Array.isArray(data) && data.length) { byType.sp500_constituents = data; successCount++; }
          break;
        }
        case 'nasdaq_constituents': {
          const data = await fmpFetch<unknown[]>('/nasdaq-constituent');
          if (Array.isArray(data) && data.length) { byType.nasdaq_constituents = data; successCount++; }
          break;
        }
        case 'dowjones_constituents': {
          const data = await fmpFetch<unknown[]>('/dow-jones-constituent');
          if (Array.isArray(data) && data.length) { byType.dowjones_constituents = data; successCount++; }
          break;
        }

        // ═══ ETF ═══
        case 'etf_holdings': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/etf/holdings?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data.slice(0, 50);
          }
          if (Object.keys(out).length) { byType.etf_holdings = out; successCount++; }
          break;
        }
        case 'etf_info': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/etf/info?symbol=${encodeURIComponent(sym)}`);
            if (data?.[0]) out[sym] = data[0];
          }
          if (Object.keys(out).length) { byType.etf_info = out; successCount++; }
          break;
        }
        case 'etf_sector_weightings': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/etf/sector-weightings?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.etf_sector_weightings = out; successCount++; }
          break;
        }

        // ═══ NEWS ═══
        case 'stock_news': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/news/stock?symbols=${encodeURIComponent(sym)}&limit=10`);
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) { byType.stock_news = out; successCount++; }
          break;
        }
        case 'general_news': {
          const data = await fmpFetch<unknown[]>('/news/general-latest?limit=20');
          if (Array.isArray(data) && data.length) { byType.general_news = data; successCount++; }
          break;
        }
        case 'forex_news': {
          const data = await fmpFetch<unknown[]>('/news/forex-latest?limit=20');
          if (Array.isArray(data) && data.length) { byType.forex_news = data; successCount++; }
          break;
        }
        case 'crypto_news': {
          const data = await fmpFetch<unknown[]>('/news/crypto-latest?limit=20');
          if (Array.isArray(data) && data.length) { byType.crypto_news = data; successCount++; }
          break;
        }

        // ═══ MARKET STATUS ═══
        case 'market_hours': {
          const data = await fmpFetch<unknown>('/is-market-open');
          if (data != null) { byType.market_hours = data as Record<string, unknown>; successCount++; }
          break;
        }

        // ═══ COMPREHENSIVE SNAPSHOTS ═══
        case 'market_snapshot': {
          // Fetch multiple endpoints in parallel for comprehensive market view
          const [indices, commodities, forex, treasury, sectors, gainers, losers] = await Promise.all([
            fmpFetch<unknown[]>('/batch-index-quotes'),
            fmpFetch<unknown[]>('/batch-commodity-quotes'),
            fmpFetch<unknown[]>('/batch-forex-quotes'),
            fmpFetch<unknown[]>(`/treasury-rates?from=${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}&to=${newsDate.toISOString().slice(0, 10)}`),
            fmpFetch<unknown[]>('/sector-performance-snapshot').catch(() => null),
            fmpFetch<unknown[]>('/biggest-gainers'),
            fmpFetch<unknown[]>('/biggest-losers'),
          ]);
          
          const snapshot: Record<string, unknown> = {
            indices: indices?.slice(0, 50) || [],
            commodities: commodities?.slice(0, 30) || [],
            forex: forex?.slice(0, 50) || [],
            treasury: treasury || [],
            sectors: sectors ?? [],
            gainers: gainers?.slice(0, 10) || [],
            losers: losers?.slice(0, 10) || [],
            timestamp: new Date().toISOString(),
          };
          byType.market_snapshot = snapshot;
          successCount++;
          break;
        }
        case 'stock_analysis': {
          // Comprehensive single stock analysis
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const [quote, profile, metrics, ratios, earnings, estimates, target, rsi] = await Promise.all([
              fmpFetch<unknown[]>(`/quote?symbol=${encodeURIComponent(sym)}`),
              fmpFetch<unknown[]>(`/profile?symbol=${encodeURIComponent(sym)}`),
              fmpFetch<unknown[]>(`/key-metrics?symbol=${encodeURIComponent(sym)}&limit=2`),
              fmpFetch<unknown[]>(`/ratios?symbol=${encodeURIComponent(sym)}&limit=2`),
              fmpFetch<unknown[]>(`/earnings?symbol=${encodeURIComponent(sym)}`),
              fmpFetch<unknown[]>(`/analyst-estimates?symbol=${encodeURIComponent(sym)}&limit=2`),
              fmpFetch<unknown>(`/price-target-summary?symbol=${encodeURIComponent(sym)}`),
              fmpFetch<unknown[]>(`/technical-indicators/rsi?symbol=${encodeURIComponent(sym)}&periodLength=14&timeframe=1day`),
            ]);
            
            out[sym] = {
              quote: quote?.[0] || null,
              profile: profile?.[0] || null,
              keyMetrics: metrics || [],
              ratios: ratios || [],
              earnings: earnings?.slice(0, 4) || [],
              estimates: estimates || [],
              priceTarget: target || null,
              technicals: {
                rsi: rsi?.slice(0, 5) || [],
              },
            };
          }
          if (Object.keys(out).length) { byType.stock_analysis = out; successCount++; }
          break;
        }

        default:
          if (type) errors.push(`Unknown request type: ${type}`);
      }
    } catch (e) {
      errors.push(`${type}: ${String(e)}`);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    byType,
    errors,
    requestCount: list.length,
    successCount,
  };
}
