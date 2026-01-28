'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ExternalLink, TrendingUp, TrendingDown, 
  Zap, AlertTriangle, Brain,
  ChevronDown, ChevronUp,
  Users, AlertCircle, Lightbulb,
  CheckCircle, XCircle, Timer, Circle, Minus
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 📊 INTERFACES
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
    pricedInScore: number;
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
    conviction: number;
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

interface SourceCredibility {
  tier: 1 | 2 | 3 | 4;
  score: number;
  label: string;
}

interface NewsItemProps {
  id: number | string;
  source: string;
  content: string;
  time: string;
  publishedAt?: string;
  createdAt?: string; // When we received the news (for latency calculation)
  url?: string;
  category?: string;
  isBreaking?: boolean;
  sourceCredibility?: SourceCredibility;
  aiAnalysis?: AIAnalysis;
  isSelected?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 HELPERS
// ═══════════════════════════════════════════════════════════════

const getSentimentConfig = (sentiment: AIAnalysis['analysis']['sentiment']) => {
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

// Tooltip bileşeni - Akıllı konumlandırma
const Tooltip = ({ children, text, fullWidth, position = 'top' }: { children: React.ReactNode; text: string; fullWidth?: boolean; position?: 'top' | 'bottom' | 'left' | 'right' }) => {
  const [show, setShow] = useState(false);
  
  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return {
          top: '100%',
          bottom: 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '8px',
          marginBottom: 0,
        };
      case 'left':
        return {
          right: '100%',
          left: 'auto',
          top: '50%',
          transform: 'translateY(-50%)',
          marginRight: '8px',
          marginBottom: 0,
        };
      case 'right':
        return {
          left: '100%',
          right: 'auto',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: '8px',
          marginBottom: 0,
        };
      default: // top
        return {
          bottom: '100%',
          top: 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
        };
    }
  };

