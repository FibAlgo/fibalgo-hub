'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Bell,
  BookOpen, 
  GraduationCap,
  Users, 
  Bot,
  Lock,
  User,
  Zap,
  LogOut,
  HelpCircle,
  Newspaper,
  Activity,
  BarChart2,
  Calendar
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCachedUser, fetchAndCacheUser, clearUserCache, CachedUserData } from '@/lib/userCache';
import { appConfig } from '@/lib/config';
import TerminalLoadingScreen from '@/components/terminal/TerminalLoadingScreen';
import TerminalPreviewAuthGate from '@/components/terminal/TerminalPreviewAuthGate';
import { needsInitialLoad } from '@/lib/store/terminalCache';
import { TerminalProvider } from '@/lib/context/TerminalContext';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import MobileResponsiveLayout from './MobileResponsiveLayout';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const menuItems = [
  { icon: Home, label: 'Home', href: '/terminal' },
  { icon: Bell, label: 'Notifications', href: '#notifications', isNotification: true },
  { icon: Newspaper, label: 'News & Feed', href: '/terminal/news' },
  { icon: BarChart2, label: 'Markets', href: '/terminal/markets' },
  { icon: Calendar, label: 'Calendar', href: '/terminal/calendar' },
  { icon: Activity, label: 'Signals', href: '/terminal/signals', isLocked: true },
  { icon: Zap, label: 'Premium', href: '/#pricing', isPremium: true },
  { icon: BookOpen, label: 'Library', href: '/library' },
  { icon: GraduationCap, label: 'Education', href: '/terminal/education', isLocked: true },
  { icon: Users, label: 'Community', href: '/terminal/community', isLocked: true },
  { icon: Bot, label: 'Agent', href: '/terminal/agent', isLocked: true },
  { icon: User, label: 'Profile', href: '/dashboard?tab=profile' },
];

