'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Zap,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Activity,
  Globe,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Eye,
  LineChart,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  X,
  Lock
} from 'lucide-react';
import { PreEventCard, PostEventCard, EventAnalysisSkeleton } from '@/components/calendar/EventAnalysisCard';
import { getTerminalCache, setTerminalCache, isCacheValid } from '@/lib/store/terminalCache';
import MobileResponsiveCalendar from './MobileResponsiveCalendar';
import { useTerminal } from '@/lib/context/TerminalContext';

type Importance = 'high' | 'medium' | 'low';
type EventCategory = 'economic' | 'crypto' | 'earnings' | 'fed' | 'ipo' | 'other';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  importance: Importance;
  category: EventCategory;
  country?: string;
  type?: 'macro' | 'crypto' | 'earnings' | 'ipo';
  currency?: string;
  previous?: string;
  forecast?: string;
  actual?: string;
  unit?: string;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

// Country code (US, EU, ZA, ES...) → flag emoji (works for most ISO-3166-1 alpha-2)
const getCountryFlag = (country?: string): string => {
  if (!country) return '🌍';
  const c = String(country).trim().toUpperCase();
  if (!c) return '🌍';
  if (c === 'UK') return '🇬🇧';
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return '🌍';
  const A = 0x1f1e6;
  const codePoints = [A + (c.charCodeAt(0) - 65), A + (c.charCodeAt(1) - 65)];
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
};

const countryToFlagCdnCode = (country?: string): string | null => {
  if (!country) return null;
  const raw = String(country).trim().toLowerCase();
  if (!raw) return null;
  // Non-standard codes seen in data:
  // - UK → GB (ISO)
  // - WL → GB (Wales in some feeds; CDN doesn't support subregions)
  const mapped = raw === 'uk' ? 'gb' : raw === 'wl' ? 'gb' : raw;
  if (!/^[a-z]{2}$/.test(mapped)) return null;
  return mapped;
};

const FlagImg = ({ country, size = 32 }: { country?: string; size?: number }) => {
  const [errored, setErrored] = useState(false);
  const code = countryToFlagCdnCode(country);
  if (!code || errored) return <span style={{ fontSize: size, lineHeight: 1 }}>🌍</span>;
  // pick a reasonable CDN asset; we control displayed size via inline styles
  const src = size >= 28 ? `https://flagcdn.com/48x36/${code}.png` : `https://flagcdn.com/32x24/${code}.png`;
  const w = Math.max(16, Math.round(size));
  const h = Math.max(12, Math.round(w * 0.75));
  return (
    <img
      src={src}
      width={w}
      height={h}
      alt={country ? `${country} flag` : 'flag'}
      loading="lazy"
      style={{ display: 'inline-block', width: w, height: h, borderRadius: 3, verticalAlign: 'middle' }}
      onError={() => setErrored(true)}
    />
  );
};

/** Tarihi yerel güne göre YYYY-MM-DD yap (toISOString UTC kaydırır, önceki/sonraki gün karışmasın) */
const toLocalDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Event date+time (UTC, FMP API) → timestamp for filter/sort
const eventUtcTime = (date: string, time?: string): number => {
  if (!date) return 0;
  const raw = (time || '00:00').trim().slice(0, 8);
  const timeForIso = raw.length <= 5 ? `${raw}:00` : raw;
  const utc = new Date(`${date}T${timeForIso}Z`);
  return Number.isNaN(utc.getTime()) ? 0 : utc.getTime();
};

/** Event başlama anı (UTC) → kullanıcının yerel günü YYYY-MM-DD (widget ile aynı gün eşleşmesi) */
const getEventLocalDateString = (evt: { date: string; time?: string }): string => {
  const ms = eventUtcTime(evt.date, evt.time);
  if (!ms) return evt.date;
  return toLocalDateString(new Date(ms));
};

