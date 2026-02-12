'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Activity,
  Shield,
  Crosshair
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface PreEventAnalysis {
  eventClassification: {
    tier: 1 | 2 | 3;
    expectedVolatility: 'low' | 'moderate' | 'high' | 'extreme';
    primaryAffectedAssets: string[];
    secondaryAffectedAssets: string[];
  };
  historicalAnalysis: {
    beatRate: string;
    averageSurprise: string;
    typicalReaction: string;
    reactionDuration: string;
    fadePattern: boolean;
    keyInsight: string;
  };
  expectationsAnalysis: {
    forecastAssessment: string;
    whisperNumber: string | null;
    whatWouldSurprise: string;
    pricedInLevel: string;
  };
  scenarios: {
    bigBeat: ScenarioData;
    smallBeat: ScenarioData;
    inline: ScenarioData;
    smallMiss: ScenarioData;
    bigMiss: ScenarioData;
  };
  positioningAnalysis: {
    currentPositioning: string;
    crowdedSide: 'long' | 'short' | 'neutral';
    painTrade: string;
  };
  preEventStrategy: {
    recommendedApproach: 'position_before' | 'wait_and_react' | 'fade_move' | 'no_trade';
    reasoning: string;
    conviction: number;
    timeHorizon: 'intraday' | 'days' | 'weeks';
  };
  tradeSetup: {
    hasTrade: boolean;
    direction: 'long' | 'short' | 'none';
    asset: string;
    entryTiming: string;
    entryCondition: string;
    stopLoss: string;
    takeProfit: string;
    positionSize: 'small' | 'standard' | 'large';
    riskReward: 'poor' | 'fair' | 'good' | 'excellent';
  };
  keyRisks: string[];
  summary: string;
}

interface ScenarioData {
  threshold: string;
  probability: string;
  expectedReaction: {
    assets: Record<string, string>;
    duration: string;
    confidence: string;
  };
}

interface PostEventAnalysis {
  resultAnalysis: {
    surpriseCategory: 'big_beat' | 'small_beat' | 'inline' | 'small_miss' | 'big_miss';
    surprisePercent: number;
    headlineAssessment: string;
    componentAnalysis: string | null;
    overallQuality: 'strong' | 'mixed' | 'weak';
  };
  marketReaction: {
    initialReaction: string;
    reactionAssessment: 'appropriate' | 'over_reaction' | 'under_reaction' | 'divergent';
    divergences: string | null;
    reactionInsight: string;
  };
  implications: {
    monetaryPolicy: {
      fedImpact: string;
      rateProbabilityShift: string;
      nextMeetingExpectation: string;
    };
    economicOutlook: {
      narrativeChange: string;
      recessionRisk: 'increased' | 'unchanged' | 'decreased';
      growthOutlook: string;
    };
    riskAppetite: {
      shift: 'risk_on' | 'risk_off' | 'neutral';
      sectorImplications: string;
    };
  };
  tradeRecommendation: {
    action: 'trade_continuation' | 'fade_move' | 'wait_confirmation' | 'no_trade';
    urgency: 'immediate' | 'soon' | 'patient';
    conviction: number;
    reasoning: string;
  };
  tradeSetup: {
    hasTrade: boolean;
    direction: 'long' | 'short' | 'none';
    asset: string;
    entry: {
      type: 'market' | 'limit' | 'stop';
      level: string;
      condition: string;
    };
    stopLoss: string;
    takeProfit: string;
    timeHorizon: 'intraday' | 'days' | 'weeks';
    positionSize: 'small' | 'standard' | 'large';
    riskReward: 'poor' | 'fair' | 'good' | 'excellent';
  };
  alternativeTrades: Array<{
    asset: string;
    direction: 'long' | 'short';
    rationale: string;
  }>;
  keyRisks: string[];
  summary: string;
}

