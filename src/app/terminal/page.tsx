'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Zap,
  BarChart3,
  Newspaper
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCachedUser, fetchAndCacheUser, clearUserCache } from '@/lib/userCache';
import { getTerminalCache, setTerminalCache, isCacheValid } from '@/lib/store/terminalCache';
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

// News item type — terminal/news ile aynı API formatı (stage1/stage3)
interface NewsItem {
  id: number | string;
  newsId?: string;
  source: string;
  handle?: string;
  avatar?: string;
  content: string;
  time: string;
  publishedAt?: string;
  sourceLabel: string;
  url?: string;
  category?: string;
  isBreaking?: boolean;
  sourceCredibility?: { tier: number; score: number; label: string };
  aiAnalysis?: {
    stage1?: { title?: string; analysis?: string; immediate_impact?: string; affected_assets?: string[] };
    stage3?: {
      trade_decision?: string;
      importance_score?: number;
      positions?: { direction: 'BUY' | 'SELL'; confidence?: number; asset?: string }[];
      overall_assessment?: string;
    };
  };
  importanceScore?: number;
  overallAssessment?: string;
  affectedAssets?: string[];
  tradingPairs?: { symbol?: string; ticker?: string }[];
  signal?: { timeHorizon?: string; wouldTrade?: boolean; signal?: string };
  isAnalyzing?: boolean;
}


// UTC date+time → kullanıcının yerel saatine göre format (Economic Calendar için)
function formatEventLocalTime(date: string, time?: string): string {
  if (!date) return '';
  const raw = (time || '00:00').trim().slice(0, 8);
  const timeForIso = raw.length <= 5 ? `${raw}:00` : raw; // HH:MM → HH:MM:00
  const iso = `${date}T${timeForIso}Z`;
  const utc = new Date(iso);
  if (Number.isNaN(utc.getTime())) return `${date}${time ? ` · ${time}` : ''}`;
  const d = utc.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const t = time ? utc.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
  return t ? `${d} · ${t}` : d;
}

// Event date+time (UTC) → timestamp for filter/sort
function eventUtcTime(date: string, time?: string): number {
  if (!date) return 0;
  const raw = (time || '00:00').trim().slice(0, 8);
  const timeForIso = raw.length <= 5 ? `${raw}:00` : raw;
  const utc = new Date(`${date}T${timeForIso}Z`);
  return Number.isNaN(utc.getTime()) ? 0 : utc.getTime();
}

