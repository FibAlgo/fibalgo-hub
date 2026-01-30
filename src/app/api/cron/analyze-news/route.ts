import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { createNewsNotifications, createSignalNotifications } from '@/lib/notifications/newsNotifications';
import { analyzeNewsWithPerplexity, type AnalysisResult } from '@/lib/ai/perplexity-news-analyzer';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// FMP (Financial Modeling Prep) API
const FMP_API_KEY = process.env.FMP_API_KEY || 'mYPnFxJ5sBZfuurNLmdSkJLCGVbyFQte';
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable/news';

function generateFaId(sourceId: string): string {
  const hash = crypto.createHash('sha256').update(sourceId).digest('hex');
  const numPart = parseInt(hash.substring(0, 8), 16) % 100000000;
  return `fa-${numPart.toString().padStart(8, '0')}`;
}

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

interface RiskFilterResult { blocked: boolean; reason?: string; }

function applyRiskFilters(analysis: AnalysisWithSignal): RiskFilterResult {
  if (analysis.riskMode === 'risk-off' && analysis.timeHorizon === 'short' && analysis.score < 6) {
    return { blocked: true, reason: 'Risk-off blocks low-conviction short trades' };
  }
  if (analysis.timeHorizon === 'macro' && analysis.score < 7) {
    return { blocked: true, reason: 'Macro trades require score >= 7' };
  }
  return { blocked: false };
}

interface SourceCredibility { tier: 1 | 2 | 3 | 4; score: number; label: string; }

const SOURCE_CREDIBILITY_MAP: Record<string, SourceCredibility> = {
  'bloomberg': { tier: 1, score: 98, label: 'Elite' },
  'reuters': { tier: 1, score: 97, label: 'Elite' },
  'wsj': { tier: 1, score: 96, label: 'Elite' },
  'cnbc': { tier: 1, score: 92, label: 'Elite' },
  'fxstreet': { tier: 2, score: 80, label: 'Trusted' },
  'fxempire': { tier: 2, score: 78, label: 'Trusted' },
  'coindesk': { tier: 2, score: 88, label: 'Trusted' },
  'investing.com': { tier: 2, score: 76, label: 'Trusted' },
};

function getSourceCredibility(source: string): SourceCredibility {
  const normalized = source.toLowerCase().trim();
  for (const [key, value] of Object.entries(SOURCE_CREDIBILITY_MAP)) {
    if (normalized.includes(key)) return value;
  }
  return { tier: 3, score: 50, label: 'Unknown' };
}

function clampScore(score: number | undefined, fallback: number): number {
  if (typeof score !== 'number' || isNaN(score)) return fallback;
  return Math.min(10, Math.max(0, Math.round(score)));
}

function buildTradingPairs(assets: string[]): string[] {
  if (!assets || assets.length === 0) return [];
  const cryptoSymbols = new Set(['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA', 'AVAX', 'LINK']);
  return assets.map(asset => {
    const upper = asset.toUpperCase();
    if (cryptoSymbols.has(upper)) return upper + '/USDT';
    return upper;
  });
}

function isBreakingNews(score: number, credibility: SourceCredibility, publishedOn: number): boolean {
  const ageMinutes = (Date.now() - publishedOn * 1000) / (1000 * 60);
  return score >= 8 && credibility.tier <= 2 && ageMinutes < 60;
}

async function fetchCurrentPrice(asset: string): Promise<number> {
  const upperAsset = asset.toUpperCase().replace('/', '');
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE'];
  const isCrypto = cryptoSymbols.some(c => upperAsset.includes(c));
  if (isCrypto) {
    try {
      const symbol = upperAsset.replace('USDT', '').replace('USD', '');
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
      if (response.ok) {
        const data = await response.json();
        return parseFloat(data.price) || 0;
      }
    } catch (e) { console.error('Binance error:', e); }
  }
  return 0;
}
interface FMPNewsItem {
  symbol: string;
  publishedDate: string;
  publisher: string;
  title: string;
  text: string;
  url: string;
  site: string;
}

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  published_on: number;
  content: string;
  category: string;
  tickers: string[];
}

