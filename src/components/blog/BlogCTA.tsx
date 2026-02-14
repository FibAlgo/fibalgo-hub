'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

/* ═══════════════════════════════════════════════════════════════
 * BlogCTA — Eye-catching call-to-action banners for blog posts
 * 
 * Three variants:
 *   "top"    → TradingView indicator CTA below hero meta
 *   "mid"    → Compact inline banner in the middle of content
 *   "bottom" → Full-width premium banner before related posts
 * ═══════════════════════════════════════════════════════════════ */

const stats = [
  { value: '10,000+', key: 'statTraders' },
  { value: '24/7', key: 'statSignals' },
  { value: '30+', key: 'statMarkets' },
];

export default function BlogCTA({ variant = 'bottom' }: { variant?: 'top' | 'mid' | 'bottom' }) {
  const t = useTranslations('blogCta');

  if (variant === 'top') {
    return (
      <div
        className="blog-cta-top"
        style={{
          position: 'relative',
          margin: '0 auto',
          maxWidth: '780px',
          padding: '0 1.25rem',
        }}
      >
        <div style={{
          position: 'relative',
          borderRadius: '14px',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #0c0e1a 0%, #111428 50%, #0f1124 100%)',
          border: '1px solid rgba(41,98,255,0.15)',
        }}>
          {/* Top gradient line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #2962FF, #00BCD4, #2962FF, transparent)' }} />

          {/* Ambient glows */}
          <div style={{ position: 'absolute', top: '-60px', right: '-30px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(41,98,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(0,188,212,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ padding: '1.25rem 1.5rem', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* TradingView Logo */}
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(41,98,255,0.15) 0%, rgba(0,188,212,0.1) 100%)',
                border: '1px solid rgba(41,98,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(41,98,255,0.1)',
                flexShrink: 0,
              }}>
                <Image src="/Tradingview--Streamline-Simple-Icons.svg" alt="TradingView" width={24} height={24} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.2rem', letterSpacing: '-0.01em' }}>
                  {t('topTitle')}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  {t('topDescription')}
                </div>
              </div>

              {/* Feature pills + Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {(['topFeature1', 'topFeature2', 'topFeature3'] as const).map((key) => (
                    <span
                      key={key}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(41,98,255,0.08)',
                        border: '1px solid rgba(41,98,255,0.15)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.55)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t(key)}
                    </span>
                  ))}
                </div>
                <Link
                  href="/#pricing"
                  className="blog-cta-btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.25rem',
                    background: 'linear-gradient(135deg, #2962FF 0%, #0091EA 100%)',
                    border: '1px solid rgba(41,98,255,0.3)',
                    color: '#FFFFFF',
                    borderRadius: '9px',
                    fontWeight: 650,
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 15px rgba(41,98,255,0.2)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    letterSpacing: '0.01em',
                  }}
                >
                  {t('topButton')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'mid') {
    return (
      <div
        className="blog-cta-mid"
        style={{
          margin: '2.5rem 0',
          position: 'relative',
          borderRadius: '14px',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #0c0e1a 0%, #111428 50%, #0f1124 100%)',
          border: '1px solid rgba(41,98,255,0.15)',
        }}
      >
        {/* Top gradient line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #2962FF, #00BCD4, #2962FF, transparent)' }} />

        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: '-50px', right: '-25px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(41,98,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ padding: '1.25rem 1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* FibAlgo Logo */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(41,98,255,0.15) 0%, rgba(0,188,212,0.1) 100%)',
              border: '1px solid rgba(41,98,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(41,98,255,0.1)',
              flexShrink: 0,
            }}>
              <Image src="/images/websitelogo.jpg" alt="FibAlgo" width={28} height={28} style={{ borderRadius: '6px' }} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.2rem', letterSpacing: '-0.01em' }}>
                {t('midTitle')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                {t('midDescription')}
              </div>
            </div>

            {/* Button */}
            <Link
              href="/terminal"
              className="blog-cta-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.25rem',
                background: 'linear-gradient(135deg, #2962FF 0%, #0091EA 100%)',
                border: '1px solid rgba(41,98,255,0.3)',
                color: '#FFFFFF',
                borderRadius: '9px',
                fontWeight: 650,
                fontSize: '0.8rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 15px rgba(41,98,255,0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                letterSpacing: '0.01em',
              }}
            >
              {t('midButton')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══ BOTTOM VARIANT ═══
  return (
    <div
      className="blog-cta-bottom"
      style={{
        marginTop: '3rem',
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #0c0e1a 0%, #111428 50%, #0f1124 100%)',
        border: '1px solid rgba(41,98,255,0.15)',
      }}
    >
      {/* Top gradient line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #2962FF, #00BCD4, #2962FF, transparent)' }} />

      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '-80px', right: '-40px', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(41,98,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', left: '-30px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(0,188,212,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ padding: '2rem 2rem', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(41,98,255,0.15) 0%, rgba(0,188,212,0.1) 100%)',
            border: '1px solid rgba(41,98,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(41,98,255,0.1)',
          }}>
            <Image src="/images/websitelogo.jpg" alt="FibAlgo" width={34} height={34} style={{ borderRadius: '8px' }} />
          </div>
        </div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.3rem 0.85rem',
          background: 'rgba(41,98,255,0.08)',
          border: '1px solid rgba(41,98,255,0.2)',
          borderRadius: '100px',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: '#5B8DEF',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '1rem',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2962FF', boxShadow: '0 0 8px #2962FF' }} />
          {t('badge')}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: '#FFFFFF',
          marginBottom: '0.65rem',
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
        }}>
          {t('bottomTitle')}
        </h3>

        {/* Description */}
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.88rem',
          lineHeight: 1.6,
          maxWidth: '30rem',
          margin: '0 auto 1.5rem',
        }}>
          {t('bottomDescription')}
        </p>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}>
          {stats.map((s) => (
            <div key={s.key} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #2962FF, #00BCD4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginTop: '0.15rem' }}>
                {t(s.key)}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            href="/terminal"
            className="blog-cta-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1.75rem',
              background: 'linear-gradient(135deg, #2962FF 0%, #0091EA 100%)',
              border: '1px solid rgba(41,98,255,0.3)',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(41,98,255,0.25)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              letterSpacing: '0.01em',
            }}
          >
            {t('tryTerminal')}
          </Link>
          <Link
            href="/signup"
            className="blog-cta-btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1.75rem',
              background: 'rgba(255,255,255,0.03)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.88rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            {t('createAccount')}
          </Link>
        </div>

        {/* Trust line */}
        <div style={{
          marginTop: '1rem',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.5 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {t('trustLine')}
        </div>
      </div>
    </div>
  );
}
