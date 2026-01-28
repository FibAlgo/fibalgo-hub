import { NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY;

// ═══════════════════════════════════════════════════════════════
// 🎯 TRADINGVIEW TICKER RESOLVER (Massive.com/Polygon.io API)
// ═══════════════════════════════════════════════════════════════

// Exchange code to TradingView prefix mapping
const EXCHANGE_MAP: Record<string, string> = {
  'XNAS': 'NASDAQ',
  'XNYS': 'NYSE',
  'XASE': 'AMEX',
  'ARCX': 'ARCA',
  'BATS': 'BATS',
  'XNMS': 'NASDAQ', // NASDAQ Global Market
  'XNCM': 'NASDAQ', // NASDAQ Capital Market
  'XNGS': 'NASDAQ', // NASDAQ Global Select
};

// Crypto exchange mapping
const CRYPTO_EXCHANGES: Record<string, string> = {
  'BTC': 'BINANCE:BTCUSDT',
  'ETH': 'BINANCE:ETHUSDT',
  'SOL': 'BINANCE:SOLUSDT',
  'XRP': 'BINANCE:XRPUSDT',
  'BNB': 'BINANCE:BNBUSDT',
  'DOGE': 'BINANCE:DOGEUSDT',
  'ADA': 'BINANCE:ADAUSDT',
  'AVAX': 'BINANCE:AVAXUSDT',
  'LINK': 'BINANCE:LINKUSDT',
  'MATIC': 'BINANCE:MATICUSDT',
};

// Forex pairs mapping
const FOREX_MAP: Record<string, string> = {
  'EURUSD': 'FX:EURUSD',
  'GBPUSD': 'FX:GBPUSD',
  'USDJPY': 'FX:USDJPY',
  'USDCHF': 'FX:USDCHF',
  'AUDUSD': 'FX:AUDUSD',
  'DXY': 'TVC:DXY',
};

// Cache for ticker lookups (avoid repeated API calls)
const tickerCache = new Map<string, string>();

/**
 * Resolve a ticker symbol to TradingView format using Massive.com API
 * @param ticker - Simple ticker like "AAPL", "TSLA", "BTC"
 * @returns TradingView format like "NASDAQ:AAPL", "BINANCE:BTCUSDT"
 */
export async function resolveTradingViewTicker(ticker: string): Promise<string> {
  const upperTicker = ticker.toUpperCase().trim();
  
  // Check cache first
  if (tickerCache.has(upperTicker)) {
    return tickerCache.get(upperTicker)!;
  }
  
  // Check if it's already in TradingView format
  if (upperTicker.includes(':')) {
    return upperTicker;
  }
  
  // Check crypto
  if (CRYPTO_EXCHANGES[upperTicker]) {
    tickerCache.set(upperTicker, CRYPTO_EXCHANGES[upperTicker]);
    return CRYPTO_EXCHANGES[upperTicker];
  }
  
  // Check forex
  if (FOREX_MAP[upperTicker]) {
    tickerCache.set(upperTicker, FOREX_MAP[upperTicker]);
    return FOREX_MAP[upperTicker];
  }
  
  // Query Massive.com API for stock ticker details
  if (!MASSIVE_API_KEY) {
    // Fallback: assume NASDAQ if no API key
    const fallback = `NASDAQ:${upperTicker}`;
    tickerCache.set(upperTicker, fallback);
    return fallback;
  }
  
  try {
    const response = await fetch(
      `https://api.massive.com/v3/reference/tickers/${upperTicker}?apiKey=${MASSIVE_API_KEY}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );
    
    if (!response.ok) {
      // Ticker not found, fallback to NASDAQ
      const fallback = `NASDAQ:${upperTicker}`;
      tickerCache.set(upperTicker, fallback);
      return fallback;
    }
    
    const data = await response.json();
    const exchange = data.results?.primary_exchange;
    
    if (exchange && EXCHANGE_MAP[exchange]) {
      const tvTicker = `${EXCHANGE_MAP[exchange]}:${upperTicker}`;
      tickerCache.set(upperTicker, tvTicker);
      return tvTicker;
    }
    
    // Default to NASDAQ if exchange not in map
    const fallback = `NASDAQ:${upperTicker}`;
    tickerCache.set(upperTicker, fallback);
    return fallback;
    
  } catch (error) {
    console.error(`Error resolving ticker ${upperTicker}:`, error);
    const fallback = `NASDAQ:${upperTicker}`;
    tickerCache.set(upperTicker, fallback);
    return fallback;
  }
}

/**
 * Batch resolve multiple tickers to TradingView format
 */
export async function resolveTradingViewTickers(tickers: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  
  // Process in parallel with concurrency limit
  const batchSize = 5;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const resolved = await Promise.all(batch.map(t => resolveTradingViewTicker(t)));
    batch.forEach((ticker, idx) => {
      results[ticker.toUpperCase()] = resolved[idx];
    });
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// 📊 TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface NewsItem {
  title: string;
  content?: string;
  source?: string;
  publishedAt?: string;
}

interface MarketContext {
  fearGreedIndex: number;
  fearGreedLabel: string;
  btcPrice: number;
  btc24hChange: number;
  vixLevel: number;
  dxyLevel: number;
  dxyTrend: string;
  recentNews: Array<{ timestamp: string; headline: string }>;
  centralBankRates?: {
    fed: number;
    ecb: number;
    boj: number;
  };
  upcomingEvents?: Array<{
    event: string;
    date: string;
    importance: 'high' | 'medium' | 'low';
    forecast?: string;
    previous?: string;
  }>;
  treasuryYields?: {
    us10y: number;
    us2y: number;
    spread: number; // 10y - 2y
  };
}

interface AssetData {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  volume: number;
  distanceFromHigh: number;
}

interface AnalysisResult {
  breakingNews: {
    isBreaking: boolean;
    urgencyLevel: 'critical' | 'elevated' | 'normal';
    responseWindow: 'minutes' | 'hours' | 'days';
  };
  informationQuality: {
    sourceType: 'primary' | 'secondary';
    confidence: 'confirmed' | 'likely' | 'speculative';
  };
  noveltyAssessment: {
    isNew: boolean;
    pricedInScore: number; // 1-10, where 10 = fully priced in
    reasoning: string;
  };
  marketContextFit: {
    currentRegime: 'risk-on' | 'risk-off' | 'neutral';
    regimeEffect: 'amplifies' | 'dampens' | 'neutral';
    priceActionConflict: boolean;
  };
  flowAnalysis: {
    primaryActors: string[];
    forcedFlows: boolean;
    expectedMagnitude: 'negligible' | 'minor' | 'moderate' | 'significant' | 'massive';
  };
  analysis: {
    headline: string; // AI-rewritten engaging headline
    sentiment: 'strong_bullish' | 'bullish' | 'lean_bullish' | 'neutral' | 'lean_bearish' | 'bearish' | 'strong_bearish';
    conviction: number; // 1-10
    timeHorizon: 'intraday' | 'days' | 'weeks' | 'structural';
    thesis: string;
    secondOrderEffects: string;
    keyRisk: string;
  };
  trade: {
    wouldTrade: boolean;
    direction: 'long' | 'short' | 'none';
    primaryAsset: string;
    alternativeAssets: string[];
    rationale: string;
    invalidation: string;
    riskReward: 'poor' | 'fair' | 'good' | 'excellent';
  };
  meta: {
    relatedAssets: string[];
    category: 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices' | 'macro';
  };
}

interface ValidationError {
  rule: string;
  message: string;
  severity: 'warning' | 'error';
}

interface AnalysisStats {
  total: number;
  tradeable: number;
  bullish: number;
  bearish: number;
  breaking: number;
  highConviction: number;
  validationWarnings: number;
  validationErrors: number;
}

// ═══════════════════════════════════════════════════════════════
// 🧠 PROMPT #1 — VARLIK ÇIKARMA (Asset Extraction)
// ═══════════════════════════════════════════════════════════════

const ASSET_EXTRACTION_SYSTEM = `You are a financial entity extractor. Your only job is to identify tradeable assets mentioned or implied in financial news and return them in TradingView format.

TRADINGVIEW TICKER FORMAT RULES:
- US Stocks: Use exchange prefix - NASDAQ:AAPL, NYSE:TSLA, NYSE:JPM, NASDAQ:MSFT, NASDAQ:NVDA
- Crypto: Use BINANCE exchange - BINANCE:BTCUSDT, BINANCE:ETHUSDT, BINANCE:SOLUSDT
- Forex: Use FX prefix - FX:EURUSD, FX:GBPUSD, FX:USDJPY
- Indices: Use proper prefix - SP:SPX, TVC:DXY, CBOE:VIX, DJ:DJI, NASDAQ:NDX
- Commodities: Use COMEX/NYMEX - COMEX:GC1! (Gold), NYMEX:CL1! (Oil), COMEX:SI1! (Silver)
- ETFs: Use exchange - AMEX:SPY, AMEX:QQQ, AMEX:GLD, AMEX:TLT

COMMON EXCHANGE MAPPINGS:
- Big tech (AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA): NASDAQ
- Banks (JPM, BAC, WFC, GS, MS): NYSE
- Energy (XOM, CVX, COP): NYSE
- Healthcare (JNJ, UNH, PFE): NYSE
- Industrials (CAT, BA, HON): NYSE

RULES:
- ALWAYS include exchange prefix for stocks
- Use BINANCE for all crypto pairs with USDT suffix
- Include DIRECTLY mentioned assets
- Include INDIRECTLY but OBVIOUSLY affected assets
- If no specific asset is identifiable, return ["SP:SPX"]
- Maximum 5 assets per news item
- Return ONLY valid JSON array, nothing else

EXAMPLES:

News: "Federal Reserve raises interest rates by 25 basis points"
Output: ["SP:SPX", "TVC:DXY", "AMEX:TLT", "BINANCE:BTCUSDT"]

News: "Ethereum Dencun upgrade successfully deployed"
Output: ["BINANCE:ETHUSDT", "BINANCE:ARBUSDT", "BINANCE:OPUSDT"]

News: "Tesla reports record quarterly deliveries"
Output: ["NASDAQ:TSLA"]

News: "JPMorgan beats earnings expectations"
Output: ["NYSE:JPM", "NYSE:BAC", "AMEX:XLF"]

News: "Oil prices surge on OPEC production cuts"
Output: ["NYMEX:CL1!", "NYSE:XOM", "NYSE:CVX"]

News: "Global inflation concerns rise amid supply chain issues"
Output: ["SP:SPX"]`;

// ═══════════════════════════════════════════════════════════════
// 🎯 PROMPT #2 — ANA ANALİZ (Main Analysis - Hedge Fund CIO)
// ═══════════════════════════════════════════════════════════════

const MAIN_ANALYSIS_SYSTEM = `You are the Chief Investment Officer at a $10 billion macro hedge fund. You have 25 years of experience across every market cycle since 1998. You've profited from dot-com crash, 2008 crisis, COVID crash, and 2022 crypto winter.

Your job: Analyze incoming financial news and determine if it represents a genuine trading opportunity.

TITLE FIELD: Write a clear, informative summary of the article in 1-2 sentences. This will be displayed as the news title.

═══════════════════════════════════════════════════════════════════
                         ANALYSIS FRAMEWORK
═══════════════════════════════════════════════════════════════════

Execute these steps IN ORDER for every news item:

───────────────────────────────────────────────────────────────────
STEP 1: BREAKING NEWS DETECTION
───────────────────────────────────────────────────────────────────

IMMEDIATELY classify the news urgency:

CRITICAL (Breaking News):
- Unexpected regulatory action (ban, approval, lawsuit, arrest)
- Security breach or major hack
- Exchange insolvency or withdrawal halt
- Unscheduled central bank action
- Major executive arrest, departure, or death
- Black swan geopolitical event
- Unexpected M&A or bankruptcy
→ These require IMMEDIATE response. Minutes matter.

ELEVATED:
- Scheduled high-impact events (CPI, FOMC, major earnings)
- Significant fund flows (ETF flows, whale movements)
- Important partnerships or exchange listings
→ These require FAST response. Hours matter.

NORMAL:
- Routine updates and developments
- Opinion pieces and analysis
- Gradual trend developments
→ Standard analysis timeline.

───────────────────────────────────────────────────────────────────
STEP 2: INFORMATION QUALITY ASSESSMENT
───────────────────────────────────────────────────────────────────

Evaluate the source:
- PRIMARY source (official announcement, SEC filing, company blog, on-chain data)
- SECONDARY source (journalist report, analyst opinion, social media)

Evaluate confidence:
- CONFIRMED (official, verified, multiple sources)
- LIKELY (credible source, consistent with known facts)
- SPECULATIVE (rumor, single source, unverified)

───────────────────────────────────────────────────────────────────
STEP 3: NOVELTY CHECK
───────────────────────────────────────────────────────────────────

Compare against:
- Recent news history provided (last 72 hours)
- Recent price action of affected assets

Key questions:
- Is this genuinely NEW information?
- Has the market already moved in the expected direction?
- Is this confirmation of something already known?

PRICED IN signals:
- Similar headline appeared in last 72 hours
- Asset already moved 10%+ in the implied direction
- News is "official confirmation" of known rumor

GENUINE SURPRISE signals:
- No prior related news
- Asset price stable before announcement
- Information contradicts market expectations

───────────────────────────────────────────────────────────────────
STEP 4: MARKET CONTEXT INTEGRATION  
───────────────────────────────────────────────────────────────────

Use the provided market data to contextualize:

RISK-OFF environment (Fear index < 30, VIX > 25):
- Bad news hits HARDER than normal
- Good news gets DISCOUNTED
- Flight to safety dominates

RISK-ON environment (Fear index > 60, VIX < 15):
- Good news AMPLIFIES
- Bad news gets bought
- Risk appetite high

NEUTRAL environment (Fear index 30-60):
- News has proportional, direct impact

ALSO CONSIDER:
- Asset already up 15%+ in 7 days + good news = potential "sell the news"
- Asset already down 15%+ in 7 days + bad news = potentially exhausted selling
- Strong DXY = headwind for risk assets
- Weak DXY = tailwind for risk assets

───────────────────────────────────────────────────────────────────
STEP 5: FLOW ANALYSIS
───────────────────────────────────────────────────────────────────

Determine WHO will act and HOW:

RETAIL traders:
- React emotionally and quickly
- Chase momentum
- Dominant in crypto, meme stocks

INSTITUTIONAL investors:
- React slower but with size
- Focus on fundamentals
- Dominant in traditional markets

ALGORITHMIC systems:
- React instantly to headlines
- Mean-reverting behavior
- Create initial spike then reversal

FORCED FLOWS (most important):
- Liquidations (leverage wipeout)
- Fund redemptions (forced selling)
- Index rebalancing (mechanical)
- Margin calls

───────────────────────────────────────────────────────────────────
STEP 6: SECOND-ORDER EFFECTS
───────────────────────────────────────────────────────────────────

Think beyond the obvious:
- What CORRELATED assets will move?
- Does this change the NARRATIVE for the sector?
- What are the REGULATORY implications?
- What does this IMPLY for competitors?

───────────────────────────────────────────────────────────────────
STEP 7: TRADE DECISION
───────────────────────────────────────────────────────────────────

If opportunity exists:
- DIRECTION: Long or short?
- ASSET: Primary and alternatives?
- TIME HORIZON: Intraday, days, weeks, structural?
- INVALIDATION: Where is the thesis wrong?
- RISK/REWARD: Is it asymmetric?

═══════════════════════════════════════════════════════════════════
                       CONVICTION CALIBRATION
═══════════════════════════════════════════════════════════════════

Score 1-2:  Pure noise. Zero signal. Completely ignore.
Score 3-4:  Mildly interesting but not tradeable. Monitor only.
Score 5:    Borderline. Needs confirmation before action.
Score 6-7:  Solid opportunity. Standard position warranted.
Score 8-9:  High conviction. Size up. Clear asymmetry present.
Score 10:   Rare. Obvious mispricing. Maximum conviction.

═══════════════════════════════════════════════════════════════════
                         OUTPUT RULES
═══════════════════════════════════════════════════════════════════

- Be DECISIVE. You are paid for opinions, not hedging.
- Be SPECIFIC. "Bullish crypto" is useless. "Long ETH, target $4000, invalidated below $3200" is useful.
- Be HONEST about uncertainty. Unknown ≠ neutral. State what you don't know.
- NEVER fabricate data. If information is missing, say so.
- NO price targets without clear justification.`;

// ═══════════════════════════════════════════════════════════════
// 📊 DATA FETCHING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Fear & Greed Index - Alternative.me API
async function fetchFearGreedIndex(): Promise<{ value: number; label: string }> {
  try {
    const response = await fetch('https://api.alternative.me/fng/', {
      next: { revalidate: 3600 }
    });
    const data = await response.json();
    return {
      value: parseInt(data.data[0].value),
      label: data.data[0].value_classification
    };
  } catch (error) {
    console.error('Fear & Greed fetch failed:', error);
    return { value: 50, label: 'Neutral' };
  }
}

// Bitcoin Fiyatı - Binance API (daha hızlı ve güvenilir)
async function fetchBTCPrice(): Promise<{ price: number; change24h: number }> {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
      next: { revalidate: 60 }
    });
    const data = await response.json();
    return {
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent)
    };
  } catch (error) {
    console.error('BTC price fetch failed:', error);
    // Fallback to CoinGecko
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
        { next: { revalidate: 300 } }
      );
      const data = await response.json();
      return {
        price: data.bitcoin.usd,
        change24h: data.bitcoin.usd_24h_change
      };
    } catch {
      return { price: 0, change24h: 0 };
    }
  }
}

// VIX - Yahoo Finance API Proxy
async function fetchVIX(): Promise<number> {
  try {
    // Yahoo Finance chart API
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d',
      { 
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    );
    const data = await response.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return price || 18.5;
  } catch (error) {
    console.error('VIX fetch failed:', error);
    return 18.5; // Default fallback
  }
}

// DXY - Yahoo Finance API Proxy
async function fetchDXY(): Promise<{ level: number; trend: string }> {
  try {
    // Yahoo Finance chart API for DXY
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=5d',
      { 
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const closes = result?.indicators?.quote?.[0]?.close?.filter((c: number | null) => c !== null) || [];
    
    if (closes.length >= 2) {
      const current = closes[closes.length - 1];
      const previous = closes[closes.length - 2];
      const change = ((current - previous) / previous) * 100;
      
      let trend = 'stable';
      if (change > 0.3) trend = 'rising';
      else if (change < -0.3) trend = 'falling';
      
      return { level: parseFloat(current.toFixed(2)), trend };
    }
    
    return { level: 104.2, trend: 'stable' };
  } catch (error) {
    console.error('DXY fetch failed:', error);
    return { level: 104.2, trend: 'stable' };
  }
}

// Treasury Yields - Yahoo Finance (10Y & 2Y)
async function fetchTreasuryYields(): Promise<{ us10y: number; us2y: number; spread: number }> {
  try {
    const [response10y, response2y] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=1d', {
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EIRX?interval=1d&range=1d', {
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
    ]);
    
    const data10y = await response10y.json();
    const data2y = await response2y.json();
    
    const us10y = data10y?.chart?.result?.[0]?.meta?.regularMarketPrice || 4.2;
    const us2y = data2y?.chart?.result?.[0]?.meta?.regularMarketPrice || 4.5;
    
    return {
      us10y: parseFloat(us10y.toFixed(2)),
      us2y: parseFloat(us2y.toFixed(2)),
      spread: parseFloat((us10y - us2y).toFixed(2))
    };
  } catch (error) {
    console.error('Treasury yields fetch failed:', error);
    return { us10y: 4.2, us2y: 4.5, spread: -0.3 };
  }
}

// Ekonomik Takvim
async function fetchUpcomingEvents(): Promise<Array<{
  event: string;
  date: string;
  importance: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
}>> {
  try {
    // Önümüzdeki 7 gün içindeki kritik eventleri kontrol et
    const today = new Date();
    const events: Array<{
      event: string;
      date: string;
      importance: 'high' | 'medium' | 'low';
      forecast?: string;
      previous?: string;
    }> = [];
    
    // FOMC Meeting tarihleri (2026) - Gerçek FOMC takviminden
    const fomcDates = [
      '2026-01-28', '2026-01-29', // Ocak
      '2026-03-17', '2026-03-18', // Mart
      '2026-05-05', '2026-05-06', // Mayıs
      '2026-06-16', '2026-06-17', // Haziran
      '2026-07-28', '2026-07-29', // Temmuz
      '2026-09-15', '2026-09-16', // Eylül
      '2026-11-03', '2026-11-04', // Kasım
      '2026-12-15', '2026-12-16', // Aralık
    ];
    
    const todayStr = today.toISOString().split('T')[0];
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    // FOMC kontrol
    for (const fomcDate of fomcDates) {
      if (fomcDate >= todayStr && fomcDate <= nextWeekStr) {
        events.push({
          event: 'FOMC Interest Rate Decision',
          date: fomcDate,
          importance: 'high',
          forecast: 'Hold',
          previous: '4.50%'
        });
      }
    }
    
    // Ayın ilk Cuma'sı NFP kontrolü
    const dayOfMonth = today.getDate();
    const dayOfWeek = today.getDay();
    
    if (dayOfMonth <= 7) {
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
      const nfpDate = new Date(today);
      nfpDate.setDate(today.getDate() + daysUntilFriday);
      
      if (nfpDate.getDate() <= 7) {
        events.push({
          event: 'US Non-Farm Payrolls (NFP)',
          date: nfpDate.toISOString().split('T')[0],
          importance: 'high',
          forecast: '180K',
          previous: '227K'
        });
      }
    }
    
    // CPI kontrolü (genelde 10-14. günler arası)
    if (dayOfMonth >= 8 && dayOfMonth <= 16) {
      events.push({
        event: 'US CPI (Consumer Price Index)',
        date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-12`,
        importance: 'high',
        forecast: '2.9% YoY',
        previous: '2.7% YoY'
      });
    }
    
    // ECB Meeting (yaklaşık olarak)
    const ecbDates = ['2026-01-30', '2026-03-12', '2026-04-17', '2026-06-05', '2026-07-17', '2026-09-11', '2026-10-30', '2026-12-18'];
    for (const ecbDate of ecbDates) {
      if (ecbDate >= todayStr && ecbDate <= nextWeekStr) {
        events.push({
          event: 'ECB Interest Rate Decision',
          date: ecbDate,
          importance: 'high',
          forecast: 'Hold',
          previous: '3.00%'
        });
      }
    }
    
    return events;
  } catch (error) {
    console.error('Economic calendar fetch failed:', error);
    return [];
  }
}

