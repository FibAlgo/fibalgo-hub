'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import { useTranslations } from 'next-intl';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const t = useTranslations('verify');

  useEffect(() => {
    // Query params from verify-email API redirect (English result page)
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified');
    const error = urlParams.get('error');
    const already = urlParams.get('already');

    if (verified === 'true' || verified === '1') {
      setStatus('success');
      if (already === 'true' || already === '1') {
        setMessage(t('alreadyVerified'));
      } else {
        setMessage(t('successMessage'));
      }
    } else if (error) {
      setStatus('error');
      if (error === 'verification_link_expired' || error === 'expired') {
        setMessage(t('expiredLink'));
      } else if (error === 'invalid_verification_link' || error === 'invalid_token' || error === 'invalid_link') {
        setMessage(t('invalidLink'));
      } else if (error === 'verification_failed') {
        setMessage(t('failedMessage'));
      } else {
        setMessage(t('genericFail'));
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
          setMessage(params.get('error_description') || t('verificationFailed'));
        } else if (accessToken) {
          setStatus('success');
          setMessage(t('successMessage'));
        } else {
          setStatus('error');
          setMessage(t('invalidLinkShort'));
        }
      } else {
        setStatus('error');
        setMessage(t('invalidLinkLong'));
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
          {status === 'loading' && t('loadingTitle')}
          {status === 'success' && t('successTitle')}
          {status === 'error' && t('errorTitle')}
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
              {t('canLogin')}
            </p>
            
            <Link href="/login" style={buttonStyle}>
              <span>{t('loginButton')}</span>
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
              {t('linkExpiredNote')}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              <Link href="/login" style={buttonStyle}>
                <span>{t('goToLogin')}</span>
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
            {t('pleaseWait')}
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
