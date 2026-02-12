'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

const COOKIE_CONSENT_KEY = 'fibalgo_cookie_consent';

export type ConsentStatus = 'accepted' | 'rejected' | null;

export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (val === 'accepted' || val === 'rejected') return val;
  return null;
}

export default function CookieConsent() {
  const t = useTranslations('cookieConsent');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't made a choice yet
    const consent = getConsentStatus();
    if (!consent) {
      // Small delay so it doesn't compete with LCP
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
    // Dispatch event so GoogleAnalytics component can react
    window.dispatchEvent(new Event('cookie-consent-change'));
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setVisible(false);
    window.dispatchEvent(new Event('cookie-consent-change'));
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('title')}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        padding: '0 16px 16px',
        pointerEvents: 'none',
        animation: 'cookieBannerSlideUp 0.4s ease-out',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: '0 auto',
          background: 'rgba(15, 15, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 255, 135, 0.15)',
          borderRadius: 16,
          padding: '20px 24px',
          pointerEvents: 'auto',
          boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 20, lineHeight: '24px', flexShrink: 0 }}>🍪</span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.5,
                color: 'rgba(255, 255, 255, 0.75)',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {t('message')}{' '}
              <a
                href="/privacy-policy"
                style={{
                  color: '#00FF87',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                {t('privacyPolicy')}
              </a>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={handleReject}
            style={{
              padding: '8px 20px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
          >
            {t('reject')}
          </button>
          <button
            onClick={handleAccept}
            style={{
              padding: '8px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #00FF87 0%, #00D4AA 100%)',
              color: '#050508',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {t('accept')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cookieBannerSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
