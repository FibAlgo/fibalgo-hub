/**
 * FMP Widgets API – Terminal ana sayfa için Top Movers ve Market Risk verisi.
 * FMP Stable: biggest-gainers, biggest-losers, most-actives, market-risk-premium, treasury-rates
 */

import { NextResponse } from 'next/server';

const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';

function getApiKey(): string | null {
  return process.env.FMP_API_KEY ?? null;
}

async function fmpFetch<T>(path: string): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const sep = path.includes('?') ? '&' : '?';
  const url = `${FMP_STABLE_BASE}${path}${sep}apikey=${apiKey}`;
  try {
    const res = await fetch(url, { cache: 'no-store', next: { revalidate: 0 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface FmpMoverItem {
  symbol?: string;
  name?: string;
  price?: number;
  changesPercentage?: number;
  change?: number;
  /** Exchange short name (e.g. NASDAQ, NYSE) for TradingView symbol */
  exchangeShortName?: string;
  exchange?: string;
  [key: string]: unknown;
}

export interface FmpMarketRiskItem {
  date?: string;
  marketRiskPremium?: number;
  [key: string]: unknown;
}

export interface FmpTreasuryItem {
  date?: string;
  month1?: number;
  month3?: number;
  month6?: number;
  year1?: number;
  year2?: number;
  year5?: number;
  year10?: number;
  year30?: number;
  [key: string]: unknown;
}

export interface FmpWidgetsResponse {
  gainers: FmpMoverItem[];
  losers: FmpMoverItem[];
  actives: FmpMoverItem[];
  marketRiskPremium: FmpMarketRiskItem | FmpMarketRiskItem[] | null;
  treasuryRates: FmpTreasuryItem | FmpTreasuryItem[] | null;
}

function normalizeArray<T>(raw: T | T[] | { data?: T | T[] } | null): T[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object' && 'data' in raw) {
    const d = (raw as { data?: T | T[] }).data;
    if (Array.isArray(d)) return d;
    if (d != null) return [d];
    return [];
  }
  return [raw as T];
}

export async function GET() {
  const [gainersRaw, losersRaw, activesRaw, mrpRaw, treasuryRaw] = await Promise.all([
    fmpFetch<FmpMoverItem[] | { data?: FmpMoverItem[] }>( '/biggest-gainers'),
    fmpFetch<FmpMoverItem[] | { data?: FmpMoverItem[] }>( '/biggest-losers'),
    fmpFetch<FmpMoverItem[] | { data?: FmpMoverItem[] }>( '/most-actives'),
    fmpFetch<FmpMarketRiskItem | FmpMarketRiskItem[] | { data?: FmpMarketRiskItem | FmpMarketRiskItem[] }>( '/market-risk-premium'),
    fmpFetch<FmpTreasuryItem | FmpTreasuryItem[] | { data?: FmpTreasuryItem | FmpTreasuryItem[] }>( '/treasury-rates'),
  ]);

  const gainers = normalizeArray(gainersRaw as FmpMoverItem[]).slice(0, 10);
  const losers = normalizeArray(losersRaw as FmpMoverItem[]).slice(0, 10);
  const actives = normalizeArray(activesRaw as FmpMoverItem[]).slice(0, 10);
  const marketRiskPremium = (mrpRaw && typeof mrpRaw === 'object' && 'data' in mrpRaw)
    ? (mrpRaw as { data: FmpMarketRiskItem | FmpMarketRiskItem[] }).data
    : mrpRaw ?? null;
  const treasuryRates = (treasuryRaw && typeof treasuryRaw === 'object' && 'data' in treasuryRaw)
    ? (treasuryRaw as { data: FmpTreasuryItem | FmpTreasuryItem[] }).data
    : treasuryRaw ?? null;

  return NextResponse.json({
    gainers,
    losers,
    actives,
    marketRiskPremium,
    treasuryRates,
  } satisfies FmpWidgetsResponse);
}
