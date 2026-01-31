/**
 * FMP Data Executor – Stage 1'den gelen fmp_requests listesini çalıştırır,
 * FMP Stable API'yi çağırır ve sonuçları Stage 3'e verilecek yapıda döner.
 *
 * Katalog: docs/FMP-API-CATALOG.md
 */

import type { FmpDataRequest, FmpRequestType } from './fmp-request-types';
import { fetchFmpQuote, fetchFmpIntraday } from './fmp-market';
import type { FmpInterval } from './fmp-market';

const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';

function getApiKey(): string | null {
  return process.env.FMP_API_KEY || null;
}

async function fmpFetch<T>(pathWithQuery: string): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const sep = pathWithQuery.includes('?') ? '&' : '?';
  const url = `${FMP_STABLE_BASE}${pathWithQuery}${sep}apikey=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export interface FmpCollectedPack {
  generatedAt: string;
  byType: Partial<Record<FmpRequestType, Record<string, unknown> | unknown[]>>;
  errors: string[];
}

function clampSymbols(
  symbols: string[] | undefined,
  allowedSet: Set<string> | null
): string[] {
  const list = Array.isArray(symbols) ? symbols.filter(Boolean).slice(0, 10) : [];
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

  const list = Array.isArray(requests) ? requests.slice(0, 12) : [];
  for (const req of list) {
    const type = (req?.type as FmpRequestType) || '';
    const symbols = clampSymbols(req?.symbols, allowedSet);
    const params = req?.params || {};

    try {
      switch (type) {
        case 'quote': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols.length ? symbols : []) {
            const q = await fetchFmpQuote(sym);
            if (q) out[sym] = q;
          }
          if (Object.keys(out).length) byType.quote = out;
          break;
        }
        case 'batch_quote': {
          if (symbols.length) {
            const path = `/batch-quote?symbols=${symbols.map((s) => encodeURIComponent(s)).join(',')}`;
            const data = await fmpFetch<Record<string, unknown> | unknown[]>(path);
            if (data != null) byType.batch_quote = data;
          }
          break;
        }
        case 'profile': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/profile?symbol=${encodeURIComponent(sym)}`);
            const row = Array.isArray(data) ? data[0] : null;
            if (row) out[sym] = row;
          }
          if (Object.keys(out).length) byType.profile = out;
          break;
        }
        case 'intraday': {
          const interval = (params.interval as FmpInterval) || '1hour';
          const lookback = Math.min(Math.max(Number(params.lookback_minutes) || 120, 1), 4320);
          const limit = Math.ceil(lookback / (interval === '1min' ? 1 : interval === '5min' ? 5 : 60));
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const candles = await fetchFmpIntraday(sym, interval, limit);
            if (candles.length) out[sym] = { interval, lookback_minutes: lookback, candles };
          }
          if (Object.keys(out).length) byType.intraday = out;
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
          if (Object.keys(out).length) byType.eod = out;
          break;
        }
        case 'income_statement': {
          const period = (params.period as string) || 'annual';
          const limit = Math.min(Number(params.limit) || 1, 5);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/income-statement?symbol=${encodeURIComponent(sym)}&period=${period}&limit=${limit}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.income_statement = out;
          break;
        }
        case 'balance_sheet': {
          const period = (params.period as string) || 'annual';
          const limit = Math.min(Number(params.limit) || 1, 5);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/balance-sheet-statement?symbol=${encodeURIComponent(sym)}&period=${period}&limit=${limit}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.balance_sheet = out;
          break;
        }
        case 'cash_flow': {
          const period = (params.period as string) || 'annual';
          const limit = Math.min(Number(params.limit) || 1, 5);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/cash-flow-statement?symbol=${encodeURIComponent(sym)}&period=${period}&limit=${limit}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.cash_flow = out;
          break;
        }
        case 'key_metrics': {
          const period = (params.period as string) || 'annual';
          const limit = Math.min(Number(params.limit) || 1, 5);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/key-metrics?symbol=${encodeURIComponent(sym)}&period=${period}&limit=${limit}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.key_metrics = out;
          break;
        }
        case 'ratios': {
          const period = (params.period as string) || 'annual';
          const limit = Math.min(Number(params.limit) || 1, 5);
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/ratios?symbol=${encodeURIComponent(sym)}&period=${period}&limit=${limit}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.ratios = out;
          break;
        }
        case 'earnings': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/earnings?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.earnings = out;
          break;
        }
        case 'dividends': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/dividends?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.dividends = out;
          break;
        }
        case 'analyst_estimates': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/analyst-estimates?symbol=${encodeURIComponent(sym)}&limit=2`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.analyst_estimates = out;
          break;
        }
        case 'price_target': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown>(`/price-target-summary?symbol=${encodeURIComponent(sym)}`);
            if (data != null) out[sym] = data;
          }
          if (Object.keys(out).length) byType.price_target = out;
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
          if (Array.isArray(data) && data.length) byType.earnings_calendar = data;
          break;
        }
        case 'economic_indicators': {
          const name = (params.indicator_name as string) || 'GDP';
          const from = new Date(newsDate);
          from.setFullYear(from.getFullYear() - 1);
          const data = await fmpFetch<unknown[]>(
            `/economic-indicators?name=${encodeURIComponent(name)}&from=${from.toISOString().slice(0, 10)}&to=${newsDate.toISOString().slice(0, 10)}`
          );
          if (Array.isArray(data) && data.length) byType.economic_indicators = data;
          break;
        }
        case 'treasury_rates': {
          const from = new Date(newsDate);
          from.setDate(from.getDate() - 30);
          const data = await fmpFetch<unknown[]>(
            `/treasury-rates?from=${from.toISOString().slice(0, 10)}&to=${newsDate.toISOString().slice(0, 10)}`
          );
          if (Array.isArray(data) && data.length) byType.treasury_rates = data;
          break;
        }
        case 'key_executives': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(`/key-executives?symbol=${encodeURIComponent(sym)}`);
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.key_executives = out;
          break;
        }
        case 'insider_trading': {
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown>(`/insider-trading/statistics?symbol=${encodeURIComponent(sym)}`);
            if (data != null) out[sym] = data;
          }
          if (Object.keys(out).length) byType.insider_trading = out;
          break;
        }
        case 'rsi': {
          const periodLength = Math.min(Math.max(Number(params.period_length) || 14, 2), 100);
          const timeframe = (params.timeframe as string) || '1day';
          const out: Record<string, unknown> = {};
          for (const sym of symbols) {
            const data = await fmpFetch<unknown[]>(
              `/technical-indicators/rsi?symbol=${encodeURIComponent(sym)}&periodLength=${periodLength}&timeframe=${encodeURIComponent(timeframe)}`
            );
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.rsi = out;
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
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.atr = out;
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
            if (Array.isArray(data) && data.length) out[sym] = data;
          }
          if (Object.keys(out).length) byType.bollinger_bands = out;
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
  };
}
