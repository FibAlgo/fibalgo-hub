import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { createNewsNotifications, createSignalNotifications } from '@/lib/notifications/newsNotifications';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Generate FibAlgo news ID from source ID (deterministic for deduplication)
function generateFaId(sourceId: string): string {
  const hash = crypto.createHash('sha256').update(sourceId).digest('hex');
  // Take first 8 chars of hash and convert to number
  const numPart = parseInt(hash.substring(0, 8), 16) % 100000000;
  return `fa-${numPart.toString().padStart(8, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MASSIVE.COM (BENZINGA) NEWS API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY;
const MASSIVE_NEWS_URL = 'https://api.massive.com/benzinga/v2/news';
// NOT: API Key format: ?apiKey=KEY (not ?token=)

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL ENGINE (Katman 3)
// Model trade sinyali üretmez, sinyal kurallarla oluşur
// ═══════════════════════════════════════════════════════════════════════════════

type TradeSignal = 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL' | 'NO_TRADE';

interface AnalysisWithSignal {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number;
  timeHorizon: 'short' | 'swing' | 'macro';
  riskMode: 'risk-on' | 'risk-off' | 'neutral';
  wouldTrade: boolean;
}

function generateSignal(analysis: AnalysisWithSignal): TradeSignal {
  if (!analysis.wouldTrade) return 'NO_TRADE';

  if (analysis.score >= 8 && analysis.sentiment === 'bullish') return 'STRONG_BUY';
  if (analysis.score >= 8 && analysis.sentiment === 'bearish') return 'STRONG_SELL';

  if (analysis.score >= 6 && analysis.sentiment === 'bullish') return 'BUY';
  if (analysis.score >= 6 && analysis.sentiment === 'bearish') return 'SELL';

  return 'NO_TRADE';
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK FILTERS (Katman 4 - Loss Prevention)
// ═══════════════════════════════════════════════════════════════════════════════

interface RiskFilterResult {
  blocked: boolean;
  reason?: string;
}

function applyRiskFilters(analysis: AnalysisWithSignal): RiskFilterResult {
  // Risk-off'ta sadece düşük scorelı short-term trade'leri blokla
  if (analysis.riskMode === 'risk-off' && analysis.timeHorizon === 'short' && analysis.score < 6) {
    return { blocked: true, reason: 'Risk-off environment blocks low-conviction short-term trades' };
  }

  if (analysis.timeHorizon === 'macro' && analysis.score < 7) {
    return { blocked: true, reason: 'Macro trades require score >= 7' };
  }

  return { blocked: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE CREDIBILITY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

interface SourceCredibility {
  tier: 1 | 2 | 3 | 4;
  score: number;
  label: string;
}

const SOURCE_CREDIBILITY_MAP: Record<string, SourceCredibility> = {
  // TIER 1: Elite Financial News (90-100)
  'bloomberg': { tier: 1, score: 98, label: 'Elite' },
  'reuters': { tier: 1, score: 97, label: 'Elite' },
  'wall street journal': { tier: 1, score: 96, label: 'Elite' },
  'wsj': { tier: 1, score: 96, label: 'Elite' },
  'financial times': { tier: 1, score: 95, label: 'Elite' },
  'ft': { tier: 1, score: 95, label: 'Elite' },
  'cnbc': { tier: 1, score: 92, label: 'Elite' },
  'barrons': { tier: 1, score: 91, label: 'Elite' },
  'the economist': { tier: 1, score: 90, label: 'Elite' },
  
  // TIER 2: Major Crypto/Finance News (75-89)
  'coindesk': { tier: 2, score: 88, label: 'Trusted' },
  'cointelegraph': { tier: 2, score: 85, label: 'Trusted' },
  'the block': { tier: 2, score: 87, label: 'Trusted' },
  'decrypt': { tier: 2, score: 82, label: 'Trusted' },
  'yahoo finance': { tier: 2, score: 80, label: 'Trusted' },
  'marketwatch': { tier: 2, score: 83, label: 'Trusted' },
  'benzinga': { tier: 2, score: 78, label: 'Trusted' },
  'investing.com': { tier: 2, score: 76, label: 'Trusted' },
  'seekingalpha': { tier: 2, score: 75, label: 'Trusted' },
  'forbes': { tier: 2, score: 79, label: 'Trusted' },
  'business insider': { tier: 2, score: 77, label: 'Trusted' },
  
  // TIER 3: Moderate Credibility (50-74)
  'cryptonews': { tier: 3, score: 65, label: 'Moderate' },
  'newsbtc': { tier: 3, score: 60, label: 'Moderate' },
  'ambcrypto': { tier: 3, score: 58, label: 'Moderate' },
  'bitcoinist': { tier: 3, score: 57, label: 'Moderate' },
  'beincrypto': { tier: 3, score: 60, label: 'Moderate' },
  'cryptopotato': { tier: 3, score: 55, label: 'Moderate' },
  
  // TIER 4: Low Credibility (0-49)
  'cryptoglobe': { tier: 4, score: 40, label: 'Unverified' },
  'cryptobriefing': { tier: 4, score: 45, label: 'Unverified' },
  'cryptodaily': { tier: 4, score: 32, label: 'Unverified' },
};

function getSourceCredibility(source: string): SourceCredibility {
  const normalized = source.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(SOURCE_CREDIBILITY_MAP)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  return { tier: 3, score: 50, label: 'Unknown' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function createNewsId(title: string, source: string): string {
  return crypto.createHash('md5').update(`${title}-${source}`).digest('hex');
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function clampScore(score: number | undefined, fallback: number): number {
  if (typeof score !== 'number' || isNaN(score)) return fallback;
  return Math.min(10, Math.max(0, Math.round(score)));
}

function mapSentiment(s: string | undefined): 'bullish' | 'bearish' | 'neutral' {
  if (!s) return 'neutral';
  const lower = s.toLowerCase();
  if (lower.includes('bullish') || lower.includes('positive')) return 'bullish';
  if (lower.includes('bearish') || lower.includes('negative')) return 'bearish';
  return 'neutral';
}

function mapTimeHorizon(th: string | undefined): 'short' | 'swing' | 'macro' {
  if (!th) return 'short';
  const lower = th.toLowerCase();
  if (lower.includes('macro') || lower.includes('long')) return 'macro';
  if (lower.includes('swing') || lower.includes('medium')) return 'swing';
  return 'short';
}

function buildTradingPairs(assets: string[]): string[] {
  if (!assets || assets.length === 0) return [];
  
  const cryptoSymbols = new Set([
    'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA', 'AVAX', 'LINK', 'MATIC',
    'DOT', 'UNI', 'SHIB', 'LTC', 'ATOM', 'XLM', 'NEAR', 'APT', 'ARB', 'OP'
  ]);

  return assets.map(asset => {
    const upper = asset.toUpperCase();
    if (cryptoSymbols.has(upper)) {
      return `${upper}/USDT`;
    }
    return upper;
  });
}

function isBreakingNews(score: number, credibility: SourceCredibility, publishedOn: number): boolean {
  const ageMinutes = (Date.now() - publishedOn * 1000) / (1000 * 60);
  return score >= 8 && credibility.tier <= 2 && ageMinutes < 60;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MASSIVE.COM (BENZINGA) NEWS API INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

interface BenzingaNewsItem {
  benzinga_id: number;
  author: string;
  published: string;
  last_updated: string;
  title: string;
  teaser?: string;
  body?: string;
  url: string;
  images?: string;
  channels?: string; // Space-separated string: "news price target analyst ratings"
  tickers?: string;  // Space-separated string: "AAPL MSFT" or "X:BTCUSD X:ETHUSD"
  tags?: string;
}

interface NewsItem {
  id: string; // Benzinga ID or generated hash
  title: string;
  url: string;
  source: string;
  published_on: number; // Unix timestamp
  content?: string;
  category?: string;
  tickers?: string[];
}

/**
 * Fetch news from Massive.com Benzinga API
 * Real-time financial news with AI rewriting for original content
 * Fetches stocks, cryptocurrency, forex, commodities, and earnings news
 */
async function fetchPremiumNews(): Promise<NewsItem[]> {
  if (!MASSIVE_API_KEY) {
    console.warn('⚠️ MASSIVE_API_KEY not configured. Add it to .env.local');
    return [];
  }

  try {
    // Fetch all news without any channel filter - get everything
    const response = await fetch(`${MASSIVE_NEWS_URL}?limit=50&sort=published.desc&apiKey=${MASSIVE_API_KEY}`, { cache: 'no-store' });

    const allArticles: BenzingaNewsItem[] = [];
    
    if (response.ok) {
      const data = await response.json();
      if (data.results) {
        allArticles.push(...data.results);
        console.log(`📰 Fetched ${data.results.length} articles (no filter)`);
      }
    }
    
    if (allArticles.length === 0) {
      console.warn('No news results from Benzinga API');
      return [];
    }
    
    console.log(`📰 Total fetched: ${allArticles.length} articles`);
    
    // De-duplicate by benzinga_id
    const uniqueArticles = Array.from(
      new Map(allArticles.map(a => [a.benzinga_id, a])).values()
    );
    
    console.log(`📰 After dedup: ${uniqueArticles.length} unique articles`);

    // Transform Benzinga format to our NewsItem format
    return uniqueArticles.map((article: BenzingaNewsItem) => {
      // Clean HTML from body
      const cleanBody = article.body?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
      const teaser = article.teaser?.replace(/&#\d+;/g, '').trim() || '';
      
      // Determine category from channels
      const channels = typeof article.channels === 'string' 
        ? article.channels.toLowerCase() 
        : (article.channels || []).join(' ').toLowerCase();
      let category = 'stocks';
      if (channels.includes('crypto') || channels.includes('bitcoin')) category = 'crypto';
      else if (channels.includes('forex') || channels.includes('currency')) category = 'forex';
      else if (channels.includes('commodity') || channels.includes('oil') || channels.includes('gold')) category = 'commodities';
      else if (channels.includes('earnings')) category = 'earnings';
      else if (channels.includes('economy') || channels.includes('fed') || channels.includes('macro')) category = 'macro';
      
      // Parse tickers - can be string or array
      const tickers = typeof article.tickers === 'string' 
        ? article.tickers.split(' ').filter(Boolean)
        : (article.tickers || []);

      return {
        id: `bz-${article.benzinga_id}`, // Unique Benzinga ID
        title: article.title,
        url: article.url,
        source: 'FibAlgo',
        published_on: Math.floor(new Date(article.published).getTime() / 1000),
        content: teaser ? `${teaser} ${cleanBody.substring(0, 1200)}` : cleanBody.substring(0, 1500),
        category,
        tickers
      };
    });

  } catch (error) {
    console.error('Error fetching Benzinga news:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CRON HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  // 🔒 SECURITY: Verify cron secret in production (required)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron] Unauthorized access attempt to analyze-news');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Fetch news from premium API
    const allNewsItems = await fetchPremiumNews();

    if (allNewsItems.length === 0) {
      return NextResponse.json({ 
        message: '⚠️ No news found. Configure MASSIVE_API_KEY in .env.local'
      });
    }

    // 2. Deduplicate within the batch using item.id (Benzinga ID)
    const seenIds = new Set<string>();
    const uniqueNewsItems = allNewsItems.filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });

    // 3. Check which news are already analyzed in DB
    const newsIds = uniqueNewsItems.map((item) => generateFaId(item.id));

    const { data: existingNews } = await supabase
      .from('news_analyses')
      .select('news_id')
      .in('news_id', newsIds);

    const existingIds = new Set(existingNews?.map(n => n.news_id) || []);
    
    // Filter out already analyzed news
    const newItems = uniqueNewsItems.filter((item) => 
      !existingIds.has(generateFaId(item.id))
    );

    if (newItems.length === 0) {
      return NextResponse.json({ 
        message: 'All news already analyzed',
        existing: existingIds.size 
      });
    }

    // 3. If no OpenAI key, save news with basic info (no AI analysis)
    if (!OPENAI_API_KEY) {
      console.log('No OpenAI key - saving news without AI analysis');
      
      const basicAnalyses = newItems.map((item) => {
        const publishedAt = new Date(item.published_on * 1000);
        const sourceCredibility = getSourceCredibility(item.source);
        
        return {
          news_id: generateFaId(item.id),
          title: item.title,
          source: item.source,
          url: item.url,
          published_at: publishedAt.toISOString(),
          category: item.category || 'general',
          sentiment: 'neutral',
          score: 5,
          summary: item.title,
          impact: 'Analysis pending - AI service not configured',
          risk: null,
          trading_pairs: [],
          source_credibility_tier: sourceCredibility.tier,
          source_credibility_score: sourceCredibility.score,
          source_credibility_label: sourceCredibility.label,
          is_breaking: false,
        };
      });

      const { error: insertError } = await supabase
        .from('news_analyses')
        .upsert(basicAnalyses, { onConflict: 'news_id' });

      if (insertError) {
        console.error('Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save news' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'News saved without AI analysis',
        saved: basicAnalyses.length 
      });
    }

    // 4. Analyze with OpenAI
    const analysisBatches = chunkArray(newItems, 2);
    const analyses: Array<{
      newsItem: { title: string; content?: string; source?: string };
      analysis: any;
      validationErrors: Array<{ rule: string; message: string; severity: 'warning' | 'error' }>;
      extractedAssets: string[];
      tradingViewTickers: Record<string, string | null>;
    }> = [];

    for (const batch of analysisBatches) {
      const payload = batch.map((item) => ({
        title: 'Financial News', // Generic - AI must create unique headline
        content: item.tickers?.length 
          ? `[Related Tickers: ${item.tickers.join(', ')}] ${item.content || 'No additional details.'}`
          : (item.content || 'No additional details.'),
        source: item.source
      }));

      try {
        const { analyzeNewsBatch } = await import('@/lib/ai/news-analysis');
        
        if (analyses.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        const data = await analyzeNewsBatch(payload);
        
        if (data?.analyses?.length) {
          analyses.push(...data.analyses);
        }
      } catch (error) {
        console.error('Structured analysis error:', error);
      }
    }

    // 5. Save to database
    const recordsToInsert = newItems.map((item, idx) => {
      const result = analyses[idx];
      if (!result) return null;

      const analysis = result?.analysis;
      const relatedAssets = analysis?.meta?.relatedAssets?.length
        ? analysis.meta.relatedAssets
        : (result?.extractedAssets || []);
      
      // TradingView formatında ticker'ları al
      const tvTickers = result?.tradingViewTickers || {};
      const tradingPairs = relatedAssets
        .map((asset: string) => tvTickers[asset] || buildTradingPairs([asset])[0])
        .filter(Boolean);
      
      const credibility = getSourceCredibility(item.source);
      const newsScore = clampScore(analysis?.analysis?.conviction, 5);
      const breaking = Boolean(analysis?.breakingNews?.isBreaking) || isBreakingNews(newsScore, credibility, item.published_on);
      
      const analysisForSignal: AnalysisWithSignal = {
        sentiment: mapSentiment(analysis?.analysis?.sentiment),
        score: newsScore,
        timeHorizon: mapTimeHorizon(analysis?.analysis?.timeHorizon),
        riskMode: analysis?.marketContextFit?.currentRegime || 'neutral',
        wouldTrade: Boolean(analysis?.trade?.wouldTrade),
      };
      
      const rawSignal = generateSignal(analysisForSignal);
      const riskFilter = applyRiskFilters(analysisForSignal);
      const finalSignal = riskFilter.blocked ? 'NO_TRADE' : rawSignal;
      const signalBlockedByAssets = tradingPairs.length === 0 && rawSignal !== 'NO_TRADE';
      
      return {
        news_id: generateFaId(item.id),
        title: analysis?.analysis?.headline || item.title,
        source: item.source,
        url: item.url,
        published_at: new Date(item.published_on * 1000).toISOString(),
        category: analysis?.meta?.category || item.category || 'general',
        sentiment: mapSentiment(analysis?.analysis?.sentiment),
        score: newsScore,
        summary: analysis?.analysis?.thesis || '',
        impact: analysis?.analysis?.secondOrderEffects || 'No clear price target',
        risk: analysis?.analysis?.keyRisk || '',
        trading_pairs: tradingPairs,
        ai_analysis: analysis || null,
        source_credibility_tier: credibility.tier,
        source_credibility_score: credibility.score,
        source_credibility_label: credibility.label,
        is_breaking: breaking,
        time_horizon: mapTimeHorizon(analysis?.analysis?.timeHorizon),
        risk_mode: analysis?.marketContextFit?.currentRegime || 'neutral',
        would_trade: Boolean(analysis?.trade?.wouldTrade),
        signal: signalBlockedByAssets ? 'NO_TRADE' : finalSignal,
        signal_blocked: riskFilter.blocked || signalBlockedByAssets,
        block_reason: signalBlockedByAssets 
          ? 'No clear asset exposure identified' 
          : (riskFilter.reason || null),
      };
    }).filter(Boolean);

    // De-duplicate records by news_id before insert
    const uniqueRecords = new Map<string, any>();
    for (const record of recordsToInsert) {
      if (record && !uniqueRecords.has(record.news_id)) {
        uniqueRecords.set(record.news_id, record);
      }
    }
    const finalRecords = Array.from(uniqueRecords.values());

    // Insert records one by one to handle duplicates gracefully
    let insertedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const record of finalRecords) {
      // First check if this news already exists (to avoid sending duplicate notifications)
      const { data: existingRecord } = await supabase
        .from('news_analyses')
        .select('news_id')
        .eq('news_id', record.news_id)
        .single();
      
      if (existingRecord) {
        // Already exists, skip notification
        skippedCount++;
        continue;
      }
      
      const { error: insertError } = await supabase
        .from('news_analyses')
        .insert(record);
      
      if (insertError) {
        // Could be a race condition duplicate, log and skip
        if (insertError.code === '23505') { // unique_violation
          skippedCount++;
          continue;
        }
        console.error('Insert error for', record.news_id, ':', insertError.message);
        errorCount++;
      } else {
        insertedCount++;
        
        // Send notifications for new news (let user preferences decide filtering)
        try {
          await createNewsNotifications({
            id: record.news_id,
            title: record.title,
            category: record.category,
            is_breaking: record.is_breaking,
            impact: record.score >= 8 ? 'high' : record.score >= 6 ? 'medium' : 'low',
            sentiment: record.sentiment,
            trading_pairs: record.trading_pairs,
            signal: record.signal
          });
          
          if (record.signal && record.signal !== 'NO_TRADE' && record.trading_pairs?.length > 0) {
            await createSignalNotifications(
              record.news_id,
              record.signal,
              record.trading_pairs[0],
              record.summary || record.title
            );
          }
        } catch (notifError) {
          console.error('Notification error:', notifError);
        }
      }
    }

    // 6. Cleanup old news
    const MAX_NEWS_COUNT = 10000;
    
    const { data: cutoffRecord } = await supabase
      .from('news_analyses')
      .select('id, analyzed_at')
      .order('analyzed_at', { ascending: false })
      .range(MAX_NEWS_COUNT - 1, MAX_NEWS_COUNT - 1)
      .single();
    
    if (cutoffRecord) {
      await supabase
        .from('news_analyses')
        .delete()
        .lt('analyzed_at', cutoffRecord.analyzed_at);
    }

    return NextResponse.json({
      success: true,
      analyzed: recordsToInsert.length,
      inserted: insertedCount,
      skipped_duplicates: skippedCount,
      errors: errorCount,
      total: allNewsItems.length,
      filtered_existing: existingIds.size
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
