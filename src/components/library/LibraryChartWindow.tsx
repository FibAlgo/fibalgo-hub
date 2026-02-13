'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Monitor, Minus, X, Maximize2, ChevronRight } from 'lucide-react';

const MOBILE_BREAKPOINT = 768;

const ASSETS = [
  { key: 'btc', label: 'BTCUSDT 5m' },
  { key: 'gold', label: 'XAUUSD 5m' },
] as const;

type AssetKey = typeof ASSETS[number]['key'];

/* ── LiveBadge — birebir home page ile aynı ── */
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

/* ── Skeleton — birebir home page ile aynı ── */
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
        height: isMobile ? 250 : 400,
        position: 'relative',
        overflow: 'hidden',
        background: '#131722',
      }}
    >
      <div className="skeleton-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`h-${i}`} className="skeleton-line skeleton-h-line" style={{ top: `${15 + i * 14}%` }} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`v-${i}`} className="skeleton-line skeleton-v-line" style={{ left: `${10 + i * 11}%` }} />
        ))}
      </div>

      <div className="skeleton-candles">
        {SKELETON_CANDLES.slice(0, isMobile ? 14 : 24).map((c, i) => (
          <div
            key={`c-${i}`}
            className="skeleton-candle"
            style={{
              height: `${c.h}%`,
              top: `${c.top}%`,
              animationDelay: `${i * 0.06}s`,
              '--candle-color': c.green ? 'rgba(0,245,255,0.15)' : 'rgba(255,100,100,0.12)',
            } as React.CSSProperties}
          >
            <div className="skeleton-wick" />
          </div>
        ))}
      </div>

      <div className="skeleton-center">
        <div className="skeleton-logo-ring">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(0,245,255,0.15)" strokeWidth="2" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(0,245,255,0.6)" strokeWidth="2" strokeDasharray="30 95" className="skeleton-spinner" />
          </svg>
        </div>
        <span className="skeleton-text">Loading chart…</span>
      </div>

      <div className="skeleton-shimmer" />
    </div>
  );
}

/* ── Main Component ── */
interface LibraryChartWindowProps {
  indicatorKey: string;
  indicatorLabel: string;
}

