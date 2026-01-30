import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getErrorStatus, checkRateLimit, getClientIP } from '@/lib/api/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ═══════════════════════════════════════════════════════════════════
// MARKET CONTEXT SERVICE
// Piyasa bağlamı anlık görüntüleri
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// External API keys
// ───────────────────────────────────────────────────────────────────

const FEAR_GREED_API = 'https://api.alternative.me/fng/?limit=1';
const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

// ───────────────────────────────────────────────────────────────────
// HELPER: Fetch Fear & Greed Index
// ───────────────────────────────────────────────────────────────────

async function fetchFearGreedIndex(): Promise<number | null> {
  try {
    const response = await fetch(FEAR_GREED_API, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return parseInt(data.data?.[0]?.value) || null;
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Fetch VIX level
// ───────────────────────────────────────────────────────────────────

async function fetchVIX(): Promise<number | null> {
  try {
    const response = await fetch(
      `${YAHOO_FINANCE_API}/^VIX?interval=1d&range=1d`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    
    return price ? parseFloat(price.toFixed(2)) : null;
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Fetch major asset prices
// ───────────────────────────────────────────────────────────────────

async function fetchAssetPrices(): Promise<Record<string, any>> {
  const symbols = [
    { symbol: '^GSPC', name: 'SPX' },
    { symbol: 'DX-Y.NYB', name: 'DXY' },
    { symbol: 'USDJPY=X', name: 'USDJPY' },
    { symbol: 'GC=F', name: 'XAUUSD' },
    { symbol: 'BTC-USD', name: 'BTC' },
    { symbol: 'EURUSD=X', name: 'EURUSD' },
    { symbol: '^TYX', name: 'US10Y' }
  ];
  
  const assets: Record<string, any> = {};
  
  await Promise.all(symbols.map(async ({ symbol, name }) => {
    try {
      const response = await fetch(
        `${YAHOO_FINANCE_API}/${symbol}?interval=1d&range=5d`,
        { next: { revalidate: 300 } }
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (result) {
        const meta = result.meta;
        const closes = result.indicators?.quote?.[0]?.close || [];
        const previousClose = closes.length >= 2 ? closes[closes.length - 2] : meta.chartPreviousClose;
        const currentPrice = meta.regularMarketPrice;
        
        const change24h = previousClose 
          ? ((currentPrice - previousClose) / previousClose * 100).toFixed(2)
          : 0;
        
        assets[name] = {
          price: currentPrice,
          change24h: parseFloat(change24h as string),
          previousClose: previousClose,
          positioning: determinePositioning(parseFloat(change24h as string))
        };
      }
    } catch {
      // Skip failed asset
    }
  }));
  
  return assets;
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Determine positioning based on price action
// ───────────────────────────────────────────────────────────────────

function determinePositioning(change24h: number): string {
  if (change24h > 1) return 'strong_long';
  if (change24h > 0.3) return 'long';
  if (change24h < -1) return 'strong_short';
  if (change24h < -0.3) return 'short';
  return 'neutral';
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Determine market regime
// ───────────────────────────────────────────────────────────────────

function determineMarketRegime(
  fearGreed: number | null,
  vix: number | null,
  assets: Record<string, any>
): string {
  // Risk-off indicators
  let riskOffScore = 0;
  
  if (fearGreed !== null && fearGreed < 30) riskOffScore += 2;
  if (vix !== null && vix > 25) riskOffScore += 2;
  if (assets.XAUUSD?.change24h > 0.5) riskOffScore += 1; // Gold up
  if (assets.SPX?.change24h < -0.5) riskOffScore += 1; // Stocks down
  if (assets.BTC?.change24h < -2) riskOffScore += 1; // Crypto down
  
  // Risk-on indicators
  let riskOnScore = 0;
  
  if (fearGreed !== null && fearGreed > 60) riskOnScore += 2;
  if (vix !== null && vix < 15) riskOnScore += 2;
  if (assets.SPX?.change24h > 0.5) riskOnScore += 1; // Stocks up
  if (assets.BTC?.change24h > 2) riskOnScore += 1; // Crypto up
  
  if (riskOffScore >= 4) return 'risk-off';
  if (riskOnScore >= 4) return 'risk-on';
  if (riskOffScore >= 2 && riskOnScore >= 2) return 'transitional';
  
  return 'neutral';
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Generate narrative
// ───────────────────────────────────────────────────────────────────

function generateNarrative(
  regime: string,
  fearGreed: number | null,
  vix: number | null,
  assets: Record<string, any>
): string {
  const parts: string[] = [];
  
  // Fear & Greed commentary
  if (fearGreed !== null) {
    if (fearGreed < 25) parts.push('Extreme fear in markets');
    else if (fearGreed < 40) parts.push('Fearful sentiment');
    else if (fearGreed > 75) parts.push('Extreme greed, potential for correction');
    else if (fearGreed > 60) parts.push('Greedy sentiment, bullish bias');
    else parts.push('Neutral sentiment');
  }
  
  // VIX commentary
  if (vix !== null) {
    if (vix > 30) parts.push(`VIX elevated at ${vix}, high volatility expected`);
    else if (vix > 20) parts.push(`VIX at ${vix}, moderate volatility`);
    else if (vix < 13) parts.push(`VIX very low at ${vix}, complacency risk`);
  }
  
  // Dollar commentary
  if (assets.DXY?.change24h) {
    if (assets.DXY.change24h > 0.5) parts.push('Dollar strength continues');
    else if (assets.DXY.change24h < -0.5) parts.push('Dollar weakness');
  }
  
  // Equity commentary
  if (assets.SPX?.change24h) {
    if (assets.SPX.change24h > 1) parts.push('Equities rallying');
    else if (assets.SPX.change24h < -1) parts.push('Equities selling off');
  }
  
  return parts.join('. ') || 'No specific market narrative.';
}

// ═══════════════════════════════════════════════════════════════════
// GET: Get current market context
// ═══════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Check for recent snapshot (within last 15 minutes)
    if (!refresh) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { data: recentSnapshot } = await supabase
        .from('market_context_snapshots')
        .select('*')
        .gte('snapshot_at', fifteenMinutesAgo)
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .single();
      
      if (recentSnapshot) {
        return NextResponse.json({
          success: true,
          cached: true,
          context: recentSnapshot
        });
      }
    }
    
    // Fetch fresh data
    const [fearGreed, vix, assets] = await Promise.all([
      fetchFearGreedIndex(),
      fetchVIX(),
      fetchAssetPrices()
    ]);
    
    const regime = determineMarketRegime(fearGreed, vix, assets);
    const narrative = generateNarrative(regime, fearGreed, vix, assets);
    
    const context = {
      snapshot_at: new Date().toISOString(),
      regime,
      fear_greed_index: fearGreed,
      vix_level: vix,
      assets,
      current_narrative: narrative,
      fed_expectations: {
        // This would be updated manually or via another source
        nextMeetingDate: getNextFOMCDate(),
        currentRate: '4.25-4.50%',
        marketExpectation: 'Hold'
      }
    };
    
    // Save snapshot
    await supabase
      .from('market_context_snapshots')
      .insert(context);
    
    return NextResponse.json({
      success: true,
      cached: false,
      context
    });
    
  } catch (error) {
    console.error('Get market context error:', error);
    return NextResponse.json(
      { error: 'Failed to get market context' },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────────────────────────
// HELPER: Get next FOMC date
// ───────────────────────────────────────────────────────────────────

function getNextFOMCDate(): string {
  // FOMC 2026 schedule (approximate)
  const fomcDates = [
    '2026-01-29',
    '2026-03-19',
    '2026-05-07',
    '2026-06-18',
    '2026-07-30',
    '2026-09-17',
    '2026-11-05',
    '2026-12-17'
  ];
  
  const today = new Date().toISOString().split('T')[0];
  
  for (const date of fomcDates) {
    if (date >= today) {
      return date;
    }
  }
  
  return '2027-01-28'; // First 2027 meeting
}

// ═══════════════════════════════════════════════════════════════════
// POST: Update market context manually
// ═══════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    // 🔒 SECURITY: Require authentication for data modification
    const { user, error: authError } = await requireAuth();
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    // 🔒 SECURITY: Rate limit AI/compute-heavy endpoint
    const clientIP = getClientIP(request as any);
    const { success: rateLimitOk, reset } = await checkRateLimit(`ai:${user.id}:${clientIP}:market-context`, 'ai');
    if (!rateLimitOk) {
      return NextResponse.json({
        error: 'Too many requests. Please wait before trying again.',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    const body = await request.json();
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Fetch current automated data
    const [fearGreed, vix, assets] = await Promise.all([
      fetchFearGreedIndex(),
      fetchVIX(),
      fetchAssetPrices()
    ]);
    
    // Merge with manual overrides
    const context = {
      snapshot_at: new Date().toISOString(),
      regime: body.regime || determineMarketRegime(fearGreed, vix, assets),
      fear_greed_index: body.fearGreedIndex ?? fearGreed,
      vix_level: body.vixLevel ?? vix,
      assets: { ...assets, ...body.assets },
      current_narrative: body.narrative || generateNarrative(
        body.regime || determineMarketRegime(fearGreed, vix, assets),
        body.fearGreedIndex ?? fearGreed,
        body.vixLevel ?? vix,
        { ...assets, ...body.assets }
      ),
      fed_expectations: body.fedExpectations || {
        nextMeetingDate: getNextFOMCDate(),
        currentRate: '4.25-4.50%',
        marketExpectation: 'Hold'
      }
    };
    
    const { data, error } = await supabase
      .from('market_context_snapshots')
      .insert(context)
      .select('id')
      .single();
    
    if (error) {
      throw new Error(`Failed to save context: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      id: data.id,
      context
    });
    
  } catch (error) {
    console.error('Update market context error:', error);
    return NextResponse.json(
      { error: 'Failed to update market context' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// PUT: Update Fed expectations
// ═══════════════════════════════════════════════════════════════════

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.fedExpectations) {
      return NextResponse.json(
        { error: 'fedExpectations object is required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get latest snapshot and update it
    const { data: latest } = await supabase
      .from('market_context_snapshots')
      .select('*')
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .single();
    
    if (latest) {
      // Create new snapshot with updated Fed expectations
      const newContext = {
        ...latest,
        id: undefined,
        snapshot_at: new Date().toISOString(),
        fed_expectations: {
          ...latest.fed_expectations,
          ...body.fedExpectations
        }
      };
      
      delete newContext.id;
      
      const { data, error } = await supabase
        .from('market_context_snapshots')
        .insert(newContext)
        .select('id')
        .single();
      
      if (error) {
        throw new Error(`Failed to update: ${error.message}`);
      }
      
      return NextResponse.json({
        success: true,
        id: data.id,
        fedExpectations: newContext.fed_expectations
      });
    }
    
    return NextResponse.json(
      { error: 'No existing context to update' },
      { status: 404 }
    );
    
  } catch (error) {
    console.error('Update Fed expectations error:', error);
    return NextResponse.json(
      { error: 'Failed to update Fed expectations' },
      { status: 500 }
    );
  }
}
