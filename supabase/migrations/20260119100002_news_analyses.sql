-- News analyses table to cache AI analysis results
CREATE TABLE IF NOT EXISTS public.news_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL UNIQUE, -- Hash of title + source for deduplication
  title TEXT NOT NULL,
  source TEXT,
  url TEXT,
  published_at TIMESTAMPTZ,
  category TEXT DEFAULT 'crypto',
  sentiment TEXT CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  score INTEGER CHECK (score >= 1 AND score <= 10),
  summary TEXT,
  impact TEXT,
  risk TEXT,
  related_assets TEXT[], -- Array of asset symbols
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_news_analyses_category ON public.news_analyses(category);
CREATE INDEX IF NOT EXISTS idx_news_analyses_analyzed_at ON public.news_analyses(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_analyses_news_id ON public.news_analyses(news_id);

-- RLS policies
ALTER TABLE public.news_analyses ENABLE ROW LEVEL SECURITY;

-- Everyone can read news analyses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'news_analyses'
      AND policyname = 'Anyone can read news analyses'
  ) THEN
    CREATE POLICY "Anyone can read news analyses" ON public.news_analyses
      FOR SELECT USING (true);
  END IF;
END $$;

-- Only service role can insert/update (via API)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'news_analyses'
      AND policyname = 'Service role can manage news'
  ) THEN
    CREATE POLICY "Service role can manage news" ON public.news_analyses
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;