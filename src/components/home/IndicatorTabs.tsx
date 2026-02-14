'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowRight, ChevronLeft, ChevronRight, Monitor, Minus, X, Maximize2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

const MOBILE_BREAKPOINT = 768;

// Indicator IDs — names are hardcoded (proper product names, not translatable)
const INDICATOR_IDS = [
  { id: 'perfect-entry-zone', key: 'pez', label: 'Perfect Entry Zone™' },
  { id: 'perfect-retracement-zone', key: 'prz', label: 'Perfect Retracement Zone™' },
  { id: 'screener-pez', key: 'screener', label: 'Screener (PEZ)' },
  { id: 'smart-trading', key: 'smartTrading', label: 'Smart Trading™' },
  { id: 'oscillator-matrix', key: 'oscillator', label: 'Oscillator Matrix™' },
  { id: 'technical-analysis', key: 'technicalAnalysis', label: 'Technical Analysis™' },
];

const ASSETS = [
  { key: 'btc', label: 'BTCUSDT 5m' },
  { key: 'gold', label: 'XAUUSD 5m' },
] as const;

type AssetKey = typeof ASSETS[number]['key'];

/** Live badge — YouTube/Twitch style overlay on chart */
function LiveBadge({ updatedAt }: { updatedAt: string }) {
  const [ago, setAgo] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, Date.now() - new Date(updatedAt).getTime());
      const s = Math.floor(diff / 1000);
      if (s < 60) { setAgo(`${s}s ago`); return; }
      const m = Math.floor(s / 60);
      if (m < 60) { setAgo(`${m}m ago`); return; }
      const h = Math.floor(m / 60);
      setAgo(`${h}h ago`);
    };
    calc();
    const interval = setInterval(calc, 1_000);
    return () => clearInterval(interval);
  }, [updatedAt]);

  if (!ago) return null;

  return (
    <div className="live-overlay">
      <div className="live-pill">
        <span className="live-rec" />
        <span className="live-label">LIVE</span>
      </div>
      <span className="live-time">{ago}</span>
    </div>
  );
}

/** Premium skeleton loader for chart */
// Pre-computed candle data (deterministic — avoids SSR/client hydration mismatch)
const SKELETON_CANDLES = [
  { h: 42, top: 28, green: true },  { h: 55, top: 22, green: false }, { h: 30, top: 38, green: true },
  { h: 65, top: 20, green: false }, { h: 38, top: 32, green: true },  { h: 48, top: 26, green: false },
  { h: 25, top: 42, green: true },  { h: 58, top: 24, green: false }, { h: 35, top: 35, green: true },
  { h: 62, top: 21, green: true },  { h: 28, top: 40, green: false }, { h: 52, top: 28, green: true },
  { h: 40, top: 30, green: false }, { h: 45, top: 25, green: true },  { h: 33, top: 36, green: false },
  { h: 60, top: 23, green: true },  { h: 27, top: 44, green: false }, { h: 50, top: 27, green: true },
  { h: 36, top: 33, green: false }, { h: 68, top: 20, green: true },  { h: 22, top: 46, green: false },
  { h: 54, top: 25, green: true },  { h: 44, top: 29, green: false }, { h: 32, top: 37, green: true },
];

function ChartSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      className="chart-skeleton"
      style={{
        width: '100%',
        height: isMobile ? 350 : 500,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #0c0e1a 0%, #111428 50%, #0f1124 100%)',
      }}
    >
      {/* Top gradient line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #2962FF, #00BCD4, #2962FF, transparent)', zIndex: 3 }} />

      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '-80px', right: '-40px', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(41,98,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', left: '-30px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(0,188,212,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Subtle grid lines */}
      <div className="skeleton-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`h-${i}`} className="skeleton-line skeleton-h-line" style={{ top: `${20 + i * 15}%` }} />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`v-${i}`} className="skeleton-line skeleton-v-line" style={{ left: `${12 + i * 12}%` }} />
        ))}
      </div>

      {/* Animated candlestick silhouettes */}
      <div className="skeleton-candles">
        {SKELETON_CANDLES.slice(0, isMobile ? 14 : 24).map((c, i) => (
            <div
              key={`c-${i}`}
              className="skeleton-candle"
              style={{
                height: `${c.h}%`,
                top: `${c.top}%`,
                animationDelay: `${i * 0.06}s`,
                '--candle-color': c.green ? 'rgba(41,98,255,0.18)' : 'rgba(0,188,212,0.12)',
              } as React.CSSProperties}
            >
              <div className="skeleton-wick" />
            </div>
          ))}
      </div>

      {/* Central loading indicator */}
      <div className="skeleton-center">
        {/* Logo container */}
        <div className="skeleton-logo-box">
          <img src="/Tradingview--Streamline-Simple-Icons.svg" alt="" width="28" height="28" />
        </div>
        {/* Spinner ring */}
        <div className="skeleton-logo-ring">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(41,98,255,0.1)" strokeWidth="2" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="url(#skeleton-grad)" strokeWidth="2.5" strokeDasharray="44 132" strokeLinecap="round" className="skeleton-spinner" />
            <defs>
              <linearGradient id="skeleton-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2962FF" />
                <stop offset="100%" stopColor="#00BCD4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="skeleton-text">Loading chart…</span>
      </div>

      {/* Shimmer overlay */}
      <div className="skeleton-shimmer" />
    </div>
  );
}

