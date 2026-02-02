-- Prevent double-burn OpenAI costs by ensuring ONLY one worker analyzes a news_id at a time.
-- We use an insert-only lock table with a unique primary key on news_id.
-- If a worker crashes, the lock naturally expires via lock_expires_at (TTL) and can be reclaimed.

CREATE TABLE IF NOT EXISTS public.news_analysis_locks (
  news_id text PRIMARY KEY,
  locked_by text NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  lock_expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  last_error text NULL
);

CREATE INDEX IF NOT EXISTS idx_news_analysis_locks_expires_at
ON public.news_analysis_locks (lock_expires_at);

COMMENT ON TABLE public.news_analysis_locks IS 'Per-news analysis lock (prevents concurrent OpenAI analysis for same news_id).';
COMMENT ON COLUMN public.news_analysis_locks.locked_by IS 'Opaque worker id (instance) that acquired the lock.';
COMMENT ON COLUMN public.news_analysis_locks.lock_expires_at IS 'TTL for crash safety; lock can be reclaimed after expiry.';

