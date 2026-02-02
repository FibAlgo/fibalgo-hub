# notification_history - Şema Referansı

## Tablo Kolonları (Tek Kaynak)

| Kolon | Tip | NOT NULL | DEFAULT | Açıklama |
|-------|-----|----------|---------|----------|
| id | UUID | ✓ | gen_random_uuid() | PK |
| user_id | UUID | ✓ | - | users(id) FK |
| **type** | TEXT | ✓* | 'system' | Tip (NOT NULL - bazı DB'lerde zorunlu) |
| **notification_type** | TEXT | ✓* | 'system' | Tip (migration ile) |
| title | TEXT | ✓ | - | Başlık |
| message | TEXT | ✓ | - | Mesaj |
| icon | TEXT | | null | İkon adı (alert-triangle, newspaper, zap, calendar, target) |
| action_url | TEXT | | null | Tıklanınca gidilecek URL |
| related_id | TEXT | | null | İlişkili ID (news_id, alert.id, event_id vb.) |
| related_type | TEXT | | null | İlişkili tip (news, signal, calendar_event vb.) |
| metadata | JSONB | | '{}' | Ek veri |
| is_read | BOOLEAN | | false | Okundu mu |
| read_at | TIMESTAMPTZ | | null | Okunma zamanı |
| is_dismissed | BOOLEAN | | false | Kapatıldı mı |
| created_at | TIMESTAMPTZ | | NOW() | Oluşturulma zamanı |

*type ve notification_type: Her ikisi de INSERT sırasında **aynı değerle** set edilmeli (DB uyumluluğu).

## Kullanılan Yerler

| Dosya | Insert Tipi |
|-------|-------------|
| `src/lib/notifications/newsNotifications.ts` | news, signal |
| `src/app/api/cron/calendar-reminders/route.ts` | calendar |
| `src/app/api/cron/check-price-alerts/route.ts` | price_alert |

## Geçerli Tip Değerleri

- `news`
- `signal`
- `price_alert`
- `calendar`
- `system`
- `announcement`

## Migration

`supabase/migrations/20260202210000_notification_history_complete.sql` - Tüm kolonları ekler.
