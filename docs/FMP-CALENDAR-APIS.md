# FMP Takvim API'leri – Farklar ve Kullanım

FMP (Financial Modeling Prep) takvim verisi için farklı endpoint'ler sunar. Her biri farklı event türünü döner.

---

## 1. Economic Calendar  
**Endpoint:** `/stable/economic-calendar` (Stable) veya `/api/v3/economic_calendar` (v3)

**Ne döner:** Makroekonomik veri açıklamaları.

| Örnek eventler | Alanlar (genel) |
|----------------|-----------------|
| Non-Farm Payrolls, CPI, FOMC, GDP, PMI, Retail Sales, ECB/BOJ faiz kararları | `country`, `event`, `date`, `previous`, `estimate`/`forecast`, `actual`, `impact` |

**Kullanım:** Merkez bankaları, enflasyon, istihdam, büyüme verileri. Tahmin (forecast) vs gerçekleşen (actual) karşılaştırması yapılır; pre/post event analizi için uygundur.

**Projede:** Takvim sayfasında “macro” eventler bu API’den gelir.

---

## 2. Earnings Calendar  
**Endpoint:** `/stable/earnings-calendar` (Stable) veya `/api/v3/earning_calendar` (v3)

**Ne döner:** Şirketlerin gelir (earnings) açıklama tarihleri.

| Örnek | Alanlar (genel) |
|-------|-----------------|
| AAPL Earnings, MSFT Earnings | `symbol`, `date`, `epsEstimated`, `epsActual`, `revenue`, `company` |

**Kullanım:** Hangi gün hangi şirket earnings açıklayacak; EPS/revenue tahmin vs gerçek. Hisse bazlı volatilite ve event trading için.

**Projede:** Takvimde “earnings” eventler bu API’den gelir.

---

## 3. IPO Calendar  
**Endpoint:** `/stable/ipos-calendar` (Stable) veya `/api/v3/ipo_calendar` (v3)

**Ne döner:** Halka arz (IPO) tarihleri.

| Örnek | Alanlar (genel) |
|-------|-----------------|
| XYZ Corp IPO | `symbol`, `company`, `date`, `exchange`, `priceRange`/`price` |

**Kullanım:** Yeni borsa giriş tarihleri; IPO günü fiyat hareketi ve likidite takibi.

**Projede:** Takvimde “ipo” eventler bu API’den gelir.

---

## 4. Dividends Calendar  
**Endpoint:** `/stable/dividends-calendar`

**Ne döner:** Temettü (dividend) ödeme / ex-date takvimi.

| Örnek | Alanlar (genel) |
|-------|-----------------|
| AAPL dividend, ex-date, payment date | `symbol`, `date` (ex-date veya payment), `dividend`, `adjDividend` |

**Kullanım:** Hangi tarihte hangi hisse ex-dividend, ne kadar ödeme. Dividend stratejisi ve nakit akışı planlaması.

**Projede:** Şu an kullanılmıyor; eklenirse takvimde “dividends” tipi event olarak gösterilebilir.

---

## 5. Splits Calendar  
**Endpoint:** `/stable/splits-calendar`

**Ne döner:** Hisse bölünmeleri (stock split) tarihleri.

| Örnek | Alanlar (genel) |
|-------|-----------------|
| AAPL 4:1 split | `symbol`, `date`, `numerator`, `denominator` (split ratio) |

**Kullanım:** Split tarihi; fiyat ve lot hesaplamalarının güncellenmesi, volatilite/arbitraj.

**Projede:** Şu an kullanılmıyor; eklenirse “splits” tipi event olarak gösterilebilir.

---

## Özet

| API | İçerik | Projede kullanım |
|-----|--------|-------------------|
| **Economic Calendar** | Makro veriler (NFP, CPI, FOMC, GDP…) | ✅ Macro eventler |
| **Earnings Calendar** | Şirket earnings tarihleri (EPS, revenue) | ✅ Earnings eventler |
| **IPO Calendar** | Halka arz tarihleri | ✅ IPO eventler |
| **Dividends Calendar** | Temettü ex-date / payment | ❌ Yok |
| **Splits Calendar** | Hisse bölünmeleri | ❌ Yok |

---

## v3 vs Stable base URL

- **v3:** `https://financialmodelingprep.com/api/v3`  
  Örnek: `economic_calendar`, `earning_calendar`, `ipo_calendar`
- **Stable:** `https://financialmodelingprep.com/stable`  
  Örnek: `economic-calendar`, `earnings-calendar`, `ipos-calendar`, `dividends-calendar`, `splits-calendar`

Stable path’ler genelde tire ile (`economic-calendar`); v3 path’ler alt çizgi ile (`economic_calendar`). Response şeması dokümantasyonda kontrol edilmeli; gerekirse proje Stable’a taşınabilir.
