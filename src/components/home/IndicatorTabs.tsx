'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowRight, ChevronLeft, ChevronRight, Monitor, Minus, X, Maximize2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

const MOBILE_BREAKPOINT = 768;

// Indicator IDs and feature count (text comes from translations)
const INDICATOR_IDS = [
  { id: 'perfect-entry-zone', key: 'pez', featureCount: 5 },
  { id: 'perfect-retracement-zone', key: 'prz', featureCount: 5 },
  { id: 'screener-pez', key: 'screener', featureCount: 5 },
  { id: 'smart-trading', key: 'smartTrading', featureCount: 5 },
  { id: 'oscillator-matrix', key: 'oscillator', featureCount: 5 },
  { id: 'technical-analysis', key: 'technicalAnalysis', featureCount: 5 },
];

export default function IndicatorTabs() {
  const t = useTranslations('indicatorTabs');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = INDICATOR_IDS[activeIndex];

  // Screenshot state
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(true);
  const [screenshotUpdatedAt, setScreenshotUpdatedAt] = useState<string | null>(null);

  const fetchScreenshot = useCallback(async () => {
    try {
      const res = await fetch('/api/chart-screenshot');
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setScreenshotUrl(data.url);
          setScreenshotUpdatedAt(data.updatedAt);
        }
      }
    } catch {
      // Silent fail — will show placeholder
    } finally {
      setScreenshotLoading(false);
    }
  }, []);

  // Fetch screenshot on mount + auto-refresh every 5 minutes
  useEffect(() => {
    fetchScreenshot();
    const interval = setInterval(fetchScreenshot, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchScreenshot]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Oklar veya tab tıklanınca seçilen sekmeyi görünür yap (tab bar kayar)
  useEffect(() => {
    const btn = tabRefs.current[activeIndex];
    const nav = navRef.current;
    if (!btn || !nav) return;

    // IMPORTANT: Do NOT use scrollIntoView here.
    // scrollIntoView can scroll the whole PAGE vertically on initial mount,
    // which causes the “starts lower then jumps to top” behavior.
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const current = nav.scrollLeft;
    const delta = (btnRect.left - navRect.left) - (navRect.width / 2 - btnRect.width / 2);
    const next = Math.max(0, Math.round(current + delta));

    nav.scrollTo({ left: next, behavior: 'smooth' });
  }, [activeIndex]);

  const goPrev = () => {
    if (activeIndex > 0) setActiveIndex(activeIndex - 1);
  };
  const goNext = () => {
    if (activeIndex < INDICATOR_IDS.length - 1) setActiveIndex(activeIndex + 1);
  };

  return (
    <section
      id="features"
      style={{
        position: 'relative',
        width: '100%',
        padding: '5rem 0 5rem',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(0,245,255,0.85)',
              margin: '0 0 0.75rem 0',
            }}
          >
            {t('badge')}
          </p>
          <h2
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: '0 0 0.75rem 0',
            }}
          >
            {t('title')}
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.6,
              maxWidth: '36rem',
              margin: '0 auto',
            }}
          >
            {t('subtitle')}
          </p>
        </div>

        {/* Tab bar — mobilde daha büyük alan + sade küçük oklar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '0.35rem' : '0',
            marginBottom: '1.5rem',
            padding: isMobile ? '0 0.15rem' : '0',
          }}
        >
          {isMobile && activeIndex > 0 && (
            <button
              type="button"
              aria-label="Previous tab"
              onClick={goPrev}
              style={{
                flexShrink: 0,
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
          )}

          <div
            style={{
              flex: isMobile ? '1' : 'none',
              minWidth: 0,
              maxWidth: isMobile ? (activeIndex === 0 || activeIndex === INDICATOR_IDS.length - 1 ? 'calc(100% - 1.75rem)' : 'calc(100% - 3.25rem)') : 'none',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <nav
              ref={navRef}
              role="tablist"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: isMobile ? '6px 8px' : '6px',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: isMobile ? '12px' : '12px',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                maxWidth: '100%',
              }}
              className="indicator-tabs-nav"
            >
              {INDICATOR_IDS.map((ind, i) => {
                const isActive = activeIndex === i;
                return (
                  <span key={ind.id} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                    {i > 0 && (
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: isMobile ? '0.8rem' : '0.875rem', padding: '0 3px', userSelect: 'none' }}>–</span>
                    )}
                    <button
                      ref={(el) => { tabRefs.current[i] = el; }}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveIndex(i)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: isMobile ? '9px 14px' : '10px 18px',
                        flexShrink: 0,
                        background: isActive ? 'rgba(0,245,255,0.08)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: isActive ? 'rgba(0,245,255,0.95)' : 'rgba(255,255,255,0.5)',
                        fontSize: isMobile ? '0.85rem' : '0.875rem',
                        fontWeight: isActive ? 600 : 500,
                        letterSpacing: '-0.01em',
                        cursor: 'pointer',
                        transition: 'color 0.2s ease, background 0.2s ease',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                        }
                      }}
                    >
                      {t(`tabs.${ind.key}`)}
                    </button>
                  </span>
                );
              })}
            </nav>
          </div>

          {isMobile && activeIndex < INDICATOR_IDS.length - 1 && (
            <button
              type="button"
              aria-label="Next tab"
              onClick={goNext}
              style={{
                flexShrink: 0,
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Library verileri ile animasyonlu container — tüm tab'lar için tek yapı */}
        <div
          key={active.id}
          className="indicator-animated-container"
        >
          <div className="indicator-animated-glow" />
          <div className="indicator-animated-content">
            <p className="indicator-animated-tagline">
              {t(`tabs.${active.key}Tagline`)}
            </p>
            <ul className="indicator-animated-list">
              {Array.from({ length: active.featureCount }, (_, i) => (
                <li key={i} className="indicator-animated-item" style={{ animationDelay: `${i * 80}ms` }}>
                  {t(`features.${active.key}.${i}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* TradingView Chart Embed — software window style */}
        <div
          className="indicator-tv-window"
          style={{
            marginTop: '1.5rem',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid rgba(0,245,255,0.12)',
            background: '#0a0a0f',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
            animation: 'indicatorContainerIn 0.5s ease-out forwards',
          }}
        >
          {/* Title bar — macOS style */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'linear-gradient(180deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.95) 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: "'Inter', monospace",
                letterSpacing: '0.02em',
              }}
            >
              <Monitor size={13} strokeWidth={1.5} style={{ opacity: 0.6 }} />
              <span>TradingView — FibAlgo {t(`tabs.${active.key}`)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.35 }}>
              <Minus size={13} />
              <Maximize2 size={11} />
              <X size={13} />
            </div>
          </div>
          {/* Live Screenshot from TradingView */}
          <div style={{ 
            width: '100%', 
            height: isMobile ? 350 : 500, 
            background: '#131722',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {screenshotLoading ? (
              <div style={{ 
                width: '100%', height: '100%', 
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', 
                gap: '0.75rem',
              }}>
                <RefreshCw 
                  size={24} 
                  style={{ 
                    color: 'rgba(0,245,255,0.5)', 
                    animation: 'spin 1.5s linear infinite',
                  }} 
                />
                <span style={{ color: 'rgba(0,245,255,0.5)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                  Loading chart…
                </span>
              </div>
            ) : screenshotUrl ? (
              <>
                <img
                  src={screenshotUrl}
                  alt={`FibAlgo ${t(`tabs.${active.key}`)} — TradingView Chart`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                  }}
                  loading="lazy"
                />
                {screenshotUpdatedAt && (
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 12,
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.35)',
                    fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}>
                    Updated: {new Date(screenshotUpdatedAt).toLocaleTimeString()}
                  </div>
                )}
              </>
            ) : (
              <div style={{ 
                width: '100%', height: '100%', 
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', 
                gap: '0.5rem',
                background: 'linear-gradient(180deg, #131722 0%, #0a0e17 100%)',
              }}>
                <Monitor size={32} style={{ color: 'rgba(0,245,255,0.3)' }} />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                  Chart preview coming soon
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link
            href="/library"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1.75rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00f5ff 0%, #00a8ff 100%)',
              color: '#000',
              fontWeight: 600,
              fontSize: '0.9375rem',
              textDecoration: 'none',
              boxShadow: '0 0 20px rgba(0,245,255,0.2)',
            }}
          >
            {t('ctaButton')}
            <ArrowRight size={18} />
          </Link>
        </div>

        <style>{`
          .indicator-tabs-nav::-webkit-scrollbar {
            display: none;
          }
          /* Library tabanlı animasyonlu container */
          .indicator-animated-container {
            position: relative;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            padding: 1.75rem 2rem;
            min-height: 200px;
            overflow: hidden;
            animation: indicatorContainerIn 0.4s ease-out forwards;
          }
          .indicator-animated-glow {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(
              ellipse 60% 40% at 50% 0%,
              rgba(0,245,255,0.06) 0%,
              transparent 50%
            );
            pointer-events: none;
            animation: indicatorGlowPulse 4s ease-in-out infinite;
          }
          .indicator-animated-content {
            position: relative;
            z-index: 1;
          }
          .indicator-animated-tagline {
            font-size: 0.85rem;
            font-weight: 500;
            color: rgba(0,245,255,0.95);
            margin: 0 0 1.25rem 0;
            letter-spacing: 0.02em;
            animation: indicatorFadeSlide 0.35s ease-out forwards;
          }
          .indicator-animated-list {
            margin: 0;
            padding-left: 1.25rem;
            list-style: disc;
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
          }
          .indicator-animated-item {
            font-size: 0.9rem;
            color: rgba(255,255,255,0.72);
            line-height: 1.5;
            opacity: 0;
            transform: translateY(10px);
            animation: indicatorItemIn 0.4s ease-out forwards;
          }
          @keyframes indicatorContainerIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes indicatorGlowPulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes indicatorFadeSlide {
            from {
              opacity: 0;
              transform: translateY(-6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes indicatorItemIn {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </section>
  );
}
