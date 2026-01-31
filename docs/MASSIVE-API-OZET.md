# Massive API – Neler Yapılabilir ve Yetki Kontrolü

## Massive API ile Neler Yapılabilir?

Massive, tek bir API anahtarı ile şu erişim yöntemlerini sunar:

| Erişim | Açıklama |
|--------|----------|
| **REST API** | İstek başına veri: hisse, opsiyon, vadeli, endeks, forex, kripto, ekonomi, partner (Benzinga) |
| **WebSocket** | Canlı veri akışı: aynı varlık sınıfları |
| **Flat Files** | Toplu tarihsel veri (CSV / S3 uyumlu) |

### REST endpoint grupları (dokümantasyon)

- **Stocks** – Hisse: işlemler (trades), kotasyonlar (quotes), temel veri, dividend, split vb.
- **Options** – Opsiyon verisi
- **Futures** – Vadeli işlemler
- **Indices** – Endeksler
- **Forex** – Döviz
- **Crypto** – Kripto
- **Economy** – Ekonomi verileri
- **Partners** – Benzinga: haber, earnings, analyst ratings vb.

### Projede kullanım

- **Sadece Benzinga News** kullanılıyor: `GET https://api.massive.com/benzinga/v2/news`  
- Parametreler: `apiKey`, `published` (timestamp veya tarih), `limit` (en fazla 50.000), `sort`, `tickers`, `channels`, `tags`, `author`.

Hisse/opsiyon/forex vb. veriler projede **Massive üzerinden kullanılmıyor**; piyasa verisi FMP, Finnhub vb. kaynaklardan alınıyor.

---

## Yetki Nasıl Belirlenir?

- Hangi **plan**a sahip olduğunuz (hangi ürünler açık) Massive **dashboard** üzerinden görülür; buna özel bir “yetki sorgulama” API’si yok.
- Bir endpoint’e istek attığınızda:
  - **200** (ve anlamlı veri) → O ürün/endpoint için yetkiniz var.
  - **401** / **403** veya plan hatası → O ürün sizin planınızda yok veya anahtar geçersiz.

---

## Yetki Kontrolü Script’i

Proje kökünde:

```bash
node scripts/check-massive-api.mjs
```

Bu script:

1. `MASSIVE_API_KEY` değerini `.env.local` (veya ortam değişkeni) içinden okur.
2. Aşağıdaki Massive endpoint’lerine **tek seferlik** GET atar:
   - **Benzinga News** (projede kullandığınız)
   - **Stocks – Dividends**
   - **Stocks – Trades (AAPL)**
   - **Stocks – Quotes (AAPL)**
3. Her biri için sonucu **OK** veya **ERISIM YOK** olarak yazar.

Böylece hangi ürünlere erişiminiz olduğunu hızlıca görebilirsiniz. Planınıza göre bazı endpoint’ler 403/402 dönebilir; bu normaldir.

---

## Kaynaklar

- [Massive Docs](https://massive.com/docs)
- [REST Quickstart](https://massive.com/docs/rest/quickstart)
- [Benzinga News (REST)](https://massive.com/docs/rest/partners/benzinga/news)
- [Stocks – Dividends](https://massive.com/docs/rest/stocks/corporate-actions/dividends)
- [Stocks – Trades](https://massive.com/docs/rest/stocks/trades-quotes/trades)
- [Stocks – Quotes](https://massive.com/docs/rest/stocks/trades-quotes/quotes)
- Plan ve abonelikler: [Massive Dashboard](https://massive.com/dashboard)
