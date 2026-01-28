-- Calendar Analyses Table
-- Stores daily, weekly, and monthly market outlook based on economic calendar

CREATE TABLE IF NOT EXISTS public.calendar_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Analysis period
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Market Outlook
  overall_outlook TEXT CHECK (overall_outlook IN ('bullish', 'bearish', 'neutral', 'volatile')),
  outlook_score INTEGER CHECK (outlook_score >= 1 AND outlook_score <= 10),
  
  -- Risk Assessment
  risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high', 'extreme')),
  volatility_expectation TEXT CHECK (volatility_expectation IN ('low', 'moderate', 'high', 'extreme')),
  
  -- Key Events Summary
  key_events JSONB, -- Array of most important events
  event_count INTEGER DEFAULT 0,
  high_impact_count INTEGER DEFAULT 0,
  
  -- Currency/Asset Focus
  currencies_to_watch TEXT[], -- ['USD', 'EUR', 'GBP']
  sectors_affected TEXT[], -- ['Tech', 'Energy', 'Financials']
  
  -- AI Analysis
  executive_summary TEXT NOT NULL,
  detailed_analysis TEXT,
  trading_implications TEXT,
  key_levels JSONB, -- { "SPY": { "support": 450, "resistance": 470 } }
  
  -- Risk Warnings
  risk_events TEXT[], -- Events that could cause high volatility
  hedge_recommendations TEXT,
  
  -- Metadata
  events_analyzed INTEGER DEFAULT 0,
  model_used TEXT DEFAULT 'gpt-4o',
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicates for same period
  UNIQUE(period_type, period_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_calendar_analyses_period ON calendar_analyses(period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_analyses_date ON calendar_analyses(analyzed_at DESC);

-- Enable RLS
ALTER TABLE calendar_analyses ENABLE ROW LEVEL SECURITY;

-- Everyone can read calendar analyses
CREATE POLICY "Calendar analyses are viewable by everyone" 
  ON calendar_analyses FOR SELECT 
  USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role can manage calendar analyses" 
  ON calendar_analyses FOR ALL 
  USING (auth.role() = 'service_role');
