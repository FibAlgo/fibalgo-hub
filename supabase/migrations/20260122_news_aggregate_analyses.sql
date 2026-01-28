-- News Aggregate Analyses Table
-- Stores daily, weekly, monthly macro regime analysis from aggregated news

CREATE TABLE IF NOT EXISTS public.news_aggregate_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Analysis period
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Market Regime
  market_regime TEXT CHECK (market_regime IN ('risk-on', 'risk-off', 'neutral', 'transition')),
  macro_bias TEXT CHECK (macro_bias IN ('bullish', 'bearish', 'neutral')),
  confidence INTEGER CHECK (confidence >= 1 AND confidence <= 10),
  
  -- Themes
  dominant_themes JSONB, -- Array of theme objects
  
  -- Conditions
  liquidity_condition TEXT CHECK (liquidity_condition IN ('tightening', 'easing', 'stable', 'unclear')),
  volatility_regime TEXT CHECK (volatility_regime IN ('rising', 'falling', 'stable', 'elevated')),
  
  -- Institutional Assessment
  positioning_implication TEXT,
  risk_assessment TEXT,
  
  -- Assets
  assets_in_focus TEXT[],
  
  -- Actionability
  actionability TEXT CHECK (actionability IN ('low', 'medium', 'high')),
  
  -- Notes
  notes TEXT,
  
  -- Stats
  news_count INTEGER DEFAULT 0,
  model_used TEXT DEFAULT 'gpt-4o',
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(period_type, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_aggregate_period ON news_aggregate_analyses(period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_news_aggregate_date ON news_aggregate_analyses(analyzed_at DESC);

-- RLS
ALTER TABLE news_aggregate_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "News aggregate analyses are viewable by everyone" 
  ON news_aggregate_analyses FOR SELECT 
  USING (true);

CREATE POLICY "Service role can manage news aggregate analyses" 
  ON news_aggregate_analyses FOR ALL 
  USING (auth.role() = 'service_role');
