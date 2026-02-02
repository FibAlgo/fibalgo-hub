-- Clean up duplicate/old news notifications
-- Run this to clear notification history for a fresh start

-- Option 1: Delete ALL notification history (complete reset)
-- DELETE FROM notification_history;

-- Option 2: Delete only news notifications older than 24 hours
DELETE FROM notification_history 
WHERE COALESCE(notification_type, type) = 'news'
AND created_at < NOW() - INTERVAL '24 hours';

-- Option 3: Mark all old notifications as read
UPDATE notification_history 
SET is_read = true 
WHERE COALESCE(notification_type, type) = 'news'
AND created_at < NOW() - INTERVAL '1 hour';

-- Also check for duplicate news in news_analyses table
-- This finds news with old bz-XXXXX format that should be migrated
SELECT news_id, title, analyzed_at 
FROM news_analyses 
WHERE news_id LIKE 'bz-%' 
ORDER BY analyzed_at DESC 
LIMIT 20;

-- Count old format vs new format
SELECT 
  CASE 
    WHEN news_id LIKE 'fa-%' THEN 'fa-format (new)'
    WHEN news_id LIKE 'bz-%' THEN 'bz-format (old)'
    ELSE 'other'
  END as format,
  COUNT(*) as count
FROM news_analyses 
GROUP BY 1;