async function fetchPremiumNews(): Promise<NewsItem[]> {
  if (!FMP_API_KEY) {
    console.warn('FMP_API_KEY not configured');
    return [];
  }

  try {
    const allArticles: FMPNewsItem[] = [];
    const endpoints = [
      { url: `${FMP_BASE_URL}/forex?limit=25&apikey=${FMP_API_KEY}`, category: 'forex' },
      { url: `${FMP_BASE_URL}/crypto?limit=25&apikey=${FMP_API_KEY}`, category: 'crypto' },
      { url: `${FMP_BASE_URL}/stock?limit=25&apikey=${FMP_API_KEY}`, category: 'stocks' },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const articlesWithCategory = data.map((item: FMPNewsItem) => ({
              ...item,
              _category: endpoint.category
            }));
            allArticles.push(...articlesWithCategory);
            console.log(`FMP ${endpoint.category}: ${data.length} articles`);
          }
        }
      } catch (e) {
        console.error(`FMP ${endpoint.category} error:`, e);
      }
    }

    if (allArticles.length === 0) return [];
    console.log(`FMP Total: ${allArticles.length}`);

    const uniqueArticles = Array.from(new Map(allArticles.map(a => [a.url, a])).values());
    console.log(`After dedup: ${uniqueArticles.length}`);

    const oneHourAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 saat - test icin
    const recentArticles = uniqueArticles.filter((article: any) => {
      const publishedTime = new Date(article.publishedDate).getTime();
      return publishedTime >= oneHourAgo;
    });
    console.log(`After 1h filter: ${recentArticles.length}`);

    return recentArticles.map((article: any) => {
      const contentForAI = article.text?.trim() || article.title;
      const tickers: string[] = article.symbol ? [article.symbol.toUpperCase()] : [];
      const category = article._category || 'general';
      const urlHash = crypto.createHash('md5').update(article.url).digest('hex').substring(0, 12);

      return {
        id: `fmp-${urlHash}`,
        title: article.title,
        url: article.url,
        source: article.publisher || article.site || 'FMP News',
        published_on: Math.floor(new Date(article.publishedDate).getTime() / 1000),
        content: contentForAI,
        category,
        tickers
      };
    });
  } catch (error) {
    console.error('FMP fetch error:', error);
    return [];
  }
}
async function isNewsApiEnabled(): Promise<boolean> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from('cache_metadata')
      .select('hit_count')
      .eq('cache_key', 'app_settings')
      .single();
    if (error || !data) return false;
    return data.hit_count === 1;
  } catch (error) {
    console.error('[Cron] check news API setting failed:', error);
    return false;
  }
}

