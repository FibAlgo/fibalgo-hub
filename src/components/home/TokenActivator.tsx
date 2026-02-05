'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TokenActivator() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'idle' | 'activating' | 'success' | 'error' | 'expired' | 'login-required'>('idle');
  const [error, setError] = useState<string>('');
  const [planName, setPlanName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is logged in
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      return data.user !== null;
    } catch {
      return false;
    }
  }, []);

  // Activate the plan with token
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
        } else if (data.error?.includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('error');
          setError(data.error || 'Activation failed');
        }
        return;
      }
      
      setPlanName(data.plan === 'ultimate' ? 'Ultimate' : 'Premium');
      setStatus('success');
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      
    } catch (err) {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  }, [token, router]);

  useEffect(() => {
    // Only run if there's a token
    if (!token) {
      setStatus('idle');
      return;
    }

    const init = async () => {
      const loggedIn = await checkAuth();
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        // User is logged in - activate immediately
        activatePlan();
      } else {
        // User needs to login first
        setStatus('login-required');
      }
    };

    init();
  }, [token, checkAuth, activatePlan]);

  const handleLogin = () => {
    // Redirect to login with return URL (keep it simple - just token)
    const redirectTo = encodeURIComponent(`/?token=${token}`);
    router.push(`/login?redirectTo=${redirectTo}`);
  };

  // No token - don't render anything
  if (!token || status === 'idle') {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      style={{
        background: 'linear-gradient(180deg, #050508 0%, #0a0a14 50%, #080810 100%)',
      }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Cyan glow - top left */}
        <div
          className="absolute"
          style={{
            top: '-20%',
            left: '-10%',
            width: '70%',
            height: '70%',
            background: 'radial-gradient(ellipse at center, rgba(0,245,255,0.15) 0%, rgba(0,245,255,0.05) 35%, transparent 65%)',
            filter: 'blur(80px)',
            animation: 'float1 8s ease-in-out infinite',
          }}
        />
        
        {/* Purple glow - top right */}
        <div
          className="absolute"
          style={{
            top: '-15%',
            right: '-15%',
            width: '65%',
            height: '65%',
            background: 'radial-gradient(ellipse at center, rgba(191,0,255,0.12) 0%, rgba(191,0,255,0.04) 35%, transparent 65%)',
            filter: 'blur(80px)',
            animation: 'float2 10s ease-in-out infinite',
          }}
        />
        
        {/* Center glow */}
        <div
          className="absolute"
          style={{
            top: '30%',
            left: '25%',
            width: '50%',
            height: '50%',
            background: 'radial-gradient(ellipse at center, rgba(0,168,255,0.1) 0%, rgba(0,168,255,0.03) 35%, transparent 65%)',
            filter: 'blur(100px)',
            animation: 'float3 12s ease-in-out infinite',
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 2 === 0 ? 'rgba(0,245,255,0.4)' : 'rgba(191,0,255,0.4)',
              animation: `floatParticle ${8 + Math.random() * 8}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full">
        
        {/* Loading / Activating */}
        {status === 'activating' && (
          <div 
            className="rounded-2xl p-8 text-center animate-fadeIn"
            style={{
              background: 'rgba(10,10,20,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 60px rgba(0,245,255,0.1), 0 0 100px rgba(191,0,255,0.05)',
            }}
          >
            {/* Animated spinner */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  border: '3px solid rgba(255,255,255,0.1)',
                }}
              />
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  border: '3px solid transparent',
                  borderTopColor: '#00F5FF',
                  borderRightColor: '#BF00FF',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div 
                className="absolute inset-2 rounded-full"
                style={{
                  border: '2px solid transparent',
                  borderBottomColor: '#00A8FF',
                  animation: 'spin 1.5s linear infinite reverse',
                }}
              />
              {/* Center glow */}
              <div 
                className="absolute inset-4 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(0,245,255,0.3) 0%, transparent 70%)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            </div>
            
            <h1 
              className="text-2xl font-semibold mb-2"
              style={{ 
                color: '#FFFFFF',
                textShadow: '0 0 30px rgba(0,245,255,0.3)',
              }}
            >
              Activating Your Plan
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Please wait a moment...</p>
            
            {/* Loading bar */}
            <div 
              className="mt-6 h-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div 
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #00F5FF, #BF00FF, #00F5FF)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease-in-out infinite',
                  width: '100%',
                }}
              />
            </div>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div 
            className="rounded-2xl p-8 text-center animate-fadeIn"
            style={{
              background: 'rgba(10,10,20,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(16,185,129,0.3)',
              boxShadow: '0 0 60px rgba(16,185,129,0.2), 0 0 100px rgba(16,185,129,0.1)',
            }}
          >
            {/* Success icon with animation */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(16,185,129,0.2)',
                  animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                }}
              />
              <div 
                className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.1) 100%)',
                  border: '2px solid rgba(16,185,129,0.5)',
                }}
              >
                <svg 
                  className="w-12 h-12" 
                  fill="none" 
                  stroke="#10B981" 
                  viewBox="0 0 24 24"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.5))',
                  }}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2.5} 
                    d="M5 13l4 4L19 7"
                    style={{
                      strokeDasharray: 24,
                      strokeDashoffset: 0,
                      animation: 'drawCheck 0.5s ease-out forwards',
                    }}
                  />
                </svg>
              </div>
            </div>
            
            <h1 
              className="text-2xl font-semibold mb-2"
              style={{ 
                color: '#FFFFFF',
                textShadow: '0 0 30px rgba(16,185,129,0.3)',
              }}
            >
              {planName} Plan Activated!
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)' }} className="mb-6">
              Your subscription is now active. Redirecting to dashboard...
            </p>
            
            {/* Progress bar */}
            <div 
              className="h-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div 
                className="h-full rounded-full"
                style={{
                  background: '#10B981',
                  animation: 'progressFill 3s ease-out forwards',
                  boxShadow: '0 0 20px rgba(16,185,129,0.5)',
                }}
              />
            </div>
          </div>
        )}

        {/* Login Required */}
        {status === 'login-required' && (
          <div 
            className="rounded-2xl p-8 text-center animate-fadeIn"
            style={{
              background: 'rgba(10,10,20,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 60px rgba(0,245,255,0.1), 0 0 100px rgba(191,0,255,0.05)',
            }}
          >
            {/* User icon */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,245,255,0.2) 0%, rgba(191,0,255,0.2) 100%)',
                  border: '2px solid rgba(0,245,255,0.3)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg 
                  className="w-10 h-10" 
                  fill="none" 
                  stroke="url(#userGradient)" 
                  viewBox="0 0 24 24"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(0,245,255,0.3))' }}
                >
                  <defs>
                    <linearGradient id="userGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00F5FF" />
                      <stop offset="100%" stopColor="#BF00FF" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            
            <h1 
              className="text-2xl font-semibold mb-2"
              style={{ 
                color: '#FFFFFF',
                textShadow: '0 0 30px rgba(0,245,255,0.2)',
              }}
            >
              Almost There!
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)' }} className="mb-6">
              Please login or create an account to activate your plan.
            </p>
            
            <button
              onClick={handleLogin}
              className="w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 50%, #BF00FF 100%)',
                color: '#000',
                boxShadow: '0 0 30px rgba(0,245,255,0.3)',
              }}
            >
              Login to Activate
            </button>
            
            <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm mt-4">
              Don't have an account? You can create one during login.
            </p>
          </div>
        )}

        {/* Expired */}
        {status === 'expired' && (
          <div 
            className="rounded-2xl p-8 text-center animate-fadeIn"
            style={{
              background: 'rgba(10,10,20,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(245,158,11,0.3)',
              boxShadow: '0 0 60px rgba(245,158,11,0.1)',
            }}
          >
            {/* Clock icon */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  border: '2px solid rgba(245,158,11,0.3)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-2xl font-semibold text-white mb-2">
              Link Expired
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)' }} className="mb-6">
              This activation link has expired. Please go back to your CopeCart confirmation and click the link again.
            </p>
            
            <Link 
              href="/"
              className="inline-block w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Go to Homepage
            </Link>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div 
            className="rounded-2xl p-8 text-center animate-fadeIn"
            style={{
              background: 'rgba(10,10,20,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(239,68,68,0.3)',
              boxShadow: '0 0 60px rgba(239,68,68,0.1)',
            }}
          >
            {/* Error icon */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '2px solid rgba(239,68,68,0.3)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-2xl font-semibold text-white mb-2">
              Activation Failed
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)' }} className="mb-6">
              {error || 'Something went wrong. Please try again.'}
            </p>
            
            <Link 
              href="/"
              className="inline-block w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Go to Homepage
            </Link>
          </div>
        )}

      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 20px) scale(1.05); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 30px) scale(1.03); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.08); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
          50% { transform: translateY(-30px) translateX(10px); opacity: 0.8; }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes drawCheck {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes ping {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
