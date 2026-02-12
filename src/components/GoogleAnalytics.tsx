'use client';

import Script from 'next/script';
import { useState, useEffect } from 'react';
import { getConsentStatus } from '@/components/CookieConsent';

const GA_ID = 'G-ZQVTVRMZJ2';

export default function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Check initial consent
    setHasConsent(getConsentStatus() === 'accepted');

    // Listen for consent changes
    const handleConsentChange = () => {
      setHasConsent(getConsentStatus() === 'accepted');
    };

    window.addEventListener('cookie-consent-change', handleConsentChange);
    return () => window.removeEventListener('cookie-consent-change', handleConsentChange);
  }, []);

  if (!hasConsent) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