export async function GET(request: Request) {
  const newsApiEnabled = await isNewsApiEnabled();
  if (!newsApiEnabled) {
    console.log('[Cron] News API DISABLED');
    return NextResponse.json({ success: false, message: 'News API disabled', disabled: true });
  }

  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const allNewsItems = await fetchPremiumNews();
    if (allNewsItems.length === 0) {
      return NextResponse.json({ message: 'No news found from FMP API' });
    }

    const seenIds = new Set<string>();
    const uniqueNewsItems = allNewsItems.filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });

    const newsIds = uniqueNewsItems.map((item) => generateFaId(item.id));
    const { data: existingNews } = await supabase
      .from('news_analyses')
      .select('news_id')
      .in('news_id', newsIds);

    const existingIds = new Set(existingNews?.map(n => n.news_id) || []);
    const newItems = uniqueNewsItems.filter((item) => !existingIds.has(generateFaId(item.id)));

    if (newItems.length === 0) {
      return NextResponse.json({ message: 'All news already analyzed', existing: existingIds.size });
    }

    const SKIP_AI = false;
    if (!OPENAI_API_KEY || SKIP_AI) {
      console.log('Fast mode - saving without AI');
      const basicAnalyses = newItems.slice(0, 20).map((item) => {
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
          impact: 'Analysis pending',
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
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Saved without AI', saved: basicAnalyses.length });
    }

    const analyses: Array<{ newsItem: NewsItem; result: AnalysisResult | null; analysisDurationSeconds: number }> = [];
    const maxNews = Math.min(newItems.length, 5);

    for (let i = 0; i < maxNews; i++) {
      const item = newItems[i];
      const newsAgeMinutes = (Date.now() / 1000 - item.published_on) / 60;
      if (newsAgeMinutes > 60) {
        console.log(`SKIP old news: ${Math.round(newsAgeMinutes)} min ago`);
        continue;
      }

      const receivedAt = Date.now();
      try {
        console.log(`Analyzing ${i + 1}/${maxNews}: ${item.title.substring(0, 50)}`);
        const result = await analyzeNewsWithPerplexity({
          title: '',
          article: item.content,
          date: new Date(item.published_on * 1000).toISOString(),
          source: item.source,
          url: item.url
        });
        const analysisDurationSeconds = Math.round((Date.now() - receivedAt) / 1000);
        analyses.push({ newsItem: item, result, analysisDurationSeconds });
        console.log(`Done: ${result.stage3.trade_decision} (${result.stage3.importance_score}/10)`);
      } catch (error) {
        console.error('Analysis error:', item.title, error);
        analyses.push({ newsItem: item, result: null, analysisDurationSeconds: 0 });
      }
    }

    console.log(`Analyses complete: ${analyses.length}`);
    const recordsToInsert = analyses.map(({ newsItem, result, analysisDurationSeconds }) => {
      if (!result) return null;
      const { stage1, stage3, collectedData, costs, timing } = result;

      const allAssets = new Set<string>();
      if (stage3.positions?.length) stage3.positions.forEach((p: any) => allAssets.add(p.asset));
      if (stage1.affected_assets?.length) stage1.affected_assets.forEach((a: string) => allAssets.add(a));

      const tradingPairs = Array.from(allAssets)
        .filter(Boolean)
        .map((asset: string) => asset.includes(':') ? asset : buildTradingPairs([asset])[0] || asset)
        .filter(Boolean);

      const credibility = getSourceCredibility(newsItem.source);
      const newsScore = clampScore(stage3.importance_score, 5);
      const breaking = stage3.importance_score >= 8 || isBreakingNews(newsScore, credibility, newsItem.published_on);

      let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (stage3.positions?.[0]) {
        sentiment = stage3.positions[0].direction === 'BUY' ? 'bullish' : 'bearish';
      }

      let timeHorizon: 'short' | 'swing' | 'macro' = 'short';
      if (stage3.positions?.[0]?.trade_type) {
        const tt = stage3.positions[0].trade_type;
        if (tt === 'scalping' || tt === 'day_trading') timeHorizon = 'short';
        else if (tt === 'swing_trading') timeHorizon = 'swing';
        else if (tt === 'position_trading') timeHorizon = 'macro';
      }

      const analysisForSignal: AnalysisWithSignal = {
        sentiment, score: newsScore, timeHorizon, riskMode: 'neutral',
        wouldTrade: stage3.trade_decision === 'TRADE',
      };

      const rawSignal = generateSignal(analysisForSignal);
      const riskFilter = applyRiskFilters(analysisForSignal);
      const finalSignal = riskFilter.blocked ? 'NO_TRADE' : rawSignal;
      const signalBlockedByAssets = tradingPairs.length === 0 && rawSignal !== 'NO_TRADE';

      const fullAiAnalysis = {
        stage1, collectedData, stage3,
        costs: costs || null, timing: timing || null,
        analysis_duration_seconds: analysisDurationSeconds || 0
      };

      return {
        news_id: generateFaId(newsItem.id),
        content: newsItem.content || '',
        source: newsItem.source,
        url: newsItem.url,
        published_at: new Date(newsItem.published_on * 1000).toISOString(),
        category: stage1.category || newsItem.category || 'general',
        sentiment, score: newsScore, trading_pairs: tradingPairs,
        ai_analysis: fullAiAnalysis,
        source_credibility_tier: credibility.tier,
        source_credibility_score: credibility.score,
        source_credibility_label: credibility.label,
        is_breaking: breaking, time_horizon: timeHorizon,
        risk_mode: 'neutral', would_trade: stage3.trade_decision === 'TRADE',
        signal: signalBlockedByAssets ? 'NO_TRADE' : finalSignal,
        signal_blocked: riskFilter.blocked || signalBlockedByAssets,
        block_reason: signalBlockedByAssets ? 'No clear asset exposure' : (riskFilter.reason || null),
      };
    }).filter(Boolean);

    const uniqueRecords = new Map<string, any>();
    for (const record of recordsToInsert) {
      if (record && !uniqueRecords.has(record.news_id)) uniqueRecords.set(record.news_id, record);
    }
    const finalRecords = Array.from(uniqueRecords.values());
    console.log(`Final records: ${finalRecords.length}`);

    let insertedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const record of finalRecords) {
      const { data: existingRecord } = await supabase
        .from('news_analyses')
        .select('news_id')
        .eq('news_id', record.news_id)
        .single();

      if (existingRecord) {
        skippedCount++;
        continue;
      }

      const { error: insertError } = await supabase
        .from('news_analyses')
        .insert(record);

      if (insertError) {
        if (insertError.code === '23505') {
          skippedCount++;
          continue;
        }
        console.error('Insert error:', record.news_id, insertError.message);
        errorCount++;
      } else {
        insertedCount++;
        try {
          const newsTitle = record.ai_analysis?.stage1?.title || 'New analysis';
          await createNewsNotifications({
            id: record.news_id,
            title: newsTitle,
            category: record.category,
            is_breaking: record.is_breaking,
            impact: record.score >= 8 ? 'high' : record.score >= 6 ? 'medium' : 'low',
            sentiment: record.sentiment,
            trading_pairs: record.trading_pairs,
            signal: record.signal
          });

          if (record.signal && record.signal !== 'NO_TRADE' && record.trading_pairs?.length > 0) {
            await createSignalNotifications(record.news_id, record.signal, record.trading_pairs[0], newsTitle);
            try {
              const primaryAsset = record.ai_analysis?.stage3?.positions?.[0]?.asset || record.trading_pairs[0];
              const entryPrice = await fetchCurrentPrice(primaryAsset);
              if (entryPrice > 0) {
                await supabase.from('signal_performance').upsert({
                  news_id: record.news_id,
                  signal: record.signal,
                  primary_asset: primaryAsset,
                  entry_price: entryPrice,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }, { onConflict: 'news_id' });
              }
            } catch (priceError) {
              console.error('Entry price error:', priceError);
            }
          }
        } catch (notifError) {
          console.error('Notification error:', notifError);
        }
      }
    }

    const MAX_NEWS_COUNT = 10000;
    const { data: cutoffRecord } = await supabase
      .from('news_analyses')
      .select('id, analyzed_at')
      .order('analyzed_at', { ascending: false })
      .range(MAX_NEWS_COUNT - 1, MAX_NEWS_COUNT - 1)
      .single();

    if (cutoffRecord) {
      await supabase.from('news_analyses').delete().lt('analyzed_at', cutoffRecord.analyzed_at);
    }

    return NextResponse.json({
      success: true,
      source: 'FMP API',
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