export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<CachedUserData | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string>('');
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isScrollingDown, setIsScrollingDown] = useState<boolean>(false);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  // Show "Premium" upsell only for Basic members
  const shouldShowPremiumUpsell =
    (userData?.plan || 'basic').toLowerCase() === 'basic';

  // Check if we need initial load after mount (avoids hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
    // Check if mobile
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    if (!needsInitialLoad()) {
      setIsLoading(false);
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Pages that use the shared layout - ALL /terminal pages including /terminal itself
  const useSharedLayout = pathname.startsWith('/terminal');

  useEffect(() => {
    if (!useSharedLayout) return;
    
    const loadUser = async () => {
      // Check cache first
      const cached = getCachedUser();
      if (cached) {
        // cached has id, email, name, avatarUrl, subscription, etc.
        setUser({ id: cached.id, email: cached.email } as SupabaseUser);
        setUserData(cached);
        setProfileName(cached.name || '');
        setProfileAvatarUrl(cached.avatarUrl || '');
        setIsPremium(cached.subscription?.isActive && cached.plan !== 'basic');
        return;
      }

      // Fetch fresh data
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const fetchedUserData = await fetchAndCacheUser(authUser.id, authUser.email || '');
        if (fetchedUserData) {
          setUserData(fetchedUserData);
          setProfileName(fetchedUserData.name || '');
          setProfileAvatarUrl(fetchedUserData.avatarUrl || '');
          setIsPremium(fetchedUserData.subscription?.isActive && fetchedUserData.plan !== 'basic');
        }
      }
    };

    loadUser();

    // Fetch unread notification count
    const fetchNotificationCount = async () => {
      try {
        const res = await fetch('/api/user/notifications/history?limit=1');
        if (res.ok) {
          const data = await res.json();
          setUnreadNotificationCount(data.unread_count || 0);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();
    // Refresh count every minute
    const interval = setInterval(fetchNotificationCount, 60000);

    return () => clearInterval(interval);
  }, [useSharedLayout]);

  // Update body class based on premium banner visibility (CSS offsets)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (!shouldShowPremiumUpsell) {
        document.body.classList.remove('has-premium-banner');
        document.body.classList.add('no-premium-banner');
      } else {
        document.body.classList.remove('no-premium-banner');
        document.body.classList.add('has-premium-banner');
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('has-premium-banner', 'no-premium-banner');
      }
    };
  }, [shouldShowPremiumUpsell]);

  const isActiveRoute = (href: string) => {
    if (href === '/terminal') {
      return pathname === '/terminal';
    }
    return pathname.startsWith(href);
  };

  // If not using shared layout, just render children
  if (!useSharedLayout) {
    return <>{children}</>;
  }

  // Context value for child components
  const terminalContextValue = {
    user: user ? { id: user.id, email: user.email || '' } : null,
    userData,
    isPremium,
    profileName,
    profileAvatarUrl,
    isLoading,
    isScrollingDown,
    setIsScrollingDown,
  };

  // Mobile: Use separate component
  if (isMounted && isMobile) {
    return (
      <TerminalProvider value={terminalContextValue}>
        {isLoading && (
          <TerminalLoadingScreen onComplete={() => setIsLoading(false)} />
        )}
        <TerminalPreviewAuthGate user={user} />
        <MobileResponsiveLayout
          user={user}
          userData={userData}
          profileName={profileName}
          profileAvatarUrl={profileAvatarUrl}
          isPremium={isPremium}
          isScrollingDown={isScrollingDown}
          setIsScrollingDown={setIsScrollingDown}
          unreadNotificationCount={unreadNotificationCount}
        >
          {children}
        </MobileResponsiveLayout>
      </TerminalProvider>
    );
  }

  // Desktop layout
  return (
    <TerminalProvider value={terminalContextValue}>
      {/* Loading Screen - shows on first visit to prefetch all data */}
      {isLoading && (
        <TerminalLoadingScreen onComplete={() => setIsLoading(false)} />
      )}

      <TerminalPreviewAuthGate user={user} />
      
      {/* Mobile Responsive Styles */}
      <style jsx global>{`
        .terminal-container {
          display: flex;
          min-height: 100vh;
          background: #000;
        }
        /* CSS Custom Properties for dynamic header offset */
        :root {
          --header-offset: 0px;
          --mobile-header-offset: 64px;
          --premium-banner-height: 50px;
          --content-top-offset: 64px;
        }
        /* Premium banner shown - update offset */
        body.has-premium-banner {
          --content-top-offset: 114px;
        }
        /* Premium banner hidden - use header only */
        body.no-premium-banner {
          --content-top-offset: 64px;
        }
        .terminal-sidebar {
          width: 275px;
          border-right: 1px solid rgba(255,255,255,0.1);
          padding: 0.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          flex-shrink: 0;
          overflow-y: auto;
        }
        .terminal-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .terminal-bottom-nav {
          display: none;
        }
        .mobile-header {
          display: none;
        }
        .mobile-drawer-overlay {
          display: none;
        }
        .mobile-drawer {
          display: none;
        }
        .premium-banner-mobile {
          display: none !important;
        }
        .premium-banner-desktop {
          display: flex;
        }
        /* Mobile scrollbar styling */
        .terminal-main::-webkit-scrollbar {
          width: 4px;
        }
        .terminal-main::-webkit-scrollbar-track {
          background: transparent;
        }
        .terminal-main::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
        }
        
        /* Tablet (768px - 1024px) */
        @media (max-width: 1024px) {
          .terminal-sidebar {
            width: 80px;
            padding: 0.5rem;
          }
          .terminal-sidebar .menu-label,
          .terminal-sidebar .user-info,
          .terminal-sidebar .post-button-text {
            display: none;
          }
          .terminal-sidebar .menu-item {
            justify-content: center;
            padding: 0.75rem;
          }
        }
      `}</style>

      <div className="terminal-container" ref={terminalContainerRef}>

      {/* Notification Center Panel */}
      <NotificationCenter 
        isOpen={isNotificationCenterOpen} 
        onClose={() => setIsNotificationCenterOpen(false)}
        isPremium={isPremium}
      />

      {/* Left Sidebar - Menu (Desktop Only) */}
      <aside className="terminal-sidebar">
        {/* Logo */}
        <Link href="/" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
          <Image
            src="/logo-white.svg"
            alt="FibAlgo"
            width={120}
            height={32}
            style={{ objectFit: 'contain' }}
          />
        </Link>

        {/* Menu Items */}
        <nav style={{ flex: 1 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);

            // "Premium" (upgrade) should only appear for Basic members
            if (item.isPremium && !shouldShowPremiumUpsell) {
              return null;
            }
            
            // Special handling for Notifications - opens panel instead of navigating
            if (item.isNotification) {
              return (
                <button
                  key={item.label}
                  onClick={() => setIsNotificationCenterOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.875rem 1rem',
                    borderRadius: '9999px',
                    color: 'rgba(255,255,255,0.85)',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 400,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    position: 'relative',
                    width: '100%',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ position: 'relative' }}>
                    <Icon size={26} strokeWidth={2} />
                    {unreadNotificationCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#00F5FF',
                        color: '#000',
                        fontSize: '0.5rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.3rem',
                        borderRadius: '9999px',
                        minWidth: '14px',
                        textAlign: 'center'
                      }}>{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>
                    )}
                  </div>
                  <span className="menu-label">{item.label}</span>
                </button>
              );
            }

            // Locked items - show with lock icon and disabled style
            if (item.isLocked) {
              return (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.875rem 1rem',
                    borderRadius: '9999px',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '1.1rem',
                    fontWeight: 400,
                    cursor: 'not-allowed',
                    position: 'relative',
                    background: 'transparent'
                  }}
                  title="Coming Soon"
                >
                  <div style={{ position: 'relative' }}>
                    <Icon size={26} strokeWidth={2} />
                    <Lock size={10} style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-4px',
                      color: 'rgba(255,255,255,0.5)'
                    }} />
                  </div>
                  <span className="menu-label">{item.label}</span>
                  <span style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.5rem',
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1rem',
                  borderRadius: '9999px',
                  color: isActive ? '#fff' : item.isPremium ? '#F59E0B' : 'rgba(255,255,255,0.85)',
                  textDecoration: 'none',
                  fontSize: '1.1rem',
                  fontWeight: isActive ? 700 : 400,
                  transition: 'background 0.2s',
                  position: 'relative',
                  background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.05)' : 'transparent'}
              >
                <div style={{ position: 'relative' }}>
                  <Icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="menu-label">{item.label}</span>
                {item.isPremium && (
                  <span style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                    color: '#fff',
                    fontSize: '0.55rem',
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

        {/* Help Center Link */}
        <Link 
          href="/dashboard?tab=support"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.85rem',
            textDecoration: 'none',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <HelpCircle size={16} />
          <span className="menu-label">Help Center</span>
        </Link>

        {/* User Profile */}
        {user && (
          <>
            <Link
              href="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                textDecoration: 'none',
                color: 'inherit'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
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
                  {(profileName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profileName || user.email?.split('@')[0] || 'User'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
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
            </Link>
            
            {/* Logout button */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '0.75rem',
              marginTop: '-0.75rem'
            }}>
              <button
                onClick={async () => {
                  clearUserCache();
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s'
                }}
                title="Çıkış Yap"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                }}
              >
                <LogOut size={18} />
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Main Content Area */}
      <div className={`terminal-main ${isPremium ? 'no-premium-banner' : 'has-premium-banner'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Premium Banner - Only show if not premium */}
        {shouldShowPremiumUpsell && (
          <>
            {/* Desktop Premium Banner */}
            <div className="premium-banner-desktop" style={{
              background: 'linear-gradient(90deg, #0a0a0a 0%, #1a1000 20%, #3d2000 50%, #1a1000 80%, #0a0a0a 100%)',
              borderBottom: '2px solid rgba(245, 158, 11, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              padding: '1.75rem 2.5rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Glow effect */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '35%',
                width: '600px',
                height: '150px',
                background: 'radial-gradient(ellipse, rgba(245, 158, 11, 0.25) 0%, transparent 70%)',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }} />
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', position: 'relative', zIndex: 1 }}>
                <Zap size={32} style={{ color: '#F59E0B', marginTop: '4px' }} fill="#F59E0B" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
                    Unlock FibAlgo Terminal
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>
                    Get real-time news alerts, AI-powered analysis & premium trading signals
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'right' }}>
                  <div>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '2rem' }}>${appConfig.plans.premium.price}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>/mo</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Premium Access</div>
                </div>
                <Link
                  href="/#pricing"
                  style={{
                    background: '#F59E0B',
                    color: '#000',
                    padding: '1rem 2rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    textDecoration: 'none',
                    boxShadow: '0 0 30px rgba(245, 158, 11, 0.4)'
                  }}
                >
                  Subscribe Now
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Page Content */}
        <main className="terminal-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
    </TerminalProvider>
  );
}
