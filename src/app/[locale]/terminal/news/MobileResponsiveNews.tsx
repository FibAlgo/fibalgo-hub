'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronRight,
  Zap,
  Search,
  RefreshCw,
  X,
  Lock,
  Loader2,
} from 'lucide-react';
import { EnhancedNewsCard, type AIAnalysis } from '@/components/news/NewsAnalysisCard';
import { useTerminal } from '@/lib/context/TerminalContext';
import { useLocale, useTranslations } from 'next-intl';
import { getCategoryColors, getCanonicalCategory, getCategoryLabel } from '@/lib/utils/news-categories';

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
  newsId?: string;
  source: string;
  handle: string;
  avatar: string;
  content: string;
  time: string;
  publishedAt?: string;
  createdAt?: string;
  sourceLabel: string;
  url?: string;
  category?: 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices' | 'general' | 'macro';
  isBreaking?: boolean;
  sourceCredibility?: SourceCredibility;
  analysis?: {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    score: number;
    summary: string;
    impact: string;
    risk?: string;
    tradingPairs: TradingPair[];
  };
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

interface TrendingTopic {
  rank: number;
  topic: string;
  count: number;
}

interface MobileResponsiveNewsProps {
  news: NewsItem[];
  filteredNews: NewsItem[];
  breakingNews: NewsItem[];
  trendingTopics: TrendingTopic[];
  sentimentData: SentimentData | null;
  isLoading: boolean;
  selectedNewsId: number | string | null;
  setSelectedNewsId: (id: number | string | null) => void;
  activeFilter: 'all' | 'bullish' | 'bearish' | 'neutral';
  setActiveFilter: (filter: 'all' | 'bullish' | 'bearish' | 'neutral') => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sentimentPeriod: '24h' | '7d' | '30d';
  setSentimentPeriod: (period: '24h' | '7d' | '30d') => void;
  fetchNews: (forceRefresh?: boolean) => void;
  showNewPostsBanner?: boolean;
  newPostsCount?: number;
  onShowNewPosts?: () => void;
  loadMoreNews?: () => void;
  hasMoreNews?: boolean;
  loadingMore?: boolean;
}

