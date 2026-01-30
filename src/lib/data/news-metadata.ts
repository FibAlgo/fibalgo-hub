/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📰 NEWS METADATA & CONTEXT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * News metadata for AI analysis:
 * - Source reliability scoring
 * - News categorization
 * - Related news fetching
 * - Keyword extraction
 * - News impact estimation
 * 
 * Sources: Finnhub, FMP API
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface NewsSource {
  name: string;
  reliability: number; // 1-10
  tier: 'tier1' | 'tier2' | 'tier3';
  bias: 'bullish' | 'bearish' | 'neutral';
  speed: 'fast' | 'medium' | 'slow';
  specialty: string[];
}

export interface NewsMetadata {
  id: string;
  headline: string;
  summary: string;
  source: string;
  sourceReliability: number;
  sourceTier: 'tier1' | 'tier2' | 'tier3';
  category: 'earnings' | 'macro' | 'geopolitical' | 'sector' | 'company' | 'technical' | 'other';
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 to 1
  impact: 'high' | 'medium' | 'low';
  symbols: string[];
  keywords: string[];
  publishedAt: string;
  url: string;
}

export interface NewsContext {
  news: NewsMetadata;
  relatedNews: NewsMetadata[];
  historicalContext: string[];
  marketReaction: {
    symbol: string;
    priceChange: number;
    volumeChange: number;
  }[];
}

export interface NewsSummary {
  totalNews: number;
  byCategory: Record<string, number>;
  bySentiment: Record<string, number>;
  topKeywords: Array<{ word: string; count: number }>;
  majorEvents: NewsMetadata[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE RELIABILITY DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

export const NEWS_SOURCES: Record<string, NewsSource> = {
  // Tier 1 - Primary Sources
  'Reuters': { name: 'Reuters', reliability: 10, tier: 'tier1', bias: 'neutral', speed: 'fast', specialty: ['macro', 'geopolitical'] },
  'Bloomberg': { name: 'Bloomberg', reliability: 10, tier: 'tier1', bias: 'neutral', speed: 'fast', specialty: ['markets', 'macro'] },
  'Financial Times': { name: 'Financial Times', reliability: 9, tier: 'tier1', bias: 'neutral', speed: 'medium', specialty: ['analysis', 'macro'] },
  'Wall Street Journal': { name: 'Wall Street Journal', reliability: 9, tier: 'tier1', bias: 'neutral', speed: 'medium', specialty: ['company', 'markets'] },
  'CNBC': { name: 'CNBC', reliability: 8, tier: 'tier1', bias: 'bullish', speed: 'fast', specialty: ['markets', 'company'] },
  
  // Tier 2 - Secondary Sources
  'MarketWatch': { name: 'MarketWatch', reliability: 7, tier: 'tier2', bias: 'neutral', speed: 'fast', specialty: ['markets'] },
  'Barrons': { name: 'Barrons', reliability: 8, tier: 'tier2', bias: 'neutral', speed: 'slow', specialty: ['analysis'] },
  'Seeking Alpha': { name: 'Seeking Alpha', reliability: 6, tier: 'tier2', bias: 'neutral', speed: 'medium', specialty: ['analysis', 'company'] },
  'Yahoo Finance': { name: 'Yahoo Finance', reliability: 6, tier: 'tier2', bias: 'neutral', speed: 'fast', specialty: ['markets'] },
  'Investor Business Daily': { name: 'Investor Business Daily', reliability: 7, tier: 'tier2', bias: 'bullish', speed: 'medium', specialty: ['technical', 'growth'] },
  'The Motley Fool': { name: 'The Motley Fool', reliability: 5, tier: 'tier2', bias: 'bullish', speed: 'slow', specialty: ['investing'] },
  
  // Tier 3 - Tertiary Sources
  'ZeroHedge': { name: 'ZeroHedge', reliability: 4, tier: 'tier3', bias: 'bearish', speed: 'fast', specialty: ['macro', 'conspiracy'] },
  'InvestorPlace': { name: 'InvestorPlace', reliability: 4, tier: 'tier3', bias: 'neutral', speed: 'fast', specialty: ['speculative'] },
  'Tipranks': { name: 'Tipranks', reliability: 5, tier: 'tier3', bias: 'neutral', speed: 'medium', specialty: ['analyst ratings'] },
  
  // Default for unknown sources
  'Unknown': { name: 'Unknown', reliability: 3, tier: 'tier3', bias: 'neutral', speed: 'medium', specialty: [] }
};

export function getSourceReliability(sourceName: string): NewsSource {
  // Try exact match first
  if (NEWS_SOURCES[sourceName]) {
    return NEWS_SOURCES[sourceName];
  }
  
  // Try partial match
  const lowerSource = sourceName.toLowerCase();
  for (const [key, value] of Object.entries(NEWS_SOURCES)) {
    if (lowerSource.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerSource)) {
      return value;
    }
  }
  
  return NEWS_SOURCES['Unknown'];
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEWS CATEGORIZATION
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_KEYWORDS: Record<NewsMetadata['category'], string[]> = {
  earnings: ['earnings', 'eps', 'revenue', 'guidance', 'quarter', 'fiscal', 'beat', 'miss', 'profit', 'loss', 'results'],
  macro: ['fed', 'interest rate', 'inflation', 'cpi', 'gdp', 'unemployment', 'fomc', 'powell', 'recession', 'economy', 'treasury', 'yield'],
  geopolitical: ['war', 'china', 'russia', 'ukraine', 'sanctions', 'tariff', 'trade war', 'opec', 'geopolitical', 'election', 'congress'],
  sector: ['sector', 'industry', 'semiconductor', 'banking', 'energy', 'healthcare', 'tech', 'retail', 'automotive'],
  company: ['ceo', 'layoff', 'merger', 'acquisition', 'buyback', 'dividend', 'ipo', 'spinoff', 'restructuring', 'lawsuit'],
  technical: ['support', 'resistance', 'breakout', 'technical', 'chart', 'moving average', 'rsi', 'macd'],
  other: []
};

export function categorizeNews(headline: string, summary: string): NewsMetadata['category'] {
  const text = `${headline} ${summary}`.toLowerCase();
  
  let maxMatches = 0;
  let category: NewsMetadata['category'] = 'other';
  
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'other') continue;
    
    const matches = keywords.filter(kw => text.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      category = cat as NewsMetadata['category'];
    }
  }
  
