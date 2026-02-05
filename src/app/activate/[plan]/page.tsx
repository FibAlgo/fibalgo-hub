'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
        } else {
          setStatus('error');
          setError(data.error || 'Activation failed');
        }
        return;
      }
      
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
    // Validate plan
    if (!['premium', 'ultimate'].includes(plan)) {
      setStatus('invalid');
      return;
    }

    const init = async () => {
      const loggedIn = await checkAuth();
      setIsLoggedIn(loggedIn);

      if (token) {
        // We have a token
        if (loggedIn) {
          // User is logged in - activate immediately
          activatePlan();
        } else {
          // User needs to login first
          setStatus('login-required');
        }
      } else {
        // No token - try to generate one (only works from CopeCart)
        generateToken();
      }
    };

    init();
  }, [plan, token, checkAuth, activatePlan]);

  // Countdown timer
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
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          setStatus('invalid');
          setError('This page can only be accessed after purchasing through CopeCart.');
        } else if (response.status === 429) {
          setStatus('error');
          setError('Please wait a few minutes before trying again.');
        } else {
          setStatus('error');
          setError(data.error || 'Failed to generate activation link');
        }
        return;
      }
      
      // Redirect to the activation URL with token
      setExpiresIn(data.expiresIn);
      router.replace(data.activationUrl);
      
    } catch (err) {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  };

  const handleActivate = async () => {
    // Redirect to login with return URL
    const redirectTo = encodeURIComponent(`/activate/${plan}?token=${token}`);
    router.push(`/login?redirectTo=${redirectTo}&plan=${plan}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const planName = plan === 'premium' ? 'Premium' : 'Ultimate';
  const planColor = plan === 'premium' ? '#8B5CF6' : '#F59E0B';

  // Invalid plan or no referrer
  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-gray-400 mb-6">
              {error || 'This page can only be accessed after purchasing a plan through our official checkout.'}
            </p>
            <Link 
              href="/"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Token expired
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Link Expired</h1>
            <p className="text-gray-400 mb-6">
              This activation link has expired. Please go back to your CopeCart confirmation page and click the activation link again.
            </p>
            <Link 
              href="/"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading states
  if (status === 'checking' || status === 'generating' || status === 'activating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {status === 'checking' ? 'Verifying...' : status === 'generating' ? 'Generating Activation Link...' : 'Activating Your Plan...'}
            </h1>
            <p className="text-gray-400">Please wait a moment</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: '#10B98120' }}
            >
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {planName} Plan Activated!
            </h1>
            <p className="text-gray-400 mb-6">
              Your subscription is now active. Redirecting to dashboard...
            </p>
            <div className="w-full bg-gray-700 rounded-full h-1 overflow-hidden">
              <div className="bg-green-500 h-1 animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login required state
  if (status === 'login-required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
            {/* Plan badge */}
            <div 
              className="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-6"
              style={{ backgroundColor: `${planColor}20`, color: planColor }}
            >
              {planName} Plan
            </div>
            
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${planColor}20` }}
            >
              <svg className="w-10 h-10" style={{ color: planColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Login Required
            </h1>
            
            <p className="text-gray-400 mb-6">
              Please login or create an account to activate your {planName} subscription.
            </p>
            
            <button
              onClick={handleActivate}
              className="w-full py-4 rounded-xl font-semibold text-white text-lg transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
              style={{ backgroundColor: planColor }}
            >
              Login to Activate
            </button>
            
            <p className="text-xs text-gray-500">
              Don&apos;t have an account? You can create one during login.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link 
              href="/"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default/ready state (shouldn't normally reach here)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Processing...</h1>
          <p className="text-gray-400">Please wait</p>
        </div>
      </div>
    </div>
  );
}
