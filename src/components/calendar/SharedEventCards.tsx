'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  Zap,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  ChevronDown,
  ChevronUp,
  Brain,
  Eye,
  Briefcase,
  DollarSign,
  Building2,
  Lock
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const countryToFlagCdnCode = (country?: string): string | null => {
  if (!country) return null;
  const raw = String(country).trim().toLowerCase();
  if (!raw) return null;
  const mapped = raw === 'uk' ? 'gb' : raw === 'wl' ? 'gb' : raw;
  if (!/^[a-z]{2}$/.test(mapped)) return null;
  return mapped;
};

export const FlagImg = ({ country, size = 32 }: { country?: string; size?: number }) => {
  const [errored, setErrored] = useState(false);
  const code = countryToFlagCdnCode(country);
  if (!code || errored) return <span style={{ fontSize: size, lineHeight: 1 }}>🌍</span>;
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

// ═══════════════════════════════════════════════════════════════════
// SHARED LIVE EVENT CARD (Desktop + Mobile)
// ═══════════════════════════════════════════════════════════════════

interface SharedLiveEventCardProps {
  event: any;
  analysis: any;
  minutesAgo: number;
  minutesUntilRelease?: number;
  hasActual?: boolean;
  isOverdue?: boolean;
  onAssetClick?: (symbol: string) => void;
  isMobile?: boolean;
  isPremium?: boolean;
}

export const SharedLiveEventCard = ({ 
  event, 
  analysis, 
  minutesAgo, 
  minutesUntilRelease = 0, 
  hasActual = true, 
  isOverdue = false, 
  onAssetClick,
  isMobile = false,
  isPremium = true
}: SharedLiveEventCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const surprise = analysis?.surprise_assessment || 'in_line';
  
  const awaitingConfig = {
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.05) 100%)',
    border: '#F59E0B',
    icon: Clock,
    text: 'AWAITING DATA',
    color: '#F59E0B'
  };

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
    major_downside: { gradient: 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(239,68,68,0.05) 100%)', border: '#EF4444', icon: TrendingDown, text: 'MAJOR MISS', color: '#EF4444' },
    below: { gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.03) 100%)', border: '#EF4444', icon: TrendingDown, text: 'BELOW FORECAST', color: '#EF4444' },
    above: { gradient: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.03) 100%)', border: '#22C55E', icon: TrendingUp, text: 'ABOVE FORECAST', color: '#22C55E' }
  };
  
  const config = isOverdue && !hasActual 
    ? drawConfig 
    : hasActual 
      ? (surpriseConfig[surprise] || surpriseConfig.in_line) 
      : awaitingConfig;
  const Icon = config.icon;

  const urgency = analysis?.urgency_score || 5;
  const marketMover = analysis?.market_mover_score || analysis?.conviction_score || 5;

  // Mobile responsive sizes
  const padding = isMobile ? '14px' : '1.5rem';
  const iconSize = isMobile ? 48 : 72;
  const flagSize = isMobile ? 24 : 32;
  const titleSize = isMobile ? '1rem' : '1.25rem';
  const dataFontSize = isMobile ? '1.25rem' : '1.75rem';

  return (
    <div 
      style={{
        background: config.gradient,
        border: `2px solid ${config.border}`,
        borderRadius: '16px',
        padding: padding,
        marginBottom: isMobile ? '12px' : '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
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
        top: isMobile ? '10px' : '1rem',
        right: isMobile ? '10px' : '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(0,0,0,0.5)',
        padding: isMobile ? '4px 10px' : '0.35rem 0.75rem',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        {hasActual ? (
          <>
            <div style={{
              width: isMobile ? '8px' : '10px',
              height: isMobile ? '8px' : '10px',
              borderRadius: '50%',
              background: '#EF4444',
              animation: 'pulse 1s infinite',
              boxShadow: '0 0 15px rgba(239,68,68,0.8)'
            }} />
            <span style={{ color: '#fff', fontSize: isMobile ? '0.65rem' : '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
              {isMobile ? `${minutesAgo}m` : `JUST RELEASED • ${minutesAgo < 60 ? `${minutesAgo}m` : `${Math.floor(minutesAgo/60)}h ${minutesAgo%60}m`} ago`}
            </span>
          </>
        ) : isOverdue ? (
          <>
            <div style={{
              width: isMobile ? '8px' : '10px',
              height: isMobile ? '8px' : '10px',
              borderRadius: '50%',
              background: '#6B7280',
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ color: '#fff', fontSize: isMobile ? '0.65rem' : '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
              {isMobile ? 'DRAW' : 'DRAW • AWAITING ACTUAL DATA'}
            </span>
          </>
        ) : (
          <>
            <Clock size={isMobile ? 12 : 14} color="#F59E0B" style={{ animation: 'spin 2s linear infinite' }} />
            <span style={{ color: '#fff', fontSize: isMobile ? '0.65rem' : '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
              LIVE
            </span>
          </>
        )}
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: isMobile ? '12px' : '1.5rem', alignItems: 'flex-start', position: 'relative' }}>
        {/* Icon */}
        <div style={{
          width: iconSize,
          height: iconSize,
          borderRadius: isMobile ? '12px' : '16px',
          background: `linear-gradient(135deg, ${config.border}40, ${config.border}10)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${config.border}50`
        }}>
          <Icon size={isMobile ? 24 : 36} color={config.color} />
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <FlagImg country={event.country} size={flagSize} />
            <div>
              <h2 style={{ color: '#fff', fontSize: titleSize, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {event.title || event.name}
              </h2>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                background: `${config.border}40`,
                color: config.color,
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: 700,
                padding: isMobile ? '2px 6px' : '0.3rem 0.6rem',
                borderRadius: '6px',
                marginTop: '0.25rem'
              }}>
                <Icon size={isMobile ? 10 : 14} />
                {config.text}
              </span>
            </div>
          </div>

          {/* Data Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: isMobile ? '8px' : '1rem',
            marginBottom: isMobile ? '10px' : '1rem',
            marginTop: isMobile ? '12px' : '0'
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '10px 8px' : '1rem',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${hasActual ? config.border : (isOverdue ? '#6B7280' : '#F59E0B')}30`
            }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? '0.6rem' : '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>ACTUAL</div>
              {hasActual ? (
                <div style={{ color: config.color, fontSize: dataFontSize, fontWeight: 800 }}>{event.actual}</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Clock size={isMobile ? 18 : 24} color={isOverdue ? '#6B7280' : '#F59E0B'} style={{ animation: 'spin 2s linear infinite' }} />
                  <span style={{ color: isOverdue ? '#6B7280' : '#F59E0B', fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 700 }}>...</span>
                </div>
              )}
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '10px 8px' : '1rem',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? '0.6rem' : '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>FORECAST</div>
              <div style={{ color: '#fff', fontSize: dataFontSize, fontWeight: 600 }}>{event.forecast || '—'}</div>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '10px 8px' : '1rem',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? '0.6rem' : '0.7rem', marginBottom: '0.35rem', letterSpacing: '1px' }}>PREVIOUS</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: dataFontSize, fontWeight: 500 }}>{event.previous || '—'}</div>
            </div>
          </div>

          {/* Metrics Bar - Desktop only */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
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
          )}

          {/* Assets */}
          {analysis?.tradingview_assets && analysis.tradingview_assets.length > 0 && (
            <div style={{ 
              marginTop: isMobile ? '10px' : '1rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '0.65rem' : '0.75rem', fontWeight: 500 }}>
                AFFECTED ASSETS
              </span>
              {analysis.tradingview_assets.slice(0, isMobile ? 4 : 6).map((asset: string, idx: number) => {
                const displayName = asset.includes(':') ? asset.split(':')[1] : asset;
                return (
                  <button 
                    key={idx}
                    className="no-swipe"
                    onClick={() => onAssetClick?.(asset)}
                    style={{
                      background: 'rgba(0,245,255,0.1)',
                      border: '1px solid rgba(0,245,255,0.3)',
                      color: '#00F5FF',
                      fontSize: isMobile ? '0.65rem' : '0.7rem',
                      fontWeight: 600,
                      padding: isMobile ? '3px 8px' : '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Expand Button - no-swipe to prevent accidental tab switch */}
          <button
            className="no-swipe"
            onClick={() => setExpanded(!expanded)}
            style={{
              marginTop: isMobile ? '10px' : '1rem',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: isMobile ? '8px 12px' : '0.6rem 1rem',
              color: '#fff',
              fontSize: isMobile ? '0.75rem' : '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Hide Details' : 'Show Full Analysis'}
          </button>

          {/* Expanded Content */}
          {expanded && analysis && (
            <div style={{ position: 'relative', marginTop: '1rem' }}>
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
              {/* Summary */}
              {(analysis.summary || analysis.headline) && (
                <div style={{
                  background: 'rgba(0,245,255,0.08)',
                  borderLeft: '4px solid #00F5FF',
                  borderRadius: '0 12px 12px 0',
                  padding: isMobile ? '12px' : '1rem 1.25rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <Brain size={16} color="#00F5FF" />
                    <span style={{ color: '#00F5FF', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                      FIBALGO AGENT
                    </span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: isMobile ? '0.85rem' : '0.9rem', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                    {analysis.summary || analysis.headline}
                  </p>
                </div>
              )}

              {/* Scenarios Table - Simplified for mobile */}
              {analysis.scenarioPlaybook && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.4)', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <BarChart3 size={14} color={config.color} />
                    <span style={{ color: config.color, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px' }}>
                      SCENARIO PLAYBOOK
                    </span>
                  </div>
                  {Object.entries(analysis.scenarioPlaybook).slice(0, isMobile ? 3 : 5).map(([scenario, data]: [string, any], index: number) => {
                    const isPositive = scenario.toLowerCase().includes('beat') || scenario.toLowerCase().includes('above');
                    const isNegative = scenario.toLowerCase().includes('miss') || scenario.toLowerCase().includes('below');
                    const scenarioColor = isPositive ? '#22C55E' : isNegative ? '#EF4444' : '#F59E0B';
                    const displayName = data?.label || scenario.replace(/([A-Z])/g, ' $1').trim();
                    const isNoTrade = data?.action === 'no_trade';
                    const trades = data?.trades || [];

                    return (
                      <div key={scenario} style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: scenarioColor }} />
                          <span style={{ color: scenarioColor, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {displayName}
                          </span>
                        </div>
                        {isNoTrade ? (
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginLeft: '16px' }}>
                            No trade — {data?.reason}
                          </div>
                        ) : trades.length > 0 && (
                          <div style={{ marginLeft: '16px' }}>
                            {trades.slice(0, 1).map((trade: any, i: number) => (
                              <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                background: `${trade.direction === 'long' ? '#22C55E' : '#EF4444'}15`,
                                borderRadius: '8px'
                              }}>
                                <span style={{ 
                                  color: trade.direction === 'long' ? '#22C55E' : '#EF4444',
                                  fontSize: '0.7rem',
                                  fontWeight: 700
                                }}>
                                  {trade.direction === 'long' ? '↑ LONG' : '↓ SHORT'} {trade.asset}
                                </span>
                                {trade.confidence && (
                                  <span style={{ 
                                    color: trade.confidence >= 70 ? '#22C55E' : '#F59E0B',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    marginLeft: 'auto'
                                  }}>
                                    {trade.confidence}%
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
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
// SHARED UPCOMING EVENT CARD (Desktop + Mobile)
// ═══════════════════════════════════════════════════════════════════

interface SharedUpcomingEventCardProps {
  event: any;
  analysis: any;
  hoursUntil: number;
  onAssetClick?: (symbol: string) => void;
  isMobile?: boolean;
  isPremium?: boolean;
}

export const SharedUpcomingEventCard = ({ 
  event, 
  analysis, 
  hoursUntil, 
  onAssetClick,
  isMobile = false,
  isPremium = true
}: SharedUpcomingEventCardProps) => {
  const [expanded, setExpanded] = useState(false);
  
  // Tier config for badges
  const tierColors: Record<number | string, { bg: string; border: string; text: string; color: string }> = {
    1: { bg: 'rgba(239,68,68,0.15)', border: '#EF4444', text: 'TIER 1', color: '#EF4444' },
    2: { bg: 'rgba(245,158,11,0.15)', border: '#F59E0B', text: 'TIER 2', color: '#F59E0B' },
    3: { bg: 'rgba(59,130,246,0.15)', border: '#3B82F6', text: 'TIER 3', color: '#3B82F6' },
    'tier1_market_mover': { bg: 'rgba(239,68,68,0.15)', border: '#EF4444', text: 'TIER 1', color: '#EF4444' },
    'tier2_significant': { bg: 'rgba(245,158,11,0.15)', border: '#F59E0B', text: 'TIER 2', color: '#F59E0B' },
    'tier3_moderate': { bg: 'rgba(59,130,246,0.15)', border: '#3B82F6', text: 'TIER 3', color: '#3B82F6' }
  };
  
  const tier = analysis?.eventClassification?.tier || analysis?.event_classification?.tier || 3;
  const tierConfig = tierColors[tier] || tierColors[3];
  const conviction = analysis?.preEventStrategy?.conviction || analysis?.conviction_score || 5;
  const summary = analysis?.summary || analysis?.preEventStrategy?.reasoning || '';
  
  const timeDisplay = hoursUntil < 1 
    ? `${Math.round(hoursUntil * 60)}m` 
    : hoursUntil < 24 
      ? `${Math.round(hoursUntil)}h`
      : `${Math.round(hoursUntil / 24)}d`;

  // Upcoming card uses CYAN theme (same as desktop)
  const cardColor = '#00F5FF';

  // Mobile responsive sizes
  const padding = isMobile ? '14px' : '1.5rem';
  const iconSize = isMobile ? 48 : 72;
  const flagSize = isMobile ? 24 : 32;
  const titleSize = isMobile ? '1rem' : '1.25rem';

  return (
    <div 
      style={{
        background: `linear-gradient(135deg, rgba(0,245,255,0.08) 0%, #0D1117 50%, rgba(0,245,255,0.05) 100%)`,
        border: `2px solid ${cardColor}`,
        borderRadius: '16px',
        padding: padding,
        marginBottom: isMobile ? '12px' : '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
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

      {/* Time Badge */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '10px' : '1rem',
        right: isMobile ? '10px' : '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(0,0,0,0.5)',
        padding: isMobile ? '4px 10px' : '0.35rem 0.75rem',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          width: isMobile ? '8px' : '10px',
          height: isMobile ? '8px' : '10px',
          borderRadius: '50%',
          background: cardColor,
          boxShadow: `0 0 10px ${cardColor}80`
        }} />
        <span style={{ color: '#fff', fontSize: isMobile ? '0.65rem' : '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
          {isMobile ? timeDisplay : `UPCOMING • ${timeDisplay}`}
        </span>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: isMobile ? '12px' : '1.5rem', alignItems: 'flex-start', position: 'relative' }}>
        {/* Cyan Icon */}
        <div style={{
          width: iconSize,
          height: iconSize,
          borderRadius: isMobile ? '12px' : '16px',
          background: `linear-gradient(135deg, ${cardColor}30, ${cardColor}10)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${cardColor}40`
        }}>
          <Eye size={isMobile ? 24 : 36} color={cardColor} />
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <FlagImg country={event.country} size={flagSize} />
            <div>
              <h3 style={{ color: '#fff', fontSize: titleSize, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {event.title || event.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: `${tierConfig.border}30`,
                  color: tierConfig.color,
                  fontSize: isMobile ? '0.6rem' : '0.65rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  letterSpacing: '0.5px'
                }}>
                  {tierConfig.text}
                </span>
              </div>
            </div>
          </div>

          {/* Forecast/Previous Row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: isMobile ? '8px' : '1rem',
            marginTop: isMobile ? '10px' : '1rem',
            marginBottom: isMobile ? '10px' : '1rem'
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '10px 8px' : '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '0.6rem' : '0.7rem', marginBottom: '0.25rem', letterSpacing: '1px' }}>FORECAST</div>
              <div style={{ color: '#fff', fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 600 }}>{event.forecast || '—'}</div>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '10px 8px' : '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '0.6rem' : '0.7rem', marginBottom: '0.25rem', letterSpacing: '1px' }}>PREVIOUS</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 500 }}>{event.previous || '—'}</div>
            </div>
          </div>

          {/* Conviction Bar - Desktop only */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Conviction</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                  <div key={i} style={{
                    width: '8px',
                    height: '12px',
                    borderRadius: '2px',
                    background: i <= conviction 
                      ? (conviction >= 8 ? '#22C55E' : conviction >= 5 ? '#F59E0B' : '#6B7280')
                      : 'rgba(255,255,255,0.1)'
                  }} />
                ))}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{conviction}/10</span>
            </div>
          )}

          {/* Assets */}
          {analysis?.tradingview_assets && analysis.tradingview_assets.length > 0 && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: isMobile ? '10px' : '1rem'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobile ? '0.65rem' : '0.7rem', fontWeight: 500 }}>
                ASSETS
              </span>
              {analysis.tradingview_assets.slice(0, isMobile ? 4 : 6).map((asset: string, idx: number) => {
                const displayName = asset.includes(':') ? asset.split(':')[1] : asset;
                return (
                  <button 
                    key={idx}
                    className="no-swipe"
                    onClick={() => onAssetClick?.(asset)}
                    style={{
                      background: 'rgba(0,245,255,0.1)',
                      border: '1px solid rgba(0,245,255,0.3)',
                      color: '#00F5FF',
                      fontSize: isMobile ? '0.65rem' : '0.7rem',
                      fontWeight: 600,
                      padding: isMobile ? '3px 8px' : '0.25rem 0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Expand Button - no-swipe to prevent accidental tab switch */}
          <button
            className="no-swipe"
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: isMobile ? '8px 12px' : '0.5rem 0.8rem',
              color: '#fff',
              fontSize: isMobile ? '0.75rem' : '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Hide Details' : 'Show Full Analysis'}
          </button>

          {/* Expanded Content */}
          {expanded && (
            <div style={{ position: 'relative', marginTop: '1rem' }}>
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
              {/* Summary */}
              {summary && (
                <div style={{
                  background: 'rgba(0,245,255,0.08)',
                  borderLeft: '4px solid #00F5FF',
                  borderRadius: '0 12px 12px 0',
                  padding: isMobile ? '12px' : '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <Brain size={14} color="#00F5FF" />
                    <span style={{ color: '#00F5FF', fontSize: '0.7rem', fontWeight: 700 }}>FIBALGO ANALYSIS</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: isMobile ? '0.8rem' : '0.85rem', margin: 0, lineHeight: 1.5 }}>
                    {summary}
                  </p>
                </div>
              )}

              {/* Scenarios */}
              {analysis.scenarioPlaybook && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <BarChart3 size={14} color="#00F5FF" />
                    <span style={{ color: '#00F5FF', fontSize: '0.7rem', fontWeight: 700 }}>SCENARIO PLAYBOOK</span>
                  </div>
                  {Object.entries(analysis.scenarioPlaybook).slice(0, isMobile ? 3 : 5).map(([scenario, data]: [string, any]) => {
                    const isPositive = scenario.toLowerCase().includes('beat') || scenario.toLowerCase().includes('above');
                    const isNegative = scenario.toLowerCase().includes('miss') || scenario.toLowerCase().includes('below');
                    const scenarioColor = isPositive ? '#22C55E' : isNegative ? '#EF4444' : '#F59E0B';
                    const displayName = data?.label || scenario.replace(/([A-Z])/g, ' $1').trim();
                    const isNoTrade = data?.action === 'no_trade';
                    const trades = data?.trades || [];

                    return (
                      <div key={scenario} style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: scenarioColor }} />
                          <span style={{ color: scenarioColor, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {displayName}
                          </span>
                        </div>
                        {isNoTrade ? (
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginLeft: '16px' }}>
                            No trade — {data?.reason}
                          </div>
                        ) : trades.length > 0 && (
                          <div style={{ marginLeft: '16px' }}>
                            {trades.slice(0, 1).map((trade: any, i: number) => (
                              <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                background: `${trade.direction === 'long' ? '#22C55E' : '#EF4444'}15`,
                                borderRadius: '8px'
                              }}>
                                <span style={{ 
                                  color: trade.direction === 'long' ? '#22C55E' : '#EF4444',
                                  fontSize: '0.7rem',
                                  fontWeight: 700
                                }}>
                                  {trade.direction === 'long' ? '↑ LONG' : '↓ SHORT'} {trade.asset}
                                </span>
                                {trade.confidence && (
                                  <span style={{ 
                                    color: trade.confidence >= 70 ? '#22C55E' : '#F59E0B',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    marginLeft: 'auto'
                                  }}>
                                    {trade.confidence}%
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Additional Info Grid - Key Risks, Historical, Expectations */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: isMobile ? '10px' : '1rem',
                marginTop: '1rem'
              }}>
                {/* Key Risks */}
                {analysis?.keyRisks && analysis.keyRisks.length > 0 && (
                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: isMobile ? '12px' : '16px',
                    border: '1px solid rgba(239,68,68,0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'rgba(239,68,68,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Target size={14} color="#EF4444" />
                      </div>
                      <span style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>KEY RISKS</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {analysis.keyRisks.slice(0, 3).map((risk: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#EF4444', marginTop: '6px', flexShrink: 0 }} />
                          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '0.75rem' : '0.8rem', lineHeight: 1.4 }}>{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Historical Analysis */}
                {analysis?.historicalAnalysis && (
                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: isMobile ? '12px' : '16px',
                    border: '1px solid rgba(139,92,246,0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'rgba(139,92,246,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <BarChart3 size={14} color="#8B5CF6" />
                      </div>
                      <span style={{ color: '#8B5CF6', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>HISTORICAL</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {analysis.historicalAnalysis.beatRate && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Beat Rate</span>
                          <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{analysis.historicalAnalysis.beatRate}</span>
                        </div>
                      )}
                      {analysis.historicalAnalysis.typicalReaction && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Typical Move</span>
                          <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{analysis.historicalAnalysis.typicalReaction}</span>
                        </div>
                      )}
                      {analysis.historicalAnalysis.keyInsight && (
                        <div style={{ marginTop: '6px', padding: '8px', background: 'rgba(139,92,246,0.1)', borderRadius: '6px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', fontStyle: 'italic' }}>{analysis.historicalAnalysis.keyInsight}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expectations */}
                {analysis?.expectationsAnalysis && (
                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: isMobile ? '12px' : '16px',
                    border: '1px solid rgba(245,158,11,0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'rgba(245,158,11,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Eye size={14} color="#F59E0B" />
                      </div>
                      <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>EXPECTATIONS</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {analysis.expectationsAnalysis.whisperNumber && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Whisper</span>
                          <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 700 }}>{analysis.expectationsAnalysis.whisperNumber}</span>
                        </div>
                      )}
                      {analysis.expectationsAnalysis.whatWouldSurprise && (
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Would Surprise:</span>
                          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', marginTop: '2px' }}>{analysis.expectationsAnalysis.whatWouldSurprise}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Earnings-specific: EPS & Revenue */}
                {analysis?.eventCategory === 'earnings' && (analysis?.epsEstimate || analysis?.revenueEstimate) && (
                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: isMobile ? '12px' : '16px',
                    border: '1px solid rgba(34,197,94,0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'rgba(34,197,94,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Briefcase size={14} color="#22C55E" />
                      </div>
                      <span style={{ color: '#22C55E', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>EARNINGS</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {analysis.symbol && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Symbol</span>
                          <span style={{ color: '#22C55E', fontSize: '0.75rem', fontWeight: 700 }}>{analysis.symbol}</span>
                        </div>
                      )}
                      {analysis.epsEstimate && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>EPS Est.</span>
                          <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>${analysis.epsEstimate}</span>
                        </div>
                      )}
                      {analysis.epsWhisper && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>EPS Whisper</span>
                          <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600 }}>${analysis.epsWhisper}</span>
                        </div>
                      )}
                      {analysis.revenueEstimate && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Revenue Est.</span>
                          <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>${(analysis.revenueEstimate / 1e9).toFixed(2)}B</span>
                        </div>
                      )}
                      {analysis.guidanceExpectation && (
                        <div style={{ marginTop: '4px', padding: '6px', background: 'rgba(34,197,94,0.1)', borderRadius: '6px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Guidance:</span>
                          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', marginTop: '2px' }}>{analysis.guidanceExpectation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* IPO-specific: Price Range & Demand */}
                {analysis?.eventCategory === 'ipo' && (analysis?.priceRangeLow || analysis?.priceRangeHigh) && (
                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: isMobile ? '12px' : '16px',
                    border: '1px solid rgba(168,85,247,0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'rgba(168,85,247,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Building2 size={14} color="#A855F7" />
                      </div>
                      <span style={{ color: '#A855F7', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>IPO DETAILS</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {analysis.symbol && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Symbol</span>
                          <span style={{ color: '#A855F7', fontSize: '0.75rem', fontWeight: 700 }}>{analysis.symbol}</span>
                        </div>
                      )}
                      {analysis.exchange && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Exchange</span>
                          <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{analysis.exchange}</span>
                        </div>
                      )}
                      {(analysis.priceRangeLow || analysis.priceRangeHigh) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Price Range</span>
                          <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
                            ${analysis.priceRangeLow || '?'} - ${analysis.priceRangeHigh || '?'}
                          </span>
                        </div>
                      )}
                      {analysis.ipoPrice && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>IPO Price</span>
                          <span style={{ color: '#22C55E', fontSize: '0.75rem', fontWeight: 700 }}>${analysis.ipoPrice}</span>
                        </div>
                      )}
                      {analysis.sharesOffered && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Shares</span>
                          <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{(analysis.sharesOffered / 1e6).toFixed(1)}M</span>
                        </div>
                      )}
                      {analysis.demandAssessment && (
                        <div style={{ marginTop: '4px', padding: '6px', background: 'rgba(168,85,247,0.1)', borderRadius: '6px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Demand:</span>
                          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', marginTop: '2px' }}>{analysis.demandAssessment}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