// Merkez Bankası Faiz Oranları (statik güncel veriler)
async function fetchCentralBankRates(): Promise<{ fed: number; ecb: number; boj: number }> {
  return {
    fed: 4.50,  // Federal Reserve - Fed Funds Rate
    ecb: 3.00,  // European Central Bank - Main Refinancing Rate
    boj: 0.25   // Bank of Japan - Policy Rate
  };
}

// Son 72 Saat Haberleri - Veritabanından
async function fetchRecentNews(assets: string[]): Promise<Array<{ timestamp: string; headline: string }>> {
  try {
    // Supabase'den son 72 saat haberlerini çek
    // Not: Burada 'route handler' olmadığı için createClient'ı supabase/server'dan alabiliriz
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setHours(threeDaysAgo.getHours() - 72);
    
    // news_analyses tablosundan ilgili haberleri çek
    const { data: newsData, error } = await supabase
      .from('news_analyses')
      .select('created_at, title')
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error || !newsData) {
      console.error('Recent news fetch failed:', error);
      return [];
    }
    
    // Asset'lerle ilgili haberleri filtrele
    const relevantNews = newsData.filter(news => {
      const headline = news.title?.toLowerCase() || '';
      return assets.some(asset => 
        headline.includes(asset.toLowerCase()) ||
        headline.includes(getAssetName(asset).toLowerCase())
      );
    });
    
    return relevantNews.map(news => ({
      timestamp: new Date(news.created_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      headline: news.title || ''
    }));
  } catch (error) {
    console.error('Recent news fetch failed:', error);
    return [];
  }
}

