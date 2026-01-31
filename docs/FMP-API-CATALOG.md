# FMP API Kataloğu – Haber Analizi İçin Erişilebilir Veriler

Bu belge, Financial Modeling Prep (FMP) **Stable API** üzerinden erişilebilen tüm veri türlerini listeler. Stage 1'de Haiku'ya "bu tablodaki veriler var, haberle alakalı istediğin veriyi benden isteyebilirsin" diyebilmek için tek referans dokümandır.

**Base URL:** `https://financialmodelingprep.com/stable`  
**Yetkilendirme:** Tüm isteklerde `?apikey=YOUR_API_KEY` veya header `apikey: YOUR_API_KEY` gerekir.

---

## 1. Arama & Dizin (Search & Directory)

| Veri | Endpoint | Parametreler | Açıklama |
|------|----------|--------------|----------|
| Sembol arama | `/search-symbol` | `query=AAPL` | Ticker araması (85k+ hisse, ETF, kripto, forex, endeks) |
| İsim araması | `/search-name` | `query=Apple` | Şirket/asset adına göre ticker |
| CIK arama | `/search-cik` | `cik=320193` | SEC CIK ile şirket |
| CUSIP arama | `/search-cusip` | `cusip=037833100` | CUSIP ile menkul |
| ISIN arama | `/search-isin` | `isin=US0378331005` | ISIN ile menkul |
| Stock screener | `/company-screener` | marketCap, sector, country, vb. | Filtreyle hisse listesi |
| Borsa varyantları | `/search-exchange-variants` | `symbol=AAPL` | Sembolün işlem gördüğü borsalar |
| **Hisse listesi** | `/stock-list` | - | Tüm hisse/ETF sembolleri (liste kaynağı) |
| Finansal tablo sembolleri | `/financial-statement-symbol-list` | - | Finansal tablosu olan şirketler |
| CIK listesi | `/cik-list` | `page`, `limit` | SEC CIK listesi |
| Sembol değişiklikleri | `/symbol-change` | - | Ticker değişiklikleri (birleşme, bölünme vb.) |
| **ETF listesi** | `/etf-list` | - | Tüm ETF sembolleri |
| Aktif işlem listesi | `/actively-trading-list` | - | O an işlem gören enstrümanlar |
| Earnings transcript listesi | `/earnings-transcript-list` | - | Transcript’i olan şirketler |
| Borsa listesi | `/available-exchanges` | - | Desteklenen borsalar |
| Sektör listesi | `/available-sectors` | - | Sektörler |
| Sektör listesi | `/available-industries` | - | Sektörler |
| Ülke listesi | `/available-countries` | - | Ülkeler |

---

## 2. Şirket Bilgisi (Company Information)

| Veri | Endpoint | Parametreler | Açıklama |
|------|----------|--------------|----------|
| Şirket profili | `/profile` | `symbol=AAPL` | Piyasa değeri, fiyat, sektör, vb. |
| Profil (CIK ile) | `/profile-cik` | `cik=320193` | CIK ile profil |
| Şirket notları | `/company-notes` | `symbol=AAPL` | Notlar / borçlanma araçları |
| Akran karşılaştırma | `/stock-peers` | `symbol=AAPL` | Aynı sektör / büyüklük |
| Delist şirketler | `/delisted-companies` | `page`, `limit` | Borsadan çıkan şirketler |
| Çalışan sayısı | `/employee-count` | `symbol=AAPL` | Çalışan sayısı |
| Tarihsel çalışan sayısı | `/historical-employee-count` | `symbol`, `year` | Geçmiş yıllar |
| Piyasa değeri | `/market-capitalization` | `symbol`, `date` | Belirli tarihte piyasa değeri |
| Toplu piyasa değeri | `/market-capitalization-batch` | `symbols=AAPL,MSFT` | Birden fazla sembol |
| Tarihsel piyasa değeri | `/historical-market-capitalization` | `symbol`, `from`, `to` | Zaman serisi |
| Float / likidite | `/shares-float` | `symbol=AAPL` | Halka açık hisse, float |
| Tüm float | `/shares-float-all` | `page`, `limit` | Tüm şirketler |
| Son M&A | `/mergers-acquisitions-latest` | `page`, `limit` | Son birleşme/satın almalar |
| M&A arama | `/mergers-acquisitions-search` | `name=Apple` | İsme göre M&A |
| Yöneticiler | `/key-executives` | `symbol=AAPL` | İsim, unvan, tazminat |
| Yönetici tazminatı | `/governance-executive-compensation` | `symbol=AAPL` | Detaylı tazminat |
| Tazminat kıyaslama | `/executive-compensation-benchmark` | - | Sektörel ortalama |

