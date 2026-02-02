-- Add Twitter posting tracking columns to news_analyses
ALTER TABLE news_analyses 
ADD COLUMN IF NOT EXISTS tweeted_at timestamptz,
ADD COLUMN IF NOT EXISTS tweet_id text;

-- Index for finding untweeted news efficiently
CREATE INDEX IF NOT EXISTS idx_news_analyses_tweeted 
ON news_analyses (tweeted_at) 
WHERE tweeted_at IS NULL;

-- Comment
COMMENT ON COLUMN news_analyses.tweeted_at IS 'Timestamp when this news was posted to Twitter';
COMMENT ON COLUMN news_analyses.tweet_id IS 'Twitter tweet ID if posted';