// Asset isimlerini dönüştür
function getAssetName(symbol: string): string {
  const names: Record<string, string> = {
    // Crypto
    'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'SOL': 'Solana', 'XRP': 'Ripple',
    'ADA': 'Cardano', 'DOGE': 'Dogecoin', 'AVAX': 'Avalanche',
    'ARB': 'Arbitrum', 'OP': 'Optimism', 'MATIC': 'Polygon',
    'DOT': 'Polkadot', 'LINK': 'Chainlink',
    // Forex
    'EUR/USD': 'Euro Dollar', 'EURUSD': 'Euro Dollar',
    'GBP/USD': 'Pound Dollar', 'GBPUSD': 'Pound Dollar',
    'USD/JPY': 'Dollar Yen', 'USDJPY': 'Dollar Yen',
    'USD/CHF': 'Dollar Swiss Franc', 'USDCHF': 'Dollar Swiss Franc',
    'AUD/USD': 'Australian Dollar', 'AUDUSD': 'Australian Dollar',
    'USD/CAD': 'Dollar Canadian', 'USDCAD': 'Dollar Canadian',
    'NZD/USD': 'New Zealand Dollar', 'NZDUSD': 'New Zealand Dollar',
    'EUR/GBP': 'Euro Pound', 'EURGBP': 'Euro Pound',
    'EUR/JPY': 'Euro Yen', 'EURJPY': 'Euro Yen',
    'GBP/JPY': 'Pound Yen', 'GBPJPY': 'Pound Yen',
    'DXY': 'Dollar Index',
    // Commodities
    'XAUUSD': 'Gold', 'GOLD': 'Gold', 'XAU': 'Gold',
    'XAGUSD': 'Silver', 'SILVER': 'Silver', 'XAG': 'Silver',
    'XPTUSD': 'Platinum', 'XPT': 'Platinum',
    'XPDUSD': 'Palladium', 'XPD': 'Palladium',
    'CL': 'Crude Oil', 'WTI': 'Crude Oil', 'USOIL': 'Crude Oil',
    'BRENT': 'Brent Oil', 'UKOIL': 'Brent Oil',
    'NG': 'Natural Gas', 'NATGAS': 'Natural Gas',
    'COPPER': 'Copper', 'HG': 'Copper',
    'WHEAT': 'Wheat', 'ZW': 'Wheat',
    'CORN': 'Corn', 'ZC': 'Corn',
    // Indices
    'SPX': 'S&P 500', 'SPY': 'S&P 500 ETF', 'ES': 'S&P 500 Futures',
    'NDX': 'Nasdaq 100', 'QQQ': 'Nasdaq ETF', 'NQ': 'Nasdaq Futures',
    'DJI': 'Dow Jones', 'DIA': 'Dow ETF', 'YM': 'Dow Futures',
    'DAX': 'German DAX', 'FTSE': 'UK FTSE', 'N225': 'Nikkei 225',
    'VIX': 'Volatility Index'
  };
  return names[symbol.toUpperCase()] || symbol;
}

