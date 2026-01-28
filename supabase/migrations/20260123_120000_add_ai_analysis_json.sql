-- Store full AI analysis JSON for structured display
ALTER TABLE public.news_analyses
  ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

CREATE INDEX IF NOT EXISTS idx_news_analyses_ai_analysis ON public.news_analyses USING GIN (ai_analysis);
