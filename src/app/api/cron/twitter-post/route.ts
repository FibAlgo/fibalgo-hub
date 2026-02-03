/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🐦 TWITTER AUTO-POST CRON
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Automatically posts high-score news analyses to Twitter.
 * Runs every 5 minutes via Vercel cron.
 *
 * Criteria for posting:
 * - News analyzed within last 1 hour
 * - confidence_0_10 > 4 (AI güven derecesi)
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

// Format tweet content
function formatTweet(news: {
  title: string;
  sentiment: string;
  score: number;
  trading_pairs: string[];
  category?: string;
  summary?: string;
  source?: string;
  news_id?: string;
  is_breaking?: boolean;
  ai_analysis?: {
    stage3?: {
      is_breaking?: boolean;
      breaking_reason?: string;
    };
  };
}): string {
  const sentimentEmoji = news.sentiment === 'bullish' ? '🟢' : news.sentiment === 'bearish' ? '🔴' : '⚪';
  const sentimentText = news.sentiment === 'bullish' ? 'Bullish News' : news.sentiment === 'bearish' ? 'Bearish News' : 'Neutral News';
  // Breaking flag source of truth: Stage 3 decision (if present) → DB column → legacy heuristic.
  const stage3Breaking = news.ai_analysis?.stage3 && typeof news.ai_analysis.stage3.is_breaking === 'boolean'
    ? news.ai_analysis.stage3.is_breaking
    : undefined;
  const isBreaking = typeof stage3Breaking === 'boolean'
    ? stage3Breaking
    : (typeof news.is_breaking === 'boolean' ? news.is_breaking : (news.score >= 8));
  
  // Convert trading pairs to $ format (NASDAQ:AAPL -> $AAPL)
  const tickers = (news.trading_pairs || [])
    .slice(0, 4)
    .map(pair => {
      let symbol = pair.includes(':') ? pair.split(':')[1] : pair;
      // Remove ^ prefix (Yahoo format for indices like ^GSPC, ^VIX)
      symbol = symbol.replace(/^\^/, '');
      // Remove trailing ! (futures continuous contracts like GC1!)
      symbol = symbol.replace(/!$/, '');
      return `$${symbol}`;
    })
    .join(' ');
  
  // Extract keywords from title and summary for hashtags
  const textForKeywords = `${news.title} ${news.summary || ''}`;
  const keywords = extractTopKeywords(textForKeywords, 2);
  
  // Category hashtag
  const catTag = news.category === 'stocks' ? '#Stocks' 
    : news.category === 'crypto' ? '#Crypto'
    : news.category === 'forex' ? '#Forex'
    : news.category === 'commodities' ? '#Commodities'
    : news.category === 'macro' ? '#Macro'
    : news.category === 'indices' ? '#Indices'
    : '#Markets';
  
  // Build tweet (max 280 chars)
  let tweet = '';
  
  // Breaking news prefix
  if (isBreaking) {
    tweet += `🚨 BREAKING NEWS 🚨\n\n`;
  }
  
  // Score and sentiment at top
  tweet += `${sentimentEmoji} ${sentimentText} | Score: ${news.score}/10\n`;
  
  // Assets below score
  if (tickers) {
    tweet += `${tickers}\n`;
  }
  
  tweet += `\n`;
  
  // Title (max 100 chars)
  const maxTitleLen = 100;
  const title = news.title.length > maxTitleLen 
    ? news.title.slice(0, maxTitleLen - 3) + '...' 
    : news.title;
  
  tweet += `${title}\n\n`;
  
  tweet += `Full analysis on FibAlgo:\n`;
  tweet += `🔗 FibAlgo.com\n\n`;
  
  // Add keyword hashtags + category
  const keywordTags = keywords.map(k => `#${k}`).join(' ');
  tweet += `${keywordTags} ${catTag}`;
  
  // Ensure under 280 chars
  if (tweet.length > 280) {
    // Remove keyword tags if too long
    tweet = tweet.replace(keywordTags + ' ', '');
  }
  if (tweet.length > 280) {
    tweet = tweet.slice(0, 277) + '...';
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
      .select('news_id, title, sentiment, score, trading_pairs, category, summary, source, published_at, analyzed_at, is_breaking, ai_analysis')
      .is('tweeted_at', null)
      .gte('analyzed_at', oneHourAgo) // Only news analyzed in last 1 hour
      .order('analyzed_at', { ascending: false }) // Newest first
      .limit(20); // Fetch more, then filter by confidence (max 10 tweeted)

    // Filter: only tweet when confidence/importance > 4 (fallback: score column)
    const newsToTweet = (rawNews || []).filter((n: any) => {
      const confidence = n?.ai_analysis?.stage3?.confidence_0_10
        ?? n?.ai_analysis?.stage3?.importance_score
        ?? n?.score
        ?? 0;
      return Number(confidence) > 4;
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
        const tweetText = formatTweet(news);
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
