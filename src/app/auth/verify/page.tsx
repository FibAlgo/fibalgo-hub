'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check query params for our custom verification system
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified');
    const error = urlParams.get('error');
    const already = urlParams.get('already');

    if (verified === 'true') {
      setStatus('success');
      if (already === 'true') {
        setMessage('Your email is already verified. You can login now!');
      } else {
        setMessage('Email verified successfully! You can now login.');
      }
    } else if (error) {
      setStatus('error');
      if (error === 'expired') {
        setMessage('Verification link has expired. Please request a new one from the login page.');
      } else if (error === 'invalid_token' || error === 'invalid_link') {
        setMessage('Invalid or expired verification link.');
      } else {
        setMessage('Email verification failed. Please try again.');
      }
    } else {
      // Check URL hash for Supabase OAuth callback (Google login etc.)
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const hashError = params.get('error');
        
        if (hashError) {
          setStatus('error');
          setMessage(params.get('error_description') || 'Verification failed.');
        } else if (accessToken) {
          setStatus('success');
          setMessage('Email verified successfully!');
        } else {
          setStatus('error');
          setMessage('Invalid verification link.');
        }
      } else {
        // No params - show error
        setStatus('error');
        setMessage('Invalid verification link. Please check your email for the correct link.');
      }
    }
  }, []);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#0A0A0F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  };

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '28rem',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '1.5rem',
    padding: '3rem 2rem',
  };

  const iconContainerStyle: React.CSSProperties = {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    background: status === 'success' 
      ? 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)' 
      : status === 'error' 
        ? 'linear-gradient(135deg, #FF4444 0%, #FF0000 100%)'
        : 'linear-gradient(135deg, #666 0%, #444 100%)',
  };

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
    color: '#000',
    fontWeight: 600,
    padding: '1rem 2rem',
    borderRadius: '0.75rem',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    marginTop: '1.5rem',
  };

  return (
    <main style={containerStyle}>
      <AnimatedBackground />
      
      <div style={cardStyle}>
        {/* Status Icon */}
        <div style={iconContainerStyle}>
          {status === 'loading' && (
            <Loader2 style={{ width: '50px', height: '50px', color: '#0A0A0F', animation: 'spin 1s linear infinite' }} />
          )}
          {status === 'success' && (
            <CheckCircle style={{ width: '50px', height: '50px', color: '#0A0A0F' }} />
          )}
          {status === 'error' && (
            <XCircle style={{ width: '50px', height: '50px', color: '#FFF' }} />
          )}
        </div>

        {/* Title */}
        <h1 style={{ 
          fontSize: '1.75rem', 
          fontWeight: 700, 
          color: '#FFFFFF', 
          marginBottom: '1rem' 
        }}>
          {status === 'loading' && 'Verifying Email...'}
          {status === 'success' && 'Email Verified! 🎉'}
          {status === 'error' && 'Verification Failed'}
        </h1>

        {/* Message */}
        <p style={{ 
          color: 'rgba(255,255,255,0.6)', 
          fontSize: '1rem',
          lineHeight: 1.6,
          marginBottom: '0.5rem'
        }}>
          {message}
        </p>

        {status === 'success' && (
          <>
            <p style={{ 
              color: 'rgba(255,255,255,0.4)', 
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              You can now login to your account.
            </p>
            
            <Link href="/login" style={buttonStyle}>
              <span>Login</span>
              <ArrowRight style={{ width: '20px', height: '20px' }} />
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <p style={{ 
              color: 'rgba(255,255,255,0.4)', 
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              The verification link may be invalid or expired.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              <Link href="/login" style={buttonStyle}>
                <span>Go to Login</span>
                <ArrowRight style={{ width: '20px', height: '20px' }} />
              </Link>
            </div>
          </>
        )}

        {status === 'loading' && (
          <p style={{ 
            color: 'rgba(255,255,255,0.4)', 
            fontSize: '0.875rem',
          }}>
            Lütfen bekleyin...
          </p>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
