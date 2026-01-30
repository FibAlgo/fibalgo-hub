-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 SIGNAL PERFORMANCE TRACKING TABLE
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tablo oluştur
CREATE TABLE IF NOT EXISTS signal_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id TEXT NOT NULL,
  signal TEXT NOT NULL,
  primary_asset TEXT NOT NULL,
  entry_price DECIMAL(20, 8),
  price_1h DECIMAL(20, 8),
  price_4h DECIMAL(20, 8),
  price_24h DECIMAL(20, 8),
  change_1h DECIMAL(10, 4),
  change_4h DECIMAL(10, 4),
  change_24h DECIMAL(10, 4),
  is_winner_1h BOOLEAN,
  is_winner_4h BOOLEAN,
  is_winner_24h BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(news_id)
);

-- Performans için index'ler
CREATE INDEX IF NOT EXISTS idx_signal_performance_created_at ON signal_performance(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_performance_signal ON signal_performance(signal);
CREATE INDEX IF NOT EXISTS idx_signal_performance_asset ON signal_performance(primary_asset);

-- Yorum ekle
COMMENT ON TABLE signal_performance IS 'Tracks the performance of AI-generated trading signals over 1h, 4h, and 24h periods';