export default function LibraryChartWindow({ indicatorKey, indicatorLabel }: LibraryChartWindowProps) {
  const [activeAsset, setActiveAsset] = useState<AssetKey>('btc');
  const [assetOpen, setAssetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const assetRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [screenshotCache, setScreenshotCache] = useState<Record<string, { url: string; updatedAt: string }>>({});
  const [screenshotLoading, setScreenshotLoading] = useState(true);
  const [imageReady, setImageReady] = useState(false);
  const [lastImgHeight, setLastImgHeight] = useState(0);

  const cacheKey = `${indicatorKey}_${activeAsset}`;
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
            if (existing && existing.updatedAt === data.updatedAt) return prev;
            return { ...prev, [ck]: { url: data.url, updatedAt: data.updatedAt } };
          });
        }
      }
    } catch { /* silent */ } finally {
      setScreenshotLoading(false);
    }
  }, []);

  useEffect(() => {
    const ck = `${indicatorKey}_${activeAsset}`;
    const cached = screenshotCache[ck];
    if (cached) { setScreenshotLoading(false); setImageReady(true); }
    else { setScreenshotLoading(true); setImageReady(false); }
    fetchScreenshot(indicatorKey, activeAsset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicatorKey, activeAsset, fetchScreenshot]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchScreenshot(indicatorKey, activeAsset), 60_000);
    return () => clearInterval(interval);
  }, [indicatorKey, activeAsset, fetchScreenshot]);

  // Responsive
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assetRef.current && !assetRef.current.contains(e.target as Node)) setAssetOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ margin: '1.5rem 0 2rem' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(0,245,255,0.12)',
          background: '#0a0a0f',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Title bar — macOS style */}
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
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'rgba(20,20,30,0.98)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '4px',
                  minWidth: '120px',
                  zIndex: 50,
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  opacity: assetOpen ? 1 : 0,
                  transform: assetOpen ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.97)',
                  pointerEvents: assetOpen ? 'auto' : 'none',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                }}
              >
                {ASSETS.map((asset) => {
                  const isSelected = asset.key === activeAsset;
                  return (
                    <button
                      key={asset.key}
                      type="button"
                      onClick={() => { setActiveAsset(asset.key); setAssetOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '7px 10px',
                        border: 'none',
                        borderRadius: 6,
                        background: isSelected ? 'rgba(0,245,255,0.1)' : 'transparent',
                        color: isSelected ? 'rgba(0,245,255,0.95)' : 'rgba(255,255,255,0.7)',
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
                {indicatorLabel}
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
              <span>TradingView — FibAlgo {indicatorLabel}</span>
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
        <div style={{
          width: '100%',
          background: '#131722',
          position: 'relative',
          overflowX: isMobile ? 'auto' : 'hidden',
          overflowY: 'hidden',
          minHeight: lastImgHeight > 0 ? lastImgHeight : (isMobile ? 250 : 400),
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

          {/* Image */}
          {screenshotUrl && (
            <div style={{ position: 'relative', width: isMobile ? '900px' : '100%', minWidth: isMobile ? '900px' : undefined, zIndex: 1 }}>
              <img
                ref={imgRef}
                src={screenshotUrl}
                alt={`FibAlgo ${indicatorLabel} — ${activeAsset === 'btc' ? 'Bitcoin' : 'Gold'} Chart`}
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
                }}
              />
              {!isMobile && screenshotUpdatedAt && imageReady && <LiveBadge updatedAt={screenshotUpdatedAt} />}
            </div>
          )}

          {/* Fallback */}
          {!screenshotLoading && !screenshotUrl && (
            <div style={{
              width: '100%', height: isMobile ? 250 : 400,
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
      </div>

      {/* Plain <style> tag — NOT jsx scoped — same approach as home page IndicatorTabs */}
      <style>{`
        .skeleton-grid { position: absolute; inset: 0; }
        .skeleton-line { position: absolute; background: rgba(0,245,255,0.04); }
        .skeleton-h-line { left: 0; right: 0; height: 1px; animation: skeletonLineIn 1.2s ease-out forwards; opacity: 0; }
        .skeleton-v-line { top: 0; bottom: 0; width: 1px; animation: skeletonLineIn 1.2s ease-out forwards; animation-delay: 0.3s; opacity: 0; }
        @keyframes skeletonLineIn { from { opacity: 0; } to { opacity: 1; } }
        .skeleton-candles { position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center; gap: 3px; padding: 0 8%; }
        .skeleton-candle { position: relative; flex: 1; min-width: 4px; max-width: 18px; background: var(--candle-color, rgba(0,245,255,0.12)); border-radius: 2px; animation: candleRise 0.8s ease-out forwards; opacity: 0; transform: scaleY(0); transform-origin: bottom; }
        .skeleton-wick { position: absolute; left: 50%; transform: translateX(-50%); top: -20%; bottom: -10%; width: 1px; background: var(--candle-color, rgba(0,245,255,0.08)); }
        @keyframes candleRise { from { opacity: 0; transform: scaleY(0); } to { opacity: 1; transform: scaleY(1); } }
        .skeleton-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 2; }
        .skeleton-logo-ring { animation: skeletonFloat 2.5s ease-in-out infinite; }
        .skeleton-spinner { animation: skeletonSpin 1.2s linear infinite; transform-origin: center; }
        @keyframes skeletonSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes skeletonFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .skeleton-text { font-size: 0.8rem; font-family: 'Inter', monospace; color: rgba(0,245,255,0.4); letter-spacing: 0.08em; animation: skeletonTextPulse 2s ease-in-out infinite; }
        @keyframes skeletonTextPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .skeleton-shimmer { position: absolute; inset: 0; background: linear-gradient(105deg, transparent 40%, rgba(0,245,255,0.03) 45%, rgba(0,245,255,0.06) 50%, rgba(0,245,255,0.03) 55%, transparent 60%); background-size: 200% 100%; animation: shimmerMove 2.5s ease-in-out infinite; pointer-events: none; z-index: 3; }
        @keyframes shimmerMove { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .live-overlay { position: absolute; top: 14px; left: 14px; display: flex; align-items: center; gap: 10px; z-index: 10; }
        .live-pill { display: inline-flex; align-items: center; gap: 7px; background: #e02424; padding: 6px 14px; border-radius: 6px; box-shadow: 0 2px 12px rgba(224,36,36,0.5), 0 0 30px rgba(224,36,36,0.2); animation: liveGlow 2s ease-in-out infinite; }
        .live-rec { width: 10px; height: 10px; border-radius: 50%; background: #ffffff; display: inline-block; animation: livePulse 1.5s ease-in-out infinite; }
        .live-label { font-size: 0.85rem; font-weight: 800; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; letter-spacing: 0.1em; text-transform: uppercase; }
        .live-time { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.85); font-family: monospace; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); }
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes liveGlow { 0%, 100% { box-shadow: 0 2px 12px rgba(224,36,36,0.5), 0 0 30px rgba(224,36,36,0.2); } 50% { box-shadow: 0 2px 20px rgba(224,36,36,0.7), 0 0 50px rgba(224,36,36,0.35); } }
      `}</style>
    </div>
  );
}
