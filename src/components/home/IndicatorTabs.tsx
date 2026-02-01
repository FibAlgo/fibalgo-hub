'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const MOBILE_BREAKPOINT = 768;

// Library (src/app/library/page.tsx) FibAlgo® Indicators — özellikler kısaltılmış
const INDICATOR_DATA = [
  {
    id: 'perfect-entry-zone',
    label: 'Perfect Entry Zone™',
    tagline: 'Adaptive Fibonacci System with Dynamic S/R Zones',
    features: [
      'Adaptive brain: statistically relevant Fibonacci levels for current market',
      'Dynamic S/R zones that flip from resistance to support on break',
      'Perfect Time Zones: Fibonacci-based volatility and reversal timing',
      'Market Pressure Gauge: real-time buy vs sell momentum',
      'Confidence % per zone for statistical significance',
    ],
  },
  {
    id: 'perfect-retracement-zone',
    label: 'Perfect Retracement Zone™',
    tagline: 'Next-Generation Fibonacci with Statistical Confidence',
    features: [
      'Dual-pivot engine: major trend + minor retracement pivots',
      'Adaptive Fibonacci with statistically-proven Confidence Zones',
      'Deep statistical data: success rate and breakout probability per level',
      'Market Pressure Gauge between major pivots',
      'Major (A/B-series) and retracement pivot labeling',
    ],
  },
  {
    id: 'screener-pez',
    label: 'Screener (PEZ)',
    tagline: 'Multi-Symbol Dashboard for Perfect Entry Zone Analysis',
    features: [
      'Up to 10 symbols and timeframes in one table',
      'Volatility (ATR), Trend, Fib Range, Trend Strength columns',
      'Buy Zone / Sell Zone: shows Active when price is inside a PEZ',
      'Scan for confluence: Trend + Strength + Zone alignment',
      'Companion to Perfect Entry Zone™ for detailed chart analysis',
    ],
  },
  {
    id: 'smart-trading',
    label: 'Smart Trading™',
    tagline: 'Intelligent Trading System with Volatility-Adjusted Levels',
    features: [
      'Volatility-adjusted S/R levels (ATR buffer) to reduce false breaks',
      'Strength-rated breakouts: Strong Break, Break, or Low Break',
      'Reversal Zones (Teal/Maroon) for second-chance entries after breakout',
      'Dynamic Take Profit zones that move with the trend',
      'Clear systematic approach for breakouts and retests',
    ],
  },
  {
    id: 'oscillator-matrix',
    label: 'Oscillator Matrix™',
    tagline: 'Statistical Oscillator Analysis with Dynamic Zones',
    features: [
      'Statistical brain: which oscillator values led to reversals historically',
      '6 core oscillators: RSI, MFI, Momentum, Stochastic, Stoch RSI, Chaikin',
      'Dynamic overbought/oversold bands (Maroon peak, Teal trough zones)',
      'Analysis table: Zone, Count, Conf%, Avg Drop/Rise%, Avg Time',
      'Data Decay Engine: more weight to recent market behavior',
    ],
  },
  {
    id: 'technical-analysis',
    label: 'Technical Analysis™',
    tagline: 'AI-Powered All-in-One Trading Suite',
    features: [
      'AI-powered dashboard: Trend, Momentum, Pressure, Volume + Fear & Greed',
      'Smart Money Concepts: BOS, CHOCH, Order Blocks, FVG, ICT Killzones',
      'Predictive tools: AI Price Forecast, Adaptive Trend Finder, probabilistic highs/lows',
      'Automated Fibonacci retracement/extension, Time Zones, horizontal S/R',
      'AI-enhanced RSI with dynamic bands; modular configuration',
    ],
  },
];

export default function IndicatorTabs() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = INDICATOR_DATA[activeIndex];

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
    if (activeIndex < INDICATOR_DATA.length - 1) setActiveIndex(activeIndex + 1);
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
            FibAlgo TradingView
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
            Pro-Grade Indicators, One Suite
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
            Institutional tools and AI insight — built for traders who expect more.
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
              aria-label="Önceki sekme"
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
              maxWidth: isMobile ? (activeIndex === 0 || activeIndex === INDICATOR_DATA.length - 1 ? 'calc(100% - 1.75rem)' : 'calc(100% - 3.25rem)') : 'none',
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
              {INDICATOR_DATA.map((ind, i) => {
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

          {isMobile && activeIndex < INDICATOR_DATA.length - 1 && (
            <button
              type="button"
              aria-label="Sonraki sekme"
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
              {active.tagline}
            </p>
            <ul className="indicator-animated-list">
              {active.features.map((f, i) => (
                <li key={i} className="indicator-animated-item" style={{ animationDelay: `${i * 80}ms` }}>
                  {f}
                </li>
              ))}
            </ul>
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
            Learn more in Library
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
        `}</style>
      </div>
    </section>
  );
}
