'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// CSS Keyframes injected once
const keyframesCSS = `
@keyframes tokenModalIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes tokenSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes tokenShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes tokenProgressFill {
  0% { width: 0%; }
  100% { width: 100%; }
}
`;

export default function TokenActivator() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'idle' | 'checking' | 'activating' | 'success' | 'error' | 'login-required' | 'expired'>('idle');
  const [plan, setPlan] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [stylesInjected, setStylesInjected] = useState(false);

  // Inject keyframes CSS once
  useEffect(() => {
    if (stylesInjected) return;
    const styleId = 'token-activator-keyframes';
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

  useEffect(() => {
    if (!token) return;
    
    const activate = async () => {
      setStatus('checking');
      
      const isLoggedIn = await checkAuth();
      
      if (!isLoggedIn) {
        setStatus('login-required');
        return;
      }
      
      setStatus('activating');
      
      try {
        const response = await fetch('/api/activate/use-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          if (data.error?.includes('expired') || data.error?.includes('Invalid')) {
            setStatus('expired');
          } else {
            setStatus('error');
            setError(data.error || 'Activation failed');
          }
          return;
        }
        
        setPlan(data.plan);
        setStatus('success');
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        
      } catch (err) {
        setStatus('error');
        setError('Network error. Please try again.');
      }
    };
    
    activate();
  }, [token, checkAuth, router]);

  if (!token || status === 'idle') return null;

  const accentColor = '#F59E0B';

  const handleLogin = () => {
    const redirectTo = encodeURIComponent(`/?token=${token}`);
    router.push(`/login?redirectTo=${redirectTo}`);
  };

  const handleClose = () => {
    router.replace('/');
  };

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
            animation: 'tokenModalIn 0.25s ease-out forwards',
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
              background: `linear-gradient(90deg, transparent 0%, ${borderColor === 'rgba(16, 185, 129, 0.3)' ? '#10B981' : accentColor} 50%, transparent 100%)`,
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

  // Loading states (checking, activating)
  if (status === 'checking' || status === 'activating') {
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
            animation: 'tokenSpin 1s linear infinite',
          }} />
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
          {status === 'checking' ? 'Verifying...' : 'Activating your plan...'}
        </p>
        {/* Shimmer bar */}
        <div style={{ marginTop: '20px', height: '2px', borderRadius: '1px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: `linear-gradient(90deg, ${accentColor}, #fff, ${accentColor})`,
            backgroundSize: '200% 100%',
            animation: 'tokenShimmer 1.5s ease-in-out infinite',
          }} />
        </div>
      </ModalWrapper>
    );
  }

  // Success state
  if (status === 'success') {
    const planName = plan === 'premium' ? 'Premium' : plan === 'ultimate' ? 'Ultimate' : 'Your';
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
            animation: 'tokenProgressFill 3s ease-out forwards',
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
          Subscription Activation
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 20px' }}>
          Please log in to activate your subscription.
        </p>
        <button
          type="button"
          onClick={handleLogin}
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
        <button
          type="button"
          onClick={handleClose}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Close
        </button>
      </ModalWrapper>
    );
  }

  // Error state
  if (status === 'error') {
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
          Activation Failed
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 20px' }}>
          {error || 'Something went wrong. Please try again.'}
        </p>
        <button
          type="button"
          onClick={handleClose}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Close
        </button>
      </ModalWrapper>
    );
  }

  return null;
}

