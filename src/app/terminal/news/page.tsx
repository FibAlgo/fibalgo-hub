'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ExternalLink,
  Clock,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Search,
  Megaphone,
  Activity,
  AlertTriangle,
  Zap,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';
import { EnhancedNewsCard, type AIAnalysis } from '@/components/news/NewsAnalysisCard';
import NewsSignalCard, { type NewsSignal } from '@/components/dashboard/NewsSignalCard';
import { getTerminalCache, setTerminalCache, isCacheValid } from '@/lib/store/terminalCache';
import { useTerminal } from '@/lib/context/TerminalContext';
import MobileResponsiveNews from './MobileResponsiveNews';
import { createClient } from '@/lib/supabase/client';

interface TradingPair {
  symbol: string;
  ticker: string;
}

interface SourceCredibility {
  tier: 1 | 2 | 3 | 4;
  score: number;
  label: string;
}

interface NewsItem {
  id: number | string;
  newsId?: string; // Hash ID for notification matching
  source: string;
  handle: string;
  avatar: string;
  content: string;
  time: string;
  publishedAt?: string;
  createdAt?: string; // When we received the news (for latency calculation)
  sourceLabel: string;
  url?: string;
  category?: 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices' | 'general';
  isBreaking?: boolean;
  sourceCredibility?: SourceCredibility;
  // Legacy analysis format
  analysis?: {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    score: number;
    summary: string;
    impact: string;
    risk?: string;
    tradingPairs: TradingPair[];
  };
  // New AI Analysis format (from /api/analyze-news)
  aiAnalysis?: AIAnalysis;
  isAnalyzing?: boolean;
}

interface SentimentData {
  period: string;
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
  overallSentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed';
  sentimentScore: number;
  avgNewsScore: number;
  breakingCount: number;
  topSources: { source: string; count: number; avgScore: number }[];
  categoryBreakdown: { category: string; bullish: number; bearish: number; neutral: number }[];
}