  return category;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENTIMENT ANALYSIS (Basic)
// ═══════════════════════════════════════════════════════════════════════════════

const POSITIVE_WORDS = [
  'surge', 'soar', 'jump', 'rally', 'beat', 'exceed', 'upgrade', 'bullish', 
  'growth', 'profit', 'gain', 'strong', 'outperform', 'success', 'record',
  'breakthrough', 'approve', 'positive', 'optimistic', 'boost'
];

const NEGATIVE_WORDS = [
  'crash', 'plunge', 'drop', 'fall', 'miss', 'cut', 'downgrade', 'bearish',
  'decline', 'loss', 'weak', 'underperform', 'fail', 'concern', 'warning',
  'risk', 'lawsuit', 'negative', 'pessimistic', 'layoff', 'recession'
];

export function analyzeSentiment(text: string): { sentiment: NewsMetadata['sentiment']; score: number } {
  const lowerText = text.toLowerCase();
  
  const positiveCount = POSITIVE_WORDS.filter(w => lowerText.includes(w)).length;
  const negativeCount = NEGATIVE_WORDS.filter(w => lowerText.includes(w)).length;
  
  const score = (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount);
  
  let sentiment: NewsMetadata['sentiment'];
  if (score > 0.2) sentiment = 'positive';
  else if (score < -0.2) sentiment = 'negative';
  else sentiment = 'neutral';
  
  return { sentiment, score };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPACT ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════════

export function estimateImpact(
  category: NewsMetadata['category'],
  sourceReliability: number,
  sentimentScore: number
): NewsMetadata['impact'] {
  // High impact categories
  const highImpactCategories: NewsMetadata['category'][] = ['macro', 'geopolitical', 'earnings'];
  
  // Calculate impact score
  let impactScore = 0;
  
  // Category weight
  if (highImpactCategories.includes(category)) impactScore += 3;
  else if (category === 'company') impactScore += 2;
  else impactScore += 1;
  
  // Source weight
  if (sourceReliability >= 8) impactScore += 3;
  else if (sourceReliability >= 6) impactScore += 2;
  else impactScore += 1;
  
  // Sentiment extremity
  impactScore += Math.abs(sentimentScore) * 2;
  
  // Determine impact level
  if (impactScore >= 7) return 'high';
  if (impactScore >= 4) return 'medium';
  return 'low';
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'this', 'that',
  'these', 'those', 'it', 'its', 'as', 'says', 'said', 'new', 'stock', 'shares'
]);

export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  // Tokenize and clean
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
  
  // Count frequencies
  const freq: Record<string, number> = {};
  words.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });
  
  // Sort by frequency
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOL EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

const MAJOR_SYMBOLS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD', 'INTC',
  'NFLX', 'DIS', 'PYPL', 'SQ', 'SHOP', 'COIN', 'UBER', 'LYFT', 'ABNB', 'RBLX',
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SCHW', 'USB', 'PNC',
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'OXY', 'BP', 'SHEL', 'TTE', 'ENB',
  'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'DHR', 'ABT', 'BMY',
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VXX', 'TLT', 'GLD', 'SLV',
  'BTC', 'ETH', 'BTCUSD', 'ETHUSD', 'XRP', 'SOL', 'DOGE', 'ADA', 'DOT'
]);

