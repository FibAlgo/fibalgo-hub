'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Brain,
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

// Event date+time (UTC, FMP API) → timestamp for filter/sort
const eventUtcTime = (date: string, time?: string): number => {
  if (!date) return 0;
  const raw = (time || '00:00').trim().slice(0, 8);
  const timeForIso = raw.length <= 5 ? `${raw}:00` : raw;
  const utc = new Date(`${date}T${timeForIso}Z`);
  return Number.isNaN(utc.getTime()) ? 0 : utc.getTime();
};

// UTC date+time → kullanıcının yerel saatine göre format (terminal ile aynı)
const formatEventLocalTime = (date: string, time?: string): string => {
  if (!date) return '—';
  const raw = (time || '00:00').trim().slice(0, 8);
  const timeForIso = raw.length <= 5 ? `${raw}:00` : raw;
  const iso = `${date}T${timeForIso}Z`;
  const utc = new Date(iso);
  if (Number.isNaN(utc.getTime())) return time ? `${date} · ${time}` : date;
  const d = utc.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const t = time ? utc.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
  return t ? `${d} · ${t}` : d;
};

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
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return { day: 'Today', date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isToday: true };
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return { day: 'Tomorrow', date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isToday: false };
  }
  return { 
    day: date.toLocaleDateString('en-US', { weekday: 'short' }), 
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
      summary: 'Demo: Event in live window, awaiting release. Add OPENAI_API_KEY for full pre-event analysis.'
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
      summary: 'Demo: FOMC Tier 1 event. Wait for release then trade reaction. Add OPENAI_API_KEY for full pre-event analysis.'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Forecast: {event.forecast ?? '—'}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Previous: {event.previous ?? '—'}</span>
            <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>TIER {tier}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Conviction {conviction}/10</span>
          </div>
          {analysis?.summary && (
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

          {/* Data Cards */}
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
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>ACTUAL</div>
              <div style={{ color: config.color, fontSize: '1.75rem', fontWeight: 800 }}>{event.actual || '—'}</div>
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

          {/* AI Analysis Headline */}
          {analysis?.headline && (
            <div style={{
              background: 'rgba(0,245,255,0.1)',
              borderLeft: '4px solid #00F5FF',
              borderRadius: '0 12px 12px 0',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Brain size={16} color="#00F5FF" />
                <span style={{ color: '#00F5FF', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>AI INSTANT ANALYSIS</span>
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
                <span style={{
                  background: 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(139,92,246,0.15))',
                  border: '1px solid rgba(0,245,255,0.3)',
                  color: '#00F5FF',
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  <Brain size={10} />
                  AI READY
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

        {/* Right Side - Expected Values */}
        <div style={{ textAlign: 'right', minWidth: '100px' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '0.25rem' }}>Expected</div>
          <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700 }}>{event.forecast || '—'}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>prev: {event.previous || '—'}</div>
        </div>
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
          <Brain size={28} color="#000" />
        </div>
        <div>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            AI Event Analysis Engine
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>
            Real-time pre & post-event analysis powered by GPT-4
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
  const [analyses, setAnalyses] = useState<{ daily: any | null; weekly: any | null; monthly: any | null; } | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    // If we have cached events, don't show loading
    if (initialCache?.calendar?.events && isCacheValid(initialCache.calendar.timestamp)) {
      return false;
    }
    return true;
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showOutlook, setShowOutlook] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Event Analysis States (liveEvent: post-event + live-awaiting karışık; render'da hasActual ile ayrılıyor)
  const [eventAnalyses, setEventAnalyses] = useState<{
    preEvent: Array<{ event: any; analysis: any; hoursUntil: number }>;
    liveEvent: Array<{ event: any; analysis: any; minutesAgo?: number; minutesUntilRelease?: number; hasActual?: boolean }>;
    isDemo?: boolean;
  }>({ preEvent: [], liveEvent: [] });
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);

  // Fetch calendar data - check cache first
  const fetchCalendar = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cache = getTerminalCache();
        if (cache?.calendar && isCacheValid(cache.calendar.timestamp)) {
          const cachedEvents = cache.calendar.events as CalendarEvent[];
          setEvents(cachedEvents);
          setLastUpdated(new Date(cache.calendar.timestamp));
          setIsLoading(false);
          fetchEventAnalyses(cachedEvents);
          return;
        }
      }
      
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const from = weekStart.toISOString().split('T')[0];
      const to = weekEnd.toISOString().split('T')[0];

      const response = await fetch(`/api/calendar?from=${from}&to=${to}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
        setLastUpdated(new Date());
        if (data.analyses) setAnalyses(data.analyses);
        fetchEventAnalyses(data.events);
        // Update cache
        setTerminalCache({
          calendar: { events: data.events, timestamp: Date.now() }
        });
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Pre-Event and Live Event analyses
  const fetchEventAnalyses = async (eventList: CalendarEvent[]) => {
    console.log('🚀 fetchEventAnalyses called with', eventList.length, 'events');
    setLoadingAnalyses(true);
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      console.log('⏰ Current time:', now.toISOString(), 'Today:', todayStr);
      
      const preEventItems: Array<{ event: any; analysis: any; hoursUntil: number }> = [];
      const liveEventItems: Array<{ event: any; analysis: any; minutesAgo?: number; minutesUntilRelease?: number; hasActual?: boolean }> = [];
      
      // Filter TODAY's high impact macro events only
      const todayHighImpactEvents = eventList.filter(e => 
        e.date === todayStr &&
        e.importance === 'high' && 
        (e.type === 'macro' || !e.type)
      );
      
      console.log('📋 Today high impact events:', todayHighImpactEvents.length, todayHighImpactEvents.map(e => `${e.title} @ ${e.time}`));
      
      // Helper: event datetime as UTC (FMP API)
      const getEventDateTime = (event: CalendarEvent): Date => {
        if (event.time && event.time.includes('T')) return new Date(event.time);
        if (event.time && event.time.match(/^\d{1,2}:\d{2}/)) {
          const timeParts = event.time.match(/^(\d{1,2}):(\d{2})/);
          if (timeParts) {
            const formattedTime = `${timeParts[1].padStart(2, '0')}:${timeParts[2]}`;
            return new Date(`${event.date}T${formattedTime}:00Z`);
          }
        }
        return new Date(`${event.date}T12:00:00Z`);
      };
      
      // Categorize ALL today's events: LIVE (ongoing) vs UPCOMING (future)
      const liveEvents: CalendarEvent[] = [];
      const upcomingEvents: CalendarEvent[] = [];
      
      for (const event of todayHighImpactEvents) {
        const eventStart = getEventDateTime(event);
        const eventEnd = new Date(eventStart.getTime() + 90 * 60 * 1000); // +90 min
        
        console.log(`🔍 ${event.title}: start=${eventStart.toISOString()}, now=${now.toISOString()}`);
        
        if (now >= eventStart && now < eventEnd) {
          // LIVE: Event has started but within 90 minute window
          console.log(`✅ ${event.title} is LIVE`);
          liveEvents.push(event);
        } else if (now < eventStart) {
          // UPCOMING: Event hasn't started yet
          console.log(`📅 ${event.title} is UPCOMING`);
          upcomingEvents.push(event);
        } else {
          console.log(`❌ ${event.title} is PAST (ended)`);
        }
      }
      
      // Sort by time
      upcomingEvents.sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());
      liveEvents.sort((a, b) => getEventDateTime(b).getTime() - getEventDateTime(a).getTime()); // Most recent first
      
      console.log('🔴 LIVE events:', liveEvents.map(e => `${e.title} @ ${e.time}`));
      console.log('📅 UPCOMING events:', upcomingEvents.map(e => `${e.title} @ ${e.time}`));
      
      // Analyze ALL LIVE events (no limit)
      for (const event of liveEvents) {
        const eventStart = getEventDateTime(event);
        const minutesAgo = Math.round((now.getTime() - eventStart.getTime()) / (1000 * 60));
        
        console.log(`🔴 Analyzing LIVE: ${event.title} (${minutesAgo} mins ago)`);
        
        try {
          // If event has actual data, use post-event analysis
          if (event.actual) {
            const response = await fetch('/api/calendar/post-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: event.title,
                releaseTime: eventStart.toISOString(),
                actual: event.actual,
                forecast: event.forecast || 'N/A',
                previous: event.previous || 'N/A',
                country: event.country || 'US',
                currency: event.currency || 'USD'
              })
            });
            const data = await response.json();
            console.log(`🔴 Post-event response for ${event.title}:`, data.success);
            if (data.success && data.analysis) {
              liveEventItems.push({
                event: { name: event.title, date: event.date, time: event.time, country: event.country || 'US', currency: event.currency || 'USD', forecast: event.forecast, previous: event.previous, actual: event.actual, importance: event.importance },
                analysis: data.analysis,
                minutesAgo,
                hasActual: true // This is a true post-event analysis
              });
            }
          } else {
            // No actual data yet - FIRST try to get cached pre-event analysis
            let cachedAnalysis = null;
            try {
              const cacheResponse = await fetch(`/api/calendar/pre-event?event=${encodeURIComponent(event.title)}&date=${event.date}`);
              const cacheData = await cacheResponse.json();
              if (cacheData.success && cacheData.analyses && cacheData.analyses.length > 0) {
                cachedAnalysis = cacheData.analyses[0];
                console.log(`🔴 Using CACHED pre-event analysis for ${event.title}`, cachedAnalysis);
              }
            } catch {
              console.log(`🔴 No cached analysis for ${event.title}, will generate new`);
            }
            
            if (cachedAnalysis) {
              // Use cached analysis - raw_analysis contains the full OpenAI response
              const analysisData = cachedAnalysis.raw_analysis || cachedAnalysis.analysis || cachedAnalysis;
              liveEventItems.push({
                event: { name: event.title, date: event.date, time: event.time, country: event.country || 'US', currency: event.currency || 'USD', forecast: event.forecast, previous: event.previous, importance: event.importance },
                analysis: analysisData,
                minutesAgo,
                minutesUntilRelease: 0, // In live window; data expected shortly
                hasActual: false
              });
            } else {
              // No cache, generate new pre-event analysis
              const response = await fetch('/api/calendar/pre-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: event.title,
                  date: event.date,
                  time: event.time,
                  country: event.country || 'US',
                  currency: event.currency || 'USD',
                  importance: event.importance,
                  forecast: event.forecast || 'N/A',
                  previous: event.previous || 'N/A'
                })
              });
              const data = await response.json();
              console.log(`🔴 Pre-event (for LIVE) response for ${event.title}:`, data.success);
              if (data.success && data.analysis) {
                liveEventItems.push({
                  event: { name: event.title, date: event.date, time: event.time, country: event.country || 'US', currency: event.currency || 'USD', forecast: event.forecast, previous: event.previous, importance: event.importance },
                  analysis: data.analysis,
                  minutesAgo,
                  minutesUntilRelease: 0,
                  hasActual: false
                });
              }
            }
          }
        } catch (err) {
          console.error('Live event analysis failed:', event.title, err);
        }
      }
      
      // Analyze ALL UPCOMING events (no limit)
      for (const event of upcomingEvents) {
        const eventStart = getEventDateTime(event);
        const hoursUntil = Math.round((eventStart.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        console.log(`📅 Analyzing UPCOMING: ${event.title} (in ${hoursUntil}h)`);
        
        try {
          const response = await fetch('/api/calendar/pre-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: event.title,
              date: event.date,
              time: event.time,
              country: event.country || 'US',
              currency: event.currency || 'USD',
              importance: event.importance,
              forecast: event.forecast || 'N/A',
              previous: event.previous || 'N/A'
            })
          });
          const data = await response.json();
          console.log(`📅 Pre-event response for ${event.title}:`, data.success);
          if (data.success && data.analysis) {
            preEventItems.push({
              event: { name: event.title, date: event.date, time: event.time, country: event.country || 'US', currency: event.currency || 'USD', forecast: event.forecast, previous: event.previous, importance: event.importance },
              analysis: data.analysis,
              hoursUntil
            });
          }
        } catch (err) {
          console.error('Pre-event analysis failed:', event.title, err);
        }
      }
      
      // Aktif event yoksa demo kartları göster (chart görünümü için)
      const finalPre = preEventItems.length > 0 ? preEventItems : DEMO_UPCOMING_ITEMS;
      const finalLive = liveEventItems.length > 0
        ? liveEventItems
        : [...DEMO_POST_EVENT_ITEMS, ...DEMO_LIVE_AWAITING_ITEMS];
      const isDemo = finalPre === DEMO_UPCOMING_ITEMS || liveEventItems.length === 0;
      setEventAnalyses({ preEvent: finalPre, liveEvent: finalLive, isDemo });
    } catch (error) {
      console.error('Failed to fetch event analyses:', error);
    } finally {
      setLoadingAnalyses(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
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

  // Helper: Get event end time (start + 90 minutes, or end of day for crypto/earnings)
  const getEventEndTime = (event: CalendarEvent): Date => {
    const startTime = getEventStartTime(event);
    if (event.type === 'crypto' || event.type === 'earnings' || event.type === 'ipo') {
      return new Date(`${event.date}T23:59:59Z`);
    }
    return new Date(startTime.getTime() + 90 * 60 * 1000);
  };

  // Helper: Check if event is currently ongoing
  const isEventOngoing = (event: CalendarEvent): boolean => {
    // Crypto/earnings/ipo events don't have specific times, so never show as "ongoing"
    if (event.type === 'crypto' || event.type === 'earnings' || event.type === 'ipo') {
      return false;
    }
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

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
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
    <div style={{ height: '100%', overflow: 'auto', background: '#000' }}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'linear-gradient(180deg, #000 0%, #000 90%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '1rem 1.5rem',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                AI-Powered Event Analysis • {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
              </p>
            </div>
          </div>

          <button onClick={() => fetchCalendar(true)} disabled={isLoading} style={{
            background: 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(139,92,246,0.15))',
            border: '1px solid rgba(0,245,255,0.3)',
            borderRadius: '12px',
            padding: '0.7rem 1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#00F5FF',
            fontSize: '0.9rem',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}>
            <RefreshCw size={18} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
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
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* AI POWER HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '1rem 1.5rem 0' }}>
        <AIPowerHeader 
          preCount={eventAnalyses.preEvent.length} 
          postCount={eventAnalyses.liveEvent.filter(e => e.hasActual).length}
          loading={loadingAnalyses}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* POST EVENT — JUST RELEASED (actual açıklandı, sonuç analizi) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {eventAnalyses.liveEvent.filter(e => e.hasActual).length > 0 && (
        <div style={{ padding: '0 1.5rem' }}>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LIVE NOW — AWAITING RELEASE (canlı pencerede, henüz actual yok) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {eventAnalyses.liveEvent.filter(e => !e.hasActual).length > 0 && (
        <div style={{ padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', animation: 'pulse 1.5s infinite' }} />
            <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.5px' }}>
              LIVE NOW — AWAITING DATA
            </span>
            {eventAnalyses.isDemo && (
              <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px', letterSpacing: '0.5px' }}>DEMO</span>
            )}
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(245,158,11,0.5) 0%, transparent 100%)' }} />
          </div>
          {eventAnalyses.liveEvent.filter(e => !e.hasActual).map((item, index) => (
            <LiveAwaitingCard
              key={`live-await-${index}`}
              event={item.event}
              analysis={item.analysis}
              minutesUntilRelease={item.minutesUntilRelease ?? 0}
            />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* UPCOMING EVENTS (Pre-Event) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {eventAnalyses.preEvent.length > 0 && (
        <div style={{ padding: '1rem 1.5rem' }}>
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

      {/* Loading State for AI Analysis */}
      {loadingAnalyses && eventAnalyses.preEvent.length === 0 && eventAnalyses.liveEvent.length === 0 && (
        <div style={{ padding: '0 1.5rem' }}>
          <EventAnalysisSkeleton />
          <EventAnalysisSkeleton />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MARKET OUTLOOK */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {analyses && (analyses.daily || analyses.weekly || analyses.monthly) && (
        <div style={{
          margin: '0 1.5rem 1rem',
          background: '#0A0A0F',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                padding: '0.85rem 1.25rem',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: (analyses?.daily?._demo || analyses?.weekly?._demo || analyses?.monthly?._demo) ? '#F59E0B' : '#22C55E',
                  animation: 'pulse 2s infinite'
                }} />
                <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                  MARKET OUTLOOK
                </span>
                {(analyses?.daily?._demo || analyses?.weekly?._demo || analyses?.monthly?._demo) && (
                  <span style={{
                    background: 'rgba(245,158,11,0.2)',
                    color: '#F59E0B',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    letterSpacing: '0.5px'
                  }}>
                    DEMO
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex' }}>
                {(['daily', 'weekly', 'monthly'] as const).map((period) => {
                  const analysis = analyses[period];
                  if (!analysis) return null;
                  const labels = { daily: 'TODAY', weekly: 'WEEK', monthly: 'MONTH' };
                  return (
                    <button key={period} onClick={() => setShowOutlook(period)} style={{
                      padding: '0.85rem 1.5rem',
                      background: showOutlook === period ? 'rgba(0,245,255,0.1)' : 'transparent',
                      border: 'none',
                      borderBottom: showOutlook === period ? '2px solid #00F5FF' : '2px solid transparent',
                      color: showOutlook === period ? '#00F5FF' : 'rgba(255,255,255,0.4)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      letterSpacing: '0.5px'
                    }}>
                      {labels[period]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {(() => {
            const currentAnalysis = analyses[showOutlook];
            if (!currentAnalysis) return null;
            const score = currentAnalysis.confidence || currentAnalysis.outlook_score || 5;
            const macroBias = currentAnalysis.macro_bias || (score > 6 ? 'bullish' : score < 4 ? 'bearish' : 'neutral');
            
            return (
              <div style={{ padding: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Score */}
                <div style={{ textAlign: 'center', minWidth: '120px' }}>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    margin: '0 auto 0.75rem',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="100" height="100" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={score >= 7 ? '#22C55E' : score >= 4 ? '#F59E0B' : '#EF4444'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(score / 10) * 264} 264`} />
                    </svg>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{score}</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Confidence</div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1, alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem 1.25rem', minWidth: '100px', textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '1px' }}>BIAS</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: macroBias === 'bullish' ? '#22C55E' : macroBias === 'bearish' ? '#EF4444' : '#9CA3AF' }}>
                      {macroBias?.toUpperCase()}
                    </div>
                  </div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem 1.25rem', minWidth: '100px', textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '1px' }}>VOLATILITY</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: (currentAnalysis.volatility_regime === 'elevated') ? '#EF4444' : currentAnalysis.volatility_regime === 'falling' ? '#22C55E' : '#F59E0B' }}>
                      {(currentAnalysis.volatility_regime || 'STABLE')?.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {currentAnalysis.summary && (
                  <div style={{ width: '100%', padding: '1rem', background: 'rgba(0,245,255,0.05)', borderRadius: '12px', borderLeft: '4px solid #00F5FF' }}>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', margin: 0, lineHeight: 1.7 }}>
                      {currentAnalysis.summary}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

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

        <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
          {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''} for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TABLE HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '80px 45px 55px 1fr 100px 100px 100px',
        gap: '0.5rem',
        padding: '0.85rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        position: 'sticky',
        top: '145px',
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
                    gridTemplateColumns: '80px 45px 55px 1fr 100px 100px 100px',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    cursor: event.importance === 'high' ? 'pointer' : 'default'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {formatEventLocalTime(event.date, event.time)}
                      {event.type === 'crypto' && (
                        <span style={{
                          background: 'rgba(247, 147, 26, 0.12)',
                          color: 'rgba(247, 147, 26, 0.7)',
                          padding: '0.06rem 0.3rem',
                          borderRadius: '3px',
                          fontSize: '0.5rem',
                          fontWeight: 600,
                          fontFamily: 'system-ui',
                          letterSpacing: '0.3px',
                          border: '1px solid rgba(247, 147, 26, 0.2)'
                        }}>
                          CRYPTO
                        </span>
                      )}
                      {isEventOngoing(event) && (
                        <span style={{
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
                    </div>
                    <div style={{ fontSize: '1.2rem' }}>{getCountryFlag(event.country)}</div>
                    <div><ImpactIndicator importance={event.importance} /></div>
                    <div>
                      <div style={{ 
                        color: event.importance === 'high' ? '#fff' : 'rgba(255,255,255,0.85)', 
                        fontSize: '0.9rem',
                        fontWeight: event.importance === 'high' ? 600 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}>
                        {event.title}
                        {event.importance === 'high' && (
                          <span style={{
                            background: 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(139,92,246,0.15))',
                            border: '1px solid rgba(0,245,255,0.3)',
                            color: '#00F5FF',
                            padding: '0.12rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Brain size={10} />
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ 
                      textAlign: 'right',
                      color: event.actual ? (
                        event.forecast && parseFloat(event.actual) > parseFloat(event.forecast) ? '#22C55E' :
                        event.forecast && parseFloat(event.actual) < parseFloat(event.forecast) ? '#EF4444' : '#fff'
                      ) : 'rgba(255,255,255,0.25)',
                      fontSize: '0.9rem',
                      fontWeight: event.actual ? 700 : 400,
                      fontFamily: 'monospace'
                    }}>
                      {event.actual || '—'}
                    </div>
                    <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                      {event.forecast || '—'}
                    </div>
                    <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                      {event.previous || '—'}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

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
          <Brain size={16} color="#00F5FF" />
          <span style={{ color: '#00F5FF', fontWeight: 600 }}>AI Powered</span>
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
