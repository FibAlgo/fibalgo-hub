-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 FibAlgo Data Cache Tables - Migration Script
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Bu tablolar API verilerini cache'lemek için kullanılır.
-- Rate limit'e takılsak bile veriler korunur.
--
-- Çalıştırmak için: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. MARKET DATA CACHE
-- Fiyatlar, OHLC, hacim verileri
CREATE TABLE IF NOT EXISTS market_data_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Identifier
    symbol VARCHAR(50) NOT NULL,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('equity', 'forex', 'crypto', 'commodity', 'index')),
    source VARCHAR(30) NOT NULL, -- yahoo, finnhub, binance, etc.
    
    -- Price Data
    price DECIMAL(20, 8),
    open_price DECIMAL(20, 8),
    high_price DECIMAL(20, 8),
    low_price DECIMAL(20, 8),
    close_price DECIMAL(20, 8),
    previous_close DECIMAL(20, 8),
    
    -- Changes
    change DECIMAL(20, 8),
    change_percent DECIMAL(10, 4),
    
    -- Volume
    volume BIGINT,
    volume_24h DECIMAL(30, 2),
    
    -- Additional
    market_cap DECIMAL(30, 2),
    bid DECIMAL(20, 8),
    ask DECIMAL(20, 8),
    spread DECIMAL(20, 8),
    
    -- Meta
    data_timestamp TIMESTAMPTZ NOT NULL, -- API'den gelen zaman
    fetched_at TIMESTAMPTZ DEFAULT NOW(), -- Ne zaman çektik
    expires_at TIMESTAMPTZ NOT NULL, -- Ne zaman expire olur
    
    -- Full JSON backup
    raw_data JSONB,
    
    UNIQUE(symbol, asset_type, source)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_asset_type ON market_data_cache(asset_type);
CREATE INDEX IF NOT EXISTS idx_market_data_expires ON market_data_cache(expires_at);

-- 2. INTRADAY OHLC CACHE
-- Kısa vadeli bar verileri
CREATE TABLE IF NOT EXISTS ohlc_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    symbol VARCHAR(50) NOT NULL,
    asset_type VARCHAR(20) NOT NULL,
    source VARCHAR(30) NOT NULL,
    interval VARCHAR(10) NOT NULL, -- 1m, 5m, 15m, 1h, 4h, 1d
    
    -- OHLC Array (last N candles as JSONB)
    candles JSONB NOT NULL, -- [{t, o, h, l, c, v}, ...]
    candle_count INT,
    
    -- Range
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    
    -- Meta
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    UNIQUE(symbol, asset_type, source, interval)
);

CREATE INDEX IF NOT EXISTS idx_ohlc_symbol ON ohlc_cache(symbol, interval);
CREATE INDEX IF NOT EXISTS idx_ohlc_expires ON ohlc_cache(expires_at);

-- 3. MACRO DATA CACHE
-- Makroekonomik göstergeler
CREATE TABLE IF NOT EXISTS macro_data_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    indicator VARCHAR(50) NOT NULL UNIQUE, -- vix, dxy, fear_greed, t10y, etc.
    category VARCHAR(30) NOT NULL, -- volatility, currency, sentiment, yields, etc.
    
    -- Value
    value DECIMAL(20, 8),
    previous_value DECIMAL(20, 8),
    change DECIMAL(20, 8),
    change_percent DECIMAL(10, 4),
    
    -- Additional context
    level VARCHAR(30), -- low, normal, high, extreme
    signal VARCHAR(30), -- bullish, bearish, neutral
    
    -- Source info
    source VARCHAR(30),
    source_url TEXT,
    
    -- Meta
    data_timestamp TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_macro_indicator ON macro_data_cache(indicator);
CREATE INDEX IF NOT EXISTS idx_macro_category ON macro_data_cache(category);

-- 4. TREASURY YIELDS CACHE
-- Faiz oranları özel tablosu
CREATE TABLE IF NOT EXISTS treasury_yields_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Yields
    t3m DECIMAL(6, 4),
    t6m DECIMAL(6, 4),
    t1y DECIMAL(6, 4),
    t2y DECIMAL(6, 4),
    t5y DECIMAL(6, 4),
    t10y DECIMAL(6, 4),
    t30y DECIMAL(6, 4),
    
    -- Spreads
    spread_10y_2y DECIMAL(6, 4),
    spread_10y_3m DECIMAL(6, 4),
    
    -- Curve Status
    curve_status VARCHAR(20), -- normal, flat, inverted
    
    -- Meta
    source VARCHAR(30) DEFAULT 'yahoo',
    data_timestamp TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 5. COMPANY FUNDAMENTALS CACHE
