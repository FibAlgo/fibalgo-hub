# Education Sayfası – İçerik Kaynakları ve Öneriler

## 1. “Trading education” için hazır API’ler var mı?

- **Doğrudan “eğitim içeriği” veren bir API yok.** FMP’nin “Education” bölümü kendi dokümantasyonu (nasıl API kullanılır, DCF formülü vb.); veri endpoint’i değil. Alpha Vantage’ın “Alpha Academy” da kendi eğitim platformu, dışarıya API ile eğitim içeriği sunmuyor.
- **Piyasa verisi API’leri** (FMP, Alpha Vantage, Intrinio) fiyat, haber, temel veri sağlar; bunları eğitim sayfasında “örneklerle anlatım” için kullanabilirsiniz, ama hazır “ders” veya “makale” listesi çeken bir endpoint yok.

**Sonuç:** Education sayfasını “güncel veri paylaşan API” ile doldurmak yerine, **kendi içeriğiniz + mevcut verilerinizi eğitim bağlamında kullanmak** mantıklı.

---

## 2. Eğitim için eğitilmiş modeller

- **Genel amaçlı LLM’ler** (Claude, GPT, vb.) finans/ekonomi terimlerini açıklayabilir; “eğitim sayfası” için kısa paragraflar (glossary, “bu metriği nasıl okuyorsun?”) üretebilirsiniz.
- **FibAlgo’da zaten kullandığınız analiz pipeline’ı** (haber analizi, sentiment) aynı modeli “eğitim” için de kullanabilir: örneğin kullanıcı “Market Risk Premium ne demek?” diye sorunca 2–3 cümle açıklama üretmek.
- **Özel “trading education” modeli** kullanmak zorunda değilsiniz; mevcut model + iyi prompt’larla (terim, risk uyarısı, kısa ve net dil) yeterli olur.

---

## 3. Education sayfasını nasıl doldurabilirsiniz?

### A) Kendi içeriğiniz (API’ye gerek yok)

| Bölüm | İçerik fikri |
|--------|----------------|
| **Terminal kullanımı** | “FibAlgo Terminal’i nasıl kullanırım?”, “Haber kartlarındaki BULLISH/BEARISH ne?”, “Economic Calendar’ı nasıl okurum?” |
| **Kavramlar / Glossary** | P/E, DCF, RSI, Market Risk Premium, Treasury yield, support/resistance, sentiment vb. kısa tanımlar (statik MD veya CMS). |
| **Risk ve disiplin** | Pozisyon büyüklüğü, stop-loss, “sinyal tek başına yeterli değildir” vb. kısa uyarılar. |

Bunlar statik sayfalar veya markdown’dan render edilebilir; güncellemek için “API” değil, içerik güncellemesi yeterli.

### B) Mevcut verilerinizi “eğitim” bağlamında kullanmak

- **FMP’den zaten çektiğiniz veriler** (Market Risk Premium, Treasury, gainers/losers) Education sayfasında “örnek” olarak gösterilebilir: “Bu widget’ta gördüğünüz Market Risk Premium şu an X; bu ne anlama gelir?” gibi bir blok + kısa açıklama.
- **Haber / sentiment** ile “Bu haberdeki sentiment etiketi nasıl yorumlanır?” örnekleri ekleyebilirsiniz.
- Güncelliği “gerçek zamanlı” yapan şey, zaten terminalde kullandığınız API’ler; Education sayfası sadece bu veriyi “eğitim metni + örnek” olarak sunar.

### C) AI ile kısa açıklamalar (opsiyonel)

- Terim veya widget adı (örn. “Market Risk Premium”) için bir “Açıkla” butonu: mevcut LLM’inizle 2–3 cümle açıklama üretip modal veya tooltip’te göstermek.
- Bu, “eğitim için eğitilmiş özel model” gerektirmez; mevcut analiz API’nize ek bir “explain” endpoint’i ekleyebilirsiniz.

### D) Dış kaynak linkleri

- TradingView Education, Investopedia, FMP docs, broker eğitim sayfaları gibi **curated link listesi** “Daha fazla öğren” bölümünde verilebilir. Güncel veri API’si değil, ama sayfa dolu ve faydalı görünür.

---

## 4. Önerilen minimum yapı (ilk sürüm)

1. **“Terminal’i tanıyın”** – Kısa metin: News & Tweets, Market Data, Economic Calendar, grafik nasıl okunur.
2. **“Kavramlar” / Glossary** – 10–15 terim (P/E, DCF, RSI, Market Risk Premium, sentiment, breaking news vb.); statik veya MD.
3. **“Widget’lar ne anlama gelir?”** – Market Data ve Economic Calendar’daki göstergelerin kısa açıklaması; isteğe bağlı olarak FMP’den çektiğiniz güncel bir değerle örnek.
4. **“Daha fazla kaynak”** – 3–5 dış link (Investopedia, TradingView Education, FMP Education vb.).

Bu yapı için **ekstra bir “education API” veya özel model gerekmez**; mevcut stack (Next, FMP, LLM) ile yapılabilir.

---

## 5. Kısa cevaplar

| Soru | Cevap |
|------|--------|
| Trading education ile güncel veri paylaşan API var mı? | Doğrudan “eğitim içeriği” veren hazır API yok. Piyasa verisi API’lerini (FMP vb.) eğitim örnekleri için kullanabilirsiniz. |
| Eğitim için eğitilmiş model gerekli mi? | Hayır. Mevcut LLM ile terim açıklama / “bu metriği nasıl okursun?” gibi kısa metinler üretmek yeterli. |
| Sayfayı nasıl doldururuz? | Statik bölümler (Terminal rehberi, Glossary, risk uyarıları) + isteğe bağlı “canlı örnek” (FMP verisi + açıklama) + opsiyonel AI “Açıkla” + dış linkler. |

Bu dokümandaki yapıya göre isterseniz bir sonraki adımda `/terminal/education` için basit bir sayfa iskeleti (bölümler + placeholder içerik) çıkarabiliriz.