export default function MobileResponsiveNews({
  news,
  filteredNews,
  breakingNews,
  trendingTopics,
  sentimentData,
  isLoading,
  selectedNewsId,
  setSelectedNewsId,
  categoryFilter,
  setCategoryFilter,
  searchQuery,
  setSearchQuery,
  sentimentPeriod,
  setSentimentPeriod,
  fetchNews,
  showNewPostsBanner,
  newPostsCount,
  onShowNewPosts,
  loadMoreNews,
  hasMoreNews = true,
  loadingMore = false,
}: MobileResponsiveNewsProps) {
  const router = useRouter();
  const { isScrollingDown, isPremium } = useTerminal();
  const locale = useLocale();
  const t = useTranslations('mobileNews');
  const [activeTab, setActiveTab] = useState<'for-you' | 'following' | 'ai'>('for-you');
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [tabBarHeight, setTabBarHeight] = useState<number>(44);

  // Tab order for swipe navigation
  const tabOrder: Array<'for-you' | 'following' | 'ai'> = ['for-you', 'following', 'ai'];
  const isSwiping = useRef(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  // Save and restore scroll position
  useEffect(() => {
    // Restore scroll position on mount
    const savedScrollY = sessionStorage.getItem('news_scroll_position');
    if (savedScrollY) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScrollY, 10));
      });
    }

    // Save scroll position continuously
    const saveScrollPosition = () => {
      sessionStorage.setItem('news_scroll_position', window.scrollY.toString());
    };

    window.addEventListener('scroll', saveScrollPosition, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', saveScrollPosition);
    };
  }, []);

  // Load more news when user scrolls near bottom (mobile: window scroll)
  useEffect(() => {
    if (!loadMoreNews || !hasMoreNews || loadingMore || activeTab !== 'for-you') return;
    const handleScroll = () => {
      const { scrollY, innerHeight } = window;
      const scrollHeight = document.documentElement.scrollHeight;
      if (scrollY + innerHeight >= scrollHeight - 400) {
        loadMoreNews();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreNews, hasMoreNews, loadingMore, activeTab]);

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
    
    const rafId = requestAnimationFrame(() => {
      updateTabBarHeight();
      setTimeout(updateTabBarHeight, 100);
    });
    
    window.addEventListener('resize', updateTabBarHeight);
    
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

  const handleSwipe = useCallback(() => {
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;
    
    isSwiping.current = false;
    
    if (Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (Math.abs(deltaX) < 50) return;
    
    const currentIndex = tabOrder.indexOf(activeTab);
    
    if (deltaX < 0) {
      // Swipe left - go to next tab
      if (currentIndex < tabOrder.length - 1) {
        setActiveTab(tabOrder[currentIndex + 1]);
      }
    } else {
      // Swipe right
      if (currentIndex > 0) {
        // Go to previous tab
        setActiveTab(tabOrder[currentIndex - 1]);
      } else if (currentIndex === 0) {
        // On first tab (for-you) - open drawer
        window.dispatchEvent(new CustomEvent('openMobileDrawer'));
      }
    }
  }, [activeTab, tabOrder]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (document.querySelector('.mobile-drawer.open')) return;
      const target = e.target as HTMLElement;
      if (target.closest('.no-swipe') || target.closest('.filter-bar') || target.closest('.breaking-news-container') || target.closest('input') || target.closest('textarea')) {
        return;
      }
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
      isSwiping.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (document.querySelector('.mobile-drawer.open')) return;
      if (!isSwiping.current) return;
      
      const target = e.target as HTMLElement;
      if (target.closest('.no-swipe') || target.closest('.filter-bar') || target.closest('.breaking-news-container')) {
        isSwiping.current = false;
        return;
      }
      
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (document.querySelector('.mobile-drawer.open')) {
        isSwiping.current = false;
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest('.no-swipe') || target.closest('.filter-bar') || target.closest('.breaking-news-container') || target.closest('input') || target.closest('textarea')) {
        isSwiping.current = false;
        return;
      }
      if (!isSwiping.current) return;
      handleSwipe();
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleSwipe]);

  return (
    <div className="mobile-news-container">
      {/* Mobile Responsive Styles */}
      <style jsx global>{`
        /* Hide all scrollbars on mobile */
        .mobile-news-container * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .mobile-news-container *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        .mobile-news-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #0A0A0B;
          overflow-x: hidden;
          max-width: 100vw;
        }
        
        .mobile-tab-bar {
          display: flex;
          position: fixed;
          top: var(--content-top-offset, 64px);
          left: 0;
          right: 0;
          z-index: 999;
          background: rgba(0,0,0,0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          transition: transform 0.05s ease-out, top 0.05s ease-out;
        }
        
        .mobile-tab-bar.scroll-hide {
          transform: translateY(calc(-100% - var(--content-top-offset, 64px)));
          top: 0;
        }

        .mobile-new-posts-banner {
          position: fixed;
          top: calc(var(--content-top-offset, 64px) + 54px);
          left: 50%;
          transform: translateX(-50%) translateY(-20px);
          opacity: 0;
          z-index: 1001;
          pointer-events: none;
          transition: all 0.2s ease-out;
        }
        
        .mobile-new-posts-banner.visible {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
          pointer-events: auto;
        }
        
        .mobile-new-posts-banner.scroll-hide {
          top: 60px;
        }
        
        .mobile-new-posts-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: #1d9bf0;
          color: white;
          border: none;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(29, 155, 240, 0.4);
          transition: all 0.15s ease-out;
        }
        
        .mobile-new-posts-btn:active {
          transform: scale(0.95);
          background: #1a8cd8;
        }
        
        .mobile-new-posts-btn svg {
          width: 14px;
          height: 14px;
        }
        
        .mobile-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.85rem 0;
          color: rgba(255,255,255,0.5);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
          background: transparent;
          border: none;
        }
        
        .mobile-tab:hover {
          color: rgba(255,255,255,0.8);
          background: rgba(255,255,255,0.03);
        }
        
        .mobile-tab.active {
          color: #fff;
          font-weight: 600;
        }
        
        .mobile-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 50px;
          height: 3px;
          background: #00F5FF;
          border-radius: 3px 3px 0 0;
        }
        
        .mobile-content-area {
          flex: 1;
          padding-top: 56px;
          overflow-x: hidden;
          overflow-y: auto;
        }
        
        .mobile-tab-content {
          display: none;
          padding: 0 0.75rem;
        }
        
        .mobile-tab-content.current {
          display: block;
        }
        
        .mobile-breaking-news {
          background: #0D0D0D;
          border-radius: 12px;
          margin-bottom: 1rem;
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
          position: relative;
        }
        
        .mobile-sentiment-card {
          background: linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(10,10,15,0.98) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
          position: relative;
          overflow: hidden;
        }
        
        .mobile-filter-bar {
          display: flex;
          position: sticky;
          top: 0;
          z-index: 50;
          flex-direction: column;
          align-items: stretch;
          width: 100vw;
          margin-left: calc(-50vw + 50%);
          padding: 0;
          background: #0A0A0B;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          gap: 0;
        }
        
        .mobile-filter-scroll {
          display: flex;
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 0 1rem;
        }
        
        .mobile-filter-scroll::-webkit-scrollbar {
          display: none;
        }
        
        .mobile-filter-button {
          padding: 0.75rem 1rem;
          font-size: 0.8rem;
          flex-shrink: 0;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
          white-space: nowrap;
        }
        
        .mobile-filter-button.active {
          color: #00F5FF;
        }
        
        .mobile-filter-button.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #00F5FF;
          border-radius: 2px 2px 0 0;
        }
        
        .mobile-search-row {
          width: 100%;
          padding: 0.5rem 1rem;
          display: flex;
          gap: 0.5rem;
        }
        
        .mobile-search-input {
          flex: 1;
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 0.5rem 1rem 0.5rem 2.25rem;
          color: #fff;
          font-size: 0.8rem;
          outline: none;
        }
        
        .mobile-trend-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .mobile-trend-item:active {
          background: rgba(0,245,255,0.05);
          border-color: rgba(0,245,255,0.3);
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
        @keyframes sentimentPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>

      {/* Tab Bar */}
      <div 
        className={`mobile-tab-bar ${isScrollingDown ? 'scroll-hide' : ''}`}
        ref={tabBarRef}
      >
        <button 
          className={`mobile-tab ${activeTab === 'for-you' ? 'active' : ''}`}
          onClick={() => setActiveTab('for-you')}
        >
          {t('newsFeed')}
        </button>
        <button 
          className={`mobile-tab ${activeTab === 'following' ? 'active' : ''}`}
          onClick={() => setActiveTab('following')}
        >
          {t('trendTopics')}
        </button>
        <button 
          className={`mobile-tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          {t('marketSentiment')}
        </button>
      </div>

      {/* New Posts Banner */}
      {showNewPostsBanner && newPostsCount && newPostsCount > 0 && (
        <div className={`mobile-new-posts-banner visible ${isScrollingDown ? 'scroll-hide' : ''}`}>
          <button 
            className="mobile-new-posts-btn"
            onClick={onShowNewPosts}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
            {newPostsCount && newPostsCount > 1 ? t('newPostsPlural', { count: newPostsCount }) : t('newPosts', { count: newPostsCount })}
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="mobile-content-area">
        
        {/* NEWS & FEED TAB */}
        <div className={`mobile-tab-content ${activeTab === 'for-you' ? 'current' : ''}`}>
          
          {/* Breaking News */}
          {breakingNews.length > 0 && (
            <div className="mobile-breaking-news no-swipe">
              {/* Animated Background */}
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
              
              {/* Header */}
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

              {/* News Items + Footer: locked (blur + overlay) for basic; header above stays visible */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                {!isPremium && (
                  <a
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
                  </a>
                )}
                <div style={!isPremium ? { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
              {/* News Items */}
              <div className="terminal-scrollbar" style={{ maxHeight: '320px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
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
                  
                  // Use AI's direct news_sentiment (independent of trade decision)
                  const aiSentiment = item.aiAnalysis?.stage3?.news_sentiment?.toUpperCase();
                  const isBullish = aiSentiment === 'BULLISH';
                  const isBearish = aiSentiment === 'BEARISH';
                  
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
                        background: isVeryRecent ? 'rgba(220,38,38,0.08)' : 'transparent',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
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
                          }}>
                            {t('urgent')}
                          </span>
                        )}
                      </div>
                      
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
                        {isBullish && <TrendingUp size={16} color="#22C55E" strokeWidth={2.5} />}
                        {isBearish && <TrendingDown size={16} color="#EF4444" strokeWidth={2.5} />}
                        {!isBullish && !isBearish && <Activity size={14} color="rgba(255,255,255,0.3)" />}
                      </div>
                      
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
                        {(() => {
                          const cat = getCanonicalCategory(item);
                          if (!cat || cat === 'general') return null;
                          const colors = getCategoryColors(cat);
                          return (
                            <div style={{ marginTop: '6px' }}>
                              <span style={{
                                background: colors.bg,
                                color: colors.text,
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                              }}>
                                {getCategoryLabel(cat)}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      
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
              
              {/* Footer */}
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
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
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
          )}

          {/* Filters */}
          <div className="mobile-filter-bar no-swipe">
            <div className="mobile-filter-scroll">
              {([
                { key: 'all', label: 'All' },
                { key: 'forex', label: 'Forex' },
                { key: 'crypto', label: 'Crypto' },
                { key: 'stocks', label: 'Stocks' },
                { key: 'commodities', label: 'Commodities' },
                { key: 'indices', label: 'Indices' },
                { key: 'earnings', label: 'Earnings' }
              ] as const).map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setCategoryFilter(filter.key)}
                  className={`mobile-filter-button ${categoryFilter === filter.key ? 'active' : ''}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="mobile-search-row">
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mobile-search-input"
                  style={{ paddingLeft: '2.25rem', paddingRight: searchQuery ? '2.25rem' : '0.75rem' }}
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
              >
                <RefreshCw size={16} color="rgba(255,255,255,0.5)" />
              </button>
            </div>
          </div>

          {/* News List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
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
                    <div style={{ width: '85%', height: '16px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
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
                const hasTrade = item.aiAnalysis?.stage3?.trade_decision === 'TRADE';
                const isLockedForBasic = !isPremium && (item.isBreaking || hasTrade);
                const cardId = `news-card-${item.newsId ?? item.id}`;
                return (
                  <div key={`news-${item.id}-${index}`} id={cardId} style={{ position: 'relative' }}>
                    <div style={isLockedForBasic ? { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
                      <EnhancedNewsCard
                        id={item.id}
                        source={item.source}
                        content={item.content}
                        time={item.time}
                        publishedAt={item.publishedAt}
                        createdAt={item.createdAt}
                        url={item.url}
                        category={getCanonicalCategory(item)}
                        isBreaking={item.isBreaking}
                        sourceCredibility={item.sourceCredibility}
                        aiAnalysis={item.aiAnalysis}
                        isSelected={selectedNewsId === item.id}
                      />
                    </div>
                    {isLockedForBasic && (
                      <a
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
                      </a>
                    )}
                  </div>
                );
              })
            )}
            {loadingMore && (
              <>
                <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
                  <Loader2 size={20} style={{ animation: 'newsLoadMoreSpin 0.8s linear infinite' }} />
                  <span>{t('loadingMore')}</span>
                </div>
                <style>{`@keyframes newsLoadMoreSpin { to { transform: rotate(360deg); } }`}</style>
              </>
            )}
          </div>
        </div>

        {/* TREND TOPICS TAB */}
        <div className={`mobile-tab-content ${activeTab === 'following' ? 'current' : ''}`}>
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
                    className="mobile-trend-item"
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

        {/* MARKET SENTIMENT TAB */}
        <div className={`mobile-tab-content ${activeTab === 'ai' ? 'current' : ''}`}>
          <div className="mobile-sentiment-card">
            {/* Gradient background */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(59,130,246,0.3) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Activity size={18} color="#A78BFA" />
                </div>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{t('marketSentiment')}</h3>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{t('realTimeMarketMood')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.2rem' }}>
                {(['24h', '7d', '30d'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSentimentPeriod(period)}
                    style={{
                      padding: '0.3rem 0.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: sentimentPeriod === period ? 'rgba(139,92,246,0.3)' : 'transparent',
                      color: sentimentPeriod === period ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {sentimentData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 1 }}>
                
                {/* Score Display */}
                <div style={{
                  background: sentimentData.sentimentScore > 25 ? 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)' :
                              sentimentData.sentimentScore < -25 ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)' :
                              'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
                  border: `1px solid ${sentimentData.sentimentScore > 25 ? 'rgba(34,197,94,0.3)' :
                                        sentimentData.sentimentScore < -25 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  borderRadius: '12px',
                  padding: '1rem',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '2.75rem',
                    fontWeight: 800,
                    color: sentimentData.sentimentScore > 25 ? '#22C55E' :
                           sentimentData.sentimentScore < -25 ? '#EF4444' : '#F59E0B',
                    lineHeight: 1,
                  }}>
                    {sentimentData.sentimentScore > 0 ? '+' : ''}{sentimentData.sentimentScore}
                  </div>
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: sentimentData.sentimentScore > 25 ? '#22C55E' :
                           sentimentData.sentimentScore < -25 ? '#EF4444' : '#F59E0B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}>
                    {sentimentData.sentimentScore > 50 ? t('veryBullish') :
                     sentimentData.sentimentScore > 25 ? t('bullish') :
                     sentimentData.sentimentScore < -50 ? t('veryBearish') :
                     sentimentData.sentimentScore < -25 ? t('bearish') : t('mixed')}
                  </div>
                </div>

                {/* Sentiment Bar */}
                <div style={{ padding: '0 0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{t('bearish')}</span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{t('bullish')}</span>
                  </div>
                  <div style={{
                    height: '10px',
                    borderRadius: '5px',
                    background: 'linear-gradient(90deg, #EF4444 0%, #F97316 25%, #F59E0B 50%, #84CC16 75%, #22C55E 100%)',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      left: `${((sentimentData.sentimentScore + 100) / 200) * 100}%`,
                      transform: 'translateX(-50%)',
                      width: '18px',
                      height: '18px',
                      background: '#fff',
                      borderRadius: '50%',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
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
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {/* Bullish */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.02) 100%)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <TrendingUp size={14} color="#22C55E" />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>{t('bullish')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22C55E' }}>{sentimentData.bullish}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(34,197,94,0.7)' }}>
                        {sentimentData.total > 0 ? Math.round((sentimentData.bullish / sentimentData.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Bearish */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <TrendingDown size={14} color="#EF4444" />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>{t('bearish')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EF4444' }}>{sentimentData.bearish}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(239,68,68,0.7)' }}>
                        {sentimentData.total > 0 ? Math.round((sentimentData.bearish / sentimentData.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Neutral */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.02) 100%)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Activity size={14} color="#F59E0B" />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>{t('neutral')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F59E0B' }}>{sentimentData.neutral}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(245,158,11,0.7)' }}>
                        {sentimentData.total > 0 ? Math.round((sentimentData.neutral / sentimentData.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Impact */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.02) 100%)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Zap size={14} color="#8B5CF6" />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>{t('impact')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8B5CF6' }}>{sentimentData.avgNewsScore}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(139,92,246,0.7)' }}>/10</span>
                    </div>
                    <div style={{
                      marginTop: '0.25rem',
                      padding: '0.15rem 0.4rem',
                      background: 'rgba(239,68,68,0.2)',
                      borderRadius: '4px',
                      fontSize: '0.6rem',
                      color: '#EF4444',
                      fontWeight: 600,
                      display: 'inline-block',
                    }}>
                      {t('breaking', { count: sentimentData.breakingCount })}
                    </div>
                    {(sentimentData.excludedLowImpactCount ?? 0) > 0 && (
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', display: 'block', marginTop: '0.25rem' }}>
                        {t('lowImpactExcluded', { count: sentimentData.excludedLowImpactCount ?? 0 })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '100%', height: '150px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }} />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
