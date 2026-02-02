/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🐦 TWITTER AUTO-POST CRON
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Automatically posts high-score news analyses to Twitter.
 * Runs every 5 minutes via Vercel cron.
 *
 * Criteria for posting:
 * - score >= 7
 * - would_trade = true
 * - not already tweeted (tweeted_at IS NULL)
 * - published within last 1 hour
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
}): string {
  const sentimentEmoji = news.sentiment === 'bullish' ? '🟢' : news.sentiment === 'bearish' ? '🔴' : '⚪';
  const sentimentText = news.sentiment === 'bullish' ? 'Bullish News' : news.sentiment === 'bearish' ? 'Bearish News' : 'Neutral News';
  
  // Convert trading pairs to $ format (NASDAQ:AAPL -> $AAPL)
  const tickers = (news.trading_pairs || [])
    .slice(0, 4)
    .map(pair => {
      const symbol = pair.includes(':') ? pair.split(':')[1] : pair;
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
  
  // Title (max 120 chars)
  const maxTitleLen = 120;
  const title = news.title.length > maxTitleLen 
    ? news.title.slice(0, maxTitleLen - 3) + '...' 
    : news.title;
  
  tweet += `${title}\n\n`;
  tweet += `${sentimentEmoji} ${sentimentText} | Score: ${news.score}/10\n`;
  
  if (tickers) {
    tweet += `${tickers}\n`;
  }
  
  tweet += `\n📰 Full analysis on FibAlgo\n`;
  tweet += `🔗 fibalgo.com/terminal/news\n\n`;
  
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
    // Security: verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.log('[Twitter Cron] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    // - score >= 7
    // - would_trade = true
    // - not yet tweeted
    // - published in last 1 hour
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    
    const { data: newsToTweet, error: fetchError } = await supabase
      .from('news_analyses')
      .select('news_id, title, sentiment, score, trading_pairs, category, summary, source, published_at')
      .gte('score', 7)
      .eq('would_trade', true)
      .is('tweeted_at', null)
      .gte('published_at', oneHourAgo)
      .order('score', { ascending: false })
      .limit(3); // Max 3 tweets per run to avoid rate limits

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
