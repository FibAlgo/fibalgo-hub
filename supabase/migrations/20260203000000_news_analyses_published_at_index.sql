-- Fix statement timeout (57014) on news_analyses queries
-- published_at is used for ORDER BY and filtering in /api/news and /api/news/sentiment

-- Primary index for ORDER BY published_at DESC queries (most common)
CREATE INDEX IF NOT EXISTS idx_news_analyses_published_at 
  ON public.news_analyses (published_at DESC);

-- Composite index for breaking news filter (is_breaking + published_at)
CREATE INDEX IF NOT EXISTS idx_news_analyses_breaking_published 
  ON public.news_analyses (is_breaking, published_at DESC) 
  WHERE is_breaking = true;

-- Composite index for category + period queries
CREATE INDEX IF NOT EXISTS idx_news_analyses_category_published 
  ON public.news_analyses (category, published_at DESC);

-- Composite index for signal filtering
CREATE INDEX IF NOT EXISTS idx_news_analyses_signal_published 
  ON public.news_analyses (signal, published_at DESC);

-- Index for tradeable filter
CREATE INDEX IF NOT EXISTS idx_news_analyses_tradeable 
  ON public.news_analyses (would_trade, signal_blocked, published_at DESC) 
  WHERE would_trade = true AND signal_blocked = false;

-- Analyze table for query planner to have fresh statistics
ANALYZE public.news_analyses;
