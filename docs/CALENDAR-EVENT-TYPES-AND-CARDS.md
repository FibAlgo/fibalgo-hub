# Takvim: Event Türleri ve Kartlarda Değişecekler

## 1. Economic Calendar – Forecast ve Actual kesin mi?

**Evet.** FMP Economic Calendar API’de:

- **Forecast (estimate):** Çoğu makro veride yayın öncesi tahmin gelir (NFP, CPI, GDP, PMI vb.). Bazı eventlerde (örn. FOMC kararı, bazı merkez bankası açıklamaları) “tahmin” sayısal olmayabilir; o zaman alan boş/null olabilir.
- **Actual:** Veri **açıklandıktan sonra** FMP bu alanı doldurur. Yani economic event’te actual, yayın sonrası kesin gelir.
- **Previous:** Bir önceki dönem değeri; genelde her zaman dolu.

Özet: Economic eventlerde **forecast** yayın öncesi, **actual** yayın sonrası kesin yayınlanıyor. FOMC gibi “sayısal tahmin yok” eventlerde forecast boş olabilir.

---

## 2. Diğer event türlerinde neler yayınlanıyor?

| Tür        | API / kaynak     | Yayınlanan alanlar (kartta kullanılabilecekler) |
|-----------|------------------|--------------------------------------------------|
| **Economic** | economic-calendar | `previous`, `estimate`/`forecast`, `actual`, `country`, `impact` |
| **Earnings**  | earnings-calendar | `symbol`, `date`, `epsEstimated`, `epsActual`, `revenue`, `company`; bazen `revenueEstimated`/`revenueActual` |
| **IPO**      | ipos-calendar     | `symbol`, `company`, `date`, `exchange`, `priceRange` veya `price`; actual “fiyat” çoğu zaman sonra güncellenir |
| **Dividends**| dividends-calendar| `symbol`, `date` (ex-date), `dividend`, `adjDividend`, payment date (varsa) |
| **Splits**   | splits-calendar   | `symbol`, `date`, `numerator`, `denominator` (split oranı, örn. 4:1) |

Yani:

- **Economic:** previous, forecast, actual (sayısal).
- **Earnings:** EPS tahmin/gerçek, isteğe bağlı revenue; “beat/miss” EPS’e göre.
- **IPO:** Fiyat aralığı, borsa; “actual” genelde açılış fiyatı (sonradan güncellenebilir).
- **Dividends:** Tutar, ex-date, ödeme tarihi.
- **Splits:** Oran (örn. 4:1), tarih.

---

## 3. Tab olarak diğer eventleri eklediğimizde event kartlarında neleri değiştirmemiz gerekiyor?

### 3.1 Tab / filtre

- **Mevcut:** All Events, High Impact, Medium+ ve ülke filtresi.
- **Eklenecek:** Event **türü** seçimi (tab veya dropdown):
  - **All** (veya Economic + Earnings + IPO birlikte)
  - **Economic** (macro)
  - **Earnings**
  - **IPO**
  - (İleride) **Dividends**, **Splits**

Böylece kullanıcı “sadece earnings” veya “sadece IPO” görüntüleyebilir.

### 3.2 Tablo kolon başlıkları (Actual / Forecast / Previous sütunları)

Şu an tek başlık: **Actual | Forecast | Previous**. Diğer türlerde anlam farklı; iki yaklaşım:

- **A) Hep aynı başlık:** “Actual / Forecast / Previous” kalsın; her satırda **içerik** türe göre değişsin (macro: sayı; earnings: EPS; IPO: fiyat aralığı / borsa; vb.).
- **B) Türe göre başlık:** Seçilen tab’a göre başlıklar değişsin:
  - Economic: **Actual** | **Forecast** | **Previous**
  - Earnings: **EPS Actual** | **EPS Est.** | **Prev.**
  - IPO: **Price Range** | **Exchange** | **—**
  - Dividends: **Amount** | **Ex-Date** | **Pay Date**
  - Splits: **Ratio** | **Date** | **—**

Öneri: “All” için A; tek tür seçiliyken (Economic / Earnings / IPO) B kullanılabilir.

### 3.3 Event kartı (tablo satırı) – hücre içeriği

Her event tipi için üç veri sütununda gösterilecekler:

| Tür        | 1. sütun (Actual tarafı) | 2. sütun (Forecast tarafı) | 3. sütun (Previous tarafı) |
|-----------|---------------------------|----------------------------|----------------------------|
| **macro** | `actual`                  | `forecast`                 | `previous`                 |
| **earnings** | EPS actual              | EPS estimate               | Önceki çeyrek EPS / revenue |
| **ipo**   | Fiyat aralığı (veya açılış fiyatı) | Borsa (`exchange`) | — veya not |
| **dividends** | Tutar (`dividend`)   | Ex-date                    | Payment date               |
| **splits** | Oran (örn. 4:1)          | Tarih                      | —                          |