---

## 3. Fiyat & Quote

| Veri | Endpoint | Parametreler | Açıklama |
|------|----------|--------------|----------|
| Hisse quote | `/quote` | `symbol=AAPL` | Anlık fiyat, değişim, hacim |
| Hisse quote (kısa) | `/quote-short` | `symbol=AAPL` | Özet quote |
| Aftermarket işlem | `/aftermarket-trade` | `symbol=AAPL` | Seans sonrası işlemler |
| Aftermarket quote | `/aftermarket-quote` | `symbol=AAPL` | Seans sonrası fiyat |
| Fiyat değişimi | `/stock-price-change` | `symbol=AAPL` | Günlük/haftalık/aylık değişim |
| Toplu quote | `/batch-quote` | `symbols=AAPL,MSFT` | Birden fazla hisse |
| Toplu quote (kısa) | `/batch-quote-short` | `symbols=...` | Toplu özet |
| Borsa quote’ları | `/batch-exchange-quote` | `exchange=NASDAQ` | Bir borsadaki tüm hisseler |
| Mutual fund quote | `/batch-mutualfund-quotes` | - | Mutual fund fiyatları |
| ETF quote | `/batch-etf-quotes` | - | ETF fiyatları |
| **Emtia quote** | `/batch-commodity-quotes` | - | Tüm emtia fiyatları |
| **Kripto quote** | `/batch-crypto-quotes` | - | Kripto fiyatları |
| **Forex quote** | `/batch-forex-quotes` | - | Forex çiftleri fiyatları |
| **Endeks quote** | `/batch-index-quotes` | - | Endeks fiyatları (^GSPC vb.) |

---

## 4. Grafik / Tarihsel Fiyat (Charts)

**Hisse (symbol=AAPL vb.):**

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| EOD hafif | `/historical-price-eod/light` | `symbol`, `from`, `to` |
| EOD tam | `/historical-price-eod/full` | `symbol`, `from`, `to` |
| EOD (split düzeltmesiz) | `/historical-price-eod/non-split-adjusted` | `symbol`, `from`, `to` |
| EOD (temettü düzeltmeli) | `/historical-price-eod/dividend-adjusted` | `symbol`, `from`, `to` |
| 1 dk intraday | `/historical-chart/1min` | `symbol`, `from`, `to` (veya limit) |
| 5 dk intraday | `/historical-chart/5min` | `symbol`, ... |
| 15 dk intraday | `/historical-chart/15min` | `symbol`, ... |
| 30 dk intraday | `/historical-chart/30min` | `symbol`, ... |
| 1 saat intraday | `/historical-chart/1hour` | `symbol`, ... |
| 4 saat intraday | `/historical-chart/4hour` | `symbol`, ... |

**Endeks (symbol=^GSPC vb.):** Aynı EOD ve intraday endpoint’leri endeks sembolü ile kullanılır.

**Forex / Commodity / Crypto:** FMP stable dokümantasyonunda ilgili “Forex Intraday”, “Commodity Chart”, “Crypto” bölümlerindeki endpoint’ler kullanılır (path’ler hisse ile aynı pattern’de olabilir; dokümanda teyit edin).

---

## 5. Finansal Tablolar (Statements)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| Gelir tablosu | `/income-statement` | `symbol`, `period`, `limit` |
| Bilanço | `/balance-sheet-statement` | `symbol`, `period`, `limit` |
| Nakit akışı | `/cash-flow-statement` | `symbol`, `period`, `limit` |
| Son finansal tablolar | `/latest-financial-statements` | `page`, `limit` |
| Gelir tablosu TTM | `/income-statement-ttm` | `symbol` |
| Bilanço TTM | `/balance-sheet-statement-ttm` | `symbol` |
| Nakit akışı TTM | `/cash-flow-statement-ttm` | `symbol` |
| Temel metrikler | `/key-metrics` | `symbol`, `period`, `limit` |
| Finansal oranlar | `/ratios` | `symbol`, `period`, `limit` |
| Metrikler TTM | `/key-metrics-ttm` | `symbol` |
| Oranlar TTM | `/ratios-ttm` | `symbol` |
| Finansal skorlar | `/financial-scores` | `symbol` (Altman Z, Piotroski vb.) |
| Owner earnings | `/owner-earnings` | `symbol` |
| Enterprise value | `/enterprise-values` | `symbol`, `period` |
| Gelir tablosu büyüme | `/income-statement-growth` | `symbol` |
| Bilanço büyüme | `/balance-sheet-statement-growth` | `symbol` |
| Nakit akışı büyüme | `/cash-flow-statement-growth` | `symbol` |
| Finansal büyüme | `/financial-growth` | `symbol` |
| Rapor tarihleri | `/financial-reports-dates` | `symbol` |
| 10-K JSON | `/financial-reports-json` | `symbol`, `year`, `period=FY` |
| Ürün segmenti | `/revenue-product-segmentation` | `symbol` |
| Coğrafi segment | `/revenue-geographic-segmentation` | `symbol` |
| As reported (gelir) | `/income-statement-as-reported` | `symbol`, `period` |
| As reported (bilanço) | `/balance-sheet-statement-as-reported` | `symbol`, `period` |
| As reported (nakit) | `/cash-flow-statement-as-reported` | `symbol`, `period` |
| Full as reported | `/financial-statement-full-as-reported` | `symbol` |

