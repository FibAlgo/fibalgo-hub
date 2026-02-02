/**
 * FMP Data Request Schema – Stage 1 çıktısı.
 * AI, haber/event analizi için ihtiyaç duyduğu FMP verilerini bu tiplerle ister;
 * Stage 2 bu istekleri çalıştırıp sonuçları Stage 3'e verir.
 *
 * Katalog: docs/FMP-API-CATALOG.md
 */

export type FmpRequestType =
  // Price & Quotes
  | 'quote'
  | 'batch_quote'
  | 'batch_index_quotes'
  | 'batch_forex_quotes'
  | 'batch_commodity_quotes'
  | 'batch_crypto_quotes'
  // Charts
  | 'intraday'
  | 'eod'
  // Company
  | 'profile'
  | 'key_executives'
  | 'stock_peers'
  // Financials
  | 'income_statement'
  | 'balance_sheet'
  | 'cash_flow'
  | 'key_metrics'
  | 'ratios'
  | 'financial_scores'
  // Earnings & Dividends
  | 'earnings'
  | 'dividends'
  | 'earnings_calendar'
  | 'dividends_calendar'
  | 'ipo_calendar'
  // Analyst
  | 'analyst_estimates'
  | 'price_target'
  | 'analyst_ratings'
  | 'grades'
  // Economic (Macro)
  | 'economic_indicators'
  | 'treasury_rates'
  | 'economic_calendar'
  // Technical Indicators
  | 'rsi'
  | 'sma'
  | 'ema'
  | 'atr'
  | 'bollinger_bands'
  | 'adx'
  | 'williams'
  // Market Performance
  | 'sector_performance'
  | 'biggest_gainers'
  | 'biggest_losers'
  | 'most_active'
  // Insider & Institutional
  | 'insider_trading'
  | 'insider_stats'
  | 'institutional_ownership'
  // Index Constituents
  | 'sp500_constituents'
  | 'nasdaq_constituents'
  | 'dowjones_constituents'
  // ETF
  | 'etf_holdings'
  | 'etf_info'
  | 'etf_sector_weightings'
  // News
  | 'stock_news'
  | 'general_news'
  | 'forex_news'
  | 'crypto_news'
  // Market Status
  | 'market_hours'
  // Comprehensive
  | 'market_snapshot'
  | 'stock_analysis';

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
 * Stage 1 prompt'a eklenecek kapsamlı FMP veri menüsü.
 * AI istediği kadar veri talep edebilir - sınır yok.
 */
