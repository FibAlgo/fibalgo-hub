import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { createNewsNotifications, createSignalNotifications } from '@/lib/notifications/newsNotifications';
import { analyzeNewsWithPerplexity, type AnalysisResult, type PositionMemorySummary, type MemoryDirection, type FlipRisk } from '@/lib/ai/perplexity-news-analyzer';
import { fetchBenzingaNews } from '@/lib/data/benzinga-news';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Haber kaynağı: Benzinga (FMP artık sadece Stage 2 piyasa verisi için kullanılır)
// News ingestion window:
// - fetchPremiumNews: only keeps items newer than this
// - analysis loop: also skips items older than this (defensive)
const NEWS_LOOKBACK_HOURS = 2;

function generateFaId(sourceId: string): string {
  const hash = crypto.createHash('sha256').update(sourceId).digest('hex');
  const numPart = parseInt(hash.substring(0, 8), 16) % 100000000;
  return `fa-${numPart.toString().padStart(8, '0')}`;
}

/**
 * Per-news distributed lock to prevent "double burn" (same news analyzed by multiple cron instances).
 * This is 100% correct across concurrent workers because of a UNIQUE constraint on news_id.
 *
 * Strategy:
 * - Delete expired lock (best-effort).
 * - Insert lock row. If duplicate key -> already locked -> skip analysis.
 * - On successful DB upsert, release lock (delete by news_id + locked_by).
 */
const NEWS_LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes
type LockAcquireResult = { ok: true; lockedBy: string } | { ok: false; reason: 'locked' | 'db_error' };

async function acquireNewsAnalysisLock(
  supabase: ReturnType<typeof createClient>,
  newsId: string,
  lockedBy: string
): Promise<LockAcquireResult> {
  const now = Date.now();
  const expiresAtIso = new Date(now + NEWS_LOCK_TTL_MS).toISOString();
  const nowIso = new Date(now).toISOString();

  // Best-effort cleanup: if previous worker crashed, allow reclaim after TTL.
  try {
    await supabase
      .from('news_analysis_locks')
      .delete()
      .eq('news_id', newsId)
      .lt('lock_expires_at', nowIso);
  } catch {
    // ignore cleanup failures; insert will still be safe
  }

  const { error: insertError } = await supabase
    .from('news_analysis_locks')
    .insert({
      news_id: newsId,
      locked_by: lockedBy,
      lock_expires_at: expiresAtIso,
      locked_at: new Date(now).toISOString(),
      attempts: 1,
    });

  if (!insertError) return { ok: true, lockedBy };

  // Supabase/Postgres duplicate key error
  const code = (insertError as any).code;
  if (code === '23505') return { ok: false, reason: 'locked' };

  console.error('[NewsLock] Failed to acquire lock:', newsId, insertError.message);
  return { ok: false, reason: 'db_error' };
}