// Asset string → TradingView symbol (for chart popup)
function assetToTvSymbol(asset: string): string {
  if (!asset || typeof asset !== 'string') return 'BINANCE:BTCUSDT';
  const raw = asset.trim().toUpperCase().replace(/\$/g, '').replace(/\//g, '');
  if (raw.includes(':')) return asset.trim();
  const crypto: Record<string, string> = {
    BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT', XRP: 'BINANCE:XRPUSDT',
    BNB: 'BINANCE:BNBUSDT', DOGE: 'BINANCE:DOGEUSDT', ADA: 'BINANCE:ADAUSDT', AVAX: 'BINANCE:AVAXUSDT',
    LINK: 'BINANCE:LINKUSDT', MATIC: 'BINANCE:MATICUSDT', DOT: 'BINANCE:DOTUSDT', LTC: 'BINANCE:LTCUSDT',
  };
  const forex: Record<string, string> = {
    EURUSD: 'FX:EURUSD', GBPUSD: 'FX:GBPUSD', USDJPY: 'FX:USDJPY', AUDUSD: 'FX:AUDUSD',
    USDCAD: 'FX:USDCAD', USDCHF: 'FX:USDCHF', NZDUSD: 'FX:NZDUSD',
  };
  const commodities: Record<string, string> = {
    GOLD: 'TVC:GOLD', XAUUSD: 'TVC:GOLD', SILVER: 'COMEX:SI1!', XAGUSD: 'COMEX:SI1!',
    OIL: 'NYMEX:CL1!', WTI: 'NYMEX:CL1!', DXY: 'TVC:DXY',
  };
  const indices: Record<string, string> = {
    SPX: 'SP:SPX', SPY: 'AMEX:SPY', QQQ: 'NASDAQ:QQQ', DJI: 'DJ:DJI', VIX: 'CBOE:VIX',
  };
  if (crypto[raw]) return crypto[raw];
  if (forex[raw]) return forex[raw];
  if (commodities[raw]) return commodities[raw];
  if (indices[raw]) return indices[raw];
  if (crypto[raw.replace('USDT', '')]) return crypto[raw.replace('USDT', '')];
  if (/^[A-Z]{2,5}$/.test(raw)) return `BINANCE:${raw}USDT`;
  if (/^[A-Z]{1,5}$/.test(raw)) return `NASDAQ:${raw}`;
  return `BINANCE:${raw}USDT`;
}

// Check if news is fresh (published within last 5 minutes)
const isNewNews = (publishedAt?: string): boolean => {
  if (!publishedAt) return false;
  const publishedDate = new Date(publishedAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - publishedDate.getTime()) / (1000 * 60);
  return diffMinutes <= 5;
};

// Verified Badge Component (Blue Checkmark like Social Media)
const VerifiedBadge = ({ credibility }: { credibility?: SourceCredibility }) => {
  if (!credibility) return null;
  
  // Only show for Tier 1 (Elite) and Tier 2 (Trusted) sources
  if (credibility.tier > 2) return null;
  
  const isElite = credibility.tier === 1;
  
  return (
    <span
      title={isElite ? 'Elite Source (Bloomberg, Reuters, etc.)' : 'Trusted Source (CoinDesk, The Block, etc.)'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '4px',
        cursor: 'help',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Verified checkmark badge */}
        <path
          d="M9 12L11 14L15 10M12 3L14.5 5.5L18 5L17.5 8.5L21 10L18.5 12.5L21 15L17.5 16.5L18 20L14.5 19.5L12 22L9.5 19.5L6 20L6.5 16.5L3 15L5.5 12.5L3 10L6.5 8.5L6 5L9.5 5.5L12 3Z"
          fill={isElite ? '#FFD700' : '#1D9BF0'}
          stroke={isElite ? '#F59E0B' : '#1A8CD8'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 12L11 14L15 10"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
};

// Category color helper
const getCategoryColors = (category?: string): { bg: string; text: string } => {
  switch (category?.toLowerCase()) {
    case 'crypto':
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' }; // Orange/Gold
    case 'forex':
      return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' }; // Blue
    case 'stocks':
      return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E' }; // Green
    case 'commodities':
      return { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7' }; // Purple
    case 'indices':
      return { bg: 'rgba(20, 184, 166, 0.15)', text: '#14B8A6' }; // Teal
    case 'earnings':
      return { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899' }; // Pink
    case 'macro':
      return { bg: 'rgba(6, 182, 212, 0.15)', text: '#06B6D4' }; // Cyan
    default:
      return { bg: 'rgba(0, 229, 255, 0.1)', text: '#00E5FF' }; // Default cyan
  }
};

function NewsFeedContent() {
  // Get scroll state from layout context
  const { isScrollingDown } = useTerminal();
  const searchParams = useSearchParams();
  
  // State for news and sentiment - start empty for SSR compatibility
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentPeriod, setSentimentPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedNewsId, setSelectedNewsId] = useState<number | string | null>(null);
  const [activeTab, setActiveTab] = useState<'for-you' | 'following' | 'ai'>('for-you');
  
  // Chart popup (desktop): asset click opens TradingView in a modal
  const [chartPopupOpen, setChartPopupOpen] = useState(false);
  const [chartPopupSymbol, setChartPopupSymbol] = useState('BINANCE:BTCUSDT');
  
  // Time ticker for updating relative times (e.g., "2m ago")
  const [, setTimeTick] = useState(0);
  const hasScrolledToNews = useRef<string | null>(null); // Track which newsId we scrolled to
  
  // New posts notification
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [showNewPostsBanner, setShowNewPostsBanner] = useState(false);
  const lastNewsIdRef = useRef<string | null>(null);
  const userScrolledRef = useRef(false);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  
  // Handle newsId from URL (from notification click)
  useEffect(() => {
    const newsIdParam = searchParams.get('newsId');
    console.log('[NewsScroll] Effect triggered - newsIdParam:', newsIdParam, 'news.length:', news.length, 'lastScrolledTo:', hasScrolledToNews.current);
    
    // Only skip if we already scrolled to THIS specific newsId
    if (newsIdParam && news.length > 0 && hasScrolledToNews.current !== newsIdParam) {
      console.log('[NewsScroll] Looking for newsId:', newsIdParam);
      console.log('[NewsScroll] First 3 news items:', news.slice(0, 3).map(n => ({ id: n.id, newsId: n.newsId })));
      
      // Find the news item - match on newsId (hash) or id (UUID)
      const foundNews = news.find(n => 
        n.newsId === newsIdParam || 
        n.id?.toString() === newsIdParam || 
        String(n.id) === newsIdParam
      );
      
      if (foundNews) {
        console.log('[NewsScroll] Found news:', foundNews.id, 'newsId:', foundNews.newsId);
        hasScrolledToNews.current = newsIdParam; // Mark this specific newsId as scrolled
        setSelectedNewsId(foundNews.id);
        
        // Scroll to the news item with retry
        const scrollToNews = (retries = 5) => {
          const element = document.getElementById(`news-card-${foundNews.id}`);
          console.log('[NewsScroll] Looking for element:', `news-card-${foundNews.id}`, 'Found:', !!element);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight effect
            element.style.transition = 'box-shadow 0.3s ease';
            element.style.boxShadow = '0 0 20px rgba(0,245,255,0.5)';
            setTimeout(() => {
              element.style.boxShadow = '';
            }, 2000);
          } else if (retries > 0) {
            setTimeout(() => scrollToNews(retries - 1), 500);
          }
        };
        setTimeout(() => scrollToNews(), 300);
      } else {
        console.log('[NewsScroll] News NOT found! Searched for:', newsIdParam);
      }
    }
  }, [searchParams, news]);
  
  // Initialize from cache on mount (client only) - only use cache if period matches
  useEffect(() => {
    const cache = getTerminalCache();
    if (cache?.news?.items && isCacheValid(cache.news.timestamp) && cache.news.period === '24h') {
      setNews(cache.news.items as NewsItem[]);
      setIsLoading(false);
    }
    if (cache?.sentiment?.data && isCacheValid(cache.sentiment.timestamp) && cache.sentiment.period === '24h') {
      setSentimentData(cache.sentiment.data as SentimentData);
    }
  }, []);
  
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [tabBarHeight, setTabBarHeight] = useState<number>(44); // Default height
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Check if mobile and cache result
  useEffect(() => {
    // First check cache for instant response
    const cached = sessionStorage.getItem('fibalgo_isMobile');
    if (cached !== null) {
      setIsMobile(cached === 'true');
    }
    
    // Then verify with real check and update cache
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      sessionStorage.setItem('fibalgo_isMobile', String(mobile));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Measure tab bar height dynamically
  useEffect(() => {
    const updateTabBarHeight = () => {
      if (tabBarRef.current) {
        const height = tabBarRef.current.getBoundingClientRect().height;
        if (height > 0) {
          setTabBarHeight(height);
          document.documentElement.style.setProperty('--news-tab-bar-height', `${height}px`);
        }
      }
    };
    
    // Use requestAnimationFrame for accurate measurement after render
    const rafId = requestAnimationFrame(() => {
      updateTabBarHeight();
      // Also measure again after a short delay in case of layout shifts
      setTimeout(updateTabBarHeight, 100);
    });
    
    window.addEventListener('resize', updateTabBarHeight);
    
    // Use ResizeObserver for more accurate measurements
    const resizeObserver = new ResizeObserver(updateTabBarHeight);
    if (tabBarRef.current) {
      resizeObserver.observe(tabBarRef.current);
    }
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateTabBarHeight);
      resizeObserver.disconnect();
    };
  }, []);

  // Fetch sentiment data - check cache first
  const fetchSentiment = async (forceRefresh = false) => {
    try {
      // Check cache first (unless forcing refresh or period changed)
      if (!forceRefresh) {
        const cache = getTerminalCache();
        if (cache?.sentiment && isCacheValid(cache.sentiment.timestamp) && cache.sentiment.period === sentimentPeriod) {
          setSentimentData(cache.sentiment.data as typeof sentimentData);
          return;
        }
      }
      
      const response = await fetch(`/api/news/sentiment?period=${sentimentPeriod}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (!data.error) {
        setSentimentData(data);
        setTerminalCache({
          sentiment: { data, timestamp: Date.now(), period: sentimentPeriod }
        });
      }
    } catch (error) {
      console.error('Error fetching sentiment:', error);
    }
  };

  // Fetch news - check cache first (only use cache if same period)
  const fetchNews = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cache = getTerminalCache();
        if (cache?.news && isCacheValid(cache.news.timestamp) && cache.news.period === sentimentPeriod) {
          setNews(cache.news.items as NewsItem[]);
          setIsLoading(false);
          return;
        }
      }
      
      const response = await fetch(`/api/news?limit=10000&period=${sentimentPeriod}`);
      const data = await response.json();
      const newNews = (data.news || []) as NewsItem[];
      
      if (newNews.length > 0) {
        if (lastNewsIdRef.current && userScrolledRef.current) {
          const latestId = newNews[0]?.newsId || newNews[0]?.id?.toString();
          if (latestId !== lastNewsIdRef.current) {
            const oldIndex = newNews.findIndex(n => 
              (n.newsId || n.id?.toString()) === lastNewsIdRef.current
            );
            if (oldIndex > 0) {
              setNewPostsCount(oldIndex);
              setShowNewPostsBanner(true);
            }
          }
        }
        lastNewsIdRef.current = newNews[0]?.newsId || newNews[0]?.id?.toString();
      }
      
      setNews(newNews);
      setTerminalCache({
        news: { items: newNews, timestamp: Date.now(), period: sentimentPeriod }
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching news:', error);
      setIsLoading(false);
    }
  };

  // Track user scroll to determine if they've moved from top
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        userScrolledRef.current = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle clicking the new posts banner
  const handleShowNewPosts = () => {
    setShowNewPostsBanner(false);
    setNewPostsCount(0);
    userScrolledRef.current = false;
    // Clear saved scroll position
    sessionStorage.removeItem('news_scroll_position');
    // Scroll both mobile (window) and desktop (container)
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (desktopScrollRef.current) {
      desktopScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchNews();
    fetchSentiment();
    
    // 🔴 REALTIME: Supabase Realtime subscription for instant news updates
    const supabase = createClient();
    const channel = supabase
      .channel('news-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'news_analyses'
        },
        (payload) => {
          console.log('🔴 Realtime: New news received!', payload.new);
          // Fetch fresh news when a new record is inserted
          fetchNews(true);
        }
      )
      .subscribe((status) => {
        console.log('🔴 Realtime subscription status:', status);
      });
    
    // Fallback polling every 60 seconds (reduced from 30s since we have realtime)
    const newsInterval = setInterval(fetchNews, 60000);
    const sentimentInterval = setInterval(fetchSentiment, 60000);
    // Update time display every 10 seconds for real-time feel
    const timeTickInterval = setInterval(() => setTimeTick(t => t + 1), 10000);
    
    return () => {
      // Cleanup realtime subscription
      supabase.removeChannel(channel);
      clearInterval(newsInterval);
      clearInterval(sentimentInterval);
      clearInterval(timeTickInterval);
    };
  }, []);

  const prevSentimentPeriodRef = useRef(sentimentPeriod);
  useEffect(() => {
    fetchSentiment();
    if (prevSentimentPeriodRef.current !== sentimentPeriod) {
      prevSentimentPeriodRef.current = sentimentPeriod;
      fetchNews(true); // Refetch news when period changes
    }
  }, [sentimentPeriod]);

  // Get breaking news - last 24 hours
  const breakingNews = news.filter(item => {
    if (!item.isBreaking) return false;
    const publishedTime = new Date(item.publishedAt || item.time);
    const now = new Date();
    const hoursDiff = (now.getTime() - publishedTime.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  });

  // Extract trending topics from news headlines (top 10 most frequent words)
  const getTrendingTopics = () => {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
      'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'new', 'after', 'before',
      'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'up', 'down',
      'out', 'off', 'about', 'into', 'through', 'during', 'above', 'below', 'between',
      'says', 'said', 'amid', 'despite', 'while', 'among', 'against', 'within', 'without',
      'could', 'his', 'her', 'their', 'our', 'my', 'your', 'any', 'report', 'reports',
      'according', 'per', 'via', 'vs', 'like', 'get', 'gets', 'got', 'take', 'takes',
      'make', 'makes', 'made', 'set', 'see', 'sees', 'seen', 'know', 'knows', 'known'
    ]);

    const wordCount: Record<string, number> = {};
    
    news.slice(0, 100).forEach(item => {
      const words = item.content
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
      
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count], index) => ({
        rank: index + 1,
        topic: word.charAt(0).toUpperCase() + word.slice(1),
        count,
      }));
  };

  const trendingTopics = getTrendingTopics();

  // Date range for sentiment period (must match /api/news/sentiment)
  const getPeriodStartDate = () => {
    const now = Date.now();
    switch (sentimentPeriod) {
      case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now - 24 * 60 * 60 * 1000); // 24h
    }
  };
  const periodStart = getPeriodStartDate();

  // Filter news: by period (24h/7d/30d), sentiment, category, search
  const filteredNews = news.filter(item => {
    // Period filter: only news within selected sentiment period
    const publishedAt = item.publishedAt || item.time;
    if (publishedAt) {
      const pub = new Date(publishedAt).getTime();
      if (!Number.isNaN(pub) && pub < periodStart.getTime()) return false;
    }

    // Sentiment filter (stage3 or legacy analysis)
    const dir = item.aiAnalysis?.stage3?.positions?.[0]?.direction;
    const itemSentiment = dir === 'BUY' ? 'bullish' : dir === 'SELL' ? 'bearish' : (item.analysis?.sentiment || 'neutral');
    if (activeFilter !== 'all' && itemSentiment !== activeFilter) return false;
    
    // Category filter
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    
    // Search filter
    if (searchQuery && !item.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    return true;
  });

  // Stats
  const stats = {
    total: news.length,
    bullish: news.filter(n => n.analysis?.sentiment === 'bullish').length,
    bearish: news.filter(n => n.analysis?.sentiment === 'bearish').length,
    neutral: news.filter(n => n.analysis?.sentiment === 'neutral').length,
    newCount: news.filter(n => isNewNews(n.publishedAt)).length,
  };

  const getSentimentColor = (sentiment?: string) => {
    if (sentiment === 'bullish') return '#22C55E';
    if (sentiment === 'bearish') return '#EF4444';
    return '#F59E0B';
  };

  const getSentimentBg = (sentiment?: string) => {
    if (sentiment === 'bullish') return 'rgba(34,197,94,0.1)';
    if (sentiment === 'bearish') return 'rgba(239,68,68,0.1)';
    return 'rgba(245,158,11,0.1)';
  };

  // Mobile: Use separate component
  if (isMobile === null) {
    // Still detecting viewport - show loading spinner
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A0B',
        zIndex: 9999
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#00F5FF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  if (isMobile) {
    return (
      <MobileResponsiveNews
        news={news}
        filteredNews={filteredNews}
        breakingNews={breakingNews}
        trendingTopics={trendingTopics}
        sentimentData={sentimentData}
        isLoading={isLoading}
        selectedNewsId={selectedNewsId}
        setSelectedNewsId={setSelectedNewsId}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sentimentPeriod={sentimentPeriod}
        setSentimentPeriod={setSentimentPeriod}
        fetchNews={fetchNews}
        showNewPostsBanner={showNewPostsBanner}
        newPostsCount={newPostsCount}
        onShowNewPosts={handleShowNewPosts}
      />
    );
  }

  // Desktop layout
  return (
    <div 
      className="news-page-container" 
      style={{ 
        display: 'flex', 
        height: '100%', 
        background: '#0A0A0B',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* New Posts Banner */}
      {showNewPostsBanner && (
        <button
          onClick={handleShowNewPosts}
          style={{
            position: 'fixed',
            top: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: '#1D9BF0',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(29, 155, 240, 0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(29, 155, 240, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 155, 240, 0.4)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          {newPostsCount} new post{newPostsCount > 1 ? 's' : ''}
        </button>
      )}
      
      {/* Desktop Styles */}
      <style jsx global>{`
        .news-page-container {
          flex-direction: row;
        }
        .news-tab-bar {
          display: none;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .news-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 0;
          color: rgba(255,255,255,0.5);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
          background: transparent;
          border: none;
        }
        .news-tab:hover {
          color: rgba(255,255,255,0.8);
          background: rgba(255,255,255,0.03);
        }
        .news-tab.active {
          color: #fff;
          font-weight: 600;
        }
        .news-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 3px;
          background: #00F5FF;
          border-radius: 3px 3px 0 0;
        }
        .news-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .news-two-column {
          flex: 1;
          display: flex;
          overflow: hidden;
          flex-direction: row;
        }
        .news-left-column {
          flex: 1;
          padding: 1.5rem 2rem;
          overflow: auto;
        }
        .news-right-sidebar {
          width: 360px;
          border-left: 1px solid rgba(255,255,255,0.1);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow: auto;
          flex-shrink: 0;
        }
        .news-header-title {
          font-size: 1.75rem;
        }
        .breaking-news-container {
          margin-bottom: 1.5rem;
        }
        .sentiment-card {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .filter-bar {
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 0.75rem;
        }
        .filter-button {
          padding: 0.5rem 1rem;
          white-space: nowrap;
        }
        .search-input {
          width: 200px;
        }
        /* Mobile tab content - show based on active tab */
        .mobile-tab-content {
          display: none;
        }
        .mobile-tab-content.current {
          display: block;
        }
        .mobile-tab-trends {
          display: none;
        }
        /* Desktop only content - visible on desktop, hidden on mobile */
        .desktop-only-content {
          display: block;
        }
        
        /* Tablet (768px - 1024px) */
        @media (max-width: 1024px) {
          .news-right-sidebar {
            width: 280px;
            padding: 1rem;
          }
          .news-left-column {
            padding: 1rem 1.5rem;
          }
          .news-header-title {
            font-size: 1.5rem;
          }
        }
        
        /* Breaking News Animations */
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        @keyframes redGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes redSweep {
          0% { transform: translateX(0); }
          100% { transform: translateX(33.33%); }
        }
        @keyframes softPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
      
      {/* Main Content */}
      <div className="news-main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Desktop Page Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15,15,15,0.95) 0%, rgba(20,20,22,0.98) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '1.25rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 18-5v12L3 13v-2z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
            <h1 style={{
              color: '#fff',
              fontSize: '1.25rem',
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              Hear the World First!
            </h1>
          </div>

        {/* Tab Bar - Twitter/X Style */}
        <div 
          className={`news-tab-bar ${isScrollingDown ? 'scroll-hide' : ''}`}
          ref={tabBarRef}
        >
          <button 
            className={`news-tab ${activeTab === 'for-you' ? 'active' : ''}`}
            onClick={() => setActiveTab('for-you')}
          >
            News & Feed
          </button>
          <button 
            className={`news-tab ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            Trend Topics
          </button>
          <button 
            className={`news-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            Market Sentiment
          </button>
        </div>

        {/* Content Area - Two Column Layout */}
        <div className="news-two-column" style={{ flex: 1, display: 'flex', overflow: 'hidden', margin: 0, padding: 0 }}>
          
          {/* Left Column - News Feed */}
          <div 
            ref={desktopScrollRef}
            className="news-left-column" 
            style={{ flex: 1, overflow: 'auto' }}
          >

        {/* NEWS & FEED TAB CONTENT */}
        <div 
          className={`mobile-tab-content for-you-content ${activeTab === 'for-you' ? 'current' : ''}`}
        >
        {/* Breaking News Section - always visible */}
        <div className="breaking-news-container no-swipe" style={{
            background: '#0D0D0D',
            borderRadius: '0',
            marginBottom: '1.5rem',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Animated Red Gradient Background - Smooth Transitions */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(180,30,30,0.08) 0%, rgba(120,20,20,0.04) 50%, rgba(180,30,30,0.1) 100%)',
              animation: 'redGlow 8s ease-in-out infinite',
              pointerEvents: 'none',
              zIndex: 0,
            }} />
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '300%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent 0%, transparent 30%, rgba(255,60,60,0.06) 40%, rgba(255,80,80,0.12) 50%, rgba(255,60,60,0.06) 60%, transparent 70%, transparent 100%)',
              animation: 'redSweep 12s ease-in-out infinite',
              pointerEvents: 'none',
              zIndex: 0,
            }} />
            {/* Soft Glow Layer */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,40,40,0.08) 0%, transparent 60%)',
              animation: 'softPulse 6s ease-in-out infinite',
              pointerEvents: 'none',
              zIndex: 0,
            }} />
            
            {/* Top Bar - Live Indicator */}
            <div style={{ 
              background: 'linear-gradient(90deg, #DC2626 0%, #B91C1C 100%)',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Animated Live Dot */}
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                  animation: 'livePulse 1.5s ease-in-out infinite',
                }} />
                <span style={{ 
                  color: '#fff', 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}>
                  Breaking News
                </span>
                <span style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                }}>
                  {breakingNews.length} LIVE
                </span>
              </div>
              <span style={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: '0.65rem',
                fontFamily: 'monospace',
              }}>
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* News Ticker / Feed */}
            <div style={{ maxHeight: '320px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
              {breakingNews.map((item, index) => {
                const publishedTime = new Date(item.publishedAt || item.time);
                const now = new Date();
                const totalMinutes = Math.floor((now.getTime() - publishedTime.getTime()) / (1000 * 60));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                const timeDisplay = hours > 0 
                  ? `${hours}h ${minutes}m` 
                  : minutes > 0 
                    ? `${minutes}m` 
                    : 'NOW';
                
                const isVeryRecent = totalMinutes < 15;
                const isRecent = totalMinutes < 60;
                
                // Stage 1-2-3 format: stage3.trade_decision and positions[0].direction
                const tradeDecision = item.aiAnalysis?.stage3?.trade_decision;
                const firstPosition = item.aiAnalysis?.stage3?.positions?.[0];
                const isBullish = tradeDecision === 'TRADE' && firstPosition?.direction === 'BUY';
                const isBearish = tradeDecision === 'TRADE' && firstPosition?.direction === 'SELL';
                
                return (
                  <div 
                    key={item.id || index}
                    onClick={() => {
                      // Scroll to the news card and expand it
                      if (item.id) {
                        setSelectedNewsId(item.id);
                        // Scroll to the news card after a short delay to allow rendering
                        setTimeout(() => {
                          const element = document.getElementById(`news-card-${item.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            // Add highlight effect
                            element.style.boxShadow = '0 0 0 2px #00F5FF, 0 0 20px rgba(0,245,255,0.3)';
                            setTimeout(() => {
                              element.style.boxShadow = '';
                            }, 2000);
                          }
                        }, 100);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      borderBottom: index < breakingNews.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      background: isVeryRecent ? 'rgba(220,38,38,0.08)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isVeryRecent ? 'rgba(220,38,38,0.08)' : 'transparent';
                    }}
                  >
                    {/* Time Column */}
                    <div style={{
                      width: '70px',
                      minWidth: '70px',
                      padding: '12px 14px',
                      borderRight: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isVeryRecent ? 'rgba(220,38,38,0.15)' : 'rgba(0,0,0,0.2)',
                    }}>
                      <span style={{
                        color: isVeryRecent ? '#EF4444' : isRecent ? '#F59E0B' : 'rgba(255,255,255,0.4)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        letterSpacing: '0.02em',
                      }}>
                        {timeDisplay}
                      </span>
                      {isVeryRecent && (
                        <span style={{
                          color: '#EF4444',
                          fontSize: '0.55rem',
                          fontWeight: 600,
                          marginTop: '2px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          URGENT
                        </span>
                      )}
                    </div>
                    
                    {/* Sentiment Arrow Column */}
                    <div style={{
                      width: '36px',
                      minWidth: '36px',
                      padding: '12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRight: '1px solid rgba(255,255,255,0.06)',
                      background: isBullish ? 'rgba(34,197,94,0.08)' : isBearish ? 'rgba(239,68,68,0.08)' : 'transparent',
                    }}>
                      {isBullish && (
                        <TrendingUp size={16} color="#22C55E" strokeWidth={2.5} />
                      )}
                      {isBearish && (
                        <TrendingDown size={16} color="#EF4444" strokeWidth={2.5} />
                      )}
                      {!isBullish && !isBearish && (
                        <Activity size={14} color="rgba(255,255,255,0.3)" />
                      )}
                    </div>
                    
                    {/* Content Column */}
                    <div style={{ 
                      flex: 1, 
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}>
                      <div style={{ 
                        color: '#fff', 
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                        fontWeight: isVeryRecent ? 600 : 500,
                      }}>
                        {item.content}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '6px',
                      }}>
                        {item.category && (() => {
                          const colors = getCategoryColors(item.category);
                          return (
                            <span style={{
                              background: colors.bg,
                              color: colors.text,
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '0.6rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                            }}>
                              {item.category}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Arrow Indicator */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      color: 'rgba(255,255,255,0.2)',
                    }}>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Bottom Bar */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              position: 'relative',
              zIndex: 1,
            }}>
              <span style={{ 
                color: 'rgba(255,255,255,0.4)', 
                fontSize: '0.65rem',
              }}>
                Updated in real-time • Last 24 hours
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.65rem',
              }}>
                <RefreshCw size={10} />
                Auto-refresh
              </div>
            </div>
          </div>

        {/* DESKTOP MARKET SENTIMENT - Below Breaking News */}
        <div className="desktop-only-content" style={{ marginBottom: '1.5rem' }}>
          <div className="sentiment-card" style={{
            background: 'linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(10,10,15,0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Subtle animated gradient background */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: sentimentData ? 
                (sentimentData.sentimentScore > 25 ? 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.08) 0%, transparent 50%)' :
                 sentimentData.sentimentScore < -25 ? 'radial-gradient(ellipse at 30% 50%, rgba(239,68,68,0.08) 0%, transparent 50%)' :
                 'radial-gradient(ellipse at 30% 50%, rgba(245,158,11,0.08) 0%, transparent 50%)') : 'none',
              pointerEvents: 'none',
            }} />

            {/* Header */}
            <div className="sentiment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="sentiment-icon" style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(59,130,246,0.3) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Activity size={20} color="#A78BFA" />
                </div>
                <h3 className="sentiment-title" style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Market Sentiment</h3>
              </div>
              <div className="sentiment-period-btns" style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.25rem' }}>
                {(['24h', '7d', '30d'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSentimentPeriod(period)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: sentimentPeriod === period ? 'rgba(139,92,246,0.3)' : 'transparent',
                      color: sentimentPeriod === period ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {sentimentData ? (
              <div className="sentiment-card-inner" style={{ display: 'flex', gap: '2rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                
                {/* Left: Sentiment Score Display */}
                <div className="sentiment-left" style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Big Score Card */}
                  <div style={{
                    background: sentimentData.sentimentScore > 25 ? 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)' :
                                sentimentData.sentimentScore < -25 ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)' :
                                'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
                    border: `1px solid ${sentimentData.sentimentScore > 25 ? 'rgba(34,197,94,0.3)' :
                                          sentimentData.sentimentScore < -25 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    borderRadius: '16px',
                    padding: '1.25rem',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Glow effect */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '120px',
                      height: '120px',
                      background: sentimentData.sentimentScore > 25 ? 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)' :
                                  sentimentData.sentimentScore < -25 ? 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)' :
                                  'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }} />
                    <div className="sentiment-score-display" style={{
                      fontSize: '3.5rem',
                      fontWeight: 800,
                      color: sentimentData.sentimentScore > 25 ? '#22C55E' :
                             sentimentData.sentimentScore < -25 ? '#EF4444' : '#F59E0B',
                      lineHeight: 1,
                      position: 'relative',
                    }}>
                      {sentimentData.sentimentScore > 0 ? '+' : ''}{sentimentData.sentimentScore}
                    </div>
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: sentimentData.sentimentScore > 25 ? '#22C55E' :
                             sentimentData.sentimentScore < -25 ? '#EF4444' : '#F59E0B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      position: 'relative',
                    }}>
                      {sentimentData.sentimentScore > 50 ? 'Very Bullish' :
                       sentimentData.sentimentScore > 25 ? 'Bullish' :
                       sentimentData.sentimentScore < -50 ? 'Very Bearish' :
                       sentimentData.sentimentScore < -25 ? 'Bearish' : 'Mixed'}
                    </div>
                  </div>

                  {/* Horizontal Sentiment Bar */}
                  <div style={{ padding: '0 0.25rem' }}>
                    {/* Labels */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Bearish</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Bullish</span>
                    </div>
                    {/* Bar background with gradient */}
                    <div style={{
                      height: '10px',
                      borderRadius: '5px',
                      background: 'linear-gradient(90deg, #EF4444 0%, #F97316 25%, #F59E0B 50%, #84CC16 75%, #22C55E 100%)',
                      position: 'relative',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                    }}>
                      {/* Pointer/Indicator */}
                      <div style={{
                        position: 'absolute',
                        top: '-4px',
                        left: `${((sentimentData.sentimentScore + 100) / 200) * 100}%`,
                        transform: 'translateX(-50%)',
                        width: '18px',
                        height: '18px',
                        background: '#fff',
                        borderRadius: '50%',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 0 3px rgba(255,255,255,0.2)',
                        transition: 'left 0.5s ease-out',
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: sentimentData.sentimentScore > 25 ? '#22C55E' :
                                      sentimentData.sentimentScore < -25 ? '#EF4444' : '#F59E0B',
                        }} />
                      </div>
                    </div>
                    {/* Scale markers */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>-100</span>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>0</span>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>+100</span>
                    </div>
                  </div>
                </div>

                {/* Right: Stats Grid */}
                <div className="sentiment-stats-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {/* Bullish Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.02) 100%)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: '12px',
                    padding: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      right: '-20px',
                      width: '80px',
                      height: '80px',
                      background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <TrendingUp size={16} color="#22C55E" />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>Bullish</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#22C55E' }}>{sentimentData.bullish}</span>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(34,197,94,0.7)' }}>
                        {sentimentData.total > 0 ? Math.round((sentimentData.bullish / sentimentData.total) * 100) : 0}%
                      </span>
                    </div>
                    {/* Mini bar */}
                    <div style={{ marginTop: '0.5rem', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${sentimentData.total > 0 ? (sentimentData.bullish / sentimentData.total) * 100 : 0}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #22C55E, #4ADE80)',
                        borderRadius: '2px',
                        transition: 'width 1s ease-out',
                      }} />
                    </div>
                  </div>

                  {/* Bearish Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '12px',
                    padding: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      right: '-20px',
                      width: '80px',
                      height: '80px',
                      background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <TrendingDown size={16} color="#EF4444" />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>Bearish</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#EF4444' }}>{sentimentData.bearish}</span>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(239,68,68,0.7)' }}>
                        {sentimentData.total > 0 ? Math.round((sentimentData.bearish / sentimentData.total) * 100) : 0}%
                      </span>
                    </div>
                    {/* Mini bar */}
                    <div style={{ marginTop: '0.5rem', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${sentimentData.total > 0 ? (sentimentData.bearish / sentimentData.total) * 100 : 0}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #EF4444, #F87171)',
                        borderRadius: '2px',
                        transition: 'width 1s ease-out',
                      }} />
                    </div>
                  </div>

                  {/* Neutral Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.02) 100%)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: '12px',
                    padding: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      right: '-20px',
                      width: '80px',
                      height: '80px',
                      background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Activity size={16} color="#F59E0B" />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>Neutral</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F59E0B' }}>{sentimentData.neutral}</span>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(245,158,11,0.7)' }}>
                        {sentimentData.total > 0 ? Math.round((sentimentData.neutral / sentimentData.total) * 100) : 0}%
                      </span>
                    </div>
                    {/* Mini bar */}
                    <div style={{ marginTop: '0.5rem', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${sentimentData.total > 0 ? (sentimentData.neutral / sentimentData.total) * 100 : 0}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                        borderRadius: '2px',
                        transition: 'width 1s ease-out',
                      }} />
                    </div>
                  </div>

                  {/* Impact & Breaking Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.02) 100%)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: '12px',
                    padding: '1rem',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      right: '-20px',
                      width: '80px',
                      height: '80px',
                      background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Zap size={16} color="#8B5CF6" />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>Impact Score</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#8B5CF6' }}>{sentimentData.avgNewsScore}</span>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(139,92,246,0.7)' }}>/10</span>
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        padding: '0.2rem 0.5rem',
                        background: 'rgba(239,68,68,0.2)',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        color: '#EF4444',
                        fontWeight: 600,
                      }}>
                        {sentimentData.breakingCount} Breaking
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>
                        {sentimentData.total} total
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <div style={{ width: '200px', height: '150px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }} />
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', height: '100px' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        </div>
        {/* END NEWS & FEED TAB CONTENT */}

        {/* TREND TOPICS TAB CONTENT */}
        <div 
          className={`mobile-tab-content ${activeTab === 'following' ? 'current' : ''}`}
        >
          <div style={{ padding: '0.5rem 0' }}>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={24} color="#00F5FF" />
              Trend Topics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {trendingTopics.length > 0 ? (
                trendingTopics.map((topic) => (
                  <div 
                    key={topic.topic}
                    onClick={() => {
                      setSearchQuery(topic.topic.toLowerCase());
                      setActiveTab('for-you');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ 
                      color: topic.rank <= 3 ? '#00F5FF' : 'rgba(255,255,255,0.5)', 
                      fontSize: '1.1rem', 
                      fontWeight: 700,
                      minWidth: '32px'
                    }}>
                      #{topic.rank}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>{topic.topic}</span>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {topic.count} mentions
                      </div>
                    </div>
                    <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                  </div>
                ))
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', padding: '2rem', textAlign: 'center' }}>
                  Loading trends...
                </div>
              )}
            </div>
          </div>
        </div>
        {/* END TREND TOPICS TAB CONTENT */}

        {/* MARKET SENTIMENT TAB CONTENT */}
        <div 
          className={`mobile-tab-content ${activeTab === 'ai' ? 'current' : ''}`}
        >
        <div className="sentiment-card" style={{
          background: 'linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(10,10,15,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle animated gradient background */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: sentimentData ? 
              (sentimentData.sentimentScore > 25 ? 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.08) 0%, transparent 50%)' :
               sentimentData.sentimentScore < -25 ? 'radial-gradient(ellipse at 30% 50%, rgba(239,68,68,0.08) 0%, transparent 50%)' :
               'radial-gradient(ellipse at 30% 50%, rgba(245,158,11,0.08) 0%, transparent 50%)') : 'none',
            animation: 'sentimentPulse 4s ease-in-out infinite',
            pointerEvents: 'none',
          }} />

          {/* Header */}
          <div className="sentiment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="sentiment-icon" style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(59,130,246,0.3) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Activity size={20} color="#A78BFA" />
              </div>
              <div>
                <h3 className="sentiment-title" style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Market Sentiment</h3>
                <span className="sentiment-subtitle" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Real-time market mood analysis</span>
              </div>
            </div>
            <div className="sentiment-period-btns" style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.25rem' }}>
              {(['24h', '7d', '30d'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSentimentPeriod(period)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: sentimentPeriod === period ? 'rgba(139,92,246,0.3)' : 'transparent',
                    color: sentimentPeriod === period ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {sentimentData ? (
            <div className="sentiment-card-inner" style={{ display: 'flex', gap: '2rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              
              {/* Left: Sentiment Score Display */}
              <div className="sentiment-left" style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Big Score Card */}
                <div style={{
                  background: sentimentData.sentimentScore > 25 ? 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)' :
                              sentimentData.sentimentScore < -25 ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)' :
                              'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
                  border: `1px solid ${sentimentData.sentimentScore > 25 ? 'rgba(34,197,94,0.3)' :
                                        sentimentData.sentimentScore < -25 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  borderRadius: '16px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Glow effect */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '120px',
                    height: '120px',
                    background: sentimentData.sentimentScore > 25 ? 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)' :
                                sentimentData.sentimentScore < -25 ? 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)' :
                                'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                  <div className="sentiment-score-display" style={{
                    fontSize: '3.5rem',
                    fontWeight: 800,
                    color: sentimentData.sentimentScore > 25 ? '#22C55E' :
                           sentimentData.sentimentScore < -25 ? '#EF4444' : '#F59E0B',
                    lineHeight: 1,
                    position: 'relative',
                  }}>
                    {sentimentData.sentimentScore > 0 ? '+' : ''}{sentimentData.sentimentScore}
                  </div>
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: sentimentData.sentimentScore > 25 ? '#22C55E' :
                           sentimentData.sentimentScore < -25 ? '#EF4444' : '#F59E0B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    position: 'relative',
                  }}>
                    {sentimentData.sentimentScore > 50 ? 'Very Bullish' :
                     sentimentData.sentimentScore > 25 ? 'Bullish' :
                     sentimentData.sentimentScore < -50 ? 'Very Bearish' :
                     sentimentData.sentimentScore < -25 ? 'Bearish' : 'Mixed'}
                  </div>
                </div>

                {/* Horizontal Sentiment Bar */}
                <div style={{ padding: '0 0.25rem' }}>
                  {/* Labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Bearish</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Bullish</span>
                  </div>
                  {/* Bar background with gradient */}
                  <div style={{
                    height: '10px',
                    borderRadius: '5px',
                    background: 'linear-gradient(90deg, #EF4444 0%, #F97316 25%, #F59E0B 50%, #84CC16 75%, #22C55E 100%)',
                    position: 'relative',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                  }}>
                    {/* Pointer/Indicator */}
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      left: `${((sentimentData.sentimentScore + 100) / 200) * 100}%`,
                      transform: 'translateX(-50%)',
                      width: '18px',
                      height: '18px',
                      background: '#fff',
                      borderRadius: '50%',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 0 3px rgba(255,255,255,0.2)',
                      transition: 'left 0.5s ease-out',
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: sentimentData.sentimentScore > 25 ? '#22C55E' :
                                    sentimentData.sentimentScore < -25 ? '#EF4444' : '#F59E0B',
                      }} />
                    </div>
                  </div>
                  {/* Scale markers */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>-100</span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>0</span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>+100</span>
                  </div>
                </div>
              </div>

              {/* Right: Stats Grid */}
              <div className="sentiment-stats-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {/* Bullish Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.02) 100%)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: '12px',
                  padding: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <TrendingUp size={16} color="#22C55E" />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>Bullish</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#22C55E' }}>{sentimentData.bullish}</span>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(34,197,94,0.7)' }}>
                      {sentimentData.total > 0 ? Math.round((sentimentData.bullish / sentimentData.total) * 100) : 0}%
                    </span>
                  </div>
                  {/* Mini bar */}
                  <div style={{ marginTop: '0.5rem', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${sentimentData.total > 0 ? (sentimentData.bullish / sentimentData.total) * 100 : 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #22C55E, #4ADE80)',
                      borderRadius: '2px',
                      transition: 'width 1s ease-out',
                    }} />
                  </div>
                </div>

                {/* Bearish Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '12px',
                  padding: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <TrendingDown size={16} color="#EF4444" />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>Bearish</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#EF4444' }}>{sentimentData.bearish}</span>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(239,68,68,0.7)' }}>
                      {sentimentData.total > 0 ? Math.round((sentimentData.bearish / sentimentData.total) * 100) : 0}%
                    </span>
                  </div>
                  {/* Mini bar */}
                  <div style={{ marginTop: '0.5rem', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${sentimentData.total > 0 ? (sentimentData.bearish / sentimentData.total) * 100 : 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #EF4444, #F87171)',
                      borderRadius: '2px',
                      transition: 'width 1s ease-out',
                    }} />
                  </div>
                </div>

                {/* Neutral Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.02) 100%)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '12px',
                  padding: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Activity size={16} color="#F59E0B" />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>Neutral</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F59E0B' }}>{sentimentData.neutral}</span>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(245,158,11,0.7)' }}>
                      {sentimentData.total > 0 ? Math.round((sentimentData.neutral / sentimentData.total) * 100) : 0}%
                    </span>
                  </div>
                  {/* Mini bar */}
                  <div style={{ marginTop: '0.5rem', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${sentimentData.total > 0 ? (sentimentData.neutral / sentimentData.total) * 100 : 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                      borderRadius: '2px',
                      transition: 'width 1s ease-out',
                    }} />
                  </div>
                </div>

                {/* Impact & Breaking Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.02) 100%)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: '12px',
                  padding: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Zap size={16} color="#8B5CF6" />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>Impact Score</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#8B5CF6' }}>{sentimentData.avgNewsScore}</span>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(139,92,246,0.7)' }}>/10</span>
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      padding: '0.2rem 0.5rem',
                      background: 'rgba(239,68,68,0.2)',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      color: '#EF4444',
                      fontWeight: 600,
                    }}>
                      {sentimentData.breakingCount} Breaking
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>
                      {sentimentData.total} total
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div style={{ width: '200px', height: '150px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }} />
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', height: '100px' }} />
                ))}
              </div>
            </div>
          )}

          {/* Sentiment Pulse Animation Style */}
          <style>{`
            @keyframes sentimentPulse {
              0%, 100% { opacity: 0.5; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.05); }
            }
          `}</style>
        </div>
        </div>
        {/* END MARKET SENTIMENT TAB CONTENT */}

        {/* Desktop: Filters and News List - visible on desktop, shown on mobile when for-you tab is active */}
        <div className={`desktop-only-content ${activeTab === 'for-you' ? 'current' : ''}`}>
        {/* Legacy Stats Cards - Hidden, using sentiment data now */}
        <div style={{ display: 'none', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Total News</div>
            <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>{stats.total}</div>
          </div>
          <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ color: '#22C55E', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendingUp size={12} /> Bullish
            </div>
            <div style={{ color: '#22C55E', fontSize: '1.5rem', fontWeight: 700 }}>{stats.bullish}</div>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ color: '#EF4444', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendingDown size={12} /> Bearish
            </div>
            <div style={{ color: '#EF4444', fontSize: '1.5rem', fontWeight: 700 }}>{stats.bearish}</div>
          </div>
          <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ color: '#F59E0B', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Neutral</div>
            <div style={{ color: '#F59E0B', fontSize: '1.5rem', fontWeight: 700 }}>{stats.neutral}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar no-swipe" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Category Filters */}
          <div style={{ 
            display: 'flex', 
            gap: '0',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}>
            {([
              { key: 'all', label: 'All' },
              { key: 'forex', label: 'Forex' },
              { key: 'crypto', label: 'Crypto' },
              { key: 'stocks', label: 'Stocks' },
              { key: 'commodities', label: 'Commodities' },
              { key: 'indices', label: 'Indices' }
            ] as const).map((filter) => (
              <button
                key={filter.key}
                onClick={() => setCategoryFilter(filter.key)}
                className="filter-button"
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  background: 'transparent',
                  color: categoryFilter === filter.key ? '#00F5FF' : 'rgba(255,255,255,0.5)',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {filter.label}
                {categoryFilter === filter.key && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: '0',
                    right: '0',
                    height: '2px',
                    background: '#00F5FF',
                    borderRadius: '2px 2px 0 0'
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Search & Clear */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: '1', minWidth: '150px', maxWidth: '300px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '0.5rem 2.25rem 0.5rem 2.25rem',
                  color: '#fff',
                  fontSize: '0.875rem',
                  width: '100%',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Clear search"
                >
                  <X size={12} color="rgba(255,255,255,0.6)" />
                </button>
              )}
            </div>
            <button
              onClick={() => fetchNews(true)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Refresh"
            >
              <RefreshCw size={16} color="rgba(255,255,255,0.5)" />
            </button>
          </div>
        </div>

        {/* News List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    padding: '1rem',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: '120px', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                      <div style={{ width: '80px', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                  <div style={{ width: '85%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '0.5rem' }} />
                  <div style={{ width: '60%', height: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
                </div>
              ))}
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </>
          ) : filteredNews.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No news found matching your filters
            </div>
          ) : (
            filteredNews.map((item) => {
              // Convert to NewsSignal format - Stage 1-2-3 format
              const stage3 = item.aiAnalysis?.stage3;
              const firstPosition = stage3?.positions?.[0];
              const newsSignal: NewsSignal = {
                id: String(item.id),
                title: item.content,
                source: item.source,
                published_at: item.publishedAt || item.time,
                category: item.aiAnalysis?.stage1?.category || item.category || 'general',
                signal: firstPosition?.direction || (stage3?.trade_decision === 'TRADE' ? 'BUY' : 'NO_TRADE'),
                score: stage3?.importance_score || 5,
                would_trade: stage3?.trade_decision === 'TRADE',
                time_horizon: firstPosition?.trade_type === 'scalping' ? 'immediate' : firstPosition?.trade_type === 'day_trading' ? 'short' : 'medium',
                risk_mode: 'neutral',
                is_breaking: item.isBreaking || false,
                summary: stage3?.overall_assessment || item.aiAnalysis?.stage1?.immediate_impact || '',
                ai_analysis: item.aiAnalysis,
              };
              return (
                <NewsSignalCard
                  key={item.id}
                  signal={newsSignal}
                  onAssetClick={(symbol) => {
                    setChartPopupSymbol(assetToTvSymbol(symbol));
                    setChartPopupOpen(true);
                  }}
                />
              );
            })
          )}
        </div>
        {/* END NEWS & FEED TAB - Filters and News List */}

        {/* TREND TOPICS TAB CONTENT */}
        <div className={`mobile-tab-trends ${activeTab === 'following' ? 'active' : ''}`}>
          <div style={{ padding: '0.5rem 0' }}>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={24} color="#00F5FF" />
              Trend Topics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {trendingTopics.length > 0 ? (
                trendingTopics.map((topic) => (
                  <div 
                    key={topic.topic}
                    onClick={() => {
                      setSearchQuery(topic.topic.toLowerCase());
                      setActiveTab('for-you');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,245,255,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(0,245,255,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }}
                  >
                    <span style={{ 
                      color: topic.rank <= 3 ? '#00F5FF' : 'rgba(255,255,255,0.5)', 
                      fontSize: '1.1rem', 
                      fontWeight: 700,
                      minWidth: '32px'
                    }}>
                      #{topic.rank}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>{topic.topic}</span>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {topic.count} mentions
                      </div>
                    </div>
                    <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                  </div>
                ))
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', padding: '2rem', textAlign: 'center' }}>
                  Loading trends...
                </div>
              )}
            </div>
          </div>
        </div>
        {/* END TREND TOPICS TAB CONTENT */}

        </div>
        {/* End of Desktop Only Content */}

        </div>
        {/* End of Left Column */}

      {/* Right Sidebar - Quick Stats */}
      <div className="news-right-sidebar" style={{
        width: '360px',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        overflow: 'auto',
        flexShrink: 0,
      }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Market Sentiment</h3>
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '12px', 
            padding: '1rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {/* Sentiment Bar */}
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ width: `${sentimentData && sentimentData.total > 0 ? (sentimentData.bullish / sentimentData.total) * 100 : 0}%`, background: '#22C55E' }} />
              <div style={{ width: `${sentimentData && sentimentData.total > 0 ? (sentimentData.neutral / sentimentData.total) * 100 : 0}%`, background: '#F59E0B' }} />
              <div style={{ width: `${sentimentData && sentimentData.total > 0 ? (sentimentData.bearish / sentimentData.total) * 100 : 0}%`, background: '#EF4444' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#22C55E' }}>Bullish {sentimentData && sentimentData.total > 0 ? Math.round((sentimentData.bullish / sentimentData.total) * 100) : 0}%</span>
              <span style={{ color: '#F59E0B' }}>Neutral {sentimentData && sentimentData.total > 0 ? Math.round((sentimentData.neutral / sentimentData.total) * 100) : 0}%</span>
              <span style={{ color: '#EF4444' }}>Bearish {sentimentData && sentimentData.total > 0 ? Math.round((sentimentData.bearish / sentimentData.total) * 100) : 0}%</span>
            </div>
          </div>
        </div>

        {/* New News Alert */}
        {stats.newCount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,245,255,0.1) 0%, rgba(139,92,246,0.1) 100%)',
            border: '1px solid rgba(0,245,255,0.3)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ color: '#00F5FF', fontSize: '1.5rem', fontWeight: 700 }}>{stats.newCount}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>New articles in last 5 min</div>
          </div>
        )}

        {/* Trending Topics - Real Data */}
        <div>
          <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Trending Topics</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {trendingTopics.length > 0 ? (
              trendingTopics.map((topic) => (
                <div 
                  key={topic.topic}
                  onClick={() => setSearchQuery(topic.topic.toLowerCase())}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,245,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(0,245,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  }}
                >
                  <span style={{ 
                    color: topic.rank <= 3 ? '#00F5FF' : 'rgba(255,255,255,0.4)', 
                    fontSize: '0.75rem', 
                    fontWeight: 700,
                    minWidth: '24px'
                  }}>
                    #{topic.rank}
                  </span>
                  <span style={{ color: '#fff', fontWeight: 500, flex: 1 }}>{topic.topic}</span>
                  <span style={{ 
                    color: 'rgba(255,255,255,0.4)', 
                    fontSize: '0.7rem',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {topic.count}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                Loading trends...
              </div>
            )}
          </div>
        </div>
      </div>
      {/* End of Right Sidebar */}
      </div>
      {/* End of Two Column Layout */}
      </div>
      {/* End of Main Content */}

      {/* TradingView Chart Popup (desktop) */}
      {chartPopupOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="TradingView chart"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setChartPopupOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              height: '80vh',
              maxHeight: '600px',
              background: '#0D1117',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.3)',
              flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                {chartPopupSymbol}
              </span>
              <button
                type="button"
                onClick={() => setChartPopupOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                }}
                aria-label="Close chart"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <iframe
                title={`TradingView Chart ${chartPopupSymbol}`}
                src={`https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(chartPopupSymbol)}&interval=1&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=true&hide_side_toolbar=false&allow_symbol_change=true&save_image=true&hideideas=true`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function NewsFeedPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#0A0A0B'
      }}>
        <Loader2 style={{ width: '32px', height: '32px', color: '#00E5FF', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <NewsFeedContent />
    </Suspense>
  );
}
