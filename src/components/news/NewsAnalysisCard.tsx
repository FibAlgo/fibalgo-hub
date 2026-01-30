'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink, TrendingUp, TrendingDown,
  Zap, AlertTriangle, Brain,
  ChevronDown, ChevronUp,
  Users, AlertCircle, Lightbulb,
  CheckCircle, XCircle, Timer, Circle, Minus
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPES - New Stage 1-2-3 Format
// ═══════════════════════════════════════════════════════════════════════════════

interface TradePosition {
  asset: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  trade_type: 'scalping' | 'day_trading' | 'swing_trading' | 'position_trading';
  momentum_duration_minutes?: number;
  reasoning?: string;
  // Legacy fields (optional)
  position_size_percent?: number;
  risk_reward_ratio?: string;
  momentum_duration?: string;
  entry_reasoning?: string;
  stop_loss_reasoning?: string;
  take_profit_reasoning?: string;
}

interface Stage1Analysis {
  title?: string;
  analysis: string;
  should_build_infrastructure?: boolean;
  infrastructure_reasoning?: string;
  category?: 'forex' | 'cryptocurrency' | 'stocks' | 'commodities' | 'indices' | 'macro' | '';
  affected_assets?: string[];
  trading_styles_applicable?: ('scalping' | 'day_trading' | 'swing_trading' | 'position_trading')[];
  immediate_impact?: string;
  required_data?: string[];
}

interface Stage3Decision {
  trade_decision: 'TRADE' | 'NO TRADE';
  conviction?: number;
  importance_score: number;
  category?: 'forex' | 'cryptocurrency' | 'stocks' | 'commodities' | 'indices' | 'macro';
  info_quality?: 'VERIFIED' | 'SPECULATIVE' | 'RUMOR';
  market_impact?: number;
  market_regime?: 'RISK-ON' | 'RISK-OFF';
  risk_mode?: 'NORMAL' | 'ELEVATED' | 'HIGH RISK';
  positions: TradePosition[];
  main_risks: string[];
  overall_assessment: string;
}

interface PerplexityData {
  query: string;
  data: string;
  citations: string[];
}

export interface AIAnalysis {
  stage1: Stage1Analysis;
  collectedData: PerplexityData[];
  stage3: Stage3Decision;
  costs?: { total: number };
  timing?: { totalMs: number };
  analysis_duration_seconds?: number;
}

interface NewsAnalysisData {
  id: string;
  news_id: string;
  source: string;
  url: string;
  published_at: string;
  category: string;
  content: string;
  analyzed_at: string;
  is_breaking?: boolean;
  ai_analysis: AIAnalysis;
}

