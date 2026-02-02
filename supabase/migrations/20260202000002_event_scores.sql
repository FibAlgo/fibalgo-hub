-- Add Stage 3 scoring fields (1-10) for UI meters
-- These are persisted so UI reads from DB (not transient model output).

ALTER TABLE event_pre_analyses
ADD COLUMN IF NOT EXISTS urgency_score SMALLINT,
ADD COLUMN IF NOT EXISTS market_mover_score SMALLINT,
ADD COLUMN IF NOT EXISTS conviction_score SMALLINT;

-- Optional: keep values in [1,10] when present (Postgres CHECK constraints).
-- Safe: only adds if not exists; if your schema already has similar constraints, ignore errors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_event_pre_analyses_urgency_score_1_10'
  ) THEN
    ALTER TABLE event_pre_analyses
    ADD CONSTRAINT chk_event_pre_analyses_urgency_score_1_10
    CHECK (urgency_score IS NULL OR (urgency_score >= 1 AND urgency_score <= 10));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_event_pre_analyses_market_mover_score_1_10'
  ) THEN
    ALTER TABLE event_pre_analyses
    ADD CONSTRAINT chk_event_pre_analyses_market_mover_score_1_10
    CHECK (market_mover_score IS NULL OR (market_mover_score >= 1 AND market_mover_score <= 10));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_event_pre_analyses_conviction_score_1_10'
  ) THEN
    ALTER TABLE event_pre_analyses
    ADD CONSTRAINT chk_event_pre_analyses_conviction_score_1_10
    CHECK (conviction_score IS NULL OR (conviction_score >= 1 AND conviction_score <= 10));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_pre_analyses_urgency_score ON event_pre_analyses(urgency_score);
CREATE INDEX IF NOT EXISTS idx_event_pre_analyses_market_mover_score ON event_pre_analyses(market_mover_score);
