'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchAndCacheUser, clearUserCache } from '@/lib/userCache';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Script from 'next/script';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      render: (container: string | HTMLElement, options: object) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    onRecaptchaLoad: () => void;
  }
}

function LoginContent() {
  const t = useTranslations('login');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || null;
  const oauthComplete = searchParams.get('oauth_complete') === 'true';
  const oauthUserId = searchParams.get('userId');
  const oauthEmail = searchParams.get('email');
  const bannedFromMiddleware = searchParams.get('banned') === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(oauthComplete);
  const [loadingMessage, setLoadingMessage] = useState(oauthComplete ? t('loadingProfile') : '');
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  
  // CAPTCHA state
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaWidgetId, setCaptchaWidgetId] = useState<number | null>(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [isBanned, setIsBanned] = useState(bannedFromMiddleware);
  const [banReason, setBanReason] = useState(bannedFromMiddleware ? t('defaultBanReason') : '');

  // CAPTCHA callback
  const onCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  // Check if CAPTCHA is required when email changes
  const checkCaptchaRequired = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck) return;
    try {
      const response = await fetch(`/api/auth/login?email=${encodeURIComponent(emailToCheck)}`);
      if (response.ok) {
        const data = await response.json();
        setRequiresCaptcha(data.requiresCaptcha || false);
      }
    } catch (error) {
      console.error('Error checking CAPTCHA status:', error);
    }
  }, []);

  // Render CAPTCHA when required and ready
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (requiresCaptcha && captchaReady && siteKey && typeof window !== 'undefined' && window.grecaptcha) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const container = document.getElementById('recaptcha-container');
        if (container && captchaWidgetId === null) {
          try {
            const widgetId = window.grecaptcha.render('recaptcha-container', {
              sitekey: siteKey,
              callback: onCaptchaVerify,
              theme: 'dark',
            });
            setCaptchaWidgetId(widgetId);
          } catch (e) {
            console.error('CAPTCHA render error:', e);
          }
        }
      }, 100);
    }
  }, [requiresCaptcha, captchaReady, captchaWidgetId, onCaptchaVerify]);

  // Handle OAuth complete - fetch and cache user data
  useEffect(() => {
    if (oauthComplete && oauthUserId && oauthEmail) {
      const handleOAuthComplete = async () => {
        try {
          setShowLoadingScreen(true);
          setLoadingMessage(t('loadingProfile'));
          
          // Clear old cache first
          clearUserCache();
          
          // Fetch and cache all user data
          await fetchAndCacheUser(oauthUserId, decodeURIComponent(oauthEmail));
          
          setLoadingMessage(t('preparingDashboard'));
          
          // Small delay for smooth transition
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Redirect to dashboard or specified destination
          router.push(redirectTo || '/dashboard');
          router.refresh();
        } catch (err) {
          console.error('OAuth complete error:', err);
          setShowLoadingScreen(false);
          setError(t('unexpectedError'));
        }
      };
      
      handleOAuthComplete();
    }
  }, [oauthComplete, oauthUserId, oauthEmail, redirectTo, router]);

  // Clear old demo cookies on page load (but not if OAuth complete)
  useEffect(() => {
    if (!oauthComplete) {
      document.cookie = 'demo_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      localStorage.removeItem('demo_user');
      // Clear old cache on login page load
      clearUserCache();
    }
  }, [oauthComplete]);

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess('');
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setResendSuccess(t('verificationSent'));
        setShowResendVerification(false);
      } else {
        setError(data.error || t('verificationFailed'));
      }
    } catch {
      setError(t('verificationFailed'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendSuccess('');
    setShowResendVerification(false);
    setIsBanned(false);
    setBanReason('');
    setLoading(true);

    try {
      // First, check via our secure login API
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          captchaToken: requiresCaptcha ? captchaToken : undefined,
        }),
      });

      const loginData = await loginResponse.json();

      // Check if user is banned
      if (loginData.banned) {
        setIsBanned(true);
        setBanReason(loginData.banReason || t('banReasonFallback'));
        setLoading(false);
        return;
      }

      // Check if CAPTCHA is required
      if (loginData.requiresCaptcha && !requiresCaptcha) {
        // First time CAPTCHA required
        setRequiresCaptcha(true);
        setError(t('captchaRequired'));
        setLoading(false);
        return;
      }

      if (!loginResponse.ok) {
        // Unverified email – redirect to verify page (same UI as after signup)
        if (loginData.unverified) {
          setLoading(false);
          router.push(`/signup?pending_verification=1&email=${encodeURIComponent(email.trim())}`);
          return;
        }
        // Failed login attempt - update CAPTCHA status from response
        if (loginData.requiresCaptcha !== undefined) {
          setRequiresCaptcha(loginData.requiresCaptcha);
          // If CAPTCHA no longer required, reset the widget state
          if (!loginData.requiresCaptcha) {
            setCaptchaWidgetId(null);
            setCaptchaToken('');
          }
        }
        setError(loginData.error || t('invalidCredentials'));
        // Reset CAPTCHA if shown (for next attempt)
        if (captchaWidgetId !== null && window.grecaptcha && loginData.requiresCaptcha) {
          window.grecaptcha.reset(captchaWidgetId);
          setCaptchaToken('');
        }
        setLoading(false);
        return;
      }

      // If login API passed, continue with Supabase auth
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Check if email is verified – redirect to verify page (same UI as after signup)
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setLoading(false);
        router.push(`/signup?pending_verification=1&email=${encodeURIComponent(email.trim())}`);
        return;
      }

      // Check user role from database and cache all user data
      if (data.user) {
        // Show loading screen while caching user data
        setShowLoadingScreen(true);
        setLoadingMessage(t('loadingProfile'));
        
        // Fetch and cache all user data
        await fetchAndCacheUser(data.user.id, data.user.email || '');
        
        setLoadingMessage(t('preparingDashboard'));
        
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (userData?.role === 'admin') {
          router.push('/admin');
        } else {
          // Redirect to the original destination or dashboard
          router.push(redirectTo || '/dashboard');
        }
        router.refresh();
      }
    } catch {
      setError(t('unexpectedError'));
      setShowLoadingScreen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const supabase = createClient();
      // redirectTo parametresini callback URL'e ekle
      const callbackUrl = redirectTo 
        ? `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
        : `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (error) setError(error.message);
    } catch {
      setError(t('unexpectedError'));
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.875rem 1rem',
    paddingLeft: '3rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.75rem',
    color: '#FFFFFF',
    fontSize: '1rem',
    outline: 'none',
    transition: 'all 0.3s ease',
  };

  const buttonPrimaryStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
    border: 'none',
    borderRadius: '0.75rem',
    color: '#000',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  };

  const buttonSecondaryStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.875rem 1.5rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '0.75rem',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  };

  // Loading screen overlay
  if (showLoadingScreen) {
    return (
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: '#0A0A0F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
        }}
      >
        <AnimatedBackground />
        <Image src="/logo-white.svg" alt="FibAlgo" width={160} height={45} priority />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader2 
            style={{ 
              width: '40px', 
              height: '40px', 
              color: '#00F5FF',
              animation: 'spin 1s linear infinite',
            }} 
          />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
            {loadingMessage || 'Loading...'}
          </p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <AnimatedBackground />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '28rem' }}>
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2rem',
            textDecoration: 'none',
          }}
        >
          <Image
            src="/logo-white.svg"
            alt="FibAlgo Logo"
            width={180}
            height={50}
            priority
          />
        </Link>

        {/* Card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '2rem',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', textAlign: 'center', marginBottom: '2rem' }}>
            {t('title')}
          </h1>

          {/* Banned User Message */}
          {isBanned && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <ShieldAlert style={{ width: '48px', height: '48px', color: '#ef4444' }} />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: '#ef4444', fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
                  {t('accountSuspended')}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', margin: 0 }}>
                  {banReason}
                </p>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0, textAlign: 'center' }}>
                {t('contactSupport')}{' '}
                <a href="mailto:support@fibalgo.com" style={{ color: '#00F5FF' }}>support@fibalgo.com</a>
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle style={{ width: '20px', height: '20px', color: '#f87171', flexShrink: 0 }} />
                <span style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</span>
              </div>
              {showResendVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  style={{
                    background: 'rgba(0,245,255,0.1)',
                    border: '1px solid rgba(0,245,255,0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    color: '#00F5FF',
                    fontSize: '0.875rem',
                    cursor: resendLoading ? 'not-allowed' : 'pointer',
                    opacity: resendLoading ? 0.5 : 1,
                  }}
                >
                  {resendLoading ? t('resendSending') : t('resendVerification')}
                </button>
              )}
            </div>
          )}

          {/* Success Message */}
          {resendSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
              }}
            >
              <span style={{ color: '#34d399', fontSize: '0.875rem' }}>✓ {resendSuccess}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Email */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                {t('emailLabel')}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                {t('passwordLabel')}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: '3rem' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff style={{ width: '20px', height: '20px' }} /> : <Eye style={{ width: '20px', height: '20px' }} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div style={{ textAlign: 'right' }}>
              <Link href="/forgot-password" style={{ color: '#00F5FF', fontSize: '0.875rem', textDecoration: 'none' }}>
                {t('forgotPassword')}
              </Link>
            </div>

            {/* CAPTCHA */}
            {requiresCaptcha && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <div id="recaptcha-container" />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{ ...buttonPrimaryStyle, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <svg style={{ animation: 'spin 1s linear infinite', height: '20px', width: '20px' }} viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('signingIn')}
                </span>
              ) : (
                <>
                  <span>{t('signIn')}</span>
                  <ArrowRight style={{ width: '20px', height: '20px' }} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>{tc('or')}</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Google Login */}
          <button onClick={handleGoogleLogin} style={buttonSecondaryStyle}>
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>{tc('continueWithGoogle')}</span>
          </button>

          {/* Sign Up Link */}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '1.5rem' }}>
            {t('noAccount')}{' '}
            <Link href="/signup" style={{ color: '#00F5FF', textDecoration: 'none' }}>
              {t('signUp')}
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: 'rgba(255,255,255,0.4)',
            marginTop: '1.5rem',
            textDecoration: 'none',
          }}
        >
          <ArrowRight style={{ width: '16px', height: '16px', transform: 'rotate(180deg)' }} />
          <span>{tc('backToHome')}</span>
        </Link>
      </div>

      {/* Google reCAPTCHA Script */}
      {requiresCaptcha && (
        <Script
          src="https://www.google.com/recaptcha/api.js?render=explicit"
          onLoad={() => {
            if (window.grecaptcha) {
              window.grecaptcha.ready(() => {
                setCaptchaReady(true);
              });
            }
          }}
        />
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
