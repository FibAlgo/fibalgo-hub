'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronUp
} from 'lucide-react';
import { PreEventCard, PostEventCard, EventAnalysisSkeleton } from '@/components/calendar/EventAnalysisCard';
import { getTerminalCache, setTerminalCache, isCacheValid } from '@/lib/store/terminalCache';

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

const getCountryFlag = (country?: string): string => {
  const flags: Record<string, string> = {
    'US': '🇺🇸', 'EU': '🇪🇺', 'GB': '🇬🇧', 'JP': '🇯🇵', 'CN': '🇨🇳',
    'DE': '🇩🇪', 'FR': '🇫🇷', 'CA': '🇨🇦', 'AU': '🇦🇺', 'CH': '🇨🇭',
    'NZ': '🇳🇿', 'KR': '🇰🇷', 'IN': '🇮🇳', 'BR': '🇧🇷', 'MX': '🇲🇽',
  };
  return flags[country || ''] || '🌍';
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

/** API'den gelen date (YYYY-MM-DD) + time → kullanıcının yerel tarih/saati (DD MMM · HH:mm) */
const formatEventLocalTime = (date: string, time?: string): string => {
  if (!date) return '—';
  const raw = (time || '00:00').trim().slice(0, 8);
  const timeForIso = raw.length <= 5 ? `${raw}:00` : raw;
  const iso = `${date}T${timeForIso}Z`;
  const utc = new Date(iso);
  if (Number.isNaN(utc.getTime())) return time ? `${date} · ${time}` : date;
  const d = utc.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const t = time ? utc.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  return t ? `${d} · ${t}` : d;
};

/** YYYY-MM-DD string'ini kullanıcının yerel takvim günü olarak parse et (UTC değil) */
const parseLocalDate = (dateStr: string): Date => {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date(dateStr);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

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

const groupEventsByDate = (events: CalendarEvent[]) => {
  const grouped: Record<string, CalendarEvent[]> = {};
  events.forEach(event => {
    const dateKey = event.date;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(event);
  });
  
  // Sort events within each day by UTC time (en yakın gelecek önce)
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
// DEMO EVENT DATA (görünüm için — aktif event yokken chartları göstermek)
// ═══════════════════════════════════════════════════════════════════

// Post-Event: actual açıklandı — surprise, headline, trade setup (JUST RELEASED bölümü)
const DEMO_POST_EVENT_ITEMS: Array<{ event: any; analysis: any; minutesAgo: number; hasActual?: boolean }> = [
  {
    event: { name: 'US Core CPI (YoY)', date: new Date().toISOString().split('T')[0], time: '08:30', country: 'US', currency: 'USD', forecast: '3.0%', previous: '3.2%', actual: '2.9%', importance: 'high' },
    minutesAgo: 18,
    hasActual: true,
    analysis: {
      surprise_assessment: 'minor_upside',
      headline: 'US Core CPI came in at 2.9% vs 3.0% f\'cast — slight beat. Inflation trend easing.',
      scenarios: { bigBeat: {}, smallBeat: {}, inline: {}, smallMiss: {}, bigMiss: {} },
      tradeSetup: {
        bullish: { trigger: 'If follow-through above 5850', asset: 'SPX', entry: '5840', stopLoss: '5790 (-0.9%)', takeProfit: '5920 (+1.4%)', riskRewardRatio: '1.5:1', timeHorizon: '1-2 days', invalidation: 'Break below 5820' },
        bearish: { trigger: 'If reversal', asset: 'SPX', entry: 'On break', stopLoss: '5880', takeProfit: '5780', riskRewardRatio: '1:1', timeHorizon: '1-2 days', invalidation: 'Reclaim 5840' },
        alternativeAssets: { ifBeat: [{ asset: 'DXY', direction: 'long', rationale: 'USD strength' }, { asset: 'XAUUSD', direction: 'short', rationale: 'Risk-on' }], ifMiss: [{ asset: 'DXY', direction: 'short', rationale: 'USD weak' }, { asset: 'XAUUSD', direction: 'long', rationale: 'Safe-haven' }] }
      },
      immediate_implications: { SPX: 'Initial pop on beat', DXY: 'Mixed', XAUUSD: 'Pressure' },
      summary: 'Core CPI beat supports soft-landing narrative. Equities may extend gains near-term; watch for follow-through. Demo — connect OpenAI for full analysis.',
      key_takeaway: 'Slight beat; risk-on bias. Demo view.'
    }
  }
];

// Live Now: canlı pencerede ama henüz actual yok — countdown, pre-event analiz (LIVE NOW bölümü)
const DEMO_LIVE_AWAITING_ITEMS: Array<{ event: any; analysis: any; minutesAgo: number; minutesUntilRelease?: number; hasActual?: boolean }> = [
  {
    event: { name: 'US Retail Sales (MoM)', date: new Date().toISOString().split('T')[0], time: '08:30', country: 'US', currency: 'USD', forecast: '0.3%', previous: '0.2%', importance: 'high' },
    minutesAgo: 0,
    minutesUntilRelease: 12,
    hasActual: false,
    analysis: {
      eventClassification: { tier: 2, expectedVolatility: 'high', primaryAffectedAssets: ['SPX', 'DXY'], secondaryAffectedAssets: ['XAUUSD'] },
      preEventStrategy: { recommendedApproach: 'wait_and_react', reasoning: 'Data due shortly — wait for print then trade reaction.', conviction: 6, timeHorizon: 'intraday' },
      scenarios: { bigBeat: { threshold: '>0.5%', probability: '~20%' }, smallBeat: {}, inline: {}, smallMiss: {}, bigMiss: { threshold: '<0%', probability: '~15%' } },
      tradeSetup: {
        bullish: { trigger: 'If retail sales beat', asset: 'SPX', entry: 'On break', stopLoss: '−0.8%', takeProfit: '+1.2%', riskRewardRatio: '1.5:1', timeHorizon: 'intraday', invalidation: '—' },
        bearish: { trigger: 'If retail sales miss', asset: 'DXY', direction: 'short', entry: 'On weakness', stopLoss: '+0.5%', takeProfit: '−0.8%', riskRewardRatio: '1.6:1', timeHorizon: 'intraday', invalidation: '—' },
        alternativeAssets: { ifBeat: [{ asset: 'DXY', direction: 'long', rationale: 'USD strength' }], ifMiss: [{ asset: 'XAUUSD', direction: 'long', rationale: 'Risk-off' }] }
      },
      summary: 'Event in live window, awaiting data release.'
    }
  }
];

const DEMO_UPCOMING_ITEMS: Array<{ event: any; analysis: any; hoursUntil: number }> = [
  {
    event: { name: 'FOMC Rate Decision', date: new Date().toISOString().split('T')[0], time: '14:00', country: 'US', currency: 'USD', forecast: '5.50%', previous: '5.50%', importance: 'high' },
    hoursUntil: 4,
    analysis: {
      eventClassification: { tier: 1, expectedVolatility: 'high', primaryAffectedAssets: ['SPX', 'DXY', 'XAUUSD'], secondaryAffectedAssets: ['TLT', 'VIX'] },
      preEventStrategy: { recommendedApproach: 'wait_and_react', reasoning: 'Tier 1 event — wait for statement and dots. Demo view.', conviction: 6, timeHorizon: '1-2 days' },
      scenarios: { bigBeat: { threshold: 'Hawkish hold', probability: '~25%' }, smallBeat: {}, inline: { threshold: 'As expected', probability: '~40%' }, smallMiss: {}, bigMiss: { threshold: 'Dovish cut', probability: '~20%' } },
      tradeSetup: {
        bullish: { trigger: 'If Fed signals pause and data-dependent', asset: 'SPX', entry: 'Current', stopLoss: '−1.5%', takeProfit: '+2%', riskRewardRatio: '1.3:1', timeHorizon: '1-2 days', invalidation: 'Break below key support' },
        bearish: { trigger: 'If Fed stays hawkish', asset: 'DXY', direction: 'long', entry: 'On strength', stopLoss: '−0.5%', takeProfit: '+1%', riskRewardRatio: '2:1', timeHorizon: '1-2 days', invalidation: 'DXY fails 104' },
        inline: { action: 'no_trade', reason: 'No edge when outcome in line with expectations' },
        alternativeAssets: { ifBeat: [{ asset: 'DXY', direction: 'short', rationale: 'Dovish = USD weak' }, { asset: 'XAUUSD', direction: 'long', rationale: 'Gold bid' }], ifMiss: [{ asset: 'DXY', direction: 'long', rationale: 'Hawkish = USD strong' }, { asset: 'XAUUSD', direction: 'short', rationale: 'Gold pressure' }] }
      },
      summary: 'Tier 1 event. Wait for release then trade reaction.'
    }
  },
  {
    event: { name: 'US Initial Jobless Claims', date: new Date().toISOString().split('T')[0], time: '08:30', country: 'US', currency: 'USD', forecast: '220K', previous: '218K', importance: 'high' },
    hoursUntil: 22,
    analysis: {
      eventClassification: { tier: 2, expectedVolatility: 'moderate', primaryAffectedAssets: ['SPX', 'DXY'], secondaryAffectedAssets: ['XAUUSD'] },
      preEventStrategy: { recommendedApproach: 'wait_and_react', reasoning: 'Labour data can move rates narrative. Demo.', conviction: 5, timeHorizon: 'intraday' },
      scenarios: { bigBeat: {}, smallBeat: {}, inline: {}, smallMiss: {}, bigMiss: {} },
      tradeSetup: {
        bullish: { trigger: 'If claims beat (lower)', asset: 'SPX', entry: '—', stopLoss: '−0.8%', takeProfit: '+1.2%', riskRewardRatio: '1.5:1', timeHorizon: 'intraday', invalidation: '—' },
        bearish: { trigger: 'If claims miss (higher)', asset: 'SPX', entry: '—', stopLoss: '+0.8%', takeProfit: '−1.2%', riskRewardRatio: '1.5:1', timeHorizon: 'intraday', invalidation: '—' },
        alternativeAssets: { ifBeat: [], ifMiss: [] }
      },
      summary: 'Demo: Jobless claims Tier 2. Connect OpenAI for full scenario and level analysis.'
    }
  }
];

// ═══════════════════════════════════════════════════════════════════
// LIVE NOW — AWAITING RELEASE (actual henüz yok, canlı pencerede)
// ═══════════════════════════════════════════════════════════════════

const LiveAwaitingCard = ({ event, analysis, minutesUntilRelease }: { event: any; analysis: any; minutesUntilRelease: number }) => {
  const [expanded, setExpanded] = useState(false);
  const tier = analysis?.eventClassification?.tier ?? 2;
  const conviction = analysis?.preEventStrategy?.conviction ?? 5;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(245,158,11,0.05) 100%)',
      border: '1px solid rgba(239,68,68,0.35)',
      borderRadius: '16px',
      padding: '1.25rem',
      marginBottom: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
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
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', animation: 'pulse 1.5s infinite' }} />
        <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
          LIVE — {minutesUntilRelease > 0 ? `DATA IN ${minutesUntilRelease} MIN` : 'DATA EXPECTED SHORTLY'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '2rem' }}>{getCountryFlag(event.country)}</span>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{event.name}</h3>
          {(() => {
            const cardConfig = getEventCardConfig(event);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{cardConfig.labels[1]}: {cardConfig.values[1]}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{cardConfig.labels[2]}: {cardConfig.values[2]}</span>
                <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>TIER {tier}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Conviction {conviction}/10</span>
              </div>
            );
          })()}
          {analysis?.summary && !String(analysis.summary).includes('OPENAI_API_KEY') && (
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>{analysis.summary}</p>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              marginTop: '0.75rem',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '0.5rem 0.9rem',
              color: '#fff',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Hide' : 'Show'} scenarios & trade setup
          </button>
          {expanded && analysis?.tradeSetup && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
              {analysis.tradeSetup.bullish && (
                <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'rgba(34,197,94,0.1)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.35rem' }}>BULLISH</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>{analysis.tradeSetup.bullish.trigger}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Entry/Stop/Target in expand</div>
                </div>
              )}
              {analysis.tradeSetup.bearish && (
                <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.35rem' }}>BEARISH</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>{analysis.tradeSetup.bearish.trigger}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

const LiveEventHero = ({ event, analysis, minutesAgo }: { event: any; analysis: any; minutesAgo: number }) => {
  const [expanded, setExpanded] = useState(false);
  const surprise = analysis?.surprise_assessment || 'in_line';
  
  const surpriseConfig: Record<string, { gradient: string; border: string; icon: any; text: string; color: string }> = {
    major_upside: { gradient: 'linear-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(34,197,94,0.05) 100%)', border: '#22C55E', icon: TrendingUp, text: 'MAJOR BEAT', color: '#22C55E' },
    minor_upside: { gradient: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.03) 100%)', border: '#22C55E', icon: TrendingUp, text: 'BEAT EXPECTATIONS', color: '#22C55E' },
    in_line: { gradient: 'linear-gradient(135deg, rgba(156,163,175,0.15) 0%, rgba(156,163,175,0.03) 100%)', border: '#9CA3AF', icon: Target, text: 'AS EXPECTED', color: '#9CA3AF' },
    minor_downside: { gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.03) 100%)', border: '#EF4444', icon: TrendingDown, text: 'MISSED EXPECTATIONS', color: '#EF4444' },
    major_downside: { gradient: 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(239,68,68,0.05) 100%)', border: '#EF4444', icon: TrendingDown, text: 'MAJOR MISS', color: '#EF4444' }
  };
  
  const config = surpriseConfig[surprise] || surpriseConfig.in_line;
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

      {/* Live Badge */}
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
          background: '#EF4444',
          animation: 'pulse 1s infinite',
          boxShadow: '0 0 15px rgba(239,68,68,0.8)'
        }} />
        <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
          JUST RELEASED • {minutesAgo < 60 ? `${minutesAgo}m` : `${Math.floor(minutesAgo/60)}h ${minutesAgo%60}m`} ago
        </span>
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
            <span style={{ fontSize: '2rem' }}>{getCountryFlag(event.country)}</span>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {event.name}
              </h2>
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

          {/* Data Cards — event türüne göre etiket ve değer (macro: Actual/Forecast/Previous; earnings: EPS; ipo: Price Range/Exchange/Date) */}
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

          {/* AI Analysis Headline */}
          {analysis?.headline && (
            <div style={{
              background: 'rgba(0,245,255,0.1)',
              borderLeft: '4px solid #00F5FF',
              borderRadius: '0 12px 12px 0',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: 'rgba(0,245,255,0.9)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em' }}>FibAlgo — Agent Ready</span>
              </div>
              <p style={{ color: '#fff', fontSize: '0.95rem', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                {analysis.headline}
              </p>
            </div>
          )}

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

          {/* Expanded Content */}
          {expanded && analysis && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              {/* Scenario Analysis - Pre-event format */}
              {(analysis.scenarios || analysis.scenario_mapping) && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: '#00F5FF', fontSize: '0.8rem', margin: '0 0 0.75rem', letterSpacing: '1px' }}>
                    SCENARIO ANALYSIS
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                    {Object.entries(analysis.scenarios || analysis.scenario_mapping).slice(0, 5).map(([scenario, data]: [string, any]) => {
                      const isPositive = scenario.toLowerCase().includes('beat');
                      const isNegative = scenario.toLowerCase().includes('miss');
                      const color = isPositive ? '#22C55E' : isNegative ? '#EF4444' : '#9CA3AF';
                      return (
                        <div key={scenario} style={{
                          background: `${color}15`,
                          borderRadius: '8px',
                          padding: '0.65rem',
                          border: `1px solid ${color}30`
                        }}>
                          <div style={{ color, fontSize: '0.65rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                            {scenario.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim().toUpperCase()}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                            {data?.threshold || data?.probability || ''}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                            {data?.expectedReaction?.duration || data?.description || ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trade Setups - Bullish/Bearish format */}
              {(analysis.tradeSetup?.bullish || analysis.tradeSetup?.bearish) && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: '#8B5CF6', fontSize: '0.8rem', margin: '0 0 0.75rem', letterSpacing: '1px' }}>
                    TRADE SETUPS
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {analysis.tradeSetup?.bullish && (
                      <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 700 }}>🟢 BULLISH</span>
                          {analysis.tradeSetup.bullish.riskRewardRatio && (
                            <span style={{ color: '#22C55E', fontSize: '0.7rem' }}>R/R {analysis.tradeSetup.bullish.riskRewardRatio}</span>
                          )}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', lineHeight: 1.6 }}>
                          <div><strong>Trigger:</strong> {analysis.tradeSetup.bullish.trigger}</div>
                          <div><strong>Entry:</strong> {analysis.tradeSetup.bullish.entry} | <strong>Stop:</strong> <span style={{color:'#EF4444'}}>{analysis.tradeSetup.bullish.stopLoss}</span> | <strong>Target:</strong> <span style={{color:'#22C55E'}}>{analysis.tradeSetup.bullish.takeProfit}</span></div>
                          {analysis.tradeSetup.bullish.invalidation && <div style={{fontStyle:'italic',color:'rgba(255,255,255,0.5)'}}>⚠️ {analysis.tradeSetup.bullish.invalidation}</div>}
                        </div>
                      </div>
                    )}
                    {analysis.tradeSetup?.bearish && (
                      <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 700 }}>🔴 BEARISH</span>
                          {analysis.tradeSetup.bearish.riskRewardRatio && (
                            <span style={{ color: '#EF4444', fontSize: '0.7rem' }}>R/R {analysis.tradeSetup.bearish.riskRewardRatio}</span>
                          )}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', lineHeight: 1.6 }}>
                          <div><strong>Trigger:</strong> {analysis.tradeSetup.bearish.trigger}</div>
                          <div><strong>Entry:</strong> {analysis.tradeSetup.bearish.entry} | <strong>Stop:</strong> <span style={{color:'#EF4444'}}>{analysis.tradeSetup.bearish.stopLoss}</span> | <strong>Target:</strong> <span style={{color:'#22C55E'}}>{analysis.tradeSetup.bearish.takeProfit}</span></div>
                          {analysis.tradeSetup.bearish.invalidation && <div style={{fontStyle:'italic',color:'rgba(255,255,255,0.5)'}}>⚠️ {analysis.tradeSetup.bearish.invalidation}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Alternative Assets */}
              {analysis.tradeSetup?.alternativeAssets && (analysis.tradeSetup.alternativeAssets.ifBeat || analysis.tradeSetup.alternativeAssets.ifMiss) && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: '#8B5CF6', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>ALTERNATIVE TRADES</h4>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {analysis.tradeSetup.alternativeAssets.ifBeat && (
                      <div>
                        <span style={{ color: '#22C55E', fontSize: '0.7rem' }}>IF BEAT: </span>
                        {analysis.tradeSetup.alternativeAssets.ifBeat.map((a: any, i: number) => (
                          <span key={i} style={{ color: a.direction === 'long' ? '#22C55E' : '#EF4444', marginRight: '0.5rem', fontSize: '0.75rem' }}>
                            {a.direction?.toUpperCase()} {a.asset}
                          </span>
                        ))}
                      </div>
                    )}
                    {analysis.tradeSetup.alternativeAssets.ifMiss && (
                      <div>
                        <span style={{ color: '#EF4444', fontSize: '0.7rem' }}>IF MISS: </span>
                        {analysis.tradeSetup.alternativeAssets.ifMiss.map((a: any, i: number) => (
                          <span key={i} style={{ color: a.direction === 'long' ? '#22C55E' : '#EF4444', marginRight: '0.5rem', fontSize: '0.75rem' }}>
                            {a.direction?.toUpperCase()} {a.asset}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Post-event: Implications */}
              {analysis.immediate_implications && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: '#00F5FF', fontSize: '0.8rem', margin: '0 0 0.75rem', letterSpacing: '1px' }}>
                    MARKET IMPLICATIONS
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(analysis.immediate_implications).map(([key, value]: [string, any]) => (
                      <div key={key} style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '0.75rem'
                      }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div style={{ color: '#fff', fontSize: '0.85rem' }}>
                          {typeof value === 'string' ? value : value?.direction || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary / Key Takeaway */}
              {(analysis.summary || analysis.key_takeaway) && (
                <div style={{
                  background: 'rgba(139,92,246,0.15)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  borderLeft: '3px solid #8B5CF6'
                }}>
                  <div style={{ color: '#8B5CF6', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>
                    {analysis.summary ? 'SUMMARY' : 'KEY TAKEAWAY'}
                  </div>
                  <p style={{ color: '#fff', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                    {analysis.summary || analysis.key_takeaway}
                  </p>
                </div>
              )}
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

const UpcomingEventCard = ({ event, analysis, hoursUntil }: { event: any; analysis: any; hoursUntil: number }) => {
  const [expanded, setExpanded] = useState(false);
  
  const tierColors: Record<number | string, { bg: string; border: string; text: string }> = {
    1: { bg: 'rgba(239,68,68,0.12)', border: '#EF4444', text: 'TIER 1' },
    2: { bg: 'rgba(245,158,11,0.12)', border: '#F59E0B', text: 'TIER 2' },
    3: { bg: 'rgba(59,130,246,0.12)', border: '#3B82F6', text: 'TIER 3' },
    'tier1_market_mover': { bg: 'rgba(239,68,68,0.12)', border: '#EF4444', text: 'TIER 1' },
    'tier2_significant': { bg: 'rgba(245,158,11,0.12)', border: '#F59E0B', text: 'TIER 2' },
    'tier3_moderate': { bg: 'rgba(59,130,246,0.12)', border: '#3B82F6', text: 'TIER 3' }
  };
  
  // API returns eventClassification.tier as number (1,2,3) or string
  const tier = analysis?.eventClassification?.tier || analysis?.event_classification?.tier || 3;
  const tierConfig = tierColors[tier] || tierColors[3];
  // API returns preEventStrategy.conviction
  const conviction = analysis?.preEventStrategy?.conviction || analysis?.conviction_score || 5;
  const strategy = analysis?.preEventStrategy?.recommendedApproach || analysis?.trade_setup?.primary_strategy || '';
  
  // Time formatting - fix grammar
  const timeDisplay = hoursUntil < 1 
    ? `${Math.round(hoursUntil * 60)} minute${Math.round(hoursUntil * 60) !== 1 ? 's' : ''}` 
    : hoursUntil < 24 
      ? `${Math.round(hoursUntil)} hour${Math.round(hoursUntil) !== 1 ? 's' : ''}`
      : `${Math.round(hoursUntil / 24)} day${Math.round(hoursUntil / 24) !== 1 ? 's' : ''}`;

  return (
    <div 
      onClick={() => analysis && setExpanded(!expanded)}
      style={{
        background: expanded ? 'rgba(0,245,255,0.05)' : 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        border: `1px solid ${expanded ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '0.75rem',
        transition: 'all 0.25s ease',
        cursor: analysis ? 'pointer' : 'default'
      }}
    >
      {/* Main Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1 }}>
          {/* Flag */}
          <span style={{ fontSize: '2rem' }}>{getCountryFlag(event.country)}</span>
          
          <div style={{ flex: 1 }}>
            {/* Title & Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                {event.name}
              </h4>
              <span style={{
                background: tierConfig.bg,
                border: `1px solid ${tierConfig.border}`,
                color: tierConfig.border,
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                letterSpacing: '0.5px'
              }}>
                {tierConfig.text}
              </span>
              {analysis && (
                <span style={{ color: 'rgba(0,245,255,0.9)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.02em' }}>
                  FibAlgo — Agent Ready
                </span>
              )}
            </div>
            
            {/* Countdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <Timer size={14} color="#00F5FF" />
              <span style={{ 
                color: hoursUntil < 2 ? '#EF4444' : '#00F5FF', 
                fontSize: '0.85rem', 
                fontWeight: 600,
                animation: hoursUntil < 2 ? 'pulse 1s infinite' : 'none'
              }}>
                {timeDisplay} until release
              </span>
            </div>

            {/* Conviction & Strategy Row */}
            {analysis && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                {/* Conviction Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Conviction</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                      <div key={i} style={{
                        width: '7px',
                        height: '14px',
                        borderRadius: '2px',
                        background: i <= conviction 
                          ? (conviction >= 8 ? '#22C55E' : conviction >= 5 ? '#F59E0B' : '#6B7280')
                          : 'rgba(255,255,255,0.1)',
                        transition: 'all 0.2s'
                      }} />
                    ))}
                  </div>
                  <span style={{ 
                    color: conviction >= 8 ? '#22C55E' : conviction >= 5 ? '#F59E0B' : '#6B7280',
                    fontSize: '0.85rem', 
                    fontWeight: 700 
                  }}>
                    {conviction}/10
                  </span>
                </div>

                {/* Strategy Badge */}
                {strategy && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'rgba(139,92,246,0.15)',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(139,92,246,0.3)'
                  }}>
                    <Target size={12} color="#8B5CF6" />
                    <span style={{ color: '#8B5CF6', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>
                      {strategy.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side — event türüne göre etiket ve değer (macro: Forecast/Previous; earnings: EPS Est./Prev.; ipo: Exchange/Date) */}
        {(() => {
          const cardConfig = getEventCardConfig(event);
          return (
            <div style={{ textAlign: 'right', minWidth: '100px' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '0.25rem' }}>{cardConfig.labels[1]}</div>
              <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>{cardConfig.values[1]}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{cardConfig.labels[2].toLowerCase()}: {cardConfig.values[2]}</div>
            </div>
          );
        })()}
      </div>

      {/* Expanded Analysis Section */}
      {expanded && analysis && (
        <div style={{
          marginTop: '1.25rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Scenario Grid - API returns "scenarios" object */}
          {(analysis.scenarios || analysis.scenario_mapping) && (
            <div style={{ marginBottom: '1rem' }}>
              <h5 style={{ color: '#00F5FF', fontSize: '0.75rem', margin: '0 0 0.75rem', letterSpacing: '1px' }}>
                SCENARIO ANALYSIS
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {Object.entries(analysis.scenarios || analysis.scenario_mapping).slice(0, 5).map(([scenario, data]: [string, any]) => {
                  const scenarioColors: Record<string, { bg: string; border: string; icon: any }> = {
                    bigBeat: { bg: 'rgba(34,197,94,0.1)', border: '#22C55E', icon: TrendingUp },
                    smallBeat: { bg: 'rgba(34,197,94,0.08)', border: '#86EFAC', icon: TrendingUp },
                    inline: { bg: 'rgba(156,163,175,0.1)', border: '#9CA3AF', icon: Target },
                    smallMiss: { bg: 'rgba(239,68,68,0.08)', border: '#FCA5A5', icon: TrendingDown },
                    bigMiss: { bg: 'rgba(239,68,68,0.1)', border: '#EF4444', icon: TrendingDown },
                    above_forecast: { bg: 'rgba(34,197,94,0.1)', border: '#22C55E', icon: TrendingUp },
                    in_line: { bg: 'rgba(156,163,175,0.1)', border: '#9CA3AF', icon: Target },
                    below_forecast: { bg: 'rgba(239,68,68,0.1)', border: '#EF4444', icon: TrendingDown }
                  };
                  const sConfig = scenarioColors[scenario] || scenarioColors.inline;
                  const SIcon = sConfig.icon;
                  
                  // Format scenario name for display
                  const displayName = scenario
                    .replace(/([A-Z])/g, ' $1') // camelCase to words
                    .replace(/_/g, ' ')
                    .trim()
                    .toUpperCase();
                  
                  return (
                    <div key={scenario} style={{
                      background: sConfig.bg,
                      borderRadius: '10px',
                      padding: '0.85rem',
                      border: `1px solid ${sConfig.border}30`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <SIcon size={14} color={sConfig.border} />
                        <span style={{ color: sConfig.border, fontSize: '0.7rem', fontWeight: 700 }}>
                          {displayName}
                        </span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                        {data?.threshold || data?.probability || ''}
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                        {data?.expectedReaction?.duration || data?.market_reaction || data?.description || '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trade Setup - NEW FORMAT with Bullish/Bearish */}
          {(analysis.tradeSetup || analysis.trade_setup) && (
            <div style={{
              background: 'rgba(139,92,246,0.08)',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid rgba(139,92,246,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Target size={16} color="#8B5CF6" />
                <span style={{ color: '#8B5CF6', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>TRADE SETUPS</span>
              </div>
              
              {/* New Format: Bullish & Bearish */}
              {(analysis.tradeSetup?.bullish || analysis.tradeSetup?.bearish) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Bullish Setup */}
                  {analysis.tradeSetup?.bullish && (
                    <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <TrendingUp size={14} color="#22C55E" />
                        <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 700 }}>BULLISH SETUP</span>
                        {analysis.tradeSetup.bullish.riskRewardRatio && (
                          <span style={{ marginLeft: 'auto', background: 'rgba(34,197,94,0.2)', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#22C55E', fontSize: '0.7rem', fontWeight: 600 }}>
                            R/R {analysis.tradeSetup.bullish.riskRewardRatio}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Trigger:</span> <span style={{ color: '#fff' }}>{analysis.tradeSetup.bullish.trigger}</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Asset:</span> <span style={{ color: '#22C55E', fontWeight: 600 }}>LONG {analysis.tradeSetup.bullish.asset}</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Entry:</span> <span style={{ color: '#fff' }}>{analysis.tradeSetup.bullish.entry}</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Time:</span> <span style={{ color: '#fff' }}>{analysis.tradeSetup.bullish.timeHorizon}</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Stop:</span> <span style={{ color: '#EF4444' }}>{analysis.tradeSetup.bullish.stopLoss}</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Target:</span> <span style={{ color: '#22C55E' }}>{analysis.tradeSetup.bullish.takeProfit}</span></div>
                      </div>
                      {analysis.tradeSetup.bullish.invalidation && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                          ⚠️ Invalidation: {analysis.tradeSetup.bullish.invalidation}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Bearish Setup */}
                  {analysis.tradeSetup?.bearish && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <TrendingDown size={14} color="#EF4444" />
                        <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 700 }}>BEARISH SETUP</span>
                        {analysis.tradeSetup.bearish.riskRewardRatio && (
                          <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.2)', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#EF4444', fontSize: '0.7rem', fontWeight: 600 }}>
                            R/R {analysis.tradeSetup.bearish.riskRewardRatio}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Trigger:</span> <span style={{ color: '#fff' }}>{analysis.tradeSetup.bearish.trigger}</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Asset:</span> <span style={{ color: '#EF4444', fontWeight: 600 }}>SHORT {analysis.tradeSetup.bearish.asset}</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Entry:</span> <span style={{ color: '#fff' }}>{analysis.tradeSetup.bearish.entry}</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Time:</span> <span style={{ color: '#fff' }}>{analysis.tradeSetup.bearish.timeHorizon}</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Stop:</span> <span style={{ color: '#EF4444' }}>{analysis.tradeSetup.bearish.stopLoss}</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Target:</span> <span style={{ color: '#22C55E' }}>{analysis.tradeSetup.bearish.takeProfit}</span></div>
                      </div>
                      {analysis.tradeSetup.bearish.invalidation && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                          ⚠️ Invalidation: {analysis.tradeSetup.bearish.invalidation}
                        </div>
                      )}
                    </div>
                  )}
                  
                  
                  {/* Inline - No Trade */}
                  {analysis.tradeSetup?.inline && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: 700 }}>INLINE SCENARIO</span>
                      </div>
                      <p style={{ color: '#F59E0B', fontSize: '0.8rem', margin: 0, fontWeight: 500 }}>
                        No Trade - {analysis.tradeSetup.inline.reason || 'Wait for clearer signal'}
                      </p>
                    </div>
                  )}
                  
                  {/* Alternative Assets - New Format (ifBeat/ifMiss) */}
                  {analysis.tradeSetup?.alternativeAssets && (analysis.tradeSetup.alternativeAssets.ifBeat || analysis.tradeSetup.alternativeAssets.ifMiss) && (
                    <div style={{ background: 'rgba(139,92,246,0.1)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(139,92,246,0.15)' }}>
                      <div style={{ color: '#8B5CF6', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem' }}>ALTERNATIVE TRADES</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {analysis.tradeSetup.alternativeAssets.ifBeat && analysis.tradeSetup.alternativeAssets.ifBeat.length > 0 && (
                          <div>
                            <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 600 }}>IF BEAT: </span>
                            {analysis.tradeSetup.alternativeAssets.ifBeat.map((alt: { asset: string; direction: string; rationale: string }, i: number) => (
                              <span key={i} style={{ 
                                background: 'rgba(34,197,94,0.15)', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                marginRight: '0.5rem'
                              }}>
                                <span style={{ color: alt.direction === 'long' ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
                                  {alt.direction?.toUpperCase()} {alt.asset}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                        {analysis.tradeSetup.alternativeAssets.ifMiss && analysis.tradeSetup.alternativeAssets.ifMiss.length > 0 && (
                          <div>
                            <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 600 }}>IF MISS: </span>
                            {analysis.tradeSetup.alternativeAssets.ifMiss.map((alt: { asset: string; direction: string; rationale: string }, i: number) => (
                              <span key={i} style={{ 
                                background: 'rgba(239,68,68,0.15)', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                marginRight: '0.5rem'
                              }}>
                                <span style={{ color: alt.direction === 'long' ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
                                  {alt.direction?.toUpperCase()} {alt.asset}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Alternative Assets - Legacy Format (array) */}
                  {analysis.tradeSetup?.alternativeAssets && Array.isArray(analysis.tradeSetup.alternativeAssets) && analysis.tradeSetup.alternativeAssets.length > 0 && (
                    <div style={{ background: 'rgba(139,92,246,0.1)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(139,92,246,0.15)' }}>
                      <div style={{ color: '#8B5CF6', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.5rem' }}>ALTERNATIVE TRADES</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {analysis.tradeSetup.alternativeAssets.map((alt: { asset: string; direction: string; correlation: string; conviction: number }, i: number) => (
                          <div key={i} style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            padding: '0.35rem 0.6rem', 
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                          }}>
                            <span style={{ color: alt.direction === 'long' ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
                              {alt.direction?.toUpperCase()} {alt.asset}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '0.5rem' }}>{alt.correlation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Legacy Format - backwards compatibility */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  {/* Direction & Asset */}
                  {(analysis.tradeSetup?.direction || analysis.tradeSetup?.asset) && (
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '0.35rem' }}>DIRECTION</div>
                      <p style={{ color: analysis.tradeSetup?.direction === 'long' ? '#22C55E' : analysis.tradeSetup?.direction === 'short' ? '#EF4444' : '#fff', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
                        {analysis.tradeSetup?.direction?.toUpperCase() || '—'} {analysis.tradeSetup?.asset || ''}
                      </p>
                    </div>
                  )}
                  {/* Entry Condition */}
                  {(analysis.tradeSetup?.entryCondition || analysis.trade_setup?.entry_triggers) && (
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '0.35rem' }}>ENTRY</div>
                      <p style={{ color: '#fff', fontSize: '0.85rem', margin: 0 }}>
                        {analysis.tradeSetup?.entryCondition || 
                         (Array.isArray(analysis.trade_setup?.entry_triggers) 
                          ? analysis.trade_setup.entry_triggers.join(', ')
                          : analysis.trade_setup?.entry_triggers)}
                      </p>
                    </div>
                  )}
                  {/* Stop Loss */}
                  {(analysis.tradeSetup?.stopLoss || analysis.trade_setup?.risk_management) && (
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '0.35rem' }}>STOP LOSS</div>
                      <p style={{ color: '#EF4444', fontSize: '0.85rem', margin: 0 }}>
                        {analysis.tradeSetup?.stopLoss ||
                         (typeof analysis.trade_setup?.risk_management === 'string'
                          ? analysis.trade_setup.risk_management
                          : analysis.trade_setup?.risk_management?.stop_loss || '—')}
                      </p>
                    </div>
                  )}
                  {/* Take Profit */}
                  {analysis.tradeSetup?.takeProfit && (
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '0.35rem' }}>TAKE PROFIT</div>
                      <p style={{ color: '#22C55E', fontSize: '0.85rem', margin: 0 }}>
                        {analysis.tradeSetup.takeProfit}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Summary */}
          {analysis.summary && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,245,255,0.05)', borderRadius: '8px', border: '1px solid rgba(0,245,255,0.1)' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
                {analysis.summary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Expand indicator */}
      {analysis && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '0.75rem'
        }}>
          {expanded ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />}
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
            FibAlgo — Agent Ready
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
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('high');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [calendarEmptyMessage, setCalendarEmptyMessage] = useState<string | null>(null);
  // Event Analysis States (liveEvent: post-event + live-awaiting karışık; render'da hasActual ile ayrılıyor)
  const [eventAnalyses, setEventAnalyses] = useState<{
    preEvent: Array<{ event: any; analysis: any; hoursUntil: number }>;
    liveEvent: Array<{ event: any; analysis: any; minutesAgo?: number; minutesUntilRelease?: number; hasActual?: boolean }>;
    isDemo?: boolean;
  }>({ preEvent: [], liveEvent: [] });
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);

  // Geçmiş event tıklanınca popup: DB'den pre + post analizi
  const [eventModalData, setEventModalData] = useState<{
    event: CalendarEvent;
    apiEvent: { name: string; date: string; actual?: string | number; forecast?: string | number; previous?: string | number; country?: string; currency?: string; surprise_direction?: string; surprise_category?: string } | null;
    preAnalysis: Record<string, unknown> | null;
    postAnalysis: Record<string, unknown> | null;
  } | null>(null);
  const [loadingEventModal, setLoadingEventModal] = useState(false);

  const openEventModal = async (event: CalendarEvent) => {
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
      
      const dateToUse = selectedDateRef.current;
      const weekStart = new Date(dateToUse);
      weekStart.setDate(dateToUse.getDate() - dateToUse.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const from = toLocalDateString(weekStart);
      const to = toLocalDateString(weekEnd);

      const response = await fetch(`/api/calendar?from=${from}&to=${to}&type=all`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
        setLastUpdated(new Date());
        setCalendarEmptyMessage(data.events?.length === 0 && data.message ? data.message : null);
        fetchEventAnalyses(data.events);
        // Update cache
        setTerminalCache({
          calendar: { events: data.events, timestamp: Date.now() }
        });
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Event analiz kartları şu an sadece DEMO — analiz API çağrılmıyor (model eğitilecek)
  const fetchEventAnalyses = async (_eventList: CalendarEvent[]) => {
    setLoadingAnalyses(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setEventAnalyses({
        preEvent: DEMO_UPCOMING_ITEMS,
        liveEvent: [...DEMO_POST_EVENT_ITEMS, ...DEMO_LIVE_AWAITING_ITEMS],
        isDemo: true
      });
    } finally {
      setLoadingAnalyses(false);
    }
  };

  // Seçilen gün değişince o haftanın event'lerini API'den çek. Zaten listeyi gösteriyorsak skeleton yok (pır pır önlenir)
  useEffect(() => {
    fetchCalendar(true, events.length > 0);
  }, [selectedDate.toDateString()]);

  // Gerçek zamanlı yenileme: her 60 saniyede arka planda güncelle (liste saklanır, pır pır olmaz)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCalendar(true, true);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedDate.toDateString()]);

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
  const selectedDayEvents = filteredEvents.filter(e => e.date === selectedDateStr);
  const groupedEvents = groupEventsByDate(selectedDayEvents);
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const countries = [...new Set(events.map(e => e.country).filter(Boolean))];

  const goToDay = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const formatDateLabel = () => selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#000' }}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER — Ortak (her iki sütunun üstünde, tam genişlik) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <header style={{
        flexShrink: 0,
        background: 'linear-gradient(180deg, #000 0%, #000 90%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '1rem 1.5rem',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(0,245,255,0.2), rgba(139,92,246,0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(0,245,255,0.3)'
          }}>
            <Clock size={26} color="#00F5FF" />
          </div>
          <div>
            <h1 style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.25rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em', textShadow: '0 0 6px rgba(255,255,255,0.08)' }}>
              Economic Calendar
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>
              FibAlgo — Agent Ready • {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}` : 'Loading...'}
            </p>
          </div>
        </div>

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
            <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>{formatDateLabel()}</div>
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
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FILTERS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '1rem 1.5rem',
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.35rem' }}>
          {(['all', 'high', 'medium'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: filter === f ? 'rgba(0,245,255,0.2)' : 'transparent',
              color: filter === f ? '#00F5FF' : 'rgba(255,255,255,0.6)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              {f === 'all' ? 'All Events' : f === 'high' ? '🔴 High Impact' : '🟠 Medium+'}
            </button>
          ))}
        </div>

        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} style={{
          background: '#0A0A0F',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '10px',
          padding: '0.5rem 1rem',
          color: '#fff',
          fontSize: '0.85rem',
          cursor: 'pointer'
        }}>
          <option value="all">🌍 All Countries</option>
          {countries.map(c => <option key={c} value={c}>{getCountryFlag(c)} {c}</option>)}
        </select>

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
        gridTemplateColumns: '95px 48px 55px 1fr 100px 100px 100px',
        gap: '0.5rem',
        padding: '0.85rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        position: 'sticky',
        top: 0,
        zIndex: 9
      }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600 }}></div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Impact</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actual</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Forecast</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Previous</div>
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
                  <div key={event.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '95px 48px 55px 1fr 100px 100px 100px',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => openEventModal(event)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                    <div style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }} title={event.country}>
                      {getCountryFlag(event.country)}
                    </div>
                    <div><ImpactIndicator importance={event.importance} /></div>
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
                        {event.importance === 'high' && (
                          <span style={{
                            flexShrink: 0,
                            color: 'rgba(0,245,255,0.85)',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            letterSpacing: '0.02em'
                          }}>
                            FibAlgo — Agent Ready
                          </span>
                        )}
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
        <div style={{ padding: '0 0 1rem 0' }}>
          <AIPowerHeader 
            preCount={eventAnalyses.preEvent.length} 
            postCount={eventAnalyses.liveEvent.filter(e => e.hasActual).length}
            loading={loadingAnalyses}
          />
        </div>
        {eventAnalyses.liveEvent.filter(e => e.hasActual).length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Flame size={20} color="#EF4444" style={{ animation: 'pulse 1s infinite' }} />
              <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                JUST RELEASED / POST EVENT
              </span>
              {eventAnalyses.isDemo && (
                <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px', letterSpacing: '0.5px' }}>DEMO</span>
              )}
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(239,68,68,0.5) 0%, transparent 100%)' }} />
            </div>
            {eventAnalyses.liveEvent.filter(e => e.hasActual).map((item, index) => (
              <LiveEventHero
                key={`post-${index}`}
                event={item.event}
                analysis={item.analysis}
                minutesAgo={item.minutesAgo ?? 0}
              />
            ))}
          </div>
        )}
        {eventAnalyses.preEvent.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Eye size={20} color="#00F5FF" />
              <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                UPCOMING HIGH-IMPACT EVENTS
              </span>
              {eventAnalyses.isDemo && (
                <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px', letterSpacing: '0.5px' }}>DEMO</span>
              )}
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(0,245,255,0.5) 0%, transparent 100%)' }} />
            </div>
            {eventAnalyses.preEvent.map((item, index) => (
              <UpcomingEventCard 
                key={`upcoming-${index}`}
                event={item.event}
                analysis={item.analysis}
                hoursUntil={item.hoursUntil}
              />
            ))}
          </div>
        )}
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
                      <span style={{ fontSize: '1.5rem' }}>{getCountryFlag(eventModalData.event.country)}</span>
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

                <div style={{ padding: '1.5rem' }}>
                  {!eventModalData.preAnalysis && !eventModalData.postAnalysis ? (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
                      No analysis stored for this event. Pre-event and post-event analyses are saved to the database when AI analysis runs.
                    </p>
                  ) : (
                    <>
                      {eventModalData.preAnalysis && (
                        <section style={{ marginBottom: '1.5rem' }}>
                          <h3 style={{ color: '#00F5FF', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Pre-Event Analysis
                          </h3>
                          <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '1rem 1.25rem',
                          }}>
                            {(eventModalData.preAnalysis as any).summary && (
                              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 0.75rem 0' }}>
                                {(eventModalData.preAnalysis as any).summary}
                              </p>
                            )}
                            {(eventModalData.preAnalysis as any).raw_analysis?.scenarios && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Scenarios</div>
                                <pre style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
                                  {JSON.stringify((eventModalData.preAnalysis as any).raw_analysis.scenarios, null, 2)}
                                </pre>
                              </div>
                            )}
                            {(eventModalData.preAnalysis as any).raw_analysis?.tradeSetup && (
                              <div style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.35rem' }}>Trade setup</div>
                                {JSON.stringify((eventModalData.preAnalysis as any).raw_analysis.tradeSetup)}
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                      {eventModalData.postAnalysis && (
                        <section>
                          <h3 style={{ color: '#F59E0B', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Post-Event Analysis
                          </h3>
                          <div style={{
                            background: 'rgba(245,158,11,0.06)',
                            border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: '12px',
                            padding: '1rem 1.25rem',
                          }}>
                            {(eventModalData.postAnalysis as any).summary && (
                              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 0.75rem 0' }}>
                                {(eventModalData.postAnalysis as any).summary}
                              </p>
                            )}
                            {(eventModalData.postAnalysis as any).headline_assessment && (
                              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                <strong>Headline:</strong> {(eventModalData.postAnalysis as any).headline_assessment}
                              </p>
                            )}
                            {(eventModalData.postAnalysis as any).raw_analysis?.implications && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Implications</div>
                                <pre style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
                                  {JSON.stringify((eventModalData.postAnalysis as any).raw_analysis.implications, null, 2)}
                                </pre>
                              </div>
                            )}
                            {(eventModalData.postAnalysis as any).trade_reasoning && (
                              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                                <strong>Trade:</strong> {(eventModalData.postAnalysis as any).trade_reasoning}
                              </p>
                            )}
                          </div>
                        </section>
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
          <span style={{ color: 'rgba(0,245,255,0.9)', fontWeight: 600, fontSize: '0.85rem' }}>FibAlgo — Agent Ready</span>
        </div>
      </div>

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
