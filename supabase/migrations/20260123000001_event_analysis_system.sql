-- ═══════════════════════════════════════════════════════════════════
-- EVENT ANALYSIS SYSTEM - FULL MIGRATION
-- Pre-Event & Post-Event Analysis Tables
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- TABLE: event_historical_data
-- Son 6 ayın event sonuçları ve piyasa tepkileri
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_historical_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Event identification
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'nfp', 'cpi', 'fomc', 'gdp', 'pmi', etc.
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  
  -- Expectations vs Actuals
  forecast DECIMAL,
  actual DECIMAL,
  previous DECIMAL,
  surprise_percent DECIMAL, -- (actual - forecast) / forecast * 100
  surprise_direction TEXT, -- 'beat', 'miss', 'inline'
  
  -- Market Reactions (first 4-6 hours after release)
  market_reaction JSONB DEFAULT '{}', -- { "SPX": "+0.8%", "DXY": "+0.5%", ... }
  reaction_duration TEXT, -- "4 hours", "2 days", etc.
  
  -- Component breakdown (for complex reports)
  components JSONB DEFAULT '{}', -- { "unemployment": 3.7, "wage_growth": 0.4, ... }
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_historical_name ON event_historical_data(event_name);
CREATE INDEX IF NOT EXISTS idx_event_historical_type ON event_historical_data(event_type);
CREATE INDEX IF NOT EXISTS idx_event_historical_date ON event_historical_data(event_date DESC);

