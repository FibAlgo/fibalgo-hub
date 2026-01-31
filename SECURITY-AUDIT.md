# Güvenlik Denetimi Özeti (Security Audit)

Bu belge, siteyi binlerce/on binlerce kullanıcı için güvenli ve kötüye kullanıma karşı dayanıklı tutmak için yapılan inceleme ve düzeltmeleri özetler.

---

## ✅ Yapılan Düzeltmeler

### 1. IDOR (Insecure Direct Object Reference) – GET /api/user
- **Sorun:** Giriş yapmış normal kullanıcı `?userId=BAŞKA_BIR_UUID` ile başka kullanıcının profil/abonelik/fatura verisine erişebiliyordu.
- **Çözüm:** Admin değilse sadece kendi `userId` veya kendi `email` ile istek yapılabiliyor. Ayrıca admin kontrolü `super_admin` için de geçerli olacak şekilde güncellendi.

### 2. E-posta doğrulama (verify-email) – token zorunluluğu
- **Sorun:** Sadece `email` ile (token olmadan) doğrulama linki tahmin edilerek e-posta doğrulanabiliyordu.
- **Çözüm:** Doğrulama için hem `email` hem `token` zorunlu; token eşleşmesi ve süresi kontrol ediliyor.

### 3. AI API kötüye kullanımı – /api/ai/analyze-news
- **Sorun:** Giriş zorunlu değildi, rate limit sadece in-memory (serverless’ta etkisiz) olduğu için pahalı AI çağrıları kötüye kullanılabilirdi.
- **Çözüm:** `requireAuth()` ile giriş zorunlu; rate limit Upstash (Redis) ile kalıcı hale getirildi.

### 4. Admin ban – super_admin koruması
- **Sorun:** Admin kullanıcı `super_admin` hesabını banlayabiliyordu.
- **Çözüm:** Hedef kullanıcı `admin` veya `super_admin` ise ban işlemi reddediliyor.

---

## ✅ Zaten Güvenli Olan Alanlar

### Kimlik doğrulama ve yetkilendirme
- **Cron route’ları:** Production’da `CRON_SECRET` ile `Authorization: Bearer <secret>` kontrolü yapılıyor.
- **Admin route’ları:** Hepsi `requireAdmin()` kullanıyor (admin veya super_admin).
- **Kullanıcı route’ları:** `/api/user/*` (preferences, history, alerts, watchlist, push) session’daki `user.id` ile çalışıyor; client’tan gelen `user_id` ile veri dönülmüyor.
- **Auth helper’lar:** `requireAuth()` session’dan kullanıcı alıyor; client’ın gönderdiği userId’e güvenilmiyor.

### Rate limiting (Upstash Redis)
- **Auth:** login, signup, forgot-password, reset-password, verify-reset-code, resend-verification, send-verification (10/dk civarı).
- **AI:** analyze-news, calendar pre-event, post-event, historical, market-context (20/dk civarı).
- **Login ek:** E-posta başına 5 başarısız denemeden sonra CAPTCHA; production’da RECAPTCHA_SECRET_KEY yoksa istek reddediliyor.
- **Signup:** IP başına in-memory yedek limit (5/saat) + Upstash.

### Webhook’lar
- **Polar (aktif):** `/api/polar/webhook` – `@polar-sh/sdk` ile `validateEvent` (imza doğrulama); `POLAR_WEBHOOK_SECRET` yoksa 500.
- **Eski Polar:** `/api/webhooks/polar` – 410 Deprecated, işlenmiyor.

### Giriş ve kayıt
- **Şifre:** En az 8 karakter, en az bir rakam, en az bir büyük harf.
- **Redirect:** `sanitizeRedirectUrl` ile sadece izin verilen path’ler; open redirect engelli.
- **Hata mesajları:** `sanitizeDbError` ile DB detayları client’a gönderilmiyor.

### Veritabanı
- **Bildirim tercihleri PUT:** Sadece allow-list’teki alanlar güncelleniyor; `id`, `user_id`, `created_at` vb. client’tan kabul edilmiyor.
- **Bildirim history POST:** `mark_read` / `dismiss` için `notification_ids` dizisi ve `user_id` (session) ile yetki kontrolü; sadece kullanıcının kendi kayıtları güncelleniyor.

---

## ✅ Kodda Zorunlu Hale Getirilen Önlemler (Production Öncesi)

1. **Upstash Redis:** Production’da `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` yoksa rate limit **bloklar** (fail closed). Development’ta atlanır.
2. **reCAPTCHA:** Production’da `RECAPTCHA_SECRET_KEY` yoksa login **503** döner; login kapalı kalır.
3. **CRON_SECRET:** Tüm cron route’ları production’da secret zorunlu; yoksa 500, yanlış header ise 401. Vercel Cron’da `Authorization: Bearer <CRON_SECRET>` gönderilmeli (`.env.example` ve `vercel.json`).
4. **POLAR_WEBHOOK_SECRET:** Yoksa webhook 500. İmza doğrulama başarısızsa **fallback yok**, 403 döner.
5. **exec-sql (admin):** Production’da varsayılan **kapalı**; açmak için `ALLOW_ADMIN_EXEC_SQL=true` gerekir.
6. **Loglama:** Auth ve verify-email’de production’da hassas veri loglanmıyor; `maskEmail` / `maskUserId` kullanılıyor; detaylı loglar sadece development’ta.

Ortam değişkenleri için `.env.example` içinde production zorunlulukları listelenmiştir.

---

## Kısa Kontrol Listesi

| Konu | Durum |
|------|--------|
| Cron route’ları CRON_SECRET ile korunuyor (prod’da zorunlu) | ✅ |
| Admin route’ları requireAdmin kullanıyor | ✅ |
| User route’ları session user_id kullanıyor | ✅ |
| GET /api/user IDOR | ✅ Düzeltildi |
| E-posta doğrulama token zorunlu | ✅ Düzeltildi |
| AI API auth + Upstash rate limit | ✅ Düzeltildi |
| Polar webhook: imza zorunlu, fallback yok | ✅ Düzeltildi |
| Login: prod’da RECAPTCHA secret zorunlu (503 yoksa) | ✅ Düzeltildi |
| Rate limit: prod’da Redis yoksa blok | ✅ Düzeltildi |
| exec-sql prod’da varsayılan kapalı | ✅ Düzeltildi |
| Loglama: prod’da hassas veri maskeli | ✅ Düzeltildi |
| Ban ile admin/super_admin koruması | ✅ Düzeltildi |

Bu özet, yapılan kod incelemesi ve düzeltmelere dayanır. Büyük ölçekte canlıya almadan önce penetrasyon testi ve düzenli güvenlik taramaları önerilir.