// Asset string → TradingView symbol (chart'ta açmak için)
function assetToTvSymbol(asset: string): string {
  if (!asset || typeof asset !== 'string') return 'BINANCE:BTCUSDT';
  const raw = asset.trim().toUpperCase().replace(/\$/g, '').replace(/\//g, '');
  if (raw.includes(':')) return asset.trim(); // Zaten "BINANCE:BTCUSDT" formatında
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
  const [news, setNews] = useState<NewsItem[]>([]);
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

  // Aynı veri kaynağı: terminal/news ile aynı API ve cache (transformation yok)
  const fetchCachedNews = async () => {
    if (isPausedRef.current) return;
    try {
      if (typeof window !== 'undefined') {
        const cache = getTerminalCache();
        if (cache?.news && isCacheValid(cache.news.timestamp)) {
          setNews((cache.news.items || []) as NewsItem[]);
          setIsLoading(false);
          setIsAnalyzing(false);
          setLastUpdated(new Date());
          return;
        }
      }
      const response = await fetch('/api/news?limit=10000');
      const data = await response.json();
      if (data.news && data.news.length > 0) {
        const items = data.news as NewsItem[];
        setNews(items);
        setTerminalCache({ news: { items, timestamp: Date.now() } });
      }
      setIsLoading(false);
      setIsAnalyzing(false);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching news:', error);
      setIsLoading(false);
    }
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

  // Handle ticker button click - mobile goes to chart page, desktop updates widget
  const handleTickerClick = (ticker: string) => {
    if (isMobile) {
      router.push(`/terminal/chart?symbol=${encodeURIComponent(ticker)}`);
    } else {
      setSelectedSymbol(ticker);
    }
  };
  
  // Filter news by category only (all impact levels shown: high, medium, low)
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

  // TradingView chart iframe URL (widgetembed yüklenir, script embed sorun çıkarabiliyor)
  const tradingViewChartUrl = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(selectedSymbol)}&interval=1&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=true&hide_side_toolbar=false&allow_symbol_change=true&save_image=true&hideideas=true`;

  // Calendar events for bottom section
  const [calendarEvents, setCalendarEvents] = useState<Array<{ id: string; title: string; date: string; time?: string; country: string; importance: string; previous?: string; forecast?: string; actual?: string }>>([]);
  useEffect(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 7);
    fetch(`/api/calendar?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`)
      .then((r) => r.json())
      .then((data) => setCalendarEvents((data.events || []).slice(0, 50)))
      .catch(() => {});
  }, []);

  // Geçmiş eventleri kaldır, en yakın gelecekteki en başta olacak şekilde sırala
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return [...calendarEvents]
      .filter((evt) => eventUtcTime(evt.date, evt.time) > now)
      .sort((a, b) => eventUtcTime(a.date, a.time) - eventUtcTime(b.date, b.time));
  }, [calendarEvents]);

  // Şu an canlı yayında olan eventler (başlama + 90 dk penceresi)
  const liveEvents = useMemo(() => {
    const now = Date.now();
    const LIVE_WINDOW_MS = 90 * 60 * 1000;
    return calendarEvents.filter((evt) => {
      const start = eventUtcTime(evt.date, evt.time);
      return start <= now && now < start + LIVE_WINDOW_MS;
    });
  }, [calendarEvents]);

  // Event chart'ta: önce live, sonra upcoming (hepsi aynı strip'te)
  const displayEvents = useMemo(() => [...liveEvents, ...upcomingEvents], [liveEvents, upcomingEvents]);

  // Event strip drag-to-pan (scroll kaldırıldı, sürükle ile sağa/sola)
  const [eventPanX, setEventPanX] = useState(0);
  const [isEventDragging, setIsEventDragging] = useState(false);
  const eventPanXRef = useRef(0);
  const eventDragRef = useRef<{ startX: number; startPan: number } | null>(null);
  const eventStripInnerRef = useRef<HTMLDivElement>(null);
  const eventStripOuterRef = useRef<HTMLDivElement>(null);

  const handleEventStripMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    eventPanXRef.current = eventPanX;
    eventDragRef.current = { startX: e.clientX, startPan: eventPanX };
    setIsEventDragging(true);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!eventDragRef.current || !eventStripInnerRef.current || !eventStripOuterRef.current) return;
      const dx = e.clientX - eventDragRef.current.startX;
      let next = eventDragRef.current.startPan + dx;
      const inner = eventStripInnerRef.current.getBoundingClientRect().width;
      const outer = eventStripOuterRef.current.getBoundingClientRect().width;
      const minPan = outer >= inner ? 0 : -(inner - outer);
      next = Math.max(minPan, Math.min(0, next));
      eventPanXRef.current = next;
      eventStripInnerRef.current.style.transform = `translate3d(${next}px, 0, 0)`;
    };
    const handleUp = () => {
      setEventPanX(eventPanXRef.current);
      eventDragRef.current = null;
      setIsEventDragging(false);
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top: News (2 rows) + Chart */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', minHeight: 0 }}>
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px', color: 'rgba(255,255,255,0.5)' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📰</div><div style={{ fontSize: '0.8rem' }}>Loading...</div></div>
                </div>
              ) : isAnalyzing && !news.some(n => n.aiAnalysis) ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px', color: 'rgba(255,255,255,0.5)' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🤖</div><div style={{ fontSize: '0.8rem' }}>Analyzing...</div></div>
                </div>
              ) : (
              <>
              {filteredNews.map((item) => {
                const isFresh = isNewNews(item.publishedAt);
                const isBreaking = item.isBreaking === true;
                const stage1 = item.aiAnalysis?.stage1;
                const stage3 = item.aiAnalysis?.stage3;
                const firstPos = stage3?.positions?.[0];
                const sentiment = firstPos?.direction === 'BUY' ? 'bullish' : firstPos?.direction === 'SELL' ? 'bearish' : 'neutral';
                const isBullish = sentiment === 'bullish';
                const isBearish = sentiment === 'bearish';
                const conviction = item.importanceScore ?? stage3?.importance_score ?? firstPos?.confidence ?? 5;
                const thesis = item.overallAssessment ?? stage3?.overall_assessment ?? stage1?.analysis ?? stage1?.immediate_impact ?? '';
                const assets = (item.affectedAssets ?? stage1?.affected_assets ?? stage3?.positions?.map((p: { asset?: string }) => p.asset).filter(Boolean) ?? item.tradingPairs?.map(p => p.symbol ?? p.ticker).filter(Boolean) ?? []) as string[];
                const uniqueAssets = [...new Set(assets)];
                
                // Category colors
                const categoryColors: Record<string, { bg: string; color: string }> = {
                  crypto: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
                  cryptocurrency: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
                  stocks: { bg: 'rgba(34,197,94,0.15)', color: '#22C55E' },
                  forex: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
                  commodities: { bg: 'rgba(168,85,247,0.15)', color: '#A855F7' },
                  indices: { bg: 'rgba(20,184,166,0.15)', color: '#14B8A6' },
                  macro: { bg: 'rgba(6,182,212,0.15)', color: '#06B6D4' },
                  general: { bg: 'rgba(255,255,255,0.1)', color: '#888' },
                };
                const catColors = categoryColors[item.category?.toLowerCase() || 'general'] || { bg: 'rgba(255,255,255,0.1)', color: '#888' };
                
                // Breaking news: red border + glow (terminal/news style)
                const borderColor = isBreaking ? 'rgba(220,38,38,0.6)' : isBullish ? 'rgba(34,197,94,0.25)' : isBearish ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)';
                const leftBorderColor = isBreaking ? '#DC2626' : isBullish ? '#22C55E' : isBearish ? '#EF4444' : 'rgba(255,255,255,0.2)';
                const cardBg = isBreaking ? 'linear-gradient(180deg, rgba(220,38,38,0.06) 0%, #0D1117 100%)' : 'linear-gradient(180deg, #0F1318 0%, #0D1117 100%)';
                const cardShadow = isBreaking ? '0 0 0 1px rgba(220,38,38,0.4), 0 0 16px rgba(220,38,38,0.15)' : '0 1px 3px rgba(0,0,0,0.2)';
                
                return (
                <Link
                  key={item.id}
                  href={`/terminal/news?newsId=${item.newsId ?? item.id}`}
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: '14px' }}
                >
                <div 
                  style={{
                    background: cardBg,
                    borderRadius: '12px',
                    border: `1px solid ${borderColor}`,
                    borderLeft: `4px solid ${leftBorderColor}`,
                    overflow: 'hidden',
                    position: 'relative' as const,
                    boxShadow: cardShadow,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = isBreaking ? '0 0 0 2px rgba(220,38,38,0.5), 0 0 24px rgba(220,38,38,0.2)' : '0 4px 12px rgba(0,0,0,0.35)';
                    e.currentTarget.style.borderColor = isBreaking ? 'rgba(220,38,38,0.7)' : isBullish ? 'rgba(34,197,94,0.4)' : isBearish ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = cardShadow;
                    e.currentTarget.style.borderColor = borderColor;
                  }}
                >
                  {/* Header Row — BREAKING badge + category + NEW */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    flexWrap: 'wrap',
                    background: isBreaking ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.15)',
                  }}>
                    {isBreaking && (
                      <span style={{
                        background: 'rgba(220,38,38,0.9)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}>
                        BREAKING
                      </span>
                    )}
                    <span style={{ 
                      color: 'rgba(255,255,255,0.6)', 
                      fontSize: '0.8rem', 
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '0.02em',
                    }}>
                      {item.time}
                    </span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
                    <span style={{ 
                      color: 'rgba(255,255,255,0.95)', 
                      fontWeight: 600, 
                      fontSize: '0.8rem',
                      letterSpacing: '0.01em',
                    }}>
                      {item.source || 'FibAlgo'}
                    </span>
                    {item.category && (
                      <span style={{ 
                        background: catColors.bg, 
                        color: catColors.color, 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        fontSize: '0.7rem', 
                        fontWeight: 600, 
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {item.category}
                      </span>
                    )}
                    {isFresh && !isBreaking && (
                      <span style={{
                        background: 'linear-gradient(135deg, #00F5FF 0%, #00D4E5 100%)',
                        color: '#000',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '3px 7px',
                        borderRadius: '6px',
                        marginLeft: 'auto',
                        letterSpacing: '0.05em',
                      }}>
                        NEW
                      </span>
                    )}
                    {isFresh && isBreaking && (
                      <span style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '3px 7px',
                        borderRadius: '6px',
                        marginLeft: 'auto',
                        letterSpacing: '0.05em',
                      }}>
                        NEW
                      </span>
                    )}
                  </div>

                  {/* Haber içeriği — tipografi ve boşluk iyileştirildi */}
                  <div style={{ 
                    padding: '18px 16px 20px', 
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.015)',
                  }}>
                    <p style={{ 
                      color: 'rgba(255,255,255,0.92)', 
                      fontSize: '0.9375rem', 
                      lineHeight: 1.65, 
                      margin: 0,
                      fontWeight: 450,
                      letterSpacing: '0.01em',
                      maxWidth: '100%',
                    }}>
                      {item.content}
                    </p>
                  </div>

                  {/* AI analiz alanı — hiyerarşi ve görünüm */}
                  <div style={{ 
                    padding: '14px 16px 16px', 
                    background: 'rgba(0,0,0,0.25)',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: thesis ? '12px' : 0,
                      flexWrap: 'wrap',
                    }}>
                      <span style={{
                        background: isBullish ? 'rgba(0,230,118,0.12)' : isBearish ? 'rgba(239,68,68,0.12)' : 'rgba(120,144,156,0.12)',
                        color: isBullish ? '#00E676' : isBearish ? '#EF4444' : '#94A3B8',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        border: `1px solid ${isBullish ? 'rgba(0,230,118,0.2)' : isBearish ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.2)'}`,
                      }}>
                        {isBullish ? '▲' : isBearish ? '▼' : '—'}
                        {isBullish ? 'BULLISH' : isBearish ? 'BEARISH' : 'NEUTRAL'}
                      </span>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600 }}>Conviction</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[...Array(10)].map((_, i) => (
                            <div key={i} style={{
                              width: '5px',
                              height: '10px',
                              borderRadius: '2px',
                              background: i < conviction
                                ? conviction >= 8 ? '#22C55E' : conviction >= 5 ? '#F59E0B' : '#64748B'
                                : 'rgba(255,255,255,0.08)',
                            }} />
                          ))}
                        </div>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          color: conviction >= 8 ? '#22C55E' : conviction >= 5 ? '#F59E0B' : '#94A3B8',
                          minWidth: '22px',
                        }}>
                          {conviction}/10
                        </span>
                      </div>
                    </div>

                    {thesis && (
                      <div style={{ 
                        marginBottom: assets.length > 0 ? '12px' : 0,
                        padding: '10px 12px',
                        background: 'rgba(0,245,255,0.04)',
                        borderRadius: '8px',
                        borderLeft: '3px solid rgba(0,245,255,0.4)',
                      }}>
                        <div style={{ 
                          color: 'rgba(255,255,255,0.82)', 
                          fontSize: '0.8125rem', 
                          lineHeight: 1.55,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          letterSpacing: '0.01em',
                        }}>
                          {thesis}
                        </div>
                      </div>
                    )}

                    {uniqueAssets.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, marginRight: '4px' }}>Assets:</span>
                        {uniqueAssets.slice(0, 8).map((asset) => (
                          <span
                            key={asset}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedSymbol(assetToTvSymbol(asset));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedSymbol(assetToTvSymbol(asset));
                              }
                            }}
                            style={{
                              background: 'rgba(0,245,255,0.1)',
                              color: '#00F5FF',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(0,245,255,0.25)',
                              cursor: 'pointer',
                              transition: 'background 0.2s, border-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(0,245,255,0.2)';
                              e.currentTarget.style.borderColor = 'rgba(0,245,255,0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(0,245,255,0.1)';
                              e.currentTarget.style.borderColor = 'rgba(0,245,255,0.25)';
                            }}
                          >
                            {asset}
                          </span>
                        ))}
                        {uniqueAssets.length > 8 && (
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>+{uniqueAssets.length - 8}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                </Link>
              );
              })}
                </>
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

          {/* Right Panel - TradingView Chart (iframe ile yükleme) */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              <iframe
                key={selectedSymbol}
                src={tradingViewChartUrl}
                title="TradingView Chart"
                style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#0A0A0B' }}
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Event Chart */}
      <div style={{
        flexShrink: 0,
        minHeight: '180px',
        maxHeight: '280px',
        height: 'auto',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, #0D1117 0%, #0A0A0B 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <BarChart3 size={18} style={{ color: '#00F5FF' }} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>Economic Calendar</span>
          <Link href="/terminal/calendar" style={{ marginLeft: 'auto', color: 'rgba(0,245,255,0.9)', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none' }}>View full calendar →</Link>
        </div>
        <div
          ref={eventStripOuterRef}
          onMouseDown={handleEventStripMouseDown}
          style={{
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'visible',
            cursor: isEventDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            padding: 'clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.5rem, 1vw, 0.75rem)',
          }}
        >
          <div
            ref={eventStripInnerRef}
            style={{
              display: 'inline-flex',
              gap: 'clamp(0.4rem, 0.8vw, 0.6rem)',
              alignItems: 'flex-start',
              transform: `translateX(${eventPanX}px)`,
              willChange: 'transform',
              pointerEvents: isEventDragging ? 'none' : 'auto',
            }}
          >
            {displayEvents.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: '100%', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>{calendarEvents.length === 0 ? 'Loading events...' : 'No upcoming events'}</div>
            ) : (
              displayEvents.map((evt) => {
                const isLive = liveEvents.some((e) => e.id === evt.id);
                return (
                <Link
                  key={evt.id}
                  href="/terminal/calendar"
                  style={{
                    flexShrink: 0,
                    width: 'clamp(150px, 16vw, 200px)',
                    height: 'auto',
                    background: isLive ? 'linear-gradient(180deg, rgba(239,68,68,0.12) 0%, rgba(0,0,0,0.4) 100%)' : 'rgba(255,255,255,0.03)',
                    border: isLive ? '2px solid rgba(239,68,68,0.7)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: 'clamp(0.4rem, 0.8vw, 0.6rem)',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    boxShadow: isLive ? '0 0 20px rgba(239,68,68,0.4), 0 0 40px rgba(239,68,68,0.2)' : 'none',
                    animation: isLive ? 'eventLiveGlow 1.5s ease-in-out infinite' : undefined,
                  }}
                >
                  {isLive && (
                    <span style={{
                      alignSelf: 'flex-start',
                      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                      color: '#fff',
                      fontSize: '0.55rem',
                      fontWeight: 700,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      boxShadow: '0 0 10px rgba(239,68,68,0.5)',
                    }}>LIVE</span>
                  )}
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 600 }}>{formatEventLocalTime(evt.date, evt.time)}</span>
                  <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{evt.title}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem' }}>{evt.country}</span>
                  {(evt.previous != null || evt.forecast != null || evt.actual != null || isLive) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', fontSize: '0.6rem', marginTop: '1px' }}>
                      {evt.previous != null && evt.previous !== '' && (
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Prev: <span style={{ color: 'rgba(255,255,255,0.85)' }}>{evt.previous}</span></span>
                      )}
                      {evt.forecast != null && evt.forecast !== '' && (
                        <span style={{ color: 'rgba(0,245,255,0.7)' }}>Fcst: <span style={{ color: '#00F5FF' }}>{evt.forecast}</span></span>
                      )}
                      {(isLive || (evt.actual != null && evt.actual !== '')) && (
                        <span style={{ color: 'rgba(34,197,94,0.8)' }}>
                          Actual: <span style={{ color: evt.actual ? '#22C55E' : 'rgba(255,255,255,0.4)', fontWeight: evt.actual ? 700 : 400 }}>{evt.actual ?? '—'}</span>
                        </span>
                      )}
                    </div>
                  )}
                  <span style={{ fontSize: '0.55rem', fontWeight: 600, color: evt.importance === 'high' ? '#EF4444' : evt.importance === 'medium' ? '#F59E0B' : '#22C55E', textTransform: 'uppercase', marginTop: 'auto' }}>{evt.importance}</span>
                </Link>
              ); })
            )}
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
