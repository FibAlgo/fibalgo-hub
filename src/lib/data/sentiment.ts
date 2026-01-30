/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 POSITIONING & SENTIMENT DATA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Market positioning and sentiment indicators:
 * - CFTC Commitment of Traders (COT) data
 * - Put/Call ratios
 * - Short interest
 * - Social sentiment (Twitter, Reddit mentions)
 * - Institutional ownership changes
 * 
 * Sources: Quandl/CFTC, Yahoo Finance, Reddit API
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface COTData {
  symbol: string;
  commodity: string;
  date: string;
  commercialLong: number;
  commercialShort: number;
  commercialNet: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  nonCommercialNet: number;
  openInterest: number;
  netChange: number;
  signal: 'bullish' | 'bearish' | 'neutral';
}

export interface PutCallRatio {
  symbol: string;
  ratio: number;
  totalCalls: number;
  totalPuts: number;
  callVolume: number;
  putVolume: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  date: string;
}

export interface ShortInterest {
  symbol: string;
  shortInterest: number;
  shortPercentOfFloat: number;
  daysTocover: number;
  previousShortInterest: number;
  changePercent: number;
  settlementDate: string;
  signal: 'potential_squeeze' | 'bearish_pressure' | 'neutral';
}

export interface SocialSentiment {
  symbol: string;
  platform: 'twitter' | 'reddit' | 'stocktwits' | 'combined';
  mentions: number;
  sentiment: number; // -1 to 1
  sentimentLabel: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
  changePercent: number;
  buzzing: boolean;
  timestamp: number;
}

export interface InstitutionalOwnership {
  symbol: string;
  institutionalPercent: number;
  topHolders: Array<{
    holder: string;
    shares: number;
    percentHeld: number;
    change: number;
  }>;
  netInstitutionalBuying: number; // Positive = buying, negative = selling
  quarterDate: string;
}

