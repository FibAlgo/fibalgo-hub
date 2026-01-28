-- Add Source Credibility columns
ALTER TABLE public.news_analyses ADD COLUMN IF NOT EXISTS source_credibility_tier INTEGER DEFAULT 3;
ALTER TABLE public.news_analyses ADD COLUMN IF NOT EXISTS source_credibility_score INTEGER DEFAULT 50;
ALTER TABLE public.news_analyses ADD COLUMN IF NOT EXISTS source_credibility_label TEXT DEFAULT 'Unknown';

-- Add Breaking News flag
ALTER TABLE public.news_analyses ADD COLUMN IF NOT EXISTS is_breaking BOOLEAN DEFAULT FALSE;

-- Add index for breaking news queries
CREATE INDEX IF NOT EXISTS idx_news_analyses_is_breaking ON public.news_analyses(is_breaking) WHERE is_breaking = TRUE;

-- Add index for source tier filtering
CREATE INDEX IF NOT EXISTS idx_news_analyses_source_tier ON public.news_analyses(source_credibility_tier);