export const FMP_DATA_MENU = `
FMP DATA MENU – "fmp_requests" array'ine ihtiyacın olan tüm verileri ekle. Sınır yok, kapsamlı analiz için gerekli tüm verileri iste.
Format: { "type": "<tip>", "symbols": ["sembol listesi"] } veya params ile { "type": "<tip>", "params": {...} }

═══ FİYAT & QUOTES ═══
- quote → Tek sembol anlık fiyat (symbols: ["SPY"])
- batch_quote → Çoklu sembol fiyat (symbols: ["SPY", "QQQ", "DIA"])
- batch_index_quotes → TÜM endeks fiyatları (symbols yok - otomatik ^GSPC, ^VIX, ^DJI, ^NDX vb.)
- batch_forex_quotes → TÜM forex pariteler (symbols yok - otomatik EURUSD, USDJPY vb.)
- batch_commodity_quotes → TÜM emtia fiyatları (symbols yok - otomatik GCUSD, CLUSD vb.)
- batch_crypto_quotes → TÜM kripto fiyatları (symbols yok)

═══ GRAFİK VERİLERİ ═══
- intraday → Gün içi mum (symbols; params: interval=1min|5min|15min|30min|1hour|4hour)
- eod → Günlük kapanış (symbols; params: lookback_days=30)

═══ ŞİRKET VERİLERİ ═══
- profile → Şirket profili, market cap, sektör (symbols)
- key_executives → CEO, CFO bilgileri (symbols)
- stock_peers → Rakip şirketler listesi (symbols)

═══ FİNANSAL TABLOLAR ═══
- income_statement → Gelir tablosu (symbols; params: period=annual|quarter, limit=4)
- balance_sheet → Bilanço (symbols; params: period, limit)
- cash_flow → Nakit akışı (symbols; params: period, limit)
- key_metrics → Temel metrikler: P/E, P/B, EV/EBITDA vb. (symbols; params: period, limit)
- ratios → Finansal oranlar: ROE, ROA, current ratio vb. (symbols; params: period, limit)
- financial_scores → Altman Z-Score, Piotroski Score (symbols)

═══ KAZANÇ & TEMETTÜ ═══
- earnings → Geçmiş kazançlar, EPS surprise (symbols)
- dividends → Temettü geçmişi (symbols)
- earnings_calendar → Yaklaşan kazanç açıklamaları (symbols yok; otomatik tarih)
- dividends_calendar → Yaklaşan temettü tarihleri (symbols yok)
- ipo_calendar → Yaklaşan halka arzlar (symbols yok)

═══ ANALİST VERİLERİ ═══
- analyst_estimates → Gelir/EPS tahminleri (symbols)
- price_target → Hedef fiyat özeti (symbols)
- analyst_ratings → Strong Buy/Buy/Hold/Sell dağılımı (symbols)
- grades → Upgrade/downgrade geçmişi (symbols)

═══ MAKRO EKONOMİK ═══
- treasury_rates → Hazine faiz oranları: 1mo, 3mo, 6mo, 1yr, 2yr, 5yr, 10yr, 30yr (symbols yok)
- economic_indicators → Ekonomik göstergeler (params: indicator_name=GDP|CPI|inflationRate|federalFunds|retailSales|durableGoods)
- economic_calendar → Yaklaşan ekonomik olaylar (symbols yok)

═══ TEKNİK İNDİKATÖRLER ═══
- rsi → Relative Strength Index (symbols; params: period_length=14, timeframe=1day|1hour)
- sma → Simple Moving Average (symbols; params: period_length=20|50|200, timeframe=1day)
- ema → Exponential Moving Average (symbols; params: period_length=12|26, timeframe=1day)
- atr → Average True Range - volatilite (symbols; params: period_length=14, timeframe=1day)
- bollinger_bands → Bollinger Bantları (symbols; params: period_length=20, timeframe=1day)
- adx → ADX - Trend gücü (symbols; params: period_length=14, timeframe=1day)
- williams → Williams %R (symbols; params: period_length=14, timeframe=1day)

═══ PİYASA PERFORMANSI ═══
- sector_performance → 11 sektör günlük performansı (symbols yok)
- biggest_gainers → Günün en çok yükselenleri (symbols yok)
- biggest_losers → Günün en çok düşenleri (symbols yok)
- most_active → En aktif işlem görenler (symbols yok)

═══ İÇERİDEN İŞLEM & KURUMSAL ═══
- insider_trading → İçeriden alım/satım işlemleri (symbols)
- insider_stats → İçeriden işlem istatistikleri (symbols)
- institutional_ownership → Kurumsal sahiplik (symbols)

═══ ENDEKS BİLEŞENLERİ ═══
- sp500_constituents → S&P 500 şirket listesi (symbols yok)
- nasdaq_constituents → Nasdaq 100 şirket listesi (symbols yok)
- dowjones_constituents → Dow Jones 30 şirket listesi (symbols yok)

═══ ETF VERİLERİ ═══
- etf_holdings → ETF içindeki hisseler (symbols: ["SPY", "QQQ"])
- etf_info → ETF detay bilgisi (symbols)
- etf_sector_weightings → ETF sektör ağırlıkları (symbols)

═══ HABERLER ═══
- stock_news → Hisse haberleri (symbols)
- general_news → Genel piyasa haberleri (symbols yok)
- forex_news → Forex haberleri (symbols yok)
- crypto_news → Kripto haberleri (symbols yok)

═══ PİYASA DURUMU ═══
- market_hours → Piyasa açık/kapalı durumu (symbols yok)

═══ KAPSAMLI SNAPSHOT ═══
- market_snapshot → Tek seferde: tüm endeksler + emtialar + forex + treasury + sektör performansı + gainer/loser (symbols yok)
- stock_analysis → Tek hisse için: quote + profile + metrics + ratios + earnings + estimates + technicals (symbols)

Örnek - Kapsamlı analiz için:
[
  {"type":"market_snapshot"},
  {"type":"treasury_rates"},
  {"type":"batch_index_quotes"},
  {"type":"quote","symbols":["AAPL","MSFT"]},
  {"type":"rsi","symbols":["SPY"],"params":{"period_length":14,"timeframe":"1day"}},
  {"type":"key_metrics","symbols":["AAPL"],"params":{"period":"annual","limit":2}},
  {"type":"sector_performance"},
  {"type":"economic_indicators","params":{"indicator_name":"CPI"}}
]`;