export default function IndicatorTabs() {
  const t = useTranslations('indicatorTabs');
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeAsset, setActiveAsset] = useState<AssetKey>('btc');
  const [assetOpen, setAssetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const assetRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = INDICATOR_IDS[activeIndex];

  // Screenshot state — per-tab+asset caching
  const [screenshotCache, setScreenshotCache] = useState<Record<string, { url: string; updatedAt: string }>>({});
  const [screenshotLoading, setScreenshotLoading] = useState(true);
  const [imageReady, setImageReady] = useState(false);
  const [lastImgHeight, setLastImgHeight] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const cacheKey = `${active.key}_${activeAsset}`;
  const screenshotUrl = screenshotCache[cacheKey]?.url || null;
  const screenshotUpdatedAt = screenshotCache[cacheKey]?.updatedAt || null;

  const fetchScreenshot = useCallback(async (key: string, asset: AssetKey) => {
    const ck = `${key}_${asset}`;
    try {
      const res = await fetch(`/api/chart-screenshot?key=${key}&asset=${asset}`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setScreenshotCache((prev) => {
            const existing = prev[ck];
            // Only update if timestamp changed (avoids unnecessary re-render)
            if (existing && existing.updatedAt === data.updatedAt) return prev;
            return { ...prev, [ck]: { url: data.url, updatedAt: data.updatedAt } };
          });
        }
      }
    } catch {
      // Silent fail — will show placeholder
    } finally {
      setScreenshotLoading(false);
    }
  }, []);

  // Fetch screenshot when tab or asset changes
  useEffect(() => {
    const ck = `${active.key}_${activeAsset}`;
    const cached = screenshotCache[ck];
    if (cached) {
      // Already in cache — show instantly, no skeleton
      setScreenshotLoading(false);
      setImageReady(true);
    } else {
      // Not cached — show skeleton while fetching
      setScreenshotLoading(true);
      setImageReady(false);
    }
    fetchScreenshot(active.key, activeAsset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.key, activeAsset, fetchScreenshot]);

  // Auto-refresh current tab every 60 seconds (only active tab+asset, 1 lightweight HEAD request)
  useEffect(() => {
    const interval = setInterval(() => fetchScreenshot(active.key, activeAsset), 60_000);
    return () => clearInterval(interval);
  }, [active.key, activeAsset, fetchScreenshot]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assetRef.current && !assetRef.current.contains(e.target as Node)) {
        setAssetOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
                      {ind.label}
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

        {/* Transparency note above chart */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1rem',
          padding: '0 1rem',
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.35)',
            lineHeight: 1.5,
            maxWidth: '36rem',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            {t('liveChartDesc')}
          </p>
        </div>

        {/* TradingView Chart Embed — software window style */}
        <div
          className="indicator-tv-window"
          style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid rgba(0,245,255,0.12)',
            background: '#0a0a0f',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
            animation: 'indicatorContainerIn 0.5s ease-out forwards',
          }}
        >
          {/* Title bar — macOS style with inline asset dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isMobile ? '8px 12px' : '10px 14px',
              background: 'linear-gradient(180deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.95) 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Left: traffic lights + asset dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: isMobile ? 10 : 12, height: isMobile ? 10 : 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
                <span style={{ width: isMobile ? 10 : 12, height: isMobile ? 10 : 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
                <span style={{ width: isMobile ? 10 : 12, height: isMobile ? 10 : 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
              </div>

              {/* Asset Dropdown */}
              <div ref={assetRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setAssetOpen(prev => !prev)}
                  className="asset-dropdown-trigger"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    letterSpacing: '0.03em',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{ASSETS.find(a => a.key === activeAsset)?.label}</span>
                  <ChevronRight
                    size={12}
                    strokeWidth={2}
                    style={{
                      opacity: 0.5,
                      transition: 'transform 0.25s ease',
                      transform: assetOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {/* Dropdown menu */}
                <div
                  className="asset-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    minWidth: '140px',
                    background: 'rgba(20,20,30,0.97)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                    overflow: 'hidden',
                    zIndex: 50,
                    opacity: assetOpen ? 1 : 0,
                    transform: assetOpen ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.97)',
                    pointerEvents: assetOpen ? 'auto' : 'none',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                  }}
                >
                  {ASSETS.map((asset) => {
                    const isSelected = activeAsset === asset.key;
                    return (
                      <button
                        key={asset.key}
                        type="button"
                        onClick={() => {
                          setActiveAsset(asset.key);
                          setAssetOpen(false);
                        }}
                        className="asset-dropdown-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '9px 14px',
                          border: 'none',
                          background: isSelected ? 'rgba(0,245,255,0.08)' : 'transparent',
                          color: isSelected ? 'rgba(0,245,255,0.95)' : 'rgba(255,255,255,0.65)',
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 600 : 400,
                          fontFamily: "'Inter', -apple-system, sans-serif",
                          letterSpacing: '0.02em',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease, color 0.15s ease',
                          textAlign: 'left',
                        }}
                      >
                        <span>{asset.label}</span>
                        {isSelected && (
                          <span style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: 'rgba(0,245,255,0.9)',
                            flexShrink: 0,
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Indicator name next to asset (mobile) */}
              {isMobile && (
                <span style={{
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: "'Inter', monospace",
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '120px',
                }}>
                  {active.label}
                </span>
              )}
            </div>

            {/* Center: title (desktop only) */}
            {!isMobile && (
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
                <span>TradingView — FibAlgo {active.label}</span>
              </div>
            )}

            {/* Right: window controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, opacity: 0.35 }}>
              <Minus size={isMobile ? 11 : 13} />
              <Maximize2 size={isMobile ? 9 : 11} />
              <X size={isMobile ? 11 : 13} />
            </div>
          </div>

          {/* Live Screenshot from TradingView */}
          <div ref={chartScrollRef} style={{ 
            width: '100%', 
            background: '#131722',
            position: 'relative',
            overflowX: isMobile ? 'auto' : 'hidden',
            overflowY: 'hidden',
            minHeight: lastImgHeight > 0 ? lastImgHeight : (isMobile ? 250 : 500),
            WebkitOverflowScrolling: 'touch',
          }}>
            {/* Skeleton — always rendered, fades out when image is ready */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                opacity: (screenshotLoading || !imageReady) ? 1 : 0,
                transition: 'opacity 0.4s ease-out',
                pointerEvents: (screenshotLoading || !imageReady) ? 'auto' : 'none',
              }}
            >
              <ChartSkeleton isMobile={isMobile} />
            </div>

            {/* Image — always rendered (if URL exists), src swap instead of remount */}
            {screenshotUrl && (
              <div style={{ position: 'relative', width: isMobile ? '900px' : '100%', minWidth: isMobile ? '900px' : undefined, zIndex: 1 }}>
                <img
                  ref={imgRef}
                  src={screenshotUrl}
                  alt={`FibAlgo ${active.label} — ${activeAsset === 'btc' ? 'Bitcoin' : 'Gold'} Chart`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                  loading="lazy"
                  onLoad={() => {
                    setImageReady(true);
                    if (imgRef.current) {
                      setLastImgHeight(imgRef.current.clientHeight);
                    }
                    // Auto-scroll to right edge on mobile so latest candles are visible
                    if (isMobile && chartScrollRef.current) {
                      const el = chartScrollRef.current;
                      requestAnimationFrame(() => {
                        el.scrollLeft = el.scrollWidth - el.clientWidth;
                        // Show swipe hint after scroll
                        setShowSwipeHint(true);
                        setTimeout(() => setShowSwipeHint(false), 3000);
                      });
                    }
                  }}
                />
                {!isMobile && screenshotUpdatedAt && imageReady && <LiveBadge updatedAt={screenshotUpdatedAt} />}
              </div>
            )}

            {/* Fallback — no URL at all after loading finishes */}
            {!screenshotLoading && !screenshotUrl && (
              <div style={{ 
                width: '100%', height: isMobile ? 350 : 500, 
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

          {/* Mobile-only: LiveBadge pinned on chart area, outside scroll */}
          {isMobile && screenshotUrl && screenshotUpdatedAt && imageReady && (
            <div style={{ position: 'absolute', top: 37, left: 0, width: '100%', zIndex: 10, pointerEvents: 'none' }}>
              <LiveBadge updatedAt={screenshotUpdatedAt} />
            </div>
          )}

          {/* Mobile swipe hint — minimal touch-drag indicator */}
          {isMobile && showSwipeHint && imageReady && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 15,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                animation: 'swipeHintIn 0.5s cubic-bezier(0.16,1,0.3,1), swipeHintOut 0.4s ease-in 2.6s forwards',
                pointerEvents: 'none',
              }}
            >
              {/* Touch circle with motion trail */}
              <div style={{ display: 'flex', alignItems: 'center', animation: 'swipeSlide 1.4s ease-in-out infinite' }}>
                {/* Trail line */}
                <div style={{
                  width: '100px',
                  height: '4px',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5))',
                  borderRadius: '2px',
                }} />
                {/* Touch dot */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.85)',
                  boxShadow: '0 0 28px rgba(255,255,255,0.4), 0 0 56px rgba(255,255,255,0.15)',
                  flexShrink: 0,
                }} />
                {/* Arrow chevron */}
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{t('swipeHint')}</span>
            </div>
          )}
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

          @keyframes swipeHintIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes swipeHintOut {
            from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          }
          @keyframes swipeSlide {
            0%, 100% { transform: translateX(-12px); opacity: 0.4; }
            50% { transform: translateX(12px); opacity: 1; }
          }

          /* ── Asset Dropdown ── */
          .asset-dropdown-trigger:hover {
            background: rgba(255,255,255,0.1) !important;
            border-color: rgba(255,255,255,0.18) !important;
          }
          .asset-dropdown-item:hover {
            background: rgba(255,255,255,0.06) !important;
            color: rgba(255,255,255,0.9) !important;
          }

          /* ── Chart Skeleton — Blue Gradient Theme ── */
          .skeleton-grid {
            position: absolute;
            inset: 0;
          }
          .skeleton-line {
            position: absolute;
            background: rgba(41,98,255,0.06);
          }
          .skeleton-h-line {
            left: 0;
            right: 0;
            height: 1px;
            animation: skeletonLineIn 1.2s ease-out forwards;
            opacity: 0;
          }
          .skeleton-v-line {
            top: 0;
            bottom: 0;
            width: 1px;
            animation: skeletonLineIn 1.2s ease-out forwards;
            animation-delay: 0.3s;
            opacity: 0;
          }
          @keyframes skeletonLineIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .skeleton-candles {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 3px;
            padding: 0 8%;
          }
          .skeleton-candle {
            position: relative;
            flex: 1;
            min-width: 4px;
            max-width: 18px;
            background: var(--candle-color, rgba(41,98,255,0.12));
            border-radius: 2px;
            animation: candleRise 0.8s ease-out forwards;
            opacity: 0;
            transform: scaleY(0);
            transform-origin: bottom;
          }
          .skeleton-wick {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            top: -20%;
            bottom: -10%;
            width: 1px;
            background: var(--candle-color, rgba(41,98,255,0.08));
          }
          @keyframes candleRise {
            from {
              opacity: 0;
              transform: scaleY(0);
            }
            to {
              opacity: 1;
              transform: scaleY(1);
            }
          }

          .skeleton-center {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            z-index: 2;
          }
          .skeleton-logo-box {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: linear-gradient(135deg, rgba(41,98,255,0.15) 0%, rgba(0,188,212,0.1) 100%);
            border: 1px solid rgba(41,98,255,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(41,98,255,0.12);
            animation: skeletonFloat 2.5s ease-in-out infinite;
          }
          .skeleton-logo-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, calc(-50% - 14px));
          }
          .skeleton-spinner {
            animation: skeletonSpin 1.4s linear infinite;
            transform-origin: center;
          }
          @keyframes skeletonSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes skeletonFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          .skeleton-text {
            font-size: 0.78rem;
            font-family: 'Inter', sans-serif;
            color: rgba(255,255,255,0.35);
            letter-spacing: 0.06em;
            font-weight: 500;
            animation: skeletonTextPulse 2s ease-in-out infinite;
          }
          @keyframes skeletonTextPulse {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 0.7; }
          }

          .skeleton-shimmer {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              105deg,
              transparent 40%,
              rgba(41,98,255,0.03) 45%,
              rgba(41,98,255,0.06) 50%,
              rgba(41,98,255,0.03) 55%,
              transparent 60%
            );
            background-size: 200% 100%;
            animation: shimmerMove 2.5s ease-in-out infinite;
            pointer-events: none;
            z-index: 3;
          }
          @keyframes shimmerMove {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          /* ── LIVE Overlay ── YouTube/Twitch style */
          .live-overlay {
            position: absolute;
            top: 14px;
            left: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10;
          }
          .live-pill {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            background: #e02424;
            padding: 6px 14px;
            border-radius: 6px;
            box-shadow: 0 2px 12px rgba(224, 36, 36, 0.5), 0 0 30px rgba(224, 36, 36, 0.2);
            animation: liveGlow 2s ease-in-out infinite;
          }
          .live-rec {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #ffffff;
            display: inline-block;
            animation: livePulse 1.5s ease-in-out infinite;
          }
          .live-label {
            font-size: 0.85rem;
            font-weight: 800;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }
          .live-time {
            font-size: 0.8rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.85);
            font-family: monospace;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(8px);
            padding: 5px 12px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          @keyframes livePulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes liveGlow {
            0%, 100% { box-shadow: 0 2px 12px rgba(224,36,36,0.5), 0 0 30px rgba(224,36,36,0.2); }
            50% { box-shadow: 0 2px 20px rgba(224,36,36,0.7), 0 0 50px rgba(224,36,36,0.35); }
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