---

## 6. Ekonomi (Economics)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| Hazine oranları | `/treasury-rates` | `from`, `to` (opsiyonel) |
| Ekonomik göstergeler | `/economic-indicators` | `name=GDP` (GDP, işsizlik, enflasyon vb.) |
| Ekonomi takvimi | `/economic-calendar` | `from`, `to` |
| Piyasa risk primi | `/market-risk-premium` | (tarih parametreleri) |

---

## 7. Kazanç / Temettü / Bölünme (Earnings, Dividends, Splits)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| Temettüler (şirket) | `/dividends` | `symbol=AAPL` |
| Temettü takvimi | `/dividends-calendar` | `from`, `to` |
| Kazanç (şirket) | `/earnings` | `symbol=AAPL` |
| Kazanç takvimi | `/earnings-calendar` | `from`, `to` |
| IPO takvimi | `/ipos-calendar` | `from`, `to` |
| IPO disclosure | `/ipos-disclosure` | - |
| IPO prospectus | `/ipos-prospectus` | - |
| Hisse bölünmeleri | `/splits` | `symbol=AAPL` |
| Bölünme takvimi | `/splits-calendar` | `from`, `to` |

---

## 8. Kazanç Çağrısı Metni (Earnings Transcript)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| Son transcript listesi | `/earning-call-transcript-latest` | `page`, `limit` |
| Transcript | `/earning-call-transcript` | `symbol=AAPL`, `year`, `quarter` |
| Transcript tarihleri | `/earning-call-transcript-dates` | `symbol=AAPL` |
| Transcript’i olan semboller | `/earnings-transcript-list` | - |

---

## 9. Haber (News)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| FMP makaleleri | `/fmp-articles` | `page`, `limit` |
| Genel haber | `/news/general-latest` | `page`, `limit` |
| Basın bültenleri | `/news/press-releases-latest` | `page`, `limit` |
| Hisse haberleri | `/news/stock-latest` | `page`, `limit` |
| Kripto haberleri | `/news/crypto-latest` | `page`, `limit` |
| Forex haberleri | `/news/forex-latest` | `page`, `limit` |
| Basın bülteni arama | `/news/press-releases` | `symbols=AAPL` |
| Hisse haber arama | `/news/stock` | `symbols=AAPL` |
| Kripto haber arama | `/news/crypto` | `symbols=BTCUSD` |
| Forex haber arama | `/news/forex` | `symbols=EURUSD` |

---

## 10. Form 13F (Kurumsal Sahiplik)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| Son 13F dosyaları | `/institutional-ownership/latest` | `page`, `limit` |
| 13F özeti (CIK) | `/institutional-ownership/extract` | `cik`, `year`, `quarter` |
| 13F tarihleri | `/institutional-ownership/dates` | `cik` |
| Holder’a göre analitik | `/institutional-ownership/extract-analytics/holder` | `symbol`, `year`, `quarter` |
| Holder performans özeti | `/institutional-ownership/holder-performance-summary` | `cik` |
| Holder sektör dağılımı | `/institutional-ownership/holder-industry-breakdown` | `cik`, `year`, `quarter` |
| Sembol pozisyon özeti | `/institutional-ownership/symbol-positions-summary` | `symbol`, `year`, `quarter` |
| Sektör özeti | `/institutional-ownership/industry-summary` | `year`, `quarter` |

---

## 11. Analist (Analyst)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| Finansal tahminler | `/analyst-estimates` | `symbol`, `period`, `page`, `limit` |
| Rating özeti | `/ratings-snapshot` | `symbol=AAPL` |
| Tarihsel rating | `/ratings-historical` | `symbol` |
| Fiyat hedefi özeti | `/price-target-summary` | `symbol` |
| Fiyat hedefi konsensüsü | `/price-target-consensus` | `symbol` |
| Notlar (grade) | `/grades` | `symbol` |
| Tarihsel notlar | `/grades-historical` | `symbol` |
| Not konsensüsü | `/grades-consensus` | `symbol` |