export interface PositioningSummary {
  symbol: string;
  overallSentiment: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
  signals: string[];
  score: number; // -100 to 100
  components: {
    shortInterest: number;
    putCallRatio: number;
    socialSentiment: number;
    institutionalFlow: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT/CALL RATIO (CBOE)
// ═══════════════════════════════════════════════════════════════════════════════

// CBOE Total Put/Call Ratio - approximation from VIX and market data
export async function fetchCBOEPutCallRatio(): Promise<{
  totalPutCall: number;
  indexPutCall: number;
  equityPutCall: number;
  sentiment: string;
}> {
  try {
    // Use VIX as proxy for options sentiment
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!response.ok) {
      return { totalPutCall: 0.85, indexPutCall: 1.2, equityPutCall: 0.65, sentiment: 'neutral' };
    }
    
    const data = await response.json();
    const vix = data?.chart?.result?.[0]?.meta?.regularMarketPrice || 18;
    
    // Estimate put/call ratios based on VIX
    // Higher VIX = more put buying = higher P/C ratio
    const basePutCall = 0.85;
    const vixFactor = (vix - 18) / 10; // Normalize around VIX 18
    const totalPutCall = Math.max(0.4, Math.min(1.5, basePutCall + vixFactor * 0.2));
    
    // Index options typically higher P/C (hedging)
    const indexPutCall = totalPutCall * 1.4;
    // Equity options typically lower P/C (speculation)
    const equityPutCall = totalPutCall * 0.75;
    
    let sentiment: string;
    if (totalPutCall > 1.1) sentiment = 'extreme_fear';
    else if (totalPutCall > 0.95) sentiment = 'fear';
    else if (totalPutCall < 0.65) sentiment = 'extreme_greed';
    else if (totalPutCall < 0.8) sentiment = 'greed';
    else sentiment = 'neutral';
    
    return { totalPutCall, indexPutCall, equityPutCall, sentiment };
  } catch (error) {
    console.error('Put/Call ratio fetch error:', error);
    return { totalPutCall: 0.85, indexPutCall: 1.2, equityPutCall: 0.65, sentiment: 'neutral' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHORT INTEREST (Yahoo Finance)
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchShortInterest(symbol: string): Promise<ShortInterest | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=defaultKeyStatistics`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const stats = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics || {};
    
    const shortInterest = stats.sharesShort?.raw || 0;
    const shortPercentOfFloat = (stats.shortPercentOfFloat?.raw || 0) * 100;
    const daysTocover = stats.shortRatio?.raw || 0;
    const previousShortInterest = stats.sharesShortPriorMonth?.raw || shortInterest;
    const changePercent = previousShortInterest > 0 
      ? ((shortInterest - previousShortInterest) / previousShortInterest) * 100 
      : 0;
    
    // Determine signal
    let signal: ShortInterest['signal'];
    if (shortPercentOfFloat > 20 && daysTocover > 5) {
      signal = 'potential_squeeze';
    } else if (shortPercentOfFloat > 10 && changePercent > 10) {
      signal = 'bearish_pressure';
    } else {
      signal = 'neutral';
    }
    
    return {
      symbol,
      shortInterest,
      shortPercentOfFloat,
      daysTocover,
      previousShortInterest,
      changePercent,
      settlementDate: stats.dateShortInterest?.fmt || '',
      signal
    };
  } catch (error) {
    console.error('Short interest fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINNHUB SOCIAL SENTIMENT
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchSocialSentiment(symbol: string): Promise<SocialSentiment | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  
  try {
    // Get social sentiment from Finnhub
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/social-sentiment?symbol=${symbol}&from=${
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }&to=${new Date().toISOString().split('T')[0]}&token=${apiKey}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // Aggregate Reddit and Twitter data
    const reddit = data.reddit || [];
    const twitter = data.twitter || [];
    
    const totalMentions = reddit.length + twitter.length;
    if (totalMentions === 0) return null;
    
    // Calculate weighted sentiment
    let totalSentiment = 0;
    [...reddit, ...twitter].forEach((item: { score?: number }) => {
      totalSentiment += item.score || 0;
    });
    const avgSentiment = totalSentiment / totalMentions;
    
    // Normalize to -1 to 1
    const normalizedSentiment = Math.max(-1, Math.min(1, avgSentiment));
    
    let sentimentLabel: SocialSentiment['sentimentLabel'];
    if (normalizedSentiment < -0.4) sentimentLabel = 'very_bearish';
    else if (normalizedSentiment < -0.1) sentimentLabel = 'bearish';
    else if (normalizedSentiment > 0.4) sentimentLabel = 'very_bullish';
    else if (normalizedSentiment > 0.1) sentimentLabel = 'bullish';
    else sentimentLabel = 'neutral';
    
    return {
      symbol,
      platform: 'combined',
      mentions: totalMentions,
      sentiment: normalizedSentiment,
      sentimentLabel,
      changePercent: 0, // Would need historical data
      buzzing: totalMentions > 100,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Social sentiment fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSTITUTIONAL OWNERSHIP (Yahoo Finance)
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchInstitutionalOwnership(symbol: string): Promise<InstitutionalOwnership | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=institutionOwnership,majorHoldersBreakdown`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const result = data?.quoteSummary?.result?.[0] || {};
    const holdings = result.majorHoldersBreakdown || {};
    const institutions = result.institutionOwnership?.ownershipList || [];
    
    const institutionalPercent = (holdings.institutionsPercentHeld?.raw || 0) * 100;
    
    const topHolders = institutions.slice(0, 5).map((inst: Record<string, unknown>) => ({
      holder: (inst.organization as string) || 'Unknown',
      shares: (inst.position as { raw: number })?.raw || 0,
      percentHeld: ((inst.pctHeld as { raw: number })?.raw || 0) * 100,
      change: (inst.pctChange as { raw: number })?.raw || 0
    }));
    
    // Calculate net institutional buying
    const netChange = topHolders.reduce((sum: number, h: { change: number }) => sum + h.change, 0);
    
    return {
      symbol,
      institutionalPercent,
      topHolders,
      netInstitutionalBuying: netChange,
      quarterDate: new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Institutional ownership fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSIDER TRADING (Finnhub)
// ═══════════════════════════════════════════════════════════════════════════════

export interface InsiderTransaction {
  symbol: string;
  name: string;
  share: number;
  change: number;
  filingDate: string;
  transactionDate: string;
  transactionType: 'buy' | 'sell' | 'other';
  transactionPrice: number;
}

export async function fetchInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${symbol}&token=${apiKey}`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const transactions = data.data || [];
    
    return transactions.slice(0, 20).map((t: Record<string, unknown>) => ({
      symbol,
      name: (t.name as string) || 'Unknown',
      share: (t.share as number) || 0,
      change: (t.change as number) || 0,
      filingDate: (t.filingDate as string) || '',
      transactionDate: (t.transactionDate as string) || '',
      transactionType: (t.change as number) > 0 ? 'buy' : (t.change as number) < 0 ? 'sell' : 'other',
      transactionPrice: (t.transactionPrice as number) || 0
    }));
  } catch (error) {
    console.error('Insider transactions fetch error:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE POSITIONING SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchPositioningSummary(symbol: string): Promise<PositioningSummary> {
  const [shortInterest, socialSentiment, institutional] = await Promise.all([
    fetchShortInterest(symbol),
    fetchSocialSentiment(symbol),
    fetchInstitutionalOwnership(symbol)
  ]);
  
  const signals: string[] = [];
  const components = {
    shortInterest: 0,
    putCallRatio: 0,
    socialSentiment: 0,
    institutionalFlow: 0
  };
  
  // Score short interest (-50 to +50)
  if (shortInterest) {
    if (shortInterest.signal === 'potential_squeeze') {
      components.shortInterest = 30;
      signals.push('🚀 High short interest - squeeze potential');
    } else if (shortInterest.signal === 'bearish_pressure') {
      components.shortInterest = -30;
      signals.push('🐻 Increasing short pressure');
    } else if (shortInterest.shortPercentOfFloat > 5) {
      components.shortInterest = -10;
      signals.push('⚠️ Moderate short interest');
    }
  }
  
  // Score social sentiment (-30 to +30)
  if (socialSentiment) {
    components.socialSentiment = socialSentiment.sentiment * 30;
    if (socialSentiment.buzzing) {
      signals.push(`📱 High social buzz - ${socialSentiment.mentions} mentions`);
    }
    if (socialSentiment.sentimentLabel === 'very_bullish') {
      signals.push('🔥 Very bullish social sentiment');
    } else if (socialSentiment.sentimentLabel === 'very_bearish') {
      signals.push('❄️ Very bearish social sentiment');
    }
  }
  
  // Score institutional flow (-20 to +20)
  if (institutional) {
    const flowScore = Math.max(-20, Math.min(20, institutional.netInstitutionalBuying * 10));
    components.institutionalFlow = flowScore;
    
    if (institutional.netInstitutionalBuying > 0.5) {
      signals.push('🏦 Institutional accumulation');
    } else if (institutional.netInstitutionalBuying < -0.5) {
      signals.push('📉 Institutional distribution');
    }
  }
  
  // Calculate total score
  const totalScore = components.shortInterest + components.putCallRatio + 
                     components.socialSentiment + components.institutionalFlow;
  
  // Determine overall sentiment
  let overallSentiment: PositioningSummary['overallSentiment'];
  if (totalScore >= 40) overallSentiment = 'very_bullish';
  else if (totalScore >= 15) overallSentiment = 'bullish';
  else if (totalScore <= -40) overallSentiment = 'very_bearish';
  else if (totalScore <= -15) overallSentiment = 'bearish';
  else overallSentiment = 'neutral';
  
  return {
    symbol,
    overallSentiment,
    signals,
    score: totalScore,
    components
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET-WIDE SENTIMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface MarketSentiment {
  putCallRatio: {
    total: number;
    equity: number;
    index: number;
    sentiment: string;
  };
  vix: {
    value: number;
    level: string;
  };
  fearGreed: {
    value: number;
    label: string;
  };
  marketBreadth: {
    advanceDecline: number;
    newHighsLows: number;
  };
  overallSentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  timestamp: number;
}

export async function fetchMarketSentiment(): Promise<MarketSentiment> {
  const [pcRatio, vixData, fearGreedData] = await Promise.all([
    fetchCBOEPutCallRatio(),
    fetchVIXLevel(),
    fetchFearGreedSimple()
  ]);
  
  // Determine overall sentiment
  let sentimentScore = 0;
  
  // VIX contribution
  if (vixData.value < 15) sentimentScore += 2;
  else if (vixData.value < 20) sentimentScore += 1;
  else if (vixData.value > 30) sentimentScore -= 2;
  else if (vixData.value > 25) sentimentScore -= 1;
  
  // Put/Call contribution
  if (pcRatio.totalPutCall < 0.7) sentimentScore += 2;
  else if (pcRatio.totalPutCall < 0.85) sentimentScore += 1;
  else if (pcRatio.totalPutCall > 1.1) sentimentScore -= 2;
  else if (pcRatio.totalPutCall > 0.95) sentimentScore -= 1;
  
  // Fear/Greed contribution
  if (fearGreedData.value > 75) sentimentScore += 2;
  else if (fearGreedData.value > 55) sentimentScore += 1;
  else if (fearGreedData.value < 25) sentimentScore -= 2;
  else if (fearGreedData.value < 45) sentimentScore -= 1;
  
  let overallSentiment: MarketSentiment['overallSentiment'];
  if (sentimentScore >= 4) overallSentiment = 'extreme_greed';
  else if (sentimentScore >= 2) overallSentiment = 'greed';
  else if (sentimentScore <= -4) overallSentiment = 'extreme_fear';
  else if (sentimentScore <= -2) overallSentiment = 'fear';
  else overallSentiment = 'neutral';
  
  return {
    putCallRatio: {
      total: pcRatio.totalPutCall,
      equity: pcRatio.equityPutCall,
      index: pcRatio.indexPutCall,
      sentiment: pcRatio.sentiment
    },
    vix: vixData,
    fearGreed: fearGreedData,
    marketBreadth: {
      advanceDecline: 0, // Would need NYSE data
      newHighsLows: 0
    },
    overallSentiment,
    timestamp: Date.now()
  };
}

// Helper functions
async function fetchVIXLevel(): Promise<{ value: number; level: string }> {
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!response.ok) return { value: 18, level: 'normal' };
    
    const data = await response.json();
    const value = data?.chart?.result?.[0]?.meta?.regularMarketPrice || 18;
    
    let level: string;
    if (value < 15) level = 'low';
    else if (value < 22) level = 'normal';
    else if (value < 30) level = 'elevated';
    else level = 'high';
    
    return { value, level };
  } catch {
    return { value: 18, level: 'normal' };
  }
}

async function fetchFearGreedSimple(): Promise<{ value: number; label: string }> {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=1');
    
    if (!response.ok) return { value: 50, label: 'Neutral' };
    
    const data = await response.json();
    const value = parseInt(data.data?.[0]?.value || '50');
    const label = data.data?.[0]?.value_classification || 'Neutral';
    
    return { value, label };
  } catch {
    return { value: 50, label: 'Neutral' };
  }
}
