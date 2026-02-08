/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🐦 TWITTER AUTO-POST CRON
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Automatically posts high-conviction news analyses to Twitter.
 * Runs every 5 minutes via Vercel cron.
 *
 * Criteria for posting:
 * - News analyzed within last 1 hour
 * - conviction >= 7 OR is_breaking = true
 * - not already tweeted (tweeted_at IS NULL) - duplicate check
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TwitterApi } from 'twitter-api-v2';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN!;
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET!;

// Cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Initialize Twitter client
function getTwitterClient() {
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    throw new Error('Twitter API credentials not configured');
  }
  
  return new TwitterApi({
    appKey: TWITTER_API_KEY,
    appSecret: TWITTER_API_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_SECRET,
  });
}

// Extract top keywords from text for hashtags
function extractTopKeywords(text: string, count: number = 2): string[] {
  // Common words to ignore
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'their', 'we', 'our', 'you',
    'your', 'i', 'my', 'he', 'she', 'his', 'her', 'can', 'not', 'no', 'yes', 'all',
    'more', 'most', 'some', 'any', 'each', 'every', 'both', 'few', 'many', 'much',
    'other', 'another', 'such', 'what', 'which', 'who', 'whom', 'when', 'where', 'why',
    'how', 'if', 'then', 'than', 'so', 'just', 'only', 'also', 'very', 'too', 'even',
    'new', 'old', 'first', 'last', 'next', 'now', 'still', 'well', 'way', 'after',
    'before', 'between', 'under', 'over', 'through', 'during', 'into', 'about', 'up',
    'down', 'out', 'off', 'again', 'further', 'once', 'here', 'there', 'news', 'says',
    'said', 'per', 'via', 'according', 'report', 'reports', 'reported', 'year', 'month',
    'day', 'week', 'time', 'today', 'yesterday', 'tomorrow', 'market', 'markets', 'stock',
    'stocks', 'price', 'prices', 'trade', 'trading', 'analysis', 'data', 'billion', 'million'
  ]);
  
  // Extract words (only letters, min 4 chars)
  const words = text.toLowerCase()
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopWords.has(w));
  
  // Count frequency
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }
  
  // Sort by frequency and get top N
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

function clampText(text: string, max: number): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, Math.max(0, max - 1)).trim() + '…';
}

// Viral hook templates - rotates based on content
const HOOK_TEMPLATES = {
  breaking: [
    "🚨 BREAKING: {reason}",
    "⚡ This just happened: {reason}",
    "🔴 ALERT: {reason}",
  ],
  bullish: [
    "👀 Wall Street is watching... {reason}",
    "📈 This could be HUGE for {ticker}",
    "🚀 {ticker} just did something massive...",
    "💰 Smart money is moving. Here's why:",
    "🔥 Everyone's talking about {ticker}. Here's why:",
  ],
  bearish: [
    "⚠️ Warning signs for {ticker}...",
    "📉 This changes everything for {ticker}",
    "🚨 {ticker} holders need to see this",
    "❌ Big trouble brewing for {ticker}",
    "💥 What {ticker} doesn't want you to know:",
  ],
  neutral: [
    "🧐 Something interesting is happening with {ticker}",
    "📊 The data is in. Here's what it means:",
    "👁️ Keep your eyes on {ticker}. Here's why:",
    "📌 This flew under the radar: {reason}",
  ],
};

function getRandomHook(sentiment: string, isBreaking: boolean): string {
  if (isBreaking) {
    const hooks = HOOK_TEMPLATES.breaking;
    return hooks[Math.floor(Math.random() * hooks.length)];
  }
  const hooks = HOOK_TEMPLATES[sentiment as keyof typeof HOOK_TEMPLATES] || HOOK_TEMPLATES.neutral;
  return hooks[Math.floor(Math.random() * hooks.length)];
}

