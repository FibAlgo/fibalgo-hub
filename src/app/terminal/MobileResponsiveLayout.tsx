'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  Bell, 
  BookOpen, 
  GraduationCap,
  User,
  Users,
  Bot,
  Lock,
  Zap,
  BarChart3,
  Newspaper,
  LogOut,
  CreditCard,
  LineChart,
  HelpCircle,
  Activity
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { clearUserCache, CachedUserData } from '@/lib/userCache';
import { useSwipeNavigation } from '@/lib/hooks/useSwipeNavigation';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Mobile bottom navigation items (5 main items)
const mobileNavItems = [
  { icon: Home, label: 'Home', href: '/terminal' },
  { icon: Newspaper, label: 'News', href: '/terminal/news' },
  { icon: LineChart, label: 'Chart', href: '/terminal/chart' },
  { icon: BarChart3, label: 'Markets', href: '/terminal/markets' },
  { icon: Calendar, label: 'Calendar', href: '/terminal/calendar' },
];

// Side drawer menu items
const drawerMenuItems = [
  { icon: Home, label: 'Home', href: '/terminal' },
  { icon: Activity, label: 'Signals', href: '/terminal/signals', isLocked: true },
  { icon: Zap, label: 'Premium', href: '/#pricing', isPremium: true },
  { icon: BookOpen, label: 'Library', href: '/library' },
  { icon: GraduationCap, label: 'Education', href: '/terminal/education', isLocked: true },
  { icon: Users, label: 'Community', href: '/terminal/community', isLocked: true },
  { icon: Bot, label: 'Agent', href: '/terminal/agent', isLocked: true },
  { icon: CreditCard, label: 'Billing', href: '/dashboard?tab=billing' },
  { icon: User, label: 'Profile', href: '/dashboard?tab=profile' },
];

interface MobileResponsiveLayoutProps {
  children: React.ReactNode;
  user: SupabaseUser | null;
  userData: CachedUserData | null;
  profileName: string;
  profileAvatarUrl: string;
  isPremium: boolean;
  isScrollingDown: boolean;
  setIsScrollingDown: (value: boolean) => void;
  unreadNotificationCount: number;
}

