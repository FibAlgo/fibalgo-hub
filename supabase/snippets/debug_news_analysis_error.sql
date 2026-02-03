-- "Analysis Error" başlıklı haberlerin debug logları
SELECT id, news_id, title, analyzed_at, debug_logs
FROM news_analyses
WHERE title = 'Analysis Error'
ORDER BY analyzed_at DESC;