-- ───────────────────────────────────────────────────────────────────
-- TABLE: event_pre_analyses
-- Pre-event analiz sonuçları (1-24 saat önce)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_pre_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Event identification
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  importance TEXT NOT NULL, -- 'high', 'medium', 'low'
  
  -- Expectations
  forecast DECIMAL,
  previous DECIMAL,
  forecast_low DECIMAL,
  forecast_median DECIMAL,
  forecast_high DECIMAL,
  whisper_number DECIMAL,
  
  -- Event Classification
  tier INTEGER NOT NULL, -- 1, 2, 3
  expected_volatility TEXT NOT NULL, -- 'low', 'moderate', 'high', 'extreme'
  primary_affected_assets TEXT[] DEFAULT '{}',
  secondary_affected_assets TEXT[] DEFAULT '{}',
  
  -- Historical Analysis
  historical_beat_rate TEXT,
  historical_avg_surprise TEXT,
  historical_avg_volatility TEXT,
  typical_reaction TEXT,
  reaction_duration TEXT,
  fade_pattern BOOLEAN DEFAULT FALSE,
  historical_insight TEXT,
  
  -- Expectations Analysis
  forecast_assessment TEXT, -- 'conservative', 'aggressive', 'realistic'
  what_would_surprise TEXT,
  priced_in_level TEXT,
  
  -- Scenarios (5 scenarios)
  scenarios JSONB NOT NULL DEFAULT '{}',
  /* Structure:
  {
    "bigBeat": {
      "threshold": "> 220K",
      "probability": "15%",
      "expectedReaction": {
        "assets": { "DXY": "+0.8%", "SPX": "+0.5%" },
        "duration": "4-6 hours",
        "confidence": "high"
      }
    },
    "smallBeat": { ... },
    "inline": { ... },
    "smallMiss": { ... },
    "bigMiss": { ... }
  }
  */
  
  -- Positioning Analysis
  current_positioning TEXT,
  crowded_side TEXT, -- 'long', 'short', 'neutral'
  pain_trade TEXT,
  
  -- Pre-Event Strategy
  recommended_approach TEXT NOT NULL, -- 'position_before', 'wait_and_react', 'fade_move', 'no_trade'
  strategy_reasoning TEXT,
  conviction INTEGER NOT NULL CHECK (conviction >= 1 AND conviction <= 10),
  time_horizon TEXT, -- 'intraday', 'days', 'weeks'
  
  -- Trade Setup
  has_trade BOOLEAN DEFAULT FALSE,
  trade_direction TEXT, -- 'long', 'short', 'none'
  trade_asset TEXT,
  entry_timing TEXT, -- 'before_event', 'on_release', 'fade_initial_move', 'none'
  entry_condition TEXT,
  stop_loss TEXT,
  take_profit TEXT,
  position_size TEXT, -- 'small', 'standard', 'large'
  risk_reward TEXT, -- 'poor', 'fair', 'good', 'excellent'
  
  -- Risks
  key_risks TEXT[] DEFAULT '{}',
  
  -- Summary
  summary TEXT,
  
  -- Full AI Response
  raw_analysis JSONB,
  
  -- Metadata
  model_used TEXT DEFAULT 'gpt-4o',
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pre_analysis_event ON event_pre_analyses(event_name, event_date);
CREATE INDEX IF NOT EXISTS idx_pre_analysis_date ON event_pre_analyses(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_pre_analysis_tier ON event_pre_analyses(tier);

-- ───────────────────────────────────────────────────────────────────
-- TABLE: event_post_analyses
-- Post-event analiz sonuçları (veri açıklandıktan sonra)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_post_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Link to pre-analysis
  pre_analysis_id UUID REFERENCES event_pre_analyses(id),
  
  -- Event identification
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  released_at TIMESTAMP WITH TIME ZONE NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  
  -- Results
  actual DECIMAL NOT NULL,
  forecast DECIMAL,
  previous DECIMAL,
  surprise_percent DECIMAL,
  surprise_direction TEXT, -- 'beat', 'miss', 'inline'
  
  -- Result Analysis
  surprise_category TEXT NOT NULL, -- 'big_beat', 'small_beat', 'inline', 'small_miss', 'big_miss'
  headline_assessment TEXT,
  component_analysis TEXT,
  overall_quality TEXT, -- 'strong', 'mixed', 'weak'
  
  -- Component Breakdown
  components JSONB DEFAULT '{}',
  
  -- Market Reaction
  initial_reaction JSONB DEFAULT '{}', -- First 5 min reactions
  reaction_assessment TEXT, -- 'appropriate', 'over_reaction', 'under_reaction', 'divergent'
  divergences TEXT,
  reaction_insight TEXT,
  
  -- Implications
  monetary_policy_impact JSONB DEFAULT '{}',
  /* Structure:
  {
    "fedImpact": "March cut now off the table",
    "rateProbabilityShift": "-20% for March cut",
    "nextMeetingExpectation": "Hold rates"
  }
  */
  
  economic_outlook JSONB DEFAULT '{}',
  /* Structure:
  {
    "narrativeChange": "Soft landing now base case",
    "recessionRisk": "decreased",
    "growthOutlook": "Above trend growth"
  }
  */
  
  risk_appetite_shift TEXT, -- 'risk_on', 'risk_off', 'neutral'
  sector_implications TEXT,
  
  -- Trade Recommendation
  trade_action TEXT NOT NULL, -- 'trade_continuation', 'fade_move', 'wait_confirmation', 'no_trade'
  urgency TEXT NOT NULL, -- 'immediate', 'soon', 'patient'
  conviction INTEGER NOT NULL CHECK (conviction >= 1 AND conviction <= 10),
  trade_reasoning TEXT,
  
  -- Trade Setup
  has_trade BOOLEAN DEFAULT FALSE,
  trade_direction TEXT, -- 'long', 'short', 'none'
  trade_asset TEXT,
  entry_type TEXT, -- 'market', 'limit', 'stop'
  entry_level TEXT,
  entry_condition TEXT,
  stop_loss TEXT,
  take_profit TEXT,
  time_horizon TEXT, -- 'intraday', 'days', 'weeks'
  position_size TEXT, -- 'small', 'standard', 'large'
  risk_reward TEXT, -- 'poor', 'fair', 'good', 'excellent'
  
  -- Alternative Trades
  alternative_trades JSONB DEFAULT '[]',
  
  -- Risks
  key_risks TEXT[] DEFAULT '{}',
  
  -- Summary
  summary TEXT,
  
  -- Full AI Response
  raw_analysis JSONB,
  
  -- Metadata
  model_used TEXT DEFAULT 'gpt-4o',
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_post_analysis_event ON event_post_analyses(event_name, event_date);
CREATE INDEX IF NOT EXISTS idx_post_analysis_date ON event_post_analyses(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_post_analysis_pre ON event_post_analyses(pre_analysis_id);

-- ───────────────────────────────────────────────────────────────────
-- TABLE: market_context_snapshots
-- Piyasa bağlamı anlık görüntüleri
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS market_context_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Snapshot time
  snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- General Market State
  regime TEXT NOT NULL, -- 'risk-on', 'risk-off', 'neutral'
  fear_greed_index INTEGER,
  vix_level DECIMAL,
  
  -- Asset Prices & Positioning
  assets JSONB DEFAULT '{}',
  /* Structure:
  {
    "SPX": { "price": 4850, "change24h": -0.5, "positioning": "neutral" },
    "DXY": { "price": 103.5, "change24h": 0.2, "positioning": "long" },
    ...
  }
  */
  
  -- Narrative
  current_narrative TEXT,
  
  -- Fed/Central Bank Context
  fed_expectations JSONB DEFAULT '{}',
  /* Structure:
  {
    "nextMeetingDate": "2024-03-20",
    "cutProbability": "65%",
    "currentRate": "5.25-5.50%"
  }
  */
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_market_context_time ON market_context_snapshots(snapshot_at DESC);

-- ───────────────────────────────────────────────────────────────────
-- TABLE: event_statistics
-- Event istatistikleri (aggregated)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Event identification
  event_name TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  
  -- Statistics (auto-calculated from historical data)
  total_occurrences INTEGER DEFAULT 0,
  beat_count INTEGER DEFAULT 0,
  miss_count INTEGER DEFAULT 0,
  inline_count INTEGER DEFAULT 0,
  beat_rate DECIMAL, -- beat_count / total_occurrences * 100
  
  average_surprise DECIMAL,
  average_volatility DECIMAL,
  
  -- Typical reactions
  typical_reaction_pattern TEXT, -- "Risk-on if beats, risk-off if misses"
  typical_reaction_duration TEXT, -- "4 hours"
  fade_tendency BOOLEAN DEFAULT FALSE, -- Does the initial move usually fade?
  
  -- Most affected assets
  primary_assets TEXT[] DEFAULT '{}',
  
  -- Last updated
  last_occurrence TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_event_stats_name ON event_statistics(event_name);
CREATE INDEX IF NOT EXISTS idx_event_stats_type ON event_statistics(event_type);

-- ───────────────────────────────────────────────────────────────────
-- FUNCTION: Update event statistics automatically
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_event_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert statistics for this event
  INSERT INTO event_statistics (
    event_name,
    event_type,
    country,
    currency,
    total_occurrences,
    beat_count,
    miss_count,
    inline_count,
    last_occurrence
  )
  SELECT 
    NEW.event_name,
    NEW.event_type,
    NEW.country,
    NEW.currency,
    1,
    CASE WHEN NEW.surprise_direction = 'beat' THEN 1 ELSE 0 END,
    CASE WHEN NEW.surprise_direction = 'miss' THEN 1 ELSE 0 END,
    CASE WHEN NEW.surprise_direction = 'inline' THEN 1 ELSE 0 END,
    NEW.event_date
  ON CONFLICT (event_name) DO UPDATE SET
    total_occurrences = event_statistics.total_occurrences + 1,
    beat_count = event_statistics.beat_count + CASE WHEN NEW.surprise_direction = 'beat' THEN 1 ELSE 0 END,
    miss_count = event_statistics.miss_count + CASE WHEN NEW.surprise_direction = 'miss' THEN 1 ELSE 0 END,
    inline_count = event_statistics.inline_count + CASE WHEN NEW.surprise_direction = 'inline' THEN 1 ELSE 0 END,
    beat_rate = (event_statistics.beat_count + CASE WHEN NEW.surprise_direction = 'beat' THEN 1 ELSE 0 END)::DECIMAL / (event_statistics.total_occurrences + 1) * 100,
    last_occurrence = GREATEST(event_statistics.last_occurrence, NEW.event_date),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trg_update_event_statistics ON event_historical_data;
CREATE TRIGGER trg_update_event_statistics
  AFTER INSERT ON event_historical_data
  FOR EACH ROW
  EXECUTE FUNCTION update_event_statistics();

-- ───────────────────────────────────────────────────────────────────
-- SEED: Initial event statistics for major events
-- ───────────────────────────────────────────────────────────────────

INSERT INTO event_statistics (event_name, event_type, country, currency, beat_rate, average_volatility, typical_reaction_pattern, typical_reaction_duration, fade_tendency, primary_assets)
VALUES 
  ('Non-Farm Payrolls', 'employment', 'US', 'USD', 67.0, 1.2, 'Risk-on if beats, risk-off if misses', '4-6 hours', false, ARRAY['DXY', 'SPX', 'USDJPY', 'XAUUSD', 'TLT']),
  ('CPI m/m', 'inflation', 'US', 'USD', 50.0, 1.0, 'Hawkish if high, dovish if low', '4-8 hours', false, ARRAY['DXY', 'TLT', 'SPX', 'XAUUSD']),
  ('Core CPI m/m', 'inflation', 'US', 'USD', 50.0, 1.2, 'Core more important than headline', '4-8 hours', false, ARRAY['DXY', 'TLT', 'SPX']),
  ('FOMC Statement', 'central_bank', 'US', 'USD', NULL, 2.0, 'Depends on tone, watch dot plot', '24-48 hours', true, ARRAY['DXY', 'SPX', 'TLT', 'XAUUSD', 'BTC']),
  ('Fed Chair Powell Speaks', 'central_bank', 'US', 'USD', NULL, 0.8, 'Tone matters more than content', '2-4 hours', true, ARRAY['DXY', 'SPX', 'TLT']),
  ('GDP q/q', 'growth', 'US', 'USD', 55.0, 0.6, 'Growth confirmation, less surprise potential', '2-4 hours', false, ARRAY['DXY', 'SPX']),
  ('Retail Sales m/m', 'growth', 'US', 'USD', 52.0, 0.5, 'Consumer spending indicator', '2-4 hours', false, ARRAY['SPX', 'DXY']),
  ('ISM Manufacturing PMI', 'growth', 'US', 'USD', 48.0, 0.5, 'Above 50 = expansion, below = contraction', '2-4 hours', false, ARRAY['SPX', 'DXY']),
  ('Unemployment Claims', 'employment', 'US', 'USD', 50.0, 0.3, 'Lower = stronger labor market', '1-2 hours', true, ARRAY['DXY', 'SPX']),
  ('ECB Interest Rate Decision', 'central_bank', 'EU', 'EUR', NULL, 1.5, 'EUR moves, watch for guidance', '24 hours', false, ARRAY['EURUSD', 'DAX']),
  ('BOJ Policy Rate', 'central_bank', 'JP', 'JPY', NULL, 1.8, 'JPY volatile on any hint of change', '24-48 hours', false, ARRAY['USDJPY', 'Nikkei']),
  ('BOE Official Bank Rate', 'central_bank', 'UK', 'GBP', NULL, 1.2, 'GBP moves, watch for vote split', '24 hours', false, ARRAY['GBPUSD', 'FTSE']),
  ('PCE Price Index m/m', 'inflation', 'US', 'USD', 50.0, 0.8, 'Fed preferred inflation gauge', '4-6 hours', false, ARRAY['DXY', 'TLT', 'SPX'])
ON CONFLICT (event_name) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- RLS Policies
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE event_historical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_pre_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_post_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_statistics ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON event_historical_data FOR SELECT USING (true);
CREATE POLICY "Public read access" ON event_pre_analyses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON event_post_analyses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON market_context_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read access" ON event_statistics FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service write access" ON event_historical_data FOR ALL USING (true);
CREATE POLICY "Service write access" ON event_pre_analyses FOR ALL USING (true);
CREATE POLICY "Service write access" ON event_post_analyses FOR ALL USING (true);
CREATE POLICY "Service write access" ON market_context_snapshots FOR ALL USING (true);
CREATE POLICY "Service write access" ON event_statistics FOR ALL USING (true);
