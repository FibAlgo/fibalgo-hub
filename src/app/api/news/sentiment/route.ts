import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface SentimentData {
  period: string;
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
  /** Low impact (score < 6) haberler sentiment hesaplamasına dahil edilmez; sadece bilgi. */
  excludedLowImpactCount: number;
  overallSentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed';
  sentimentScore: number; // -100 to 100 (bearish to bullish)
  avgNewsScore: number;
  breakingCount: number;
  topSources: { source: string; count: number; avgScore: number }[];
  categoryBreakdown: { category: string; bullish: number; bearish: number; neutral: number }[];
}

export async function GET(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h'; // 24h, 7d, 30d
    const category = searchParams.get('category') || 'all';

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // 700/gün × 30 = ~21k. published_at index ile hızlı olmalı.
    let query = supabase
      .from('news_analyses')
      .select('id, published_at, sentiment, score, impact, category, source, is_breaking')
      .gte('published_at', startDate.toISOString())
      .order('published_at', { ascending: false })
      .limit(25000);

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: newsData, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch sentiment data' }, { status: 500 });
    }

    const news = newsData || [];

    // Low impact: exclude from gauge. (1) score 1–5 = low; (2) impact = 'low'. Gauge uses only medium/high.
    const MIN_IMPACT_SCORE = 6;
    const isLowImpact = (n: { score?: number | null; impact?: string | null }) => {
      const scoreNum = Number(n.score);
      const scoreTooLow = Number.isNaN(scoreNum) || scoreNum < MIN_IMPACT_SCORE;
      const impactIsLow = String(n.impact ?? '').toLowerCase() === 'low';
      return scoreTooLow || impactIsLow;
    };
    const newsForSentiment = news.filter(n => !isLowImpact(n));

    // Effective sentiment: DB may have NULL, treat as neutral
    const getSentiment = (n: { sentiment?: string | null }) =>
      (n.sentiment === 'bullish' || n.sentiment === 'bearish' || n.sentiment === 'neutral') ? n.sentiment : 'neutral';

    // Tüm metrikler sadece medium/high impact haberlerle (low impact dahil edilmez)
    const bullish = newsForSentiment.filter(n => getSentiment(n) === 'bullish').length;
    const bearish = newsForSentiment.filter(n => getSentiment(n) === 'bearish').length;
    const neutral = newsForSentiment.filter(n => getSentiment(n) === 'neutral').length;
    const total = bullish + bearish + neutral;

    // Skor: sadece medium/high impact haberlerle. Formül: ((bullish - bearish) / total) * 100
    const sentimentScore = total > 0
      ? Math.round(((bullish - bearish) / total) * 100)
      : 0;

    // Overall sentiment
    let overallSentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed';
    if (sentimentScore > 25) {
      overallSentiment = 'Bullish';
    } else if (sentimentScore < -25) {
      overallSentiment = 'Bearish';
    } else if (Math.abs(bullish - bearish) < total * 0.1) {
      overallSentiment = 'Mixed';
    } else {
      overallSentiment = 'Neutral';
    }

    // Average news importance score (sadece sentiment'e dahil haberler)
    const avgNewsScore = total > 0
      ? Math.round((newsForSentiment.reduce((sum, n) => sum + (n.score || 5), 0) / total) * 10) / 10
      : 0;

    // Breaking count (sadece sentiment'e dahil haberler)
    const breakingCount = newsForSentiment.filter(n => n.is_breaking).length;

    // Top sources (sadece sentiment'e dahil haberler)
    const sourceMap = new Map<string, { count: number; totalScore: number }>();
    newsForSentiment.forEach(n => {
      const source = n.source || 'Unknown';
      const existing = sourceMap.get(source) || { count: 0, totalScore: 0 };
      sourceMap.set(source, {
        count: existing.count + 1,
        totalScore: existing.totalScore + (n.score || 5)
      });
    });

    const topSources = Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        count: data.count,
        avgScore: Math.round((data.totalScore / data.count) * 10) / 10
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Category breakdown (sadece sentiment'e dahil haberler)
    const categories = ['crypto', 'forex', 'stocks', 'commodities', 'indices'];
    const categoryBreakdown = categories.map(cat => {
      const catNews = newsForSentiment.filter(n => n.category === cat);
      return {
        category: cat,
        bullish: catNews.filter(n => getSentiment(n) === 'bullish').length,
        bearish: catNews.filter(n => getSentiment(n) === 'bearish').length,
        neutral: catNews.filter(n => getSentiment(n) === 'neutral').length,
      };
    }).filter(c => c.bullish + c.bearish + c.neutral > 0);

    const excludedLowImpactCount = news.filter(isLowImpact).length;

    const sentimentData: SentimentData = {
      period,
      bullish,
      bearish,
      neutral,
      total,
      excludedLowImpactCount,
      overallSentiment,
      sentimentScore,
      avgNewsScore,
      breakingCount,
      topSources,
      categoryBreakdown,
    };

    return NextResponse.json(sentimentData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error) {
    console.error('Sentiment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
