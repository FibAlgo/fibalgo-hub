-- ═══════════════════════════════════════════════════════════════
-- INSTITUTIONAL SIGNAL SYSTEM - Database Migration
-- Adds signal engine fields to news_analyses table
-- ═══════════════════════════════════════════════════════════════

-- Add new columns for signal system
ALTER TABLE news_analyses 
ADD COLUMN IF NOT EXISTS time_horizon TEXT DEFAULT 'short' CHECK (time_horizon IN ('short', 'swing', 'macro')),
ADD COLUMN IF NOT EXISTS risk_mode TEXT DEFAULT 'neutral' CHECK (risk_mode IN ('risk-on', 'risk-off', 'neutral')),
ADD COLUMN IF NOT EXISTS would_trade BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signal TEXT DEFAULT 'NO_TRADE' CHECK (signal IN ('STRONG_BUY', 'BUY', 'SELL', 'STRONG_SELL', 'NO_TRADE')),
ADD COLUMN IF NOT EXISTS signal_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- Create index for faster signal queries
CREATE INDEX IF NOT EXISTS idx_news_signal ON news_analyses(signal);
CREATE INDEX IF NOT EXISTS idx_news_would_trade ON news_analyses(would_trade);
CREATE INDEX IF NOT EXISTS idx_news_time_horizon ON news_analyses(time_horizon);

-- Comment for documentation
COMMENT ON COLUMN news_analyses.time_horizon IS 'Trade time horizon: short (hours), swing (days), macro (weeks)';
COMMENT ON COLUMN news_analyses.risk_mode IS 'Market risk mode: risk-on, risk-off, or neutral';
COMMENT ON COLUMN news_analyses.would_trade IS 'Would a professional trader take this trade?';
COMMENT ON COLUMN news_analyses.signal IS 'Generated trade signal: STRONG_BUY, BUY, SELL, STRONG_SELL, NO_TRADE';
COMMENT ON COLUMN news_analyses.signal_blocked IS 'Was the signal blocked by risk filters?';
COMMENT ON COLUMN news_analyses.block_reason IS 'Reason why signal was blocked';