// Asset kategorisini belirle
function getAssetCategory(symbol: string): 'crypto' | 'forex' | 'commodities' | 'indices' | 'stocks' {
  const upper = symbol.toUpperCase().replace('/', '');
  
  // Crypto
  if (['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT', 'LINK', 'ARB', 'OP', 'BNB', 'ATOM', 'UNI', 'AAVE'].includes(upper)) {
    return 'crypto';
  }
  
  // Forex
  if (upper.includes('USD') && upper.length <= 7 && !['XAUUSD', 'XAGUSD', 'USOIL'].includes(upper)) {
    if (['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'].some(c => upper.includes(c))) {
      return 'forex';
    }
  }
  if (['DXY', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'].includes(upper)) {
    return 'forex';
  }
  
  // Commodities
  if (['XAUUSD', 'XAGUSD', 'GOLD', 'SILVER', 'XAU', 'XAG', 'XPT', 'XPD', 'CL', 'WTI', 'USOIL', 'BRENT', 'UKOIL', 'NG', 'NATGAS', 'COPPER', 'HG', 'WHEAT', 'ZW', 'CORN', 'ZC'].includes(upper)) {
    return 'commodities';
  }
  
  // Indices
  if (['SPX', 'SPY', 'ES', 'NDX', 'QQQ', 'NQ', 'DJI', 'DIA', 'YM', 'DAX', 'FTSE', 'N225', 'VIX', 'RUT', 'IWM'].includes(upper)) {
    return 'indices';
  }
  
  return 'stocks';
}

// Yahoo Finance ticker dönüşümü
function getYahooTicker(symbol: string): string {
  const upper = symbol.toUpperCase().replace('/', '');
  
  const yahooMap: Record<string, string> = {
    // Forex
    'EURUSD': 'EURUSD=X', 'EUR/USD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X', 'GBP/USD': 'GBPUSD=X',
    'USDJPY': 'USDJPY=X', 'USD/JPY': 'USDJPY=X',
    'USDCHF': 'USDCHF=X', 'USD/CHF': 'USDCHF=X',
    'AUDUSD': 'AUDUSD=X', 'AUD/USD': 'AUDUSD=X',
    'USDCAD': 'USDCAD=X', 'USD/CAD': 'USDCAD=X',
    'NZDUSD': 'NZDUSD=X', 'NZD/USD': 'NZDUSD=X',
    'EURGBP': 'EURGBP=X', 'EUR/GBP': 'EURGBP=X',
    'EURJPY': 'EURJPY=X', 'EUR/JPY': 'EURJPY=X',
    'GBPJPY': 'GBPJPY=X', 'GBP/JPY': 'GBPJPY=X',
    'DXY': 'DX-Y.NYB',
    // Commodities
    'XAUUSD': 'GC=F', 'GOLD': 'GC=F', 'XAU': 'GC=F',
    'XAGUSD': 'SI=F', 'SILVER': 'SI=F', 'XAG': 'SI=F',
    'CL': 'CL=F', 'WTI': 'CL=F', 'USOIL': 'CL=F',
    'BRENT': 'BZ=F', 'UKOIL': 'BZ=F',
    'NG': 'NG=F', 'NATGAS': 'NG=F',
    'COPPER': 'HG=F', 'HG': 'HG=F',
    'XPT': 'PL=F', 'XPTUSD': 'PL=F',
    'XPD': 'PA=F', 'XPDUSD': 'PA=F',
    // Indices
    'SPX': '^GSPC', 'SPY': 'SPY', 'ES': 'ES=F',
    'NDX': '^NDX', 'QQQ': 'QQQ', 'NQ': 'NQ=F',
    'DJI': '^DJI', 'DIA': 'DIA', 'YM': 'YM=F',
    'DAX': '^GDAXI', 'FTSE': '^FTSE', 'N225': '^N225',
    'VIX': '^VIX', 'RUT': '^RUT', 'IWM': 'IWM'
  };
  
  return yahooMap[upper] || symbol;
}

// Yahoo Finance'den varlık verisi çek (Forex, Commodities, Indices)
async function fetchYahooAssetData(symbols: string[]): Promise<AssetData[]> {
  const results: AssetData[] = [];
  
  for (const symbol of symbols) {
    const yahooTicker = getYahooTicker(symbol);
    
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=7d`,
        { 
          next: { revalidate: 300 },
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }
      );
      const data = await response.json();
      const result = data?.chart?.result?.[0];
      
      if (result) {
        const closes = result?.indicators?.quote?.[0]?.close?.filter((c: number | null) => c !== null) || [];
        const meta = result?.meta;
        
        if (closes.length >= 2 && meta) {
          const currentPrice = meta.regularMarketPrice || closes[closes.length - 1];
          const previousDayPrice = closes.length >= 2 ? closes[closes.length - 2] : currentPrice;
          const weekAgoPrice = closes.length >= 5 ? closes[0] : previousDayPrice;
          const highPrice = Math.max(...closes);
          
          const change24h = previousDayPrice > 0 ? ((currentPrice - previousDayPrice) / previousDayPrice) * 100 : 0;
          const change7d = weekAgoPrice > 0 ? ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100 : 0;
          const distanceFromHigh = highPrice > 0 ? ((currentPrice - highPrice) / highPrice) * 100 : 0;
          
          results.push({
            symbol: symbol.toUpperCase(),
            price: currentPrice,
            change24h: parseFloat(change24h.toFixed(2)),
            change7d: parseFloat(change7d.toFixed(2)),
            volume: meta.regularMarketVolume || 0,
            distanceFromHigh: parseFloat(distanceFromHigh.toFixed(2))
          });
        }
      }
    } catch (error) {
      console.error(`Yahoo data fetch failed for ${symbol}:`, error);
    }
  }
  
  return results;
}

// Varlık Verisi - CoinGecko API (Crypto only)
async function fetchCryptoAssetData(symbols: string[]): Promise<AssetData[]> {
  const cryptoSymbols = symbols.filter(s => 
    ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT', 'LINK', 'ARB', 'OP'].includes(s.toUpperCase())
  );
  
  if (cryptoSymbols.length === 0) return [];
  
  const coinIdMap: Record<string, string> = {
    'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'XRP': 'ripple',
    'ADA': 'cardano', 'DOGE': 'dogecoin', 'AVAX': 'avalanche-2', 
    'MATIC': 'matic-network', 'DOT': 'polkadot', 'LINK': 'chainlink',
    'ARB': 'arbitrum', 'OP': 'optimism'
  };
  
  const coinIds = cryptoSymbols.map(s => coinIdMap[s.toUpperCase()]).filter(Boolean);
  
  if (coinIds.length === 0) return [];
  
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d`,
      { next: { revalidate: 300 } }
    );
    const data = await response.json();
    
    return data.map((coin: { 
      symbol: string; 
      current_price: number; 
      price_change_percentage_24h: number; 
      price_change_percentage_7d_in_currency: number;
      total_volume: number; 
      ath: number;
    }) => ({
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      change7d: coin.price_change_percentage_7d_in_currency || 0,
      volume: coin.total_volume,
      distanceFromHigh: coin.ath ? ((coin.current_price - coin.ath) / coin.ath * 100) : 0
    }));
  } catch (error) {
    console.error('Asset data fetch failed:', error);
    return [];
  }
}