// Format tweet content - VIRAL STYLE with AI Analysis
function formatTweet(news: {
  title: string;
  sentiment: string;
  conviction: number;
  trading_pairs: string[];
  category?: string;
  summary?: string;
  source?: string;
  news_id?: string;
  is_breaking?: boolean;
  ai_analysis?: {
    stage1?: {
      analysis?: string;
      title?: string;
    };
    stage3?: {
      is_breaking?: boolean;
      breaking_reason?: string;
      summary?: string;
      conviction?: number;
    };
  };
}): string {
  // Breaking flag source of truth: Stage 3 decision (if present) → DB column → legacy heuristic.
  const stage3Breaking = news.ai_analysis?.stage3 && typeof news.ai_analysis.stage3.is_breaking === 'boolean'
    ? news.ai_analysis.stage3.is_breaking
    : undefined;
  const isBreaking = typeof stage3Breaking === 'boolean'
    ? stage3Breaking
    : (typeof news.is_breaking === 'boolean' ? news.is_breaking : (news.conviction >= 8));
  
  // All tickers for display (max 3)
  const allTickers = (news.trading_pairs || [])
    .slice(0, 3)
    .map(pair => {
      let symbol = pair.includes(':') ? pair.split(':')[1] : pair;
      symbol = symbol.replace(/^\^/, '').replace(/!$/, '');
      return `$${symbol}`;
    })
    .join(' ');
  
  // Get AI-generated title (stage1 title or DB title)
  const aiTitle = news.ai_analysis?.stage1?.title || news.title || '';
  
  // Get Stage 1 AI analysis (the detailed analysis text)
  const stage1Analysis = news.ai_analysis?.stage1?.analysis || '';
  
  // Sentiment signal
  const signalEmoji = news.sentiment === 'bullish' ? '📈' : news.sentiment === 'bearish' ? '📉' : '📊';
  const signalText = news.sentiment === 'bullish' ? 'BULLISH' : news.sentiment === 'bearish' ? 'BEARISH' : 'NEUTRAL';
  
  // Conviction display
  const convictionDisplay = news.conviction >= 9 ? `🔥 ${news.conviction}/10`
    : news.conviction >= 7 ? `⚡ ${news.conviction}/10`
    : `${news.conviction}/10`;
  
  // Category hashtag
  const catTag = news.category === 'stocks' ? '#Stocks' 
    : news.category === 'crypto' ? '#Crypto'
    : news.category === 'forex' ? '#Forex'
    : news.category === 'commodities' ? '#Commodities'
    : news.category === 'macro' ? '#Macro'
    : news.category === 'indices' ? '#Indices'
    : '#Markets';

  // Calculate available space for analysis (280 - fixed parts)
  const MAX_TWEET = 280;
  
  let tweet = '';
  
  // Build header: Breaking/Signal + Score (newline) + Title + Tickers
  if (isBreaking) {
    tweet += `🚨 BREAKING\n${aiTitle}`;
    if (allTickers) tweet += ` | ${allTickers}`;
    tweet += `\n\n`;
  } else {
    tweet += `${signalEmoji} ${signalText} ${convictionDisplay}\n${aiTitle}`;
    if (allTickers) tweet += ` | ${allTickers}`;
    tweet += `\n\n`;
  }
  
  // Calculate remaining space for analysis
  // Hashtags: 2 top keywords from analysis + category
  const topKeywords = extractTopKeywords(stage1Analysis || aiTitle, 2);
  const keywordTags = topKeywords.map(k => `#${k}`).join(' ');
  const hashTags = keywordTags ? `${keywordTags} ${catTag}` : catTag;
  const ctaPart = `\n\n👉 https://fibalgo.com/terminal\n\n${hashTags}`;
  const remainingSpace = MAX_TWEET - tweet.length - ctaPart.length - 3; // 3 for "💡 "
  
  // Add AI analysis (trimmed to fit remaining space)
  if (stage1Analysis && remainingSpace > 20) {
    tweet += `💡 ${clampText(stage1Analysis, remainingSpace)}`;
  }
  
  // Add CTA
  tweet += ctaPart;
  
  // Final safety check - hard trim if still over
  if (tweet.length > MAX_TWEET) {
    tweet = tweet.slice(0, MAX_TWEET - 3) + '...';
  }
  
  return tweet;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication (handles x-vercel-cron, Bearer token, query param, user-agent)
    const { verifyCronAuth } = await import('@/lib/api/auth');
    const cronAuth = verifyCronAuth(request);
    if (!cronAuth.authorized) {
      console.log('[Twitter Cron] Unauthorized request');
      return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.statusCode || 401 });
    }

    console.log('[Twitter Cron] Starting...');

    // Check if Twitter is configured
    if (!TWITTER_API_KEY) {
      console.log('[Twitter Cron] Twitter API not configured, skipping');
      return NextResponse.json({ 
        success: true, 
        message: 'Twitter API not configured',
        tweeted: 0 
      });
    }

    // Get news to tweet:
    // - ALL news analyzed in last 1 hour
    // - not yet tweeted (duplicate check via tweeted_at IS NULL)
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    
    const { data: rawNews, error: fetchError } = await supabase
      .from('news_analyses')
      .select('news_id, title, sentiment, trading_pairs, category, summary, source, published_at, analyzed_at, is_breaking, ai_analysis')
      .is('tweeted_at', null)
      .gte('analyzed_at', oneHourAgo) // Only news analyzed in last 1 hour
      .order('analyzed_at', { ascending: false }) // Newest first
      .limit(20); // Fetch more, then filter by conviction (max 10 tweeted)

    // Filter: tweet if conviction >= 7 OR is breaking news
    const newsToTweet = (rawNews || []).filter((n: any) => {
      const conviction = Number(n?.ai_analysis?.stage3?.conviction ?? 0);
      
      // Breaking news check: stage3 decision → DB column
      const stage3Breaking = n?.ai_analysis?.stage3?.is_breaking;
      const isBreaking = typeof stage3Breaking === 'boolean'
        ? stage3Breaking
        : (typeof n?.is_breaking === 'boolean' ? n.is_breaking : false);
      
      // Tweet if: conviction >= 7 OR breaking news
      return conviction >= 7 || isBreaking;
    }).slice(0, 10);

    if (fetchError) {
      console.error('[Twitter Cron] DB fetch error:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!newsToTweet || newsToTweet.length === 0) {
      console.log('[Twitter Cron] No news to tweet');
      return NextResponse.json({ 
        success: true, 
        message: 'No news matching criteria',
        tweeted: 0 
      });
    }

    console.log(`[Twitter Cron] Found ${newsToTweet.length} news to tweet`);

    // Initialize Twitter client
    const twitterClient = getTwitterClient();
    const rwClient = twitterClient.readWrite;

    const tweetedIds: string[] = [];
    const errors: string[] = [];

    for (const news of newsToTweet) {
      try {
        // Inject conviction from stage3 into news object for formatTweet
        const conviction = Number(news.ai_analysis?.stage3?.conviction ?? 0);
        const tweetText = formatTweet({ ...news, conviction });
        console.log(`[Twitter Cron] Posting tweet for: ${news.title.slice(0, 50)}...`);
        
        // Post tweet
        const { data: tweet } = await rwClient.v2.tweet(tweetText);
        
        console.log(`[Twitter Cron] Tweet posted: ${tweet.id}`);

        // Mark as tweeted
        await supabase
          .from('news_analyses')
          .update({ 
            tweeted_at: new Date().toISOString(),
            tweet_id: tweet.id 
          })
          .eq('news_id', news.news_id);

        tweetedIds.push(news.news_id);

        // Small delay between tweets
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (tweetError: any) {
        console.error(`[Twitter Cron] Tweet error for ${news.news_id}:`, tweetError?.message || tweetError);
        errors.push(`${news.news_id}: ${tweetError?.message || 'Unknown error'}`);
      }
    }

    console.log(`[Twitter Cron] Complete. Tweeted: ${tweetedIds.length}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      tweeted: tweetedIds.length,
      tweetedIds,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('[Twitter Cron] Fatal error:', error);
    return NextResponse.json(
      { error: 'Twitter cron failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