async function releaseNewsAnalysisLock(
  supabase: ReturnType<typeof createClient>,
  newsId: string,
  lockedBy: string
): Promise<void> {
  try {
    await supabase
      .from('news_analysis_locks')
      .delete()
      .eq('news_id', newsId)
      .eq('locked_by', lockedBy);
  } catch (e) {
    console.warn('[NewsLock] Failed to release lock:', newsId, e);
  }
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

/** DB ve UI tutarlılığı: cryptocurrency → crypto */
function normalizeNewsCategory(cat: string | undefined): string {
  const c = (cat || 'general').toLowerCase().trim();
  if (c === 'cryptocurrency') return 'crypto';
  return c || 'general';
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

function normalizeAssetKey(s: string): string {
  return String(s || '')
    .toUpperCase()
    .replace(/^(BINANCE:|COINBASE:|KRAKEN:|BYBIT:|OKX:|NASDAQ:|NYSE:|AMEX:|FX:|FX_IDC:|FOREX:|FOREXCOM:|OANDA:|TVC:|CBOE:|SP:|DJ:|INDEX:|XETR:|COMEX:|NYMEX:)/, '')
    .replace(/[^A-Z0-9]/g, '');
}

function mapSignalToDirection(signal?: string | null): MemoryDirection {
  const s = String(signal || '').toUpperCase();
  if (s.includes('BUY')) return 'BUY';
  if (s.includes('SELL')) return 'SELL';
  return 'HOLD';
}

function getTimeWindowFromTradeType(tradeType?: string | null): { shortHours: number; swingHours: number; macroDays: number; windowLabel: 'short' | 'swing' | 'macro' } {
  const tt = String(tradeType || '').toLowerCase();
  if (tt === 'swing_trading') return { shortHours: 6, swingHours: 72, macroDays: 28, windowLabel: 'swing' };
  if (tt === 'position_trading') return { shortHours: 6, swingHours: 72, macroDays: 28, windowLabel: 'macro' };
  // scalping/day_trading default
  return { shortHours: 6, swingHours: 72, macroDays: 28, windowLabel: 'short' };
}

function clampText(s: unknown, maxLen: number): string {
  const str = String(s ?? '');
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

/** Son 3 kayıt: UI yazısı + tam tarih + trade pozisyonları. Token patlamasın. */
function buildRecentAnalysesForAsset(matched: any[]): Array<any> {
  const recent = matched
    .filter((r) => r?.ai_analysis && (r.ai_analysis.stage1 || r.ai_analysis.stage3))
    .slice(0, 3);

  return recent.map((r) => {
    const ai = r.ai_analysis || {};
    const s3 = ai.stage3 || {};
    // FibAlgo Agent'taki Stage 3 yazısı (overall_assessment – numaralı özet)
    const displayText = s3?.overall_assessment || r.title || '—';

    return {
      publishedAt: r.published_at,
      displayText: clampText(displayText, 600),
      positions: Array.isArray(s3?.positions) ? s3.positions.slice(0, 5).map((p: any) => ({
        asset: p?.asset,
        direction: p?.direction,
        confidence: p?.confidence,
        trade_type: p?.trade_type,
      })) : undefined,
    };
  });
}

async function buildPositionMemory(
  supabase: any,
  affectedAssets: string[]
): Promise<PositionMemorySummary | null> {
  if (!affectedAssets || affectedAssets.length === 0) return null;

  const keys = affectedAssets.map(normalizeAssetKey).filter(Boolean);
  if (keys.length === 0) return null;

  const now = Date.now();
  const macroDays = 28;
  const sinceIso = new Date(now - macroDays * 24 * 60 * 60 * 1000).toISOString();

  // Pull recent rows; we do in-memory matching because trading_pairs formats vary.
  const { data, error } = await supabase
    .from('news_analyses')
    .select('news_id, title, published_at, analyzed_at, signal, would_trade, time_horizon, score, risk_mode, trading_pairs, ai_analysis')
    .gte('published_at', sinceIso)
    .order('published_at', { ascending: false })
    .limit(600);

  if (error) {
    console.error('[PositionMemory] supabase error:', error);
    return null;
  }

  // Only include rows we intentionally stored as "position history"
  const rows = (data || [])
    .filter((r: any) => r?.ai_analysis?.meta?.include_in_position_history === true)
    .map((r: any) => {
      // IMPORTANT: match by Stage 1 FMP-canonical assets to avoid provider/exchange symbol chaos.
      const rowAssets: string[] = [];
      const metaFmp = r.ai_analysis?.meta?.fmp_assets;
      if (Array.isArray(metaFmp)) rowAssets.push(...metaFmp.filter(Boolean));
      const stage1Aff = r.ai_analysis?.stage1?.affected_assets;
      if (Array.isArray(stage1Aff)) rowAssets.push(...stage1Aff.filter(Boolean));

      const assetKeys = rowAssets.map(normalizeAssetKey).filter(Boolean);
      return { ...r, _assetKeys: assetKeys };
    });

  const assetsOut = affectedAssets.map((asset) => {
    const k = normalizeAssetKey(asset);
    const matched = rows.filter((r: any) => r._assetKeys.includes(k));

    const last = matched.find((r: any) => r.signal && String(r.signal).toUpperCase() !== 'NO_TRADE');
    const trend = matched
      .filter((r: any) => r.signal)
      .slice(0, 5)
      .map((r: any) => mapSignalToDirection(r.signal));

    const minutesAgo = last?.published_at ? Math.max(0, Math.round((now - Date.parse(last.published_at)) / 60000)) : undefined;

    const flipRisk: FlipRisk = trend.length >= 2 && trend[0] !== trend[1] ? 'HIGH' : trend.length >= 1 ? 'MEDIUM' : 'LOW';

    return {
      asset,
      lastSignal: last
        ? {
            direction: mapSignalToDirection(last.signal),
            signal: last.signal,
            conviction: typeof last.score === 'number' ? Math.max(1, Math.min(10, Math.round(last.score))) : undefined,
            timeHorizon: last.time_horizon || undefined,
            minutesAgo,
          }
        : undefined,
      trendLast5: trend.length ? trend : undefined,
      openPositionState: {
        status: 'UNKNOWN',
        note: 'PnL tracking not connected in this view',
      },
      marketRegime: last?.ai_analysis?.stage3?.market_regime || undefined,
      volatilityRegime: last?.risk_mode || undefined,
      flipRisk,
      recentAnalyses: buildRecentAnalysesForAsset(matched),
    } as const;
  });

  return {
    generatedAt: new Date().toISOString(),
    window: { shortHours: 6, swingHours: 72, macroDays: 28 },
    assets: assetsOut as any,
  };
}

// FlipGuard removed: we rely on Stage 3 + position memory to self-consistently decide.

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
// Cron ile uyumlu haber öğesi (Benzinga'dan dönüştürülmüş)
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
  const items = await fetchBenzingaNews({
    lookbackHours: NEWS_LOOKBACK_HOURS,
    pageSize: 500,
    displayOutput: 'full',
  });
  if (items.length > 0) console.log(`[Benzinga] News total (last 2h): ${items.length}`);
  return items as NewsItem[];
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
      return NextResponse.json({ message: 'No news found from Benzinga API' });
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
      .select('news_id, ai_analysis')
      .in('news_id', newsIds);

    const existingById = new Map<string, { hasAi: boolean }>();
    for (const row of existingNews || []) {
      existingById.set(row.news_id, { hasAi: !!row.ai_analysis });
    }

    // Candidates: new OR existing-but-missing-ai
    const candidates = uniqueNewsItems.filter((item) => {
      const id = generateFaId(item.id);
      const existing = existingById.get(id);
      if (!existing) return true;
      return !existing.hasAi;
    });

    console.log(`Candidates (new or missing AI): ${candidates.length}, existing in DB: ${existingById.size}`);

    if (candidates.length === 0) {
      return NextResponse.json({
        message: 'All news already analyzed',
        existing: existingById.size,
        after_lookback_filter: uniqueNewsItems.length,
      });
    }

    const SKIP_AI = false;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const aiEnabled = !!PERPLEXITY_API_KEY && !!OPENAI_API_KEY && !SKIP_AI;
    if (!aiEnabled) {
      console.log('Fast mode - saving without AI (missing PERPLEXITY/OPENAI keys)');
      const basicAnalyses = candidates
        .slice(0, 20)
        .sort((a, b) => b.published_on - a.published_on)
        .map((item) => {
        const publishedAt = new Date(item.published_on * 1000);
        const sourceCredibility = getSourceCredibility(item.source);
        return {
          news_id: generateFaId(item.id),
          title: item.title,
          content: item.content || item.title,
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
    const maxNews = Math.min(candidates.length, 5);

    // Prioritize newest items first
    const toAnalyze = [...candidates].sort((a, b) => b.published_on - a.published_on).slice(0, maxNews);

    // Defensive: only analyze news received in the last N hours
    const MAX_AGE_MINUTES = NEWS_LOOKBACK_HOURS * 60;

    // Per-news lock owner for this cron invocation (used for safe release)
    const lockOwner = `analyze-news:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
    const lockedByNewsId = new Map<string, string>();

    for (let i = 0; i < toAnalyze.length; i++) {
      const item = toAnalyze[i];
      const newsAgeMinutes = (Date.now() / 1000 - item.published_on) / 60;
      if (newsAgeMinutes > MAX_AGE_MINUTES) {
        console.log(`SKIP older than ${NEWS_LOOKBACK_HOURS}h: ${Math.round(newsAgeMinutes)} min ago`);
        continue;
      }

      const thisNewsId = generateFaId(item.id);
      const lock = await acquireNewsAnalysisLock(supabase, thisNewsId, lockOwner);
      if (!lock.ok) {
        console.log(`[Cron] SKIP locked (${lock.reason}): ${thisNewsId} | ${item.title.substring(0, 60)}`);
        continue;
      }
      lockedByNewsId.set(thisNewsId, lock.lockedBy);

      const receivedAt = Date.now();
      try {
        console.log(`Analyzing ${i + 1}/${maxNews}: ${item.title.substring(0, 50)}`);
        const publishedIso = new Date(item.published_on * 1000).toISOString();
        const result = await analyzeNewsWithPerplexity(
          {
            title: item.title || '',
            article: item.content,
            date: publishedIso,
            source: item.source,
            url: item.url,
          },
          {
            getPositionMemory: async ({ affectedAssets }) => buildPositionMemory(supabase, affectedAssets),
          }
        );
        const analysisDurationSeconds = Math.round((Date.now() - receivedAt) / 1000);
        analyses.push({ newsItem: item, result, analysisDurationSeconds });
        console.log(`Done: ${result.stage3.trade_decision} (${result.stage3.importance_score}/10)`);
      } catch (error) {
        console.error('Analysis error:', item.title, error);
        analyses.push({ newsItem: item, result: null, analysisDurationSeconds: 0 });
        // Leave the lock in place until TTL so we don't immediately double-burn on repeated failures.
      }
    }

    console.log(`Analyses complete: ${analyses.length}`);
    const recordsToInsert = analyses.map(({ newsItem, result, analysisDurationSeconds }) => {
      if (!result) return null;
      const { stage1, stage3: rawStage3, collectedData, collected_fmp_data, costs, timing, market_reaction, external_impact, stage2_debug, debug_logs } = result as any;

      const stage3 = rawStage3;

      // Canonical assets: prefer Stage 3 assets (most accurate), fallback to Stage 1
      const stage3Assets: string[] = Array.isArray(stage3.positions)
        ? stage3.positions.map((p: any) => p?.asset).filter(Boolean)
        : [];
      const stage1Assets: string[] = Array.isArray(stage1.affected_assets)
        ? stage1.affected_assets.filter(Boolean)
        : [];
      const canonicalAssets: string[] = (stage3Assets.length ? stage3Assets : stage1Assets)
        .map((a) => String(a).trim())
        .filter((a) => a.length > 0);

      const tradingPairs: string[] = Array.from(new Set(canonicalAssets))
        .map((asset) => (asset.includes(':') ? asset : buildTradingPairs([asset])[0] || asset))
        .filter((x): x is string => typeof x === 'string' && x.length > 0);

      const credibility = getSourceCredibility(newsItem.source);
      const newsScore = clampScore(stage3.importance_score, 5);
      const breaking = stage3.importance_score >= 8 || isBreakingNews(newsScore, credibility, newsItem.published_on);

      // Use AI's direct news_sentiment assessment (independent of trade decision)
      let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (stage3.news_sentiment) {
        const aiSentiment = stage3.news_sentiment.toUpperCase();
        if (aiSentiment === 'BULLISH') sentiment = 'bullish';
        else if (aiSentiment === 'BEARISH') sentiment = 'bearish';
        else sentiment = 'neutral';
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

      const conv = typeof stage3.conviction === 'number' ? stage3.conviction : undefined;
      const convScore = Number.isFinite(conv as any) ? Number(conv) : Number(stage3.importance_score || 0);
      const includeInHistory = stage3.trade_decision === 'TRADE' || convScore > 6;

      const fullAiAnalysis = {
        stage1,
        collectedData,
        stage3,
        meta: {
          // UI-clickable assets should come from Stage 1 (FMP canonical symbols)
          canonical_assets: Array.isArray(stage1.affected_assets) ? Array.from(new Set(stage1.affected_assets)) : [],
          fmp_assets: Array.isArray(stage1.affected_assets) ? Array.from(new Set(stage1.affected_assets)) : [],
          include_in_position_history: includeInHistory,
        },
        market_reaction: market_reaction || null,
        collected_fmp_data: collected_fmp_data || null,
        external_impact: external_impact || null,
        stage2_debug: stage2_debug || null,
        costs: costs || null, timing: timing || null,
        analysis_duration_seconds: analysisDurationSeconds || 0
      };

      const title = (stage1?.title || newsItem.title || newsItem.content?.slice(0, 200) || 'Untitled').slice(0, 500);
      const summary = (stage3?.overall_assessment || stage1?.title || '').slice(0, 2000);
      const impact = (stage3?.reason_for_action || '').slice(0, 1000);
      const analyzedAt = new Date().toISOString();

      return {
        news_id: generateFaId(newsItem.id),
        title,
        content: newsItem.content || '',
        source: newsItem.source,
        url: newsItem.url,
        published_at: new Date(newsItem.published_on * 1000).toISOString(),
        analyzed_at: analyzedAt,
        category: normalizeNewsCategory(stage1.category || newsItem.category || 'general'),
        sentiment, score: newsScore, trading_pairs: tradingPairs,
        summary: summary || title,
        impact: impact || null,
        ai_analysis: fullAiAnalysis,
        source_credibility_tier: credibility.tier,
        source_credibility_score: credibility.score,
        source_credibility_label: credibility.label,
        is_breaking: breaking, time_horizon: timeHorizon,
        risk_mode: 'neutral', would_trade: stage3.trade_decision === 'TRADE',
        signal: signalBlockedByAssets ? 'NO_TRADE' : finalSignal,
        signal_blocked: riskFilter.blocked || signalBlockedByAssets,
        block_reason: signalBlockedByAssets ? 'No clear asset exposure' : (riskFilter.reason || null),
        // Debug logs - only saved when there are logs (errors or important events)
        debug_logs: debug_logs && debug_logs.length > 0 ? debug_logs : null,
      };
    }).filter(Boolean);

    const uniqueRecords = new Map<string, any>();
    for (const record of recordsToInsert) {
      if (record && !uniqueRecords.has(record.news_id)) uniqueRecords.set(record.news_id, record);
    }
    const finalRecords = Array.from(uniqueRecords.values());
    console.log(`Final records: ${finalRecords.length} (to upsert)`);

    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const record of finalRecords) {
      const wasExisting = existingById.has(record.news_id);

      // Upsert so we can backfill ai_analysis for existing rows
      const { error: upsertError } = await supabase
        .from('news_analyses')
        .upsert(record, { onConflict: 'news_id' });

      if (upsertError) {
        if (upsertError.code === '23505') {
          skippedCount++;
          continue;
        }
        console.error('Upsert error:', record.news_id, upsertError.message);
        errorCount++;
      } else {
        if (wasExisting) updatedCount++; else insertedCount++;
        console.log(`DB ${wasExisting ? 'updated' : 'inserted'}: ${record.news_id} | ${(record.title || '').slice(0, 50)}`);

        // Release per-news lock only after DB write succeeds (prevents another worker analyzing before ai_analysis is saved).
        const owner = lockedByNewsId.get(record.news_id);
        if (owner) {
          await releaseNewsAnalysisLock(supabase, record.news_id, owner);
          lockedByNewsId.delete(record.news_id);
        }

        // Avoid spamming notifications on backfills/updates; only notify on brand-new inserts.
        if (!wasExisting) {
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
    }

    // IMPORTANT:
    // Do NOT release remaining locks here.
    // If analysis failed or DB write didn't happen, we keep the lock until TTL to prevent rapid re-tries
    // that would double-burn OpenAI tokens.

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

    console.log(`Cron done: inserted=${insertedCount} updated=${updatedCount} errors=${errorCount} (see /terminal/news or period=24h)`);
    return NextResponse.json({
      success: true,
      source: 'Market News',
      mode: aiEnabled ? 'ai' : 'fast',
      maxAgeMinutes: MAX_AGE_MINUTES,
      analyzed: recordsToInsert.length,
      inserted: insertedCount,
      updated: updatedCount,
      skipped_duplicates: skippedCount,
      errors: errorCount,
      total: allNewsItems.length,
      filtered_existing: existingById.size
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

