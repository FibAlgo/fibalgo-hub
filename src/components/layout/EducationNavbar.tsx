'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { User, LogOut, Shield, LayoutDashboard, Crown, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCachedUser, fetchAndCacheUser, clearUserCache } from '@/lib/userCache';
import { useTranslations } from 'next-intl';

const mapPlanName = (planName: string | null): string => {
  if (!planName) return 'Basic';
  const lower = planName.toLowerCase();
  if (lower === 'ultimate' || lower === 'pro') return 'Ultimate';
  if (lower === 'premium' || lower === 'hub') return 'Premium';
  if (lower === 'lifetime') return 'Lifetime';
  if (lower === 'basic' || lower === 'free') return 'Basic';
  return planName;
};

const getPlanColor = (plan: string): string => {
  switch (plan) {
    case 'Lifetime': return '#FFD700';
    case 'Ultimate': return '#A855F7';
    case 'Premium': return '#00F5FF';
    default: return '#60a5fa';
  }
};

export default function EducationNavbar() {
  const t = useTranslations('nav');
  const promoTitle = t('indicatorPromoTitle');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const cachedUser = typeof window !== 'undefined' ? getCachedUser() : null;
  const [userRole, setUserRole] = useState<string | null>(cachedUser?.role || null);
  const [userEmail, setUserEmail] = useState<string | null>(cachedUser?.email || null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(cachedUser?.avatarUrl || null);
  const [userName, setUserName] = useState<string | null>(cachedUser?.name || null);
  const [userPlan, setUserPlan] = useState<string | null>(cachedUser?.plan || null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email || null);
        const cachedData = await fetchAndCacheUser(user.id, user.email || '', { refresh: true });
        if (cachedData) {
          setUserRole(cachedData.role || 'user');
          setUserName(cachedData.name || user.email?.split('@')[0] || null);
          setUserAvatarUrl(cachedData.avatarUrl ? `${cachedData.avatarUrl}?v=${Date.now()}` : null);
          setUserPlan(cachedData.plan || 'basic');
        } else {
          setUserRole('user'); setUserName(user.email?.split('@')[0] || null);
          setUserAvatarUrl(null); setUserPlan('basic');
        }
      } else {
        setIsLoggedIn(false); setUserRole(null); setUserEmail(null);
        setUserAvatarUrl(null); setUserName(null); setUserPlan(null);
        clearUserCache();
      }
    };
    window.addEventListener('scroll', handleScroll);
    checkAuth();
    window.addEventListener('focus', checkAuth);
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') checkAuth();
    });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('focus', checkAuth);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      const scrollY = window.scrollY;
      document.body.setAttribute('data-scroll-lock', 'true');
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
    } else {
      const top = document.body.style.top;
      document.body.removeAttribute('data-scroll-lock');
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (top) window.scrollTo(0, parseInt(top || '0') * -1);
    }
    return () => {
      const top = document.body.style.top;
      document.body.removeAttribute('data-scroll-lock');
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (top) window.scrollTo(0, parseInt(top || '0') * -1);
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false); setUserRole(null); setUserEmail(null);
    setUserAvatarUrl(null); setUserName(null); setUserPlan(null);
    setShowProfileMenu(false); setMobileMenuOpen(false);
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/terminal', label: 'FibAlgo HUB', isFireText: true, isNew: true },
    { href: '/library', label: t('library') },
    { href: '/education', label: t('education') },
  ];

  const getDashboardLink = () => userRole === 'admin' ? '/admin' : '/dashboard';

  const radius = 'clamp(14px, 2vw, 20px)';

  return (
    <>
      <style>{`
        @media (min-width: 769px) {
          .edunav-desktop-links { display: flex !important; }
          .edunav-desktop-login { display: flex !important; }
          .edunav-mobile-toggle { display: none !important; }
        }
        @media (max-width: 768px) {
          .edunav-desktop-links { display: none !important; }
          .edunav-desktop-login { display: none !important; }
          .edunav-mobile-toggle { display: flex !important; }
          .edunav-mobile-center { display: flex !important; }
        }
        @media (min-width: 769px) {
          .edunav-mobile-center { display: none !important; }
        }
        @keyframes edunav-slide-in {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes edunav-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes edunav-stagger {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes edunav-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes edunav-pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #EF4444; }
          50% { opacity: 0.4; box-shadow: 0 0 8px #EF4444; }
        }
        .edunav-promo-bar {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .edunav-promo-bar::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(0,245,255,0.06) 25%, rgba(139,92,246,0.08) 50%, rgba(0,245,255,0.06) 75%, transparent 100%);
          background-size: 200% 100%;
          animation: edunav-shimmer 3s linear infinite;
        }
        .edunav-promo-bar:hover {
          border-color: rgba(0,245,255,0.2) !important;
        }
        .edunav-promo-bar:hover .edunav-promo-arrow {
          transform: translateX(3px);
        }
        @media (max-width: 768px) {
          .edunav-promo-bar {
            font-size: 0.7rem !important;
            gap: 0.4rem !important;
            padding: 0.4rem 0.75rem !important;
          }
        }
      `}</style>

      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'all 0.3s ease',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: `clamp(0.5rem, 2vw, 1rem) clamp(0.75rem, 3vw, 1.5rem) 0`,
        }}>
          {/* ═══ MAIN BAR — rounded top only ═══ */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            height: 'clamp(52px, 6vw, 68px)',
            padding: '0 clamp(1rem, 3vw, 2rem)',
            background: isScrolled ? 'rgba(10,10,20,0.65)' : 'rgba(10,10,20,0.25)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: `${radius} ${radius} 0 0`,
            border: '1px solid rgba(255,255,255,0.06)',
            borderBottom: 'none',
            boxShadow: isScrolled ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 16px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
          }}>

            {/* LOGO */}
            <Link href="/" style={{
              position: 'absolute',
              left: 'clamp(0.75rem, 2vw, 1.5rem)',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}>
              <Image
                src="/logo-white.svg"
                alt="FibAlgo Logo"
                width={120}
                height={32}
                priority
                sizes="(max-width: 768px) 90px, 120px"
                style={{ width: 'clamp(85px, 14vw, 120px)', height: 'auto' }}
              />
            </Link>

            {/* DESKTOP NAV LINKS */}
            <div className="edunav-desktop-links" style={{ alignItems: 'center', gap: '0.25rem' }}>
              {navLinks.map((link) => {
                const isFireText = link.isFireText;
                const isNew = 'isNew' in link && link.isNew;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      color: isFireText ? 'transparent' : 'rgba(255,255,255,0.7)',
                      fontSize: '1rem',
                      fontWeight: isFireText ? 700 : 500,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      padding: '0.5rem 1rem',
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
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {t('newBadge')}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* MOBILE CENTER */}
            <Link
              href="/terminal"
              className="edunav-mobile-center"
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '0.4rem',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                background: 'linear-gradient(90deg, #FBBF24 0%, #F59E0B 25%, #EF4444 60%, #DC2626 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              FibAlgo HUB
              <span style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                color: '#fff',
                fontSize: '0.5rem',
                fontWeight: 700,
                padding: '0.1rem 0.35rem',
                borderRadius: '3px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {t('newBadge')}
              </span>
            </Link>

            {/* RIGHT SIDE */}
            <div style={{
              position: 'absolute',
              right: 'clamp(0.75rem, 2vw, 1.5rem)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              {isLoggedIn && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 'clamp(34px, 5vw, 42px)', height: 'clamp(34px, 5vw, 42px)',
                      background: userRole === 'admin'
                        ? 'linear-gradient(135deg, #BF00FF 0%, #00F5FF 100%)'
                        : 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                      border: 'none', borderRadius: '50%', cursor: 'pointer',
                      boxShadow: '0 0 15px rgba(0,245,255,0.3)', overflow: 'hidden',
                    }}
                  >
                    {userAvatarUrl ? (
                      <img src={userAvatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : userRole === 'admin' ? (
                      <Shield style={{ width: '18px', height: '18px', color: '#0A0A0F' }} />
                    ) : (
                      <User style={{ width: '18px', height: '18px', color: '#0A0A0F' }} />
                    )}
                  </button>
                  {showProfileMenu && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                      background: 'rgba(15,15,25,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', padding: '0.5rem', minWidth: '180px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
                    }}>
                      <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <p style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
                            {userRole === 'admin' ? 'Admin' : (userName || 'User')}
                          </p>
                          {userRole === 'admin' && (
                            <span style={{ fontSize: '0.6rem', padding: '0.125rem 0.375rem', background: 'rgba(191,0,255,0.3)', color: '#BF00FF', borderRadius: '4px', fontWeight: 600 }}>ADMIN</span>
                          )}
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: 0 }}>{userEmail || 'user@fibalgo.com'}</p>
                        {(() => {
                          const displayPlan = mapPlanName(userPlan);
                          const planColor = getPlanColor(displayPlan);
                          return (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem',
                              padding: '0.35rem 0.5rem',
                              background: displayPlan === 'Lifetime' ? 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,140,0,0.15) 100%)'
                                : displayPlan === 'Ultimate' ? 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(139,92,246,0.2) 100%)'
                                : displayPlan === 'Premium' ? 'linear-gradient(135deg, rgba(0,245,255,0.15) 0%, rgba(0,168,255,0.15) 100%)'
                                : 'rgba(255,255,255,0.05)',
                              borderRadius: '6px', border: `1px solid ${planColor}33`,
                            }}>
                              <Crown style={{ width: '12px', height: '12px', color: planColor }} />
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: planColor }}>{t('planLabel', { plan: displayPlan })}</span>
                            </div>
                          );
                        })()}
                      </div>
                      <Link href={getDashboardLink()} onClick={() => setShowProfileMenu(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <LayoutDashboard style={{ width: '16px', height: '16px' }} />
                        {userRole === 'admin' ? t('admin') : t('dashboard')}
                      </Link>
                      <button onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', color: '#f87171', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <LogOut style={{ width: '16px', height: '16px' }} />
                        {t('logout')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!isLoggedIn && (
                <Link href="/login" className="edunav-desktop-login"
                  style={{ alignItems: 'center', justifyContent: 'center', padding: '0.55rem 1.25rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', color: '#FFFFFF', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}>
                  {t('login')}
                </Link>
              )}

              <button className="edunav-mobile-toggle"
                onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setShowProfileMenu(false); }}
                aria-label="Toggle menu"
                style={{
                  display: 'none', alignItems: 'center', justifyContent: 'center',
                  width: '38px', height: '38px',
                  background: mobileMenuOpen ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${mobileMenuOpen ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '10px', cursor: 'pointer',
                  color: mobileMenuOpen ? '#00F5FF' : '#fff',
                  transition: 'all 0.2s ease',
                }}>
                {mobileMenuOpen ? <X style={{ width: '20px', height: '20px' }} /> : <Menu style={{ width: '20px', height: '20px' }} />}
              </button>
            </div>
          </div>

          {/* ═══ PROMO BADGE BAR — navbar extension ═══ */}
          <Link
            href="/#features"
            className="edunav-promo-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, rgba(0,245,255,0.08) 0%, rgba(139,92,246,0.06) 50%, rgba(0,245,255,0.08) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: `0 0 ${radius} ${radius}`,
              border: '1px solid rgba(0,245,255,0.12)',
              borderTop: '1px solid rgba(0,245,255,0.15)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Live dot */}
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#EF4444',
              flexShrink: 0,
              animation: 'edunav-pulse-dot 1.5s ease-in-out infinite',
            }} />

            {/* Text */}
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#FFFFFF',
              position: 'relative',
              zIndex: 1,
            }}>
              {promoTitle}
            </span>

            {/* Pill badge */}
            <span style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '100px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase' as const,
              position: 'relative',
              zIndex: 1,
              color: '#EF4444',
            }}>
              LIVE
            </span>

            {/* Arrow */}
            <svg className="edunav-promo-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00F5FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, position: 'relative', zIndex: 1, transition: 'transform 0.3s ease', flexShrink: 0 }}>
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </nav>

      {/* ═══ MOBILE SLIDE-IN PANEL ═══ */}
      {mobileMenuOpen && (
        <>
          <div onClick={() => setMobileMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 9998, animation: 'edunav-fade-in 0.2s ease' }} />
          <div ref={mobileMenuRef}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '300px', maxWidth: '85vw', background: 'linear-gradient(180deg, rgba(8,8,18,0.99) 0%, rgba(5,5,12,1) 100%)', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 9999, animation: 'edunav-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <Image src="/logo-white.svg" alt="FibAlgo" width={100} height={28} style={{ width: '100px', height: 'auto' }} />
              <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
            <div style={{ padding: '0.75rem 0.75rem', flex: 1 }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.14em', padding: '0.5rem 0.75rem 0.35rem', margin: 0 }}>
                {t('menu')}
              </p>
              {navLinks.map((link, i) => {
                const isFireText = link.isFireText;
                const isNew = 'isNew' in link && link.isNew;
                return (
                  <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.9rem 0.75rem', borderRadius: '10px', textDecoration: 'none', marginBottom: '0.15rem',
                      color: isFireText ? 'transparent' : 'rgba(255,255,255,0.85)',
                      fontSize: '1rem', fontWeight: isFireText ? 700 : 500,
                      background: isFireText ? 'linear-gradient(90deg, #FBBF24 0%, #F59E0B 25%, #EF4444 60%, #DC2626 100%)' : 'transparent',
                      WebkitBackgroundClip: isFireText ? 'text' : undefined,
                      backgroundClip: isFireText ? 'text' : undefined,
                      animation: `edunav-stagger 0.3s ease ${i * 0.05}s both`,
                    }}>
                    <span>{link.label}</span>
                    {isNew && (
                      <span style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)', color: '#fff', fontSize: '0.55rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('newBadge')}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Promo link in mobile menu */}
              <Link href="/#features" onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.9rem 0.75rem', borderRadius: '10px', textDecoration: 'none',
                  marginBottom: '0.15rem',
                  animation: `edunav-stagger 0.3s ease ${navLinks.length * 0.05}s both`,
                }}>
                <span style={{
                  fontSize: '0.95rem', fontWeight: 600,
                  background: 'linear-gradient(135deg, #00F5FF 0%, #8B5CF6 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  📊 {promoTitle}
                </span>
              </Link>

              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', margin: '0.5rem 0.75rem' }} />
              {isLoggedIn && (
                <Link href={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.9rem 0.75rem', borderRadius: '10px', textDecoration: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '1rem', fontWeight: 500, animation: `edunav-stagger 0.3s ease ${(navLinks.length + 1) * 0.05}s both` }}>
                  <LayoutDashboard style={{ width: '18px', height: '18px', color: '#00F5FF' }} />
                  {userRole === 'admin' ? t('admin') : t('dashboard')}
                </Link>
              )}
            </div>
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              {isLoggedIn ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {userAvatarUrl ? <img src={userAvatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <User style={{ width: '18px', height: '18px', color: '#0A0A0F' }} />}
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <p style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName || 'User'}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.7rem', color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <LogOut style={{ width: '16px', height: '16px' }} />
                    {t('logOut')}
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.8rem', width: '100%', background: 'linear-gradient(135deg, #00F5FF, #00C4CC)', color: '#000', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', boxShadow: '0 0 20px rgba(0,245,255,0.2)' }}>
                  {t('login')}
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {showProfileMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowProfileMenu(false)} />
      )}
    </>
  );
}
