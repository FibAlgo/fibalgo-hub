'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// CSS Keyframes injected once
const keyframesCSS = `
@keyframes activateModalIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes activateSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes activateShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes activateProgressFill {
  0% { width: 0%; }
  100% { width: 100%; }
}
`;

export default function ActivatePlanPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const plan = params.plan as string;
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'checking' | 'generating' | 'ready' | 'activating' | 'success' | 'error' | 'expired' | 'invalid' | 'login-required'>('checking');
  const [error, setError] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [stylesInjected, setStylesInjected] = useState(false);

  // Inject keyframes CSS once
  useEffect(() => {
    if (stylesInjected) return;
    const styleId = 'activate-page-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = keyframesCSS;
      document.head.appendChild(style);
    }
    setStylesInjected(true);
  }, [stylesInjected]);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      return data.user !== null;
    } catch {
      return false;
    }
  }, []);

  const activatePlan = useCallback(async () => {
    setStatus('activating');
    
    try {
      const response = await fetch('/api/activate/use-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          setStatus('login-required');
        } else {
          setStatus('error');
          setError(data.error || 'Activation failed');
        }
        return;
      }
      
      setStatus('success');
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      
    } catch (err) {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  }, [token, router]);

  useEffect(() => {
    if (!['premium', 'ultimate'].includes(plan)) {
      setStatus('invalid');
      return;
    }

    const init = async () => {
      const loggedIn = await checkAuth();
      setIsLoggedIn(loggedIn);

      if (token) {
        if (loggedIn) {
          activatePlan();
        } else {
          setStatus('login-required');
        }
      } else {
        generateToken();
      }
    };

    init();
  }, [plan, token, checkAuth, activatePlan]);

  useEffect(() => {
    if (expiresIn <= 0) return;
    
    const timer = setInterval(() => {
      setExpiresIn(prev => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiresIn]);

  const generateToken = async () => {
    setStatus('generating');
    
    try {
      const response = await fetch(`/api/activate/${plan}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          setStatus('error');
          setError(data.error || 'Daily activation limit reached. Please try again tomorrow or contact support.');
        } else {
          setStatus('error');
          setError(data.error || 'Failed to generate activation link');
        }
        return;
      }
      
      setExpiresIn(data.expiresIn);
      router.replace(`/?token=${data.activationUrl.split('token=')[1]}`);
      
    } catch (err) {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  };

  const handleActivate = async () => {
    const redirectTo = encodeURIComponent(`/?token=${token}`);
    router.push(`/login?redirectTo=${redirectTo}`);
  };

  const planName = plan === 'premium' ? 'Premium' : 'Ultimate';
  const accentColor = '#F59E0B';

  // Modal wrapper component
  const ModalWrapper = ({ children, borderColor = 'rgba(245, 158, 11, 0.2)', glowColor = 'rgba(245, 158, 11, 0.08)' }: { children: React.ReactNode; borderColor?: string; glowColor?: string }) => (
    <>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.85)',
      }}>
        <div
          role="dialog"
          aria-modal="true"
          style={{
            animation: 'activateModalIn 0.25s ease-out forwards',
            width: '100%',
            maxWidth: '360px',
          }}
        >
          <div style={{
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(18, 16, 12, 0.98) 0%, rgba(12, 10, 8, 0.99) 100%)',
            borderRadius: '16px',
            border: `1px solid ${borderColor}`,
            boxShadow: `0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 40px ${glowColor}`,
            overflow: 'hidden',
          }}>
            {/* Top accent line */}
            <div style={{
              height: '2px',
              background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
            }} />
            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              top: '-40px',
              left: '50%',
              width: '200px',
              height: '100px',
              background: `radial-gradient(ellipse, ${glowColor} 0%, transparent 70%)`,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }} />
            {/* Content */}
            <div style={{ position: 'relative', padding: '28px 24px 24px', textAlign: 'center' }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const Logo = () => (
    <div style={{ marginBottom: '20px' }}>
      <img
        src="/logo-white.png"
        alt="FibAlgo"
        style={{
          height: '32px',
          width: 'auto',
          margin: '0 auto',
          display: 'block',
          opacity: 0.95,
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'block';
        }}
      />
      <span style={{
        display: 'none',
        fontSize: '22px',
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: accentColor,
      }}>
        FibAlgo
      </span>
    </div>
  );

  // Loading states (checking, generating, activating)
  if (status === 'checking' || status === 'generating' || status === 'activating') {
    return (
      <ModalWrapper>
        <Logo />
        {/* Spinner */}
        <div style={{ position: 'relative', width: '48px', height: '48px', margin: '0 auto 20px' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '3px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '3px solid transparent',
            borderTopColor: accentColor,
            borderRadius: '50%',
            animation: 'activateSpin 1s linear infinite',
          }} />
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
          {status === 'checking' ? 'Verifying...' : status === 'generating' ? 'Preparing activation...' : 'Activating your plan...'}
        </p>
        {/* Shimmer bar */}
        <div style={{ marginTop: '20px', height: '2px', borderRadius: '1px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: `linear-gradient(90deg, ${accentColor}, #fff, ${accentColor})`,
            backgroundSize: '200% 100%',
            animation: 'activateShimmer 1.5s ease-in-out infinite',
          }} />
        </div>
      </ModalWrapper>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <ModalWrapper borderColor="rgba(16, 185, 129, 0.3)" glowColor="rgba(16, 185, 129, 0.15)">
        <Logo />
        {/* Success icon */}
        <div style={{
          width: '56px',
          height: '56px',
          margin: '0 auto 20px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '2px solid rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="28" height="28" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
          {planName} Plan Activated!
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 20px' }}>
          Redirecting to dashboard...
        </p>
        {/* Progress bar */}
        <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: '#10B981',
            animation: 'activateProgressFill 3s ease-out forwards',
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
          }} />
        </div>
      </ModalWrapper>
    );
  }

  // Login required state
  if (status === 'login-required') {
    return (
      <ModalWrapper>
        <Logo />
        {/* Plan badge */}
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          background: 'rgba(245, 158, 11, 0.15)',
          color: accentColor,
          marginBottom: '16px',
        }}>
          {planName} Plan
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 20px' }}>
          Please log in to activate your subscription.
        </p>
        <button
          type="button"
          onClick={handleActivate}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            background: accentColor,
            color: '#000',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#D97706';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(245, 158, 11, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = accentColor;
            e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.3)';
          }}
        >
          Log in to Activate
        </button>
        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '16px' }}>
          Don't have an account? Create one during login.
        </p>
      </ModalWrapper>
    );
  }

  // Expired state
  if (status === 'expired') {
    return (
      <ModalWrapper borderColor="rgba(245, 158, 11, 0.3)" glowColor="rgba(245, 158, 11, 0.1)">
        <Logo />
        {/* Clock icon */}
        <div style={{
          width: '56px',
          height: '56px',
          margin: '0 auto 20px',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="24" height="24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
          Link Expired
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 20px' }}>
          Please return to CopeCart and click the activation link again.
        </p>
        <Link
          href="/"
          style={{
            display: 'block',
            width: '100%',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          Go to Homepage
        </Link>
      </ModalWrapper>
    );
  }

  // Error state
  if (status === 'error' || status === 'invalid') {
    return (
      <ModalWrapper borderColor="rgba(239, 68, 68, 0.3)" glowColor="rgba(239, 68, 68, 0.1)">
        <Logo />
        {/* Error icon */}
        <div style={{
          width: '56px',
          height: '56px',
          margin: '0 auto 20px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="24" height="24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
          {status === 'invalid' ? 'Access Denied' : 'Error'}
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 20px' }}>
          {error || 'This page can only be accessed after purchasing a plan.'}
        </p>
        <Link
          href="/"
          style={{
            display: 'block',
            width: '100%',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          Go to Homepage
        </Link>
      </ModalWrapper>
    );
  }

  // Default/ready state
  return (
    <ModalWrapper>
      <Logo />
      <div style={{ position: 'relative', width: '48px', height: '48px', margin: '0 auto 20px' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          border: '3px solid rgba(255,255,255,0.1)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          border: '3px solid transparent',
          borderTopColor: accentColor,
          borderRadius: '50%',
          animation: 'activateSpin 1s linear infinite',
        }} />
      </div>
      <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
        Processing...
      </p>
    </ModalWrapper>
  );
}
