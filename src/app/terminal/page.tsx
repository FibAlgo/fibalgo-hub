'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Zap,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import NewsSignalCard, { type NewsSignal } from '@/components/dashboard/NewsSignalCard';
import { TerminalMarketsWidget } from '@/components/terminal/TerminalMarketsWidget';
import { useTerminal } from '@/lib/context/TerminalContext';
import { createClient } from '@/lib/supabase/client';
import { assetToTradingViewSymbol } from '@/lib/utils/tradingview';
import { getCachedUser, fetchAndCacheUser, clearUserCache } from '@/lib/userCache';
import { getTerminalCache, setTerminalCache, isCacheValid } from '@/lib/store/terminalCache';
import { getCategoryColors, getCanonicalCategory } from '@/lib/utils/news-categories';
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
  // AI-determined sentiment (independent of trade decision)
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  aiAnalysis?: {
    stage1?: { title?: string; analysis?: string; immediate_impact?: string; affected_assets?: string[] };
    stage3?: {
      trade_decision?: string;
      news_sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      importance_score?: number;
      positions?: { direction: 'BUY' | 'SELL'; confidence?: number; asset?: string }[];
      overall_assessment?: string;
    };
  };
  importanceScore?: number;
  overallAssessment?: number;
  affectedAssets?: string[];
  tradingPairs?: { symbol?: string; ticker?: string }[];
  signal?: { timeHorizon?: string; wouldTrade?: boolean; signal?: string };
  isAnalyzing?: boolean;
}


// Yerel günü YYYY-MM-DD yap (takvim sayfası ile aynı from/to mantığı; UTC kayması önlenir)
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

