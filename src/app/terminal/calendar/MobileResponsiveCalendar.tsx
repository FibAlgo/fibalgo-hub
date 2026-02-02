'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Flame,
  ChevronDown,
  ChevronUp,
  Brain,
  X,
  Loader2,
  Calendar as CalendarIcon,
  Eye,
  Lock
} from 'lucide-react';
import { useTerminal } from '@/lib/context/TerminalContext';
import { SharedLiveEventCard, SharedUpcomingEventCard, FlagImg as SharedFlagImg } from '@/components/calendar/SharedEventCards';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

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

interface EventAnalyses {
  preEvent: Array<{ event: any; analysis: any; hoursUntil: number }>;
  liveEvent: Array<{ event: any; analysis: any; minutesAgo?: number; minutesUntilRelease?: number; hasActual?: boolean }>;
  isDemo?: boolean;
}

interface MobileResponsiveCalendarProps {
  events: CalendarEvent[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  filter: 'all' | 'high' | 'medium';
  setFilter: (filter: 'all' | 'high' | 'medium') => void;
  countryFilter: string;
  setCountryFilter: (country: string) => void;
  isLoading: boolean;
  lastUpdated: Date | null;
  calendarEmptyMessage: string | null;
  eventAnalyses: EventAnalyses;
  loadingAnalyses: boolean;
  analyzedKeys: Record<string, true>;
  chartPopupOpen: boolean;
  setChartPopupOpen: (open: boolean) => void;
  chartPopupSymbol: string;
  setChartPopupSymbol: (symbol: string) => void;
  fetchCalendar: (forceRefresh?: boolean, silent?: boolean) => void;
  openEventModal: (event: CalendarEvent) => void;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

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

/** Event'in başlangıç zamanı */
const getEventStartTime = (event: { date: string; time?: string }): Date => {
  const ms = eventUtcTime(event.date, event.time);
  return ms ? new Date(ms) : new Date(event.date);
};

/** Event'in bitiş zamanı (başlangıçtan 1 saat sonra) */
const getEventEndTime = (event: { date: string; time?: string }): Date => {
  const startTime = getEventStartTime(event);
  return new Date(startTime.getTime() + 60 * 60 * 1000);
};

/** Event şu an canlı mı? (yayından sonra 1 saat içinde) */
const isEventOngoing = (event: { date: string; time?: string }): boolean => {
  const now = new Date();
  const startTime = getEventStartTime(event);
  const endTime = getEventEndTime(event);
  return now >= startTime && now < endTime;
};

/** Event geçmiş mi? */
const isEventPast = (event: { date: string; time?: string; actual?: string }): boolean => {
  const now = new Date();
  const endTime = getEventEndTime(event);
  return now >= endTime || (event.actual != null && event.actual !== '');
};

// Flag image component (same as desktop)
const FlagImg = ({ country, size = 20 }: { country?: string; size?: number }) => {
  if (!country) {
    return <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>🌍</span>;
  }
  let code = String(country).trim().toLowerCase();
  if (code === 'uk') code = 'gb';
  if (code === 'eu' || code === 'eurozone') code = 'eu';
  if (code.length !== 2) {
    return <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>🌍</span>;
  }
  const src = size >= 28 ? `https://flagcdn.com/48x36/${code}.png` : `https://flagcdn.com/32x24/${code}.png`;
  const w = Math.max(16, Math.round(size));
  const h = Math.max(12, Math.round(w * 0.75));
  return (
    <img
      src={src}
      width={w}
      height={h}
      alt={code.toUpperCase()}
      style={{
        objectFit: 'cover',
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        flexShrink: 0,
      }}
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

const normalizeEventName = (name: string): string => {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// FMP Economic Calendar UTC timezone kullanıyor (resmi dokümantasyon)
// UTC saatini kullanıcının local timezone'una çevir
const formatUtcTimeToLocal = (date?: string, time?: string): string => {
  if (!time || !date) return '';
  
  try {
    // FMP verileri UTC - 'Z' suffix ile parse et
    const utcDateStr = `${date}T${time}:00Z`;
    const utcDate = new Date(utcDateStr);
    
    if (isNaN(utcDate.getTime())) return time;
    
    // Local timezone'da saat ve dakika al
    const localHours = utcDate.getHours();
    const localMinutes = utcDate.getMinutes();
    
    // 12 saat formatına çevir
    const suffix = localHours >= 12 ? 'PM' : 'AM';
    const hour = localHours % 12 || 12;
    
    return `${hour}:${String(localMinutes).padStart(2, '0')} ${suffix}`;
  } catch {
    return time;
  }
};

// ═══════════════════════════════════════════════════════════════════
// MOBILE IMPACT INDICATOR
// ═══════════════════════════════════════════════════════════════════

const MobileImpactIndicator = ({ importance }: { importance: Importance }) => {
  const config = {
    high: { colors: ['#EF4444', '#EF4444', '#EF4444'] },
    medium: { colors: ['#F59E0B', '#F59E0B', '#374151'] },
    low: { colors: ['#6B7280', '#374151', '#374151'] }
  };
  
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {config[importance].colors.map((color, i) => (
        <div key={i} style={{
          width: '3px',
          height: '10px',
          borderRadius: '1px',
          background: color
        }} />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MOBILE EVENT CARD (for Event List tab)
// ═══════════════════════════════════════════════════════════════════

const MobileEventCard = ({ 
  event, 
  isAnalyzed,
  onClick 
}: { 
  event: CalendarEvent; 
  isAnalyzed: boolean;
  onClick: () => void;
}) => {
  // hasActual: actual değeri var mı (null, undefined, veya boş string DEĞİL)
  const hasActual = event.actual != null && String(event.actual).trim() !== '';
  
  // Event durumları (same logic as desktop)
  const isOngoing = isEventOngoing(event);
  const isPast = isEventPast(event);
  const isFuture = !isOngoing && !isPast;
  const isHighImpact = event.importance === 'high';
  
  // Badge gösterilecek mi?
  // SADECE veritabanında analiz varsa badge göster!
  // 1. isAnalyzed → Veritabanında pre/post analiz var → "Agent Analyzed"
  // 2. High-impact VE gelecekte → "Agent Ready" (analiz edilecek)
  const showBadge = isAnalyzed || (isHighImpact && isFuture);
  
  // Surprise direction
  let surpriseDirection: 'beat' | 'miss' | 'inline' | null = null;
  if (hasActual && event.forecast) {
    const actual = parseFloat(String(event.actual).replace(/[^0-9.-]/g, ''));
    const forecast = parseFloat(String(event.forecast).replace(/[^0-9.-]/g, ''));
    if (!isNaN(actual) && !isNaN(forecast)) {
      if (actual > forecast * 1.005) surpriseDirection = 'beat';
      else if (actual < forecast * 0.995) surpriseDirection = 'miss';
      else surpriseDirection = 'inline';
    }
  }
  
  // Renk teması: BEAT=yeşil, MISS=kırmızı, INLINE=gri, default=koyu
  const getThemeColors = () => {
    if (hasActual && surpriseDirection) {
      if (surpriseDirection === 'beat') {
        return {
          border: 'rgba(34, 197, 94, 0.5)',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(0,0,0,0.8) 100%)',
          accent: '#22C55E'
        };
      } else if (surpriseDirection === 'miss') {
        return {
          border: 'rgba(239, 68, 68, 0.5)',
          background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(0,0,0,0.8) 100%)',
          accent: '#EF4444'
        };
      } else {
        return {
          border: 'rgba(107, 114, 128, 0.4)',
          background: 'linear-gradient(135deg, rgba(107,114,128,0.1) 0%, rgba(0,0,0,0.8) 100%)',
          accent: '#9CA3AF'
        };
      }
    }
    if (isOngoing) {
      return {
        border: 'rgba(245, 158, 11, 0.5)',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(0,0,0,0.8) 100%)',
        accent: '#F59E0B'
      };
    }
    if (isAnalyzed) {
      return {
        border: 'rgba(0, 245, 255, 0.3)',
        background: 'linear-gradient(135deg, rgba(0,245,255,0.08) 0%, rgba(0,0,0,0.8) 100%)',
        accent: '#00F5FF'
      };
    }
    return {
      border: 'rgba(255, 255, 255, 0.1)',
      background: 'rgba(0, 0, 0, 0.5)',
      accent: 'rgba(255,255,255,0.5)'
    };
  };
  
  const theme = getThemeColors();

  return (
    <div
      onClick={onClick}
      style={{
        background: theme.background,
        border: `1px solid ${theme.border}`,
        borderRadius: '16px',
        padding: '14px',
        marginBottom: '10px',
        cursor: isAnalyzed ? 'pointer' : 'default',
        boxShadow: hasActual ? `0 4px 20px ${theme.border}` : 'none'
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Flag + Country Code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FlagImg country={event.country} size={20} />
            {event.country && (
              <span style={{ 
                color: 'rgba(255,255,255,0.6)', 
                fontSize: '0.7rem', 
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                {event.country}
              </span>
            )}
          </div>
          <MobileImpactIndicator importance={event.importance} />
          {event.time && (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
              {formatUtcTimeToLocal(event.date, event.time)}
            </span>
          )}
        </div>
        
        {/* Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* LIVE Badge - same logic as desktop */}
          {isOngoing && (
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              color: '#fff',
              letterSpacing: '0.5px',
              animation: 'pulse 1.5s infinite',
              boxShadow: '0 0 8px rgba(239,68,68,0.5)'
            }}>
              LIVE
            </span>
          )}
          {/* PAST Badge */}
          {!isOngoing && isPast && (
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.5px'
            }}>
              PAST
            </span>
          )}
          {/* Beat/Miss/Inline Badge */}
          {hasActual && surpriseDirection && (
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: surpriseDirection === 'beat' ? 'rgba(34,197,94,0.2)' :
                         surpriseDirection === 'miss' ? 'rgba(239,68,68,0.2)' :
                         'rgba(107,114,128,0.2)',
              color: surpriseDirection === 'beat' ? '#22C55E' :
                     surpriseDirection === 'miss' ? '#EF4444' :
                     '#9CA3AF'
            }}>
              {surpriseDirection === 'beat' ? 'BEAT' : surpriseDirection === 'miss' ? 'MISS' : 'INLINE'}
            </span>
          )}
          {/* AI Analysis Badge */}
          {showBadge && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.55rem',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: '6px',
              background: isAnalyzed
                ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(0,245,255,0.2))'
                : 'linear-gradient(135deg, rgba(0,245,255,0.3), rgba(139,92,246,0.2))',
              color: isAnalyzed ? '#A78BFA' : '#00F5FF',
              border: `1px solid ${isAnalyzed ? 'rgba(139,92,246,0.4)' : 'rgba(0,245,255,0.4)'}`,
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap'
            }}>
              <Brain size={10} />
              {isAnalyzed ? 'Agent Analyzed' : 'Agent Ready'}
            </span>
          )}
        </div>
      </div>
      
      {/* Event Title */}
      <div style={{ 
        color: '#fff', 
        fontSize: '0.9rem', 
        fontWeight: 600, 
        marginBottom: '10px',
        lineHeight: 1.3
      }}>
        {event.title}
      </div>
      
      {/* Data Grid - Fotoğraftaki gibi profesyonel kutular */}
      {(event.forecast || event.previous || hasActual) && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: hasActual ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', 
          gap: '10px',
          marginBottom: isAnalyzed ? '12px' : '0'
        }}>
          {hasActual && (
            <div style={{
              background: surpriseDirection === 'beat' ? 'rgba(34,197,94,0.15)' :
                         surpriseDirection === 'miss' ? 'rgba(239,68,68,0.15)' :
                         'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '10px 8px',
              textAlign: 'center',
              border: `1px solid ${surpriseDirection === 'beat' ? 'rgba(34,197,94,0.4)' :
                                   surpriseDirection === 'miss' ? 'rgba(239,68,68,0.4)' :
                                   'rgba(255,255,255,0.15)'}`
            }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', marginBottom: '4px', letterSpacing: '0.8px', fontWeight: 600 }}>ACTUAL</div>
              <div style={{ 
                color: surpriseDirection === 'beat' ? '#22C55E' :
                       surpriseDirection === 'miss' ? '#EF4444' : '#fff',
                fontWeight: 700,
                fontSize: '1.1rem'
              }}>{event.actual}</div>
            </div>
          )}
          {event.forecast && (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              padding: '10px 8px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', marginBottom: '4px', letterSpacing: '0.8px', fontWeight: 600 }}>FORECAST</div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>{event.forecast}</div>
            </div>
          )}
          {event.previous && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '10px 8px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', marginBottom: '4px', letterSpacing: '0.8px', fontWeight: 600 }}>PREVIOUS</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: '1.1rem' }}>{event.previous}</div>
            </div>
          )}
        </div>
      )}
      
      {/* Tap to View Analysis Indicator */}
      {isAnalyzed && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '10px',
          padding: '8px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(0,245,255,0.08), rgba(139,92,246,0.08))',
          border: '1px solid rgba(0,245,255,0.2)',
          color: '#00F5FF',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          <Eye size={14} />
          Tap to view AI analysis
          <ChevronRight size={14} />
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MOBILE LIVE EVENT CARD (for Agent Analyze tab)
// ═══════════════════════════════════════════════════════════════════

const MobileLiveEventCard = ({
  event,
  analysis,
  hasActual,
  minutesAgo,
  isOverdue,
  onAssetClick,
  isPremium = true
}: {
  event: any;
  analysis: any;
  hasActual: boolean;
  minutesAgo?: number;
  isOverdue?: boolean;
  onAssetClick: (symbol: string) => void;
  isPremium?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Determine colors based on actual vs forecast
  let surpriseDirection: 'beat' | 'miss' | 'inline' | null = null;
  if (hasActual && event.forecast && event.actual) {
    const actual = parseFloat(String(event.actual).replace(/[^0-9.-]/g, ''));
    const forecast = parseFloat(String(event.forecast).replace(/[^0-9.-]/g, ''));
    if (!isNaN(actual) && !isNaN(forecast)) {
      if (actual > forecast * 1.005) surpriseDirection = 'beat';
      else if (actual < forecast * 0.995) surpriseDirection = 'miss';
      else surpriseDirection = 'inline';
    }
  }
  
  const borderColor = hasActual 
    ? (surpriseDirection === 'beat' ? 'rgba(34, 197, 94, 0.5)' : 
       surpriseDirection === 'miss' ? 'rgba(239, 68, 68, 0.5)' : 
       'rgba(107, 114, 128, 0.5)')
    : (isOverdue ? 'rgba(107, 114, 128, 0.5)' : 'rgba(245, 158, 11, 0.5)');
  
  const accentColor = hasActual 
    ? (surpriseDirection === 'beat' ? '#22C55E' : 
       surpriseDirection === 'miss' ? '#EF4444' : '#9CA3AF')
    : (isOverdue ? '#6B7280' : '#F59E0B');

  return (
    <div style={{
      background: `linear-gradient(135deg, ${hasActual ? 'rgba(0,0,0,0.6)' : 'rgba(20,20,20,0.9)'} 0%, rgba(0,0,0,0.8) 100%)`,
      border: `1px solid ${borderColor}`,
      borderRadius: '16px',
      padding: '14px',
      marginBottom: '12px',
      boxShadow: `0 4px 20px ${borderColor}`
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FlagImg country={event.country} size={22} />
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '6px',
            background: hasActual ? `${accentColor}20` : (isOverdue ? 'rgba(107,114,128,0.2)' : 'rgba(245,158,11,0.2)'),
            color: accentColor,
            letterSpacing: '0.5px'
          }}>
            {hasActual ? (minutesAgo ? `${minutesAgo}m AGO` : 'RELEASED') : 'LIVE'}
          </span>
        </div>
        
        {hasActual && surpriseDirection && (
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '6px',
            background: `${accentColor}20`,
            color: accentColor
          }}>
            {surpriseDirection === 'beat' ? 'ABOVE' : surpriseDirection === 'miss' ? 'BELOW' : 'IN-LINE'}
          </span>
        )}
      </div>
      
      {/* Event Name */}
      <div style={{ 
        color: '#fff', 
        fontSize: '1rem', 
        fontWeight: 700, 
        marginBottom: '12px',
        lineHeight: 1.3
      }}>
        {event.name || event.title}
      </div>
      
      {/* Data Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '8px', 
        marginBottom: '12px' 
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '8px',
          padding: '10px 8px',
          textAlign: 'center'
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', marginBottom: '4px', letterSpacing: '0.5px' }}>ACTUAL</div>
          {hasActual ? (
            <div style={{ color: accentColor, fontSize: '1.1rem', fontWeight: 700 }}>{event.actual}</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Clock size={16} color={accentColor} style={{ animation: 'spin 2s linear infinite' }} />
              <span style={{ color: accentColor, fontSize: '0.9rem' }}>...</span>
            </div>
          )}
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          padding: '10px 8px',
          textAlign: 'center'
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', marginBottom: '4px', letterSpacing: '0.5px' }}>FORECAST</div>
          <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>{event.forecast || '—'}</div>
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          padding: '10px 8px',
          textAlign: 'center'
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', marginBottom: '4px', letterSpacing: '0.5px' }}>PREVIOUS</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', fontWeight: 500 }}>{event.previous || '—'}</div>
        </div>
      </div>
      
      {/* Assets */}
      {analysis?.tradingview_assets && analysis.tradingview_assets.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {analysis.tradingview_assets.slice(0, 4).map((asset: string, idx: number) => {
            const displayName = asset.includes(':') ? asset.split(':')[1] : asset;
            return (
              <button
                key={idx}
                onClick={() => onAssetClick(asset)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0,245,255,0.1)',
                  border: '1px solid rgba(0,245,255,0.3)',
                  color: '#00F5FF',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {displayName}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Expand Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '8px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.75rem',
          cursor: 'pointer'
        }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide Analysis' : 'Show Analysis'}
      </button>
      
      {/* Expanded Content */}
      {expanded && analysis && (
        <div style={{ position: 'relative', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.95)',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Lock size={24} strokeWidth={2} />
              <span>Upgrade to view</span>
            </Link>
          )}
          <div style={!isPremium ? { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
          {/* Summary */}
          {analysis.summary && (
            <div style={{
              background: 'rgba(0,245,255,0.05)',
              border: '1px solid rgba(0,245,255,0.2)',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Brain size={14} color="#00F5FF" />
                <span style={{ color: '#00F5FF', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px' }}>FIBALGO ANALYSIS</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
                {analysis.summary}
              </p>
            </div>
          )}
          
          {/* Key Takeaway */}
          {analysis.key_takeaway && (
            <div style={{
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '8px',
              padding: '10px'
            }}>
              <div style={{ color: '#A78BFA', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>KEY TAKEAWAY</div>
              <p style={{ color: '#fff', fontSize: '0.8rem', lineHeight: 1.4, margin: 0 }}>
                {analysis.key_takeaway}
              </p>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MOBILE UPCOMING EVENT CARD (for Agent Analyze tab)
// ═══════════════════════════════════════════════════════════════════

const MobileUpcomingEventCard = ({
  event,
  analysis,
  hoursUntil,
  onAssetClick,
  isPremium = true
}: {
  event: any;
  analysis: any;
  hoursUntil: number;
  onAssetClick: (symbol: string) => void;
  isPremium?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Time formatting
  const timeLabel = hoursUntil < 1 
    ? `${Math.round(hoursUntil * 60)}m` 
    : hoursUntil < 24 
      ? `${Math.round(hoursUntil)}h` 
      : `${Math.round(hoursUntil / 24)}d`;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0,30,40,0.9) 0%, rgba(0,0,0,0.8) 100%)',
      border: '1px solid rgba(0, 245, 255, 0.3)',
      borderRadius: '16px',
      padding: '14px',
      marginBottom: '12px',
      boxShadow: '0 4px 20px rgba(0, 245, 255, 0.1)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FlagImg country={event.country} size={22} />
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(0,245,255,0.15)',
            color: '#00F5FF',
            letterSpacing: '0.5px'
          }}>
            {timeLabel}
          </span>
        </div>
        
        <Brain size={16} color="#00F5FF" />
      </div>
      
      {/* Event Name */}
      <div style={{ 
        color: '#fff', 
        fontSize: '1rem', 
        fontWeight: 700, 
        marginBottom: '10px',
        lineHeight: 1.3
      }}>
        {event.name || event.title}
      </div>
      
      {/* Data Preview */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '0.8rem' }}>
        {event.forecast && (
          <div>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Forecast: </span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{event.forecast}</span>
          </div>
        )}
        {event.previous && (
          <div>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Previous: </span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{event.previous}</span>
          </div>
        )}
      </div>
      
      {/* Assets */}
      {analysis?.tradingview_assets && analysis.tradingview_assets.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {analysis.tradingview_assets.slice(0, 4).map((asset: string, idx: number) => {
            const displayName = asset.includes(':') ? asset.split(':')[1] : asset;
            return (
              <button
                key={idx}
                onClick={() => onAssetClick(asset)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0,245,255,0.1)',
                  border: '1px solid rgba(0,245,255,0.3)',
                  color: '#00F5FF',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {displayName}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Expand Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '8px',
          borderRadius: '8px',
          background: 'rgba(0,245,255,0.05)',
          border: '1px solid rgba(0,245,255,0.2)',
          color: '#00F5FF',
          fontSize: '0.75rem',
          cursor: 'pointer'
        }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide Playbook' : 'Show Playbook'}
      </button>
      
      {/* Expanded Content - Scenario Playbook */}
      {expanded && analysis?.scenarioPlaybook && (
        <div style={{ position: 'relative', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,245,255,0.2)' }}>
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
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.95)',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Lock size={24} strokeWidth={2} />
              <span>Upgrade to view</span>
            </Link>
          )}
          <div style={!isPremium ? { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Flame size={14} color="#F59E0B" />
            <span style={{ color: '#F59E0B', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px' }}>SCENARIO PLAYBOOK</span>
          </div>
          
          {Object.entries(analysis.scenarioPlaybook).slice(0, 3).map(([key, scenario]: [string, any]) => (
            <div 
              key={key}
              style={{
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '8px',
                borderLeft: `3px solid ${
                  key.includes('Beat') || key.includes('beat') || key.includes('bigBeat') ? '#22C55E' :
                  key.includes('Miss') || key.includes('miss') || key.includes('bigMiss') ? '#EF4444' :
                  '#6B7280'
                }`
              }}
            >
              <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                {scenario.label || key}
              </div>
              
              {scenario.trades && scenario.trades.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {scenario.trades.map((trade: any, idx: number) => (
                    <span 
                      key={idx}
                      style={{
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: trade.direction === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: trade.direction === 'long' ? '#22C55E' : '#EF4444',
                        fontWeight: 600
                      }}
                    >
                      {trade.direction?.toUpperCase()} {trade.asset}
                    </span>
                  ))}
                </div>
              ) : scenario.action === 'no_trade' && (
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                  No trade — {scenario.reason || 'No edge'}
                </span>
              )}
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN MOBILE CALENDAR COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function MobileResponsiveCalendar({
  events,
  selectedDate,
  setSelectedDate,
  filter,
  setFilter,
  countryFilter,
  setCountryFilter,
  isLoading,
  lastUpdated,
  calendarEmptyMessage,
  eventAnalyses,
  loadingAnalyses,
  analyzedKeys,
  chartPopupOpen,
  setChartPopupOpen,
  chartPopupSymbol,
  setChartPopupSymbol,
  fetchCalendar,
  openEventModal
}: MobileResponsiveCalendarProps) {
  // Get isScrollingDown and isPremium from TerminalContext
  const { isScrollingDown, isPremium } = useTerminal();
  const router = useRouter();
  
  // Mobile: Asset tıklandığında chart sayfasına yönlendir (popup yerine)
  const handleMobileAssetClick = useCallback((symbol: string) => {
    router.push(`/terminal/chart?symbol=${encodeURIComponent(symbol)}`);
  }, [router]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'event-list' | 'agent-analyze'>('event-list');
  const activeTabRef = useRef(activeTab); // Keep ref in sync for swipe handler
  activeTabRef.current = activeTab; // Update ref on every render
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [tabBarHeight, setTabBarHeight] = useState<number>(44); // Default height
  
  // Collapse states for Agent Analyze sections
  const [mobileCollapsedSections, setMobileCollapsedSections] = useState<{
    postEvent: boolean;
    liveAwaiting: boolean;
    upcoming: boolean;
  }>({ postEvent: false, liveAwaiting: false, upcoming: false });
  
  const toggleMobileSection = (section: 'postEvent' | 'liveAwaiting' | 'upcoming') => {
    setMobileCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Mobile Analysis Modal state
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [mobileModalData, setMobileModalData] = useState<{
    event: CalendarEvent;
    preAnalysis: any;
    postAnalysis: any;
  } | null>(null);
  const [mobileModalLoading, setMobileModalLoading] = useState(false);
  
  // Function to open mobile modal with analysis data
  const openMobileAnalysisModal = async (event: CalendarEvent) => {
    setMobileModalOpen(true);
    setMobileModalLoading(true);
    setMobileModalData({ event, preAnalysis: null, postAnalysis: null });
    
    try {
      // Use the same endpoint as desktop popup so mobile shows identical fields.
      const res = await fetch(
        `/api/calendar/event-analysis?name=${encodeURIComponent(event.title)}&date=${encodeURIComponent(event.date)}`
      );
      if (res.ok) {
        const data = await res.json();
        // Prefer raw_analysis payloads (contains full Stage3 + extra context)
        const preAnalysis = data?.preAnalysis?.raw_analysis || data?.preAnalysis || null;
        const postAnalysis = data?.postAnalysis?.raw_analysis || data?.postAnalysis || null;

        // Fallback to current in-memory analyses if DB lookup fails
        if (!preAnalysis || !postAnalysis) {
          const normalizedTitle = normalizeEventName(event.title);
          const preMatch = eventAnalyses.preEvent.find(p =>
            normalizeEventName(p.event?.name || p.event?.title || '') === normalizedTitle
          );
          const liveMatch = eventAnalyses.liveEvent.find(l =>
            normalizeEventName(l.event?.name || l.event?.title || '') === normalizedTitle
          );
          setMobileModalData({
            event,
            preAnalysis: preAnalysis || preMatch?.analysis || null,
            postAnalysis: postAnalysis || liveMatch?.analysis || null,
          });
          return;
        }

        setMobileModalData({ event, preAnalysis, postAnalysis });
      }
    } catch (error) {
      console.error('Failed to fetch analysis for modal:', error);
    } finally {
      setMobileModalLoading(false);
    }
  };
  
  // Country filter dropdown state
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const countryMenuRef = useRef<HTMLDivElement | null>(null);
  
  // Close country menu on outside click
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
  
  // Swipe navigation - useMemo to prevent recreation on every render
  const tabOrder = useMemo<Array<'event-list' | 'agent-analyze'>>(() => ['event-list', 'agent-analyze'], []);
  const isSwiping = useRef(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  // Save and restore scroll position (same as MobileResponsiveNews)
  useEffect(() => {
    // Restore scroll position on mount
    const savedScrollY = sessionStorage.getItem('calendar_scroll_position');
    if (savedScrollY) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScrollY, 10));
      });
    }

    // Save scroll position continuously
    const saveScrollPosition = () => {
      sessionStorage.setItem('calendar_scroll_position', window.scrollY.toString());
    };

    window.addEventListener('scroll', saveScrollPosition, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', saveScrollPosition);
    };
  }, []);

  // Measure tab bar height dynamically (same as MobileResponsiveNews)
  useEffect(() => {
    const updateTabBarHeight = () => {
      if (tabBarRef.current) {
        const height = tabBarRef.current.getBoundingClientRect().height;
        if (height > 0) {
          setTabBarHeight(height);
          document.documentElement.style.setProperty('--calendar-tab-bar-height', `${height}px`);
        }
      }
    };
    
    const rafId = requestAnimationFrame(() => {
      updateTabBarHeight();
      setTimeout(updateTabBarHeight, 100);
    });
    
    window.addEventListener('resize', updateTabBarHeight);
    
    const resizeObserver = new ResizeObserver(updateTabBarHeight);
    if (tabBarRef.current) {
      resizeObserver.observe(tabBarRef.current);
    }
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateTabBarHeight);
      resizeObserver.disconnect();
    };
  }, []);
  
  // Handle swipe between tabs - use ref to always get current value
  const handleSwipe = useCallback(() => {
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;
    
    isSwiping.current = false;
    
    // Use ref for current tab value (avoids stale closure)
    const currentTab = activeTabRef.current;
    const currentIndex = tabOrder.indexOf(currentTab);
    
    if (Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (Math.abs(deltaX) < 50) return;
    
    if (deltaX < 0) {
      // Swipe left - go to next tab
      if (currentIndex < tabOrder.length - 1) {
        setActiveTab(tabOrder[currentIndex + 1]);
      }
    } else {
      // Swipe right - go to previous tab or open drawer
      if (currentIndex > 0) {
        setActiveTab(tabOrder[currentIndex - 1]);
      } else if (currentIndex === 0) {
        // On first tab - open drawer
        window.dispatchEvent(new CustomEvent('openMobileDrawer'));
      }
    }
  }, [tabOrder]);
  
  // Touch event listeners (same as MobileResponsiveNews)
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (document.querySelector('.mobile-drawer.open')) return;
      const target = e.target as HTMLElement;
      if (target.closest('.no-swipe') || target.closest('.filter-bar') || target.closest('input') || target.closest('textarea')) {
        return;
      }
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
      isSwiping.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (document.querySelector('.mobile-drawer.open')) return;
      if (!isSwiping.current) return;
      
      const target = e.target as HTMLElement;
      if (target.closest('.no-swipe') || target.closest('.filter-bar')) {
        isSwiping.current = false;
        return;
      }
      
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (document.querySelector('.mobile-drawer.open')) {
        isSwiping.current = false;
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest('.no-swipe') || target.closest('.filter-bar') || target.closest('input') || target.closest('textarea')) {
        isSwiping.current = false;
        return;
      }
      if (!isSwiping.current) return;
      handleSwipe();
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleSwipe]);
  
  // Get today's events - FMP UTC zamanını local güne çevirerek filtrele
  const selectedDateStr = toLocalDateString(selectedDate);
  const todayEvents = events.filter(e => getEventLocalDateString(e) === selectedDateStr);
  
  // Filter events (same logic as desktop for consistency)
  const filteredEvents = todayEvents.filter(e => {
    if (filter === 'high' && e.importance !== 'high') return false;
    if (filter === 'medium' && e.importance === 'low') return false; // medium filter shows high + medium
    if (countryFilter !== 'all' && e.country !== countryFilter) return false;
    return true;
  });
  
  // Sort by time (UTC timestamp - same as desktop for consistent ordering)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    return eventUtcTime(a.date, a.time) - eventUtcTime(b.date, b.time);
  });
  
  // Navigate dates
  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };
  
  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };
  
  const goToToday = () => {
    setSelectedDate(new Date());
  };
  
  // Format date
  const formatDateHeader = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    if (isTomorrow) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  // Count analyses
  const totalAnalyses = eventAnalyses.preEvent.length + eventAnalyses.liveEvent.length;
  
  // Get unique countries from events for filter dropdown
  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    events.forEach(e => {
      if (e.country) countries.add(e.country);
    });
    return Array.from(countries).sort();
  }, [events]);

  return (
    <div className="mobile-calendar-container">
      {/* Mobile Responsive Styles */}
      <style jsx global>{`
        .mobile-calendar-container * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .mobile-calendar-container *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        .mobile-calendar-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #0A0A0B;
          overflow-x: hidden;
          max-width: 100vw;
        }
        
        .mobile-calendar-tab-bar {
          display: flex;
          position: fixed;
          top: var(--content-top-offset, 64px);
          left: 0;
          right: 0;
          z-index: 999;
          background: rgba(0,0,0,0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          transition: transform 0.05s ease-out, top 0.05s ease-out;
        }
        
        .mobile-calendar-tab-bar.scroll-hide {
          transform: translateY(calc(-100% - var(--content-top-offset, 64px)));
          top: 0;
        }
        
        .mobile-calendar-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0.85rem 0;
          color: rgba(255,255,255,0.5);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          position: relative;
          transition: color 0.2s;
          background: transparent;
          border: none;
        }
        
        .mobile-calendar-tab:hover {
          color: rgba(255,255,255,0.8);
          background: rgba(255,255,255,0.03);
        }
        
        .mobile-calendar-tab.active {
          color: #fff;
          font-weight: 600;
        }
        
        .mobile-calendar-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 3px;
          background: #00F5FF;
          border-radius: 3px 3px 0 0;
        }
        
        .mobile-calendar-content-area {
          flex: 1;
          padding-top: 56px;
          overflow-x: hidden;
          overflow-y: auto;
        }
        
        .mobile-calendar-tab-content {
          display: none;
          padding: 0 0.75rem;
        }
        
        .mobile-calendar-tab-content.current {
          display: block;
        }
        
        .mobile-calendar-date-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(10, 10, 11, 0.98);
          backdrop-filter: blur(10px);
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        
        .mobile-calendar-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Tab Bar - no-swipe to prevent accidental tab switches */}
      <div 
        className={`mobile-calendar-tab-bar no-swipe ${isScrollingDown ? 'scroll-hide' : ''}`}
        ref={tabBarRef}
      >
        <button 
          className={`mobile-calendar-tab ${activeTab === 'event-list' ? 'active' : ''}`}
          onClick={() => setActiveTab('event-list')}
        >
          Event List
        </button>
        <button 
          className={`mobile-calendar-tab ${activeTab === 'agent-analyze' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent-analyze')}
        >
          Agent Analyze
          {totalAnalyses > 0 && (
            <span style={{
              background: '#00F5FF',
              color: '#000',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '10px',
              marginLeft: '4px'
            }}>
              {totalAnalyses}
            </span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="mobile-calendar-content-area">
        
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* EVENT LIST TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className={`mobile-calendar-tab-content ${activeTab === 'event-list' ? 'current' : ''}`}>
          
          {/* Date Header - no-swipe to prevent interference with navigation buttons */}
          <div className="mobile-calendar-date-header no-swipe">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={goToPreviousDay}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={20} />
              </button>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  color: '#fff', 
                  fontSize: '1.1rem', 
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  {formatDateHeader(selectedDate)}
                  {isLoading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                {/* Local Timezone */}
                <div style={{ 
                  color: 'rgba(255,255,255,0.35)', 
                  fontSize: '0.65rem',
                  marginTop: '2px'
                }}>
                  {(() => {
                    const offsetMinutes = new Date().getTimezoneOffset();
                    const offsetHours = -offsetMinutes / 60;
                    const sign = offsetHours >= 0 ? '+' : '';
                    return `GMT${sign}${offsetHours}`;
                  })()} • Local Time
                </div>
              </div>
              
              <button
                onClick={goToNextDay}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            {/* Action Buttons Row 1: Today + Refresh */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={goToToday}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(0,245,255,0.1)',
                  border: '1px solid rgba(0,245,255,0.3)',
                  color: '#00F5FF',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
              
              <button
                onClick={() => fetchCalendar(true, false)}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  opacity: isLoading ? 0.5 : 1
                }}
              >
                <RefreshCw size={18} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
            
            {/* Filters Row 2: Impact + Country */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {/* Impact Filter Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '2px',
                padding: '3px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                {(['all', 'high', 'medium'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: filter === f ? 'linear-gradient(135deg, rgba(0,245,255,0.20), rgba(139,92,246,0.18))' : 'transparent',
                      border: 'none',
                      color: filter === f ? '#EFFFFF' : 'rgba(255,255,255,0.6)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: f === 'high' ? '#EF4444' : f === 'medium' ? '#F59E0B' : 'rgba(255,255,255,0.35)',
                      boxShadow: f === 'high' ? '0 0 6px rgba(239,68,68,0.4)' : f === 'medium' ? '0 0 6px rgba(245,158,11,0.3)' : 'none'
                    }} />
                    {f === 'all' ? 'All' : f === 'high' ? 'High' : 'Med+'}
                  </button>
                ))}
              </div>
              
              {/* Country Filter Dropdown - no-swipe to prevent interference */}
              <div ref={countryMenuRef} className="no-swipe" style={{ position: 'relative', flex: 1, minWidth: '120px' }}>
                <button
                  type="button"
                  onClick={() => setCountryMenuOpen((v) => !v)}
                  style={{
                    width: '100%',
                    height: '38px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '10px',
                    padding: '0 10px',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {countryFilter === 'all' ? (
                      <span style={{ fontSize: '0.9rem' }}>🌍</span>
                    ) : (
                      <FlagImg country={countryFilter} size={16} />
                    )}
                    <span style={{ textTransform: 'uppercase' }}>
                      {countryFilter === 'all' ? 'All' : countryFilter}
                    </span>
                  </span>
                  <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
                </button>
                
                {countryMenuOpen && (
                  <div
                    role="listbox"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'rgba(20,20,25,0.98)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px',
                      padding: '6px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 100,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                    }}
                  >
                    {/* All Countries Option */}
                    <button
                      onClick={() => { setCountryFilter('all'); setCountryMenuOpen(false); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        background: countryFilter === 'all' ? 'rgba(0,245,255,0.12)' : 'transparent',
                        color: '#fff',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <span style={{ fontSize: '0.9rem' }}>🌍</span>
                      All Countries
                    </button>
                    
                    {/* Country List */}
                    {availableCountries.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCountryFilter(c); setCountryMenuOpen(false); }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          background: countryFilter === c ? 'rgba(0,245,255,0.12)' : 'transparent',
                          color: '#fff',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 500
                        }}
                      >
                        <FlagImg country={c} size={18} />
                        <span style={{ textTransform: 'uppercase' }}>{c}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Events List */}
          <div style={{ padding: '16px 0' }}>
            {isLoading && sortedEvents.length === 0 ? (
              <div className="mobile-calendar-empty-state">
                <Loader2 size={32} color="#00F5FF" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading events...</div>
              </div>
            ) : sortedEvents.length === 0 ? (
              <div className="mobile-calendar-empty-state">
                <CalendarIcon size={40} color="rgba(255,255,255,0.2)" style={{ marginBottom: '12px' }} />
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                  {calendarEmptyMessage || 'No events for this day'}
                </div>
              </div>
            ) : (
              sortedEvents.map((event) => {
                const key = `${event.date}|${normalizeEventName(event.title)}`;
                const isAnalyzed = !!analyzedKeys[key];
                
                return (
                  <MobileEventCard
                    key={event.id}
                    event={event}
                    isAnalyzed={isAnalyzed}
                    onClick={() => {
                      if (isAnalyzed) {
                        openMobileAnalysisModal(event);
                      }
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
        
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* AGENT ANALYZE TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className={`mobile-calendar-tab-content ${activeTab === 'agent-analyze' ? 'current' : ''}`}>
          <div style={{ padding: '16px 0' }}>
            
            {loadingAnalyses ? (
              <div className="mobile-calendar-empty-state">
                <Loader2 size={32} color="#00F5FF" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading analyses...</div>
              </div>
            ) : totalAnalyses === 0 ? (
              <div className="mobile-calendar-empty-state">
                <Brain size={40} color="rgba(255,255,255,0.2)" style={{ marginBottom: '12px' }} />
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '8px' }}>
                  No AI analyses available
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', maxWidth: '280px' }}>
                  High-impact events are analyzed 2 hours before they occur
                </div>
              </div>
            ) : (
              <>
                {/* Just Released / Post-Event */}
                {/* POST EVENT Section */}
                {(() => {
                  const postEvents = eventAnalyses.liveEvent.filter(e => e.hasActual);
                  const count = postEvents.length;
                  return (
                    <div style={{ marginBottom: '24px' }}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          marginBottom: mobileCollapsedSections.postEvent ? '0' : '12px',
                          padding: '8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)'
                        }}
                        onClick={() => toggleMobileSection('postEvent')}
                      >
                        <Flame size={16} color={count > 0 ? '#EF4444' : '#6B7280'} />
                        <span style={{ color: count > 0 ? '#EF4444' : '#6B7280', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                          POST EVENT
                        </span>
                        <span style={{
                          background: count > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(107,114,128,0.2)',
                          color: count > 0 ? '#EF4444' : '#6B7280',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {count}
                        </span>
                        {eventAnalyses.isDemo && (
                          <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.55rem', fontWeight: 700, padding: '2px 4px', borderRadius: '4px' }}>DEMO</span>
                        )}
                        <div style={{ flex: 1 }} />
                        <ChevronDown 
                          size={16} 
                          color="rgba(255,255,255,0.4)" 
                          style={{ 
                            transform: mobileCollapsedSections.postEvent ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }} 
                        />
                      </div>
                      
                      {!mobileCollapsedSections.postEvent && (
                        count === 0 ? (
                          <div style={{
                            padding: '16px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            textAlign: 'center'
                          }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                              No post-event analyses available
                            </span>
                          </div>
                        ) : (
                          postEvents.map((item, idx) => (
                            <SharedLiveEventCard
                              key={idx}
                              event={item.event}
                              analysis={item.analysis}
                              minutesAgo={item.minutesAgo ?? 0}
                              hasActual={true}
                              isOverdue={false}
                              onAssetClick={handleMobileAssetClick}
                              isMobile={true}
                              isPremium={isPremium}
                            />
                          ))
                        )
                      )}
                    </div>
                  );
                })()}
                
                {/* LIVE Section */}
                {(() => {
                  const liveEvents = eventAnalyses.liveEvent.filter(e => !e.hasActual);
                  const count = liveEvents.length;
                  return (
                    <div style={{ marginBottom: '24px' }}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          marginBottom: mobileCollapsedSections.liveAwaiting ? '0' : '12px',
                          padding: '8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)'
                        }}
                        onClick={() => toggleMobileSection('liveAwaiting')}
                      >
                        <Clock size={16} color={count > 0 ? '#F59E0B' : '#6B7280'} style={{ animation: count > 0 ? 'pulse 2s infinite' : 'none' }} />
                        <span style={{ color: count > 0 ? '#F59E0B' : '#6B7280', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                          LIVE
                        </span>
                        <span style={{
                          background: count > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(107,114,128,0.2)',
                          color: count > 0 ? '#F59E0B' : '#6B7280',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {count}
                        </span>
                        {eventAnalyses.isDemo && (
                          <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.55rem', fontWeight: 700, padding: '2px 4px', borderRadius: '4px' }}>DEMO</span>
                        )}
                        <div style={{ flex: 1 }} />
                        <ChevronDown 
                          size={16} 
                          color="rgba(255,255,255,0.4)" 
                          style={{ 
                            transform: mobileCollapsedSections.liveAwaiting ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }} 
                        />
                      </div>
                      
                      {!mobileCollapsedSections.liveAwaiting && (
                        count === 0 ? (
                          <div style={{
                            padding: '16px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            textAlign: 'center'
                          }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                              No live events at the moment
                            </span>
                          </div>
                        ) : (
                          liveEvents.map((item, idx) => (
                            <SharedLiveEventCard
                              key={idx}
                              event={item.event}
                              analysis={item.analysis}
                              minutesAgo={item.minutesAgo ?? 0}
                              hasActual={false}
                              isOverdue={(item.minutesAgo || 0) > 90}
                              onAssetClick={handleMobileAssetClick}
                              isMobile={true}
                              isPremium={isPremium}
                            />
                          ))
                        )
                      )}
                    </div>
                  );
                })()}
                
                {/* UPCOMING Section */}
                {(() => {
                  const count = eventAnalyses.preEvent.length;
                  return (
                    <div>
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          marginBottom: mobileCollapsedSections.upcoming ? '0' : '12px',
                          padding: '8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)'
                        }}
                        onClick={() => toggleMobileSection('upcoming')}
                      >
                        <Eye size={16} color={count > 0 ? '#00F5FF' : '#6B7280'} />
                        <span style={{ color: count > 0 ? '#00F5FF' : '#6B7280', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                          UPCOMING
                        </span>
                        <span style={{
                          background: count > 0 ? 'rgba(0,245,255,0.2)' : 'rgba(107,114,128,0.2)',
                          color: count > 0 ? '#00F5FF' : '#6B7280',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {count}
                        </span>
                        {eventAnalyses.isDemo && (
                          <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.55rem', fontWeight: 700, padding: '2px 4px', borderRadius: '4px' }}>DEMO</span>
                        )}
                        <div style={{ flex: 1 }} />
                        <ChevronDown 
                          size={16} 
                          color="rgba(255,255,255,0.4)" 
                          style={{ 
                            transform: mobileCollapsedSections.upcoming ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }} 
                        />
                      </div>
                      
                      {!mobileCollapsedSections.upcoming && (
                        count === 0 ? (
                          <div style={{
                            padding: '16px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            textAlign: 'center'
                          }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                              Analyses will be published 2 hours before high-impact events
                            </span>
                          </div>
                        ) : (
                          eventAnalyses.preEvent.map((item, idx) => (
                            <SharedUpcomingEventCard
                              key={idx}
                              event={item.event}
                              analysis={item.analysis}
                              hoursUntil={item.hoursUntil}
                              onAssetClick={handleMobileAssetClick}
                              isMobile={true}
                              isPremium={isPremium}
                            />
                          ))
                        )
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Chart popup kaldırıldı - artık /terminal/chart?symbol=... sayfasına yönlendiriliyor */}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MOBILE ANALYSIS MODAL - no-swipe to prevent tab switching while open */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mobileModalOpen && mobileModalData && (
        <div
          className="no-swipe"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            background: 'rgba(0,0,0,0.95)',
            overflowY: 'auto'
          }}
        >
          {/* Modal Header */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(0,0,0,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FlagImg country={mobileModalData.event.country} size={24} />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
                  {mobileModalData.event.title}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                  {mobileModalData.event.country?.toUpperCase()} • {mobileModalData.event.date}
                </div>
              </div>
            </div>
            <button
              onClick={() => { setMobileModalOpen(false); setMobileModalData(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Content */}
          <div style={{ padding: '16px' }}>
            {mobileModalLoading ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '60px 20px' 
              }}>
                <Loader2 size={40} color="#00F5FF" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Loading analysis...</div>
              </div>
            ) : (
              <>
                {/* POST-EVENT CARD (if has actual data) */}
                {mobileModalData.event.actual && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '12px' 
                    }}>
                      <div style={{ 
                        width: '10px', 
                        height: '10px', 
                        borderRadius: '50%', 
                        background: '#22C55E' 
                      }} />
                      <span style={{ 
                        color: '#22C55E', 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        letterSpacing: '0.5px' 
                      }}>
                        POST-EVENT ANALYSIS
                      </span>
                    </div>
                    
                    <SharedLiveEventCard
                      event={{
                        ...mobileModalData.event,
                        name: mobileModalData.event.title,
                        forecast: mobileModalData.event.forecast,
                        previous: mobileModalData.event.previous,
                        actual: mobileModalData.event.actual
                      }}
                      analysis={mobileModalData.postAnalysis || mobileModalData.preAnalysis}
                      minutesAgo={0}
                      hasActual={true}
                      isOverdue={false}
                      onAssetClick={(symbol) => {
                        setMobileModalOpen(false);
                        handleMobileAssetClick(symbol);
                      }}
                      isMobile={true}
                      isPremium={isPremium}
                    />
                  </div>
                )}

                {/* PRE-EVENT CARD (Scenario Playbook) */}
                {(mobileModalData.preAnalysis || mobileModalData.postAnalysis) && (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '12px' 
                    }}>
                      <Brain size={16} color="#00F5FF" />
                      <span style={{ 
                        color: '#00F5FF', 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        letterSpacing: '0.5px' 
                      }}>
                        PRE-EVENT ANALYSIS
                      </span>
                    </div>
                    
                    <SharedUpcomingEventCard
                      event={{
                        ...mobileModalData.event,
                        name: mobileModalData.event.title,
                        forecast: mobileModalData.event.forecast,
                        previous: mobileModalData.event.previous
                      }}
                      analysis={mobileModalData.preAnalysis || mobileModalData.postAnalysis}
                      hoursUntil={0}
                      onAssetClick={(symbol) => {
                        setMobileModalOpen(false);
                        handleMobileAssetClick(symbol);
                      }}
                      isMobile={true}
                      isPremium={isPremium}
                    />
                  </div>
                )}

                {/* No Analysis Found */}
                {!mobileModalData.preAnalysis && !mobileModalData.postAnalysis && (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '40px 20px',
                    textAlign: 'center'
                  }}>
                    <Brain size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: '16px' }} />
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '8px' }}>
                      Analysis data not available
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                      This event was marked as analyzed but the data could not be retrieved
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