// Tüm varlık türlerini destekleyen ana fetch fonksiyonu
async function fetchAssetData(symbols: string[]): Promise<AssetData[]> {
  const cryptoSymbols: string[] = [];
  const otherSymbols: string[] = [];
  
  for (const symbol of symbols) {
    const category = getAssetCategory(symbol);
    if (category === 'crypto') {
      cryptoSymbols.push(symbol);
    } else {
      otherSymbols.push(symbol);
    }
  }
  
  // Paralel olarak her iki kaynaktan veri çek
  const [cryptoData, yahooData] = await Promise.all([
    cryptoSymbols.length > 0 ? fetchCryptoAssetData(cryptoSymbols) : Promise.resolve([]),
    otherSymbols.length > 0 ? fetchYahooAssetData(otherSymbols) : Promise.resolve([])
  ]);
  
  return [...cryptoData, ...yahooData];
}

// ═══════════════════════════════════════════════════════════════
// 🔧 CONTEXT BUILDER (Doküman Formatına Uygun)
// ═══════════════════════════════════════════════════════════════

function buildUserPrompt(
  newsText: string,
  marketContext: MarketContext,
  assetData: AssetData[]
): string {
  // Asset Data Block - Doküman formatında
  const assetBlock = assetData.length > 0
    ? assetData.map(a => `
${a.symbol}:
- Price: $${a.price.toLocaleString()}
- 24h Change: ${a.change24h > 0 ? '+' : ''}${a.change24h.toFixed(1)}%
- 7d Change: ${a.change7d > 0 ? '+' : ''}${a.change7d.toFixed(1)}%
- 24h Volume: $${a.volume.toLocaleString()}
- Distance from 30d High: ${a.distanceFromHigh.toFixed(1)}%`).join('\n')
    : 'No specific asset data available';

  // Recent News Block - Doküman formatında
  const newsBlock = marketContext.recentNews.length > 0 
    ? marketContext.recentNews.map(n => `[${n.timestamp}] ${n.headline}`).join('\n')
    : 'No related news in the past 72 hours.';

  // DXY Trend belirleme
  const dxyTrend = marketContext.dxyTrend || 'stable';

  // Treasury Yields Block
  const yieldsBlock = marketContext.treasuryYields
    ? `US 10Y: ${marketContext.treasuryYields.us10y}% | US 2Y: ${marketContext.treasuryYields.us2y}% | Spread: ${marketContext.treasuryYields.spread}%`
    : 'N/A';

  // Central Bank Rates Block
  const ratesBlock = marketContext.centralBankRates
    ? `Fed: ${marketContext.centralBankRates.fed}% | ECB: ${marketContext.centralBankRates.ecb}% | BOJ: ${marketContext.centralBankRates.boj}%`
    : 'N/A';

  // Upcoming Events Block
  const eventsBlock = marketContext.upcomingEvents && marketContext.upcomingEvents.length > 0
    ? marketContext.upcomingEvents.map(e => 
        `[${e.date}] ${e.event} (${e.importance.toUpperCase()}) - Forecast: ${e.forecast || 'N/A'}, Previous: ${e.previous || 'N/A'}`
      ).join('\n')
    : 'No major events in the next 7 days';

  return `
══════════════════════════════════════════════════════════════════
                        MARKET CONTEXT
══════════════════════════════════════════════════════════════════

Overall Regime:
- Fear & Greed Index: ${marketContext.fearGreedIndex}/100 (${marketContext.fearGreedLabel})
- BTC: $${marketContext.btcPrice.toLocaleString()} (${marketContext.btc24hChange > 0 ? '+' : ''}${marketContext.btc24hChange.toFixed(1)}% 24h)
- VIX: ${marketContext.vixLevel}
- DXY: ${marketContext.dxyLevel} (${dxyTrend})

Macro Indicators:
- Treasury Yields: ${yieldsBlock}
- Central Bank Rates: ${ratesBlock}

──────────────────────────────────────────────────────────────────

Upcoming Economic Events (Next 7 Days):
${eventsBlock}

──────────────────────────────────────────────────────────────────

Asset Data:
${assetBlock}

──────────────────────────────────────────────────────────────────

Recent Related News (Last 72 Hours):
${newsBlock}

══════════════════════════════════════════════════════════════════
                       NEWS TO ANALYZE  
══════════════════════════════════════════════════════════════════

${newsText}

══════════════════════════════════════════════════════════════════
                      REQUIRED OUTPUT
══════════════════════════════════════════════════════════════════

Return ONLY valid JSON in this exact structure:

{
  "breakingNews": {
    "isBreaking": boolean,
    "urgencyLevel": "critical" | "elevated" | "normal",
    "responseWindow": "minutes" | "hours" | "days"
  },

  "informationQuality": {
    "sourceType": "primary" | "secondary",
    "confidence": "confirmed" | "likely" | "speculative"
  },

  "noveltyAssessment": {
    "isNew": boolean,
    "pricedInScore": integer (1-10, where 10 = fully priced in),
    "reasoning": string (1-2 sentences)
  },

  "marketContextFit": {
    "currentRegime": "risk-on" | "risk-off" | "neutral",
    "regimeEffect": "amplifies" | "dampens" | "neutral",
    "priceActionConflict": boolean
  },

  "flowAnalysis": {
    "primaryActors": string[],
    "forcedFlows": boolean,
    "expectedMagnitude": "negligible" | "minor" | "moderate" | "significant" | "massive"
  },

  "analysis": {
    "headline": string (1-2 sentence summary of the article. Clear and informative.),
    "sentiment": "strong_bullish" | "bullish" | "lean_bullish" | "neutral" | "lean_bearish" | "bearish" | "strong_bearish",
    "conviction": integer (1-10),
    "timeHorizon": "intraday" | "days" | "weeks" | "structural",
    "thesis": string (2-4 sentences explaining your view),
    "secondOrderEffects": string (1-2 sentences),
    "keyRisk": string (primary risk to the thesis)
  },

  "trade": {
    "wouldTrade": boolean,
    "direction": "long" | "short" | "none",
    "primaryAsset": string (MUST be TradingView format: NASDAQ:AAPL, NYSE:JPM, BINANCE:BTCUSDT, FX:EURUSD),
    "alternativeAssets": string[] (also in TradingView format),
    "rationale": string (1 sentence),
    "invalidation": string (what proves you wrong),
    "riskReward": "poor" | "fair" | "good" | "excellent"
  },

  "meta": {
    "relatedAssets": string[] (TradingView format: NASDAQ:AAPL, BINANCE:ETHUSDT, etc.),
    "category": "crypto" | "forex" | "stocks" | "commodities" | "indices" | "macro"
  }
}
`;
}