-- Şirket finansal verileri
CREATE TABLE IF NOT EXISTS fundamentals_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    symbol VARCHAR(20) NOT NULL,
    data_type VARCHAR(30) NOT NULL, -- income_statement, balance_sheet, cash_flow, ratios, dcf
    period VARCHAR(10), -- Q1, Q2, Q3, Q4, FY, TTM
    fiscal_year INT,
    
    -- Parsed key metrics (for quick access)
    revenue DECIMAL(20, 2),
    net_income DECIMAL(20, 2),
    eps DECIMAL(10, 4),
    pe_ratio DECIMAL(10, 2),
    market_cap DECIMAL(20, 2),
    
    -- Full data
    data JSONB NOT NULL,
    
    -- Source
    source VARCHAR(30) NOT NULL, -- fmp, finnhub
    
    -- Meta
    report_date DATE,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    UNIQUE(symbol, data_type, period, fiscal_year)
);

CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol ON fundamentals_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_fundamentals_type ON fundamentals_cache(data_type);

-- 6. CRYPTO ON-CHAIN CACHE
-- Kripto zincir verileri
CREATE TABLE IF NOT EXISTS crypto_onchain_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    symbol VARCHAR(20) NOT NULL, -- BTCUSDT, ETHUSDT
    data_type VARCHAR(30) NOT NULL, -- funding_rate, open_interest, liquidations
    
    -- Values
    value DECIMAL(20, 8),
    value_usd DECIMAL(20, 2),
    change_24h DECIMAL(20, 8),
    change_percent DECIMAL(10, 4),
    
    -- Sentiment/Signal
    sentiment VARCHAR(30), -- bullish, bearish, neutral
    signal VARCHAR(50),
    
    -- Full data
    data JSONB,
    
    -- Source
    source VARCHAR(30) NOT NULL, -- binance, coinglass
    
    -- Meta
    data_timestamp TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    UNIQUE(symbol, data_type, source)
);

CREATE INDEX IF NOT EXISTS idx_crypto_onchain_symbol ON crypto_onchain_cache(symbol);

-- 7. COT DATA CACHE
-- CFTC Commitments of Traders
CREATE TABLE IF NOT EXISTS cot_data_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    market_code VARCHAR(20) NOT NULL,
    market_name VARCHAR(100),
    
    -- Report data
    report_date DATE NOT NULL,
    
    -- Non-Commercial (Speculators)
    nc_long BIGINT,
    nc_short BIGINT,
    nc_spread BIGINT,
    nc_net BIGINT,
    
    -- Commercial (Hedgers)
    comm_long BIGINT,
    comm_short BIGINT,
    comm_net BIGINT,
    
    -- Non-Reportable (Retail)
    nr_long BIGINT,
    nr_short BIGINT,
    nr_net BIGINT,
    
    -- Open Interest
    open_interest BIGINT,
    oi_change BIGINT,
    
    -- Calculated
    percent_long DECIMAL(5, 2),
    sentiment VARCHAR(30), -- bullish, bearish, neutral, extreme_bullish, extreme_bearish
    
    -- Meta
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    UNIQUE(market_code, report_date)
);

CREATE INDEX IF NOT EXISTS idx_cot_market ON cot_data_cache(market_code);
CREATE INDEX IF NOT EXISTS idx_cot_date ON cot_data_cache(report_date DESC);

-- 8. SENTIMENT & POSITIONING CACHE
-- Piyasa duyarlılığı verileri
CREATE TABLE IF NOT EXISTS sentiment_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    symbol VARCHAR(50) NOT NULL,
    data_type VARCHAR(30) NOT NULL, -- short_interest, put_call, insider, institutional
    
    -- Values
    value DECIMAL(20, 8),
    ratio DECIMAL(10, 4),
    change DECIMAL(20, 8),
    
    -- Sentiment
    sentiment VARCHAR(30),
    signal VARCHAR(50),
    
    -- Full data
    data JSONB,
    
    -- Source
    source VARCHAR(30) NOT NULL,
    
    -- Meta
    data_timestamp TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    UNIQUE(symbol, data_type, source)
);

CREATE INDEX IF NOT EXISTS idx_sentiment_symbol ON sentiment_cache(symbol);