export function extractSymbols(text: string): string[] {
  const symbols: string[] = [];
  
  // Match uppercase words 2-5 chars (potential tickers)
  const potentialTickers = text.match(/\b[A-Z]{2,5}\b/g) || [];
  
  for (const ticker of potentialTickers) {
    if (MAJOR_SYMBOLS.has(ticker)) {
      symbols.push(ticker);
    }
  }
  
  // Also check for explicit mentions like "Apple (AAPL)"
  const explicitMatches = text.match(/\(([A-Z]{2,5})\)/g) || [];
  for (const match of explicitMatches) {
    const ticker = match.replace(/[()]/g, '');
    if (!symbols.includes(ticker)) {
      symbols.push(ticker);
    }
  }
  
  return [...new Set(symbols)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS RAW NEWS INTO METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export function processNewsToMetadata(rawNews: {
  id?: string;
  headline: string;
  summary?: string;
  source: string;
  datetime?: number | string;
  url?: string;
  related?: string[];
}): NewsMetadata {
  const headline = rawNews.headline || '';
  const summary = rawNews.summary || '';
  const fullText = `${headline} ${summary}`;
  
  const source = getSourceReliability(rawNews.source);
  const category = categorizeNews(headline, summary);
  const { sentiment, score: sentimentScore } = analyzeSentiment(fullText);
  const impact = estimateImpact(category, source.reliability, sentimentScore);
  const keywords = extractKeywords(fullText);
  const symbols = rawNews.related || extractSymbols(fullText);
  
  return {
    id: rawNews.id || `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    headline,
    summary,
    source: rawNews.source,
    sourceReliability: source.reliability,
    sourceTier: source.tier,
    category,
    sentiment,
    sentimentScore,
    impact,
    symbols,
    keywords,
    publishedAt: typeof rawNews.datetime === 'number' 
      ? new Date(rawNews.datetime * 1000).toISOString()
      : rawNews.datetime || new Date().toISOString(),
    url: rawNews.url || ''
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH NEWS FROM FINNHUB
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchFinnhubNews(
  symbol?: string,
  category: 'general' | 'forex' | 'crypto' | 'merger' = 'general',
  limit: number = 50
): Promise<NewsMetadata[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  
  try {
    let url: string;
    
    if (symbol) {
      // Company-specific news
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = new Date().toISOString().split('T')[0];
      url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${apiKey}`;
    } else {
      // General market news
      url = `https://finnhub.io/api/v1/news?category=${category}&token=${apiKey}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (!Array.isArray(data)) return [];
    
    return data.slice(0, limit).map((item: Record<string, unknown>) => 
      processNewsToMetadata({
        id: String(item.id || ''),
        headline: (item.headline as string) || '',
        summary: (item.summary as string) || '',
        source: (item.source as string) || '',
        datetime: item.datetime as number,
        url: (item.url as string) || '',
        related: (item.related as string)?.split(',').filter(Boolean) || []
      })
    );
  } catch (error) {
    console.error('Finnhub news fetch error:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEWS SUMMARY GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export function generateNewsSummary(newsItems: NewsMetadata[]): NewsSummary {
  const byCategory: Record<string, number> = {};
  const bySentiment: Record<string, number> = {};
  const keywordCounts: Record<string, number> = {};
  const majorEvents: NewsMetadata[] = [];
  
  for (const news of newsItems) {
    // Count categories
    byCategory[news.category] = (byCategory[news.category] || 0) + 1;
    
    // Count sentiment
    bySentiment[news.sentiment] = (bySentiment[news.sentiment] || 0) + 1;
    
    // Count keywords
    for (const keyword of news.keywords) {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    }
    
    // Track major events
    if (news.impact === 'high' && news.sourceTier === 'tier1') {
      majorEvents.push(news);
    }
  }
  
  // Get top keywords
  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
  
  return {
    totalNews: newsItems.length,
    byCategory,
    bySentiment,
    topKeywords,
    majorEvents: majorEvents.slice(0, 5)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATED NEWS FINDER
// ═══════════════════════════════════════════════════════════════════════════════

export function findRelatedNews(
  targetNews: NewsMetadata,
  allNews: NewsMetadata[],
  maxResults: number = 5
): NewsMetadata[] {
  const targetKeywords = new Set(targetNews.keywords);
  const targetSymbols = new Set(targetNews.symbols);
  
  const scored = allNews
    .filter(n => n.id !== targetNews.id)
    .map(news => {
      let score = 0;
      
      // Keyword overlap
      const keywordOverlap = news.keywords.filter(k => targetKeywords.has(k)).length;
      score += keywordOverlap * 2;
      
      // Symbol overlap
      const symbolOverlap = news.symbols.filter(s => targetSymbols.has(s)).length;
      score += symbolOverlap * 5;
      
      // Same category
      if (news.category === targetNews.category) score += 3;
      
      // Recency bonus
      const hoursDiff = Math.abs(
        new Date(news.publishedAt).getTime() - new Date(targetNews.publishedAt).getTime()
      ) / (1000 * 60 * 60);
      if (hoursDiff < 24) score += 2;
      
      return { news, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
  
  return scored.map(item => item.news);
}