interface NewsAnalysisCardProps {
  data: NewsAnalysisData;
  className?: string;
  /** When provided (e.g. on desktop terminal/news), asset click opens chart popup instead of navigating */
  onAssetClick?: (symbol: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

type SentimentType = 'strong_bullish' | 'bullish' | 'lean_bullish' | 'neutral' | 'lean_bearish' | 'bearish' | 'strong_bearish';

const getSentimentFromScore = (score: number, hasPositions: boolean, direction?: 'BUY' | 'SELL'): SentimentType => {
  if (!hasPositions) return 'neutral';
  
  if (direction === 'BUY') {
    if (score >= 8) return 'strong_bullish';
    if (score >= 6) return 'bullish';
    return 'lean_bullish';
  } else if (direction === 'SELL') {
    if (score >= 8) return 'strong_bearish';
    if (score >= 6) return 'bearish';
    return 'lean_bearish';
  }
  return 'neutral';
};

const getSentimentConfig = (sentiment: SentimentType) => {
  const configs = {
    strong_bullish: { label: 'STRONG BUY', color: '#00E676', bgColor: 'rgba(0,230,118,0.15)', icon: '▲', tooltip: 'Strong buy signal - High confidence long position' },
    bullish: { label: 'BUY', color: '#00E676', bgColor: 'rgba(0,230,118,0.15)', icon: '▲', tooltip: 'Buy signal - Long position recommended' },
    lean_bullish: { label: 'LEAN BUY', color: '#22C55E', bgColor: 'rgba(34,197,94,0.12)', icon: '△', tooltip: 'Probable buy - Weak long signal' },
    neutral: { label: 'HOLD', color: '#78909C', bgColor: 'rgba(120,144,156,0.15)', icon: '—', tooltip: 'Neutral - No position, wait for clarity' },
    lean_bearish: { label: 'LEAN SELL', color: '#F87171', bgColor: 'rgba(248,113,113,0.12)', icon: '▽', tooltip: 'Probable sell - Weak short signal' },
    bearish: { label: 'SELL', color: '#EF4444', bgColor: 'rgba(239,68,68,0.15)', icon: '▼', tooltip: 'Sell signal - Short position recommended' },
    strong_bearish: { label: 'STRONG SELL', color: '#DC2626', bgColor: 'rgba(220,38,38,0.15)', icon: '▼', tooltip: 'Strong sell signal - High confidence short position' },
  };
  return configs[sentiment] || configs.neutral;
};

const getTradeTypeLabel = (tradeType: string): { label: string; color: string; bgColor: string } => {
  switch (tradeType) {
    case 'scalping': return { label: 'SCALP', color: '#FF6B6B', bgColor: 'rgba(255,107,107,0.15)' };
    case 'day_trading': return { label: 'DAY', color: '#4ECDC4', bgColor: 'rgba(78,205,196,0.15)' };
    case 'swing_trading': return { label: 'SWING', color: '#45B7D1', bgColor: 'rgba(69,183,209,0.15)' };
    case 'position_trading': return { label: 'POSITION', color: '#96CEB4', bgColor: 'rgba(150,206,180,0.15)' };
    default: return { label: 'TRADE', color: '#888', bgColor: 'rgba(136,136,136,0.15)' };
  }
};

const getMagnitudeFromScore = (score: number): 'negligible' | 'minor' | 'moderate' | 'significant' | 'massive' => {
  if (score >= 9) return 'massive';
  if (score >= 7) return 'significant';
  if (score >= 5) return 'moderate';
  if (score >= 3) return 'minor';
  return 'negligible';
};

// Tooltip component
const Tooltip = ({ children, text, fullWidth, position = 'top' }: { children: React.ReactNode; text: string; fullWidth?: boolean; position?: 'top' | 'bottom' | 'left' | 'right' }) => {
  const [show, setShow] = useState(false);

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom': return { top: '100%', bottom: 'auto', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', marginBottom: 0 };
      case 'left': return { right: '100%', left: 'auto', top: '50%', transform: 'translateY(-50%)', marginRight: '8px', marginBottom: 0 };
      case 'right': return { left: '100%', right: 'auto', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px', marginBottom: 0 };
      default: return { bottom: '100%', top: 'auto', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' };
    }
  };

  const getArrowStyles = () => {
    switch (position) {
      case 'bottom': return { bottom: '100%', top: 'auto', left: '50%', transform: 'translateX(-50%)', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid rgba(0,0,0,0.95)', borderTop: 'none' };
      case 'left': return { left: '100%', right: 'auto', top: '50%', transform: 'translateY(-50%)', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '6px solid rgba(0,0,0,0.95)', borderRight: 'none' };
      case 'right': return { right: '100%', left: 'auto', top: '50%', transform: 'translateY(-50%)', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '6px solid rgba(0,0,0,0.95)', borderLeft: 'none' };
      default: return { top: '100%', bottom: 'auto', left: '50%', transform: 'translateX(-50%)', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(0,0,0,0.95)', borderBottom: 'none' };
    }
  };

  return (
    <div
      style={{ position: 'relative', display: fullWidth ? 'flex' : 'inline-flex', width: fullWidth ? '100%' : 'auto' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          ...getPositionStyles(),
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.95)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '6px',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '0.7rem',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {text}
          <div style={{ position: 'absolute', ...getArrowStyles() }} />
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

// Collapsible Research Data Item Component
function ResearchDataItem({ item, index }: { item: { query: string; data: string; citations?: string[] }; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '6px', overflow: 'hidden' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span style={{ color: '#00E5FF', fontSize: '0.7rem', fontWeight: 600, flex: 1 }}>
          {index + 1}. {item.query}
        </span>
        {isOpen ? (
          <ChevronUp style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.5)' }} />
        ) : (
          <ChevronDown style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.5)' }} />
        )}
      </button>
      {isOpen && (
        <div style={{ padding: '0 10px 10px 10px', borderTop: '1px solid rgba(0,229,255,0.1)' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', lineHeight: 1.5, margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
            {item.data}
          </p>
        </div>
      )}
    </div>
  );
}

// Collapsible Trade Position Item Component
function TradePositionItem({ position }: { position: { asset: string; direction: 'BUY' | 'SELL'; confidence: number; trade_type?: string; reasoning?: string; stop_loss_reasoning?: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  const isBuy = position.direction === 'BUY';
  const bgColor = isBuy ? 'rgba(0,230,118,0.1)' : 'rgba(239,68,68,0.1)';
  const borderColor = isBuy ? 'rgba(0,230,118,0.3)' : 'rgba(239,68,68,0.3)';
  const textColor = isBuy ? '#00E676' : '#EF4444';
  
  return (
    <div style={{ background: bgColor, borderRadius: '6px', border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        {isBuy ? (
          <TrendingUp style={{ width: 20, height: 20, color: textColor }} />
        ) : (
          <TrendingDown style={{ width: 20, height: 20, color: textColor }} />
        )}
        <span style={{ color: textColor, fontWeight: 700, fontSize: '0.9rem' }}>
          {isBuy ? 'LONG' : 'SHORT'} {position.asset}
        </span>
        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
          {position.confidence}%
        </span>
        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
          {position.trade_type?.replace('_', ' ')}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          {isOpen ? (
            <ChevronUp style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.5)' }} />
          ) : (
            <ChevronDown style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.5)' }} />
          )}
        </div>
      </button>
      {isOpen && (position.reasoning || position.stop_loss_reasoning) && (
        <div style={{ padding: '0 10px 10px 10px', borderTop: `1px solid ${borderColor}` }}>
          {position.reasoning && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '4px', fontWeight: 600 }}>Trade Reasoning</p>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
                {position.reasoning}
              </p>
            </div>
          )}
          {position.stop_loss_reasoning && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ color: '#F59E0B', fontSize: '0.7rem', marginBottom: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle style={{ width: 12, height: 12 }} /> Trade Invalidation
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
                {position.stop_loss_reasoning}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NewsAnalysisCard({ data, className, onAssetClick }: NewsAnalysisCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isAgentExpanded, setIsAgentExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { stage1, stage3, collectedData } = data.ai_analysis;
  const isBreaking = data.is_breaking || false;
  
  // Quick reject: Stage 1 decided not to build infrastructure (NO case)
  const isQuickReject = stage1.should_build_infrastructure === false;
  
  const isTrade = stage3.trade_decision === 'TRADE';
  const score = stage3.importance_score;
  const firstPosition = stage3.positions[0];
  
  // Derive sentiment from new data
  const sentiment = getSentimentFromScore(score, isTrade, firstPosition?.direction);
  const sentimentConfig = getSentimentConfig(sentiment);
  const magnitude = getMagnitudeFromScore(score);
  
  // Get unique trade types from all positions
  const uniqueTradeTypes = [...new Set(stage3.positions.map(p => p.trade_type).filter(Boolean))];
  
  // Get category and regime from Stage 3 (with fallback to Stage 1)
  const category = stage3.category || stage1.category || 'macro';
  const marketRegime = stage3.market_regime || 'RISK-ON';
  const conviction = stage3.conviction ?? score;

  // Calculate relative time
  const getRelativeTime = () => {
    const now = new Date().getTime();
    const published = new Date(data.published_at).getTime();
    const diffMs = now - published;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(data.published_at).toLocaleDateString();
  };

  const displayTime = getRelativeTime();

  // Handle asset click
  const handleAssetClick = (asset: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onAssetClick) {
      onAssetClick(asset);
      return;
    }
    if (isMobile) {
      router.push(`/terminal/chart?symbol=${encodeURIComponent(asset)}`);
    } else {
      router.push(`/terminal?symbol=${encodeURIComponent(asset)}`);
    }
  };

  // Category colors
  const categoryColors: Record<string, { bg: string; color: string }> = {
    crypto: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    cryptocurrency: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    stocks: { bg: 'rgba(34,197,94,0.15)', color: '#22C55E' },
    forex: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
    commodities: { bg: 'rgba(168,85,247,0.15)', color: '#A855F7' },
    indices: { bg: 'rgba(20,184,166,0.15)', color: '#14B8A6' },
    macro: { bg: 'rgba(6,182,212,0.15)', color: '#06B6D4' },
  };
  const catColors = categoryColors[category.toLowerCase()] || { bg: 'rgba(0,229,255,0.15)', color: '#00E5FF' };

  return (
    <>
      <style>{`
        @keyframes breakingPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.3), inset 0 0 30px rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.5); }
          50% { box-shadow: 0 0 40px rgba(239,68,68,0.5), inset 0 0 50px rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.8); }
        }
        @keyframes breakingGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .news-card-container { margin-bottom: 12px; }
        .news-card-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; flex-wrap: wrap; }
        .news-card-content { padding: 16px; font-size: 1rem; line-height: 1.6; }
        .news-card-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .news-card-expanded { padding: 16px; }
        .news-card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .signal-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 12px; }
        .conviction-bars { display: flex; gap: 3px; }
        .conviction-bar { width: 7px; height: 18px; border-radius: 2px; }
        .time-badges { display: flex; gap: 8px; }
        .agent-box { padding: 16px; margin-bottom: 16px; }
        .trade-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .related-assets-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .news-card-footer { padding: 12px 16px; }
        .metric-box { min-width: 0; overflow: hidden; }

        @media (max-width: 768px) {
          .news-card-header { padding: 8px 12px; gap: 5px; }
          .news-card-content { padding: 12px; font-size: 0.9rem; }
          .news-card-expanded { padding: 12px; }
          .news-card-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin-left: -12px; margin-right: -12px; }
          .signal-row { flex-direction: column; align-items: flex-start; gap: 12px; }
          .conviction-bars { gap: 2px; }
          .conviction-bar { width: 6px; height: 14px; }
          .agent-box { padding: 12px; margin-bottom: 12px; }
          .trade-info-grid { grid-template-columns: 1fr; gap: 8px; }
          .news-card-footer { padding: 10px 12px; }
          .metric-box { padding: 8px 4px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; }
          .metric-box > div:first-child { font-size: 0.5rem !important; margin-bottom: 4px !important; }
        }
      `}</style>

      <div
        id={`news-card-${data.news_id || data.id}`}
        className={`news-card-container ${className || ''}`}
        style={{
          background: isBreaking
            ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, #0D1117 50%, rgba(239,68,68,0.05) 100%)'
            : '#0D1117',
          border: isBreaking
            ? '1px solid rgba(239,68,68,0.5)'
            : `1px solid ${sentimentConfig.color}30`,
          borderLeft: isBreaking
            ? '3px solid #EF4444'
            : `3px solid ${sentimentConfig.color}`,
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
          animation: isBreaking ? 'breakingPulse 2s ease-in-out infinite' : 'none',
        }}
      >
        {/* Breaking news glow overlay */}
        {isBreaking && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(180deg, rgba(239,68,68,0.15) 0%, transparent 30%, transparent 70%, rgba(239,68,68,0.1) 100%)',
            pointerEvents: 'none',
            animation: 'breakingGlow 2s ease-in-out infinite',
          }} />
        )}

        {/* HEADER */}
        <div className="news-card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 500 }}>{displayTime}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ background: 'linear-gradient(135deg, #00E5FF 0%, #00B8D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700, fontSize: '0.8rem' }}>
              {data.source || 'FibAlgo'}
            </span>
            {data.ai_analysis?.analysis_duration_seconds !== undefined && data.ai_analysis.analysis_duration_seconds > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 500 }}>
                speed= {data.ai_analysis.analysis_duration_seconds} sec.
              </span>
            )}
          </span>
          <span style={{ background: catColors.bg, color: catColors.color, padding: '2px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {category}
          </span>
          {isBreaking && (
            <span style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444', padding: '2px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s ease-in-out infinite' }} />
              BREAKING
            </span>
          )}
        </div>

        {/* NEWS CONTENT - AI Title (if available) or Original Content */}
        <div className="news-card-content" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500, lineHeight: 1.5 }}>
            {stage1.title || data.content}
          </p>
        </div>

        {/* AI ANALYSIS SECTION */}
        <div className="news-card-expanded" style={{ background: 'rgba(0,0,0,0.2)' }}>
          
          {/* QUICK REJECT CASE: Stage 1 decided not worth researching */}
          {isQuickReject ? (
            <>
              {/* Signal Row for Quick Reject - Low Impact with random 1-3 conviction */}
              {(() => {
                // Generate deterministic random 1-3 based on news id
                const randomConviction = ((data.id || data.news_id || '').charCodeAt(0) % 3) + 1;
                return (
                  <div className="signal-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Minus style={{ width: 28, height: 28, color: '#78909C' }} />
                        <div>
                          <div style={{ color: '#78909C', fontSize: '1rem', fontWeight: 700 }}>
                            Low Impact News
                          </div>
                        </div>
                      </div>

                      {/* Conviction Bars - Random 1-3 */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginLeft: '16px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONVICTION</span>
                        <div className="conviction-bars">
                          {[...Array(10)].map((_, i) => (
                            <div
                              key={i}
                              className="conviction-bar"
                              style={{
                                background: i < randomConviction
                                  ? '#78909C'
                                  : 'rgba(255,255,255,0.1)',
                              }}
                            />
                          ))}
                        </div>
                        <span style={{ color: '#78909C', fontSize: '0.85rem', fontWeight: 700 }}>{randomConviction}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* FIBALGO AGENT Box - Same style as normal but with rejection message */}
              {(() => {
                const assessmentText = stage1.infrastructure_reasoning || stage3.overall_assessment || 'This news does not present actionable trading opportunities.';
                // Mobile: 200 chars, Desktop: 1000 chars
                const charLimit = isMobile ? 200 : 1000;
                const isLongText = assessmentText.length > charLimit;
                const displayText = isLongText && !isAgentExpanded 
                  ? assessmentText.slice(0, charLimit) + '...' 
                  : assessmentText;
                
                return (
                  <div className="agent-box" style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(0,184,212,0.05) 100%)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Brain style={{ width: 18, height: 18, color: '#00E5FF' }} />
                      <span style={{ color: '#00E5FF', fontSize: '0.85rem', fontWeight: 700 }}>FIBALGO AGENT</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>AI-Powered Review</span>
                    </div>
                    
                    {/* Why Not Traded Explanation */}
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6, marginTop: 0, marginLeft: 0, marginRight: 0, marginBottom: isLongText ? '8px' : '12px' }}>
                      {displayText}
                    </p>
                    
                    {/* Read More/Less Button */}
                    {isLongText && (
                      <button
                        onClick={() => setIsAgentExpanded(!isAgentExpanded)}
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
                          gap: '4px',
                          marginBottom: '8px'
                        }}
                      >
                        {isAgentExpanded ? (
                          <>
                            <ChevronUp style={{ width: 14, height: 14 }} />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown style={{ width: 14, height: 14 }} />
                            Read more
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Expandable Section for News Analysis */}
              <button
                onClick={() => setExpanded(!expanded)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}
              >
                {expanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                {expanded ? 'Hide Analysis' : 'Full Analysis'}
              </button>


              {expanded && stage1.analysis && (
                <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Lightbulb style={{ width: 14, height: 14, color: '#F59E0B' }} />
                      <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600 }}>News Analysis</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.5, paddingLeft: '20px' }}>
                      {stage1.analysis}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* NORMAL CASE: Full analysis with Stage 2-3 data */}
              
              {/* Signal Row */}
              <div className="signal-row">
                <Tooltip text={sentimentConfig.tooltip}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {sentiment.includes('bullish') ? (
                        <TrendingUp style={{ width: 28, height: 28, color: sentimentConfig.color }} />
                      ) : sentiment.includes('bearish') ? (
                        <TrendingDown style={{ width: 28, height: 28, color: sentimentConfig.color }} />
                      ) : (
                        <Minus style={{ width: 28, height: 28, color: sentimentConfig.color }} />
                      )}
                      <div>
                        <div style={{ color: sentimentConfig.color, fontSize: '1rem', fontWeight: 700 }}>
                          {sentiment.includes('bullish') ? 'Bullish News' : sentiment.includes('bearish') ? 'Bearish News' : 'Neutral News'}
                        </div>
                      </div>
                    </div>

                    {/* Conviction Bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginLeft: '16px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONVICTION</span>
                      <div className="conviction-bars">
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            className="conviction-bar"
                            style={{
                              background: i < score
                                ? sentimentConfig.color
                                : 'rgba(255,255,255,0.1)',
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ color: sentimentConfig.color, fontSize: '0.85rem', fontWeight: 700 }}>{score}</span>
                    </div>
                  </div>
                </Tooltip>

                {/* Trade Type Badges */}
                <div className="time-badges">
                  {uniqueTradeTypes.length > 0 && (
                    uniqueTradeTypes.map((tradeType, idx) => {
                      const typeConfig = getTradeTypeLabel(tradeType);
                      return (
                        <Tooltip key={idx} text={`Trade style: ${tradeType.replace('_', ' ')}`}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: typeConfig.bgColor, padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', color: typeConfig.color, fontWeight: 600 }}>
                            <Timer style={{ width: 12, height: 12 }} />
                            {typeConfig.label}
                          </span>
                        </Tooltip>
                      );
                    })
                  )}
                  <Tooltip text={`Market regime: ${marketRegime}`}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: marketRegime === 'RISK-OFF' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', color: marketRegime === 'RISK-OFF' ? '#EF4444' : '#22C55E' }}>
                      {marketRegime === 'RISK-OFF' ? '🛡️' : '📈'} {marketRegime}
                    </span>
                  </Tooltip>
                </div>
              </div>

              {/* FIBALGO AGENT Box - Collapsible on mobile only */}
              {(() => {
                const assessmentText = stage3.overall_assessment || '';
                // Mobile: 200 chars, Desktop: 1000 chars
                const charLimit = isMobile ? 200 : 1000;
                const isLongText = assessmentText.length > charLimit;
                const displayText = isLongText && !isAgentExpanded 
                  ? assessmentText.slice(0, charLimit) + '...' 
                  : assessmentText;
                
                return (
                  <div className="agent-box" style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(0,184,212,0.05) 100%)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Brain style={{ width: 18, height: 18, color: '#00E5FF' }} />
                      <span style={{ color: '#00E5FF', fontSize: '0.85rem', fontWeight: 700 }}>FIBALGO AGENT</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>AI-Powered Review</span>
                    </div>
                    
                    {/* Overall Assessment */}
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6, marginTop: 0, marginLeft: 0, marginRight: 0, marginBottom: isLongText ? '8px' : '12px' }}>
                      {displayText}
                    </p>
                    
                    {/* Read More/Less Button */}
                    {isLongText && (
                      <button
                        onClick={() => setIsAgentExpanded(!isAgentExpanded)}
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
                          gap: '4px',
                          marginBottom: '8px'
                        }}
                      >
                        {isAgentExpanded ? (
                          <>
                            <ChevronUp style={{ width: 14, height: 14 }} />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown style={{ width: 14, height: 14 }} />
                            Read more
                          </>
                        )}
                      </button>
                    )}
                    
                    {/* ALL Trade Positions - Collapsible */}
                    {isTrade && stage3.positions.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        {stage3.positions.map((position, idx) => (
                          <TradePositionItem key={idx} position={position} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Metrics Grid - Market Impact, Priced In, Info Quality */}
              <div className="news-card-grid" style={{ marginBottom: '16px' }}>
            {/* Market Impact - Use stage3.market_impact if available */}
            <div className="metric-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>MARKET IMPACT</div>
              {(() => {
                const impactScore = stage3.market_impact ?? score;
                const impactLabel = impactScore >= 9 ? 'massive' : impactScore >= 7 ? 'significant' : impactScore >= 5 ? 'moderate' : impactScore >= 3 ? 'minor' : 'negligible';
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginBottom: '4px' }}>
                      {[0, 1, 2, 3, 4].map((i) => {
                        const thresholds = [1, 3, 5, 7, 9];
                        const isActive = impactScore >= thresholds[i];
                        return (
                          <div
                            key={i}
                            style={{
                              width: '12px',
                              height: '16px',
                              borderRadius: '2px',
                              background: isActive
                                ? i >= 3 ? '#EF4444' : i >= 2 ? '#F59E0B' : '#22C55E'
                                : 'rgba(255,255,255,0.1)',
                            }}
                          />
                        );
                      })}
                    </div>
                    <span style={{ color: impactScore >= 7 ? '#EF4444' : impactScore >= 5 ? '#F59E0B' : '#22C55E', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>
                      {impactLabel}
                    </span>
                  </>
                );
              })()}
            </div>

            {/* Risk Mode - Use stage3.risk_mode if available */}
            <div className="metric-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>RISK MODE</div>
              {(() => {
                const riskMode = stage3.risk_mode || 'NORMAL';
                const riskColor = riskMode === 'HIGH RISK' ? '#EF4444' : riskMode === 'ELEVATED' ? '#F59E0B' : '#22C55E';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    {riskMode === 'HIGH RISK' ? (
                      <AlertCircle style={{ width: 16, height: 16, color: riskColor }} />
                    ) : riskMode === 'ELEVATED' ? (
                      <AlertTriangle style={{ width: 16, height: 16, color: riskColor }} />
                    ) : (
                      <CheckCircle style={{ width: 16, height: 16, color: riskColor }} />
                    )}
                    <span style={{ color: riskColor, fontSize: '0.75rem', fontWeight: 600 }}>{riskMode}</span>
                  </div>
                );
              })()}
            </div>

            {/* Info Quality - Use stage3.info_quality if available */}
            <div className="metric-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>INFO QUALITY</div>
              {(() => {
                const infoQuality = stage3.info_quality || (collectedData && collectedData.length > 0 ? 'VERIFIED' : 'SPECULATIVE');
                const qualityColor = infoQuality === 'VERIFIED' ? '#22C55E' : infoQuality === 'SPECULATIVE' ? '#F59E0B' : '#EF4444';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    {infoQuality === 'VERIFIED' ? (
                      <CheckCircle style={{ width: 16, height: 16, color: qualityColor }} />
                    ) : infoQuality === 'SPECULATIVE' ? (
                      <Circle style={{ width: 16, height: 16, color: qualityColor }} />
                    ) : (
                      <XCircle style={{ width: 16, height: 16, color: qualityColor }} />
                    )}
                    <span style={{ color: qualityColor, fontSize: '0.75rem', fontWeight: 600 }}>{infoQuality}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Expandable Section */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}
          >
            {expanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
            {expanded ? 'Hide Analysis' : 'Full Analysis'}
          </button>

          {expanded && (
            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {/* News Analysis (Stage 1) */}
              {stage1.analysis && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Lightbulb style={{ width: 14, height: 14, color: '#F59E0B' }} />
                    <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600 }}>News Analysis</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.5, paddingLeft: '20px' }}>
                    {stage1.analysis}
                  </p>
                </div>
              )}

              {/* Key Risks */}
              {stage3.main_risks.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <AlertTriangle style={{ width: 14, height: 14, color: '#EF4444' }} />
                    <span style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 600 }}>Key Risk</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.5, paddingLeft: '20px' }}>
                    {stage3.main_risks[0]}
                  </p>
                </div>
              )}

              {/* Research Data (Stage 2 - Perplexity) */}
              {collectedData && collectedData.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Users style={{ width: 14, height: 14, color: '#00E5FF' }} />
                    <span style={{ color: '#00E5FF', fontSize: '0.75rem', fontWeight: 600 }}>Research Data</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>({collectedData.length} queries)</span>
                  </div>
                  <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {collectedData.map((item, i) => (
                      <ResearchDataItem key={i} item={item} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>

        {/* FOOTER - Trade Assets from Stage 3 (hidden for Quick Reject) */}
        {!isQuickReject && (
          <div className="news-card-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div className="related-assets-row">
              {stage3.positions.length > 0 ? (
                stage3.positions.map((position, i) => (
                <button
                  key={i}
                  onClick={(e) => handleAssetClick(position.asset, e)}
                  style={{ 
                    background: position.direction === 'BUY' ? 'rgba(0,230,118,0.1)' : 'rgba(239,68,68,0.1)', 
                    color: position.direction === 'BUY' ? '#00E676' : '#EF4444', 
                    padding: '4px 10px', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    border: `1px solid ${position.direction === 'BUY' ? 'rgba(0,230,118,0.3)' : 'rgba(239,68,68,0.3)'}`, 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  {position.direction === 'BUY' ? '▲' : '▼'} {position.asset}
                </button>
              ))
            ) : (
              (stage1.affected_assets || []).slice(0, 5).map((asset, i) => (
                <button
                  key={i}
                  onClick={(e) => handleAssetClick(asset, e)}
                  style={{ background: 'rgba(0,229,255,0.1)', color: '#00E5FF', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(0,229,255,0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,229,255,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; }}
                >
                  ${asset}
                </button>
              ))
            )}
          </div>
          {data.url && (
            <a href={data.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textDecoration: 'none' }}>
              Source <ExternalLink style={{ width: 12, height: 12 }} />
            </a>
          )}
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 LEGACY WRAPPER - For backwards compatibility
// ═══════════════════════════════════════════════════════════════════════════════

interface SourceCredibility {
  tier: number;
  score: number;
  label: string;
}

interface LegacyNewsCardProps {
  id: string | number;
  source?: string;
  content: string;
  time: string;
  publishedAt?: string;
  createdAt?: string;
  url?: string;
  category?: string;
  isBreaking?: boolean;
  sourceCredibility?: SourceCredibility;
  aiAnalysis?: AIAnalysis | null;
  isSelected?: boolean;
  className?: string;
  onAssetClick?: (symbol: string) => void;
}

export function LegacyNewsCard({ id, source, content, time, publishedAt, createdAt, url, category, isBreaking, sourceCredibility, aiAnalysis, isSelected, className, onAssetClick }: LegacyNewsCardProps) {
  if (!aiAnalysis?.stage1 || !aiAnalysis?.stage3) {
    // Simple card for non-analyzed news
    return (
      <div className={className} style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{time}</span>
          {isBreaking && <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 700 }}>BREAKING</span>}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', lineHeight: 1.5 }}>{content}</p>
      </div>
    );
  }

  const cardData: NewsAnalysisData = {
    id: String(id),
    news_id: String(id),
    source: source || 'FibAlgo',
    url: url || '',
    published_at: publishedAt || new Date().toISOString(),
    category: category || 'general',
    content,
    analyzed_at: new Date().toISOString(),
    is_breaking: isBreaking,
    ai_analysis: aiAnalysis
  };

  return <NewsAnalysisCard data={cardData} className={className} onAssetClick={onAssetClick} />;
}

export { LegacyNewsCard as EnhancedNewsCard };
export default NewsAnalysisCard;