Yapılacaklar:

- `CalendarEvent` içinde türe göre alanlar kullanılıyor (zaten `type`, `forecast`, `actual`, `previous` var; earnings’ta bunlar EPS için map’leniyor).
- Tablo satırında bu üç hücreyi **event.type**’a göre dolduran bir helper kullan (örn. `getEventDisplayValues(event)` → `{ col1, col2, col3 }`).
- IPO/Dividends/Splits için `description` veya ek alanlar (exchange, dividend, ratio) API’den gelip `CalendarEvent`’e map’lenmeli.

### 3.4 Beat / miss rengi (yeşil / kırmızı)

- **Economic:** Actual vs forecast karşılaştırması (yüksek = iyi veya düşük = iyi, göstergeye göre) → mevcut mantık.
- **Earnings:** EPS actual vs estimate → beat (yeşil), miss (kırmızı). Sadece **sayısal** olduğunda uygula.
- **IPO / Dividends / Splits:** Sayısal “beat/miss” yok; renk mantığı uygulanmaz veya nötr bırakılır.

Yapılacak: Renk hesaplayan yerde `event.type === 'macro' || event.type === 'earnings'` ve `parseFloat` ile geçerli sayı kontrolü; diğer türlerde tek renk (örn. gri/nötr).

### 3.5 Popup (event detay / analiz)

- **Economic:** Pre-event + post-event analiz (DB’den); actual/forecast/previous zaten kullanılıyor.
- **Earnings:** İstenirse pre/post earnings analizi (EPS, revenue, guidance); aynı popup’ta “EPS Actual / Est. / Prev.” gösterilebilir.
- **IPO / Dividends / Splits:** AI analiz yoksa “Detay” modunda sadece bilgi kartı (tarih, fiyat aralığı, borsa, tutar, oran vb.); “No AI analysis” veya türe özel kısa açıklama gösterilebilir.

### 3.6 Kart bileşenleri (Pre-Event / Post-Event / Live kartları)

- **Pre-Event / Upcoming kartı:** Şu an “Expected” = forecast, “prev” = previous. Earnings için “EPS Est.”, “Prev. EPS” gibi etiket; IPO için “Price Range”, “Exchange” gibi metin.
- **Post-Event (JUST RELEASED) kartı:** Actual vurgulu; earnings’ta “EPS Actual” ve beat/miss.
- **Live / Awaiting kartı:** Economic ve earnings için anlamlı (tahmin bekleniyor); IPO için “Listing date” vurgusu.

Yapılacak: Bu kartlarda da `event.type`’a göre label ve değer seti seç (aynı `getEventDisplayValues` veya benzeri).

### 3.7 Interface / API eşlemesi

- `CalendarEvent`’e opsiyonel alanlar eklenebilir:
  - Earnings: `revenueEstimated`, `revenueActual` (varsa).
  - IPO: `exchange`, `priceRange` (zaten previous’a map’lenebilir; ayrı alan daha net).
  - Dividends: `dividend`, `exDate`, `paymentDate`.
  - Splits: `splitRatio` veya `numerator`/`denominator`.

Böylece hem tablo hem popup hem kartlar aynı alanlarla beslenir.

---

## Özet checklist

| Konu | Yapılacak |
|------|------------|
| Tab / filtre | Event türü seçimi: All, Economic, Earnings, IPO (, Dividends, Splits) |
| Kolon başlıkları | Türe göre (veya “All”da generic) Actual/Forecast/Previous → EPS Actual/Est./Prev. veya Price/Exchange/— vb. |
| Satır hücreleri | `event.type`’a göre col1/col2/col3 (actual/forecast/previous veya EPS/IPO/dividend/split alanları) |
| Beat/miss rengi | Sadece macro + earnings, sayısal değer varsa |
| Popup | Macro: pre+post analiz; Earnings: opsiyonel analiz; IPO/Dividends/Splits: bilgi kartı / “No AI analysis” |
| Pre/Post/Live kartları | Türe göre label ve değer (Expected → EPS Est. / Price Range vb.) |
| API → CalendarEvent | Earnings/IPO/Dividends/Splits için gerekli alanların map’lenmesi |

Bu doküman, “economic calendar’da forecast ve actual kesin mi?” ve “diğer eventleri tab olarak eklediğimizde event kartlarında neleri değiştirmemiz gerekiyor?” sorularının cevabını tek yerde topluyor.
