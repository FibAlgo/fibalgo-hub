-- Add trading_pairs column to store TradingView-compatible ticker IDs
ALTER TABLE public.news_analyses 
ADD COLUMN IF NOT EXISTS trading_pairs JSONB DEFAULT '[]'::jsonb;

-- Remove old related_assets column (data migration not needed as we'll re-analyze)
-- ALTER TABLE public.news_analyses DROP COLUMN IF EXISTS related_assets;

-- Comment explaining the new format:
-- trading_pairs contains array of objects like:
-- [
--   { "symbol": "$BTC", "ticker": "BINANCE:BTCUSDT" },
--   { "symbol": "$ETH", "ticker": "BINANCE:ETHUSDT" },
--   { "symbol": "EUR/USD", "ticker": "FX:EURUSD" },
--   { "symbol": "$AAPL", "ticker": "NASDAQ:AAPL" },
--   { "symbol": "Gold", "ticker": "TVC:GOLD" }
-- ]