// ═══════════════════════════════════════════════════════════════
// ✅ QUALITY CONTROL — KALİTE KONTROL KURALLARI
// ═══════════════════════════════════════════════════════════════

function validateAnalysis(result: AnalysisResult): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Kural 1: Yüksek conviction + trade yok = tutarsız
  if (result.analysis.conviction >= 7 && !result.trade.wouldTrade) {
    errors.push({
      rule: 'HIGH_CONVICTION_NO_TRADE',
      message: 'High conviction (≥7) but not trading — requires explanation',
      severity: 'warning'
    });
  }
  
  // Kural 2: Neutral sentiment + yüksek conviction = tutarsız
  if (result.analysis.sentiment === 'neutral' && result.analysis.conviction >= 6) {
    errors.push({
      rule: 'NEUTRAL_HIGH_CONVICTION',
      message: 'Neutral sentiment with high conviction is contradictory',
      severity: 'error'
    });
  }
  
  // Kural 3: Trade var + kötü risk/reward = mantıksız
  if (result.trade.wouldTrade && result.trade.riskReward === 'poor') {
    errors.push({
      rule: 'TRADE_WITH_POOR_RR',
      message: 'Trading with poor risk/reward is not rational',
      severity: 'error'
    });
  }
  
  // Kural 4: Breaking news + normal response window = tutarsız
  if (result.breakingNews.isBreaking && result.breakingNews.responseWindow === 'days') {
    errors.push({
      rule: 'BREAKING_SLOW_RESPONSE',
      message: 'Breaking news with days response window is inconsistent',
      severity: 'warning'
    });
  }
  
  // Kural 5: Yeni haber değil + düşük priced-in score = tutarsız
  if (!result.noveltyAssessment.isNew && result.noveltyAssessment.pricedInScore < 5) {
    errors.push({
      rule: 'NOT_NEW_LOW_PRICED_IN',
      message: 'Not new but low priced-in score is contradictory',
      severity: 'warning'
    });
  }
  
  return errors;
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN LOGIC — 5-STEP PIPELINE
// ═══════════════════════════════════════════════════════════════