---

## 12. Piyasa Performansı (Market Performance)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| Sektör performansı | `/sector-performance-snapshot` | `date` |
| Sektör performansı (tarihsel) | `/historical-sector-performance` | `sector=Energy` |
| Sektör P/E | `/sector-pe-snapshot` | `date` |
| Sektör P/E (tarihsel) | `/historical-sector-pe` | `sector=Energy` |
| Sektör endüstri performansı | `/industry-performance-snapshot` | `date` |
| Endüstri performansı (tarihsel) | `/historical-industry-performance` | `industry=Biotechnology` |
| Endüstri P/E | `/industry-pe-snapshot` | `date` |
| Endüstri P/E (tarihsel) | `/historical-industry-pe` | `industry=Biotechnology` |
| En çok yükselenler | `/biggest-gainers` | - |
| En çok düşenler | `/biggest-losers` | - |
| En çok işlem görenler | `/most-actives` | - |

---

## 13. Teknik Göstergeler (Technical Indicators)

Tümü: `symbol`, `periodLength`, `timeframe` (örn. `1day`).

| Gösterge | Endpoint |
|----------|----------|
| SMA | `/technical-indicators/sma` |
| EMA | `/technical-indicators/ema` |
| WMA | `/technical-indicators/wma` |
| DEMA | `/technical-indicators/dema` |
| TEMA | `/technical-indicators/tema` |
| RSI | `/technical-indicators/rsi` |
| ATR (Average True Range) | `/technical-indicators/atr` |
| Bollinger Bands | `/technical-indicators/bollinger` |
| Standart sapma | `/technical-indicators/standarddeviation` |
| Williams | `/technical-indicators/williams` |
| ADX | `/technical-indicators/adx` |

---

## 14. ETF & Mutual Fund

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| ETF/Fon portföyü | `/etf/holdings` | `symbol=SPY` |
| ETF/Fon bilgisi | `/etf/info` | `symbol=SPY` |
| Ülke ağırlıkları | `/etf/country-weightings` | `symbol=SPY` |
| Hisse → ETF maruziyet | `/etf/asset-exposure` | `symbol=AAPL` |
| Sektör ağırlıkları | `/etf/sector-weightings` | `symbol=SPY` |
| Son disclosure | `/funds/disclosure-holders-latest` | `symbol=AAPL` |
| Fon disclosure | `/funds/disclosure` | `symbol=VWO`, `year`, `quarter` |
| Disclosure tarihleri | `/funds/disclosure-dates` | `symbol=VWO` |

---

## 15. SEC Dosyaları (SEC Filings)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| Son 8-K | `/sec-filings-8k` | `from`, `to`, `page`, `limit` |
| Son SEC dosyaları | `/sec-filings-financials` | `from`, `to`, `page`, `limit` |
| Form tipine göre | `/sec-filings-search/form-type` | `formType=8-K`, `from`, `to` |
| Sembole göre | `/sec-filings-search/symbol` | `symbol`, `from`, `to` |
| CIK’a göre | `/sec-filings-search/cik` | `cik`, `from`, `to` |
| İsme göre | `/sec-filings-company-search/name` | `company=Berkshire` |
| Sembole göre şirket | `/sec-filings-company-search/symbol` | `symbol=AAPL` |
| CIK’a göre şirket | `/sec-filings-company-search/cik` | `cik=...` |
| SEC tam profil | `/sec-profile` | `symbol=AAPL` |
| SIC listesi | `/standard-industrial-classification-list` | - |
| SIC arama | `/industry-classification-search` | - |
| Tüm SIC | `/all-industry-classification` | - |

---

## 16. İçerden İşlem (Insider Trades)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| Son içerden işlemler | `/insider-trading/latest` | `page`, `limit` |
| İçerden işlem arama | `/insider-trading/search` | `page`, `limit` (symbol vb.) |
| İsme göre arama | `/insider-trading/reporting-name` | `name=Zuckerberg` |
| İşlem tipleri | `/insider-trading-transaction-type` | - |
| İstatistikler | `/insider-trading/statistics` | `symbol=AAPL` |
| Faydalanıcı sahiplik | `/acquisition-of-beneficial-ownership` | `symbol=AAPL` |

---

## 17. Endeksler (Indexes)

