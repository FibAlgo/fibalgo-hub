-- ============================================================
-- "Analysis Error" Başlıklı Haberlerin Debug Logları
-- Supabase Dashboard → SQL Editor → bu sorguyu çalıştır
-- ============================================================

SELECT
  id,
  news_id,
  title,
  published_at,
  analyzed_at,
  debug_logs
FROM news_analyses
WHERE title ILIKE '%Analysis Error%'
  AND debug_logs IS NOT NULL
  AND jsonb_array_length(debug_logs) > 0
ORDER BY analyzed_at DESC;