interface EventData {
  name: string;
  date: string;
  time?: string;
  country: string;
  currency: string;
  forecast?: number | string;
  previous?: number | string;
  actual?: number | string;
  importance: 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const TierBadge = ({ tier }: { tier: 1 | 2 | 3 }) => {
  const t = useTranslations('calendar');
  const config = {
    1: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', color: '#EF4444', label: t('tier1') },
    2: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', color: '#F59E0B', label: t('tier2') },
    3: { bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.4)', color: '#9CA3AF', label: t('tier3') }
  };
  const c = config[tier];
  
  return (
    <span style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.color,
      padding: '0.2rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.65rem',
      fontWeight: 700,
      letterSpacing: '0.5px'
    }}>
      {c.label}
    </span>
  );
};

const ConvictionMeter = ({ conviction }: { conviction: number }) => {
  const getColor = (score: number) => {
    if (score >= 8) return '#22C55E';
    if (score >= 6) return '#00F5FF';
    if (score >= 4) return '#F59E0B';
    return '#EF4444';
  };
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ 
        display: 'flex', 
        gap: '2px',
        background: 'rgba(255,255,255,0.05)',
        padding: '4px 6px',
        borderRadius: '4px'
      }}>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '16px',
              borderRadius: '2px',
              background: i < conviction ? getColor(conviction) : 'rgba(255,255,255,0.1)',
              transition: 'all 0.2s'
            }}
          />
        ))}
      </div>
      <span style={{ 
        color: getColor(conviction), 
        fontSize: '0.85rem', 
        fontWeight: 700 
      }}>
        {conviction}/10
      </span>
    </div>
  );
};

const StrategyBadge = ({ strategy }: { strategy: string }) => {
  const t = useTranslations('calendar');
  const config: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    'position_before': { icon: <Target size={14} />, label: t('positionBefore'), color: '#22C55E' },
    'wait_and_react': { icon: <Clock size={14} />, label: t('waitAndReact'), color: '#00F5FF' },
    'fade_move': { icon: <TrendingDown size={14} />, label: t('fadeTheMove'), color: '#F59E0B' },
    'no_trade': { icon: <Shield size={14} />, label: t('noTrade'), color: '#6B7280' },
    'trade_continuation': { icon: <TrendingUp size={14} />, label: t('tradeContinuation'), color: '#22C55E' },
    'wait_confirmation': { icon: <Clock size={14} />, label: t('waitConfirmation'), color: '#F59E0B' }
  };
  
  const c = config[strategy] || config['no_trade'];
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      background: `${c.color}15`,
      border: `1px solid ${c.color}40`,
      color: c.color,
      padding: '0.35rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.8rem',
      fontWeight: 600
    }}>
      {c.icon}
      {c.label}
    </div>
  );
};

const UrgencyBadge = ({ urgency }: { urgency: 'immediate' | 'soon' | 'patient' }) => {
  const t = useTranslations('calendar');
  const urgencyLabels: Record<string, string> = {
    immediate: t('urgencyImmediate'),
    soon: t('urgencySoon'),
    patient: t('urgencyPatient')
  };
  const config = {
    immediate: { bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.5)', color: '#EF4444', icon: <Zap size={12} /> },
    soon: { bg: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.5)', color: '#F59E0B', icon: <Clock size={12} /> },
    patient: { bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.5)', color: '#22C55E', icon: <Activity size={12} /> }
  };
  const c = config[urgency];
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.color,
      padding: '0.2rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.65rem',
      fontWeight: 600,
      textTransform: 'uppercase'
    }}>
      {c.icon}
      {urgencyLabels[urgency]}
    </span>
  );
};

const SurpriseBadge = ({ category, percent }: { category: string; percent: number }) => {
  const t = useTranslations('calendar');
  const config: Record<string, { bg: string; border: string; color: string; label: string }> = {
    'big_beat': { bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.5)', color: '#22C55E', label: t('bigBeat') },
    'small_beat': { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: '#4ADE80', label: t('smallBeat') },
    'inline': { bg: 'rgba(107,114,128,0.2)', border: 'rgba(107,114,128,0.4)', color: '#9CA3AF', label: t('inline') },
    'small_miss': { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: '#F87171', label: t('smallMiss') },
    'big_miss': { bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.5)', color: '#EF4444', label: t('bigMiss') }
  };
  const c = config[category] || config['inline'];
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}>
      <span style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        padding: '0.3rem 0.6rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 700
      }}>
        {c.label}
      </span>
      <span style={{ color: c.color, fontSize: '0.85rem', fontWeight: 600 }}>
        {percent > 0 ? '+' : ''}{percent.toFixed(1)}%
      </span>
    </div>
  );
};

