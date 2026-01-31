/**
 * FMP Data Request Schema – Stage 1 (Haiku) çıktısı.
 * Haiku, haber analizi için ihtiyaç duyduğu FMP verilerini bu tiplerle ister;
 * Stage 2 bu istekleri çalıştırıp sonuçları Stage 3'e verir.
 *
 * Katalog: docs/FMP-API-CATALOG.md
 */

export type FmpRequestType =
  | 'quote'
  | 'profile'
  | 'intraday'
  | 'eod'
  | 'income_statement'
  | 'balance_sheet'
  | 'cash_flow'
  | 'key_metrics'
  | 'ratios'
  | 'earnings'
  | 'dividends'
  | 'analyst_estimates'
  | 'price_target'
  | 'earnings_calendar'
  | 'economic_indicators'
  | 'treasury_rates'
  | 'key_executives'
  | 'insider_trading'
  | 'batch_quote'
  | 'rsi'
  | 'atr'
  | 'bollinger_bands';

export interface FmpDataRequest {
  /** FMP kataloğundaki veri tipi */
  type: FmpRequestType;
  /** İstek için semboller (quote, profile, intraday vb. için). Boşsa global (earnings_calendar, economic_indicators) */
  symbols?: string[];
  /** Tip bazlı parametreler */
  params?: {
    /** intraday: 1min | 5min | 15min | 30min | 1hour | 4hour */
    interval?: '1min' | '5min' | '15min' | '30min' | '1hour' | '4hour';
    /** intraday/eod: geriye bakış (dakika veya gün) */
    lookback_minutes?: number;
    lookback_days?: number;
    /** financials: annual | quarter */
    period?: 'annual' | 'quarter';
    limit?: number;
    /** economic_indicators: GDP, unemployment, inflation vb. */
    indicator_name?: string;
    /** rsi/atr/bollinger_bands: periyot (varsayılan rsi/atr 14, bollinger 20) */
    period_length?: number;
    /** rsi/atr/bollinger_bands: 1day veya 1min vb. */
    timeframe?: string;
  };
}

/**
 * Stage 1 prompt'a eklenecek kısa "veri menüsü".
 * Kategorize ve tek kural ile Haiku'nun kafası karışmasın.
 */
export const FMP_DATA_MENU = `
FMP DATA MENU – "fmp_requests" array'ine ekle: her eleman = { "type": "<aşağıdaki tip>", "symbols": ["ALLOWED listesinden"] }. İhtiyaç varsa "params" ekle.

Kural: Sadece ALLOWED FMP SYMBOLS listesindeki sembolleri kullan. 1–5 istek yeterli.

[Fiyat]
- quote → anlık fiyat (symbols)
- batch_quote → toplu fiyat (symbols)
- intraday → mum verisi (symbols; params: interval=1min|5min|1hour|4hour, lookback_minutes)
- eod → günlük kapanış (symbols; params: lookback_days)

[Şirket]
- profile → profil, piyasa değeri (symbols)
- key_executives → yöneticiler (symbols)

[Finansal tablolar]
- income_statement, balance_sheet, cash_flow → (symbols; params: period=annual|quarter, limit)
- key_metrics, ratios → oranlar/metrikler (symbols; params: period, limit)

[Kazanç / temettü]
- earnings → kazanç geçmişi (symbols)
- dividends → temettü (symbols)
- earnings_calendar → takvim (symbols yok; otomatik tarih)

[Analist]
- analyst_estimates, price_target → (symbols)

[Makro]
- economic_indicators → (params: indicator_name=GDP|unemployment|inflation)
- treasury_rates → hazine (symbols yok)

[Teknik indikatörler]
- rsi → RSI (symbols; params: period_length=14, timeframe=1day)
- atr → ATR - Average True Range (symbols; params: period_length=14, timeframe=1day)
- bollinger_bands → Bollinger Bands (symbols; params: period_length=20, timeframe=1day)

[Diğer]
- insider_trading → içerden işlem (symbols)

Örnek: [{"type":"quote","symbols":["AAPL"]},{"type":"rsi","symbols":["AAPL"]},{"type":"earnings","symbols":["AAPL"]}]`;
