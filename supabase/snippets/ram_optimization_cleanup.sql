-- ═══════════════════════════════════════════════════════════════════════════════
-- 🧹 RAM Optimization - Database Cleanup Script
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Bu script'i Supabase SQL Editor'de adım adım çalıştır!
-- Her DELETE'ten sonra sonucu kontrol et.
--
-- ⚠️ ÖNEMLİ: Önce SELECT ile kontrol et, sonra DELETE çalıştır!
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Tablo boyutlarını kontrol et
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
    schemaname,
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    pg_size_pretty(pg_relation_size(relid)) as data_size,
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: notification_history - 7 günden eski kayıtları sil
-- ═══════════════════════════════════════════════════════════════════════════════

-- Önce kaç kayıt silineceğini kontrol et:
SELECT COUNT(*) as will_delete 
FROM notification_history 
WHERE created_at < NOW() - INTERVAL '7 days';

-- Eğer çok fazlaysa (1000'den fazla), batch'ler halinde sil:
-- DELETE FROM notification_history 
-- WHERE id IN (
--     SELECT id FROM notification_history 
--     WHERE created_at < NOW() - INTERVAL '7 days' 
--     LIMIT 5000
-- );

-- Eğer makul sayıda ise direkt sil:
DELETE FROM notification_history 
WHERE created_at < NOW() - INTERVAL '7 days';

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: email_queue - sent/failed olanları temizle
-- ═══════════════════════════════════════════════════════════════════════════════

-- Önce kontrol et:
SELECT status, COUNT(*) 
FROM email_queue 
GROUP BY status;

-- Gönderilmiş ve başarısız olanları sil (24 saatten eski):
DELETE FROM email_queue 
WHERE status IN ('sent', 'failed') 
AND created_at < NOW() - INTERVAL '24 hours';

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: api_call_log - 3 günden eski logları sil
-- ═══════════════════════════════════════════════════════════════════════════════

-- Önce kontrol et:
SELECT COUNT(*) as will_delete 
FROM api_call_log 
WHERE called_at < NOW() - INTERVAL '3 days';

-- Sil:
DELETE FROM api_call_log 
WHERE called_at < NOW() - INTERVAL '3 days';

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 5: verification_codes - Kullanılmış veya expired olanları sil
-- ═══════════════════════════════════════════════════════════════════════════════

-- Önce kontrol et:
SELECT COUNT(*) as will_delete 
FROM verification_codes 
WHERE used = true OR expires_at < NOW();

-- Sil:
DELETE FROM verification_codes 
WHERE used = true OR expires_at < NOW();

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6: purchase_tokens - Kullanılmış olanları sil (30 günden eski)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Önce kontrol et:
SELECT COUNT(*) as will_delete 
FROM purchase_tokens 
WHERE used_at IS NOT NULL 
AND used_at < NOW() - INTERVAL '30 days';

-- Sil:
DELETE FROM purchase_tokens 
WHERE used_at IS NOT NULL 
AND used_at < NOW() - INTERVAL '30 days';

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 7: Cache tablolarındaki expired verileri temizle
-- ═══════════════════════════════════════════════════════════════════════════════

-- Market data cache:
DELETE FROM market_data_cache WHERE expires_at < NOW();

-- OHLC cache:
DELETE FROM ohlc_cache WHERE expires_at < NOW();

-- Macro data cache:
DELETE FROM macro_data_cache WHERE expires_at < NOW();

-- Fundamentals cache:
DELETE FROM fundamentals_cache WHERE expires_at < NOW();

-- Crypto onchain cache:
DELETE FROM crypto_onchain_cache WHERE expires_at < NOW();

-- COT data cache:
DELETE FROM cot_data_cache WHERE expires_at < NOW();

-- Treasury yields cache:
DELETE FROM treasury_yields_cache WHERE expires_at < NOW();

-- Sentiment cache:
DELETE FROM sentiment_cache WHERE expires_at < NOW();

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 8: news_analyses - 7 günden eski haberleri sil
-- ═══════════════════════════════════════════════════════════════════════════════

-- ⚠️ DİKKAT: Bu tablo büyükse RAM spike yapabilir! Batch'lerle sil.

-- Önce kontrol et:
SELECT COUNT(*) as will_delete 
FROM news_analyses 
WHERE published_at < NOW() - INTERVAL '7 days';

-- Batch olarak sil (5000'lik gruplar):
DO $$
DECLARE
    deleted_count INTEGER;
    total_deleted INTEGER := 0;
BEGIN
    LOOP
        DELETE FROM news_analyses 
        WHERE id IN (
            SELECT id FROM news_analyses 
            WHERE published_at < NOW() - INTERVAL '7 days'
            LIMIT 5000
        );
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        EXIT WHEN deleted_count = 0;
        RAISE NOTICE 'Deleted % rows so far...', total_deleted;
        -- Biraz bekle ki sistem nefes alsın
        PERFORM pg_sleep(1);
    END LOOP;
    RAISE NOTICE 'Total deleted: % rows', total_deleted;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 9: KULLANILMAYAN TABLOLARI SİL (OPSİYONEL)
-- ═══════════════════════════════════════════════════════════════════════════════

-- subscription_purchase_notifications - Kodda kullanılmıyor
-- Önce içeriğini kontrol et:
SELECT COUNT(*) FROM subscription_purchase_notifications;

-- Eğer boşsa veya önemli değilse tabloyu sil:
-- DROP TABLE IF EXISTS subscription_purchase_notifications CASCADE;

-- news_cache - news_analyses ile çakışıyor
-- Önce kontrol et:
SELECT COUNT(*) FROM news_cache;

-- Eğer news_analyses kullanılıyorsa bu tabloyu silebilirsin:
-- DROP TABLE IF EXISTS news_cache CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 10: VACUUM ANALYZE - Boş alanı geri al ve istatistikleri güncelle
-- ═══════════════════════════════════════════════════════════════════════════════

-- Bu komut silinen verilerin disk alanını geri alır
-- ⚠️ VACUUM FULL tablo kilitler, normal VACUUM daha güvenli

VACUUM ANALYZE notification_history;
VACUUM ANALYZE email_queue;
VACUUM ANALYZE api_call_log;
VACUUM ANALYZE verification_codes;
VACUUM ANALYZE purchase_tokens;
VACUUM ANALYZE news_analyses;
VACUUM ANALYZE market_data_cache;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 11: Temizlik sonrası tablo boyutlarını kontrol et
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
    schemaname,
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;
