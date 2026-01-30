-- Ensure impact column exists on news_analyses
ALTER TABLE public.news_analyses
  ADD COLUMN IF NOT EXISTS impact TEXT;