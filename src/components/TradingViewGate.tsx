'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

/**
 * Global TradingView ID Gate Component
 * 
 * This component BLOCKS the entire UI for Ultimate/Lifetime users
 * who haven't provided their TradingView username yet.
 * 
 * It checks DIRECTLY from the database (not cache) to ensure accuracy.
 */
export default function TradingViewGate({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [tradingViewInput, setTradingViewInput] = useState('');
  const [dontWantIndicators, setDontWantIndicators] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const checkInProgress = useRef(false);

  const supabase = createClient();
  const t = useTranslations('tradingViewGate');

  // Ensure component is mounted before checking
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check user status on mount and periodically
  useEffect(() => {
    if (!isMounted) return;

    const checkUser = async () => {
      // Prevent concurrent checks
      if (checkInProgress.current) return;
      checkInProgress.current = true;

      try {
        // First try to get session (faster than getUser)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // No session = no popup needed
          setIsLoading(false);
          setShowPopup(false);
          checkInProgress.current = false;
          return;
        }

        const user = session.user;
        setUserId(user.id);

        // DIRECTLY check database for user's trading_view_id and subscription plan
        // Using service-side API to avoid RLS issues
        let userData;
        try {
          const response = await fetch(`/api/user?userId=${user.id}&email=${encodeURIComponent(user.email || '')}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            }
          });
          
          if (!response.ok) {
            // 401/404 = user not in database yet, skip popup (let them use the app)
            if (response.status === 401 || response.status === 404) {
              console.log('[TradingViewGate] User not in database, skipping check');
              setIsLoading(false);
              checkInProgress.current = false;
              return;
            }
            console.error('TradingViewGate API error:', response.status);
            setIsLoading(false);
            checkInProgress.current = false;
            return;
          }

          userData = await response.json();
        } catch (fetchError) {
          // Network error - silently fail and let user continue
          console.warn('[TradingViewGate] Network error, skipping check:', fetchError);
          setIsLoading(false);
          checkInProgress.current = false;
          return;
        }
        const plan = userData.subscription?.plan?.toLowerCase() || 'basic';
        const tradingViewId = userData.tradingViewId;

        console.log('[TradingViewGate] User check:', { 
          email: user.email, 
          plan, 
          tradingViewId,
          hasId: !!tradingViewId && tradingViewId.trim() !== ''
        });

        setUserPlan(plan);

        // Check if user needs to provide TradingView ID
        const isUltimateOrLifetime = plan === 'ultimate' || plan === 'lifetime';
        const hasTradingViewId = !!tradingViewId && tradingViewId.trim() !== '';

        if (isUltimateOrLifetime && !hasTradingViewId) {
          console.log('[TradingViewGate] SHOWING POPUP - Ultimate/Lifetime without TradingView ID');
          setShowPopup(true);
        } else {
          setShowPopup(false);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('TradingViewGate check error:', error);
        setIsLoading(false);
      } finally {
        checkInProgress.current = false;
      }
    };

    // Initial check
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[TradingViewGate] Auth state changed:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkUser();
      } else if (event === 'SIGNED_OUT') {
        setShowPopup(false);
        setIsLoading(false);
      }
    });

    // Re-check every 10 seconds in case plan changes
    const interval = setInterval(checkUser, 10000);
    
    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [isMounted]);

  // Handle submit
  const handleSubmit = async () => {
    if (!dontWantIndicators && !tradingViewInput.trim()) {
      alert(t('alertEnterUsername'));
      return;
    }

    if (!userId) return;

    setIsSubmitting(true);
    try {
      const valueToSave = dontWantIndicators ? 'NO_INDICATORS' : tradingViewInput.trim();

      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          tradingViewId: valueToSave,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to save'));
        return;
      }

      // Update cache
      const cacheKey = 'fibalgo_user_cache';
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cacheData = JSON.parse(cached);
          cacheData.tradingViewId = valueToSave;
          cacheData.cachedAt = Date.now();
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        }
      } catch (e) {
        // Ignore cache errors
      }

      // Close popup
      setShowPopup(false);
      
      // Force page reload to refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Error saving TradingView ID:', error);
      alert(t('alertError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render anything during SSR
  if (!isMounted) {
    return <>{children}</>;
  }

  // Sayfa her zaman render: loading sırasında da içerik görünsün, kaydırınca her şey hazır olsun.
  // Sadece popup gerekirse üstte overlay gösterilir.
  if (showPopup) {
    return (
      <>
        {/* Blurred background content */}
        <div style={{ filter: 'blur(10px)', pointerEvents: 'none', userSelect: 'none' }}>
          {children}
        </div>

        {/* BLOCKING Popup Overlay */}
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(10px)',
          padding: '1rem',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0A0A0F 0%, #12121A 100%)',
            border: '2px solid rgba(0,245,255,0.4)',
            borderRadius: '1.5rem',
            padding: '2.5rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 0 60px rgba(0,245,255,0.2)',
          }}>
            {/* Premium Badge */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                padding: '0.5rem 1.25rem',
                background: 'linear-gradient(135deg, rgba(0,245,255,0.2) 0%, rgba(139,92,246,0.2) 100%)',
                borderRadius: '2rem',
                border: '1px solid rgba(0,245,255,0.3)',
              }}>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #00F5FF 0%, #8B5CF6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {t('memberBenefit', { plan: userPlan === 'lifetime' ? 'Lifetime' : 'Ultimate' })}
                </span>
              </div>
            </div>

            <h2 style={{
              color: '#FFFFFF',
              fontSize: '1.75rem',
              fontWeight: 700,
              textAlign: 'center',
              margin: '0 0 1rem 0',
            }}>
              {t('claimTitle')}
            </h2>

            <p style={{
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center',
              marginBottom: '2rem',
              lineHeight: 1.6,
            }}>
              {t('claimDesc', { plan: userPlan === 'lifetime' ? 'Lifetime' : 'Ultimate' })}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.875rem',
                marginBottom: '0.5rem',
                fontWeight: 500,
              }}>
                {t('tvUsernameLabel')}
              </label>
              <input
                type="text"
                value={tradingViewInput}
                onChange={(e) => setTradingViewInput(e.target.value)}
                placeholder={t('tvUsernamePlaceholder')}
                disabled={dontWantIndicators}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  background: dontWantIndicators ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  color: dontWantIndicators ? 'rgba(255,255,255,0.3)' : '#FFFFFF',
                  fontSize: '1rem',
                  outline: 'none',
                  cursor: dontWantIndicators ? 'not-allowed' : 'text',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              padding: '0.75rem',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '0.5rem',
            }}>
              <input
                type="checkbox"
                checked={dontWantIndicators}
                onChange={(e) => {
                  setDontWantIndicators(e.target.checked);
                  if (e.target.checked) setTradingViewInput('');
                }}
                style={{
                  width: '20px',
                  height: '20px',
                  accentColor: '#00F5FF',
                }}
              />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                {t('dontWant')}
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!dontWantIndicators && !tradingViewInput.trim())}
              style={{
                width: '100%',
                padding: '1rem',
                background: (isSubmitting || (!dontWantIndicators && !tradingViewInput.trim()))
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #00F5FF 0%, #8B5CF6 100%)',
                border: 'none',
                borderRadius: '0.75rem',
                color: (isSubmitting || (!dontWantIndicators && !tradingViewInput.trim()))
                  ? 'rgba(255,255,255,0.3)'
                  : '#000',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: (isSubmitting || (!dontWantIndicators && !tradingViewInput.trim()))
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              {isSubmitting ? t('saving') : dontWantIndicators ? t('continueWithout') : t('submitClaim')}
            </button>

            <p style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.75rem',
              textAlign: 'center',
              marginTop: '1rem',
            }}>
              {t('doubleCheck')}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Normal render
  return <>{children}</>;
}
