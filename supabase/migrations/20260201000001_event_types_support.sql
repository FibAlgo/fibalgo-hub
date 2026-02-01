-- ═══════════════════════════════════════════════════════════════════
-- EVENT TYPES SUPPORT
-- Add columns for earnings and IPO event types
-- ═══════════════════════════════════════════════════════════════════

-- Add event_category column to distinguish macro/earnings/ipo/crypto
ALTER TABLE event_pre_analyses 
ADD COLUMN IF NOT EXISTS event_category TEXT DEFAULT 'macro';

-- Update event_type comment - it now stores more granular types
COMMENT ON COLUMN event_pre_analyses.event_type IS 'Granular event type: nfp, cpi, fomc, earnings, ipo, etc.';
COMMENT ON COLUMN event_pre_analyses.event_category IS 'Event category: macro, earnings, ipo, crypto';

-- ───────────────────────────────────────────────────────────────────
-- EARNINGS-SPECIFIC COLUMNS
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE event_pre_analyses
ADD COLUMN IF NOT EXISTS symbol TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS eps_estimate DECIMAL,
ADD COLUMN IF NOT EXISTS eps_whisper DECIMAL,
ADD COLUMN IF NOT EXISTS revenue_estimate DECIMAL,
ADD COLUMN IF NOT EXISTS revenue_whisper DECIMAL,
ADD COLUMN IF NOT EXISTS guidance_expectation TEXT;

-- ───────────────────────────────────────────────────────────────────
-- IPO-SPECIFIC COLUMNS
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE event_pre_analyses
ADD COLUMN IF NOT EXISTS exchange TEXT,
ADD COLUMN IF NOT EXISTS price_range_low DECIMAL,
ADD COLUMN IF NOT EXISTS price_range_high DECIMAL,
ADD COLUMN IF NOT EXISTS ipo_price DECIMAL,
ADD COLUMN IF NOT EXISTS shares_offered BIGINT,
ADD COLUMN IF NOT EXISTS demand_assessment TEXT;

-- ───────────────────────────────────────────────────────────────────
-- SCENARIO PLAYBOOK COLUMN (JSONB for flexible scenarios)
-- ───────────────────────────────────────────────────────────────────

-- scenarios column already exists and is JSONB - it will store:
-- For macro: { bigBeat, smallBeat, inline, smallMiss, bigMiss }
-- For earnings: { beatBoth, beatEpsMissRev, missEpsBeatRev, missBoth, inline, guidanceSurprise }
-- For IPO: { pricedAbove, pricedAtRange, pricedBelowRange, withdrawn }

-- Add scenario_playbook column for detailed trade setups per scenario
ALTER TABLE event_pre_analyses
ADD COLUMN IF NOT EXISTS scenario_playbook JSONB DEFAULT '{}';

COMMENT ON COLUMN event_pre_analyses.scenario_playbook IS 'Trade playbook for each scenario with trades array or no_trade action';

-- ───────────────────────────────────────────────────────────────────
-- SECTOR IMPACT (for earnings events)
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE event_pre_analyses
ADD COLUMN IF NOT EXISTS sector_impact JSONB DEFAULT '{}';

COMMENT ON COLUMN event_pre_analyses.sector_impact IS 'Sector impact analysis for earnings: { affectsSector, sympathyPlays }';

-- ───────────────────────────────────────────────────────────────────
-- INDEXES
-- ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pre_analysis_category ON event_pre_analyses(event_category);
CREATE INDEX IF NOT EXISTS idx_pre_analysis_symbol ON event_pre_analyses(symbol) WHERE symbol IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────
-- UPDATE event_historical_data for earnings/ipo
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE event_historical_data
ADD COLUMN IF NOT EXISTS event_category TEXT DEFAULT 'macro',
ADD COLUMN IF NOT EXISTS symbol TEXT,
ADD COLUMN IF NOT EXISTS eps_actual DECIMAL,
ADD COLUMN IF NOT EXISTS eps_estimate DECIMAL,
ADD COLUMN IF NOT EXISTS revenue_actual DECIMAL,
ADD COLUMN IF NOT EXISTS revenue_estimate DECIMAL,
ADD COLUMN IF NOT EXISTS guidance_change TEXT,
ADD COLUMN IF NOT EXISTS ipo_price DECIMAL,
ADD COLUMN IF NOT EXISTS first_day_close DECIMAL,
ADD COLUMN IF NOT EXISTS first_day_return DECIMAL;

CREATE INDEX IF NOT EXISTS idx_historical_category ON event_historical_data(event_category);
CREATE INDEX IF NOT EXISTS idx_historical_symbol ON event_historical_data(symbol) WHERE symbol IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────
-- UPDATE event_statistics for earnings/ipo
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE event_statistics
ADD COLUMN IF NOT EXISTS event_category TEXT DEFAULT 'macro',
ADD COLUMN IF NOT EXISTS avg_eps_surprise DECIMAL,
ADD COLUMN IF NOT EXISTS avg_revenue_surprise DECIMAL,
ADD COLUMN IF NOT EXISTS guidance_raise_rate DECIMAL,
ADD COLUMN IF NOT EXISTS avg_first_day_return DECIMAL;

-- ───────────────────────────────────────────────────────────────────
-- SEED: Add earnings/ipo event statistics templates
-- ───────────────────────────────────────────────────────────────────

INSERT INTO event_statistics (event_name, event_type, country, currency, event_category, beat_rate, average_volatility, typical_reaction_pattern, typical_reaction_duration, fade_tendency, primary_assets)
VALUES 
  ('NVDA Earnings', 'earnings', 'US', 'USD', 'earnings', 65.0, 8.0, 'Beat = +5-10%, Miss = -8-15%', '2-3 days', false, ARRAY['NVDA', 'SMH', 'AMD', 'QQQ']),
  ('AAPL Earnings', 'earnings', 'US', 'USD', 'earnings', 70.0, 5.0, 'Beat = +3-5%, Miss = -5-8%', '2-3 days', true, ARRAY['AAPL', 'XLK', 'QQQ']),
  ('MSFT Earnings', 'earnings', 'US', 'USD', 'earnings', 72.0, 4.0, 'Beat = +2-4%, Miss = -4-6%', '2-3 days', true, ARRAY['MSFT', 'XLK', 'QQQ']),
  ('TSLA Earnings', 'earnings', 'US', 'USD', 'earnings', 55.0, 10.0, 'High volatility, guidance driven', '3-5 days', false, ARRAY['TSLA', 'ARKK', 'QQQ']),
  ('META Earnings', 'earnings', 'US', 'USD', 'earnings', 68.0, 6.0, 'User metrics and ad revenue key', '2-3 days', false, ARRAY['META', 'XLC', 'SNAP']),
  ('AMZN Earnings', 'earnings', 'US', 'USD', 'earnings', 65.0, 5.0, 'AWS growth most important', '2-3 days', true, ARRAY['AMZN', 'XLY', 'QQQ']),
  ('GOOGL Earnings', 'earnings', 'US', 'USD', 'earnings', 70.0, 4.0, 'Search ad revenue focus', '2-3 days', true, ARRAY['GOOGL', 'XLC', 'QQQ'])
ON CONFLICT (event_name) DO NOTHING;