async function retryFetch(url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      if (retries <= 0) {
        throw new Error('Rate limit exceeded after retries');
      }
      
      // Get retry-after header if available
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff;
      
      console.warn(`Rate limit hit. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return retryFetch(url, options, retries - 1, backoff * 2);
    }
    
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, backoff));
    return retryFetch(url, options, retries - 1, backoff * 2);
  }
}

export async function analyzeNewsBatch(news: NewsItem[]) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const results: Array<{
    newsItem: NewsItem;
    analysis: AnalysisResult;
    validationErrors: ValidationError[];
    extractedAssets: string[];
    tradingViewTickers: Record<string, string | null>;
  }> = [];

  // Process each news item through 5-step pipeline
  // Limit to 5 items to avoid partial failures or timeouts
  for (const newsItem of news.slice(0, 5)) { 
    
    // ══════════════════════════════════════════════════
    // ADIM 1: VARLIK ÇIKARMA (Asset Extraction)
    // ══════════════════════════════════════════════════
    //@ts-ignore
    const extractionResponse = await retryFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ASSET_EXTRACTION_SYSTEM },
          { role: 'user', content: `Extract tradeable assets from this news:\n\n${newsItem.title}${newsItem.content ? `\n${newsItem.content}` : ''}\n\nReturn ONLY a JSON array. No explanation, no markdown.` }
        ],
        temperature: 0.2,
        max_tokens: 100,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    let extractedAssets: string[] = [];
    if (extractionResponse.ok) {
      const extractionData = await extractionResponse.json();
      const assetsText = extractionData.choices[0]?.message?.content || '[]';
      try {
        const parsed = JSON.parse(assetsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
        extractedAssets = Array.isArray(parsed) ? parsed.filter((s: string) => s !== 'MARKET') : [];
      } catch {
        // Fallback: comma-separated parsing
        extractedAssets = assetsText.split(',').map((s: string) => s.trim().replace(/[\[\]"]/g, '')).filter((s: string) => s && s !== 'MARKET');
      }
    }

    // ══════════════════════════════════════════════════
    // ADIM 1.5: TRADINGVIEW TICKER ÇÖZÜMLE (Resolve TradingView Tickers)
    // ══════════════════════════════════════════════════
    const tradingViewTickers = await resolveTradingViewTickers(extractedAssets);

    // ══════════════════════════════════════════════════
    // ADIM 2: VERİ TOPLAMA (Data Collection - Parallel)
    // ══════════════════════════════════════════════════
    const [
      fearGreed, 
      btcData, 
      vixLevel, 
      dxyData, 
      assetData, 
      recentNews,
      treasuryYields,
      upcomingEvents,
      centralBankRates
    ] = await Promise.all([
      fetchFearGreedIndex(),
      fetchBTCPrice(),
      fetchVIX(),
      fetchDXY(),
      fetchAssetData(extractedAssets),
      fetchRecentNews(extractedAssets),
      fetchTreasuryYields(),
      fetchUpcomingEvents(),
      fetchCentralBankRates()
    ]);

    // ══════════════════════════════════════════════════
    // ADIM 3: BAĞLAM PAKETİ OLUŞTUR (Context Package)
    // ══════════════════════════════════════════════════
    const marketContext: MarketContext = {
      fearGreedIndex: fearGreed.value,
      fearGreedLabel: fearGreed.label,
      btcPrice: btcData.price,
      btc24hChange: btcData.change24h,
      vixLevel: vixLevel,
      dxyLevel: dxyData.level,
      dxyTrend: dxyData.trend,
      recentNews: recentNews,
      // Yeni eklenen veriler
      treasuryYields: treasuryYields,
      upcomingEvents: upcomingEvents,
      centralBankRates: centralBankRates
    };

    const newsText = `${newsItem.title}${newsItem.content ? `\n\n${newsItem.content}` : ''}${newsItem.source ? `\n\nSource: ${newsItem.source}` : ''}`;
    const userPromptText = buildUserPrompt(newsText, marketContext, assetData);

    // ══════════════════════════════════════════════════
    // ADIM 4: ANA ANALİZ (Main Analysis)
    // ══════════════════════════════════════════════════
    //@ts-ignore
    const analysisResponse = await retryFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MAIN_ANALYSIS_SYSTEM },
          { role: 'user', content: userPromptText }
        ],
        temperature: 0.4,
        max_tokens: 2500,
        top_p: 0.95,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    if (!analysisResponse.ok) {
      console.error('Analysis API error:', await analysisResponse.json());
      continue;
    }

    const analysisData = await analysisResponse.json();
    const analysisText = analysisData.choices[0]?.message?.content || '{}';
    
    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse analysis:', analysisText);
      continue;
    }

    // ══════════════════════════════════════════════════
    // ADIM 5: KALİTE KONTROL (Quality Control)
    // ══════════════════════════════════════════════════
    const validationErrors = validateAnalysis(analysis);
    
    // Kritik hata varsa trade'i engelle
    const hasCriticalError = validationErrors.some(e => e.severity === 'error');
    if (hasCriticalError && analysis.trade.wouldTrade) {
      analysis.trade.wouldTrade = false;
      analysis.trade.direction = 'none';
      analysis.trade.rationale = 'BLOCKED: Quality control detected inconsistencies';
    }

    results.push({
      newsItem,
      analysis,
      validationErrors,
      extractedAssets,
      tradingViewTickers
    });
  }

  // Aggregate stats hesapla
  const stats: AnalysisStats = {
    total: results.length,
    tradeable: results.filter(r => r.analysis.trade.wouldTrade).length,
    bullish: results.filter(r => ['strong_bullish', 'bullish', 'lean_bullish'].includes(r.analysis.analysis.sentiment)).length,
    bearish: results.filter(r => ['strong_bearish', 'bearish', 'lean_bearish'].includes(r.analysis.analysis.sentiment)).length,
    breaking: results.filter(r => r.analysis.breakingNews.isBreaking).length,
    highConviction: results.filter(r => r.analysis.analysis.conviction >= 7).length,
    validationWarnings: results.reduce((sum, r) => sum + r.validationErrors.filter(e => e.severity === 'warning').length, 0),
    validationErrors: results.reduce((sum, r) => sum + r.validationErrors.filter(e => e.severity === 'error').length, 0),
  };

  return {
    analyses: results,
    stats,
    meta: {
      model: 'gpt-4o-mini',
      pipeline: '5-step-institutional',
      timestamp: new Date().toISOString(),
    }
  };
}