| Veri | Endpoint | Parametreler |
|------|----------|--------------|
| **Endeks listesi** | `/index-list` | - | Tüm endeks sembolleri |
| Endeks quote | `/quote` | `symbol=^GSPC` |
| Endeks quote (kısa) | `/quote-short` | `symbol=^GSPC` |
| Tüm endeks quote | `/batch-index-quotes` | - |
| EOD hafif | `/historical-price-eod/light` | `symbol=^GSPC` |
| EOD tam | `/historical-price-eod/full` | `symbol=^GSPC` |
| 1 dk intraday | `/historical-chart/1min` | `symbol=^GSPC` |
| 5 dk intraday | `/historical-chart/5min` | `symbol=^GSPC` |
| 1 saat intraday | `/historical-chart/1hour` | `symbol=^GSPC` |
| S&P 500 bileşenleri | `/sp500-constituent` | - |
| Nasdaq bileşenleri | `/nasdaq-constituent` | - |
| Dow Jones bileşenleri | `/dow-jones-constituent` | - |

---

## 18. Emtia (Commodity)

| Veri | Endpoint | Not |
|------|----------|-----|
| **Emtia listesi** | `/commodities-list` | Tüm emtia sembolleri (liste kaynağı) |
| Emtia quote | `/batch-commodity-quotes` | Tüm emtia fiyatları |
| Emtia tarihsel / intraday | Dokümanda “Commodity” bölümü | Hisse ile aynı path pattern (symbol ile) |

---

## 19. Forex

| Veri | Endpoint | Not |
|------|----------|-----|
| **Forex listesi** | `/forex-list` | Tüm forex çiftleri (liste kaynağı) |
| Forex quote | `/batch-forex-quotes` | Tüm çiftlerin fiyatları |
| Forex tarihsel / intraday | Dokümanda “Forex” bölümü | 1 saatlik vb. chart endpoint’leri |

---

## 20. Kripto (Crypto)

| Veri | Endpoint | Not |
|------|----------|-----|
| Kripto quote | `/batch-crypto-quotes` | Tüm kripto fiyatları |
| Kripto listesi | (Stable docs’ta “Crypto” altında varsa) | Ayrı crypto-list benzeri endpoint olabilir |

---

## 21. Diğer (DCF, ESG, Senate, COT, Market Hours, Bulk, Fundraisers)

- **DCF:** Discounted Cash Flow endpoint’leri (stable docs’ta “Discounted Cash Flow”).
- **ESG:** ESG verisi (stable docs’ta “ESG”).
- **Senate:** Kongre işlemleri (stable docs’ta “Senate”).
- **Commitment of Traders:** COT verisi (stable docs’ta “Commitment Of Traders”).
- **Market Hours:** Piyasa saatleri (stable docs’ta “Market Hours”).
- **Bulk:** Toplu veri endpoint’leri (stable docs’ta “Bulk”).
- **Fundraisers:** Fundraiser verileri (stable docs’ta “Fundraisers”).

Bu kategorilerin tam path’leri için:  
https://site.financialmodelingprep.com/developer/docs/stable

---

## Özet: Haber Analizi İçin Kritik Veri Kaynakları

1. **Sembol listeleri:** `stock-list`, `forex-list`, `commodities-list`, `etf-list`, `index-list` → Hangi sembollerin mevcut olduğu.
2. **Anlık fiyat:** `quote`, `batch-quote`, `batch-forex-quotes`, `batch-crypto-quotes`, `batch-commodity-quotes`, `batch-index-quotes` → Güncel piyasa.
3. **Intraday / EOD:** `historical-chart/1min` (ve 5min, 15min, 1hour, 4hour), `historical-price-eod/light` veya `full` → Fiyat serisi (hisse, endeks, forex, emtia, kripto için ilgili endpoint’ler).
4. **Şirket / temel:** `profile`, `key-executives`, `income-statement`, `balance-sheet-statement`, `cash-flow-statement`, `ratios`, `key-metrics`, `financial-scores`.
5. **Makro / ekonomi:** `treasury-rates`, `economic-indicators`, `economic-calendar`.
6. **Takvim:** `earnings-calendar`, `dividends-calendar`, `ipos-calendar`, `splits-calendar`.
7. **Haber:** `news/stock`, `news/crypto`, `news/forex`, `news/press-releases`, `news/general-latest`.
8. **Analist:** `analyst-estimates`, `price-target-summary`, `grades-consensus`.
9. **Kurumsal:** Form 13F endpoint’leri, insider trading.

Bu katalog, Stage 1’de “bu tablodaki veriler var, istediğin veriyi iste” mantığıyla kullanılabilir; sonraki adımda hangi endpoint’lerin otomatik çağrılacağı ve hangi “istek formatının” Haiku’ya verileceği tasarlanabilir.
