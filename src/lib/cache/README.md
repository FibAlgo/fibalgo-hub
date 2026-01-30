# 🗄️ FibAlgo Data Cache System

## Genel Bakış

Bu sistem tüm API verilerini Supabase'de cache'ler. Rate limit'e takılsak bile eski veriler kullanılabilir.

## 🚀 Kurulum

### 1. Database Tablolarını Oluştur

Supabase Dashboard > SQL Editor'a gidin ve aşağıdaki SQL dosyasını çalıştırın:

📁 `supabase/migrations/001_data_cache_tables.sql`

Bu dosya şu tabloları oluşturur:
- `market_data_cache` - Fiyat verileri
- `ohlc_cache` - OHLC bar verileri
- `macro_data_cache` - Makro göstergeler
- `treasury_yields_cache` - Faiz oranları
- `fundamentals_cache` - Şirket finansalları
- `crypto_onchain_cache` - Kripto zincir verileri
- `cot_data_cache` - CFTC COT verileri
- `sentiment_cache` - Piyasa duyarlılığı
- `news_cache` - Haberler
- `api_call_log` - API çağrı logları
- `cache_metadata` - Cache istatistikleri

### 2. Tablolar Oluşturulduktan Sonra

Projeyi başlatın:
```bash
npm run dev
```

## 📊 Kullanım

### Temel Kullanım

```typescript
import { cachedFetch } from '@/lib/cache';

// Hisse fiyatı (cached)
const applePrice = await cachedFetch.equity('AAPL');
console.log(applePrice?.data.price);
console.log(applePrice?.isStale); // true ise eski veri

// Crypto fiyatı (cached)
const btcPrice = await cachedFetch.crypto('BTCUSDT');

// Forex (cached)
const eurUsd = await cachedFetch.forex('EURUSD=X');

// VIX (cached)
const vix = await cachedFetch.vix();

// Fear & Greed (cached)
const fg = await cachedFetch.fearGreed();

// Treasury Yields (cached)
const yields = await cachedFetch.treasuryYields();

// Funding Rates (cached)
const funding = await cachedFetch.fundingRates('BTCUSDT');

// Income Statement (cached)
const income = await cachedFetch.incomeStatement('AAPL');
```

### Toplu Veri Çekme

```typescript
import { getCachedMultiplePrices, getCachedMarketContext } from '@/lib/cache';

// Birden fazla hisse
const prices = await getCachedMultiplePrices(['AAPL', 'GOOGL', 'MSFT']);

// Tüm piyasa context'i
const context = await getCachedMarketContext();
console.log(context.macro);     // Makro veriler
console.log(context.indices);   // SPY, QQQ
console.log(context.crypto);    // BTC, ETH + funding + OI
console.log(context.isAnyStale); // Herhangi bir veri eski mi?
```

### Cache İstatistikleri

```typescript
import { getCacheStats, cleanupExpiredCache } from '@/lib/cache';

// İstatistikleri al
const stats = await getCacheStats();
console.log(stats.tables);      // Her tablodaki kayıt sayısı
console.log(stats.apiCalls24h); // Son 24 saat API çağrıları

// Expired verileri temizle
const result = await cleanupExpiredCache();
console.log(result.deleted);    // Silinen kayıt sayıları
```

## ⏱️ TTL (Time-To-Live) Değerleri

| Veri Tipi | TTL | Açıklama |
|-----------|-----|----------|
| Market Price | 60s | Hisse, index fiyatları |
| Crypto Price | 30s | Kripto fiyatları |
| Forex Price | 60s | Döviz kurları |
| VIX | 5m | Volatilite endeksi |
| Treasury Yields | 15m | Faiz oranları |
| Fear & Greed | 1h | Korku/Açgözlülük |
| Income Statement | 24h | Gelir tablosu |
| Balance Sheet | 24h | Bilanço |
| Cash Flow | 24h | Nakit akışı |
| DCF | 24h | Değerleme |
| Funding Rates | 5m | Kripto funding |
| Open Interest | 5m | Açık pozisyon |
| COT Data | 24h | CFTC verileri |

## 🔄 Cache Akışı

```
┌─────────────────────────────────────────────────────────────┐
│                       API REQUEST                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  1. CHECK CACHE (Supabase)                  │
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │ Valid Cache  │    │ Stale Cache  │    │  No Cache    │  │
│   │  (< TTL)     │    │  (> TTL)     │    │              │  │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│          │                   │                    │          │
│          │                   ▼                    ▼          │
│          │         ┌─────────────────────────────────────┐  │
│          │         │      2. FETCH FROM API              │  │
│          │         └───────────────┬─────────────────────┘  │
│          │                         │                         │
│          │              ┌──────────┴──────────┐              │
│          │              │                     │              │
│          │              ▼                     ▼              │
│          │      ┌───────────────┐    ┌───────────────┐      │
│          │      │  API SUCCESS  │    │   API FAIL    │      │
│          │      └───────┬───────┘    └───────┬───────┘      │
│          │              │                     │              │
│          │              ▼                     ▼              │
│          │      ┌───────────────┐    ┌───────────────┐      │
│          │      │ Update Cache  │    │ Return Stale  │      │
│          │      │ Return Fresh  │    │ (if exists)   │      │
│          │      └───────┬───────┘    └───────┬───────┘      │
│          │              │                     │              │
└──────────┼──────────────┼─────────────────────┼──────────────┘
           │              │                     │
           ▼              ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     RETURN DATA                              │
│                                                              │
│   {                                                          │
│     data: { ... },                                           │
│     isStale: boolean,    // Eski veri mi?                   │
│     source: 'cache' | 'api',                                 │
│     cachedAt: timestamp,                                     │
│     expiresAt: timestamp                                     │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Cron Jobs

| Job | Schedule | Açıklama |
|-----|----------|----------|
| `/api/cron/cleanup-cache` | Her saat (0 * * * *) | Expired cache verilerini siler |

## 📁 Dosya Yapısı

```
src/lib/cache/
├── index.ts              # Unified exports
├── data-cache.ts         # Core cache service (Supabase)
├── cached-fetchers.ts    # Cached data fetch wrappers
└── simple-cache.ts       # In-memory cache (backward compat)

src/app/api/cron/
└── cleanup-cache/
    └── route.ts          # Cache cleanup cron job

supabase/migrations/
└── 001_data_cache_tables.sql  # Database schema
```

## ⚠️ Önemli Notlar

1. **İlk Çağrı Yavaş Olabilir**: Cache boşsa API'ye gidilir
2. **Stale Data Döner**: API fail olursa eski veri döner (isStale: true)
3. **Rate Limit Koruması**: API çağrıları loglanır ve kontrol edilir
4. **Cleanup Otomatik**: Cron job expired verileri siler

## 🔧 Troubleshooting

### Cache çalışmıyor
1. Supabase tablolarının oluşturulduğunu kontrol edin
2. `SUPABASE_SERVICE_ROLE_KEY` env variable'ı doğru mu?

### Veri eski kalıyor
1. TTL değerlerini kontrol edin
2. Cleanup cron job çalışıyor mu?

### Rate limit'e takılıyoruz
1. `api_call_log` tablosunu kontrol edin
2. TTL değerlerini artırın
3. Batch fetch kullanın