export default function MobileResponsiveLayout({
  children,
  user,
  userData,
  profileName,
  profileAvatarUrl,
  isPremium,
  isScrollingDown,
  setIsScrollingDown,
  unreadNotificationCount,
}: MobileResponsiveLayoutProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Show "Premium" upsell only for Basic members
  const shouldShowPremiumUpsell =
    (userData?.plan || 'basic').toLowerCase() === 'basic';
  
  const bottomNavRef = useRef<HTMLElement | null>(null);
  const mobileHeaderRef = useRef<HTMLDivElement | null>(null);
  const premiumBannerRef = useRef<HTMLDivElement | null>(null);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollY = useRef<number>(0);
  const scrollThreshold = 10;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Save scroll position continuously
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saveScrollPosition = () => {
      const scrollY = window.scrollY;
      if (scrollY > 0) {
        sessionStorage.setItem(`scroll_${pathname}`, scrollY.toString());
      }
    };

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          saveScrollPosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const handleBeforeUnload = () => saveScrollPosition();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname]);

  // Restore scroll position
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedPosition = sessionStorage.getItem(`scroll_${pathname}`);
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      if (position > 0) {
        const restoreScroll = () => {
          window.scrollTo({
            top: position,
            behavior: 'instant' as ScrollBehavior
          });
        };

        const observer = new MutationObserver(() => {
          if (document.body.scrollHeight > position) {
            restoreScroll();
            observer.disconnect();
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 2000);
      }
    }
  }, [pathname]);

  // Hide/show header and bottom nav on scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY.current;

      // Sayfa üstünde veya üste yakınsa (150px içinde) her zaman göster
      if (currentScrollY <= 150) {
        setIsScrollingDown(false);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (Math.abs(scrollDiff) >= scrollThreshold) {
        if (scrollDiff > 0) {
          // Aşağı scroll - gizle
          setIsScrollingDown(true);
        } else if (scrollDiff < 0) {
          // Yukarı scroll - göster
          setIsScrollingDown(false);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setIsScrollingDown]);

  // Swipe navigation for drawer (disabled on news page - news has its own tab logic)
  const isNewsPage = pathname === '/terminal/news';
  useSwipeNavigation({
    onOpenDrawer: () => !isNewsPage && setIsDrawerOpen(true),
  });

  // Listen for openMobileDrawer event
  useEffect(() => {
    const handleOpenDrawer = () => setIsDrawerOpen(true);
    window.addEventListener('openMobileDrawer', handleOpenDrawer);
    return () => window.removeEventListener('openMobileDrawer', handleOpenDrawer);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isDrawerOpen]);

  // Update CSS variables for content offset
  useEffect(() => {
    if (!isMounted) return;

    const updateOffsets = () => {
      const headerHeight = mobileHeaderRef.current?.getBoundingClientRect().height || 64;
      const bannerHeight = !isPremium && premiumBannerRef.current 
        ? premiumBannerRef.current.getBoundingClientRect().height 
        : 0;
      const totalOffset = headerHeight + bannerHeight;

      document.documentElement.style.setProperty('--content-top-offset', `${totalOffset}px`);
      document.documentElement.style.setProperty('--mobile-header-height', `${headerHeight}px`);
      
      if (!isPremium && bannerHeight > 0) {
        document.body.classList.add('has-premium-banner');
        document.body.classList.remove('no-premium-banner');
      } else {
        document.body.classList.add('no-premium-banner');
        document.body.classList.remove('has-premium-banner');
      }
    };

    updateOffsets();
    
    const resizeObserver = new ResizeObserver(updateOffsets);
    if (mobileHeaderRef.current) resizeObserver.observe(mobileHeaderRef.current);
    if (premiumBannerRef.current) resizeObserver.observe(premiumBannerRef.current);

    return () => resizeObserver.disconnect();
  }, [isMounted, isPremium]);

  const isActiveRoute = (href: string) => {
    if (href === '/terminal') return pathname === '/terminal';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Styles */}
      <style jsx global>{`
        .mobile-terminal-container {
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
          background: #000;
          padding-top: var(--content-top-offset, 64px);
          overflow-y: scroll;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          transition: padding-top 0.05s ease-out;
        }
        .mobile-terminal-container.scroll-hide {
          padding-top: var(--premium-banner-height, 50px) !important;
        }
        .mobile-terminal-container.scroll-hide.no-banner {
          padding-top: 0 !important;
        }
        .mobile-terminal-container::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        
        /* Hide all scrollbars on mobile */
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        :root {
          --header-offset: 0px;
          --mobile-header-offset: 64px;
          --premium-banner-height: 50px;
          --content-top-offset: 64px;
        }
        body.has-premium-banner {
          --content-top-offset: 114px;
        }
        body.no-premium-banner {
          --content-top-offset: 64px;
        }

        .mobile-terminal-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: auto;
          min-height: auto;
          padding-bottom: calc(80px + env(safe-area-inset-bottom));
          overflow: visible !important;
        }

        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: #000;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1001;
          height: 64px;
          transition: transform 0.05s ease-out;
        }
        .mobile-header.scroll-hide {
          transform: translateY(-100%);
        }

        .terminal-bottom-nav {
          display: flex;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.1);
          padding: 0.3rem 0;
          padding-bottom: calc(0.3rem + env(safe-area-inset-bottom));
          z-index: 1000;
          transition: transform 0.05s ease-out;
        }
        .terminal-bottom-nav.scroll-hide {
          transform: translateY(100%);
        }
        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.2rem;
          padding: 0.25rem 0;
          text-decoration: none;
          color: rgba(255,255,255,0.5);
          transition: color 0.2s, transform 0.2s;
        }
        .bottom-nav-item.active {
          color: #00F5FF;
        }
        .bottom-nav-label {
          font-size: 0.58rem;
          font-weight: 500;
        }

        .mobile-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          z-index: 1100;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s, visibility 0.3s;
        }
        .mobile-drawer-overlay.open {
          opacity: 1;
          visibility: visible;
        }
        .mobile-drawer {
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          max-width: 80vw;
          background: #000;
          border-right: 1px solid rgba(255,255,255,0.1);
          z-index: 1200;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          padding: 1rem;
        }
        .mobile-drawer.open {
          transform: translateX(0);
        }
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 1rem;
        }
        .drawer-menu-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          color: rgba(255,255,255,0.9);
          text-decoration: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 500;
          transition: background 0.2s;
        }
        .drawer-menu-item:hover {
          background: rgba(255,255,255,0.1);
        }
        .drawer-logout {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .premium-banner-mobile {
          background: linear-gradient(90deg, #0a0a0a 0%, #1a1000 20%, #3d2000 50%, #1a1000 80%, #0a0a0a 100%);
          border-bottom: 1px solid rgba(245, 158, 11, 0.5);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          z-index: 1000;
          overflow: hidden;
          transition: transform 0.05s ease-out, top 0.05s ease-out;
        }
        .premium-banner-mobile.header-hidden {
          top: 0;
        }
        .premium-banner-mobile.scroll-hide {
          transform: translateY(-100%);
        }

        /* Swipe hint animation */
        .swipe-hint {
          position: fixed;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          width: 4px;
          height: 60px;
          background: linear-gradient(to bottom, transparent, rgba(0,245,255,0.3), transparent);
          border-radius: 2px;
          opacity: 0;
          animation: swipeHintPulse 3s ease-in-out infinite;
          pointer-events: none;
          z-index: 50;
        }
        @keyframes swipeHintPulse {
          0%, 100% { opacity: 0; transform: translateY(-50%) translateX(0); }
          50% { opacity: 1; transform: translateY(-50%) translateX(8px); }
        }
      `}</style>

      {/* Mobile Drawer Overlay */}
      {isMounted && (
        <div 
          className={`mobile-drawer-overlay ${isDrawerOpen ? 'open' : ''}`}
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Mobile Side Drawer */}
      {isMounted && (
        <div className={`mobile-drawer ${isDrawerOpen ? 'open' : ''}`}>
          <div className="drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {profileAvatarUrl ? (
                <img 
                  src={profileAvatarUrl} 
                  alt="Avatar"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00F5FF, #8B5CF6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '1.25rem'
                }}>
                  {(profileName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                  {profileName || user?.email?.split('@')[0] || 'User'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                  {user?.email}
                </div>
                <div style={{
                  marginTop: '0.25rem',
                  display: 'inline-block',
                  background: userData?.plan === 'lifetime' ? 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)'
                    : userData?.plan === 'ultimate' ? 'linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%)'
                    : userData?.plan === 'premium' ? 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)'
                    : 'rgba(96,165,250,0.2)',
                  color: userData?.plan === 'basic' ? '#60a5fa' : '#fff',
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  {userData?.plan || 'Basic'}
                </div>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1 }}>
            {drawerMenuItems.map((item) => {
              const Icon = item.icon;

              // "Premium" (upgrade) should only appear for Basic members
              if (item.isPremium && !shouldShowPremiumUpsell) {
                return null;
              }
              
              // Locked items - show with lock icon and disabled style
              if (item.isLocked) {
                return (
                  <div
                    key={item.label}
                    className="drawer-menu-item"
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      cursor: 'not-allowed',
                      pointerEvents: 'none'
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <Icon size={24} />
                      <Lock size={10} style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-4px',
                        color: 'rgba(255,255,255,0.5)'
                      }} />
                    </div>
                    <span>{item.label}</span>
                    <span style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.55rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      marginLeft: 'auto'
                    }}>
                      SOON
                    </span>
                  </div>
                );
              }
              
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="drawer-menu-item"
                  onClick={() => setIsDrawerOpen(false)}
                  style={item.isPremium ? { color: '#F59E0B' } : undefined}
                >
                  <Icon size={24} />
                  <span>{item.label}</span>
                  {item.isPremium && (
                    <span style={{
                      background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                      color: '#fff',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      marginLeft: 'auto'
                    }}>
                      PRO
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="drawer-logout">
            <Link
              href="/dashboard?tab=support"
              onClick={() => setIsDrawerOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.75rem',
                textDecoration: 'none'
              }}
            >
              <HelpCircle size={14} />
              <span>Help Center</span>
            </Link>
            <div style={{
              height: '1px',
              background: 'rgba(255,255,255,0.1)',
              margin: '0.5rem 1rem'
            }} />
            <button
              onClick={async () => {
                setIsDrawerOpen(false);
                clearUserCache();
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
              className="drawer-menu-item"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#EF4444'
              }}
            >
              <LogOut size={24} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      <div className={`mobile-terminal-container ${isScrollingDown && !isNotificationCenterOpen ? 'scroll-hide' : ''} ${isPremium ? 'no-banner' : ''}`} ref={terminalContainerRef}>
        {/* Mobile Header */}
        <div 
          className={`mobile-header ${isScrollingDown && !isNotificationCenterOpen ? 'scroll-hide' : ''}`}
          ref={mobileHeaderRef}
        >
          {/* Left - Avatar (opens drawer) */}
          <button 
            onClick={() => setIsDrawerOpen(true)}
            style={{ 
              width: '36px', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              padding: 0
            }}
          >
            {profileAvatarUrl ? (
              <img 
                src={profileAvatarUrl} 
                alt="Avatar"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : user && (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00F5FF, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                {(profileName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {/* Center - Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Image
              src="/logo-white.svg"
              alt="FibAlgo"
              width={110}
              height={32}
              style={{ objectFit: 'contain' }}
            />
          </Link>

          {/* Right - Notifications */}
          <div style={{ width: '36px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.7)', 
                position: 'relative',
                padding: 0
              }}
            >
              <Bell size={24} />
              {unreadNotificationCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#00F5FF',
                  color: '#000',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.35rem',
                  borderRadius: '9999px',
                  minWidth: '16px',
                  textAlign: 'center'
                }}>{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Notification Center Panel */}
        <NotificationCenter 
          isOpen={isNotificationCenterOpen} 
          onClose={() => setIsNotificationCenterOpen(false)}
          isPremium={isPremium}
        />

        {/* Premium Banner - Only show if not premium */}
        {shouldShowPremiumUpsell && (
          <div 
            className={`premium-banner-mobile ${isScrollingDown && !isNotificationCenterOpen ? 'header-hidden' : ''}`}
            ref={premiumBannerRef}
          >
            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '300px',
              height: '80px',
              background: 'radial-gradient(ellipse, rgba(245, 158, 11, 0.25) 0%, transparent 70%)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative', zIndex: 1 }}>
              <Zap size={16} style={{ color: '#F59E0B' }} fill="#F59E0B" />
              <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.85rem' }}>
                Unlock Premium
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.15rem' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>$49.99</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>/mo</span>
              </div>
              <Link
                href="/#pricing"
                style={{
                  background: '#F59E0B',
                  color: '#000',
                  padding: '0.4rem 0.9rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)'
                }}
              >
                Subscribe
              </Link>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="mobile-terminal-main">
          <main style={{ flex: 1, overflow: 'hidden' }}>
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav 
          className={`terminal-bottom-nav ${isScrollingDown && !isNotificationCenterOpen ? 'scroll-hide' : ''}`}
          ref={bottomNavRef}
        >
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="bottom-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
