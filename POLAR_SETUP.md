# Polar Ödeme Sistemi Kurulum Rehberi

## Mevcut Durum
- ✅ Sandbox entegrasyonu tamamlandı
- ✅ Checkout sistemi çalışıyor
- ✅ Webhook handler hazır
- ✅ Customer Portal hazır

## Environment Variables

### Sandbox (Test) Ayarları
Şu anda `.env.local` ve Vercel'de sandbox ayarları aktif:

```env
POLAR_MODE=sandbox
POLAR_ACCESS_TOKEN=polar_oat_xxx  # Sandbox token
POLAR_WEBHOOK_SECRET=polar_whs_xxx  # Sandbox webhook secret
POLAR_ORGANIZATION_ID=fibalgo

# Sandbox Product IDs
NEXT_PUBLIC_POLAR_PREMIUM_PRODUCT_ID=45b483d8-3b24-44cc-967d-bf3b053942d9
NEXT_PUBLIC_POLAR_ULTIMATE_PRODUCT_ID=0ab5351b-4c45-44ee-8ae7-dc9721d595dd
```

### Production (Canlı) Geçişi

Production'a geçmek için şu adımları izle:

#### 1. polar.sh'da (production) Ayarlar

1. https://polar.sh/dashboard/fibalgo/settings adresine git
2. **Products** bölümünden Premium ve Ultimate ürünleri oluştur
3. **Developers > Personal Access Tokens** bölümünden yeni token oluştur
4. **Webhooks** bölümünden webhook ekle:
   - URL: `https://fibalgo.com/api/polar/webhook`
   - Events: Tümünü seç veya en azından:
     - `order.paid`
     - `subscription.created`
     - `subscription.updated`
     - `subscription.active`
     - `subscription.canceled`
     - `subscription.revoked`
     - `order.refunded`

#### 2. Vercel Environment Variables Güncelle

```bash
# Eski değerleri sil
vercel env rm POLAR_MODE production -y
vercel env rm POLAR_ACCESS_TOKEN production -y
vercel env rm POLAR_WEBHOOK_SECRET production -y
vercel env rm NEXT_PUBLIC_POLAR_PREMIUM_PRODUCT_ID production -y
vercel env rm NEXT_PUBLIC_POLAR_ULTIMATE_PRODUCT_ID production -y

# Yeni production değerlerini ekle
echo "production" | vercel env add POLAR_MODE production
echo "polar_oat_xxx" | vercel env add POLAR_ACCESS_TOKEN production  # Production token
echo "polar_whs_xxx" | vercel env add POLAR_WEBHOOK_SECRET production  # Production webhook secret
echo "xxx" | vercel env add NEXT_PUBLIC_POLAR_PREMIUM_PRODUCT_ID production  # Production Premium Product ID
echo "xxx" | vercel env add NEXT_PUBLIC_POLAR_ULTIMATE_PRODUCT_ID production  # Production Ultimate Product ID

# Deploy
vercel --prod
```

#### 3. .env.local Güncelle (Opsiyonel - lokal test için)

```env
# Production Credentials
POLAR_MODE=production
POLAR_ACCESS_TOKEN=polar_oat_xxx  # Production token
POLAR_WEBHOOK_SECRET=polar_whs_xxx  # Production webhook secret

# Production Product IDs
NEXT_PUBLIC_POLAR_PREMIUM_PRODUCT_ID=xxx  # Production'dan al
NEXT_PUBLIC_POLAR_ULTIMATE_PRODUCT_ID=xxx  # Production'dan al
```

## Dosya Yapısı

```
src/
├── app/api/
│   ├── checkout/route.ts          # Polar SDK Checkout handler
│   └── polar/
│       ├── checkout/route.ts      # Manual checkout (alternatif)
│       ├── portal/route.ts        # Customer portal
│       ├── products/route.ts      # Products API
│       └── webhook/route.ts       # Webhook handler
└── lib/
    └── polar/
        ├── config.ts              # Polar configuration
        ├── client.ts              # Polar client
        ├── service.ts             # Business logic
        └── index.ts               # Exports
```

## Test Etme

### Sandbox Test Kartı
```
Card: 4242 4242 4242 4242
Expiry: Herhangi bir gelecek tarih
CVC: Herhangi 3 rakam
```

### Webhook Test
Webhook'ların çalıştığını kontrol etmek için:
1. Sandbox'ta test ödeme yap
2. Vercel logs'u kontrol et: `vercel logs --follow`
3. Supabase'de `subscriptions` tablosunu kontrol et

## Önemli Notlar

1. **Token Güvenliği**: Production token'larını asla commit etme!
2. **Webhook Secret**: Webhook secret'ı doğru şekilde ayarla
3. **Product ID'ler**: Sandbox ve Production product ID'leri farklı!
4. **URL'ler**: 
   - Sandbox API: `https://sandbox-api.polar.sh/v1`
   - Production API: `https://api.polar.sh/v1`

## Sorun Giderme

### 401 Unauthorized
- Token'ın doğru environment için oluşturulduğundan emin ol
- Sandbox token → sandbox API
- Production token → production API

### Webhook Çalışmıyor
- Webhook URL'inin doğru olduğundan emin ol
- Webhook secret'ın eşleştiğinden emin ol
- Vercel logs'u kontrol et

### Checkout Hatası
- Product ID'nin doğru olduğundan emin ol
- Environment variable'ların Vercel'e eklendiğinden emin ol
