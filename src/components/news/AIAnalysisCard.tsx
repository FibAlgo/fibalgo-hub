'use client';

import { useState } from 'react';
import { 
  Zap, AlertTriangle, TrendingUp, TrendingDown, 
  Activity, Target, Shield, Clock, ChevronDown, 
  ChevronUp, Lightbulb, AlertCircle, CheckCircle,
  Users, DollarSign, BarChart3, Brain,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 📊 AI ANALYSIS INTERFACE (matches analyze-news route output)
// ═══════════════════════════════════════════════════════════════

export interface AIAnalysis {
  breakingNews: {
    isBreaking: boolean;
    urgencyLevel: 'critical' | 'elevated' | 'normal';
    responseWindow: 'minutes' | 'hours' | 'days';
  };
  informationQuality: {
    sourceType: 'primary' | 'secondary';
    confidence: 'confirmed' | 'likely' | 'speculative';
  };
  noveltyAssessment: {
    isNew: boolean;
    pricedInScore: number; // 1-10
    reasoning: string;
  };
  marketContextFit: {
    currentRegime: 'risk-on' | 'risk-off' | 'neutral';
    regimeEffect: 'amplifies' | 'dampens' | 'neutral';
    priceActionConflict: boolean;
  };
  flowAnalysis: {
    primaryActors: string[];
    forcedFlows: boolean;
    expectedMagnitude: 'negligible' | 'minor' | 'moderate' | 'significant' | 'massive';
  };
  analysis: {
    sentiment: 'strong_bullish' | 'bullish' | 'lean_bullish' | 'neutral' | 'lean_bearish' | 'bearish' | 'strong_bearish';
    conviction: number; // 1-10
    timeHorizon: 'intraday' | 'days' | 'weeks' | 'structural';
    thesis: string;
    secondOrderEffects: string;
    keyRisk: string;
  };
  trade: {
    wouldTrade: boolean;
    direction: 'long' | 'short' | 'none';
    primaryAsset: string;
    alternativeAssets: string[];
    rationale: string;
    invalidation: string;
    riskReward: 'poor' | 'fair' | 'good' | 'excellent';
  };
  meta: {
    relatedAssets: string[];
    category: 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices' | 'macro';
  };
  validationWarnings?: Array<{
    rule: string;
    message: string;
    severity: 'warning' | 'error';
  }>;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const getSentimentDisplay = (sentiment: AIAnalysis['analysis']['sentiment']) => {
  const map = {
    strong_bullish: { label: 'Strong Bullish', color: '#22C55E', bg: 'rgba(34,197,94,0.15)', icon: '🚀' },
    bullish: { label: 'Bullish', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)', icon: '📈' },
    lean_bullish: { label: 'Lean Bullish', color: '#86EFAC', bg: 'rgba(134,239,172,0.10)', icon: '↗️' },
    neutral: { label: 'Neutral', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', icon: '➡️' },
    lean_bearish: { label: 'Lean Bearish', color: '#FCA5A5', bg: 'rgba(252,165,165,0.10)', icon: '↘️' },
    bearish: { label: 'Bearish', color: '#F87171', bg: 'rgba(248,113,113,0.12)', icon: '📉' },
    strong_bearish: { label: 'Strong Bearish', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', icon: '💀' },
  };
  return map[sentiment] || map.neutral;
};

const getUrgencyDisplay = (urgency: 'critical' | 'elevated' | 'normal') => {
  const map = {
    critical: { label: 'CRITICAL', color: '#EF4444', bg: 'rgba(239,68,68,0.2)', pulse: true },
    elevated: { label: 'Elevated', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', pulse: false },
    normal: { label: 'Normal', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', pulse: false },
  };
  return map[urgency];
};

const getConvictionColor = (conviction: number) => {
  if (conviction >= 8) return '#22C55E';
  if (conviction >= 6) return '#4ADE80';
  if (conviction >= 4) return '#F59E0B';
  if (conviction >= 2) return '#FB923C';
  return '#EF4444';
};

const getRegimeDisplay = (regime: 'risk-on' | 'risk-off' | 'neutral') => {
  const map = {
    'risk-on': { label: 'Risk-On', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    'risk-off': { label: 'Risk-Off', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    'neutral': { label: 'Neutral', color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' },
  };
  return map[regime];
};

const getMagnitudeDisplay = (magnitude: string) => {
  const map: Record<string, { label: string; color: string; bars: number }> = {
    negligible: { label: 'Negligible', color: '#6B7280', bars: 1 },
    minor: { label: 'Minor', color: '#9CA3AF', bars: 2 },
    moderate: { label: 'Moderate', color: '#F59E0B', bars: 3 },
    significant: { label: 'Significant', color: '#FB923C', bars: 4 },
    massive: { label: 'Massive', color: '#EF4444', bars: 5 },
  };
  return map[magnitude] || map.minor;
};

const getRiskRewardDisplay = (rr: string) => {
  const map: Record<string, { label: string; color: string; icon: string }> = {
    poor: { label: 'Poor R:R', color: '#EF4444', icon: '✗' },
    fair: { label: 'Fair R:R', color: '#F59E0B', icon: '○' },
    good: { label: 'Good R:R', color: '#4ADE80', icon: '✓' },
    excellent: { label: 'Excellent R:R', color: '#22C55E', icon: '★' },
  };
  return map[rr] || map.fair;
};

// ═══════════════════════════════════════════════════════════════
// 🏷️ BADGE COMPONENTS (RE-DESIGNED FOR PRO LOOK)
// ═══════════════════════════════════════════════════════════════

export function UrgencyBadge({ urgency }: { urgency: 'critical' | 'elevated' | 'normal' }) {
  const display = getUrgencyDisplay(urgency);
  
  if (urgency === 'normal') return null;
  
  return (
    <span style={{
      background: display.bg,
      border: `1px solid ${display.color}40`,
      color: display.color,
      padding: '0.2rem 0.6rem',
      borderRadius: '2px', // Sharper corners for pro look
      fontSize: '0.6rem',
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      boxShadow: `0 0 10px ${display.color}20`, // Subtle glow
    }}>
      {urgency === 'critical' && <Zap size={10} fill={display.color} />}
      {urgency === 'elevated' && <AlertTriangle size={10} />}
      {display.label}
    </span>
  );
}

export function ConvictionMeter({ conviction }: { conviction: number }) {
  const color = getConvictionColor(conviction);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            style={{
              width: '4px',
              height: '14px',
              background: i < conviction ? color : 'rgba(255,255,255,0.05)',
              borderRadius: '1px',
              boxShadow: i < conviction ? `0 0 4px ${color}60` : 'none',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>
      <span style={{ 
        color, 
        fontWeight: 700, 
        fontSize: '0.85rem',
        fontFamily: 'monospace', // Monospace for tabular data look
        minWidth: '35px',
        textAlign: 'right'
      }}>
        {conviction.toFixed(1)}
      </span>
    </div>
  );
}

export function SentimentBadge({ sentiment }: { sentiment: AIAnalysis['analysis']['sentiment'] }) {
  const display = getSentimentDisplay(sentiment);
  
  return (
    <div style={{
      background: typeof display.bg === 'string' && display.bg.startsWith('linear') ? display.bg : display.bg,
      border: `1px solid ${display.color}40`,
      borderRadius: '4px',
      padding: '0.4rem 0.85rem',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      boxShadow: `0 2px 10px ${display.color}10`
    }}>
      <span style={{ fontSize: '0.9rem', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }}>{display.icon}</span>
      <span style={{ 
        color: display.color, 
        fontWeight: 700, 
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
        textTransform: 'uppercase'
      }}>
        {display.label}
      </span>
    </div>
  );
}

export function PricedInIndicator({ score, reasoning }: { score: number; reasoning: string }) {
  // Creating a gradient bar with a needle indicator
  const getColor = (s: number) => {
    if (s <= 3) return '#22C55E';
    if (s <= 6) return '#F59E0B';
    return '#EF4444';
  };

  const activeColor = getColor(score);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priced In</span>
         <span style={{ color: activeColor, fontSize: '0.65rem', fontWeight: 700 }}>{score}/10</span>
      </div>
      
      <div style={{ position: 'relative', height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
        {/* Background Gradient Line */}
        <div style={{
          position: 'absolute',
          top: 0, 
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: '3px',
          background: 'linear-gradient(90deg, #22C55E 0%, #F59E0B 50%, #EF4444 100%)',
          opacity: 0.3
        }} />
        
        {/* The Needle/Marker */}
        <div style={{
          position: 'absolute',
          left: `${(score / 10) * 100}%`,
          top: '-2px',
          width: '2px', // Thin precise line
          height: '10px',
          background: '#fff',
          boxShadow: '0 0 8px rgba(255,255,255,0.8)',
          transform: 'translateX(-50%)',
          zIndex: 2
        }} />
      </div>
    </div>
  );
}

// Re-designed Impact/Flow Magnitude visualization
export function MagnitudeMeter({ magnitude }: { magnitude: string }) {
  const config = getMagnitudeDisplay(magnitude);
  const levels = ['negligible', 'minor', 'moderate', 'significant', 'massive'];
  const currentIndex = levels.indexOf(magnitude);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '100px' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Market Impact</span>
         <span style={{ color: config.color, fontSize: '0.65rem', fontWeight: 700 }}>{config.label}</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '10px' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            flex: 1,
            height: i <= currentIndex ? '100%' : '20%', // Full height if active, small blip if not
            background: i <= currentIndex ? config.color : 'rgba(255,255,255,0.1)',
            opacity: i <= currentIndex ? 1 : 0.5,
            borderRadius: '1px',
            transition: 'all 0.3s ease',
            boxShadow: i <= currentIndex ? `0 0 6px ${config.color}40` : 'none'
          }} />
        ))}
      </div>
    </div>
  );
}

export function TradeSignalBadge({ trade }: { trade: AIAnalysis['trade'] }) {
  if (!trade.wouldTrade) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px', // Sharper
        padding: '0.6rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
      }}>
        <div style={{
          width: '24px', height: '24px', 
          borderRadius: '50%', background: 'rgba(156,163,175,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
           <Shield size={12} color="#9CA3AF" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
           <span style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No Trade</span>
           <span style={{ color: 'rgba(156,163,175,0.8)', fontSize: '0.7rem' }}>Parameters not met</span>
        </div>
      </div>
    );
  }
  
  const directionColor = trade.direction === 'long' ? '#22C55E' : '#EF4444';
  
  return (
    <div style={{
      background: trade.direction === 'long' 
        ? 'linear-gradient(90deg, rgba(34,197,94,0.08) 0%, rgba(0,0,0,0) 100%)'
        : 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(0,0,0,0) 100%)',
      borderLeft: `4px solid ${directionColor}`, // Professional left border indicator
      padding: '0.75rem 1rem',
      backgroundColor: 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Signal Type Icon */}
          <div style={{
            width: '28px', height: '28px',
            borderRadius: '6px',
            background: `${directionColor}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${directionColor}40`
          }}>
             {trade.direction === 'long' ? <ArrowUpRight size={16} color={directionColor} /> : <ArrowDownRight size={16} color={directionColor} />}
          </div>
          
          <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  color: directionColor, 
                  fontWeight: 800, 
                  fontSize: '0.9rem', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {trade.direction}
                </span>
                <span style={{
                   background: 'rgba(255,255,255,0.1)',
                   padding: '0.1rem 0.4rem',
                   borderRadius: '4px',
                   color: '#fff',
                   fontSize: '0.75rem',
                   fontWeight: 700,
                   fontFamily: 'monospace'
                }}>
                  {trade.primaryAsset}
                </span>
             </div>
             <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Setup Identified
             </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
           <div style={{ 
             color: getRiskRewardDisplay(trade.riskReward).color, 
             fontWeight: 700, 
             fontSize: '0.8rem',
             display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end'
           }}>
              {getRiskRewardDisplay(trade.riskReward).icon}
              {getRiskRewardDisplay(trade.riskReward).label}
           </div>
           <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', textTransform: 'uppercase' }}>
              Risk / Reward
           </div>
        </div>
      </div>
      
      <div style={{ 
        marginTop: '0.75rem', 
        paddingTop: '0.75rem', 
        borderTop: '1px solid rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.8)', 
        fontSize: '0.85rem', 
        lineHeight: 1.5,
        fontFamily: '"Geist Mono", monospace' // If available, otherwise falls back
      }}>
        {trade.rationale}
      </div>
      
      {trade.alternativeAssets.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Correlated:</span>
          {trade.alternativeAssets.map((asset, idx) => (
            <span key={idx} style={{
              color: '#A78BFA',
              fontSize: '0.7rem',
              fontWeight: 600,
              fontFamily: 'monospace',
              borderBottom: '1px dashed #A78BFA'
            }}>
              {asset}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MagnitudeBars({ magnitude }: { magnitude: string }) {
  const display = getMagnitudeDisplay(magnitude);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Impact:</span>
      <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
        {[1, 2, 3, 4, 5].map((level) => (
          <div key={level} style={{
            width: '4px',
            height: `${6 + level * 2}px`,
            background: level <= display.bars ? display.color : 'rgba(255,255,255,0.1)',
            borderRadius: '1px',
          }} />
        ))}
      </div>
      <span style={{ color: display.color, fontSize: '0.65rem', fontWeight: 600 }}>{display.label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 📰 MAIN AI ANALYSIS CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

interface AIAnalysisCardProps {
  analysis: AIAnalysis;
  compact?: boolean;
}

export default function AIAnalysisCard({ analysis, compact = false }: AIAnalysisCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const sentimentDisplay = getSentimentDisplay(analysis.analysis.sentiment);
  const regimeDisplay = getRegimeDisplay(analysis.marketContextFit.currentRegime);
  
  // Compact view for inline display
  if (compact) {
    return (
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        padding: '0.75rem',
        marginTop: '0.5rem',
      }}>
        {/* Top Row: Sentiment + Conviction + Urgency */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <SentimentBadge sentiment={analysis.analysis.sentiment} />
          <ConvictionMeter conviction={analysis.analysis.conviction} />
          <UrgencyBadge urgency={analysis.breakingNews.urgencyLevel} />
          
          {/* Time Horizon */}
          <span style={{
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.3)',
            color: '#A78BFA',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            <Clock size={10} />
            {analysis.analysis.timeHorizon}
          </span>
        </div>
        
        {/* Thesis */}
        <div style={{ 
          color: 'rgba(255,255,255,0.85)', 
          fontSize: '0.85rem', 
          lineHeight: 1.5,
          marginBottom: '0.75rem',
        }}>
          <Brain size={12} style={{ display: 'inline', marginRight: '0.25rem', color: '#00F5FF' }} />
          {analysis.analysis.thesis}
        </div>
        
        {/* Market Context Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            background: regimeDisplay.bg,
            border: `1px solid ${regimeDisplay.color}40`,
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            <Activity size={10} color={regimeDisplay.color} />
            <span style={{ color: regimeDisplay.color, fontSize: '0.7rem', fontWeight: 600 }}>
              {regimeDisplay.label}
            </span>
          </div>
          
          <MagnitudeBars magnitude={analysis.flowAnalysis.expectedMagnitude} />
          
          {analysis.noveltyAssessment.pricedInScore && (
            <PricedInIndicator 
              score={analysis.noveltyAssessment.pricedInScore} 
              reasoning={analysis.noveltyAssessment.reasoning} 
            />
          )}
        </div>
        
        {/* Trade Signal */}
        {analysis.trade && (
          <TradeSignalBadge trade={analysis.trade} />
        )}
        
        {/* Expand Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#00F5FF',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            marginTop: '0.75rem',
            padding: 0,
          }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Show Less' : 'Full Analysis'}
        </button>
        
        {/* Expanded Details */}
        {expanded && (
          <div style={{ 
            marginTop: '1rem', 
            paddingTop: '1rem', 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            {/* Second Order Effects */}
            <div>
              <div style={{ 
                color: '#F59E0B', 
                fontSize: '0.7rem', 
                fontWeight: 600, 
                marginBottom: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <Lightbulb size={12} />
                Second-Order Effects
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                {analysis.analysis.secondOrderEffects}
              </div>
            </div>
            
            {/* Key Risk */}
            <div>
              <div style={{ 
                color: '#EF4444', 
                fontSize: '0.7rem', 
                fontWeight: 600, 
                marginBottom: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}>
                <AlertCircle size={12} />
                Key Risk
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                {analysis.analysis.keyRisk}
              </div>
            </div>
            
            {/* Invalidation */}
            {analysis.trade.wouldTrade && (
              <div>
                <div style={{ 
                  color: '#9CA3AF', 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  marginBottom: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}>
                  <Shield size={12} />
                  Invalidation
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  {analysis.trade.invalidation}
                </div>
              </div>
            )}
            
            {/* Flow Analysis */}
            {analysis.flowAnalysis.primaryActors.length > 0 && (
              <div>
                <div style={{ 
                  color: '#8B5CF6', 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  marginBottom: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}>
                  <Users size={12} />
                  Primary Actors
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {analysis.flowAnalysis.primaryActors.map((actor, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      color: '#A78BFA',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                    }}>
                      {actor}
                    </span>
                  ))}
                  {analysis.flowAnalysis.forcedFlows && (
                    <span style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#EF4444',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                    }}>
                      ⚠️ Forced Flows
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Information Quality */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                background: analysis.informationQuality.sourceType === 'primary' 
                  ? 'rgba(34,197,94,0.1)' 
                  : 'rgba(245,158,11,0.1)',
                border: `1px solid ${analysis.informationQuality.sourceType === 'primary' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                color: analysis.informationQuality.sourceType === 'primary' ? '#22C55E' : '#F59E0B',
              }}>
                📰 {analysis.informationQuality.sourceType === 'primary' ? 'Primary Source' : 'Secondary Source'}
              </div>
              <div style={{
                background: analysis.informationQuality.confidence === 'confirmed' 
                  ? 'rgba(34,197,94,0.1)' 
                  : analysis.informationQuality.confidence === 'likely' 
                    ? 'rgba(245,158,11,0.1)' 
                    : 'rgba(239,68,68,0.1)',
                border: `1px solid ${
                  analysis.informationQuality.confidence === 'confirmed' ? 'rgba(34,197,94,0.3)' 
                  : analysis.informationQuality.confidence === 'likely' ? 'rgba(245,158,11,0.3)' 
                  : 'rgba(239,68,68,0.3)'
                }`,
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                color: analysis.informationQuality.confidence === 'confirmed' ? '#22C55E' 
                  : analysis.informationQuality.confidence === 'likely' ? '#F59E0B' 
                  : '#EF4444',
              }}>
                {analysis.informationQuality.confidence === 'confirmed' && <CheckCircle size={10} style={{ marginRight: '0.25rem' }} />}
                {analysis.informationQuality.confidence.charAt(0).toUpperCase() + analysis.informationQuality.confidence.slice(1)}
              </div>
            </div>
            
            {/* Related Assets */}
            {analysis.meta.relatedAssets.length > 0 && (
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                  Related Assets
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {analysis.meta.relatedAssets.map((asset, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(0,245,255,0.1)',
                      border: '1px solid rgba(0,245,255,0.3)',
                      color: '#00F5FF',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}>
                      {asset}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Validation Warnings */}
            {analysis.validationWarnings && analysis.validationWarnings.length > 0 && (
              <div style={{
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '8px',
                padding: '0.75rem',
              }}>
                <div style={{ 
                  color: '#F59E0B', 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}>
                  <AlertTriangle size={12} />
                  Analysis Warnings
                </div>
                {analysis.validationWarnings.map((warning, idx) => (
                  <div key={idx} style={{ 
                    color: warning.severity === 'error' ? '#EF4444' : '#F59E0B', 
                    fontSize: '0.75rem',
                    marginBottom: idx < analysis.validationWarnings!.length - 1 ? '0.25rem' : 0,
                  }}>
                    • {warning.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Full view (for modal or dedicated page)
  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '1.5rem',
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <SentimentBadge sentiment={analysis.analysis.sentiment} />
          <ConvictionMeter conviction={analysis.analysis.conviction} />
        </div>
        <UrgencyBadge urgency={analysis.breakingNews.urgencyLevel} />
      </div>
      
      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left Column */}
        <div>
          <h4 style={{ color: '#00F5FF', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Investment Thesis
          </h4>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {analysis.analysis.thesis}
          </p>
        </div>
        
        {/* Right Column */}
        <div>
          <TradeSignalBadge trade={analysis.trade} />
        </div>
      </div>
    </div>
  );
}
