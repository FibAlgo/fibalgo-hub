'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { User, LogOut, Shield, LayoutDashboard, Crown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCachedUser, fetchAndCacheUser, clearUserCache } from '@/lib/userCache';

// Map old plan names to new ones
const mapPlanName = (planName: string | null): string => {
  if (!planName) return 'Basic';
  const lower = planName.toLowerCase();
  if (lower === 'ultimate' || lower === 'pro') return 'Ultimate';
  if (lower === 'premium' || lower === 'hub') return 'Premium';
  if (lower === 'lifetime') return 'Lifetime';
  if (lower === 'basic' || lower === 'free') return 'Basic';
  return planName;
};

// Get plan color based on plan name
const getPlanColor = (plan: string): string => {
  switch (plan) {
    case 'Lifetime': return '#FFD700'; // Gold
    case 'Ultimate': return '#A855F7'; // Purple
    case 'Premium': return '#00F5FF'; // Cyan
    default: return '#60a5fa'; // Blue for Basic
  }
};

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Initialize all user data from cache immediately
  const cachedUser = typeof window !== 'undefined' ? getCachedUser() : null;
  const [userRole, setUserRole] = useState<string | null>(cachedUser?.role || null);
  const [userEmail, setUserEmail] = useState<string | null>(cachedUser?.email || null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(cachedUser?.avatarUrl || null);
  const [userName, setUserName] = useState<string | null>(cachedUser?.name || null);
  const [userPlan, setUserPlan] = useState<string | null>(cachedUser?.plan || null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    // Check if user is logged in with Supabase
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email || null);
        
        // Fetch and cache user data - always refresh to ensure correct data
        const cachedData = await fetchAndCacheUser(user.id, user.email || '', { refresh: true });
        if (cachedData) {
          setUserRole(cachedData.role || 'user');
          setUserName(cachedData.name || user.email?.split('@')[0] || null);
          const dbAvatar = cachedData.avatarUrl ? `${cachedData.avatarUrl}?v=${Date.now()}` : null;
          setUserAvatarUrl(dbAvatar || null);
          setUserPlan(cachedData.plan || 'basic');
        } else {
          setUserRole('user');
          setUserName(user.email?.split('@')[0] || null);
          setUserAvatarUrl(null);
          setUserPlan('basic');
        }
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
        setUserEmail(null);
        setUserAvatarUrl(null);
        setUserName(null);
        setUserPlan(null);
        // Clear cached data on logout
        clearUserCache();
      }
    };

    window.addEventListener('scroll', handleScroll);
    checkAuth();
    
    // Check auth on focus (when user comes back to tab)
    window.addEventListener('focus', checkAuth);
    
    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkAuth();
      }
    });

    // Poll for user data updates every 3 seconds
    const pollInterval = setInterval(checkAuth, 3000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('focus', checkAuth);
      subscription.unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserRole(null);
    setUserEmail(null);
    setUserAvatarUrl(null);
    setUserName(null);
    setUserPlan(null);
    setShowProfileMenu(false);
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/terminal', label: 'FibAlgo Hub', isFireText: true, isNew: true },
  ];

  const getDashboardLink = () => {
    if (userRole === 'admin') {
      return '/admin';
    }
    return '/dashboard';
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            // Use clamp (CSS) instead of JS breakpoint state to prevent
            // “big font then shrink” on mobile during hydration.
            padding: 'clamp(0.5rem, 2vw, 1rem) clamp(0.75rem, 3vw, 1.5rem)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              height: 'clamp(56px, 6vw, 68px)',
              padding: '0 clamp(1rem, 3vw, 2rem)',
              background: 'rgba(10,10,20,0.25)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 'clamp(16px, 2vw, 20px)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
            }}
          >
            {/* Logo - Left */}
            <Link href="/" style={{ position: 'absolute', left: 'clamp(1rem, 2vw, 1.5rem)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <Image
                src="/logo-white.svg"
                alt="FibAlgo Logo"
                width={120}
                height={32}
                priority
                sizes="(max-width: 768px) 95px, 120px"
                style={{ width: 'clamp(95px, 14vw, 120px)', height: 'auto' }}
              />
            </Link>

            {/* Navigation Links - Centered */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'clamp(0.25rem, 2vw, 1rem)',
            }}>
              {navLinks.map((link) => {
                const isFireText = link.isFireText;
                const isNew = 'isNew' in link && link.isNew;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      color: isFireText ? 'transparent' : 'rgba(255,255,255,0.7)',
                      fontSize: 'clamp(0.9rem, 2.5vw, 1.05rem)',
                      fontWeight: isFireText ? 700 : 500,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      padding: 'clamp(0.45rem, 1.2vw, 0.6rem) clamp(0.7rem, 2.5vw, 1.25rem)',
                      borderRadius: '10px',
                      transition: 'all 0.2s ease',
                      background: isFireText 
                        ? 'linear-gradient(90deg, #FBBF24 0%, #F59E0B 25%, #EF4444 60%, #DC2626 100%)'
                        : 'transparent',
                      WebkitBackgroundClip: isFireText ? 'text' : undefined,
                      backgroundClip: isFireText ? 'text' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                    onMouseEnter={(e) => {
                      if (!isFireText) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isFireText) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                      }
                    }}
                  >
                    {link.label}
                    {isNew && (
                      <span style={{
                        background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                        color: '#fff',
                        fontSize: 'clamp(0.55rem, 1.5vw, 0.6rem)',
                        fontWeight: 700,
                        padding: 'clamp(0.15rem, 0.6vw, 0.2rem) 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        NEW
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right side - Login/Profile */}
            <div style={{ position: 'absolute', right: 'clamp(1rem, 2vw, 1.5rem)', display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 1.5vw, 0.75rem)' }}>
              {isLoggedIn ? (
                /* Profile Menu */
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 'clamp(36px, 5vw, 44px)',
                      height: 'clamp(36px, 5vw, 44px)',
                      background: userRole === 'admin' 
                        ? 'linear-gradient(135deg, #BF00FF 0%, #00F5FF 100%)' 
                        : 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                      border: 'none',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      boxShadow: '0 0 15px rgba(0,245,255,0.3)',
                      overflow: 'hidden',
                    }}
                  >
                    {userAvatarUrl ? (
                      <img src={userAvatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : userRole === 'admin' ? (
                      <Shield style={{ width: 'clamp(20px, 3vw, 22px)', height: 'clamp(20px, 3vw, 22px)', color: '#0A0A0F' }} />
                    ) : (
                      <User style={{ width: 'clamp(20px, 3vw, 22px)', height: 'clamp(20px, 3vw, 22px)', color: '#0A0A0F' }} />
                    )}
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showProfileMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        background: 'rgba(15,15,25,0.98)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '0.5rem',
                        minWidth: '180px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(20px)',
                      }}
                    >
                      <div
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <p style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
                            {userRole === 'admin' ? 'Admin' : (userName || 'User')}
                          </p>
                          {userRole === 'admin' && (
                            <span style={{ 
                              fontSize: '0.6rem', 
                              padding: '0.125rem 0.375rem', 
                              background: 'rgba(191,0,255,0.3)', 
                              color: '#BF00FF', 
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}>
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: 0 }}>
                          {userEmail || 'user@fibalgo.com'}
                        </p>
                        {/* User Plan Badge */}
                        {(() => {
                          const displayPlan = mapPlanName(userPlan);
                          const planColor = getPlanColor(displayPlan);
                          return (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.35rem', 
                              marginTop: '0.5rem',
                              padding: '0.35rem 0.5rem',
                              background: displayPlan === 'Lifetime'
                                ? 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,140,0,0.15) 100%)'
                                : displayPlan === 'Ultimate' 
                                  ? 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(139,92,246,0.2) 100%)'
                                  : displayPlan === 'Premium'
                                    ? 'linear-gradient(135deg, rgba(0,245,255,0.15) 0%, rgba(0,168,255,0.15) 100%)'
                                    : 'rgba(255,255,255,0.05)',
                              borderRadius: '6px',
                              border: `1px solid ${planColor}33`,
                            }}>
                              <Crown style={{ 
                                width: '12px', 
                                height: '12px', 
                                color: planColor 
                              }} />
                              <span style={{ 
                                fontSize: '0.7rem', 
                                fontWeight: 600,
                                color: planColor,
                              }}>
                                {displayPlan} Plan
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      <Link
                        href={getDashboardLink()}
                        onClick={() => setShowProfileMenu(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          color: 'rgba(255,255,255,0.8)',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <LayoutDashboard style={{ width: '16px', height: '16px' }} />
                        {userRole === 'admin' ? 'Admin Panel' : 'Dashboard'}
                      </Link>
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          color: '#f87171',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        <LogOut style={{ width: '16px', height: '16px' }} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Login Button */
                <Link
                  href="/login"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'clamp(0.55rem, 1.5vw, 0.6rem) clamp(1.1rem, 4vw, 1.5rem)',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                >
                  Log In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Click outside to close profile menu */}
      {showProfileMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
          }}
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </>
  );
}
