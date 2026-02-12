'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
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
  X,
  Lock
} from 'lucide-react';
import { EnhancedNewsCard, type AIAnalysis } from '@/components/news/NewsAnalysisCard';
import NewsSignalCard, { type NewsSignal } from '@/components/dashboard/NewsSignalCard';
import { getTerminalCache, setTerminalCache, isCacheValid } from '@/lib/store/terminalCache';
import { useTerminal } from '@/lib/context/TerminalContext';
import { getCategoryColors, getCategoryLabel, getCanonicalCategory } from '@/lib/utils/news-categories';
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
  category?: 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices' | 'general' | 'macro';
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
  excludedLowImpactCount?: number;
  overallSentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed';
  sentimentScore: number;
  avgNewsScore: number;
  breakingCount: number;
  topSources: { source: string; count: number; avgScore: number }[];
  categoryBreakdown: { category: string; bullish: number; bearish: number; neutral: number }[];
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
  const t = useTranslations('newsPage');
  if (!credibility) return null;
  
  // Only show for Tier 1 (Elite) and Tier 2 (Trusted) sources
  if (credibility.tier > 2) return null;
  
  const isElite = credibility.tier === 1;
  
  return (
    <span
      title={isElite ? t('eliteSource') : t('trustedSource')}
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

function NewsFeedContent() {
  const t = useTranslations('newsPage');
  const locale = useLocale();
    const normalizeAiAnalysis = (item: any) => {
      const ai = item?.aiAnalysis;
      if (!ai || !ai.stage3) return ai;

      const stage3 = { ...ai.stage3 };
      const positions = Array.isArray(stage3.positions) ? stage3.positions : [];
      const firstPos = positions[0] as { confidence?: number } | undefined;

      if (!stage3.news_sentiment && item?.sentiment) {
        stage3.news_sentiment = String(item.sentiment).toUpperCase();
      }

      if (stage3.conviction == null) {
        stage3.conviction = (ai.stage3 as any)?.conviction
          ?? (item as any).conviction
          ?? item.importanceScore
          ?? ai.stage3?.importance_score
          ?? firstPos?.confidence
          ?? 5;
      }

      return { ...ai, stage3 };
    };
  const router = useRouter();
  const { isScrollingDown, isPremium } = useTerminal();
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
  // Opened news detail: when user opens a news not in current page, show in modal (no list insert)
  const [openedNewsDetail, setOpenedNewsDetail] = useState<NewsItem | null>(null);
  
  // Time ticker for updating relative times (e.g., "2m ago")
  const [, setTimeTick] = useState(0);
  const hasScrolledToNews = useRef<string | null>(null); // Track which newsId we scrolled to
  const hasFetchedSingleNewsRef = useRef<string | null>(null); // Avoid re-fetching when news not in first page
  
  // New posts notification
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [showNewPostsBanner, setShowNewPostsBanner] = useState(false);
  const lastNewsIdRef = useRef<string | null>(null);
  const userScrolledRef = useRef(false);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  // Pagination: 20 per page, load more on scroll
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const NEWS_PAGE_SIZE = 20;
  // Breaking news: last 24h from API (not from paginated news list)
  const [breakingNews, setBreakingNews] = useState<NewsItem[]>([]);
  // Trending topics: last 7 days from API (not from paginated news list)
  const [trendingNewsLast7d, setTrendingNewsLast7d] = useState<NewsItem[]>([]);

  // Handle newsId from URL (from notification/breaking-news click) — scroll to item or fetch single if not in current page
  useEffect(() => {
    const newsIdParam = searchParams.get('newsId');
    if (!newsIdParam || hasScrolledToNews.current === newsIdParam) return;

    const foundNews = news.find(
      (n) =>
        n.newsId === newsIdParam ||
        n.id?.toString() === newsIdParam ||
        String(n.id) === newsIdParam
    );

    if (foundNews) {
      hasScrolledToNews.current = newsIdParam;
      setSelectedNewsId(foundNews.id);
      const scrollToNews = (retries = 5) => {
        const elementId = `news-card-${newsIdParam}`;
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'box-shadow 0.3s ease';
          el.style.boxShadow = '0 0 20px rgba(0,245,255,0.5)';
          setTimeout(() => { el.style.boxShadow = ''; }, 2000);
        } else if (retries > 0) {
          setTimeout(() => scrollToNews(retries - 1), 500);
        }
      };
      setTimeout(() => scrollToNews(), 300);
      return;
    }

    // Item not in current list — fetch single and show in modal (do not insert into list)
    if (hasFetchedSingleNewsRef.current === newsIdParam) return;
    hasFetchedSingleNewsRef.current = newsIdParam;

    fetch(`/api/news?newsId=${encodeURIComponent(newsIdParam)}`)
      .then((res) => res.json())
      .then((data: { news?: NewsItem[] }) => {
        const single = data?.news?.[0];
        if (!single) return;
        setOpenedNewsDetail(single);
      })
      .catch(() => {});
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

  // Fetch news - first page (20 items), check cache for same period
  const fetchNews = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cache = getTerminalCache();
        if (cache?.news && isCacheValid(cache.news.timestamp) && cache.news.period === sentimentPeriod) {
          setNews((cache.news.items || []) as NewsItem[]);
          setHasMoreNews(true);
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch(`/api/news?limit=${NEWS_PAGE_SIZE}&offset=0&period=${sentimentPeriod}`);
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
      setHasMoreNews(newNews.length === NEWS_PAGE_SIZE);
      setTerminalCache({
        news: { items: newNews, timestamp: Date.now(), period: sentimentPeriod }
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching news:', error);
      setIsLoading(false);
    }
  };

  // Load next page (20 more) on scroll
  const loadMoreNews = useCallback(async () => {
    if (loadingMore || !hasMoreNews) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/news?limit=${NEWS_PAGE_SIZE}&offset=${news.length}&period=${sentimentPeriod}`);
      const data = await response.json();
      const moreNews = (data.news || []) as NewsItem[];
      setNews(prev => [...prev, ...moreNews]);
      setHasMoreNews(moreNews.length === NEWS_PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more news:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [news.length, sentimentPeriod, loadingMore, hasMoreNews]);

  // Fetch breaking news: last 24h only (independent of paginated news list)
  const fetchBreakingNews = useCallback(async () => {
    try {
      const response = await fetch('/api/news?breaking=true&period=24h&limit=100');
      const data = await response.json();
      setBreakingNews((data.news || []) as NewsItem[]);
    } catch (error) {
      console.error('Error fetching breaking news:', error);
    }
  }, []);

  // Fetch news for trending topics: last 7 days (independent of paginated news list)
  const fetchTrendingNews = useCallback(async () => {
    try {
      const response = await fetch('/api/news?period=7d&limit=300');
      const data = await response.json();
      setTrendingNewsLast7d((data.news || []) as NewsItem[]);
    } catch (error) {
      console.error('Error fetching trending news:', error);
    }
  }, []);

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
    fetchBreakingNews();
    fetchTrendingNews();

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
          fetchNews(true);
          fetchBreakingNews();
        }
      )
      .subscribe((status) => {
        console.log('🔴 Realtime subscription status:', status);
      });

    // Fallback polling every 60 seconds (reduced from 30s since we have realtime)
    const newsInterval = setInterval(fetchNews, 60000);
    const sentimentInterval = setInterval(fetchSentiment, 60000);
    const breakingInterval = setInterval(fetchBreakingNews, 60000);
    const trendingInterval = setInterval(fetchTrendingNews, 5 * 60 * 1000); // trending: every 5 min
    // Update time display every 10 seconds for real-time feel
    const timeTickInterval = setInterval(() => setTimeTick(t => t + 1), 10000);

    return () => {
      // Cleanup realtime subscription
      supabase.removeChannel(channel);
      clearInterval(newsInterval);
      clearInterval(sentimentInterval);
      clearInterval(breakingInterval);
      clearInterval(trendingInterval);
      clearInterval(timeTickInterval);
    };
  }, [fetchBreakingNews, fetchTrendingNews]);

  const prevSentimentPeriodRef = useRef(sentimentPeriod);
  useEffect(() => {
    fetchSentiment();
    if (prevSentimentPeriodRef.current !== sentimentPeriod) {
      prevSentimentPeriodRef.current = sentimentPeriod;
      setNews([]);
      setHasMoreNews(true);
      fetchNews(true); // Refetch first page when period changes
    }
  }, [sentimentPeriod]);

  // Load more when user scrolls near bottom (desktop: left column scroll)
  useEffect(() => {
    const el = desktopScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollTop + clientHeight >= scrollHeight - 400 && hasMoreNews && !loadingMore) {
        loadMoreNews();
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMoreNews, loadingMore, loadMoreNews]);

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
    const source = trendingNewsLast7d.length > 0 ? trendingNewsLast7d : news;

    source.forEach(item => {
      const words = (item.content || '')
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

    // Sentiment filter - use AI's direct news_sentiment (independent of trade decision)
    const aiSentiment = item.aiAnalysis?.stage3?.news_sentiment?.toLowerCase();
    const itemSentiment = aiSentiment === 'bullish' ? 'bullish' : aiSentiment === 'bearish' ? 'bearish' : (item.analysis?.sentiment || 'neutral');
    if (activeFilter !== 'all' && itemSentiment !== activeFilter) return false;
    
    // Category filter: canonical category (same as display) + macro (macro affects all markets, show in every category)
    const itemCategory = getCanonicalCategory(item);
    if (categoryFilter !== 'all' && itemCategory !== categoryFilter && itemCategory !== 'macro') return false;
    
    // Search filter
    if (searchQuery && !item.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Basic users: when searching, hide locked news so they can't infer the search term relates to a locked chart
    if (!isPremium && searchQuery.trim()) {
      const hasTrade = item.aiAnalysis?.stage3?.trade_decision === 'TRADE';
      if (item.isBreaking || hasTrade) return false;
    }

    return true;
  });

  // Stats: same as /api/news/sentiment — exclude low impact (score < 6) so bar and counts match API
  const MIN_IMPACT_SCORE = 6;
  const newsForStats = news.filter(n => (n.analysis?.score ?? 0) >= MIN_IMPACT_SCORE);
  const stats = {
    total: newsForStats.length,
    bullish: newsForStats.filter(n => n.analysis?.sentiment === 'bullish').length,
    bearish: newsForStats.filter(n => n.analysis?.sentiment === 'bearish').length,
    neutral: newsForStats.filter(n => n.analysis?.sentiment === 'neutral').length,
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
      <>
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
          loadMoreNews={loadMoreNews}
          hasMoreNews={hasMoreNews}
          loadingMore={loadingMore}
        />
        {/* Opened news detail modal — same as desktop so mobile can open news not in list */}
        {openedNewsDetail && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="News article"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => {
              setOpenedNewsDetail(null);
              hasFetchedSingleNewsRef.current = null;
              router.replace('/terminal/news');
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '100%',
                maxHeight: '90vh',
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
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{t('openedArticle')}</span>
                <button
                  type="button"
                  onClick={() => { setOpenedNewsDetail(null); hasFetchedSingleNewsRef.current = null; router.replace('/terminal/news'); }}
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
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ overflow: 'auto', padding: '16px', flex: 1, WebkitOverflowScrolling: 'touch' }}>
                <NewsSignalCard
                  signal={{
                    id: String(openedNewsDetail.id),
                    title: openedNewsDetail.content,
                    source: openedNewsDetail.source,
                    published_at: openedNewsDetail.publishedAt || openedNewsDetail.time,
                    category: getCanonicalCategory(openedNewsDetail),
                    signal: openedNewsDetail.aiAnalysis?.stage3?.positions?.[0]?.direction || (openedNewsDetail.aiAnalysis?.stage3?.trade_decision === 'TRADE' ? 'BUY' : 'NO_TRADE'),
                    score: openedNewsDetail.aiAnalysis?.stage3?.importance_score || 5,
                    would_trade: openedNewsDetail.aiAnalysis?.stage3?.trade_decision === 'TRADE',
                    time_horizon: openedNewsDetail.aiAnalysis?.stage3?.positions?.[0]?.trade_type === 'scalping' ? 'immediate' : openedNewsDetail.aiAnalysis?.stage3?.positions?.[0]?.trade_type === 'day_trading' ? 'short' : 'medium',
                    risk_mode: 'neutral',
                    is_breaking: openedNewsDetail.isBreaking || false,
                    summary: openedNewsDetail.aiAnalysis?.stage3?.overall_assessment || openedNewsDetail.aiAnalysis?.stage1?.immediate_impact || '',
                    ai_analysis: normalizeAiAnalysis(openedNewsDetail),
                  }}
                  onAssetClick={(symbol) => {
                    setChartPopupSymbol(symbol);
                    setChartPopupOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {/* Chart popup — same as desktop for asset click from modal */}
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
              padding: '16px',
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setChartPopupOpen(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '100%',
                height: '70vh',
                maxHeight: '500px',
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
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{chartPopupSymbol}</span>
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
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                />
              </div>
            </div>
          </div>
        )}
      </>
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
          {newPostsCount > 1 ? t('newPostsPlural', { count: newPostsCount }) : t('newPosts', { count: newPostsCount })}
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
              {t('hearTheWorldFirst')}
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
            {t('tabNewsFeed')}
          </button>
          <button 
            className={`news-tab ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            {t('tabTrendTopics')}
          </button>
          <button 
            className={`news-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            {t('tabMarketSentiment')}
          </button>
        </div>

        {/* Content Area - Two Column Layout */}
        <div className="news-two-column" style={{ flex: 1, display: 'flex', overflow: 'hidden', margin: 0, padding: 0 }}>
          
          {/* Left Column - News Feed */}
          <div 
            ref={desktopScrollRef}
            className="news-left-column terminal-scrollbar" 
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
                  {t('breakingNews')}
                </span>
                <span style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                }}>
                  {breakingNews.length} {t('live')}
                </span>
              </div>
              <span style={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: '0.65rem',
                fontFamily: 'monospace',
              }}>
                {new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* News Ticker + Footer: locked (blur + overlay) for basic users; header above stays visible */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {!isPremium && (
                <Link
                  href="/#pricing"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'rgba(255,255,255,0.95)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    zIndex: 2,
                  }}
                >
                  <Lock size={32} strokeWidth={2} />
                  <span>{t('upgradeBreakingNews')}</span>
                </Link>
              )}
              <div style={!isPremium ? { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
            {/* News Ticker / Feed */}
            <div className="terminal-scrollbar" style={{ maxHeight: '320px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
              {breakingNews.map((item, index) => {
                const publishedTime = new Date(item.publishedAt || item.time);
                const now = new Date();
                const totalMinutes = Math.floor((now.getTime() - publishedTime.getTime()) / (1000 * 60));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                const timeDisplay = hours > 0 
                  ? t('timeHours', { hours, minutes }) 
                  : minutes > 0 
                    ? t('timeMinutes', { minutes }) 
                    : t('now');
                
                const isVeryRecent = totalMinutes < 15;
                const isRecent = totalMinutes < 60;
                
                // Stage 1-2-3 format: stage3.trade_decision and positions[0].direction
                const tradeDecision = item.aiAnalysis?.stage3?.trade_decision;
                const firstPosition = item.aiAnalysis?.stage3?.positions?.[0];
                const isBullish = tradeDecision === 'TRADE' && firstPosition?.direction === 'BUY';
                const isBearish = tradeDecision === 'TRADE' && firstPosition?.direction === 'SELL';
                
                const newsId = item.newsId ?? item.id;
                const newsHref = `/terminal/news?newsId=${encodeURIComponent(String(newsId))}`;
                return (
                  <Link
                    key={`breaking-${newsId}-${index}`}
                    href={newsHref}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      borderBottom: index < breakingNews.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      background: isVeryRecent ? 'rgba(220,38,38,0.08)' : 'transparent',
                      textDecoration: 'none',
                      color: 'inherit',
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
                          {t('urgent')}
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
                        {(() => {
                          const displayCategory = getCanonicalCategory(item);
                          if (!displayCategory || displayCategory === 'general') return null;
                          const colors = getCategoryColors(displayCategory);
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
                              {getCategoryLabel(displayCategory)}
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
                  </Link>
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
                {t('updatedRealtime')}
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.65rem',
              }}>
                <RefreshCw size={10} />
                {t('autoRefresh')}
              </div>
            </div>
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
                <h3 className="sentiment-title" style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{t('marketSentiment')}</h3>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 500, marginLeft: '0.5rem' }}>{t('sentimentSubtitle')}</span>
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
                      {sentimentData.sentimentScore > 50 ? t('veryBullish') :
                       sentimentData.sentimentScore > 25 ? t('bullish') :
                       sentimentData.sentimentScore < -50 ? t('veryBearish') :
                       sentimentData.sentimentScore < -25 ? t('bearish') : t('mixed')}
                    </div>
                  </div>

                  {/* Horizontal Sentiment Bar */}
                  <div style={{ padding: '0 0.25rem' }}>
                    {/* Labels */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{t('bearishLabel')}</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{t('bullishLabel')}</span>
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
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{t('bullish')}</span>
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
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{t('bearish')}</span>
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
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{t('neutral')}</span>
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
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{t('impactScore')}</span>
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
                        {t('breakingCount', { count: sentimentData.breakingCount })}
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>
                        {t('totalCount', { count: sentimentData.total })}
                        {(sentimentData.excludedLowImpactCount ?? 0) > 0 && (
                          <> · {t('lowImpactExcluded', { count: sentimentData.excludedLowImpactCount ?? 0 })}</>
                        )}
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
              {t('trendTopics')}
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
                        {t('mentions', { count: topic.count })}
                      </div>
                    </div>
                    <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                  </div>
                ))
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', padding: '2rem', textAlign: 'center' }}>
                  {t('loadingTrends')}
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
                <h3 className="sentiment-title" style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{t('marketSentiment')}</h3>
                <span className="sentiment-subtitle" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{t('sentimentSubtitleShort')}</span>
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
                    {sentimentData.sentimentScore > 50 ? t('veryBullish') :
                     sentimentData.sentimentScore > 25 ? t('bullish') :
                     sentimentData.sentimentScore < -50 ? t('veryBearish') :
                     sentimentData.sentimentScore < -25 ? t('bearish') : t('mixed')}
                  </div>
                </div>

                {/* Horizontal Sentiment Bar */}
                <div style={{ padding: '0 0.25rem' }}>
                  {/* Labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{t('bearishLabel')}</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{t('bullishLabel')}</span>
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
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{t('bullish')}</span>
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
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{t('bearish')}</span>
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
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{t('neutral')}</span>
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
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{t('impactScore')}</span>
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
                      {t('breakingCount', { count: sentimentData.breakingCount })}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>
                      {t('totalCount', { count: sentimentData.total })}
                      {(sentimentData.excludedLowImpactCount ?? 0) > 0 && (
                        <> · {t('lowImpactExcluded', { count: sentimentData.excludedLowImpactCount ?? 0 })}</>
                      )}
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
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{t('totalNews')}</div>
            <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700 }}>{stats.total}</div>
          </div>
          <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ color: '#22C55E', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendingUp size={12} /> {t('bullish')}
            </div>
            <div style={{ color: '#22C55E', fontSize: '1.5rem', fontWeight: 700 }}>{stats.bullish}</div>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ color: '#EF4444', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendingDown size={12} /> {t('bearish')}
            </div>
            <div style={{ color: '#EF4444', fontSize: '1.5rem', fontWeight: 700 }}>{stats.bearish}</div>
          </div>
          <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ color: '#F59E0B', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{t('neutral')}</div>
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
              { key: 'all' as const, label: t('filterAll') },
              { key: 'forex' as const, label: t('filterForex') },
              { key: 'crypto' as const, label: t('filterCrypto') },
              { key: 'stocks' as const, label: t('filterStocks') },
              { key: 'commodities' as const, label: t('filterCommodities') },
              { key: 'indices' as const, label: t('filterIndices') },
              { key: 'earnings' as const, label: t('filterEarnings') }
            ]).map((filter) => (
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
                placeholder={t('searchPlaceholder')}
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
                  title={t('clearSearch')}
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
              title={t('refresh')}
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
              {t('noNewsFound')}
            </div>
          ) : (
            filteredNews.map((item, index) => {
              // Convert to NewsSignal format - Stage 1-2-3 format
              const normalizedAnalysis = normalizeAiAnalysis(item);
              const stage3 = normalizedAnalysis?.stage3;
              const firstPosition = stage3?.positions?.[0];
              const newsSignal: NewsSignal = {
                id: String(item.id),
                title: item.content,
                source: item.source,
                published_at: item.publishedAt || item.time,
                category: getCanonicalCategory(item),
                signal: firstPosition?.direction || (stage3?.trade_decision === 'TRADE' ? 'BUY' : 'NO_TRADE'),
                score: stage3?.importance_score || 5,
                would_trade: stage3?.trade_decision === 'TRADE',
                time_horizon: firstPosition?.trade_type === 'scalping' ? 'immediate' : firstPosition?.trade_type === 'day_trading' ? 'short' : 'medium',
                risk_mode: 'neutral',
                is_breaking: item.isBreaking || false,
                summary: stage3?.overall_assessment || item.aiAnalysis?.stage1?.immediate_impact || '',
                ai_analysis: normalizedAnalysis,
              };
              const hasTrade = newsSignal.would_trade || newsSignal.signal !== 'NO_TRADE';
              const isLockedForBasic = !isPremium && (item.isBreaking || hasTrade);
              const cardId = `news-card-${item.newsId ?? item.id}`;
              return (
                <div key={`news-${item.id}-${index}`} id={cardId} style={{ position: 'relative' }}>
                  <div style={isLockedForBasic ? { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
                    <NewsSignalCard
                      signal={newsSignal}
                      onAssetClick={(symbol) => {
                        setChartPopupSymbol(symbol);
                        setChartPopupOpen(true);
                      }}
                    />
                  </div>
                  {isLockedForBasic && (
                    <Link
                      href="/#pricing"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        background: 'rgba(0,0,0,0.35)',
                        borderRadius: '8px',
                        color: 'rgba(255,255,255,0.95)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <Lock size={28} strokeWidth={2} />
                      <span>{t('upgradeAnalysis')}</span>
                    </Link>
                  )}
                </div>
              );
            })
          )}
          {loadingMore && (
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
              <span>{t('loadingMore')}</span>
            </div>
          )}
        </div>
        {/* END NEWS & FEED TAB - Filters and News List */}

        {/* TREND TOPICS TAB CONTENT */}
        <div className={`mobile-tab-trends ${activeTab === 'following' ? 'active' : ''}`}>
          <div style={{ padding: '0.5rem 0' }}>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={24} color="#00F5FF" />
              {t('trendTopics')}
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
                        {t('mentions', { count: topic.count })}
                      </div>
                    </div>
                    <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                  </div>
                ))
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', padding: '2rem', textAlign: 'center' }}>
                  {t('loadingTrends')}
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
          <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>{t('marketSentiment')}</h3>
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
              <span style={{ color: '#22C55E' }}>{t('bullish')} {sentimentData && sentimentData.total > 0 ? Math.round((sentimentData.bullish / sentimentData.total) * 100) : 0}%</span>
              <span style={{ color: '#F59E0B' }}>{t('neutral')} {sentimentData && sentimentData.total > 0 ? Math.round((sentimentData.neutral / sentimentData.total) * 100) : 0}%</span>
              <span style={{ color: '#EF4444' }}>{t('bearish')} {sentimentData && sentimentData.total > 0 ? Math.round((sentimentData.bearish / sentimentData.total) * 100) : 0}%</span>
            </div>
            {(sentimentData?.excludedLowImpactCount ?? 0) > 0 && (
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                {t('lowImpactExcluded', { count: sentimentData?.excludedLowImpactCount ?? 0 })}
              </div>
            )}
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
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{t('newArticles')}</div>
          </div>
        )}

        {/* Trending Topics - Real Data */}
        <div>
          <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>{t('trendingTopics')}</h3>
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
                {t('loadingTrends')}
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

      {/* Opened news detail modal — when user opens a news not in current page */}
      {openedNewsDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="News article"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => {
            setOpenedNewsDetail(null);
            hasFetchedSingleNewsRef.current = null;
            router.replace('/terminal/news');
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
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
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{t('openedArticle')}</span>
              <button
                type="button"
                onClick={() => { setOpenedNewsDetail(null); hasFetchedSingleNewsRef.current = null; router.replace('/terminal/news'); }}
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
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ overflow: 'auto', padding: '16px', flex: 1 }}>
              <NewsSignalCard
                signal={{
                  id: String(openedNewsDetail.id),
                  title: openedNewsDetail.content,
                  source: openedNewsDetail.source,
                  published_at: openedNewsDetail.publishedAt || openedNewsDetail.time,
                  category: getCanonicalCategory(openedNewsDetail),
                  signal: openedNewsDetail.aiAnalysis?.stage3?.positions?.[0]?.direction || (openedNewsDetail.aiAnalysis?.stage3?.trade_decision === 'TRADE' ? 'BUY' : 'NO_TRADE'),
                  score: openedNewsDetail.aiAnalysis?.stage3?.importance_score || 5,
                  would_trade: openedNewsDetail.aiAnalysis?.stage3?.trade_decision === 'TRADE',
                  time_horizon: openedNewsDetail.aiAnalysis?.stage3?.positions?.[0]?.trade_type === 'scalping' ? 'immediate' : openedNewsDetail.aiAnalysis?.stage3?.positions?.[0]?.trade_type === 'day_trading' ? 'short' : 'medium',
                  risk_mode: 'neutral',
                  is_breaking: openedNewsDetail.isBreaking || false,
                  summary: openedNewsDetail.aiAnalysis?.stage3?.overall_assessment || openedNewsDetail.aiAnalysis?.stage1?.immediate_impact || '',
                  ai_analysis: normalizeAiAnalysis(openedNewsDetail),
                }}
                onAssetClick={(symbol) => {
                  setChartPopupSymbol(symbol);
                  setChartPopupOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

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