-- 9. NEWS CACHE (extends existing news_analyses)
-- Haberlerin tam metni ve metadata
CREATE TABLE IF NOT EXISTS news_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    news_id VARCHAR(100) UNIQUE NOT NULL, -- External ID
    
    -- Content
    headline TEXT NOT NULL,
    summary TEXT,
    content TEXT, -- Full article if available
    
    -- Source
    source VARCHAR(100),
    source_url TEXT,
    author VARCHAR(200),
    
    -- Classification
    category VARCHAR(50),
    subcategory VARCHAR(50),
    tags TEXT[], -- Array of tags
    symbols TEXT[], -- Related symbols
    
    -- Sentiment (pre-calculated)
    sentiment VARCHAR(20),
    sentiment_score DECIMAL(5, 4), -- -1 to 1
    importance_score DECIMAL(5, 4), -- 0 to 1
    
    -- Source quality
    source_tier INT, -- 1=highest, 5=lowest
    source_credibility DECIMAL(5, 4),
    
    -- Timing
    published_at TIMESTAMPTZ NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    analyzed_at TIMESTAMPTZ,
    
    -- AI Analysis (cached)
    ai_analysis JSONB,
    
    -- Meta
    language VARCHAR(10) DEFAULT 'en',
    is_breaking BOOLEAN DEFAULT FALSE,
    
    raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news_cache(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_cache(category);
CREATE INDEX IF NOT EXISTS idx_news_source ON news_cache(source);
CREATE INDEX IF NOT EXISTS idx_news_symbols ON news_cache USING GIN(symbols);

-- 10. API CALL LOG
-- Rate limit tracking
CREATE TABLE IF NOT EXISTS api_call_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    api_name VARCHAR(50) NOT NULL, -- yahoo, finnhub, binance, fmp, etc.
    endpoint VARCHAR(200),
    
    -- Status
    status VARCHAR(20) NOT NULL, -- success, error, rate_limited
    status_code INT,
    error_message TEXT,
    
    -- Timing
    called_at TIMESTAMPTZ DEFAULT NOW(),
    response_time_ms INT,
    
    -- Rate limit info
    rate_limit_remaining INT,
    rate_limit_reset TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_log_name ON api_call_log(api_name);
CREATE INDEX IF NOT EXISTS idx_api_log_time ON api_call_log(called_at DESC);

-- Cleanup old logs (keep 7 days)
-- Run periodically: DELETE FROM api_call_log WHERE called_at < NOW() - INTERVAL '7 days';

-- 11. CACHE METADATA
-- Cache durumu tracking
CREATE TABLE IF NOT EXISTS cache_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    cache_key VARCHAR(200) UNIQUE NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    
    -- Status
    last_updated TIMESTAMPTZ,
    last_error TIMESTAMPTZ,
    error_count INT DEFAULT 0,
    consecutive_errors INT DEFAULT 0,
    
    -- TTL
    default_ttl_seconds INT NOT NULL,
    current_ttl_seconds INT,
    
    -- Stats
    hit_count BIGINT DEFAULT 0,
    miss_count BIGINT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function: Clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM market_data_cache WHERE expires_at < NOW();
    DELETE FROM ohlc_cache WHERE expires_at < NOW();
    DELETE FROM macro_data_cache WHERE expires_at < NOW();
    DELETE FROM treasury_yields_cache WHERE expires_at < NOW();
    DELETE FROM fundamentals_cache WHERE expires_at < NOW();
    DELETE FROM crypto_onchain_cache WHERE expires_at < NOW();
    DELETE FROM cot_data_cache WHERE expires_at < NOW();
    DELETE FROM sentiment_cache WHERE expires_at < NOW();
    DELETE FROM api_call_log WHERE called_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function: Get cache stats
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
    table_name TEXT,
    total_rows BIGINT,
    expired_rows BIGINT,
    avg_age_minutes NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'market_data_cache'::TEXT, 
           COUNT(*)::BIGINT,
           COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT,
           EXTRACT(EPOCH FROM AVG(NOW() - fetched_at))/60
    FROM market_data_cache
    UNION ALL
    SELECT 'macro_data_cache'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT,
           EXTRACT(EPOCH FROM AVG(NOW() - fetched_at))/60
    FROM macro_data_cache
    UNION ALL
    SELECT 'fundamentals_cache'::TEXT,
           COUNT(*)::BIGINT,
           COUNT(*) FILTER (WHERE expires_at < NOW())::BIGINT,
           EXTRACT(EPOCH FROM AVG(NOW() - fetched_at))/60
    FROM fundamentals_cache;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Cache tables are server-side only, no RLS needed for now
-- But we can add read-only access for authenticated users if needed

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE market_data_cache IS 'Real-time market price cache with TTL';
COMMENT ON TABLE ohlc_cache IS 'OHLC candle data cache';
COMMENT ON TABLE macro_data_cache IS 'Macroeconomic indicators cache';
COMMENT ON TABLE treasury_yields_cache IS 'US Treasury yields snapshot';
COMMENT ON TABLE fundamentals_cache IS 'Company financial data cache';
COMMENT ON TABLE crypto_onchain_cache IS 'Crypto on-chain metrics cache';
COMMENT ON TABLE cot_data_cache IS 'CFTC Commitments of Traders cache';
COMMENT ON TABLE sentiment_cache IS 'Market sentiment indicators cache';
COMMENT ON TABLE news_cache IS 'News articles with pre-computed analysis';
COMMENT ON TABLE api_call_log IS 'API call tracking for rate limit management';
COMMENT ON TABLE cache_metadata IS 'Cache status and statistics';
