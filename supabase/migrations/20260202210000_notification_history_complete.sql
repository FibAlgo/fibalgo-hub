-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTIFICATION_HISTORY - TAM ŞEMA DÜZELTMESİ (Tek seferde tüm problemler)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Bu migration, notification_history tablosunun newsNotifications, 
-- calendar-reminders, check-price-alerts tarafından kullanılan TÜM kolonları
-- eksiksiz ekler. Farklı ortamlarda (type vs notification_type) uyumluluk sağlar.
--
-- INSERT edilen kolonlar:
--   user_id, type, notification_type, title, message, icon, action_url,
--   related_id, related_type, metadata, is_read, read_at, is_dismissed
-- ═══════════════════════════════════════════════════════════════════════════════

-- Zorunlu kolonlar (insert sırasında her zaman set edilir)
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS message TEXT;

-- Tip kolonları (bazı DB'lerde type, bazılarında notification_type - ikisi de eklenir)
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'system';
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'system';

-- UI / link kolonları
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS action_url TEXT;

-- İlişkili veri
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS related_id TEXT;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS related_type TEXT;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Okundu / kapatıldı durumu
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT false;

-- Zaman damgası (tablo yoksa CREATE TABLE ile gelir, varsa eklenir)
ALTER TABLE public.notification_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON TABLE public.notification_history IS 'Tüm bildirimler: news, signal, price_alert, calendar. type ve notification_type aynı değeri tutar (uyumluluk).';
