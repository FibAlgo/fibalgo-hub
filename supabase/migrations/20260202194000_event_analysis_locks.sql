-- Prevent double-burn OpenAI costs in event analysis by ensuring ONLY one worker
-- analyzes the same event (same lock_key) at a time.
--
-- lock_key examples:
-- - pre:2026-02-02:ismmanufacturingpmijan:US:macro
-- - post:2026-02-02:ismmanufacturingpmijan:US:macro

CREATE TABLE IF NOT EXISTS public.event_analysis_locks (
  lock_key text PRIMARY KEY,
  locked_by text NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  lock_expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  last_error text NULL
);

CREATE INDEX IF NOT EXISTS idx_event_analysis_locks_expires_at
ON public.event_analysis_locks (lock_expires_at);

COMMENT ON TABLE public.event_analysis_locks IS 'Per-event analysis lock (prevents concurrent OpenAI analysis for same event).';
COMMENT ON COLUMN public.event_analysis_locks.lock_key IS 'Deterministic key for an event/date/type (pre or post).';
COMMENT ON COLUMN public.event_analysis_locks.locked_by IS 'Opaque worker id (instance) that acquired the lock.';
COMMENT ON COLUMN public.event_analysis_locks.lock_expires_at IS 'TTL for crash safety; lock can be reclaimed after expiry.';