  const getArrowStyles = () => {
    switch (position) {
      case 'bottom':
        return {
          bottom: '100%',
          top: 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid rgba(0,0,0,0.95)',
          borderTop: 'none',
        };
      case 'left':
        return {
          left: '100%',
          right: 'auto',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderLeft: '6px solid rgba(0,0,0,0.95)',
          borderRight: 'none',
        };
      case 'right':
        return {
          right: '100%',
          left: 'auto',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderRight: '6px solid rgba(0,0,0,0.95)',
          borderLeft: 'none',
        };
      default: // top
        return {
          top: '100%',
          bottom: 'auto',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid rgba(0,0,0,0.95)',
          borderBottom: 'none',
        };
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
          <div style={{
            position: 'absolute',
            ...getArrowStyles(),
          }} />
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 📰 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function EnhancedNewsCard({
  id,
  source,
  content,
  time,
  publishedAt,
  createdAt,
  url,
  category,
  isBreaking,
  sourceCredibility,
  aiAnalysis,
  isSelected
}: NewsItemProps) {
  const [expanded, setExpanded] = useState(isSelected || false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle asset click - mobile goes to chart, desktop to terminal
  const handleAssetClick = (asset: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (isMobile) {
      router.push(`/terminal/chart?symbol=${encodeURIComponent(asset)}`);
    } else {
      router.push(`/terminal?symbol=${encodeURIComponent(asset)}`);
    }
  };
  
  if (isSelected && !expanded) {
    setExpanded(true);
  }

  // Calculate relative time from createdAt (when news arrived to our system)
  const getRelativeTime = () => {
    if (!createdAt) return time; // fallback to prop
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const diffMs = now - created;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return time; // fallback for older news
  };
  
  const displayTime = getRelativeTime();

  // Calculate latency (time between Benzinga publish and our system receiving)
  const getLatency = () => {
    if (!publishedAt || !createdAt) return null;
    const published = new Date(publishedAt).getTime();
    const received = new Date(createdAt).getTime();
    const diffMs = received - published;
    
    // Only show for reasonable latencies (< 30 minutes)
    if (diffMs < 0 || diffMs > 1800000) return null;
    
    // Return in seconds
    const seconds = Math.round(diffMs / 1000);
    return seconds;
  };
  
  const latencySeconds = getLatency();

  const sentimentConfig = aiAnalysis ? getSentimentConfig(aiAnalysis.analysis.sentiment) : null;

  return (
    <>
      {/* Breaking news animation styles + Mobile Responsive */}
      <style>{`
        @keyframes breakingPulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(239,68,68,0.3), inset 0 0 30px rgba(239,68,68,0.05);
            border-color: rgba(239,68,68,0.5);
          }
          50% { 
            box-shadow: 0 0 40px rgba(239,68,68,0.5), inset 0 0 50px rgba(239,68,68,0.1);
            border-color: rgba(239,68,68,0.8);
          }
        }
        @keyframes breakingGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        .news-card-container {
          margin-bottom: 12px;
        }
        .news-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          flex-wrap: wrap;
        }
        .news-card-content {
          padding: 16px;
          font-size: 1rem;
          line-height: 1.6;
        }
        .news-card-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .news-card-expanded {
          padding: 16px;
        }
        .news-card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .news-card-assets {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .signal-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 12px;
        }
        .conviction-bars {
          display: flex;
          gap: 3px;
        }
        .conviction-bar {
          width: 7px;
          height: 18px;
          border-radius: 2px;
        }
        .time-badges {
          display: flex;
          gap: 8px;
        }
        .agent-box {
          padding: 16px;
          margin-bottom: 16px;
        }
        .trade-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .related-assets-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .news-card-footer {
          padding: 12px 16px;
        }
        .metric-box {
          min-width: 0;
          overflow: hidden;
        }
        .full-analysis-toggle {
          display: none !important;
        }
        .expanded-content {
          display: block !important;
        }
        
        @media (max-width: 768px) {
          .full-analysis-toggle {
            display: flex !important;
          }
          .expanded-content {
            display: none !important;
          }
          .expanded-content.show {
            display: block !important;
          }
          .news-card-header {
            padding: 8px 12px;
            gap: 5px;
          }
          .news-time {
            font-size: 0.7rem !important;
            order: -1;
          }
          .news-speed {
            font-size: 0.65rem !important;
          }
          .news-dot {
            font-size: 0.6rem !important;
          }
          .news-card-content {
            padding: 12px;
            font-size: 0.9rem;
          }
          .news-card-meta {
            gap: 8px;
          }
          .news-card-expanded {
            padding: 12px;
          }
          .news-card-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 4px;
            margin-left: -12px;
            margin-right: -12px;
          }
          .signal-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .conviction-bars {
            gap: 2px;
          }
          .conviction-bar {
            width: 6px;
            height: 14px;
          }
          .time-badges {
            gap: 6px;
            flex-wrap: wrap;
          }
          .agent-box {
            padding: 12px;
            margin-bottom: 12px;
          }
          .trade-info-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .news-card-footer {
            padding: 10px 12px;
          }
          .related-assets-row {
            gap: 6px;
          }
          .trade-signal-row {
            padding: 10px 12px !important;
            gap: 8px !important;
          }
          .trade-signal-icon {
            width: 24px !important;
            height: 24px !important;
          }
          .trade-signal-rationale {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .metric-box {
            padding: 8px 4px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .metric-box > div:first-child {
            font-size: 0.5rem !important;
            margin-bottom: 4px !important;
            letter-spacing: 0.03em !important;
          }
          .metric-box .metric-content {
            justify-content: center !important;
          }
          .metric-box .metric-gauge {
            gap: 4px !important;
          }
          .metric-box .metric-gauge > div {
            width: 10px !important;
          }
          .metric-box .metric-gauge-bar {
            height: 12px !important;
          }
          .metric-box .metric-text {
            display: none !important;
          }
          .metric-box.info-quality .metric-content {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
          }
          .metric-box.info-quality .metric-content svg {
            width: 14px !important;
            height: 14px !important;
          }
          .metric-box.info-quality .metric-content span {
            font-size: 0.7rem !important;
            display: block !important;
          }
        }
        
        @media (max-width: 480px) {
          .news-card-header {
            padding: 6px 10px;
            gap: 4px;
          }
          .news-time {
            font-size: 0.65rem !important;
          }
          .news-speed {
            font-size: 0.6rem !important;
          }
          .news-dot {
            font-size: 0.55rem !important;
          }
          .news-card-content {
            padding: 10px;
            font-size: 0.85rem;
            line-height: 1.5;
          }
          .news-card-expanded {
            padding: 10px;
          }
          .conviction-bar {
            width: 5px;
            height: 12px;
          }
          .agent-box {
            padding: 10px;
          }
        }
      `}</style>
      <div 
        id={`news-card-${id}`}
        className="news-card-container"
        style={{
          background: isBreaking 
            ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, #0D1117 50%, rgba(239,68,68,0.05) 100%)' 
            : '#0D1117',
          border: isBreaking 
            ? '1px solid rgba(239,68,68,0.5)' 
            : aiAnalysis 
              ? `1px solid ${sentimentConfig?.color}30`
              : '1px solid rgba(255,255,255,0.08)',
          borderLeft: isBreaking 
            ? '3px solid #EF4444' 
            : aiAnalysis 
              ? `3px solid ${sentimentConfig?.color}` 
              : '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          marginBottom: '12px',
          overflow: 'hidden',
          position: 'relative',
          animation: isBreaking ? 'breakingPulse 2s ease-in-out infinite' : 'none',
        }}
      >
        {/* Breaking news red glow overlay */}
        {isBreaking && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, rgba(239,68,68,0.15) 0%, transparent 30%, transparent 70%, rgba(239,68,68,0.1) 100%)',
            pointerEvents: 'none',
            animation: 'breakingGlow 2s ease-in-out infinite',
          }} />
        )}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div 
        className="news-card-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexWrap: 'wrap',
        }}
      >
        {/* Time - mobile'da başa */}
        <span className="news-time" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 500 }}>
          {displayTime}
        </span>
        <span className="news-dot" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>•</span>
        <span className="news-source" style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #00E5FF 0%, #00B8D4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700, 
            fontSize: '0.8rem',
            letterSpacing: '0.02em',
          }}>
            FibAlgo
          </span>
          <span style={{
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 500, 
            fontSize: '0.8rem',
          }}>
            News
          </span>
        </span>
        {latencySeconds !== null && (
          <>
            <span className="news-dot" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>•</span>
            <span className="news-speed" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
              speed= {latencySeconds} sec.
            </span>
          </>
        )}
        {category && (() => {
          const categoryColors: Record<string, { bg: string; color: string }> = {
            crypto: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },      // Orange/Gold
            stocks: { bg: 'rgba(34,197,94,0.15)', color: '#22C55E' },       // Green
            forex: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },       // Blue
            commodities: { bg: 'rgba(168,85,247,0.15)', color: '#A855F7' }, // Purple
            earnings: { bg: 'rgba(236,72,153,0.15)', color: '#EC4899' },    // Pink
            indices: { bg: 'rgba(20,184,166,0.15)', color: '#14B8A6' },     // Teal
            macro: { bg: 'rgba(6,182,212,0.15)', color: '#06B6D4' },        // Cyan
          };
          const colors = categoryColors[category.toLowerCase()] || { bg: 'rgba(0,229,255,0.15)', color: '#00E5FF' };
          return (
            <span style={{
              background: colors.bg,
              color: colors.color,
              padding: '2px 10px',
              borderRadius: '4px',
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {category}
            </span>
          );
        })()}
        {isBreaking && (
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            padding: '4px 10px',
            borderRadius: '4px',
            boxShadow: '0 0 12px rgba(239,68,68,0.4)',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#fff',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
            <span style={{
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}>
              BREAKING
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADLINE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="news-card-content" style={{ padding: '14px 16px' }}>
        <h3 style={{ 
          color: '#fff', 
          margin: 0,
          fontSize: '0.95rem',
          fontWeight: 500,
          lineHeight: 1.5,
        }}>
          {content}
        </h3>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* AI ANALYSIS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {aiAnalysis && sentimentConfig && (
        <div className="news-card-expanded" style={{ padding: '0 16px 16px' }}>
          
          {/* Signal Row - Fotoğraftaki gibi */}
          <div className="signal-row" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            {/* Left: Sentiment Badge with Tooltip */}
            <Tooltip text={sentimentConfig.tooltip} position="right">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'help',
              }}>
                {/* Direction Arrow Circle */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${sentimentConfig.bgColor} 0%, ${sentimentConfig.color}20 100%)`,
                  border: `2px solid ${sentimentConfig.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 15px ${sentimentConfig.color}30`,
                }}>
                  {sentimentConfig.label.includes('BUY') ? (
                    <TrendingUp size={20} color={sentimentConfig.color} />
                  ) : sentimentConfig.label.includes('SELL') ? (
                    <TrendingDown size={20} color={sentimentConfig.color} />
                  ) : (
                    <Minus size={20} color={sentimentConfig.color} />
                  )}
                </div>
                {/* Label */}
                <div>
                  <div style={{ 
                    color: sentimentConfig.color, 
                    fontSize: '0.85rem', 
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}>
                    {sentimentConfig.label}
                  </div>
                  <div style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.65rem',
                    marginTop: '2px',
                  }}>
                    {sentimentConfig.label.includes('BUY') 
                      ? 'Bullish News' 
                      : sentimentConfig.label.includes('SELL') 
                      ? 'Bearish News' 
                      : 'Neutral News'}
                  </div>
                </div>
              </div>
            </Tooltip>

            {/* Middle: Conviction - Fotoğraftaki gibi kırmızı/yeşil çubuklar */}
            <Tooltip text="Conviction: How confident the AI is in this analysis (1-10)" position="bottom">
              <div style={{ cursor: 'help' }}>
                <div style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  fontSize: '0.65rem', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '6px',
                }}>
                  Conviction
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="conviction-bars" style={{ display: 'flex', gap: '3px' }}>
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="conviction-bar"
                        style={{
                          width: '7px',
                          height: '18px',
                          borderRadius: '2px',
                          background: i < aiAnalysis.analysis.conviction 
                            ? sentimentConfig.color
                            : 'rgba(255,255,255,0.08)',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ 
                    color: sentimentConfig.color,
                    fontWeight: 700,
                    fontSize: '1.1rem',
                  }}>
                    {aiAnalysis.analysis.conviction}
                  </span>
                </div>
              </div>
            </Tooltip>

            {/* Right: Time Horizon + Regime Badges */}
            <div className="time-badges" style={{ display: 'flex', gap: '8px' }}>
              <Tooltip text="Time Horizon: The timeframe this analysis is valid for" position="bottom">
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '20px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'help',
                }}>
                  <Timer size={13} color="rgba(255,255,255,0.6)" />
                  <span style={{ 
                    color: 'rgba(255,255,255,0.8)', 
                    fontSize: '0.7rem', 
                    fontWeight: 600, 
                    textTransform: 'uppercase' 
                  }}>
                    {aiAnalysis.analysis.timeHorizon}
                  </span>
                </div>
              </Tooltip>
              <Tooltip text={
                aiAnalysis.marketContextFit.currentRegime === 'risk-on' 
                  ? 'Risk-On: Market favors risk assets, bullish tendency' 
                  : aiAnalysis.marketContextFit.currentRegime === 'risk-off'
                  ? 'Risk-Off: Market is cautious, bearish tendency'
                  : 'Neutral market conditions'
              } position="left">
                <div style={{
                  background: aiAnalysis.marketContextFit.currentRegime === 'risk-on' 
                    ? 'rgba(34,197,94,0.15)' 
                    : aiAnalysis.marketContextFit.currentRegime === 'risk-off'
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(120,144,156,0.1)',
                  border: `1px solid ${
                    aiAnalysis.marketContextFit.currentRegime === 'risk-on' 
                      ? 'rgba(34,197,94,0.4)' 
                      : aiAnalysis.marketContextFit.currentRegime === 'risk-off'
                      ? 'rgba(239,68,68,0.4)'
                      : 'rgba(120,144,156,0.25)'
                  }`,
                  borderRadius: '20px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'help',
                }}>
                {aiAnalysis.marketContextFit.currentRegime === 'risk-on' ? (
                  <>
                    <TrendingUp size={13} color="#22C55E" />
                    <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 600 }}>RISK-ON</span>
                  </>
                ) : aiAnalysis.marketContextFit.currentRegime === 'risk-off' ? (
                  <>
                    <TrendingDown size={13} color="#EF4444" />
                    <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 600 }}>RISK-OFF</span>
                  </>
                ) : (
                  <span style={{ color: '#78909C', fontSize: '0.7rem', fontWeight: 600 }}>NEUTRAL</span>
                )}
                </div>
              </Tooltip>
            </div>
          </div>

          {/* Full Analysis Toggle - Only visible on mobile */}
          <button
            className="full-analysis-toggle"
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#00E5FF',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'none',
              alignItems: 'center',
              gap: '4px',
              padding: 0,
            }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Full Analysis
          </button>

          {/* Expanded Details - Always visible on desktop, toggle on mobile */}
          <div 
            className={`expanded-content ${expanded ? 'show' : ''}`}
            style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
            {/* FibAlgo Agent Analysis */}
            <div className="agent-box" style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.05) 0%, rgba(14,165,233,0.03) 100%)',
              border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '16px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative glow */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-20%',
                width: '200px',
                height: '200px',
                background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                marginBottom: '12px',
                  position: 'relative',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #00E5FF 0%, #0EA5E9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(0,229,255,0.3)',
                  }}>
                    <Brain size={16} color="#fff" />
                  </div>
                  <div>
                    <span style={{ 
                      color: '#00E5FF', 
                      fontSize: '0.75rem', 
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}>
                      FibAlgo Agent
                    </span>
                    <div style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '0.6rem',
                      marginTop: '1px',
                    }}>
                      AI-Powered Analysis
                    </div>
                  </div>
                </div>
                <p style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: '0.85rem', 
                  lineHeight: 1.7,
                  margin: 0,
                  position: 'relative',
                }}>
                  {aiAnalysis.analysis.thesis}
                </p>
              </div>

              {/* Trade Signal */}
              <div className="trade-signal-row" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '6px',
                marginBottom: '16px',
              }}>
                <div className="trade-signal-icon" style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: aiAnalysis.trade.wouldTrade 
                    ? aiAnalysis.trade.direction === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'
                    : 'rgba(120,144,156,0.1)',
                  border: `1px solid ${aiAnalysis.trade.wouldTrade 
                    ? aiAnalysis.trade.direction === 'long' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'
                    : 'rgba(120,144,156,0.2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {aiAnalysis.trade.wouldTrade ? (
                    aiAnalysis.trade.direction === 'long' ? (
                      <TrendingUp size={14} color="#22C55E" />
                    ) : (
                      <TrendingDown size={14} color="#EF4444" />
                    )
                  ) : (
                    <Circle size={12} color="#78909C" />
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ 
                    color: aiAnalysis.trade.wouldTrade 
                      ? aiAnalysis.trade.direction === 'long' ? '#22C55E' : '#EF4444'
                      : '#78909C',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}>
                    {aiAnalysis.trade.wouldTrade 
                      ? `${aiAnalysis.trade.direction.toUpperCase()} ${aiAnalysis.trade.primaryAsset}`
                      : 'NO TRADE'}
                  </div>
                  <div className="trade-signal-rationale" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                    {aiAnalysis.trade.wouldTrade ? aiAnalysis.trade.rationale : 'Not suitable for trading at this time'}
                  </div>
                </div>
              </div>

              {/* Metrics Grid - Fotoğraftaki gibi */}
              <div className="news-card-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '12px',
                marginBottom: '16px',
              }}>
                {/* Market Impact */}
                <Tooltip text="Market Impact: Expected effect of this news on the market" fullWidth>
                  <div className="metric-box" style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '14px',
                    cursor: 'help',
                    height: '100%',
                    width: '100%',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}>
                    <div style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      fontSize: '0.65rem', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '10px',
                    }}>
                      Market Impact
                    </div>
                    <div className="metric-content" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="metric-gauge" style={{ display: 'flex', gap: '3px', alignItems: 'flex-end' }}>
                        {['negligible', 'minor', 'moderate', 'significant', 'massive'].map((level, i) => {
                          const magnitudeIndex = ['negligible', 'minor', 'moderate', 'significant', 'massive'].indexOf(aiAnalysis.flowAnalysis.expectedMagnitude);
                          const isActive = i <= magnitudeIndex;
                          return (
                            <div
                              key={level}
                              style={{
                                width: '8px',
                                height: `${10 + i * 4}px`,
                                background: isActive 
                                  ? 'rgba(255,255,255,0.7)'
                                  : 'rgba(255,255,255,0.1)',
                                borderRadius: '2px',
                              }}
                            />
                          );
                        })}
                      </div>
                      <span className="metric-text" style={{ 
                        color: 'rgba(255,255,255,0.8)', 
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                      }}>
                        {aiAnalysis.flowAnalysis.expectedMagnitude}
                      </span>
                    </div>
                  </div>
                </Tooltip>

                {/* Priced In */}
                <Tooltip text="Priced In: How much of this news is already reflected in prices. Low = Opportunity, High = Late" fullWidth>
                  <div className="metric-box" style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '14px',
                    cursor: 'help',
                    height: '100%',
                    width: '100%',
                    minWidth: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      fontSize: '0.65rem', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '10px',
                    }}>
                      Priced In
                    </div>
                    <div className="metric-content" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div className="metric-gauge-bar" style={{ 
                        flex: 1,
                        minWidth: '60px',
                        height: '8px', 
                        background: 'rgba(255,255,255,0.08)', 
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${Math.max(aiAnalysis.noveltyAssessment.pricedInScore * 10, 5)}%`,
                          background: '#EF4444',
                          borderRadius: '4px',
                        }} />
                      </div>
                      <span className="metric-text" style={{ 
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {aiAnalysis.noveltyAssessment.pricedInScore}/10
                      </span>
                    </div>
                  </div>
                </Tooltip>

                {/* Info Quality */}
                <Tooltip text={
                  aiAnalysis.informationQuality.confidence === 'confirmed' 
                    ? 'Confirmed: Verified information from reliable sources'
                    : aiAnalysis.informationQuality.confidence === 'likely'
                    ? 'Likely: Probably accurate but not yet confirmed'
                    : 'Speculative: Unverified, proceed with caution'
                } fullWidth>
                  <div className="metric-box info-quality" style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '14px',
                    cursor: 'help',
                    height: '100%',
                    width: '100%',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}>
                    <div style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      fontSize: '0.65rem', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '10px',
                    }}>
                      Info Quality
                    </div>
                    <div className="metric-content" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {aiAnalysis.informationQuality.confidence === 'confirmed' ? (
                        <CheckCircle size={16} color="#22C55E" />
                      ) : aiAnalysis.informationQuality.confidence === 'likely' ? (
                        <AlertCircle size={16} color="#F59E0B" />
                      ) : (
                        <AlertTriangle size={16} color="#EF4444" />
                      )}
                      <span style={{ 
                        color: aiAnalysis.informationQuality.confidence === 'confirmed' 
                          ? '#22C55E'
                          : aiAnalysis.informationQuality.confidence === 'likely'
                          ? '#F59E0B'
                          : '#EF4444',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}>
                        {aiAnalysis.informationQuality.confidence}
                      </span>
                    </div>
                  </div>
                </Tooltip>
              </div>

              <div className="trade-info-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px',
                marginBottom: '12px',
              }}>
                {/* Second Order Effects */}
                <div style={{
                  background: 'rgba(245,158,11,0.05)',
                  border: '1px solid rgba(245,158,11,0.15)',
                  borderRadius: '6px',
                  padding: '12px',
                }}>
                  <div style={{ 
                    color: '#F59E0B', 
                    fontSize: '0.7rem', 
                    fontWeight: 600, 
                    marginBottom: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px' 
                  }}>
                    <Lightbulb size={12} />
                    Second-Order Effects
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                    {aiAnalysis.analysis.secondOrderEffects}
                  </p>
                </div>

                {/* Key Risk */}
                <div style={{
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '6px',
                  padding: '12px',
                }}>
                  <div style={{ 
                    color: '#EF4444', 
                    fontSize: '0.7rem', 
                    fontWeight: 600, 
                    marginBottom: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px' 
                  }}>
                    <AlertCircle size={12} />
                    Key Risk
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                    {aiAnalysis.analysis.keyRisk}
                  </p>
                </div>
              </div>

              {/* Invalidation & Actors */}
              <div className="trade-info-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px',
              }}>
                {aiAnalysis.trade.wouldTrade && aiAnalysis.trade.invalidation && (
                  <div style={{
                    background: 'rgba(120,144,156,0.05)',
                    border: '1px solid rgba(120,144,156,0.15)',
                    borderRadius: '6px',
                    padding: '12px',
                  }}>
                    <div style={{ 
                      color: '#78909C', 
                      fontSize: '0.7rem', 
                      fontWeight: 600, 
                      marginBottom: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px' 
                    }}>
                      <XCircle size={12} />
                      Trade Invalidation
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                      {aiAnalysis.trade.invalidation}
                    </p>
                  </div>
                )}

                {aiAnalysis.flowAnalysis.primaryActors.length > 0 && (
                  <div style={{
                    background: 'rgba(139,92,246,0.05)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    borderRadius: '6px',
                    padding: '12px',
                  }}>
                    <div style={{ 
                      color: '#A78BFA', 
                      fontSize: '0.7rem', 
                      fontWeight: 600, 
                      marginBottom: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px' 
                    }}>
                      <Users size={12} />
                      Primary Actors
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {aiAnalysis.flowAnalysis.primaryActors.map((actor, idx) => (
                        <span key={idx} style={{
                          background: 'rgba(139,92,246,0.1)',
                          border: '1px solid rgba(139,92,246,0.25)',
                          color: '#A78BFA',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                        }}>
                          {actor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Validation Warnings */}
              {aiAnalysis.validationWarnings && aiAnalysis.validationWarnings.length > 0 && (
                <div style={{
                  marginTop: '12px',
                  background: 'rgba(245,158,11,0.05)',
                  border: '1px solid rgba(245,158,11,0.15)',
                  borderRadius: '6px',
                  padding: '12px',
                }}>
                  <div style={{ 
                    color: '#F59E0B', 
                    fontSize: '0.7rem', 
                    fontWeight: 600, 
                    marginBottom: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px' 
                  }}>
                    <AlertTriangle size={12} />
                    Analysis Warnings
                  </div>
                  {aiAnalysis.validationWarnings.map((warning, idx) => (
                    <div key={idx} style={{ 
                      color: warning.severity === 'error' ? '#EF4444' : '#F59E0B', 
                      fontSize: '0.75rem',
                      marginBottom: idx < (aiAnalysis.validationWarnings?.length ?? 0) - 1 ? '4px' : 0,
                    }}>
                      • {warning.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="news-card-footer" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div className="related-assets-row" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Asset Tags */}
          {aiAnalysis?.meta.relatedAssets.slice(0, 4).map((asset, idx) => (
            <button
              key={idx}
              onClick={(e) => handleAssetClick(asset, e)}
              style={{
                background: 'rgba(0,229,255,0.08)',
                border: '1px solid rgba(0,229,255,0.2)',
                borderRadius: '4px',
                padding: '4px 10px',
                color: '#00E5FF',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ${asset}
            </button>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