// Widget'ta sadece başlama saati de belli olan eventler (tarih + saat zorunlu; Earnings TBD saat elenir)
function hasKnownStart(evt: { date: string; time?: string }): boolean {
  const d = evt?.date && String(evt.date).trim();
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = evt?.time != null ? String(evt.time).trim() : '';
  // Saat açıkça verilmiş olmalı (HH:MM veya HH:MM:SS); boşsa veya sadece 00:00 varsayımıyla geçme
  if (!t || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return false;
  return eventUtcTime(evt.date, evt.time) > 0;
}

// Asset string → TradingView symbol (single source of truth from lib/utils/tradingview)
function assetToTvSymbol(asset: string): string {
  const tv = assetToTradingViewSymbol(asset);
  return tv ?? 'BINANCE:BTCUSDT';
}

function countryToFlagCdnCode(country?: string): string | null {
  if (!country) return null;
  const raw = String(country).trim().toLowerCase();
  if (!raw) return null;
  // Non-standard codes seen in data:
  // - UK → GB (ISO)
  // - WL → GB (Wales in some feeds; CDN doesn't support subregions)
  const mapped = raw === 'uk' ? 'gb' : raw === 'wl' ? 'gb' : raw;
  if (!/^[a-z]{2}$/.test(mapped)) return null;
  return mapped;
}

function FlagImg({ country, size = 14 }: { country?: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const code = countryToFlagCdnCode(country);
  if (!code || errored) return <span style={{ fontSize: size, lineHeight: 1 }}>🌍</span>;
  const w = Math.max(12, Math.round(size));
  const h = Math.max(9, Math.round(w * 0.75));
  // flagcdn supports fixed sizes; 24x18 is a good default for small UI flags
  const src = `https://flagcdn.com/24x18/${code}.png`;
  return (
    <img
      src={src}
      width={w}
      height={h}
      alt={country ? `${country} flag` : 'flag'}
      loading="lazy"
      style={{ display: 'inline-block', width: w, height: h, borderRadius: 2, verticalAlign: 'middle' }}
      onError={() => setErrored(true)}
    />
  );
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
  const { isPremium } = useTerminal();
  // null = henüz belirlenmedi, false = masaüstü, true = mobil (redirect yapılacak)
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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

  // AGGRESSIVE mobile redirect - useLayoutEffect runs BEFORE paint
  // This ensures user sees nothing before redirect
  useLayoutEffect(() => {
    const mobile = window.innerWidth <= 768;
    if (mobile) {
      // Immediate redirect - no state update needed, just navigate
      router.replace('/terminal/news');
    } else {
      setIsMobile(false);
    }
  }, [router]);
  
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

  // İlk 20 haber + cache; aşağı kaydırınca loadMoreNews ile 20'şer daha (terminal/news gibi)
  const fetchCachedNews = async () => {
    if (isPausedRef.current) return;
    try {
      if (typeof window !== 'undefined') {
        const cache = getTerminalCache();
        if (cache?.news && isCacheValid(cache.news.timestamp) && Array.isArray(cache.news.items)) {
          const items = cache.news.items as NewsItem[];
          setNews(items);
          setHasMoreNews(items.length >= 20);
          setIsLoading(false);
          setIsAnalyzing(false);
          setLastUpdated(new Date());
          return;
        }
      }
      const response = await fetch(`/api/news?limit=20&offset=0`);
      const data = await response.json();
      const items = (data.news || []) as NewsItem[];
      setNews(items);
      setHasMoreNews(items.length === 20);
      if (items.length > 0) {
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

  // NOTE: News analysis is handled by Vercel cron job (every minute)
  // Frontend should NOT call cron endpoints - just read from database via /api/news

  // Initial fetch and intervals
  useEffect(() => {
    // Initial fetch from database
    fetchCachedNews();
    
    // Real-time: refresh news from database every 15 seconds when LIVE
    // NOTE: News analysis is handled by Vercel cron (every minute), not frontend
    const newsInterval = setInterval(() => {
      if (!isPausedRef.current) {
        fetchCachedNews();
      }
    }, 15000);
    
    // Update time display every 10 seconds (relative "Xm ago" + header clock)
    const timeTickInterval = setInterval(() => setTimeTick((t) => t + 1), 10000);
    
    return () => {
      clearInterval(newsInterval);
      clearInterval(timeTickInterval);
    };
  }, []);
  
  const [selectedSymbol, setSelectedSymbol] = useState('BINANCE:BTCUSDT');
  // Home-only: open news in popup instead of navigating to /terminal/news
  const [openedNewsPopup, setOpenedNewsPopup] = useState<NewsItem | null>(null);

  // Time ticker: relative times (e.g. "2m ago") and header clock auto-update every 10s (like /news)
  const [, setTimeTick] = useState(0);
  // News pagination: 20 per page, load more on scroll (terminal/news style)
  const NEWS_PAGE_SIZE = 20;
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const newsListScrollRef = useRef<HTMLDivElement>(null);

  // Market Data (markets) — fetched inside TerminalMarketsWidget

  // Handle ticker button click - mobile goes to chart page, desktop updates widget
  const handleTickerClick = (ticker: string) => {
    if (isMobile) {
      router.push(`/terminal/chart?symbol=${encodeURIComponent(ticker)}`);
    } else {
      setSelectedSymbol(ticker);
    }
  };
  
  // Load more news when user scrolls near bottom (same as terminal/news)
  const loadMoreNews = useCallback(async () => {
    if (loadingMore || !hasMoreNews) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/news?limit=${NEWS_PAGE_SIZE}&offset=${news.length}`);
      const data = await response.json();
      const moreNews = (data.news || []) as NewsItem[];
      setNews(prev => [...prev, ...moreNews]);
      setHasMoreNews(moreNews.length === NEWS_PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more news:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [news.length, loadingMore, hasMoreNews]);

  useEffect(() => {
    const el = newsListScrollRef.current;
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

  // Resizable panel states - default 66% for news, 33% for chart
  const [newsPanelWidth, setNewsPanelWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRatioRef = useRef(0.45); // Store the ratio for resize calculations

  // Left panel: movable divider between widgets and News & Tweets
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const [leftPanelWidgetRatio, setLeftPanelWidgetRatio] = useState(0.38);
  const leftPanelRatioRef = useRef(0.38);
  const [isResizingWidgetDivider, setIsResizingWidgetDivider] = useState(false);
  
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

  // Horizontal divider: widgets vs News & Tweets (left panel)
  const handleWidgetDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingWidgetDivider(true);
  };
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isResizingWidgetDivider || !leftPanelRef.current) return;
      e.preventDefault();
      const rect = leftPanelRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const ratio = relativeY / rect.height;
      const clamped = Math.max(0.22, Math.min(0.62, ratio));
      setLeftPanelWidgetRatio(clamped);
      leftPanelRatioRef.current = clamped;
    };
    const handleUp = () => {
      if (isResizingWidgetDivider) setIsResizingWidgetDivider(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    if (isResizingWidgetDivider) {
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizingWidgetDivider]);

  // TradingView chart iframe URL (widgetembed yüklenir, script embed sorun çıkarabiliyor)
  const tradingViewChartUrl = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(selectedSymbol)}&interval=1&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=true&hide_side_toolbar=false&allow_symbol_change=true&save_image=true&hideideas=true`;

  // Calendar events for bottom section — takvim sayfası ile aynı API (yerel tarih + type=all); önümüzdeki 5 gün + live
  const [calendarEvents, setCalendarEvents] = useState<Array<{ id: string; title: string; date: string; time?: string; country: string; importance: string; previous?: string; forecast?: string; actual?: string }>>([]);
  useEffect(() => {
    const fetchCalendar = () => {
      // IMPORTANT: API tarafında günler UTC yorumlanabiliyor; lokal/UTC sınırında event kaçırmamak için ±1 gün buffer ile UTC aralığı çekiyoruz.
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 1);
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + 6); // 5 gün + buffer
      const from = fromDate.toISOString().slice(0, 10);
      const to = toDate.toISOString().slice(0, 10);
      fetch(`/api/calendar?from=${from}&to=${to}&type=all`)
        .then((r) => r.json())
        .then((data) => setCalendarEvents(data.events || []))
        .catch(() => {});
    };
    fetchCalendar();
    const t = setInterval(fetchCalendar, 60000);
    return () => clearInterval(t);
  }, []);

  // Sadece başlama tarihi/saati belli olan eventler; geçmiş elenir, gelecek zamana göre sıralı
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    const todayLocal = toLocalDateString(new Date());
    const endLocalDateObj = new Date();
    endLocalDateObj.setDate(endLocalDateObj.getDate() + 4);
    const endLocal = toLocalDateString(endLocalDateObj);
    return [...calendarEvents]
      .filter((evt) => {
        if (!hasKnownStart(evt)) return false;
        const start = eventUtcTime(evt.date, evt.time);
        if (!(start > now)) return false;
        // Lokal gün penceresi: bugün..bugün+4 (preview)
        const localDay = toLocalDateString(new Date(start));
        return localDay >= todayLocal && localDay <= endLocal;
      })
      .sort((a, b) => eventUtcTime(a.date, a.time) - eventUtcTime(b.date, b.time));
  }, [calendarEvents]);

  // Şu an canlı yayında olan eventler (başlama + 90 dk penceresi); sadece tarihi/saati belli olanlar
  const liveEvents = useMemo(() => {
    const now = Date.now();
    const LIVE_WINDOW_MS = 90 * 60 * 1000;
    return calendarEvents.filter((evt) => {
      if (!hasKnownStart(evt)) return false;
      const start = eventUtcTime(evt.date, evt.time);
      return start <= now && now < start + LIVE_WINDOW_MS;
    });
  }, [calendarEvents]);

  // Event strip: sadece LIVE + upcoming (widget = preview)
  const displayEvents = useMemo(() => [...liveEvents, ...upcomingEvents], [liveEvents, upcomingEvents]);

  // Event strip drag-to-pan (scroll kaldırıldı, sürükle ile sağa/sola)
  const [eventPanX, setEventPanX] = useState(0);
  const [isEventDragging, setIsEventDragging] = useState(false);
  const [calendarMinimized, setCalendarMinimized] = useState(false);
  const [marketDataMinimized, setMarketDataMinimized] = useState(false);
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

  // MOBILE REDIRECT: If still determining or mobile, render nothing (prevents flash)
  // This must be AFTER all hooks to comply with Rules of Hooks
  if (isMobile === null || isMobile === true) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top: News (2 rows) + Chart */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div 
          ref={containerRef}
          style={{ 
            display: 'grid', 
            gridTemplateColumns: newsPanelWidth ? `${newsPanelWidth}px 6px 1fr` : '45fr 6px 55fr',
            gap: '0',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          
          {/* Left Panel - Widgets + [Movable Divider] + News & Tweets */}
          <div
            ref={leftPanelRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              minWidth: 0,
              background: 'linear-gradient(180deg, #0B0F18 0%, #080C12 100%)',
              borderRight: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {/* Widgets block (resizable height via divider below) — minimize: ince bar kalır (calendar gibi) */}
            <div
              className="widgets-block-container"
              style={{
                flexShrink: 0,
                height: marketDataMinimized ? undefined : `${leftPanelWidgetRatio * 100}%`,
                minHeight: marketDataMinimized ? 40 : 140,
                maxHeight: marketDataMinimized ? 40 : '70%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'min-height 0.25s ease, max-height 0.25s ease',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  padding: marketDataMinimized ? '0.4rem 12px' : '8px 12px 6px 12px',
                  borderBottom: marketDataMinimized ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: marketDataMinimized ? 'rgba(0,0,0,0.2)' : 'transparent',
                  cursor: marketDataMinimized ? 'pointer' : undefined,
                  minHeight: 40,
                }}
                onClick={() => marketDataMinimized && setMarketDataMinimized(false)}
              >
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', textShadow: '0 0 6px rgba(255,255,255,0.08)' }}>Market Data</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMarketDataMinimized(!marketDataMinimized); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.8)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title={marketDataMinimized ? 'Büyüt' : 'Aşağı al'}
                  aria-label={marketDataMinimized ? 'Büyüt' : 'Aşağı al'}
                >
                  {marketDataMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              {!marketDataMinimized && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 10px 0 10px' }}>
                <TerminalMarketsWidget onSymbolClick={(tv) => handleTickerClick(tv || 'NASDAQ:AAPL')} />
              </div>
              )}
            </div>

            {/* Movable horizontal divider — sadece Market Data açıkken; küçültülünce kaybolur */}
            {!marketDataMinimized && (
            <div
              onMouseDown={handleWidgetDividerMouseDown}
              style={{
                height: '8px',
                flexShrink: 0,
                background: isResizingWidgetDivider ? 'rgba(0,229,255,0.25)' : 'rgba(255,255,255,0.04)',
                cursor: 'row-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: isResizingWidgetDivider ? 'none' : 'background 0.15s ease',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => {
                if (!isResizingWidgetDivider) e.currentTarget.style.background = 'rgba(0,229,255,0.12)';
              }}
              onMouseLeave={(e) => {
                if (!isResizingWidgetDivider) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
            >
              <div style={{
                width: '32px',
                height: '2px',
                background: isResizingWidgetDivider ? '#00E5FF' : 'rgba(255,255,255,0.15)',
                borderRadius: '1px',
                transition: 'background 0.15s ease',
              }} />
            </div>
            )}

            {/* News & Tweets block (takes remaining space) */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* News Header — ince satır + canlı saat (news sayfası gibi otomatik güncellenir) */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
              background: 'rgba(0,0,0,0.15)',
            }}>
              <div style={{ padding: '2px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', textShadow: '0 0 6px rgba(255,255,255,0.08)' }}>
                  News & Tweets
                </span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* News List — 20'şer, aşağı kaydırınca daha fazla (terminal/news gibi) */}
            <div ref={newsListScrollRef} className="terminal-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', minHeight: 0, background: 'rgba(0,0,0,0.08)' }}>
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px', color: 'rgba(255,255,255,0.5)' }}>
                  <div style={{ textAlign: 'center', fontSize: '0.8rem' }}>Loading...</div>
                </div>
              ) : isAnalyzing && !news.some(n => n.aiAnalysis) ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px', color: 'rgba(255,255,255,0.5)' }}>
                  <div style={{ textAlign: 'center', fontSize: '0.8rem' }}>Analyzing...</div>
                </div>
              ) : (
              <>
              {news.map((item) => {
                const isFresh = isNewNews(item.publishedAt);
                const isBreaking = item.isBreaking === true;
                const stage1 = item.aiAnalysis?.stage1;
                const stage3 = item.aiAnalysis?.stage3;
                const firstPos = stage3?.positions?.[0];
                const hasTrade = stage3?.trade_decision === 'TRADE';
                const isLockedForBasic = !isPremium && (isBreaking || hasTrade);
                // Use AI's direct news_sentiment (independent of trade decision)
                const aiSentiment = stage3?.news_sentiment?.toLowerCase() || item.sentiment;
                const sentiment = aiSentiment === 'bullish' ? 'bullish' : aiSentiment === 'bearish' ? 'bearish' : 'neutral';
                const isBullish = sentiment === 'bullish';
                const isBearish = sentiment === 'bearish';
                const conviction = item.importanceScore ?? stage3?.importance_score ?? firstPos?.confidence ?? 5;
                const thesis = item.overallAssessment ?? stage3?.overall_assessment ?? stage1?.analysis ?? stage1?.immediate_impact ?? '';
                const assets = (item.affectedAssets ?? stage1?.affected_assets ?? stage3?.positions?.map((p: { asset?: string }) => p.asset).filter(Boolean) ?? item.tradingPairs?.map(p => p.symbol ?? p.ticker).filter(Boolean) ?? []) as string[];
                const uniqueAssets = [...new Set(assets)];
                // Relative time (auto-updates every 10s via timeTick, like /news)
                const publishedTime = new Date(item.publishedAt || item.time);
                const now = new Date();
                const totalMinutes = Math.floor((now.getTime() - publishedTime.getTime()) / (1000 * 60));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m` : 'NOW';
                
                // Aynı kategori kaynağı: terminal/news ile uyumlu (getCanonicalCategory)
                const displayCategory = getCanonicalCategory(item);
                const catColors = getCategoryColors(displayCategory);
                
                // Breaking news: red border + glow (terminal/news style)
                const borderColor = isBreaking ? 'rgba(220,38,38,0.6)' : isBullish ? 'rgba(34,197,94,0.25)' : isBearish ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)';
                const leftBorderColor = isBreaking ? '#DC2626' : isBullish ? '#22C55E' : isBearish ? '#EF4444' : 'rgba(255,255,255,0.2)';
                const cardBg = isBreaking ? 'linear-gradient(180deg, rgba(220,38,38,0.06) 0%, #0D1117 100%)' : 'linear-gradient(180deg, #0F1318 0%, #0D1117 100%)';
                const cardShadow = isBreaking ? '0 0 0 1px rgba(220,38,38,0.4), 0 0 16px rgba(220,38,38,0.15)' : '0 1px 3px rgba(0,0,0,0.2)';

                return (
                <div key={item.id} style={{ position: 'relative', marginBottom: '14px' }}>
                  <div style={isLockedForBasic ? { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenedNewsPopup(item)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenedNewsPopup(item); } }}
                  style={{ display: 'block', cursor: 'pointer', color: 'inherit' }}
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
                  {/* Header Row — ince satır (zaman/kaynak) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 12px',
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
                      {timeDisplay}
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
                    {displayCategory && displayCategory !== 'general' && (
                      <span style={{ 
                        background: catColors.bg, 
                        color: catColors.text, 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        fontSize: '0.7rem', 
                        fontWeight: 600, 
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {displayCategory}
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

                  {/* Haber içeriği — başlık üst/alt kolon ince, yazı boyutu aynı */}
                  <div style={{ 
                    padding: '10px 16px 12px', 
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
                </div>
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
                        borderRadius: '12px',
                        color: 'rgba(255,255,255,0.95)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <Lock size={28} strokeWidth={2} />
                      <span>Upgrade to view this analysis</span>
                    </Link>
                  )}
                </div>
              );
              })}
              {loadingMore && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                  Loading more...
                </div>
              )}
                </>
                )}
              </div>
            </div>
          </div>

          {/* Resizable Divider */}
          <div
            onMouseDown={handleDividerMouseDown}
            style={{
              width: '6px',
              background: isResizing ? 'rgba(0,229,255,0.25)' : 'rgba(255,255,255,0.04)',
              cursor: 'col-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: isResizing ? 'none' : 'background 0.15s ease',
              position: 'relative',
              zIndex: 10,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isResizing) e.currentTarget.style.background = 'rgba(0,229,255,0.12)';
            }}
            onMouseLeave={(e) => {
              if (!isResizing) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }}
          >
            <div style={{
              width: '2px',
              height: '32px',
              background: isResizing ? '#00E5FF' : 'rgba(255,255,255,0.15)',
              borderRadius: '1px',
              transition: 'background 0.15s ease',
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

      {/* Bottom: Economic Calendar — Windows-style minimize/büyüt; aşağı al tuşu ile sekmeye indirilir */}
      <div style={{
        flexShrink: 0,
        minHeight: calendarMinimized ? undefined : '180px',
        maxHeight: calendarMinimized ? undefined : '280px',
        height: calendarMinimized ? 'auto' : 'auto',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, #0D1117 0%, #0A0A0B 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        transition: 'min-height 0.25s ease, max-height 0.25s ease',
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: calendarMinimized ? '0.4rem 1rem' : '0.5rem 1rem',
            borderBottom: calendarMinimized ? 'none' : '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.2)',
            minHeight: '40px',
            cursor: calendarMinimized ? 'pointer' : undefined,
          }}
          onClick={() => calendarMinimized && setCalendarMinimized(false)}
        >
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', textShadow: '0 0 6px rgba(255,255,255,0.08)' }}>Economic Calendar</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCalendarMinimized(!calendarMinimized); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title={calendarMinimized ? 'Büyüt' : 'Aşağı al'}
            aria-label={calendarMinimized ? 'Büyüt' : 'Aşağı al'}
          >
            {calendarMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <Link href="/terminal/calendar" style={{ color: 'rgba(0,245,255,0.9)', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none' }}>View full calendar →</Link>
          </div>
        </div>
        {!calendarMinimized && (
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
                const ms = eventUtcTime(evt.date, evt.time);
                const localDate = ms ? toLocalDateString(new Date(ms)) : evt.date;
                return (
                <Link
                  key={evt.id}
                  href={`/terminal/calendar?date=${encodeURIComponent(localDate)}`}
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
                  <span title="Yerel saat diliminiz" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 600 }}>{formatEventLocalTime(evt.date, evt.time)}</span>
                  <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{evt.title}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <FlagImg country={evt.country} size={14} />
                    <span>{evt.country}</span>
                  </span>
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
        )}
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

      {/* Home-only: news popup — open in place, do not navigate to /terminal/news */}
      {openedNewsPopup && (
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
          onClick={() => setOpenedNewsPopup(null)}
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
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>News</span>
              <button
                type="button"
                onClick={() => setOpenedNewsPopup(null)}
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
                  id: String(openedNewsPopup.id),
                  title: openedNewsPopup.content,
                  source: openedNewsPopup.source,
                  published_at: openedNewsPopup.publishedAt || openedNewsPopup.time,
                  category: getCanonicalCategory(openedNewsPopup),
                  signal: openedNewsPopup.aiAnalysis?.stage3?.positions?.[0]?.direction || (openedNewsPopup.aiAnalysis?.stage3?.trade_decision === 'TRADE' ? 'BUY' : 'NO_TRADE'),
                  score: openedNewsPopup.aiAnalysis?.stage3?.importance_score || 5,
                  would_trade: openedNewsPopup.aiAnalysis?.stage3?.trade_decision === 'TRADE',
                  time_horizon: (() => {
                    const pos = openedNewsPopup.aiAnalysis?.stage3?.positions?.[0] as { trade_type?: string } | undefined;
                    return pos?.trade_type === 'scalping' ? 'immediate' : pos?.trade_type === 'day_trading' ? 'short' : 'medium';
                  })(),
                  risk_mode: 'neutral',
                  is_breaking: openedNewsPopup.isBreaking || false,
                  summary: openedNewsPopup.aiAnalysis?.stage3?.overall_assessment || openedNewsPopup.aiAnalysis?.stage1?.immediate_impact || '',
                  ai_analysis: openedNewsPopup.aiAnalysis as NewsSignal['ai_analysis'],
                }}
                onAssetClick={(symbol) => setSelectedSymbol(assetToTvSymbol(symbol))}
              />
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
