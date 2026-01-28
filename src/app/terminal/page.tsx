'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Zap,
  BarChart3,
  Newspaper
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCachedUser, fetchAndCacheUser, clearUserCache } from '@/lib/userCache';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Trading pair type for TradingView-compatible tickers
interface TradingPair {
  symbol: string;  // Display name: "$BTC", "EUR/USD", "$AAPL"
  ticker: string;  // TradingView ID: "BINANCE:BTCUSDT", "FX:EURUSD", "NASDAQ:AAPL"
}

// Signal system types
type TradeSignal = 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL' | 'NO_TRADE';

// Full AI Analysis types (from analyze-news API)
interface AIBreakingNews {
  isBreaking: boolean;
  urgencyLevel: 'critical' | 'elevated' | 'normal';
  responseWindow: 'minutes' | 'hours' | 'days';
}

interface AIInformationQuality {
  sourceType: 'primary' | 'secondary';
  confidence: 'confirmed' | 'likely' | 'speculative';
}

interface AINoveltyAssessment {
  isNew: boolean;
  pricedInScore: number;
  reasoning: string;
}

interface AIMarketContextFit {
  currentRegime: 'risk-on' | 'risk-off' | 'neutral';
  regimeEffect: 'amplifies' | 'dampens' | 'neutral';
  priceActionConflict: boolean;
}

interface AIFlowAnalysis {
  primaryActors: string[];
  forcedFlows: boolean;
  expectedMagnitude: 'negligible' | 'minor' | 'moderate' | 'significant' | 'massive';
}

interface AIAnalysisCore {
  sentiment: 'strong_bullish' | 'bullish' | 'lean_bullish' | 'neutral' | 'lean_bearish' | 'bearish' | 'strong_bearish';
  conviction: number;
  timeHorizon: 'intraday' | 'days' | 'weeks' | 'structural';
  thesis: string;
  secondOrderEffects: string;
  keyRisk: string;
}

interface AITrade {
  wouldTrade: boolean;
  direction: 'long' | 'short' | 'none';
  primaryAsset: string;
  alternativeAssets: string[];
  rationale: string;
  invalidation: string;
  riskReward: 'poor' | 'fair' | 'good' | 'excellent';
}

interface AIFullAnalysis {
  breakingNews: AIBreakingNews;
  informationQuality: AIInformationQuality;
  noveltyAssessment: AINoveltyAssessment;
  marketContextFit: AIMarketContextFit;
  flowAnalysis: AIFlowAnalysis;
  analysis: AIAnalysisCore;
  trade: AITrade;
  meta: {
    relatedAssets: string[];
    category: 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices' | 'macro';
  };
}

// News item type
interface NewsItem {
  id: number;
  source: string;
  handle: string;
  avatar: string;
  content: string;
  time: string;
  publishedAt?: string; // ISO timestamp for freshness check
  sourceLabel: string;
  url?: string;
  category?: 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices' | 'general';
  analysis?: {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    score: number;
    summary: string;
    impact: string;
    risk?: string;
    tradingPairs: TradingPair[];
  };
  // NEW: Signal system
  signal?: {
    timeHorizon: 'short' | 'swing' | 'macro';
    riskMode: 'risk-on' | 'risk-off' | 'neutral';
    wouldTrade: boolean;
    signal: TradeSignal;
    signalBlocked: boolean;
    blockReason?: string | null;
  };
  // Full AI Analysis from analyze-news API
  aiAnalysis?: AIFullAnalysis;
  isAnalyzing?: boolean;
}

// Fallback mock news data
const mockNews: NewsItem[] = [
  {
    id: 1,
    source: 'CoinDesk',
    handle: '@CoinDesk',
    avatar: 'https://pbs.twimg.com/profile_images/1745878708513972224/r3s6_yvP_400x400.jpg',
    content: 'Loading latest crypto news...',
    time: 'just now',
    sourceLabel: 'CoinDesk'
  }
];

// Time ago helper
const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};

// Check if news is fresh (published within last 5 minutes)
const isNewNews = (publishedAt?: string): boolean => {
  if (!publishedAt) return false;
  const publishedDate = new Date(publishedAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - publishedDate.getTime()) / (1000 * 60);
  return diffMinutes <= 5;
};

function TerminalPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [news, setNews] = useState<NewsItem[]>(mockNews);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [utcTime, setUtcTime] = useState('');
  const [user, setUser] = useState<SupabaseUser | null>(null);

  // Initialize from cache for instant display
  const cachedUser = typeof window !== 'undefined' ? getCachedUser() : null;
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(cachedUser?.avatarUrl || null);
  const [profileName, setProfileName] = useState<string | null>(cachedUser?.name || null);
  const [userPlan, setUserPlan] = useState<string | null>(cachedUser?.plan || null);
  const [userTradingViewId, setUserTradingViewId] = useState<string | null>(cachedUser?.tradingViewId || null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // TradingView ID popup states
  const [showTradingViewPopup, setShowTradingViewPopup] = useState(false);
  const [tradingViewPopupInput, setTradingViewPopupInput] = useState('');
  const [dontWantIndicators, setDontWantIndicators] = useState(false);
  const [isSubmittingTradingView, setIsSubmittingTradingView] = useState(false);
  
  const supabase = createClient();

  // Fetch user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const checkoutStatus = searchParams?.get('checkout');
        if (checkoutStatus === 'success') {
          clearUserCache();
        }
        // Use cache service - will update cache automatically
        const cachedData = await fetchAndCacheUser(user.id, user.email || '');
        if (cachedData) {
          setProfileAvatarUrl(cachedData.avatarUrl || null);
          setProfileName(cachedData.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
          setUserPlan(cachedData.plan || 'basic');
          setUserTradingViewId(cachedData.tradingViewId || null);
        } else {
          setProfileAvatarUrl(null);
          setProfileName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
        }
      }
    };
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

    // After checkout success, poll for updated plan (webhook may take time)
    useEffect(() => {
      const checkoutStatus = searchParams?.get('checkout');
      if (checkoutStatus !== 'success') return;
      if (!user?.id || !user?.email) return;

      let attempts = 0;
      const maxAttempts = 20;

      const poll = async () => {
        attempts += 1;
        const fresh = await fetchAndCacheUser(user.id, user.email || '', { refresh: true });
        if (fresh?.plan && fresh.plan !== 'basic') {
          setUserPlan(fresh.plan);
          setUserTradingViewId(fresh.tradingViewId || null);
          if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }
          return;
        }

        if (attempts >= maxAttempts && refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };

      refreshTimerRef.current = setInterval(poll, 3000);
      poll();

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };
    }, [searchParams, user?.id, user?.email]);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // TradingView popup detection for Ultimate/Lifetime users
  useEffect(() => {
    if (userPlan && ['ultimate', 'lifetime'].includes(userPlan) && !userTradingViewId) {
      setShowTradingViewPopup(true);
    }
  }, [userPlan, userTradingViewId]);
  
  // Handle TradingView popup submit
  const handleTradingViewPopupSubmit = async () => {
    if (!dontWantIndicators && !tradingViewPopupInput.trim()) return;
    
    setIsSubmittingTradingView(true);
    try {
      const valueToSave = dontWantIndicators ? 'NO_INDICATORS' : tradingViewPopupInput.trim();
      
      // Get user ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      
      // Update via API (handles correct column name)
      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authUser.id,
          tradingViewId: valueToSave,
        }),
      });
      
      if (!response.ok) {
        console.error('TradingView ID save error');
        return;
      }
      
      // Update cache with correct key
      const cachedData = getCachedUser();
      if (cachedData) {
        localStorage.setItem('fibalgo_user_cache', JSON.stringify({
          ...cachedData,
          tradingViewId: valueToSave,
          cachedAt: Date.now()
        }));
      }
      
      setUserTradingViewId(valueToSave);
      setShowTradingViewPopup(false);
    } finally {
      setIsSubmittingTradingView(false);
    }
  };

  // Update UTC time every second
  useEffect(() => {
    const updateTime = () => {
      setUtcTime(new Date().toLocaleTimeString('en-GB', { 
        timeZone: 'UTC', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch function - defined outside useEffect so it can be called from button
  const fetchCachedNews = async () => {
    // Skip fetch if paused
    if (isPausedRef.current) {
      console.log('News fetch paused');
      return;
    }
    
    try {
      // Try to get cached/analyzed news first
      const response = await fetch('/api/news');
      const data = await response.json();
      
      if (data.news && data.news.length > 0) {
        const transformedNews = data.news.map((item: any) => {
          if (item.aiAnalysis) {
            return { ...item, aiAnalysis: item.aiAnalysis };
          }

          if (!item.signal) {
            return { ...item, aiAnalysis: undefined };
          }

          return {
            ...item,
            aiAnalysis: {
              breakingNews: {
                isBreaking: item.isBreaking || false,
                urgencyLevel: item.analysis?.score >= 8 ? 'elevated' : 'normal',
                responseWindow: item.signal.timeHorizon === 'short' ? 'hours' : 'days',
              },
              informationQuality: {
                sourceType: item.sourceCredibility?.tier <= 2 ? 'primary' : 'secondary',
                confidence: item.sourceCredibility?.tier === 1 ? 'confirmed' : 
                           item.sourceCredibility?.tier === 2 ? 'likely' : 'speculative',
              },
              noveltyAssessment: {
                isNew: true,
                pricedInScore: 3,
                reasoning: 'Fresh news from reliable source',
              },
              marketContextFit: {
                currentRegime: item.signal.riskMode || 'neutral',
                regimeEffect: 'neutral',
                priceActionConflict: false,
              },
              flowAnalysis: {
                primaryActors: ['Retail', 'Institutional'],
                forcedFlows: false,
                expectedMagnitude: item.analysis?.score >= 8 ? 'significant' : 
                                  item.analysis?.score >= 6 ? 'moderate' : 'minor',
              },
              analysis: {
                sentiment: item.analysis?.sentiment === 'bullish' ? 'bullish' :
                          item.analysis?.sentiment === 'bearish' ? 'bearish' : 'neutral',
                conviction: item.analysis?.score || 5,
                timeHorizon: item.signal.timeHorizon === 'short' ? 'intraday' : 
                            item.signal.timeHorizon === 'swing' ? 'days' : 'weeks',
                thesis: item.analysis?.summary || '',
                secondOrderEffects: item.analysis?.impact || '',
                keyRisk: item.analysis?.risk || '',
              },
              trade: {
                wouldTrade: item.signal.wouldTrade || false,
                direction: item.analysis?.sentiment === 'bullish' ? 'long' : 
                          item.analysis?.sentiment === 'bearish' ? 'short' : 'none',
                primaryAsset: item.analysis?.tradingPairs?.[0]?.symbol || '',
                alternativeAssets: item.analysis?.tradingPairs?.slice(1).map((p: any) => p.symbol) || [],
                rationale: item.analysis?.summary || '',
                invalidation: item.analysis?.risk || '',
                riskReward: item.analysis?.score >= 8 ? 'excellent' : 
                           item.analysis?.score >= 6 ? 'good' : 'fair',
              },
              meta: {
                relatedAssets: item.analysis?.tradingPairs?.map((p: any) => p.symbol) || [],
                category: item.category || 'crypto',
              },
            }
          };
        });
        setNews(transformedNews);
        setIsLoading(false);
        setIsAnalyzing(false);
        setLastUpdated(new Date());
        return;
      }
    } catch (error) {
      console.error('Error fetching cached news:', error);
    }
    
    // If no cached news, wait a bit for analysis to complete
    setIsLoading(false);
  };

  // Keep ref in sync with state
  useEffect(() => {
    isPausedRef.current = isPaused;
    
    // When switching from PAUSED to LIVE, fetch immediately
    if (!isPaused) {
      fetchCachedNews();
    }
  }, [isPaused]);

  // Trigger analysis to fetch new news from source
  const triggerAnalysis = async () => {
    if (isPausedRef.current) return;
    try {
      console.log('🔄 Triggering news analysis...');
      const response = await fetch('/api/cron/analyze-news');
      const data = await response.json();
      console.log('✅ Analysis result:', data);
      // After analysis, fetch the updated news
      if (data.success) {
        await fetchCachedNews();
      }
    } catch (error) {
      console.error('Error triggering analysis:', error);
    }
  };

  // Initial fetch and intervals
  useEffect(() => {
    // Initial fetch
    fetchCachedNews();
    
    // Also trigger analysis on initial load (in case cron hasn't run)
    triggerAnalysis();
    
    // Refresh news from database every 30 seconds when LIVE
    const newsInterval = setInterval(() => {
      if (!isPausedRef.current) {
        fetchCachedNews();
      }
    }, 30000);
    
    // Trigger analysis every 60 seconds to fetch new news from source
    // This replaces Vercel cron in development
    const analysisInterval = setInterval(() => {
      if (!isPausedRef.current) {
        triggerAnalysis();
      }
    }, 60000);
    
    return () => {
      clearInterval(newsInterval);
      clearInterval(analysisInterval);
    };
  }, []);
  
  const [selectedSymbol, setSelectedSymbol] = useState('BINANCE:BTCUSDT');
  const [newsCategory, setNewsCategory] = useState('all');
  const tradingViewRef = useRef<HTMLDivElement>(null);

  // Handle ticker button click - mobile goes to chart page, desktop updates widget
  const handleTickerClick = (ticker: string) => {
    if (isMobile) {
      router.push(`/terminal/chart?symbol=${encodeURIComponent(ticker)}`);
    } else {
      setSelectedSymbol(ticker);
    }
  };
  
  // Filter news by category
  const filteredNews = newsCategory === 'all' 
    ? news 
    : news.filter(item => item.category === newsCategory);
  
  // Count NEW news (last 5 minutes) by category
  const newNewsCounts = {
    all: news.filter(n => isNewNews(n.publishedAt)).length,
    crypto: news.filter(n => n.category === 'crypto' && isNewNews(n.publishedAt)).length,
    forex: news.filter(n => n.category === 'forex' && isNewNews(n.publishedAt)).length,
    stocks: news.filter(n => n.category === 'stocks' && isNewNews(n.publishedAt)).length,
    commodities: news.filter(n => n.category === 'commodities' && isNewNews(n.publishedAt)).length,
    indices: news.filter(n => n.category === 'indices' && isNewNews(n.publishedAt)).length,
  };
  
  // Resizable panel states - default 66% for news, 33% for chart
  const [newsPanelWidth, setNewsPanelWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRatioRef = useRef(0.45); // Store the ratio for resize calculations
  
  // Initialize panel width and handle window resize
  useEffect(() => {
    const updatePanelWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        setNewsPanelWidth(containerWidth * panelRatioRef.current);
      }
    };

    // Initial calculation
    updatePanelWidth();
    
    // Listen to window resize
    window.addEventListener('resize', updatePanelWidth);
    
    return () => {
      window.removeEventListener('resize', updatePanelWidth);
    };
  }, []);

  // Divider drag handlers
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };
  
  // Handle mouse events for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      e.preventDefault();
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      
      // Set min/max bounds (250px min, 70% of container max)
      const maxWidth = containerRect.width * 0.7;
      const clampedWidth = Math.max(250, Math.min(newWidth, maxWidth));
      
      // Update both width and ratio
      setNewsPanelWidth(clampedWidth);
      panelRatioRef.current = clampedWidth / containerRect.width;
    };
    
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };
    
    // Add listeners to window for better capture
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Prevent iframe from stealing events during resize
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      // Disable pointer events on iframes during resize
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        iframe.style.pointerEvents = 'none';
      });
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        iframe.style.pointerEvents = '';
      });
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // TradingView Widget
  useEffect(() => {
    if (tradingViewRef.current) {
      tradingViewRef.current.innerHTML = '';
      
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        "autosize": true,
        "symbol": selectedSymbol,
        "interval": "1",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "withdateranges": true,
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "details": true,
        "hotlist": true,
        "calendar": false,
        "studies": [],
        "support_host": "https://www.tradingview.com"
      });
      
      tradingViewRef.current.appendChild(script);
    }
  }, [selectedSymbol]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Main 2-Column Layout */}
        <div 
          ref={containerRef}
          style={{ 
            display: 'grid', 
            gridTemplateColumns: newsPanelWidth ? `${newsPanelWidth}px 8px 1fr` : '45fr 8px 55fr',
            gap: '0',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          
          {/* Left Panel - News Feed */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}>
            {/* News Header with Tabs */}
            <div style={{
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0
            }}>
              {/* Top Row - Title and Live Button */}
              <div style={{
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Newspaper size={18} style={{ color: '#fff' }} />
                  News & Tweets
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* UTC Time */}
                  <span style={{
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    fontFamily: '"SF Mono", "Roboto Mono", "Consolas", monospace',
                    letterSpacing: '0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {utcTime} <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>UTC</span>
                  </span>
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    style={{
                      background: isPaused ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
                      border: `1px solid ${isPaused ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)'}`,
                      borderRadius: '6px',
                      padding: '0.375rem 0.75rem',
                      color: isPaused ? '#EF4444' : '#22C55E',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isPaused ? '⏸ PAUSED' : '▶ LIVE'}
                  </button>
                </div>
              </div>
              
              {/* Category Tabs */}
              <div style={{
                display: 'flex',
                gap: '0',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'crypto', label: 'Crypto' },
                  { id: 'forex', label: 'Forex' },
                  { id: 'stocks', label: 'Stocks' },
                  { id: 'commodities', label: 'Commodities' },
                  { id: 'indices', label: 'Indices' },
                ].map((tab) => {
                  const count = newNewsCounts[tab.id as keyof typeof newNewsCounts] || 0;
                  return (
                  <button
                    key={tab.id}
                    onClick={() => setNewsCategory(tab.id)}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.5rem',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: newsCategory === tab.id ? '2px solid #00F5FF' : '2px solid transparent',
                      color: newsCategory === tab.id ? '#fff' : 'rgba(255,255,255,0.5)',
                      fontSize: '0.75rem',
                      fontWeight: newsCategory === tab.id ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                    }}
                    onMouseEnter={(e) => {
                      if (newsCategory !== tab.id) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (newsCategory !== tab.id) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                      }
                    }}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span style={{
                        background: newsCategory === tab.id ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        padding: '0.1rem 0.4rem',
                        fontSize: '0.65rem',
                        color: newsCategory === tab.id ? '#00F5FF' : 'rgba(255,255,255,0.5)',
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                  );
                })}
              </div>
            </div>

            {/* News List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {isLoading ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '200px',
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📰</div>
                    <div>Loading news...</div>
                  </div>
                </div>
              ) : isAnalyzing && !news.some(n => n.analysis) ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '200px',
                  color: 'rgba(255,255,255,0.5)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
                    <div>AI analyzing news...</div>
                  </div>
                </div>
              ) : (
              filteredNews.map((item) => {
                const isFresh = isNewNews(item.publishedAt);
                const ai = item.aiAnalysis;
                const sentiment = ai?.analysis?.sentiment || item.analysis?.sentiment || 'neutral';
                const isBullish = sentiment.includes('bullish');
                const isBearish = sentiment.includes('bearish');
                const conviction = ai?.analysis?.conviction || item.analysis?.score || 5;
                
                return (
                <div 
                  key={item.id}
                  style={{
                    background: isFresh 
                      ? 'linear-gradient(135deg, rgba(0,245,255,0.08) 0%, rgba(0,245,255,0.02) 100%)' 
                      : '#111113',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    border: isFresh
                      ? '1px solid rgba(0,245,255,0.3)'
                      : isBullish 
                        ? '1px solid rgba(34,197,94,0.2)' 
                        : isBearish 
                          ? '1px solid rgba(239,68,68,0.2)' 
                          : '1px solid rgba(255,255,255,0.1)',
                    position: 'relative' as const,
                  }}
                >
                  {/* NEW Badge */}
                  {isFresh && (
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'linear-gradient(135deg, #00F5FF 0%, #00D4E5 100%)',
                      color: '#000',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}>
                      NEW
                    </div>
                  )}

                  {/* Row 1: Sentiment + Conviction + Response Window */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    flexWrap: 'wrap',
                  }}>
                    {/* Sentiment Badge */}
                    <span style={{
                      background: isBullish ? 'rgba(34,197,94,0.15)' : isBearish ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)',
                      color: isBullish ? '#22C55E' : isBearish ? '#EF4444' : '#888',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      border: `1px solid ${isBullish ? 'rgba(34,197,94,0.3)' : isBearish ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.2)'}`,
                    }}>
                      {isBullish ? '▲' : isBearish ? '▼' : '−'}
                      {sentiment.replace('_', ' ').toUpperCase()}
                    </span>

                    {/* Conviction Meter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>CONVICTION</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[...Array(10)].map((_, i) => (
                          <div key={i} style={{
                            width: '4px',
                            height: '12px',
                            borderRadius: '2px',
                            background: i < conviction
                              ? conviction >= 8 ? '#22C55E' : conviction >= 5 ? '#F59E0B' : '#6B7280'
                              : 'rgba(255,255,255,0.1)',
                          }} />
                        ))}
                      </div>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 700,
                        color: conviction >= 8 ? '#22C55E' : conviction >= 5 ? '#F59E0B' : '#6B7280'
                      }}>
                        {conviction}/10
                      </span>
                    </div>

                    {/* Response Window */}
                    <span style={{
                      background: ai?.breakingNews?.responseWindow === 'minutes' ? 'rgba(239,68,68,0.15)' : 
                                 ai?.breakingNews?.responseWindow === 'hours' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                      color: ai?.breakingNews?.responseWindow === 'minutes' ? '#EF4444' : 
                             ai?.breakingNews?.responseWindow === 'hours' ? '#F59E0B' : '#888',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      marginLeft: 'auto',
                    }}>
                      ⏱️ {(ai?.breakingNews?.responseWindow || ai?.analysis?.timeHorizon || 'days').toUpperCase()}
                    </span>
                  </div>

                  {/* Row 2: Context Badges */}
                  <div style={{
                    display: 'flex',
                    gap: '0.4rem',
                    marginBottom: '0.5rem',
                    flexWrap: 'wrap',
                  }}>
                    {/* Market Regime */}
                    <span style={{
                      background: ai?.marketContextFit?.currentRegime === 'risk-on' ? 'rgba(34,197,94,0.1)' :
                                 ai?.marketContextFit?.currentRegime === 'risk-off' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                      color: ai?.marketContextFit?.currentRegime === 'risk-on' ? '#22C55E' :
                             ai?.marketContextFit?.currentRegime === 'risk-off' ? '#EF4444' : '#888',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      {ai?.marketContextFit?.currentRegime === 'risk-on' ? '🟢' : ai?.marketContextFit?.currentRegime === 'risk-off' ? '🔴' : '⚪'}
                      {' '}{(ai?.marketContextFit?.currentRegime || item.signal?.riskMode || 'neutral').toUpperCase()}
                    </span>

                    {/* Magnitude */}
                    <span style={{
                      background: ai?.flowAnalysis?.expectedMagnitude === 'massive' ? 'rgba(139,92,246,0.2)' :
                                 ai?.flowAnalysis?.expectedMagnitude === 'significant' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                      color: ai?.flowAnalysis?.expectedMagnitude === 'massive' ? '#8B5CF6' :
                             ai?.flowAnalysis?.expectedMagnitude === 'significant' ? '#F59E0B' : '#888',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                    }}>
                      📊 {(ai?.flowAnalysis?.expectedMagnitude || 'minor').toUpperCase()}
                    </span>

                    {/* Source Quality */}
                    <span style={{
                      background: ai?.informationQuality?.confidence === 'confirmed' ? 'rgba(34,197,94,0.1)' :
                                 ai?.informationQuality?.confidence === 'likely' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                      color: ai?.informationQuality?.confidence === 'confirmed' ? '#22C55E' :
                             ai?.informationQuality?.confidence === 'likely' ? '#F59E0B' : '#EF4444',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                    }}>
                      {ai?.informationQuality?.confidence === 'confirmed' ? '✓' : ai?.informationQuality?.confidence === 'likely' ? '~' : '?'}
                      {(ai?.informationQuality?.confidence || 'speculative').toUpperCase()}
                    </span>

                    {/* Novelty */}
                    <span style={{
                      background: (ai?.noveltyAssessment?.pricedInScore || 3) >= 7 ? 'rgba(239,68,68,0.1)' :
                                 (ai?.noveltyAssessment?.pricedInScore || 3) >= 4 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                      color: (ai?.noveltyAssessment?.pricedInScore || 3) >= 7 ? '#EF4444' :
                             (ai?.noveltyAssessment?.pricedInScore || 3) >= 4 ? '#F59E0B' : '#22C55E',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                    }}>
                      {(ai?.noveltyAssessment?.pricedInScore || 3) >= 7 ? '💤 PRICED IN' :
                       (ai?.noveltyAssessment?.pricedInScore || 3) >= 4 ? '⚡ PARTIAL' : '🔥 FRESH NEWS'}
                    </span>
                  </div>

                  {/* Row 3: Time Horizon + Risk Mode Badges */}
                  <div style={{
                    display: 'flex',
                    gap: '0.4rem',
                    marginBottom: '0.75rem',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: (ai?.analysis?.timeHorizon || item.signal?.timeHorizon) === 'intraday' || (ai?.analysis?.timeHorizon || item.signal?.timeHorizon) === 'short' ? '#00F5FF' : 
                             (ai?.analysis?.timeHorizon || item.signal?.timeHorizon) === 'days' || (ai?.analysis?.timeHorizon || item.signal?.timeHorizon) === 'swing' ? '#F59E0B' : '#8B5CF6',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}>
                      ⚡ {(ai?.analysis?.timeHorizon || item.signal?.timeHorizon || 'short').toUpperCase().replace('INTRADAY', 'SHORT-TERM').replace('DAYS', 'MID-TERM').replace('WEEKS', 'LONG-TERM')}
                    </span>

                    {item.signal?.riskMode && (
                      <span style={{
                        background: item.signal.riskMode === 'risk-on' ? 'rgba(34,197,94,0.1)' :
                                   item.signal.riskMode === 'risk-off' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                        color: item.signal.riskMode === 'risk-on' ? '#22C55E' :
                               item.signal.riskMode === 'risk-off' ? '#EF4444' : '#888',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        border: `1px solid ${item.signal.riskMode === 'risk-on' ? 'rgba(34,197,94,0.3)' : item.signal.riskMode === 'risk-off' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                        {item.signal.riskMode === 'risk-on' ? '🟢 RISK-ON' : item.signal.riskMode === 'risk-off' ? '🔴 RISK-OFF' : '⚪ NEUTRAL'}
                      </span>
                    )}
                  </div>

                  {/* Source + Title */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #00E5FF 0%, #00B8D4 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontWeight: 700, 
                        fontSize: '0.8rem',
                      }}>
                        FibAlgo
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: '0.8rem' }}>
                        News
                      </span>
                      <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                        {item.time}
                      </div>
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 0.75rem 0' }}>
                      {item.content}
                    </p>
                  </div>

                  {/* AI Analysis Box */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '0.75rem',
                  }}>
                    {/* AI Thesis */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ color: '#00F5FF', fontSize: '0.65rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                        🧠 AI THESIS
                      </div>
                      <div style={{ color: '#fff', fontSize: '0.8rem', lineHeight: 1.5, fontWeight: 500 }}>
                        {ai?.analysis?.thesis || item.analysis?.summary || 'Analysis pending...'}
                      </div>
                    </div>

                    {/* Second Order Effects */}
                    {(ai?.analysis?.secondOrderEffects || item.analysis?.impact) && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ color: '#8B5CF6', fontSize: '0.65rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                          🔗 SECOND-ORDER EFFECTS
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                          {ai?.analysis?.secondOrderEffects || item.analysis?.impact}
                        </div>
                      </div>
                    )}

                    {/* Key Risk */}
                    {(ai?.analysis?.keyRisk || item.analysis?.risk) && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ color: '#F59E0B', fontSize: '0.65rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                          ⚠️ KEY RISK
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                          {ai?.analysis?.keyRisk || item.analysis?.risk}
                        </div>
                      </div>
                    )}

                    {/* Related Assets */}
                    {((ai?.meta?.relatedAssets?.length ?? 0) > 0 || (item.analysis?.tradingPairs?.length ?? 0) > 0) && (
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                          📈 RELATED ASSETS
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {(item.analysis?.tradingPairs || []).map((pair, idx) => (
                            <button 
                              key={idx}
                              onClick={() => handleTickerClick(pair.ticker)}
                              style={{
                                background: 'rgba(0,245,255,0.08)',
                                border: '1px solid rgba(0,245,255,0.15)',
                                borderRadius: '4px',
                                padding: '0.15rem 0.4rem',
                                color: '#00F5FF',
                                fontSize: '0.65rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              {pair.symbol}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Trading Pairs */}
                  {item.analysis?.tradingPairs && item.analysis.tradingPairs.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {item.analysis.tradingPairs.map((pair, idx) => (
                        <button 
                          key={idx}
                          onClick={() => handleTickerClick(pair.ticker)}
                          style={{
                            background: 'rgba(0,245,255,0.1)',
                            border: '1px solid rgba(0,245,255,0.2)',
                            borderRadius: '4px',
                            padding: '0.2rem 0.5rem',
                            color: '#00F5FF',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {pair.symbol}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
              })
              )}
            </div>
          </div>

          {/* Resizable Divider */}
          <div
            onMouseDown={handleDividerMouseDown}
            style={{
              width: '8px',
              background: isResizing ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.05)',
              cursor: 'col-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: isResizing ? 'none' : 'background 0.2s',
              position: 'relative',
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              if (!isResizing) {
                e.currentTarget.style.background = 'rgba(0,245,255,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }
            }}
          >
            {/* Divider Handle Visual */}
            <div style={{
              width: '4px',
              height: '40px',
              background: isResizing ? '#00F5FF' : 'rgba(255,255,255,0.2)',
              borderRadius: '2px',
              transition: 'background 0.2s',
            }} />
          </div>

          {/* Right Panel - TradingView Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Chart Container */}
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              <div ref={tradingViewRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            </div>
          </div>
        </div>
      
      {/* TradingView ID Popup for Ultimate/Lifetime users */}
      {showTradingViewPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#0A0A0F] to-[#12121A] border border-[#00F5FF]/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-[#00F5FF]/10">
            {/* Premium Badge */}
            <div className="flex justify-center mb-6">
              <div className="px-4 py-2 bg-gradient-to-r from-[#00F5FF]/20 to-[#8B5CF6]/20 rounded-full border border-[#00F5FF]/30">
                <span className="text-sm font-semibold bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] bg-clip-text text-transparent">
                  🎉 {userPlan === 'lifetime' ? 'Lifetime' : 'Ultimate'} Member Benefit
                </span>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white text-center mb-4">
              Claim Your TradingView Indicators
            </h3>
            
            <p className="text-gray-400 text-center mb-6">
              As a {userPlan === 'lifetime' ? 'Lifetime' : 'Ultimate'} member, you get <span className="text-[#00F5FF] font-semibold">free access</span> to our premium TradingView indicators. Enter your TradingView username to receive access.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  TradingView Username
                </label>
                <input
                  type="text"
                  value={tradingViewPopupInput}
                  onChange={(e) => setTradingViewPopupInput(e.target.value)}
                  placeholder="Enter your TradingView username"
                  disabled={dontWantIndicators}
                  className={`w-full px-4 py-3 bg-[#1a1a2e] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF] focus:ring-1 focus:ring-[#00F5FF] transition-all ${dontWantIndicators ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontWantIndicators}
                  onChange={(e) => setDontWantIndicators(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-[#1a1a2e] text-[#00F5FF] focus:ring-[#00F5FF]"
                />
                <span className="text-gray-400 text-sm">
                  I don't want FibAlgo TradingView indicators
                </span>
              </label>
              
              <button
                onClick={handleTradingViewPopupSubmit}
                disabled={(!tradingViewPopupInput.trim() && !dontWantIndicators) || isSubmittingTradingView}
                className="w-full py-4 bg-gradient-to-r from-[#00F5FF] to-[#8B5CF6] text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmittingTradingView ? 'Saving...' : dontWantIndicators ? 'Continue Without Indicators' : 'Submit & Claim Indicators'}
              </button>
              
              <p className="text-xs text-gray-500 text-center">
                ⚠️ Please double-check your username. Incorrect usernames cannot receive indicator access.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TerminalPage() {
  return (
    <Suspense fallback={null}>
      <TerminalPageContent />
    </Suspense>
  );
}
