/**
 * FMP market data (stable) – quote + intraday OHLCV
 *
 * We use this to provide deterministic, non-hallucinated price action data
 * into the AI news analysis pipeline.
 *
 * Docs (stable):
 * - Quote: https://financialmodelingprep.com/stable/quote?symbol=EURUSD
 * - Intraday 1m: https://financialmodelingprep.com/stable/historical-chart/1min?symbol=EURUSD
 */
export type FmpInterval = '1min' | '5min' | '15min' | '30min' | '1hour' | '4hour';

export interface FmpQuote {
  price?: number | null;
  change?: number | null;
  changesPercentage?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  open?: number | null;
  previousClose?: number | null;
  volume?: number | null;
  timestamp?: number | null;
}

export interface FmpCandle {
  date: string; // ISO-like string from FMP
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketReactionPack {
  provider: 'fmp';
  generatedAt: string;
  assets: Array<{
    tvAsset: string;
    fmpSymbol: string | null;
    status: 'ok' | 'no_api_key' | 'no_data' | 'error';
    error?: string;
    quote?: FmpQuote | null;
    intraday?: {
      interval: FmpInterval;
      lookbackMinutes: number;
      candles: FmpCandle[]; // trimmed
      derived: {
        movePercent: number | null;
        rangePercent: number | null;
        high: number | null;
        low: number | null;
        open: number | null;
        last: number | null;
      };
    } | null;
  }>;
}

const FMP_STABLE_BASE_URL = 'https://financialmodelingprep.com/stable';

function getFmpApiKey(): string | null {
  return process.env.FMP_API_KEY || null;
}

function clampNumber(n: unknown): number | null {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return null;
  return v;
}

export function tvAssetToFmpSymbol(tvAsset: string): string | null {
  if (!tvAsset) return null;
  const raw = tvAsset.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();

  // Forex: prefer pair without separator
  // FX:EURUSD, FX_IDC:USDJPY, FOREX:EURUSD, OANDA:EURUSD -> EURUSD / USDJPY
  if (
    upper.startsWith('FX:') ||
    upper.startsWith('FX_IDC:') ||
    upper.startsWith('FOREX:') ||
    upper.startsWith('FOREXCOM:') ||
    upper.startsWith('OANDA:')
  ) {
    const sym = upper.split(':')[1] || '';
    const cleaned = sym.replace('/', '').replace(/[^A-Z0-9]/g, '').trim();
    return cleaned || null;
  }

  // Stocks: NASDAQ:AAPL -> AAPL
  if (upper.startsWith('NASDAQ:') || upper.startsWith('NYSE:') || upper.startsWith('AMEX:')) {
    return (upper.split(':')[1] || '').trim() || null;
  }

  // Commodities mapping examples
  // TVC:GOLD or XAUUSD -> GCUSD is commonly used by FMP commodities quote docs.
  if (upper === 'TVC:GOLD' || upper === 'XAUUSD' || upper === 'GOLD') return 'GCUSD';
  
  // INDEX -> ETF PROXY MAPPINGS (FMP doesn't provide direct quotes for indices)
  // DXY (Dollar Index) -> UUP (Invesco DB US Dollar ETF)
  if (upper === 'TVC:DXY' || upper === 'DXY') return 'UUP';
  // VIX -> VXX (iPath S&P 500 VIX Short-Term Futures ETN) or UVXY
  if (upper === 'CBOE:VIX' || upper === 'VIX' || upper === 'TVC:VIX') return 'VXX';
  // SPX (S&P 500 Index) -> SPY (SPDR S&P 500 ETF)
  if (upper === 'SP:SPX' || upper === 'SPX' || upper === 'NASDAQ:SPX' || upper === 'TVC:SPX') return 'SPY';
  // Other common indices
  if (upper === 'NDX' || upper === 'NASDAQ:NDX' || upper === 'TVC:NDX') return 'QQQ';
  if (upper === 'DJI' || upper === 'TVC:DJI') return 'DIA';
  if (upper === 'RUT' || upper === 'TVC:RUT') return 'IWM';

  // Futures continuous symbols like COMEX:GC1! – map to commodity spot symbol when possible
  if (upper.startsWith('COMEX:')) {
    const sym = (upper.split(':')[1] || '').trim();
    if (sym.startsWith('GC')) return 'GCUSD';
    if (sym.startsWith('SI')) return 'SIUSD';
    return null;
  }
  if (upper.startsWith('NYMEX:')) {
    const sym = (upper.split(':')[1] || '').trim();
    if (sym.startsWith('CL')) return 'CLUSD';
    return null;
  }

  // Crypto: prefer to keep Binance as provider for now (FMP symbol conventions vary by plan).
  // We return null so caller can fallback to other sources if needed.
  if (upper.startsWith('BINANCE:')) return null;

  // Stock ticker + USD suffix (e.g. AAPLUSD, SBUXUSD): FMP uses bare ticker (AAPL, SBUX), not AAPLUSD
  if (upper.endsWith('USD') && upper.length >= 7) {
    const base = upper.slice(0, -3);
    if (/^[A-Z]{1,5}$/.test(base)) return base;
  }

  // If it's already a bare symbol like EURUSD/AAPL
  if (/^[A-Z0-9]{3,10}$/.test(upper)) return upper;

  return null;
}

async function fmpStableFetch<T>(pathWithQuery: string): Promise<T | null> {
  const apiKey = getFmpApiKey();
  if (!apiKey) return null;
  const sep = pathWithQuery.includes('?') ? '&' : '?';
  const url = `${FMP_STABLE_BASE_URL}${pathWithQuery}${sep}apikey=${apiKey}`;
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) return null;
  return (await resp.json()) as T;
}