const ScenarioRow = ({ 
  label, 
  scenario, 
  isActive,
  variant
}: { 
  label: string; 
  scenario: ScenarioData;
  isActive?: boolean;
  variant?: 'big_beat' | 'small_beat' | 'inline' | 'small_miss' | 'big_miss';
}) => {
  const variantColors: Record<string, string> = {
    'big_beat': '#22C55E',
    'small_beat': '#4ADE80',
    'inline': '#9CA3AF',
    'small_miss': '#F87171',
    'big_miss': '#EF4444',
  };
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '100px 100px 1fr 80px',
      gap: '0.75rem',
      padding: '0.6rem 0.75rem',
      background: isActive ? 'rgba(0,245,255,0.08)' : 'transparent',
      borderRadius: '6px',
      alignItems: 'center',
      borderLeft: isActive ? '3px solid #00F5FF' : '3px solid transparent'
    }}>
      <span style={{ 
        color: (variant && variantColors[variant]) || '#9CA3AF', 
        fontSize: '0.7rem', 
        fontWeight: 700 
      }}>
        {label}
      </span>
      <span style={{ 
        color: 'rgba(255,255,255,0.7)', 
        fontSize: '0.75rem',
        fontFamily: 'monospace'
      }}>
        {scenario.threshold}
      </span>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {Object.entries(scenario.expectedReaction?.assets || {}).slice(0, 4).map(([asset, reaction]) => (
          <span key={asset} style={{
            background: reaction.includes('+') ? 'rgba(34,197,94,0.1)' : 
                       reaction.includes('-') ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${reaction.includes('+') ? 'rgba(34,197,94,0.3)' : 
                                reaction.includes('-') ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: reaction.includes('+') ? '#4ADE80' : 
                   reaction.includes('-') ? '#F87171' : 'rgba(255,255,255,0.6)',
            padding: '0.15rem 0.4rem',
            borderRadius: '3px',
            fontSize: '0.65rem',
            fontFamily: 'monospace'
          }}>
            {asset} {reaction}
          </span>
        ))}
      </div>
      <span style={{ 
        color: 'rgba(255,255,255,0.5)', 
        fontSize: '0.65rem',
        textAlign: 'right'
      }}>
        {scenario.probability}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// PRE-EVENT CARD
// ═══════════════════════════════════════════════════════════════════

export function PreEventCard({ 
  event, 
  analysis,
  hoursUntil,
  hideTimeInfo = false
}: { 
  event: EventData; 
  analysis: PreEventAnalysis;
  hoursUntil: number;
  hideTimeInfo?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations('calendar');
  
  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'US': '🇺🇸', 'EU': '🇪🇺', 'GB': '🇬🇧', 'JP': '🇯🇵', 'CN': '🇨🇳',
      'DE': '🇩🇪', 'FR': '🇫🇷', 'CA': '🇨🇦', 'AU': '🇦🇺', 'CH': '🇨🇭'
    };
    return flags[country] || '🌍';
  };

  return (
    <div style={{
      background: '#0A0A0F',
      border: '1px solid rgba(0,245,255,0.2)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '1rem'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(139,92,246,0.1))',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{getCountryFlag(event.country)}</span>
            <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>{event.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <TierBadge tier={analysis.eventClassification.tier} />
            {!hideTimeInfo && (
              <span style={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <Clock size={12} />
                {event.date} {event.time}
              </span>
            )}
          </div>
        </div>
        {!hideTimeInfo && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              background: 'rgba(0,245,255,0.15)',
              border: '1px solid rgba(0,245,255,0.3)',
              color: '#00F5FF',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '0.5rem'
            }}>
              ⏰ {t('inHours', { count: hoursUntil })}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
              📅 {t('upcomingEvent')}
            </span>
          </div>
        )}
      </div>

      {/* Expectations */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem'
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginBottom: '0.25rem' }}>
            {t('forecast')}
          </div>
          <div style={{ color: '#00F5FF', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>
            {event.forecast || '—'}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginBottom: '0.25rem' }}>
            {t('previousLabel')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', fontWeight: 600, fontFamily: 'monospace' }}>
            {event.previous || '—'}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginBottom: '0.25rem' }}>
            {t('volatility')}
          </div>
          <div style={{ 
            color: analysis.eventClassification.expectedVolatility === 'extreme' ? '#EF4444' :
                   analysis.eventClassification.expectedVolatility === 'high' ? '#F59E0B' :
                   analysis.eventClassification.expectedVolatility === 'moderate' ? '#00F5FF' : '#6B7280',
            fontSize: '0.9rem', 
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            {analysis.eventClassification.expectedVolatility}
          </div>
        </div>
      </div>

      {/* Scenario Map */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.7rem', 
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <BarChart3 size={14} />
          {t('scenarioMap')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <ScenarioRow label={t('bigBeat')} scenario={analysis.scenarios.bigBeat} variant="big_beat" />
          <ScenarioRow label={t('smallBeat')} scenario={analysis.scenarios.smallBeat} variant="small_beat" />
          <ScenarioRow label={t('inline')} scenario={analysis.scenarios.inline} variant="inline" />
          <ScenarioRow label={t('smallMiss')} scenario={analysis.scenarios.smallMiss} variant="small_miss" />
          <ScenarioRow label={t('bigMiss')} scenario={analysis.scenarios.bigMiss} variant="big_miss" />
        </div>
      </div>

      {/* Strategy */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ 
            color: 'rgba(255,255,255,0.5)', 
            fontSize: '0.65rem', 
            marginBottom: '0.5rem',
            textTransform: 'uppercase'
          }}>            {t('preEventStrategy')}
          </div>
          <StrategyBadge strategy={analysis.preEventStrategy.recommendedApproach} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginBottom: '0.5rem' }}>
            {t('conviction')}
          </div>
          <ConvictionMeter conviction={analysis.preEventStrategy.conviction} />
        </div>
      </div>

      {/* Affected Assets */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.65rem', 
          marginBottom: '0.5rem',
          textTransform: 'uppercase'
        }}>          {t('affectedAssets')}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {analysis.eventClassification.primaryAffectedAssets.map((asset, i) => (
            <span key={i} style={{
              background: 'rgba(0,245,255,0.1)',
              border: '1px solid rgba(0,245,255,0.3)',
              color: '#00F5FF',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              ${asset}
            </span>
          ))}
          {analysis.eventClassification.secondaryAffectedAssets.slice(0, 3).map((asset, i) => (
            <span key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem'
            }}>
              ${asset}
            </span>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)' }}>
        <p style={{ 
          color: 'rgba(255,255,255,0.8)', 
          fontSize: '0.85rem', 
          lineHeight: 1.6,
          margin: 0
        }}>
          {analysis.summary}
        </p>
      </div>

      {/* Expand Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.03)',
          border: 'none',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'all 0.15s'
        }}
      >
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {expanded ? t('showLess') : t('showFullAnalysis')}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Historical Analysis */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '0.7rem', 
              marginBottom: '0.75rem',
              textTransform: 'uppercase'
            }}>
              📊 {t('historicalAnalysis')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{t('beatRate')}</span>
                <div style={{ color: '#22C55E', fontSize: '1rem', fontWeight: 700 }}>
                  {analysis.historicalAnalysis.beatRate}
                </div>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{t('avgSurprise')}</span>
                <div style={{ color: '#00F5FF', fontSize: '1rem', fontWeight: 600 }}>
                  {analysis.historicalAnalysis.averageSurprise}
                </div>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{t('duration')}</span>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}>
                  {analysis.historicalAnalysis.reactionDuration}
                </div>
              </div>
            </div>
            <p style={{ 
              color: 'rgba(255,255,255,0.7)', 
              fontSize: '0.8rem', 
              margin: 0,
              padding: '0.75rem',
              background: 'rgba(139,92,246,0.1)',
              borderRadius: '6px',
              borderLeft: '3px solid #8B5CF6'
            }}>
              💡 {analysis.historicalAnalysis.keyInsight}
            </p>
          </div>

          {/* Positioning */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '0.7rem', 
              marginBottom: '0.75rem',
              textTransform: 'uppercase'
            }}>
              📍 {t('marketPositioning')}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
              {analysis.positioningAnalysis.currentPositioning}
            </p>
            <div style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)',
              padding: '0.75rem',
              borderRadius: '6px'
            }}>
              <span style={{ color: '#F59E0B', fontSize: '0.7rem', fontWeight: 600 }}>⚡ {t('painTrade')} </span>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                {analysis.positioningAnalysis.painTrade}
              </span>
            </div>
          </div>

          {/* Key Risks */}
          {analysis.keyRisks && analysis.keyRisks.length > 0 && (
            <div style={{ padding: '1rem 1.25rem' }}>
              <div style={{ 
                color: '#EF4444', 
                fontSize: '0.7rem', 
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <AlertTriangle size={14} />
                {t('keyRisks')}
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {analysis.keyRisks.map((risk, i) => (
                  <li key={i} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// POST-EVENT CARD
// ═══════════════════════════════════════════════════════════════════

export function PostEventCard({ 
  event, 
  analysis,
  minutesAgo,
  hideTimeInfo = false,
  cardStyles
}: { 
  event: EventData; 
  analysis: PostEventAnalysis;
  minutesAgo: number;
  hideTimeInfo?: boolean;
  cardStyles?: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations('calendar');
  
  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'US': '🇺🇸', 'EU': '🇪🇺', 'GB': '🇬🇧', 'JP': '🇯🇵', 'CN': '🇨🇳',
      'DE': '🇩🇪', 'FR': '🇫🇷', 'CA': '🇨🇦', 'AU': '🇦🇺', 'CH': '🇨🇭'
    };
    return flags[country] || '🌍';
  };

  return (
    <div style={{
      background: '#0A0A0F',
      border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: cardStyles?.borderRadius || '12px',
      overflow: 'hidden',
      marginBottom: cardStyles?.marginBottom || '1rem'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.1))',
        padding: cardStyles?.padding || '1rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: cardStyles?.titleSize || '1.25rem' }}>{getCountryFlag(event.country)}</span>
            <span style={{ color: '#fff', fontSize: cardStyles?.titleSize || '1.1rem', fontWeight: 700 }}>{event.name}</span>
          </div>
          <SurpriseBadge 
            category={analysis.resultAnalysis.surpriseCategory} 
            percent={analysis.resultAnalysis.surprisePercent} 
          />
        </div>
        {!hideTimeInfo && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#EF4444',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <Zap size={14} />
              {t('mAgo', { count: minutesAgo })}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
              🔴 {t('justReleased')}
            </span>
          </div>
        )}
      </div>

      {/* Result Comparison */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {/* Actual */}
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginBottom: '0.25rem' }}>
              {t('actual')}
            </div>
            <div style={{ 
              color: analysis.resultAnalysis.surpriseCategory.includes('beat') ? '#22C55E' :
                     analysis.resultAnalysis.surpriseCategory.includes('miss') ? '#EF4444' : '#fff',
              fontSize: '1.75rem', 
              fontWeight: 700, 
              fontFamily: 'monospace' 
            }}>
              {event.actual}
            </div>
          </div>
          
          {/* VS */}
          <div style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            {t('vsLabel')}
          </div>
          
          {/* Forecast */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginBottom: '0.25rem' }}>
              {t('forecast')}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.25rem', fontFamily: 'monospace' }}>
              {event.forecast}
            </div>
          </div>
          
          {/* Previous */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginBottom: '0.25rem' }}>
              {t('previousLabel')}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1.25rem', fontFamily: 'monospace' }}>
              {event.previous}
            </div>
          </div>

          {/* Progress Bar Visual */}
          <div style={{ flex: 2 }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              height: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                background: analysis.resultAnalysis.surpriseCategory.includes('beat') 
                  ? 'linear-gradient(90deg, #22C55E, #4ADE80)' 
                  : analysis.resultAnalysis.surpriseCategory.includes('miss')
                    ? 'linear-gradient(90deg, #EF4444, #F87171)'
                    : 'linear-gradient(90deg, #6B7280, #9CA3AF)',
                height: '100%',
                width: `${Math.min(Math.abs(analysis.resultAnalysis.surprisePercent) * 2 + 50, 100)}%`,
                borderRadius: '4px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Trade Recommendation */}
      {analysis.tradeSetup.hasTrade && (
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: analysis.tradeSetup.direction === 'long' 
            ? 'rgba(34,197,94,0.05)' 
            : 'rgba(239,68,68,0.05)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '1rem'
          }}>
            <div>
              <div style={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.65rem', 
                marginBottom: '0.5rem',
                textTransform: 'uppercase'
              }}>                📊 {t('tradeRecommendation')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  background: analysis.tradeSetup.direction === 'long' 
                    ? 'rgba(34,197,94,0.2)' 
                    : 'rgba(239,68,68,0.2)',
                  border: `1px solid ${analysis.tradeSetup.direction === 'long' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  color: analysis.tradeSetup.direction === 'long' ? '#22C55E' : '#EF4444',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {analysis.tradeSetup.direction === 'long' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  {analysis.tradeSetup.direction.toUpperCase()} {analysis.tradeSetup.asset}
                </div>
                <UrgencyBadge urgency={analysis.tradeRecommendation.urgency} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginBottom: '0.5rem' }}>
                {t('conviction')}
              </div>
              <ConvictionMeter conviction={analysis.tradeRecommendation.conviction} />
            </div>
          </div>
          
          {/* Trade Details Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '1rem',
            padding: '1rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '0.2rem' }}>{t('entry')}</div>
              <div style={{ color: '#00F5FF', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace' }}>
                {analysis.tradeSetup.entry.level}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
                {analysis.tradeSetup.entry.type}
              </div>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '0.2rem' }}>{t('stopLoss')}</div>
              <div style={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace' }}>
                {analysis.tradeSetup.stopLoss}
              </div>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '0.2rem' }}>{t('takeProfit')}</div>
              <div style={{ color: '#22C55E', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace' }}>
                {analysis.tradeSetup.takeProfit}
              </div>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '0.2rem' }}>{t('riskReward')}</div>
              <div style={{ 
                color: analysis.tradeSetup.riskReward === 'excellent' ? '#22C55E' :
                       analysis.tradeSetup.riskReward === 'good' ? '#00F5FF' :
                       analysis.tradeSetup.riskReward === 'fair' ? '#F59E0B' : '#EF4444',
                fontSize: '0.85rem', 
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                {analysis.tradeSetup.riskReward}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Implications */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.7rem', 
          marginBottom: '0.75rem',
          textTransform: 'uppercase'
        }}>          {t('implications')}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Fed Impact */}
          <div style={{
            flex: 1,
            minWidth: '200px',
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.2)',
            padding: '0.75rem',
            borderRadius: '8px'
          }}>
            <div style={{ color: '#A78BFA', fontSize: '0.65rem', marginBottom: '0.4rem', fontWeight: 600 }}>
              🏛️ {t('monetaryPolicy')}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', margin: 0 }}>
              {analysis.implications.monetaryPolicy.fedImpact}
            </p>
          </div>
          
          {/* Risk Appetite */}
          <div style={{
            flex: 1,
            minWidth: '200px',
            background: analysis.implications.riskAppetite.shift === 'risk_on' 
              ? 'rgba(34,197,94,0.1)' 
              : analysis.implications.riskAppetite.shift === 'risk_off'
                ? 'rgba(239,68,68,0.1)'
                : 'rgba(255,255,255,0.05)',
            border: `1px solid ${
              analysis.implications.riskAppetite.shift === 'risk_on' 
                ? 'rgba(34,197,94,0.2)' 
                : analysis.implications.riskAppetite.shift === 'risk_off'
                  ? 'rgba(239,68,68,0.2)'
                  : 'rgba(255,255,255,0.1)'
            }`,
            padding: '0.75rem',
            borderRadius: '8px'
          }}>
            <div style={{ 
              color: analysis.implications.riskAppetite.shift === 'risk_on' ? '#22C55E' :
                     analysis.implications.riskAppetite.shift === 'risk_off' ? '#EF4444' : '#9CA3AF',
              fontSize: '0.65rem', 
              marginBottom: '0.4rem', 
              fontWeight: 600 
            }}>
              {analysis.implications.riskAppetite.shift === 'risk_on' ? '📈' : 
               analysis.implications.riskAppetite.shift === 'risk_off' ? '📉' : '➡️'} {t('riskAppetite')}
            </div>
            <p style={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: '0.8rem', 
              margin: 0,
              fontWeight: 600
            }}>
              {analysis.implications.riskAppetite.shift.replace('_', ' ').toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)' }}>
        <p style={{ 
          color: 'rgba(255,255,255,0.8)', 
          fontSize: '0.85rem', 
          lineHeight: 1.6,
          margin: 0
        }}>
          {analysis.summary}
        </p>
      </div>

      {/* Expand Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.03)',
          border: 'none',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'all 0.15s'
        }}
      >
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {expanded ? t('showLess') : t('showFullAnalysis')}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Market Reaction Assessment */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '0.7rem', 
              marginBottom: '0.75rem',
              textTransform: 'uppercase'
            }}>
              📊 {t('marketReaction')}
            </div>
            <div style={{
              background: 'rgba(0,245,255,0.05)',
              border: '1px solid rgba(0,245,255,0.15)',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '0.5rem'
            }}>
              <span style={{ 
                color: analysis.marketReaction.reactionAssessment === 'appropriate' ? '#22C55E' :
                       analysis.marketReaction.reactionAssessment === 'over_reaction' ? '#F59E0B' :
                       analysis.marketReaction.reactionAssessment === 'under_reaction' ? '#00F5FF' : '#8B5CF6',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                {analysis.marketReaction.reactionAssessment.replace('_', ' ')}
              </span>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
                {analysis.marketReaction.reactionInsight}
              </p>
            </div>
          </div>

          {/* Economic Outlook */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '0.7rem', 
              marginBottom: '0.75rem',
              textTransform: 'uppercase'
            }}>
              🌍 {t('economicOutlook')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{t('recessionRisk')}</span>
                <div style={{ 
                  color: analysis.implications.economicOutlook.recessionRisk === 'decreased' ? '#22C55E' :
                         analysis.implications.economicOutlook.recessionRisk === 'increased' ? '#EF4444' : '#F59E0B',
                  fontSize: '0.9rem', 
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  {analysis.implications.economicOutlook.recessionRisk}
                </div>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{t('growthOutlook')}</span>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                  {analysis.implications.economicOutlook.growthOutlook}
                </div>
              </div>
            </div>
          </div>

          {/* Alternative Trades */}
          {analysis.alternativeTrades && analysis.alternativeTrades.length > 0 && (
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.7rem', 
                marginBottom: '0.75rem',
                textTransform: 'uppercase'
              }}>
                🔄 {t('alternativeTrades')}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {analysis.alternativeTrades.map((trade, i) => (
                  <div key={i} style={{
                    background: trade.direction === 'long' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${trade.direction === 'long' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px'
                  }}>
                    <div style={{ 
                      color: trade.direction === 'long' ? '#22C55E' : '#EF4444',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {trade.direction.toUpperCase()} {trade.asset}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>
                      {trade.rationale}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Risks */}
          {analysis.keyRisks && analysis.keyRisks.length > 0 && (
            <div style={{ padding: '1rem 1.25rem' }}>
              <div style={{ 
                color: '#EF4444', 
                fontSize: '0.7rem', 
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <AlertTriangle size={14} />
                {t('keyRisks')}
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {analysis.keyRisks.map((risk, i) => (
                  <li key={i} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

export function EventAnalysisSkeleton() {
  return (
    <div style={{
      background: '#0A0A0F',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '1.25rem',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
          <div style={{ width: '200px', height: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
        </div>
        <div style={{ width: '80px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: '50px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
      <div style={{ height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
