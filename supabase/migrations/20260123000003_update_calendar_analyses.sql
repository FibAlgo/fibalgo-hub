-- Update Calendar Analyses Table for new macro regime schema
-- Adds new fields for institutional macro strategist analysis

-- Add new columns for macro regime analysis
ALTER TABLE public.calendar_analyses 
  ADD COLUMN IF NOT EXISTS market_regime TEXT CHECK (market_regime IN ('risk-on', 'risk-off', 'neutral', 'transition')),
  ADD COLUMN IF NOT EXISTS macro_bias TEXT CHECK (macro_bias IN ('bullish', 'bearish', 'neutral')),
  ADD COLUMN IF NOT EXISTS confidence INTEGER CHECK (confidence >= 1 AND confidence <= 10),
  ADD COLUMN IF NOT EXISTS dominant_themes JSONB,
  ADD COLUMN IF NOT EXISTS liquidity_condition TEXT CHECK (liquidity_condition IN ('tightening', 'easing', 'stable', 'unclear')),
  ADD COLUMN IF NOT EXISTS volatility_regime TEXT CHECK (volatility_regime IN ('rising', 'falling', 'stable', 'elevated')),
  ADD COLUMN IF NOT EXISTS positioning_implication TEXT,
  ADD COLUMN IF NOT EXISTS risk_assessment TEXT,
  ADD COLUMN IF NOT EXISTS assets_in_focus TEXT[],
  ADD COLUMN IF NOT EXISTS actionability TEXT CHECK (actionability IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comment on new columns
COMMENT ON COLUMN calendar_analyses.market_regime IS 'Current market regime: risk-on, risk-off, neutral, or transition';
COMMENT ON COLUMN calendar_analyses.macro_bias IS 'Overall macro bias: bullish, bearish, or neutral';
COMMENT ON COLUMN calendar_analyses.confidence IS 'Confidence level 1-10';
COMMENT ON COLUMN calendar_analyses.dominant_themes IS 'Array of dominant macro themes with direction and relevance';
COMMENT ON COLUMN calendar_analyses.liquidity_condition IS 'Current liquidity condition';
COMMENT ON COLUMN calendar_analyses.volatility_regime IS 'Current volatility regime';
COMMENT ON COLUMN calendar_analyses.positioning_implication IS 'How institutional positioning is likely adjusting';
COMMENT ON COLUMN calendar_analyses.risk_assessment IS 'Key systemic or macro risks';
COMMENT ON COLUMN calendar_analyses.assets_in_focus IS 'Asset symbols to focus on';
COMMENT ON COLUMN calendar_analyses.actionability IS 'How actionable the current environment is';
COMMENT ON COLUMN calendar_analyses.notes IS 'Brief institutional notes';