/**
 * Map index symbols to their ETF proxies for FMP API.
 * FMP doesn't provide direct quotes for indices like SPX, VIX, DXY.
 */
function mapIndexToEtf(symbol: string): string {
  const upper = (symbol || '').toUpperCase().trim();
  switch (upper) {
    case 'SPX': return 'SPY';    // S&P 500 Index -> SPDR S&P 500 ETF
    case 'VIX': return 'VXX';    // CBOE Volatility Index -> iPath VIX ETN
    case 'DXY': return 'UUP';    // US Dollar Index -> Invesco DB US Dollar ETF
    case 'NDX': return 'QQQ';    // Nasdaq 100 -> Invesco QQQ ETF
    case 'DJI': return 'DIA';    // Dow Jones -> SPDR Dow Jones ETF
    case 'RUT': return 'IWM';    // Russell 2000 -> iShares Russell 2000 ETF
    default: return upper;
  }
}

export async function fetchFmpQuote(fmpSymbol: string): Promise<FmpQuote | null> {
  const mappedSymbol = mapIndexToEtf(fmpSymbol);
  const data = await fmpStableFetch<any[]>(`/quote?symbol=${encodeURIComponent(mappedSymbol)}`);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    price: clampNumber(row.price),
    change: clampNumber(row.change),
    changesPercentage: clampNumber(row.changesPercentage),
    dayHigh: clampNumber(row.dayHigh),
    dayLow: clampNumber(row.dayLow),
    open: clampNumber(row.open),
    previousClose: clampNumber(row.previousClose),
    volume: clampNumber(row.volume),
    timestamp: clampNumber(row.timestamp),
  };
}

export async function fetchFmpIntraday(
  fmpSymbol: string,
  interval: FmpInterval,
  limit: number
): Promise<FmpCandle[]> {
  const mappedSymbol = mapIndexToEtf(fmpSymbol);
  const data = await fmpStableFetch<any[]>(
    `/historical-chart/${encodeURIComponent(interval)}?symbol=${encodeURIComponent(mappedSymbol)}`
  );
  if (!Array.isArray(data) || data.length === 0) return [];

  const trimmed = data.slice(0, Math.max(1, Math.min(limit, 240)));
  return trimmed
    .map((c) => ({
      date: String(c.date || ''),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: c.volume != null ? Number(c.volume) : undefined,
    }))
    .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.close) && c.date);
}

async function fetchFmpIntradayWithFallback(
  fmpSymbol: string,
  preferred: FmpInterval,
  limit: number
): Promise<{ interval: FmpInterval; candles: FmpCandle[] }> {
  const order: FmpInterval[] =
    preferred === '1min'
      ? ['1min', '5min', '15min', '1hour']
      : preferred === '5min'
        ? ['5min', '15min', '1hour']
        : ['1hour', '4hour'];

  for (const itv of order) {
    const candles = await fetchFmpIntraday(fmpSymbol, itv, limit);
    if (candles.length > 0) return { interval: itv, candles };
  }
  return { interval: preferred, candles: [] };
}

export async function buildFmpMarketReactionPack(tvAssets: string[]): Promise<MarketReactionPack> {
  const uniqueAssets = Array.from(new Set((tvAssets || []).map((a) => String(a || '').trim()).filter(Boolean))).slice(0, 3);
  const out: MarketReactionPack = {
    provider: 'fmp',
    generatedAt: new Date().toISOString(),
    assets: [],
  };

  const hasKey = !!getFmpApiKey();
  for (const tvAsset of uniqueAssets) {
    const fmpSymbol = tvAssetToFmpSymbol(tvAsset);
    if (!fmpSymbol) {
      out.assets.push({ tvAsset, fmpSymbol: null, status: 'no_data', quote: null, intraday: null });
      continue;
    }

    try {
      const quote = await fetchFmpQuote(fmpSymbol);
      const intradayResult = await fetchFmpIntradayWithFallback(fmpSymbol, '1min', 120);
      const candles = intradayResult.candles;

      const open = candles.length ? candles[candles.length - 1]?.open : quote?.open ?? null;
      const last = candles.length ? candles[0]?.close : quote?.price ?? null;
      const high = candles.length ? Math.max(...candles.map((c) => c.high)) : quote?.dayHigh ?? null;
      const low = candles.length ? Math.min(...candles.map((c) => c.low)) : quote?.dayLow ?? null;

      const movePercent =
        open && last && open !== 0 ? ((last - open) / open) * 100 : null;
      const rangePercent =
        open && high && low && open !== 0 ? ((high - low) / open) * 100 : null;

      const status: MarketReactionPack['assets'][number]['status'] =
        !hasKey ? 'no_api_key' : (quote || candles.length > 0) ? 'ok' : 'no_data';

      out.assets.push({
        tvAsset,
        fmpSymbol,
        status,
        quote,
        intraday: (candles.length > 0 || quote)
          ? {
              interval: intradayResult.interval,
              lookbackMinutes: 120,
              candles,
              derived: {
                movePercent: movePercent != null ? Number(movePercent.toFixed(4)) : null,
                rangePercent: rangePercent != null ? Number(rangePercent.toFixed(4)) : null,
                high: high ?? null,
                low: low ?? null,
                open: open ?? null,
                last: last ?? null,
              },
            }
          : null,
      });
    } catch (e) {
      out.assets.push({
        tvAsset,
        fmpSymbol,
        status: hasKey ? 'error' : 'no_api_key',
        error: String(e),
        quote: null,
        intraday: null,
      });
    }
  }

  return out;
}

