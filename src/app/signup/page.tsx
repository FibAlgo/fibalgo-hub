'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'basic'; // Default to basic now
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains a number', valid: /\d/.test(password) },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.valid);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!allRequirementsMet) {
      setError('Password does not meet requirements');
      return;
    }

    setLoading(true);

    try {
      // Use our custom signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?plan=${selectedPlan}`,
        },
      });
      if (error) setError(error.message);
    } catch {
      setError('Failed to sign up with Google');
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
  };

  if (success) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <AnimatedBackground />
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '28rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Check style={{ width: '40px', height: '40px', color: '#0A0A0F' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '1rem' }}>Check Your Email</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
            We&apos;ve sent a confirmation link to <span style={{ color: '#00F5FF' }}>{email}</span>.
          </p>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)', color: '#000', fontWeight: 600, padding: '1rem 2rem', borderRadius: '0.75rem', textDecoration: 'none' }}>
            <span>Back to Login</span>
            <ArrowRight style={{ width: '20px', height: '20px' }} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1rem 3rem' }}>
      <AnimatedBackground />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '28rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', textDecoration: 'none' }}>
          <Image src="/logo-white.svg" alt="FibAlgo Logo" width={180} height={50} priority />
        </Link>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', textAlign: 'center', marginBottom: '2rem' }}>Create Your FibAlgo Account</h1>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
              <AlertCircle style={{ width: '20px', height: '20px', color: '#f87171', flexShrink: 0 }} />
              <span style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'rgba(255,255,255,0.4)' }} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" style={inputStyle} required />
              </div>
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'rgba(255,255,255,0.4)' }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" style={inputStyle} required />
              </div>
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'rgba(255,255,255,0.4)' }} />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" style={{ ...inputStyle, paddingRight: '3rem' }} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff style={{ width: '20px', height: '20px' }} /> : <Eye style={{ width: '20px', height: '20px' }} />}
                </button>
              </div>
              {password && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {passwordRequirements.map((req, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: req.valid ? '#22c55e' : 'rgba(255,255,255,0.1)' }}>
                        {req.valid && <Check style={{ width: '12px', height: '12px', color: '#FFFFFF' }} />}
                      </div>
                      <span style={{ color: req.valid ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'rgba(255,255,255,0.4)' }} />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" style={inputStyle} required />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p style={{ color: '#f87171', fontSize: '0.875rem', marginTop: '0.5rem' }}>Passwords do not match</p>
              )}
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
              By creating an account, you agree to our <Link href="/terms-of-service" style={{ color: '#00F5FF', textDecoration: 'none' }}>Terms of Service</Link> and <Link href="/privacy-policy" style={{ color: '#00F5FF', textDecoration: 'none' }}>Privacy Policy</Link>.
            </p>

            <button type="submit" disabled={loading} style={{ ...buttonPrimaryStyle, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating account...' : <><span>Create Account</span><ArrowRight style={{ width: '20px', height: '20px' }} /></>}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <button onClick={handleGoogleSignup} style={buttonSecondaryStyle}>
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '1.5rem' }}>
            Already have an account? <Link href="/login" style={{ color: '#00F5FF', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>

        <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.4)', marginTop: '1.5rem', textDecoration: 'none' }}>
          <ArrowRight style={{ width: '16px', height: '16px', transform: 'rotate(180deg)' }} />
          <span>Back to home</span>
        </Link>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0A0A0F 0%, #1a1a2e 50%, #0A0A0F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#00F5FF' }}>Loading...</div>
      </main>
    }>
      <SignupContent />
    </Suspense>
  );
}