/** API'den gelen date (YYYY-MM-DD) + time → kullanıcının yerel saati (HH:mm) */
const formatEventLocalTime = (date: string, time?: string): string => {
  if (!date || !time) return '—';
  const raw = time.trim().slice(0, 8);
  const timeForIso = raw.length <= 5 ? `${raw}:00` : raw;
  const iso = `${date}T${timeForIso}Z`;
  const utc = new Date(iso);
  if (Number.isNaN(utc.getTime())) return time;
  return utc.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

/** YYYY-MM-DD string'ini kullanıcının yerel takvim günü olarak parse et (UTC değil) */
const parseLocalDate = (dateStr: string): Date => {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date(dateStr);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const normalizeEventName = (s: string): string =>
  String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Event tipine göre tablo 3 sütununda gösterilecek değerler (Actual / Forecast / Previous anlamında) */
function getEventDisplayValues(event: CalendarEvent): { col1: string; col2: string; col3: string } {
  const dash = '—';
  switch (event.type) {
    case 'macro':
      return { col1: event.actual ?? dash, col2: event.forecast ?? dash, col3: event.previous ?? dash };
    case 'earnings':
      return { col1: event.actual ?? dash, col2: event.forecast ?? dash, col3: event.previous ?? dash };
    case 'ipo':
      return { col1: event.previous ?? dash, col2: event.description ?? dash, col3: dash };
    case 'crypto':
    default:
      return { col1: event.actual ?? dash, col2: event.forecast ?? dash, col3: event.previous ?? dash };
  }
}

/** Sadece macro/earnings ve sayısal değerlerde beat/miss rengi uygulanır */
function isNumericComparison(event: CalendarEvent): boolean {
  if (event.type !== 'macro' && event.type !== 'earnings') return false;
  const a = event.actual != null && event.actual !== '' ? parseFloat(String(event.actual).replace(/[%,$K\s]/g, '')) : NaN;
  const f = event.forecast != null && event.forecast !== '' ? parseFloat(String(event.forecast).replace(/[%,$K\s]/g, '')) : NaN;
  return !Number.isNaN(a) && !Number.isNaN(f);
}

/** Analiz kartlarında (Post/Upcoming/Live) event türüne göre 3 sütun etiket ve değer. event = analysis state'teki event objesi (name, date, type?, actual, forecast, previous, description?). */
function getEventCardConfig(event: { type?: string; actual?: string | number; forecast?: string | number; previous?: string; description?: string; date?: string }): { labels: [string, string, string]; values: [string, string, string] } {
  const dash = '—';
  const t = event?.type || 'macro';
  switch (t) {
    case 'earnings':
      return {
        labels: ['EPS ACTUAL', 'EPS EST.', 'PREV. EPS'],
        values: [event.actual != null ? String(event.actual) : dash, event.forecast != null ? String(event.forecast) : dash, event.previous ?? dash]
      };
    case 'ipo':
      return {
        labels: ['PRICE RANGE', 'EXCHANGE', 'DATE'],
        values: [event.previous ?? dash, event.description ?? dash, event.date ?? dash]
      };
    case 'crypto':
    case 'macro':
    default:
      return {
        labels: ['ACTUAL', 'FORECAST', 'PREVIOUS'],
        values: [event.actual != null ? String(event.actual) : dash, event.forecast != null ? String(event.forecast) : dash, event.previous ?? dash]
      };
  }
}

const groupEventsByDate = (events: CalendarEvent[], useLocalDate = false) => {
  const grouped: Record<string, CalendarEvent[]> = {};
  events.forEach(event => {
    const dateKey = useLocalDate ? getEventLocalDateString(event) : event.date;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(event);
  });
  // Sort events within each day by start time (en yakın gelecek önce)
  Object.keys(grouped).forEach(dateKey => {
    grouped[dateKey].sort((a, b) => eventUtcTime(a.date, a.time) - eventUtcTime(b.date, b.time));
  });
  return grouped;
};

const formatDateHeader = (dateStr: string) => {
  const date = parseLocalDate(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const opts = { month: 'short' as const, day: 'numeric' as const };
  const optsShort = { weekday: 'short' as const, ...opts };
  if (date.toDateString() === today.toDateString()) {
    return { day: 'Today', date: date.toLocaleDateString('en-US', opts), isToday: true };
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return { day: 'Tomorrow', date: date.toLocaleDateString('en-US', opts), isToday: false };
  }
  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
    date: date.toLocaleDateString('en-US', opts),
    isToday: false
  };
};


// ═══════════════════════════════════════════════════════════════════
// IMPACT INDICATOR
// ═══════════════════════════════════════════════════════════════════

const ImpactIndicator = ({ importance }: { importance: Importance }) => {
  const config = {
    high: { colors: ['#EF4444', '#EF4444', '#EF4444'], glow: 'rgba(239,68,68,0.4)' },
    medium: { colors: ['#F59E0B', '#F59E0B', '#374151'], glow: 'rgba(245,158,11,0.3)' },
    low: { colors: ['#6B7280', '#374151', '#374151'], glow: 'none' }
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      gap: '2px',
      filter: importance === 'high' ? `drop-shadow(0 0 4px ${config[importance].glow})` : 'none'
    }}>
      {config[importance].colors.map((color, i) => (
        <div key={i} style={{ width: '4px', height: '16px', borderRadius: '2px', background: color }} />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// LIVE EVENT HERO BANNER
// ═══════════════════════════════════════════════════════════════════

const LiveEventHero = ({ event, analysis, minutesAgo, minutesUntilRelease = 0, hasActual = true, isOverdue = false, onAssetClick, isPremium = true }: { event: any; analysis: any; minutesAgo: number; minutesUntilRelease?: number; hasActual?: boolean; isOverdue?: boolean; onAssetClick?: (symbol: string) => void; isPremium?: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const surprise = analysis?.surprise_assessment || 'in_line';
  
  // Awaiting data config (turuncu/saat teması)
  const awaitingConfig = {
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.05) 100%)',
    border: '#F59E0B',
    icon: Clock,
    text: 'AWAITING DATA',
    color: '#F59E0B'
  };

  // DRAW config (gri tema - 1.5 saat geçti ama actual yok)
  const drawConfig = {
    gradient: 'linear-gradient(135deg, rgba(107,114,128,0.2) 0%, rgba(107,114,128,0.05) 100%)',
    border: '#6B7280',
    icon: Target,
    text: 'DRAW — AWAITING DATA',
    color: '#6B7280'
  };

  const surpriseConfig: Record<string, { gradient: string; border: string; icon: any; text: string; color: string }> = {
    major_upside: { gradient: 'linear-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(34,197,94,0.05) 100%)', border: '#22C55E', icon: TrendingUp, text: 'MAJOR BEAT', color: '#22C55E' },
    minor_upside: { gradient: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.03) 100%)', border: '#22C55E', icon: TrendingUp, text: 'BEAT EXPECTATIONS', color: '#22C55E' },
    in_line: { gradient: 'linear-gradient(135deg, rgba(156,163,175,0.15) 0%, rgba(156,163,175,0.03) 100%)', border: '#9CA3AF', icon: Target, text: 'AS EXPECTED', color: '#9CA3AF' },
    minor_downside: { gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.03) 100%)', border: '#EF4444', icon: TrendingDown, text: 'MISSED EXPECTATIONS', color: '#EF4444' },
    major_downside: { gradient: 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(239,68,68,0.05) 100%)', border: '#EF4444', icon: TrendingDown, text: 'MAJOR MISS', color: '#EF4444' }
  };
  
  // Determine config: overdue > awaiting > actual
  const config = isOverdue && !hasActual 
    ? drawConfig 
    : hasActual 
      ? (surpriseConfig[surprise] || surpriseConfig.in_line) 
      : awaitingConfig;
  const Icon = config.icon;

  const urgency = analysis?.urgency_score || 5;
  const marketMover = analysis?.market_mover_score || analysis?.conviction_score || 5;

  return (
    <div style={{
      background: config.gradient,
      border: `2px solid ${config.border}`,
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Glow */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-50%',
        width: '100%',
        height: '100%',
        background: `radial-gradient(circle, ${config.border}20 0%, transparent 70%)`,
        animation: 'pulse 3s infinite'
      }} />

      {/* Live Badge - Different for awaiting vs released */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(0,0,0,0.5)',
        padding: '0.35rem 0.75rem',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        {hasActual ? (
          <>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#EF4444',
              animation: 'pulse 1s infinite',
              boxShadow: '0 0 15px rgba(239,68,68,0.8)'
            }} />
            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
              JUST RELEASED • {minutesAgo < 60 ? `${minutesAgo}m` : `${Math.floor(minutesAgo/60)}h ${minutesAgo%60}m`} ago
            </span>
          </>
        ) : isOverdue ? (
          <>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#6B7280',
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
              DRAW • AWAITING ACTUAL DATA
            </span>
          </>
        ) : (
          <>
            <Clock size={14} color="#F59E0B" style={{ animation: 'spin 2s linear infinite' }} />
            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
              LIVE
            </span>
          </>
        )}
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', position: 'relative' }}>
        {/* Icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '16px',
          background: `linear-gradient(135deg, ${config.border}40, ${config.border}10)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${config.border}50`
        }}>
          <Icon size={36} color={config.color} />
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '2rem', display: 'inline-flex', alignItems: 'center' }}>
              <FlagImg country={event.country} size={32} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                  {event.title || event.name}
                </h2>
                {/* Event Type Badges */}
                {event.type === 'earnings' && (
                  <span style={{ background: 'rgba(34,197,94,0.2)', color: '#22C55E', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', letterSpacing: '0.5px' }}>
                    EARNINGS
                  </span>
                )}
                {event.type === 'ipo' && (
                  <span style={{ background: 'rgba(139,92,246,0.2)', color: '#8B5CF6', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', letterSpacing: '0.5px' }}>
                    IPO
                  </span>
                )}
                {event.symbol && (
                  <span style={{ background: 'rgba(59,130,246,0.2)', color: '#3B82F6', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {event.symbol}
                  </span>
                )}
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: `${config.border}40`,
                color: config.color,
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                marginTop: '0.35rem'
              }}>
                <Icon size={14} />
                {config.text}
              </span>
            </div>
          </div>

          {/* Data Cards — event türüne göre etiket ve değer */}
          {(() => {
            const cardConfig = getEventCardConfig(event);
            
            // If awaiting data or overdue (DRAW), show different layout
            if (!hasActual) {
              const awaitingColor = isOverdue ? '#6B7280' : '#F59E0B';
              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${awaitingColor}30`
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>ACTUAL</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Clock size={24} color={awaitingColor} style={{ animation: 'spin 2s linear infinite' }} />
                      <span style={{ color: awaitingColor, fontSize: '1.25rem', fontWeight: 700 }}>...</span>
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>FORECAST</div>
                    <div style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 600 }}>{event.forecast || '—'}</div>
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>PREVIOUS</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.75rem', fontWeight: 500 }}>{event.previous || '—'}</div>
                  </div>
                </div>
              );
            }

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '12px',
                  padding: '1rem',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${config.border}30`
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>{cardConfig.labels[0]}</div>
                  <div style={{ color: config.color, fontSize: '1.75rem', fontWeight: 800 }}>{cardConfig.values[0]}</div>
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>{cardConfig.labels[1]}</div>
                  <div style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 600 }}>{cardConfig.values[1]}</div>
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>{cardConfig.labels[2]}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.75rem', fontWeight: 500 }}>{cardConfig.values[2]}</div>
                </div>
              </div>
            );
          })()}

          {/* AI Analysis Headline - Removed: Now only shown in "Show Full Analysis" panel */}

          {/* Metrics Bar */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Urgency */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={16} color={urgency >= 8 ? '#EF4444' : urgency >= 5 ? '#F59E0B' : '#22C55E'} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Urgency</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                  <div key={i} style={{
                    width: '8px',
                    height: '14px',
                    borderRadius: '2px',
                    background: i <= urgency 
                      ? (urgency >= 8 ? '#EF4444' : urgency >= 5 ? '#F59E0B' : '#22C55E')
                      : 'rgba(255,255,255,0.15)'
                  }} />
                ))}
              </div>
            </div>

            {/* Market Mover */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} color={marketMover >= 8 ? '#8B5CF6' : '#6B7280'} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Market Impact</span>
              <span style={{
                background: marketMover >= 8 ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.1)',
                color: marketMover >= 8 ? '#8B5CF6' : '#9CA3AF',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.2rem 0.5rem',
                borderRadius: '4px'
              }}>
                {marketMover}/10
              </span>
            </div>
          </div>

          {/* Affected Assets from Stage 3 (tradingview_assets only) */}
          {(() => {
            // Stage 3 produces tradingview_assets in TradingView format (e.g., "NASDAQ:NVDA", "FX:EURUSD")
            const assets: string[] = analysis?.tradingview_assets || [];
            
            if (assets.length === 0) return null;
            
            // Get display name (remove exchange prefix for display)
            const getDisplayName = (symbol: string): string => {
              if (symbol.includes(':')) {
                return symbol.split(':')[1] || symbol;
              }
              return symbol;
            };
            
            return (
              <div style={{ 
                marginTop: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 500 }}>
                  AFFECTED ASSETS
                </span>
                {assets.slice(0, 6).map((asset: string, idx: number) => {
                  const displayName = getDisplayName(asset);
                  
                  return (
                    <button 
                      key={idx}
                      onClick={() => onAssetClick?.(asset)}
                      style={{
                        background: 'rgba(0,245,255,0.1)',
                        border: '1px solid rgba(0,245,255,0.3)',
                        color: '#00F5FF',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        letterSpacing: '0.02em',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0,245,255,0.25)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0,245,255,0.1)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {displayName}
                    </button>
                  );
                })}
                {assets.length > 6 && (
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                    +{assets.length - 6} more
                  </span>
                )}
              </div>
            );
          })()}

          {/* Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              marginTop: '1rem',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '0.6rem 1rem',
              color: '#fff',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Hide Details' : 'Show Full Analysis'}
          </button>

          {/* Expanded Content - Professional Table Layout (same as UpcomingEventCard) */}
          {expanded && analysis && (
            <div style={{ position: 'relative', marginTop: '1.5rem' }}>
              {/* Lock overlay for basic users */}
              {!isPremium && (
                <Link
                  href="/#pricing"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: 'rgba(0,0,0,0.7)',
                    borderRadius: '12px',
                    color: 'rgba(255,255,255,0.95)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <Lock size={28} strokeWidth={2} />
                  <span>Upgrade to view analysis</span>
                </Link>
              )}
              <div style={!isPremium ? { filter: 'blur(8px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
              {/* FibAlgo Agent Summary - Pre-event analizden gelen özet */}
              {(analysis.summary || analysis.headline) && (
                <div style={{
                  background: 'rgba(0,245,255,0.08)',
                  borderLeft: '4px solid #00F5FF',
                  borderRadius: '0 12px 12px 0',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    marginBottom: '0.5rem' 
                  }}>
                    <Brain size={16} color="#00F5FF" />
                    <span style={{ 
                      color: '#00F5FF', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      letterSpacing: '0.5px' 
                    }}>
                      FIBALGO AGENT
                    </span>
                    <span style={{ 
                      color: 'rgba(255,255,255,0.4)', 
                      fontSize: '0.65rem' 
                    }}>
                      Pre-Event Analysis
                    </span>
                  </div>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.9)', 
                    fontSize: '0.9rem', 
                    margin: 0, 
                    lineHeight: 1.6,
                    fontWeight: 500
                  }}>
                    {analysis.summary || analysis.headline}
                  </p>
                </div>
              )}

              {/* SCENARIOS & PLAYBOOK - Professional Table Layout */}
              {(analysis.scenarios || analysis.scenario_mapping || analysis.scenarioPlaybook) && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.4)', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  {/* Table Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <div style={{ 
                      padding: '12px 16px', 
                      color: hasActual ? config.color : '#F59E0B', 
                      fontSize: '0.7rem', 
                      fontWeight: 700, 
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <BarChart3 size={14} />
                      SCENARIO
                    </div>
                    <div style={{ 
                      padding: '12px 16px', 
                      color: '#8B5CF6', 
                      fontSize: '0.7rem', 
                      fontWeight: 700, 
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      borderLeft: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Target size={14} />
                      TRADE SETUP
                    </div>
                  </div>

                  {/* Table Body - Rows */}
                  {Object.entries(analysis.scenarioPlaybook || analysis.scenarios || analysis.scenario_mapping || {}).slice(0, 5).map(([scenario, data]: [string, any], index: number, arr: any[]) => {
                    const playbook = analysis.scenarioPlaybook?.[scenario] || data;
                    const scenarioData = (analysis.scenarios || analysis.scenario_mapping)?.[scenario] || {};
                    
                    const isPositive = scenario.toLowerCase().includes('beat') || scenario.toLowerCase().includes('above') || scenario.toLowerCase().includes('hawkish');
                    const isNegative = scenario.toLowerCase().includes('miss') || scenario.toLowerCase().includes('below') || scenario.toLowerCase().includes('dovish') || scenario.toLowerCase().includes('withdrawn');
                    const isNeutral = scenario.toLowerCase().includes('inline') || scenario.toLowerCase().includes('expected') || scenario.toLowerCase().includes('hold');
                    
                    // Check if this is the matched scenario (for post-event)
                    const isMatchedScenario = hasActual && analysis.actualOutcome?.scenario === scenario;
                    
                    const scenarioColor = isMatchedScenario ? '#00F5FF' : isPositive ? '#22C55E' : isNegative ? '#EF4444' : isNeutral ? '#6B7280' : '#F59E0B';
                    const displayName = playbook?.label || scenario.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
                    
                    const isNoTrade = playbook?.action === 'no_trade';
                    const trades = playbook?.trades || [];

                    return (
                      <div 
                        key={scenario}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 2fr',
                          borderBottom: index < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          transition: 'background 0.2s ease',
                          background: isMatchedScenario ? 'rgba(0,245,255,0.05)' : 'transparent'
                        }}
                      >
                        {/* Scenario Column */}
                        <div style={{ 
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          background: `linear-gradient(90deg, ${scenarioColor}08 0%, transparent 100%)`
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '4px'
                          }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: scenarioColor,
                              boxShadow: `0 0 8px ${scenarioColor}60`
                            }} />
                            <span style={{ 
                              color: scenarioColor, 
                              fontSize: '0.85rem', 
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {displayName}
                            </span>
                            {isMatchedScenario && (
                              <span style={{
                                background: 'rgba(0,245,255,0.2)',
                                color: '#00F5FF',
                                fontSize: '0.55rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>MATCHED</span>
                            )}
                          </div>
                          {(scenarioData?.probability || data?.probability) && (
                            <div style={{ 
                              color: 'rgba(255,255,255,0.5)', 
                              fontSize: '0.7rem',
                              marginLeft: '16px'
                            }}>
                              {scenarioData?.probability || data?.probability}
                            </div>
                          )}
                          {(scenarioData?.threshold || data?.threshold) && (
                            <div style={{ 
                              color: 'rgba(255,255,255,0.4)', 
                              fontSize: '0.65rem',
                              marginLeft: '16px',
                              marginTop: '2px'
                            }}>
                              {scenarioData?.threshold || data?.threshold}
                            </div>
                          )}
                        </div>

                        {/* Trade Setup Column */}
                        <div style={{ 
                          padding: '12px 16px',
                          borderLeft: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          {isNoTrade ? (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 14px',
                              background: 'rgba(107,114,128,0.1)',
                              borderRadius: '8px',
                              border: '1px solid rgba(107,114,128,0.2)'
                            }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(107,114,128,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Target size={16} color="#6B7280" />
                              </div>
                              <div>
                                <div style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 700 }}>NO TRADE</div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{playbook?.reason || 'No edge in this scenario'}</div>
                              </div>
                            </div>
                          ) : trades.length > 0 ? (
                            trades.slice(0, 2).map((trade: any, i: number) => {
                              const isLong = trade.direction === 'long';
                              const dirColor = isLong ? '#22C55E' : '#EF4444';
                              
                              return (
                                <div 
                                  key={i}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    background: `linear-gradient(135deg, ${dirColor}10 0%, transparent 100%)`,
                                    borderRadius: '8px',
                                    border: `1px solid ${dirColor}30`
                                  }}
                                >
                                  {/* Direction Badge */}
                                  <div style={{
                                    minWidth: '80px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: `${dirColor}20`,
                                    textAlign: 'center',
                                    flexShrink: 0
                                  }}>
                                    <div style={{ 
                                      color: dirColor, 
                                      fontSize: '0.65rem', 
                                      fontWeight: 700,
                                      letterSpacing: '0.5px',
                                      marginBottom: '2px'
                                    }}>
                                      {isLong ? '↑ LONG' : '↓ SHORT'}
                                    </div>
                                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 800 }}>
                                      {trade.asset}
                                    </div>
                                  </div>

                                  {/* Trade Reasoning - pre-event analizden gelen sebep */}
                                  <div style={{ flex: 1 }}>
                                    <div style={{ 
                                      color: 'rgba(255,255,255,0.85)', 
                                      fontSize: '0.8rem', 
                                      lineHeight: 1.5 
                                    }}>
                                      {trade.trigger || trade.reasoning || `${isLong ? 'Buy' : 'Sell'} ${trade.asset} on this scenario`}
                                    </div>
                                  </div>

                                  {/* Confidence Badge - Her zaman göster (pre-event analizden) */}
                                  {trade.confidence && (
                                    <div style={{
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      background: trade.confidence >= 70 ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                                      textAlign: 'center',
                                      flexShrink: 0
                                    }}>
                                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem' }}>CONF</div>
                                      <div style={{ 
                                        color: trade.confidence >= 70 ? '#22C55E' : '#F59E0B', 
                                        fontSize: '0.85rem', 
                                        fontWeight: 700 
                                      }}>{trade.confidence}%</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', padding: '8px' }}>
                              No specific setup defined
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// UPCOMING EVENT CARD (Pre-Event)
// ═══════════════════════════════════════════════════════════════════

const UpcomingEventCard = ({ event, analysis, hoursUntil, onAssetClick, isPremium = true }: { event: any; analysis: any; hoursUntil: number; onAssetClick?: (symbol: string) => void; isPremium?: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const [isAgentExpanded, setIsAgentExpanded] = useState(false);
  
  const tierColors: Record<number | string, { bg: string; border: string; text: string; color: string }> = {
    1: { bg: 'rgba(239,68,68,0.12)', border: '#EF4444', text: 'TIER 1', color: '#EF4444' },
    2: { bg: 'rgba(245,158,11,0.12)', border: '#F59E0B', text: 'TIER 2', color: '#F59E0B' },
    3: { bg: 'rgba(59,130,246,0.12)', border: '#3B82F6', text: 'TIER 3', color: '#3B82F6' },
    'tier1_market_mover': { bg: 'rgba(239,68,68,0.12)', border: '#EF4444', text: 'TIER 1', color: '#EF4444' },
    'tier2_significant': { bg: 'rgba(245,158,11,0.12)', border: '#F59E0B', text: 'TIER 2', color: '#F59E0B' },
    'tier3_moderate': { bg: 'rgba(59,130,246,0.12)', border: '#3B82F6', text: 'TIER 3', color: '#3B82F6' }
  };
  
  // Event type config - for badges only, not border
  const eventTypeConfig: Record<string, { bg: string; color: string; label: string }> = {
    earnings: { bg: 'rgba(34,197,94,0.15)', color: '#22C55E', label: 'EARNINGS' },
    ipo: { bg: 'rgba(139,92,246,0.15)', color: '#8B5CF6', label: 'IPO' },
    crypto: { bg: 'rgba(247,147,26,0.15)', color: '#F7931A', label: 'CRYPTO' },
    macro: { bg: 'rgba(6,182,212,0.15)', color: '#06B6D4', label: 'MACRO' }
  };
  const eventType = event.type || 'macro';
  const typeConfig = eventTypeConfig[eventType] || eventTypeConfig.macro;
  
  // API returns eventClassification.tier as number (1,2,3) or string
  const tier = analysis?.eventClassification?.tier || analysis?.event_classification?.tier || 3;
  const tierConfig = tierColors[tier] || tierColors[3];
  // API returns preEventStrategy.conviction
  const conviction = analysis?.preEventStrategy?.conviction || analysis?.conviction_score || 5;
  const volatility = analysis?.eventClassification?.expectedVolatility || 'moderate';
  const primaryAssets = analysis?.eventClassification?.primaryAffectedAssets || [];
  const secondaryAssets = analysis?.eventClassification?.secondaryAffectedAssets || [];
  const summary = analysis?.summary || analysis?.preEventStrategy?.reasoning || '';
  const keyRisks = analysis?.keyRisks || [];
  
  // Time formatting - fix grammar
  const timeDisplay = hoursUntil < 1 
    ? `${Math.round(hoursUntil * 60)}m` 
    : hoursUntil < 24 
      ? `${Math.round(hoursUntil)}h`
      : `${Math.round(hoursUntil / 24)}d`;

  // Volatility config
  const volatilityConfig: Record<string, { color: string; label: string }> = {
    low: { color: '#22C55E', label: 'LOW' },
    moderate: { color: '#F59E0B', label: 'MODERATE' },
    high: { color: '#EF4444', label: 'HIGH' },
    extreme: { color: '#DC2626', label: 'EXTREME' }
  };
  const volConfig = volatilityConfig[volatility] || volatilityConfig.moderate;

  // Upcoming card uses cyan/teal theme (different from red post-event)
  const cardColor = '#00F5FF';

  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(0,245,255,0.08) 0%, #0D1117 50%, rgba(0,245,255,0.05) 100%)`,
      border: `2px solid ${cardColor}`,
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Glow */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-50%',
        width: '100%',
        height: '100%',
        background: `radial-gradient(circle, ${cardColor}15 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />
      {/* UPCOMING Badge */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(0,0,0,0.5)',
        padding: '0.35rem 0.75rem',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#00F5FF',
          boxShadow: '0 0 10px rgba(0,245,255,0.6)'
        }} />
        <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
          UPCOMING • {timeDisplay}
        </span>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', position: 'relative' }}>
        {/* Flag Icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '16px',
          background: `linear-gradient(135deg, ${cardColor}40, ${cardColor}10)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${cardColor}50`
        }}>
          <FlagImg country={event.country} size={36} />
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* Header with badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
              {event.title || event.name}
            </h2>
            {/* Event Type Badge */}
            <span style={{ 
              background: typeConfig.bg, 
              color: typeConfig.color, 
              padding: '2px 10px', 
              borderRadius: '4px', 
              fontSize: '0.65rem', 
              fontWeight: 600, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              {typeConfig.label}
            </span>
            {/* Tier Badge */}
            <span style={{ 
              background: tierConfig.bg, 
              color: tierConfig.border, 
              padding: '2px 10px', 
              borderRadius: '4px', 
              fontSize: '0.65rem', 
              fontWeight: 600 
            }}>
              {tierConfig.text}
            </span>
            {/* Symbol for earnings/ipo */}
            {event.symbol && (
              <span style={{ 
                background: 'rgba(0,229,255,0.15)', 
                color: '#00E5FF', 
                padding: '2px 8px', 
                borderRadius: '4px', 
                fontSize: '0.7rem', 
                fontWeight: 700 
              }}>
                {event.symbol}
              </span>
            )}
          </div>

          {/* Description if any */}
          {event.description && (
            <p style={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '0.85rem', 
              margin: '0 0 0.75rem 0' 
            }}>
              {event.description}
            </p>
          )}

          {/* Data Cards */}
          {(() => {
            const cardConfig = getEventCardConfig(event);
            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '12px',
                  padding: '1rem',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${cardColor}30`
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>{cardConfig.labels[1]}</div>
                  <div style={{ color: cardColor, fontSize: '1.5rem', fontWeight: 800 }}>{cardConfig.values[1]}</div>
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>{cardConfig.labels[2]}</div>
                  <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 600 }}>{cardConfig.values[2]}</div>
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '1rem',
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>VOLATILITY</div>
                  <div style={{ color: volConfig.color, fontSize: '1.25rem', fontWeight: 700 }}>{volConfig.label}</div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* AI ANALYSIS SECTION */}
      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: `1px solid ${cardColor}30` }}>
        {/* FIBALGO AGENT Box */}
        {summary && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(0,184,212,0.05) 100%)', 
            border: '1px solid rgba(0,229,255,0.2)', 
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Brain size={18} color="#00E5FF" />
              <span style={{ color: '#00E5FF', fontSize: '0.85rem', fontWeight: 700 }}>FIBALGO AGENT</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Agent Ready</span>
            </div>
            <p style={{ 
              color: 'rgba(255,255,255,0.85)', 
              fontSize: '0.9rem', 
              lineHeight: 1.6, 
              margin: 0,
              marginBottom: isAgentExpanded || summary.length <= 200 ? 0 : '8px'
            }}>
              {isAgentExpanded || summary.length <= 200 ? summary : summary.slice(0, 200) + '...'}
            </p>
            {summary.length > 200 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsAgentExpanded(!isAgentExpanded); }} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#00E5FF', 
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  padding: '4px 0', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}
              >
                {isAgentExpanded ? (<><ChevronUp size={14} /> Show less</>) : (<><ChevronDown size={14} /> Read more</>)}
              </button>
            )}
          </div>
        )}

        {/* Expand Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            color: 'rgba(255,255,255,0.5)', 
            fontSize: '0.75rem', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            padding: '8px 0' 
          }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Hide Scenarios & Trades' : 'Show Scenarios & Trades'}
        </button>

        {/* EXPANDED CONTENT */}
        {expanded && (
          <div style={{ position: 'relative', marginTop: '1.5rem' }}>
            {/* Lock overlay for basic users */}
            {!isPremium && (
              <Link
                href="/#pricing"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '12px',
                  color: 'rgba(255,255,255,0.95)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Lock size={28} strokeWidth={2} />
                <span>Upgrade to view analysis</span>
              </Link>
            )}
            <div style={!isPremium ? { filter: 'blur(8px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
            {/* SCENARIOS & PLAYBOOK - Professional Table Layout */}
            {(analysis.scenarios || analysis.scenario_mapping || analysis.scenarioPlaybook) && (
              <div style={{ 
                background: 'rgba(0,0,0,0.4)', 
                borderRadius: '12px', 
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr',
                  background: 'rgba(255,255,255,0.03)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ 
                    padding: '12px 16px', 
                    color: '#00F5FF', 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <BarChart3 size={14} />
                    SCENARIO
                  </div>
                  <div style={{ 
                    padding: '12px 16px', 
                    color: '#8B5CF6', 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Target size={14} />
                    TRADE SETUP
                  </div>
                </div>

                {/* Table Body - Rows */}
                {Object.entries(analysis.scenarioPlaybook || analysis.scenarios || analysis.scenario_mapping || {}).slice(0, 5).map(([scenario, data]: [string, any], index: number, arr: any[]) => {
                  const playbook = analysis.scenarioPlaybook?.[scenario] || data;
                  const scenarioData = (analysis.scenarios || analysis.scenario_mapping)?.[scenario] || {};
                  
                  const isPositive = scenario.toLowerCase().includes('beat') || scenario.toLowerCase().includes('above') || scenario.toLowerCase().includes('hawkish');
                  const isNegative = scenario.toLowerCase().includes('miss') || scenario.toLowerCase().includes('below') || scenario.toLowerCase().includes('dovish') || scenario.toLowerCase().includes('withdrawn');
                  const isNeutral = scenario.toLowerCase().includes('inline') || scenario.toLowerCase().includes('expected') || scenario.toLowerCase().includes('hold');
                  
                  const scenarioColor = isPositive ? '#22C55E' : isNegative ? '#EF4444' : isNeutral ? '#6B7280' : '#F59E0B';
                  const displayName = playbook?.label || scenario.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
                  
                  const isNoTrade = playbook?.action === 'no_trade';
                  const trades = playbook?.trades || [];

                  return (
                    <div 
                      key={scenario}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 2fr',
                        borderBottom: index < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      {/* Scenario Column */}
                      <div style={{ 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        background: `linear-gradient(90deg, ${scenarioColor}08 0%, transparent 100%)`
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          marginBottom: '4px'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: scenarioColor,
                            boxShadow: `0 0 8px ${scenarioColor}60`
                          }} />
                          <span style={{ 
                            color: scenarioColor, 
                            fontSize: '0.85rem', 
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {displayName}
                          </span>
                        </div>
                        {(scenarioData?.probability || data?.probability) && (
                          <div style={{ 
                            color: 'rgba(255,255,255,0.5)', 
                            fontSize: '0.7rem',
                            marginLeft: '16px'
                          }}>
                            {scenarioData?.probability || data?.probability}
                          </div>
                        )}
                        {(scenarioData?.threshold || data?.threshold) && (
                          <div style={{ 
                            color: 'rgba(255,255,255,0.4)', 
                            fontSize: '0.65rem',
                            marginLeft: '16px',
                            marginTop: '2px'
                          }}>
                            {scenarioData?.threshold || data?.threshold}
                          </div>
                        )}
                      </div>

                      {/* Trade Setup Column */}
                      <div style={{ 
                        padding: '12px 16px',
                        borderLeft: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {isNoTrade ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            background: 'rgba(107,114,128,0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(107,114,128,0.2)'
                          }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(107,114,128,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Target size={16} color="#6B7280" />
                            </div>
                            <div>
                              <div style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 700 }}>NO TRADE</div>
                              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{playbook?.reason || 'No edge in this scenario'}</div>
                            </div>
                          </div>
                        ) : trades.length > 0 ? (
                          trades.slice(0, 2).map((trade: any, i: number) => {
                            const isLong = trade.direction === 'long';
                            const dirColor = isLong ? '#22C55E' : '#EF4444';
                            
                            return (
                              <div 
                                key={i}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '12px 16px',
                                  background: `linear-gradient(135deg, ${dirColor}10 0%, transparent 100%)`,
                                  borderRadius: '8px',
                                  border: `1px solid ${dirColor}30`
                                }}
                              >
                                {/* Direction Badge */}
                                <div style={{
                                  minWidth: '80px',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  background: `${dirColor}20`,
                                  textAlign: 'center',
                                  flexShrink: 0
                                }}>
                                  <div style={{ 
                                    color: dirColor, 
                                    fontSize: '0.65rem', 
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    marginBottom: '2px'
                                  }}>
                                    {isLong ? '↑ LONG' : '↓ SHORT'}
                                  </div>
                                  <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 800 }}>
                                    {trade.asset}
                                  </div>
                                </div>

                                {/* Trade Reasoning */}
                                <div style={{ flex: 1 }}>
                                  <div style={{ 
                                    color: 'rgba(255,255,255,0.85)', 
                                    fontSize: '0.8rem', 
                                    lineHeight: 1.5 
                                  }}>
                                    {trade.trigger || trade.reasoning || `${isLong ? 'Buy' : 'Sell'} ${trade.asset} on this scenario`}
                                  </div>
                                </div>

                                {/* Confidence Badge */}
                                {trade.confidence && (
                                  <div style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    background: trade.confidence >= 70 ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                                    textAlign: 'center',
                                    flexShrink: 0
                                  }}>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem' }}>CONF</div>
                                    <div style={{ 
                                      color: trade.confidence >= 70 ? '#22C55E' : '#F59E0B', 
                                      fontSize: '0.85rem', 
                                      fontWeight: 700 
                                    }}>{trade.confidence}%</div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', padding: '8px' }}>
                            No specific setup defined
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Additional Info Grid - Professional Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '1rem',
              marginTop: '1rem'
            }}>
              {/* Key Risks Card */}
              {keyRisks.length > 0 && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(239,68,68,0.2)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'rgba(239,68,68,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <AlertTriangle size={14} color="#EF4444" />
                    </div>
                    <span style={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px' }}>KEY RISKS</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {keyRisks.slice(0, 4).map((risk: string, i: number) => (
                      <div key={i} style={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                      }}>
                        <div style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: '#EF4444',
                          marginTop: '6px',
                          flexShrink: 0
                        }} />
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', lineHeight: 1.4 }}>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Earnings Expectations Card */}
              {event.type === 'earnings' && analysis.expectationsAnalysis && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(34,197,94,0.2)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'rgba(34,197,94,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <BarChart3 size={14} color="#22C55E" />
                    </div>
                    <span style={{ color: '#22C55E', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px' }}>EARNINGS EXPECTATIONS</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div style={{ 
                      background: 'rgba(34,197,94,0.05)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.5px', marginBottom: '4px' }}>EPS ESTIMATE</div>
                      <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>{analysis.expectationsAnalysis.epsEstimate || '—'}</div>
                    </div>
                    <div style={{ 
                      background: 'rgba(34,197,94,0.1)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      border: '1px solid rgba(34,197,94,0.2)'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.5px', marginBottom: '4px' }}>WHISPER</div>
                      <div style={{ color: '#22C55E', fontSize: '1.25rem', fontWeight: 700 }}>{analysis.expectationsAnalysis.epsWhisper || '—'}</div>
                    </div>
                    <div style={{ 
                      background: 'rgba(34,197,94,0.05)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.5px', marginBottom: '4px' }}>REV ESTIMATE</div>
                      <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>{analysis.expectationsAnalysis.revenueEstimate || '—'}</div>
                    </div>
                    <div style={{ 
                      background: 'rgba(34,197,94,0.1)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      border: '1px solid rgba(34,197,94,0.2)'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.5px', marginBottom: '4px' }}>REV WHISPER</div>
                      <div style={{ color: '#22C55E', fontSize: '1.25rem', fontWeight: 700 }}>{analysis.expectationsAnalysis.revenueWhisper || '—'}</div>
                    </div>
                  </div>
                  {analysis.expectationsAnalysis.keyMetrics && (
                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {analysis.expectationsAnalysis.keyMetrics.map((m: string, i: number) => (
                        <span key={i} style={{ 
                          background: 'rgba(34,197,94,0.1)', 
                          color: '#22C55E', 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }}>{m}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* IPO Analysis Card */}
              {event.type === 'ipo' && analysis.ipoAnalysis && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(139,92,246,0.2)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'rgba(139,92,246,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <BarChart3 size={14} color="#8B5CF6" />
                    </div>
                    <span style={{ color: '#8B5CF6', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px' }}>IPO ANALYSIS</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ 
                      background: 'rgba(139,92,246,0.05)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.5px', marginBottom: '4px' }}>PRICE RANGE</div>
                      <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>{analysis.ipoAnalysis.priceRange || '—'}</div>
                    </div>
                    <div style={{ 
                      background: 'rgba(139,92,246,0.1)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      border: '1px solid rgba(139,92,246,0.2)'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.5px', marginBottom: '4px' }}>EXPECTED</div>
                      <div style={{ color: '#8B5CF6', fontSize: '1.1rem', fontWeight: 700 }}>{analysis.ipoAnalysis.expectedPricing || '—'}</div>
                    </div>
                    <div style={{ 
                      background: 'rgba(139,92,246,0.05)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.5px', marginBottom: '4px' }}>VALUATION</div>
                      <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>{analysis.ipoAnalysis.valuation || '—'}</div>
                    </div>
                    <div style={{ 
                      background: 'rgba(34,197,94,0.1)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      border: '1px solid rgba(34,197,94,0.2)'
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', letterSpacing: '0.5px', marginBottom: '4px' }}>DEMAND</div>
                      <div style={{ color: '#22C55E', fontSize: '1.1rem', fontWeight: 700 }}>{analysis.ipoAnalysis.demandAssessment || '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sector Impact / Sympathy Plays Card */}
              {analysis.sectorImpact?.sympathyPlays && analysis.sectorImpact.sympathyPlays.length > 0 && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(59,130,246,0.2)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'rgba(59,130,246,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Activity size={14} color="#3B82F6" />
                    </div>
                    <span style={{ color: '#3B82F6', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px' }}>SYMPATHY PLAYS</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {analysis.sectorImpact.sympathyPlays.map((play: any, i: number) => (
                      <div key={i} style={{ 
                        background: 'rgba(59,130,246,0.1)',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid rgba(59,130,246,0.2)'
                      }}>
                        <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>{play.asset}</span>
                        <span style={{ 
                          background: play.correlation === 'high' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
                          color: play.correlation === 'high' ? '#22C55E' : '#F59E0B',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>{play.correlation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER - Trade Assets */}
      {(analysis?.tradingview_assets || primaryAssets.length > 0) && (
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid rgba(255,255,255,0.05)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(analysis?.tradingview_assets || primaryAssets).slice(0, 6).map((asset: string, i: number) => {
              // Get TradingView symbol - if already has ':', use as is, otherwise try to convert
              const tvSymbol = asset.includes(':') ? asset : asset;
              return (
                <button
                  key={i}
                  onClick={() => onAssetClick?.(tvSymbol)}
                  style={{ 
                    background: 'rgba(0,229,255,0.1)', 
                    color: '#00E5FF', 
                    padding: '4px 10px', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    border: '1px solid rgba(0,229,255,0.3)', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,229,255,0.25)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,229,255,0.1)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {asset.includes(':') ? asset.split(':')[1] : asset}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
// ═══════════════════════════════════════════════════════════════════
// AI POWER HEADER
// ═══════════════════════════════════════════════════════════════════

const AIPowerHeader = ({ preCount, postCount, loading }: { preCount: number; postCount: number; loading: boolean }) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0,245,255,0.1) 0%, rgba(139,92,246,0.1) 50%, rgba(0,245,255,0.05) 100%)',
      border: '1px solid rgba(0,245,255,0.25)',
      borderRadius: '16px',
      padding: '1.25rem 1.5rem',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2300F5FF\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        opacity: 0.5
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #00F5FF, #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,245,255,0.4)'
        }}>
          <BarChart3 size={28} color="#000" />
        </div>
        <div>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            Event Analysis
          </h3>
          <p style={{ color: 'rgba(0,245,255,0.9)', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
            Agent Ready
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '2rem', position: 'relative' }}>
        {/* Pre-Event */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <Eye size={18} color="#00F5FF" />
            <span style={{ 
              color: '#00F5FF', 
              fontSize: '1.75rem', 
              fontWeight: 800,
              textShadow: '0 0 20px rgba(0,245,255,0.5)'
            }}>
              {loading ? '...' : preCount}
            </span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', letterSpacing: '1px' }}>
            PRE-EVENT
          </div>
        </div>

        {/* Divider */}
        <div style={{ 
          width: '1px', 
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)' 
        }} />

        {/* Post-Event */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            <Flame size={18} color="#EF4444" />
            <span style={{ 
              color: '#EF4444', 
              fontSize: '1.75rem', 
              fontWeight: 800,
              textShadow: '0 0 20px rgba(239,68,68,0.5)'
            }}>
              {loading ? '...' : postCount}
            </span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', letterSpacing: '1px' }}>
            POST-EVENT
          </div>
        </div>

      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function CalendarPage() {
  const { isPremium } = useTerminal();
  const searchParams = useSearchParams();
  // Initialize from cache immediately to avoid blank screen
  const initialCache = typeof window !== 'undefined' ? getTerminalCache() : null;
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (initialCache?.calendar?.events && isCacheValid(initialCache.calendar.timestamp)) {
      return initialCache.calendar.events as CalendarEvent[];
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    // If we have cached events, don't show loading
    if (initialCache?.calendar?.events && isCacheValid(initialCache.calendar.timestamp)) {
      return false;
    }
    return true;
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('high'); // varsayılan: high impact
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const countryMenuRef = useRef<HTMLDivElement | null>(null);
  const [analyzedKeys, setAnalyzedKeys] = useState<Record<string, true>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [calendarEmptyMessage, setCalendarEmptyMessage] = useState<string | null>(null);
  // Event Analysis States (liveEvent: post-event + live-awaiting karışık; render'da hasActual ile ayrılıyor)
  const [eventAnalyses, setEventAnalyses] = useState<{
    preEvent: Array<{ event: any; analysis: any; hoursUntil: number }>;
    liveEvent: Array<{ event: any; analysis: any; minutesAgo?: number; minutesUntilRelease?: number; hasActual?: boolean }>;
  }>({ preEvent: [], liveEvent: [] });
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  
  // Collapse states for analysis sections
  const [collapsedSections, setCollapsedSections] = useState<{
    postEvent: boolean;
    liveAwaiting: boolean;
    upcoming: boolean;
  }>({ postEvent: false, liveAwaiting: false, upcoming: false });
  
  const toggleSection = (section: 'postEvent' | 'liveAwaiting' | 'upcoming') => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  const [livePollingActive, setLivePollingActive] = useState(false);
  // TradingView Chart Popup
  const [chartPopupOpen, setChartPopupOpen] = useState(false);
  const [chartPopupSymbol, setChartPopupSymbol] = useState('');
  // AbortController for cancelling stale requests when date changes
  const calendarAbortRef = useRef<AbortController | null>(null);
  // Mobile detection
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  
  // Check if mobile and cache result
  useEffect(() => {
    // First check cache for instant response
    const cached = sessionStorage.getItem('fibalgo_isMobile');
    if (cached !== null) {
      setIsMobile(cached === 'true');
    }
    
    // Then verify with real check and update cache
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      sessionStorage.setItem('fibalgo_isMobile', String(mobile));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Widget'tan gelince: /terminal/calendar?date=YYYY-MM-DD → o güne odaklan
  useEffect(() => {
    const qp = searchParams?.get('date');
    if (!qp || !/^\d{4}-\d{2}-\d{2}$/.test(qp)) return;
    setSelectedDate(parseLocalDate(qp));
  }, [searchParams]);

  // Country dropdown: close on outside click / Esc
  useEffect(() => {
    if (!countryMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = countryMenuRef.current;
      if (!el) return;
      if (e.target && el.contains(e.target as Node)) return;
      setCountryMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCountryMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [countryMenuOpen]);

  // Geçmiş event tıklanınca popup: DB'den pre + post analizi
  const [eventModalData, setEventModalData] = useState<{
    event: CalendarEvent;
    apiEvent: { name: string; date: string; actual?: string | number; forecast?: string | number; previous?: string | number; country?: string; currency?: string; surprise_direction?: string; surprise_category?: string } | null;
    preAnalysis: Record<string, unknown> | null;
    postAnalysis: Record<string, unknown> | null;
  } | null>(null);
  const [loadingEventModal, setLoadingEventModal] = useState(false);

  const openEventModal = async (event: CalendarEvent) => {
    const key = `${event.date}|${normalizeEventName(event.title)}`;
    // Only analyzed past events should open a popup
    if (!analyzedKeys[key]) return;
    setEventModalData(null);
    setLoadingEventModal(true);
    try {
      const res = await fetch(
        `/api/calendar/event-analysis?name=${encodeURIComponent(event.title)}&date=${encodeURIComponent(event.date)}`
      );
      const data = await res.json();
      if (data.success) {
        setEventModalData({
          event,
          apiEvent: data.event ?? null,
          preAnalysis: data.preAnalysis ?? null,
          postAnalysis: data.postAnalysis ?? null,
        });
      } else {
        setEventModalData({
          event,
          apiEvent: null,
          preAnalysis: null,
          postAnalysis: null,
        });
      }
    } catch {
      setEventModalData({
        event,
        apiEvent: null,
        preAnalysis: null,
        postAnalysis: null,
      });
    } finally {
      setLoadingEventModal(false);
    }
  };

  // Fetch calendar data - check cache first. silent=true: arka planda güncelle, listeyi sakla (pır pır önlenir)
  const fetchCalendar = async (forceRefresh = false, silent = false) => {
    // Cancel any in-flight request when date changes
    if (calendarAbortRef.current) {
      calendarAbortRef.current.abort();
    }
    const abortController = new AbortController();
    calendarAbortRef.current = abortController;
    
    if (!silent) setIsLoading(true);
    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cache = getTerminalCache();
        if (cache?.calendar && isCacheValid(cache.calendar.timestamp)) {
          const cachedEvents = cache.calendar.events as CalendarEvent[];
          setEvents(cachedEvents);
          setLastUpdated(new Date(cache.calendar.timestamp));
          setCalendarEmptyMessage(cachedEvents.length === 0 ? 'No events in cache. Refresh to fetch from API.' : null);
          if (!silent) setIsLoading(false);
          fetchEventAnalyses(cachedEvents);
          return;
        }
      }
      
      // Calendar: seçilen tarihin HAFTASI (Pzt–Paz) — kullanıcı tarih değiştirince liste değişmeli
      const dateToUse = selectedDateRef.current;
      const weekStart = new Date(dateToUse);
      weekStart.setDate(dateToUse.getDate() - dateToUse.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      // IMPORTANT: API tarafında günler UTC yorumlanabiliyor; lokal/UTC sınırında event kaçırmamak için ±1 gün buffer ile UTC aralığı çekiyoruz.
      const fromDate = new Date(weekStart);
      fromDate.setDate(fromDate.getDate() - 1);
      const toDate = new Date(weekEnd);
      toDate.setDate(toDate.getDate() + 1);
      const from = fromDate.toISOString().slice(0, 10);
      const to = toDate.toISOString().slice(0, 10);

      // Fetch calendar and analysis-status in PARALLEL for faster loading
      const [calendarRes, statusRes] = await Promise.all([
        fetch(`/api/calendar?from=${from}&to=${to}&type=all`, { signal: abortController.signal }),
        fetch(`/api/calendar/analysis-status?from=${from}&to=${to}`, { signal: abortController.signal }).catch(() => null)
      ]);
      
      // Check if request was aborted (user changed date)
      if (abortController.signal.aborted) return;
      
      const data = await calendarRes.json();

      if (data.success) {
        setEvents(data.events);
        setLastUpdated(new Date());
        setCalendarEmptyMessage(data.events?.length === 0 && data.message ? data.message : null);
        fetchEventAnalyses(data.events);
        
        // Process analysis-status response
        try {
          const status = statusRes ? await statusRes.json().catch(() => null) : null;
          if (status?.success && Array.isArray(status.items)) {
            const byDate: Record<string, string[]> = {};
            for (const it of status.items as Array<{ date: string; name: string }>) {
              const d = String(it?.date || '').slice(0, 10);
              const n = normalizeEventName(String(it?.name || ''));
              if (!d || !n) continue;
              (byDate[d] ||= []).push(n);
            }
            const keys: Record<string, true> = {};
            for (const ev of data.events as CalendarEvent[]) {
              const d = String(ev.date || '').slice(0, 10);
              const n = normalizeEventName(ev.title);
              if (!d || !n) continue;
              const pool = byDate[d];
              if (!pool || pool.length === 0) continue;
              const matched = pool.some((p) => p.includes(n) || n.includes(p));
              if (matched) keys[`${d}|${n}`] = true;
            }
            setAnalyzedKeys(keys);
          } else {
            setAnalyzedKeys({});
          }
        } catch {
          setAnalyzedKeys({});
        }
        // Update cache
        setTerminalCache({
          calendar: { events: data.events, timestamp: Date.now() }
        });
      }
    } catch (error) {
      // Ignore abort errors (expected when user changes date quickly)
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Failed to fetch calendar:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Fetch event analyses from API
  const fetchEventAnalyses = async (_eventList: CalendarEvent[]) => {
    setLoadingAnalyses(true);
    try {
      const hasActualValue = (v: any): boolean => {
        if (v === null || v === undefined) return false;
        if (typeof v === 'number') return !Number.isNaN(v);
        const s = String(v).trim();
        if (!s) return false;
        const lower = s.toLowerCase();
        if (lower === 'n/a' || lower === 'na' || lower === '-' || lower === '—') return false;
        return true;
      };

      const addDays = (dateStr: string, delta: number): string => {
        const d = new Date(`${dateStr}T00:00:00Z`);
        if (Number.isNaN(d.getTime())) return dateStr;
        d.setUTCDate(d.getUTCDate() + delta);
        return d.toISOString().slice(0, 10);
      };

      // Build quick lookup from the main calendar list (this list already has FMP "actual" sometimes)
      // Keyed by date + normalized name. Also keep a fallback list for fuzzy match.
      const calendarIndex = new Map<string, CalendarEvent>();
      for (const ev of _eventList || []) {
        const n = normalizeEventName(ev.title || (ev as any).name || '');
        const d = ev.date;
        if (!n || !d) continue;
        const key = `${d}|${n}`;
        // Prefer entries that have actual
        const prev = calendarIndex.get(key);
        if (!prev || (hasActualValue((ev as any).actual) && !hasActualValue((prev as any).actual))) {
          calendarIndex.set(key, ev);
        }
      }

      const findCalendarMatch = (name: string, date: string): CalendarEvent | null => {
        const n = normalizeEventName(name || '');
        if (!n || !date) return null;
        const direct = calendarIndex.get(`${date}|${n}`);
        if (direct) return direct;
        // Sometimes date shifts by 1 day due to timezone formatting differences
        const prevDay = calendarIndex.get(`${addDays(date, -1)}|${n}`);
        if (prevDay) return prevDay;
        const nextDay = calendarIndex.get(`${addDays(date, 1)}|${n}`);
        if (nextDay) return nextDay;
        // Fuzzy: look for same normalized name contains
        for (const [k, v] of calendarIndex.entries()) {
          if (!k.startsWith(`${date}|`)) continue;
          const kn = k.split('|')[1] || '';
          if (kn.includes(n) || n.includes(kn)) return v;
        }
        return null;
      };

      // Calculate date range for API call (current week)
      const dateToUse = selectedDateRef.current;
      const weekStart = new Date(dateToUse);
      weekStart.setDate(dateToUse.getDate() - dateToUse.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const from = weekStart.toISOString().slice(0, 10);
      const to = weekEnd.toISOString().slice(0, 10);
      
      // Try to fetch real analyses from API
      const response = await fetch(`/api/calendar/event-analyses?from=${from}&to=${to}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const { preEvent, liveEvent } = result.data;
        
        // Check if we have real data
        const hasRealData = preEvent.length > 0 || liveEvent.length > 0;
        
        if (hasRealData) {
          // Enrich live cards with actual values from the main calendar list
          // This fixes the case: event list shows actual, but analysis cards still show LIVE (hasActual=false).
          const enrichedLive = (liveEvent || []).map((item: any) => {
            const eventName = item?.event?.name || item?.event?.title || '';
            const eventDate = item?.event?.date || '';
            const match = findCalendarMatch(eventName, eventDate);
            const matchHasActual = hasActualValue((match as any)?.actual);

            // If calendar already has actual but analysis card doesn't, promote it
            if (match && matchHasActual && !item?.hasActual) {
              return {
                ...item,
                hasActual: true,
                event: {
                  ...item.event,
                  actual: (match as any).actual,
                  forecast: (match as any).forecast ?? item.event?.forecast,
                  previous: (match as any).previous ?? item.event?.previous,
                },
              };
            }

            // Also backfill display values (forecast/previous) if missing
            if (match && !hasActualValue(item?.event?.forecast) && hasActualValue((match as any).forecast)) {
              return {
                ...item,
                event: {
                  ...item.event,
                  forecast: (match as any).forecast,
                  previous: (match as any).previous ?? item.event?.previous,
                },
              };
            }

            return item;
          });

          // Use real data from API
          setEventAnalyses({
            preEvent: preEvent,
            liveEvent: enrichedLive
          });
          
          // Update analyzedKeys for badge display
          const keys: Record<string, true> = {};
          
          preEvent.forEach((item: any) => {
            const eventName = item.event?.name || item.event?.title || '';
            const eventDate = item.event?.date || '';
            if (eventName && eventDate) {
              const key = `${eventDate}|${normalizeEventName(eventName)}`;
              keys[key] = true;
            }
          });
          
          enrichedLive.forEach((item: any) => {
            const eventName = item.event?.name || item.event?.title || '';
            const eventDate = item.event?.date || '';
            if (eventName && eventDate) {
              const key = `${eventDate}|${normalizeEventName(eventName)}`;
              keys[key] = true;
            }
          });
          
          setAnalyzedKeys(prev => ({ ...prev, ...keys }));
          return;
        }
      }
      
      // No analyses found - keep empty state
      setEventAnalyses({
        preEvent: [],
        liveEvent: []
      });
      
    } catch (error) {
      console.error('[fetchEventAnalyses] Error:', error);
      
      // On error, keep empty state
      setEventAnalyses({
        preEvent: [],
        liveEvent: []
      });
    } finally {
      setLoadingAnalyses(false);
    }
  };

  // Seçilen gün değişince o haftanın event'lerini API'den çek
  // NOT: setEvents([]) KALDIRILDI - bu gereksiz re-render ve flicker oluşturuyordu
  // Loading state zaten UI'ı bloklayacak, eski eventler gösterilmeyecek
  useEffect(() => {
    fetchCalendar(true, false); // silent=false: loading göster, forceRefresh=true
  }, [selectedDate.toDateString()]);

  // Gerçek zamanlı yenileme: her 60 saniyede arka planda güncelle (liste saklanır, pır pır olmaz)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCalendar(true, true);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedDate.toDateString()]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // LIVE EVENT POLLING — Check FMP for actual data every 30 seconds
  // ═══════════════════════════════════════════════════════════════════════════════
  const checkLiveEventActuals = async () => {
    const hasActualValue = (v: any): boolean => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'number') return !Number.isNaN(v);
      const s = String(v).trim();
      if (!s) return false;
      const lower = s.toLowerCase();
      if (lower === 'n/a' || lower === 'na' || lower === '-' || lower === '—') return false;
      return true;
    };

    const addDays = (dateStr: string, delta: number): string => {
      const d = new Date(`${dateStr}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return dateStr;
      d.setUTCDate(d.getUTCDate() + delta);
      return d.toISOString().slice(0, 10);
    };

    // Build a quick lookup from the already-visible calendar list.
    // If the user can SEE actual in the table, we should promote the live card immediately (no refresh).
    const calendarIndex = new Map<string, CalendarEvent>();
    for (const ev of events || []) {
      const n = normalizeEventName(ev.title || (ev as any).name || '');
      const d = ev.date;
      if (!n || !d) continue;
      const key = `${d}|${n}`;
      const prev = calendarIndex.get(key);
      if (!prev || (hasActualValue((ev as any).actual) && !hasActualValue((prev as any).actual))) {
        calendarIndex.set(key, ev);
      }
    }

    const findCalendarMatch = (name: string, date: string): CalendarEvent | null => {
      const n = normalizeEventName(name || '');
      if (!n || !date) return null;
      const direct = calendarIndex.get(`${date}|${n}`);
      if (direct) return direct;
      const prevDay = calendarIndex.get(`${addDays(date, -1)}|${n}`);
      if (prevDay) return prevDay;
      const nextDay = calendarIndex.get(`${addDays(date, 1)}|${n}`);
      if (nextDay) return nextDay;
      for (const [k, v] of calendarIndex.entries()) {
        if (!k.startsWith(`${date}|`)) continue;
        const kn = k.split('|')[1] || '';
        if (kn.includes(n) || n.includes(kn)) return v;
      }
      return null;
    };

    // Get live events that don't have actual data yet (hasActual: false, minutesAgo <= 90)
    const awaitingEvents = eventAnalyses.liveEvent.filter(
      e => !e.hasActual && (e.minutesAgo ?? 0) <= 90
    );
    
    if (awaitingEvents.length === 0) {
      setLivePollingActive(false);
      return;
    }
    
    setLivePollingActive(true);
    
    try {
      // First: promote from calendar list if actual is already visible there
      const awaitingNeedingApi = awaitingEvents.filter((item) => {
        const match = findCalendarMatch(item?.event?.name || item?.event?.title || '', item?.event?.date || '');
        return !hasActualValue((match as any)?.actual);
      });

      if (awaitingNeedingApi.length !== awaitingEvents.length) {
        setEventAnalyses(prev => ({
          ...prev,
          liveEvent: prev.liveEvent.map(item => {
            if (item.hasActual) return item;
            if ((item.minutesAgo ?? 0) > 90) return item;
            const match = findCalendarMatch(item?.event?.name || item?.event?.title || '', item?.event?.date || '');
            if (match && hasActualValue((match as any).actual)) {
              console.log(`[LivePolling] Promoted from calendar list: ${item.event.name}`, (match as any).actual);
              return {
                ...item,
                hasActual: true,
                event: {
                  ...item.event,
                  actual: (match as any).actual,
                  forecast: (match as any).forecast ?? item.event.forecast,
                  previous: (match as any).previous ?? item.event.previous,
                },
              };
            }
            return item;
          })
        }));
      }

      // If all awaiting events were promoted via calendar, no need to hit live-status API
      if (awaitingNeedingApi.length === 0) {
        setLivePollingActive(false);
        return;
      }

      const eventsToCheck = awaitingNeedingApi.map(item => ({
        id: item.event.id || `${item.event.name}-${item.event.date}`,
        name: item.event.name || item.event.title,
        date: item.event.date,
        time: item.event.time,
        type: item.event.type || 'macro',
        symbol: item.event.symbol,
        forecast: item.event.forecast,
        previous: item.event.previous
      }));
      
      const response = await fetch('/api/calendar/live-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToCheck })
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data.success || !Array.isArray(data.results)) return;
      
      // Update eventAnalyses with new actual data
      const resultsMap = new Map<string, any>(data.results.map((r: any) => [r.eventId, r]));
      
      setEventAnalyses(prev => ({
        ...prev,
        liveEvent: prev.liveEvent.map(item => {
          const eventId = item.event.id || `${item.event.name}-${item.event.date}`;
          const result = resultsMap.get(eventId) as any;
          
          if (result && result.hasActual && !item.hasActual) {
            console.log(`[LivePolling] Actual data received for: ${item.event.name}`, result.actual);
            // Also update the main calendar list so table + cards stay in sync
            setEvents((prevEvents) =>
              (prevEvents || []).map((ev) => {
                const sameDay = String(ev.date || '') === String(item.event.date || '');
                if (!sameDay) return ev;
                const a = normalizeEventName(ev.title || (ev as any).name || '');
                const b = normalizeEventName(item.event.name || item.event.title || '');
                if (!a || !b) return ev;
                const nameMatch = a.includes(b) || b.includes(a);
                if (!nameMatch) return ev;
                return {
                  ...ev,
                  actual: result.actual,
                  forecast: result.forecast ?? (ev as any).forecast,
                  previous: result.previous ?? (ev as any).previous,
                } as any;
              })
            );
            return {
              ...item,
              hasActual: true,
              event: {
                ...item.event,
                actual: result.actual,
                forecast: result.forecast ?? item.event.forecast,
                previous: result.previous ?? item.event.previous
              }
            };
          }
          return item;
        })
      }));
      
    } catch (error) {
      console.error('[LivePolling] Error checking live events:', error);
    }
  };
  
  // Stable values for live polling dependency (avoid re-creating arrays each render)
  const liveEventCount = eventAnalyses.liveEvent.length;
  const liveEventWithActualCount = useMemo(
    () => eventAnalyses.liveEvent.filter(e => e.hasActual).length,
    [eventAnalyses.liveEvent]
  );
  
  // Poll for live event actuals every 30 seconds when there are awaiting events
  useEffect(() => {
    // Check if there are any live events awaiting data
    const hasAwaitingEvents = eventAnalyses.liveEvent.some(
      e => !e.hasActual && (e.minutesAgo ?? 0) <= 90
    );
    
    if (!hasAwaitingEvents) {
      setLivePollingActive(false);
      return;
    }
    
    // Initial check
    checkLiveEventActuals();
    
    // Poll every 30 seconds
    const interval = setInterval(checkLiveEventActuals, 30 * 1000);
    
    return () => clearInterval(interval);
  }, [liveEventCount, liveEventWithActualCount]);

  // Helper: Get event start time (FMP API = UTC)
  const getEventStartTime = (event: CalendarEvent): Date => {
    if (event.type === 'crypto' || event.type === 'earnings' || event.type === 'ipo') {
      return new Date(`${event.date}T00:00:00Z`);
    }
    if (event.time && event.time.includes('T')) {
      return new Date(event.time);
    }
    if (event.time && event.time.match(/^\d{1,2}:\d{2}/)) {
      const timeParts = event.time.match(/^(\d{1,2}):(\d{2})/);
      if (timeParts) {
        const formattedTime = `${timeParts[1].padStart(2, '0')}:${timeParts[2]}`;
        return new Date(`${event.date}T${formattedTime}:00Z`);
      }
    }
    return new Date(`${event.date}T12:00:00Z`);
  };

  // Kartı yayından sonra 1 saat açık tut, sonra kapat (tüm türler için)
  const getEventEndTime = (event: CalendarEvent): Date => {
    const startTime = getEventStartTime(event);
    const oneHourMs = 60 * 60 * 1000;
    return new Date(startTime.getTime() + oneHourMs);
  };

  // Helper: Check if event is currently ongoing (yayından sonra 1 saat içinde)
  const isEventOngoing = (event: CalendarEvent): boolean => {
    const now = new Date();
    const startTime = getEventStartTime(event);
    const endTime = getEventEndTime(event);
    return now >= startTime && now < endTime;
  };

  // Past event: yayın penceresi bittiyse (start + 1 saat) geçmiş say
  const isEventPast = (event: CalendarEvent): boolean => {
    const now = new Date();
    return now >= getEventEndTime(event);
  };

  // Show all events for the selected range (past + future) so fallback/DB events are visible
  const activeEvents = useMemo(() => events, [events]);

  // Filter by importance and country
  const filteredEvents = activeEvents.filter(event => {
    if (filter === 'high' && event.importance !== 'high') return false;
    if (filter === 'medium' && event.importance === 'low') return false;
    if (countryFilter !== 'all' && event.country !== countryFilter) return false;
    return true;
  });

  const selectedDateStr = toLocalDateString(selectedDate);
  // Calendar list: sadece seçilen GÜNÜN eventleri (local gün eşleşmesiyle)
  const selectedDayEvents = filteredEvents.filter(e => getEventLocalDateString(e) === selectedDateStr);
  const groupedEvents = groupEventsByDate(selectedDayEvents, true);
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const countries: string[] = [...new Set(events.map(e => e.country).filter((c): c is string => Boolean(c)))];

  const goToDay = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const formatDateLabel = () => selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Mobile: Use separate component
  if (isMobile === null) {
    // Still detecting viewport - show loading spinner
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0A0A0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(0,245,255,0.2)',
          borderTopColor: '#00F5FF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  if (isMobile) {
    return (
      <MobileResponsiveCalendar
        events={events}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        filter={filter}
        setFilter={setFilter}
        countryFilter={countryFilter}
        setCountryFilter={setCountryFilter}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        calendarEmptyMessage={calendarEmptyMessage}
        eventAnalyses={eventAnalyses}
        loadingAnalyses={loadingAnalyses}
        analyzedKeys={analyzedKeys}
        chartPopupOpen={chartPopupOpen}
        setChartPopupOpen={setChartPopupOpen}
        chartPopupSymbol={chartPopupSymbol}
        setChartPopupSymbol={setChartPopupSymbol}
        fetchCalendar={fetchCalendar}
        openEventModal={openEventModal}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#000' }}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PAGE BANNER — News page tarzı */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,15,15,0.95) 0%, rgba(20,20,22,0.98) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '1.25rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <h1 style={{
          color: '#fff',
          fontSize: '1.25rem',
          fontWeight: 700,
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          Stay Ahead of the Market!
        </h1>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER — Day Navigation */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header style={{
        flexShrink: 0,
        background: '#000',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '1rem 1.5rem',
        zIndex: 10
      }}>

        {/* Day Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => goToDay(-1)} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '0.6rem 1.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#fff',
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}>
            <ChevronLeft size={20} />
            Previous
          </button>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {formatDateLabel()}
              {isLoading && (
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.35rem',
                  color: '#00F5FF', 
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  padding: '2px 8px',
                  background: 'rgba(0,245,255,0.1)',
                  borderRadius: '4px'
                }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    border: '2px solid #00F5FF', 
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite' 
                  }} />
                  Loading...
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.35rem' }}>
              {isToday ? (
                <span style={{ 
                  background: 'linear-gradient(135deg, rgba(0,245,255,0.25), rgba(139,92,246,0.25))', 
                  color: '#00F5FF', 
                  fontSize: '0.75rem', 
                  padding: '0.2rem 0.75rem', 
                  borderRadius: '6px', 
                  fontWeight: 700, 
                  border: '1px solid rgba(0,245,255,0.4)',
                  letterSpacing: '1px'
                }}>
                  TODAY
                </span>
              ) : (
                <button onClick={() => setSelectedDate(new Date())} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#00F5FF',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}>
                  Go to Today
                </button>
              )}
            </div>
          </div>
          
          <button onClick={() => goToDay(1)} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '0.6rem 1.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#fff',
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}>
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* İKİ SÜTUN: Sol event listesi, Sağ analiz kartları */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* LEFT COLUMN — Event list */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', paddingBottom: '5rem' }}>
      {/* Sticky top area (layout-like): Filters + Table header stay visible while scrolling */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: '#000',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
      }}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FILTERS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '0.75rem 1.25rem',
        background: 'linear-gradient(180deg, rgba(10,10,15,0.78) 0%, rgba(10,10,15,0.62) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          padding: '0.25rem',
          borderRadius: '14px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {(['all', 'high', 'medium'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                height: 38,
                padding: '0 0.9rem',
                borderRadius: '12px',
                border: '1px solid transparent',
                background: filter === f
                  ? 'linear-gradient(135deg, rgba(0,245,255,0.20), rgba(139,92,246,0.18))'
                  : 'transparent',
                color: filter === f ? '#EFFFFF' : 'rgba(255,255,255,0.7)',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                if (filter !== f) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                if (filter !== f) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: f === 'high' ? '#EF4444' : f === 'medium' ? '#F59E0B' : 'rgba(255,255,255,0.35)',
                boxShadow: f === 'high'
                  ? '0 0 10px rgba(239,68,68,0.35)'
                  : f === 'medium'
                    ? '0 0 10px rgba(245,158,11,0.28)'
                    : 'none',
              }} />
              {f === 'all' ? 'All' : f === 'high' ? 'High' : 'Med+'}
            </button>
          ))}
        </div>

        <div ref={countryMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setCountryMenuOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setCountryMenuOpen((v) => !v);
              }
              if (e.key === 'ArrowDown') setCountryMenuOpen(true);
            }}
            style={{
              height: 38,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '14px',
              padding: '0 0.85rem',
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              minWidth: 170,
              justifyContent: 'space-between',
            }}
            aria-haspopup="listbox"
            aria-expanded={countryMenuOpen}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              {countryFilter === 'all' ? (
                <span style={{ fontSize: 14, lineHeight: 1 }}>🌍</span>
              ) : (
                <FlagImg country={countryFilter} size={18} />
              )}
              <span style={{ textTransform: 'uppercase' }}>{countryFilter === 'all' ? 'All Countries' : countryFilter}</span>
            </span>
            <ChevronDown size={16} color="rgba(255,255,255,0.6)" />
          </button>

          {countryMenuOpen && (
            <div
              role="listbox"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                zIndex: 50,
                width: 'min(260px, 70vw)',
                background: '#0A0A0F',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
                padding: '0.35rem',
                maxHeight: 320,
                overflowY: 'auto',
              }}
            >
              <button
                type="button"
                onClick={() => { setCountryFilter('all'); setCountryMenuOpen(false); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: countryFilter === 'all' ? 'rgba(0,245,255,0.12)' : 'transparent',
                  color: '#fff',
                  padding: '0.55rem 0.6rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>🌍</span>
                <span>All Countries</span>
              </button>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0.35rem 0' }} />

              {countries.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCountryFilter(c); setCountryMenuOpen(false); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: countryFilter === c ? 'rgba(0,245,255,0.12)' : 'transparent',
                    color: '#fff',
                    padding: '0.55rem 0.6rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <FlagImg country={c} size={18} />
                  <span>{c}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
            {(() => {
              const offsetMin = new Date().getTimezoneOffset();
              const hours = -offsetMin / 60;
              const gmt = hours === 0 ? 'GMT+0' : hours > 0 ? `GMT+${hours}` : `GMT${hours}`;
              return <>{gmt} · Local timezone</>;
            })()}
          </span>
          <span>
            {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''} for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TABLE HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '55px 50px 45px 1fr 85px 85px 85px',
        gap: '0.5rem',
        padding: '0.85rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600 }}></div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Impact</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actual</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Forecast</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Previous</div>
      </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EVENTS LIST */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '0 0 2rem 0' }}>
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 32px 70px 1fr 70px 70px 70px',
                  gap: '0.75rem',
                  alignItems: 'center',
                  padding: '0.85rem 1.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              >
                <div style={{ width: '45px', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                <div style={{ width: '24px', height: '16px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
                <div style={{ width: '50px', height: '20px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
                <div style={{ width: '80%', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
                <div style={{ width: '40px', height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginLeft: 'auto' }} />
                <div style={{ width: '40px', height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginLeft: 'auto' }} />
                <div style={{ width: '40px', height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginLeft: 'auto' }} />
              </div>
            ))}
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </>
        ) : sortedDates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
            <Clock size={56} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '1rem' }}>No events found for this period</p>
            {calendarEmptyMessage && (
              <p style={{ fontSize: '0.85rem', marginTop: '0.75rem', color: 'rgba(245,158,11,0.9)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                {calendarEmptyMessage}
              </p>
            )}
          </div>
        ) : (
          sortedDates.map(dateKey => {
            const dateHeader = formatDateHeader(dateKey);
            const dayEvents = groupedEvents[dateKey];
            
            return (
              <div key={dateKey}>
                <div style={{
                  padding: '0.85rem 1.5rem',
                  background: dateHeader.isToday ? 'rgba(0,245,255,0.08)' : 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: dateHeader.isToday ? '4px solid #00F5FF' : '4px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}>
                  <span style={{ color: dateHeader.isToday ? '#00F5FF' : '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                    {dateHeader.day}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{dateHeader.date}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {dayEvents.map((event) => (
                  (() => {
                    const key = `${event.date}|${normalizeEventName(event.title)}`;
                    // Sadece HIGH impact eventler analiz ediliyor - medium/low için badge gösterme
                    const analyzed = !!analyzedKeys[key] && isEventPast(event) && event.importance === 'high';
                    const clickable = analyzed;
                    return (
                  <div key={event.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '55px 50px 45px 1fr 85px 85px 85px',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    cursor: clickable ? 'pointer' : 'default',
                    opacity: clickable ? 1 : 0.92,
                  }}
                  onClick={clickable ? () => openEventModal(event) : undefined}
                  onMouseEnter={clickable ? (e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } : undefined}
                  onMouseLeave={clickable ? (e) => { e.currentTarget.style.background = 'transparent'; } : undefined}
                  >
                    <div style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                      minWidth: 0
                    }}>
                      <span style={{ flexShrink: 0 }}>{formatEventLocalTime(event.date, event.time)}</span>
                      {event.type === 'crypto' && (
                        <span style={{ flexShrink: 0, background: 'rgba(247, 147, 26, 0.12)', color: 'rgba(247, 147, 26, 0.7)', padding: '0.06rem 0.3rem', borderRadius: '3px', fontSize: '0.5rem', fontWeight: 600, fontFamily: 'system-ui', letterSpacing: '0.3px', border: '1px solid rgba(247, 147, 26, 0.2)' }}>
                          CRYPTO
                        </span>
                      )}
                      {event.type === 'earnings' && (
                        <span style={{ flexShrink: 0, background: 'rgba(34, 197, 94, 0.12)', color: 'rgba(34, 197, 94, 0.9)', padding: '0.06rem 0.3rem', borderRadius: '3px', fontSize: '0.5rem', fontWeight: 600, fontFamily: 'system-ui', letterSpacing: '0.3px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                          EARN
                        </span>
                      )}
                      {event.type === 'ipo' && (
                        <span style={{ flexShrink: 0, background: 'rgba(139, 92, 246, 0.12)', color: 'rgba(139, 92, 246, 0.9)', padding: '0.06rem 0.3rem', borderRadius: '3px', fontSize: '0.5rem', fontWeight: 600, fontFamily: 'system-ui', letterSpacing: '0.3px', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                          IPO
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', minWidth: 0 }} title={event.country}>
                      <FlagImg country={event.country} size={18} />
                      {event.country && (
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>
                          {event.country}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}><ImpactIndicator importance={event.importance} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        color: event.importance === 'high' ? '#fff' : 'rgba(255,255,255,0.85)',
                        fontSize: '0.9rem',
                        fontWeight: event.importance === 'high' ? 600 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        minWidth: 0
                      }}>
                        <span style={{ minWidth: 0, wordBreak: 'break-word' }}>{event.title}</span>
                        {isEventOngoing(event) && (
                          <span style={{
                            flexShrink: 0,
                            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                            color: '#fff',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            fontFamily: 'system-ui',
                            letterSpacing: '0.5px',
                            animation: 'pulse 1.5s infinite',
                            boxShadow: '0 0 8px rgba(239,68,68,0.5)'
                          }}>
                            LIVE
                          </span>
                        )}
                        {!isEventOngoing(event) && isEventPast(event) && (
                          <span style={{
                            flexShrink: 0,
                            background: 'rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.8)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            fontFamily: 'system-ui',
                            letterSpacing: '0.5px',
                          }}>
                            PAST
                          </span>
                        )}
                        {analyzed && (
                          <span style={{
                            flexShrink: 0,
                            color: 'rgba(0,245,255,0.95)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                          }}>
                            Agent Analyzed
                          </span>
                        )}
                        {/* Agent Ready: Sadece HIGH impact ve henüz yaşanmamış eventler */}
                        {event.importance === 'high' && !isEventPast(event) && !analyzed && (
                          <span style={{
                            flexShrink: 0,
                            color: 'rgba(0,245,255,0.85)',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            letterSpacing: '0.02em'
                          }}>
                            Agent Ready
                          </span>
                        )}
                        {/* BEAT/MISS/INLINE Badge */}
                        {(() => {
                          if (!event.actual || !event.forecast) return null;
                          const actual = parseFloat(String(event.actual).replace(/[^0-9.-]/g, ''));
                          const forecast = parseFloat(String(event.forecast).replace(/[^0-9.-]/g, ''));
                          if (isNaN(actual) || isNaN(forecast)) return null;
                          
                          let badge: 'BEAT' | 'MISS' | 'INLINE' = 'INLINE';
                          let bgColor = 'rgba(107,114,128,0.2)';
                          let textColor = '#9CA3AF';
                          
                          if (actual > forecast * 1.005) {
                            badge = 'BEAT';
                            bgColor = 'rgba(34,197,94,0.2)';
                            textColor = '#22C55E';
                          } else if (actual < forecast * 0.995) {
                            badge = 'MISS';
                            bgColor = 'rgba(239,68,68,0.2)';
                            textColor = '#EF4444';
                          }
                          
                          return (
                            <span style={{
                              flexShrink: 0,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: bgColor,
                              color: textColor,
                              letterSpacing: '0.5px',
                              animation: badge !== 'INLINE' ? 'pulse 2s infinite' : undefined
                            }}>
                              {badge}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    {(() => {
                      const { col1, col2, col3 } = getEventDisplayValues(event);
                      const numeric = isNumericComparison(event);
                      const a = numeric && event.actual ? parseFloat(String(event.actual).replace(/[%,$K\s]/g, '')) : NaN;
                      const f = numeric && event.forecast ? parseFloat(String(event.forecast).replace(/[%,$K\s]/g, '')) : NaN;
                      const firstCellColor = numeric && !Number.isNaN(a) && !Number.isNaN(f)
                        ? (a > f ? '#22C55E' : a < f ? '#EF4444' : '#fff')
                        : (event.actual ? '#fff' : 'rgba(255,255,255,0.25)');
                      return (
                        <>
                          <div style={{
                            textAlign: 'right',
                            color: firstCellColor,
                            fontSize: '0.9rem',
                            fontWeight: col1 !== '—' ? 700 : 400,
                            fontFamily: 'monospace'
                          }}>
                            {col1}
                          </div>
                          <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                            {col2}
                          </div>
                          <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                            {col3}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                    );
                  })()
                ))}
              </div>
            );
          })
        )}
      </div>

      </div>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* RIGHT COLUMN — Analiz kartları */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        width: '48%',
        minWidth: 320,
        overflow: 'auto',
        paddingBottom: '5rem',
        paddingTop: '1rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)'
      }}>
        {/* 1. POST EVENT - Actual veri gelmiş VEYA 90dk+ geçmiş (DRAW) eventler */}
        {(() => {
          // Post-event cards should persist UNTIL end of the user's LOCAL day.
          // Otherwise UTC boundaries make cards disappear early/late depending on timezone.
          const todayLocal = toLocalDateString(new Date());
          const getLocalDayForLiveItem = (evt: any): string => {
            try {
              // evt.time can be full ISO (from DB) or "HH:mm"
              if (evt?.time && typeof evt.time === 'string' && evt.time.includes('T')) {
                const d = new Date(evt.time);
                if (!Number.isNaN(d.getTime())) return toLocalDateString(d);
              }
              const date = String(evt?.date || '').slice(0, 10);
              const time = String(evt?.time || '00:00').trim();
              if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                const hhmm = time.match(/^(\d{1,2}):(\d{2})/) ? time.match(/^(\d{1,2}):(\d{2})/) : null;
                const t = hhmm ? `${hhmm[1].padStart(2, '0')}:${hhmm[2]}:00` : '00:00:00';
                const d = new Date(`${date}T${t}Z`);
                if (!Number.isNaN(d.getTime())) return toLocalDateString(d);
              }
            } catch {
              // ignore
            }
            // fallback: treat as today to avoid hiding by mistake
            return todayLocal;
          };

          // hasActual: true OR (hasActual: false AND minutesAgo > 90) → POST EVENT
          // ...but only keep for the same LOCAL day as "today"
          const justReleasedEvents = eventAnalyses.liveEvent.filter(e => {
            const isPostBucket = e.hasActual || (!e.hasActual && (e.minutesAgo ?? 0) > 90);
            if (!isPostBucket) return false;
            const localDay = getLocalDayForLiveItem(e.event);
            return localDay === todayLocal;
          });
          const count = justReleasedEvents.length;
          return (
            <div style={{ marginBottom: '1.5rem' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  marginBottom: collapsedSections.postEvent ? '0' : '1rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  transition: 'background 0.2s'
                }}
                onClick={() => toggleSection('postEvent')}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Flame size={20} color="#EF4444" style={{ animation: count > 0 ? 'pulse 1s infinite' : 'none' }} />
                <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                  POST EVENT
                </span>
                <span style={{ 
                  background: count > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(107,114,128,0.2)', 
                  color: count > 0 ? '#EF4444' : '#6B7280', 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '10px',
                  minWidth: '24px',
                  textAlign: 'center'
                }}>
                  {count}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(239,68,68,0.3) 0%, transparent 100%)' }} />
                <ChevronDown 
                  size={18} 
                  color="rgba(255,255,255,0.5)" 
                  style={{ 
                    transform: collapsedSections.postEvent ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} 
                />
              </div>
              {!collapsedSections.postEvent && (
                count === 0 ? (
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                      No post-event analyses available at the moment
                    </span>
                  </div>
                ) : (
                  justReleasedEvents.map((item, index) => {
                    const isOverdue = !item.hasActual && (item.minutesAgo ?? 0) > 90;
                    return (
                      <LiveEventHero
                        key={`released-${index}`}
                        event={item.event}
                        analysis={item.analysis}
                        minutesAgo={item.minutesAgo ?? 0}
                        minutesUntilRelease={0}
                        hasActual={item.hasActual ?? false}
                        isOverdue={isOverdue}
                        isPremium={isPremium}
                        onAssetClick={(symbol) => {
                          setChartPopupSymbol(symbol);
                          setChartPopupOpen(true);
                        }}
                      />
                    );
                  })
                )
              )}
            </div>
          );
        })()}

        {/* 2. LIVE - Event saati gelmiş, veri yok, 90dk içinde */}
        {(() => {
          // hasActual: false AND minutesAgo <= 90 → LIVE
          const awaitingEvents = eventAnalyses.liveEvent.filter(e => !e.hasActual && (e.minutesAgo ?? 0) <= 90);
          const count = awaitingEvents.length;
          return (
            <div style={{ marginBottom: '1.5rem' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  marginBottom: collapsedSections.liveAwaiting ? '0' : '1rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  transition: 'background 0.2s'
                }}
                onClick={() => toggleSection('liveAwaiting')}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Clock size={20} color="#F59E0B" style={{ animation: count > 0 ? 'pulse 1.5s infinite' : 'none' }} />
                <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                  LIVE
                </span>
                <span style={{ 
                  background: count > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(107,114,128,0.2)', 
                  color: count > 0 ? '#F59E0B' : '#6B7280', 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '10px',
                  minWidth: '24px',
                  textAlign: 'center'
                }}>
                  {count}
                </span>
                {count > 0 && livePollingActive && (
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.35rem',
                    background: 'rgba(245,158,11,0.15)', 
                    color: '#F59E0B', 
                    fontSize: '0.6rem', 
                    fontWeight: 600, 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '6px', 
                    letterSpacing: '0.5px' 
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#F59E0B',
                      animation: 'pulse 1s infinite'
                    }} />
                    POLLING FMP
                  </span>
                )}
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(245,158,11,0.3) 0%, transparent 100%)' }} />
                <ChevronDown 
                  size={18} 
                  color="rgba(255,255,255,0.5)" 
                  style={{ 
                    transform: collapsedSections.liveAwaiting ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} 
                />
              </div>
              {!collapsedSections.liveAwaiting && (
                count === 0 ? (
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                      No live events at the moment
                    </span>
                  </div>
                ) : (
                  awaitingEvents.map((item, index) => (
                    <LiveEventHero
                      key={`awaiting-${index}`}
                      event={item.event}
                      analysis={item.analysis}
                      minutesAgo={item.minutesAgo ?? 0}
                      minutesUntilRelease={item.minutesUntilRelease ?? 0}
                      hasActual={false}
                      isOverdue={false}
                      isPremium={isPremium}
                      onAssetClick={(symbol) => {
                        setChartPopupSymbol(symbol);
                        setChartPopupOpen(true);
                      }}
                    />
                  ))
                )
              )}
            </div>
          );
        })()}
        {/* 3. UPCOMING - Pre-event analizleri */}
        {(() => {
          const count = eventAnalyses.preEvent.length;
          return (
            <div style={{ marginBottom: '1.5rem' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  marginBottom: collapsedSections.upcoming ? '0' : '1rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  transition: 'background 0.2s'
                }}
                onClick={() => toggleSection('upcoming')}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Eye size={20} color="#00F5FF" />
                <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                  UPCOMING
                </span>
                <span style={{ 
                  background: count > 0 ? 'rgba(0,245,255,0.2)' : 'rgba(107,114,128,0.2)', 
                  color: count > 0 ? '#00F5FF' : '#6B7280', 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '10px',
                  minWidth: '24px',
                  textAlign: 'center'
                }}>
                  {count}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(0,245,255,0.3) 0%, transparent 100%)' }} />
                <ChevronDown 
                  size={18} 
                  color="rgba(255,255,255,0.5)" 
                  style={{ 
                    transform: collapsedSections.upcoming ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }} 
                />
              </div>
              {!collapsedSections.upcoming && (
                count === 0 ? (
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                      Analyses will be published 2 hours before high-impact events
                    </span>
                  </div>
                ) : (
                  eventAnalyses.preEvent.map((item, index) => (
                    <UpcomingEventCard 
                      key={`upcoming-${index}`}
                      event={item.event}
                      analysis={item.analysis}
                      hoursUntil={item.hoursUntil}
                      isPremium={isPremium}
                      onAssetClick={(symbol) => {
                        setChartPopupSymbol(symbol);
                        setChartPopupOpen(true);
                      }}
                    />
                  ))
                )
              )}
            </div>
          );
        })()}
        {loadingAnalyses && eventAnalyses.preEvent.length === 0 && eventAnalyses.liveEvent.length === 0 && (
          <div>
            <EventAnalysisSkeleton />
            <EventAnalysisSkeleton />
          </div>
        )}
      </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EVENT ANALYSIS POPUP (geçmiş event tıklanınca DB'den pre + post) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(eventModalData !== null || loadingEventModal) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEventModalData(null);
              setLoadingEventModal(false);
            }
          }}
        >
          <div
            style={{
              background: '#0A0A0F',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {loadingEventModal ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                <p>Loading event analysis...</p>
              </div>
            ) : eventModalData && (
              <>
                <div style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(10,10,15,0.95)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem', display: 'inline-flex', alignItems: 'center' }}>
                        <FlagImg country={eventModalData.event.country} size={26} />
                      </span>
                      <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                        {eventModalData.event.title}
                      </h2>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                      {formatEventLocalTime(eventModalData.event.date, eventModalData.event.time)}
                    </div>
                    {eventModalData.apiEvent && (
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ color: eventModalData.apiEvent.actual != null ? '#22C55E' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                          Actual: {eventModalData.apiEvent.actual ?? '—'}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Forecast: {eventModalData.apiEvent.forecast ?? '—'}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Previous: {eventModalData.apiEvent.previous ?? '—'}</span>
                        {eventModalData.apiEvent.surprise_direction && (
                          <span style={{
                            background: 'rgba(0,245,255,0.15)',
                            color: '#00F5FF',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}>
                            {eventModalData.apiEvent.surprise_direction}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEventModalData(null); setLoadingEventModal(false); }}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Close"
                  >
                    <XCircle size={22} />
                  </button>
                </div>

                <div style={{ padding: '1rem' }}>
                  {!eventModalData.preAnalysis && !eventModalData.postAnalysis ? (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', textAlign: 'center', padding: '2rem' }}>
                      No analysis stored for this event. Pre-event and post-event analyses are saved to the database when AI analysis runs.
                    </p>
                  ) : (
                    <>
                      {/* ════════════════════════════════════════════════════════════════ */}
                      {/* POST-EVENT CARD - Using LiveEventHero style */}
                      {/* ════════════════════════════════════════════════════════════════ */}
                      {eventModalData.apiEvent?.actual != null && eventModalData.preAnalysis && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
                            <span style={{ color: '#22C55E', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Post-Event Result
                            </span>
                          </div>
                          <LiveEventHero
                            event={{
                              ...eventModalData.event,
                              name: eventModalData.event.title,
                              actual: eventModalData.apiEvent.actual,
                              forecast: eventModalData.apiEvent.forecast,
                              previous: eventModalData.apiEvent.previous
                            }}
                            analysis={{
                              ...((eventModalData.preAnalysis as any).raw_analysis || eventModalData.preAnalysis),
                              surprise_assessment: eventModalData.apiEvent.surprise_direction?.toLowerCase().includes('beat') ? 'above' :
                                                   eventModalData.apiEvent.surprise_direction?.toLowerCase().includes('miss') ? 'below' : 'in_line',
                              headline: (eventModalData.postAnalysis as any)?.summary || (eventModalData.preAnalysis as any)?.summary
                            }}
                            minutesAgo={Math.floor((Date.now() - new Date(eventModalData.event.date + 'T' + (eventModalData.event.time || '00:00')).getTime()) / 60000)}
                            hasActual={true}
                            isOverdue={false}
                            isPremium={isPremium}
                            onAssetClick={(symbol) => {
                              setChartPopupSymbol(symbol);
                              setChartPopupOpen(true);
                            }}
                          />
                        </div>
                      )}

                      {/* ════════════════════════════════════════════════════════════════ */}
                      {/* PRE-EVENT CARD - Using UpcomingEventCard style */}
                      {/* ════════════════════════════════════════════════════════════════ */}
                      {eventModalData.preAnalysis && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
                            <Brain size={16} color="#00F5FF" />
                            <span style={{ color: '#00F5FF', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Pre-Event Analysis
                            </span>
                          </div>
                          <UpcomingEventCard
                            event={{
                              ...eventModalData.event,
                              name: eventModalData.event.title,
                              forecast: eventModalData.apiEvent?.forecast,
                              previous: eventModalData.apiEvent?.previous
                            }}
                            analysis={(eventModalData.preAnalysis as any).raw_analysis || eventModalData.preAnalysis}
                            hoursUntil={0}
                            isPremium={isPremium}
                            onAssetClick={(symbol) => {
                              setChartPopupSymbol(symbol);
                              setChartPopupOpen(true);
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LEGEND */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'fixed',
        bottom: '1.25rem',
        right: '1.25rem',
        background: 'rgba(0,0,0,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        gap: '1.25rem',
        fontSize: '0.75rem',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImpactIndicator importance="high" />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>High</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImpactIndicator importance="medium" />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Medium</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ImpactIndicator importance="low" />
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Low</span>
        </div>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'rgba(0,245,255,0.9)', fontWeight: 600, fontSize: '0.85rem' }}>Agent Ready</span>
        </div>
      </div>

      {/* TradingView Chart Popup (desktop) */}
      {chartPopupOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="TradingView chart"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setChartPopupOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              height: '80vh',
              maxHeight: '600px',
              background: '#0D1117',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.3)',
              flexShrink: 0,
            }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                {chartPopupSymbol}
              </span>
              <button
                type="button"
                onClick={() => setChartPopupOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                }}
                aria-label="Close chart"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <iframe
                title={`TradingView Chart ${chartPopupSymbol}`}
                src={`https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(chartPopupSymbol)}&interval=1&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=true&hide_side_toolbar=false&allow_symbol_change=true&save_image=true&hideideas=true`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
