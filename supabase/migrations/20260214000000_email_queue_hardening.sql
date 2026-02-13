-- ═══════════════════════════════════════════════════════════════
-- Email Queue Hardening: retry_after, updated_at, processing status
-- ═══════════════════════════════════════════════════════════════

-- 1. Add 'processing' status to prevent double-pick by concurrent crons
ALTER TABLE public.email_queue
  DROP CONSTRAINT IF EXISTS email_queue_status_check;

ALTER TABLE public.email_queue
  ADD CONSTRAINT email_queue_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed'));

-- 2. retry_after: failed jobs won't be re-picked until this timestamp
ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ;

-- 3. updated_at: track when a job was last touched (stuck detection)
ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. max_attempts bump from 3 → 5 for more resilience
ALTER TABLE public.email_queue
  ALTER COLUMN max_attempts SET DEFAULT 5;

UPDATE public.email_queue
SET max_attempts = 5
WHERE max_attempts < 5 AND status IN ('pending', 'processing');

-- 5. Reset any currently stuck 'processing' jobs to pending
UPDATE public.email_queue
SET status = 'pending', updated_at = NOW()
WHERE status = 'processing';

-- 6. Index: include retry_after for efficient queue queries
DROP INDEX IF EXISTS idx_email_queue_process;
CREATE INDEX idx_email_queue_process
  ON public.email_queue (status, retry_after, created_at)
  WHERE status IN ('pending', 'processing');

COMMENT ON COLUMN public.email_queue.retry_after IS 'Job will not be picked before this time (exponential backoff scheduling)';
COMMENT ON COLUMN public.email_queue.updated_at IS 'Last status/attempt change; used for stuck-job detection';
