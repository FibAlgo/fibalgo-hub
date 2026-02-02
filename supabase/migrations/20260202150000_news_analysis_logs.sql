-- Add detailed logs column for debugging news analysis issues
-- This column stores detailed error information that won't be shown in UI

ALTER TABLE news_analyses 
ADD COLUMN IF NOT EXISTS debug_logs jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN news_analyses.debug_logs IS 'Detailed debug logs for troubleshooting analysis issues. Array of log entries with timestamp, stage, message, and data.';

-- Create index for quick lookup of entries with errors
CREATE INDEX IF NOT EXISTS idx_news_analyses_has_errors 
ON news_analyses ((debug_logs != '[]'::jsonb)) 
WHERE debug_logs != '[]'::jsonb;
