'use client';

/**
 * NewsSignalCard - Wrapper for NewsAnalysisCard
 * This component adapts the NewsSignal interface to NewsAnalysisCard
 */

import { useState, useEffect } from 'react';
import { NewsAnalysisCard, AIAnalysis } from '@/components/news/NewsAnalysisCard';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NewsSignal {
  id: string;
  news_id?: string;
  title: string;
  source: string;
  url?: string;
  published_at: string;
  category: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  score: number;
  summary?: string;
  impact?: string;
  risk?: string;
  trading_pairs?: string[];
  signal: string;
  signal_blocked?: boolean;
  block_reason?: string;
  would_trade: boolean;
  time_horizon: string;
  risk_mode: string;
  is_breaking: boolean;
  ai_analysis?: AIAnalysis;
}

interface NewsSignalCardProps {
  signal: NewsSignal;
  compact?: boolean;
  /** When provided (e.g. desktop terminal/news), asset click opens chart popup instead of navigating */
  onAssetClick?: (symbol: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function NewsSignalCard({ signal, compact = false, onAssetClick }: NewsSignalCardProps) {
  // Keep hooks consistent - must be called before any conditional returns
  const [_expanded, _setExpanded] = useState(false);
  const [_isMobile, _setIsMobile] = useState(false);
  
  useEffect(() => {
    // Placeholder to match NewsAnalysisCard hooks
  }, []);
  
  // If no Stage 1-2-3 analysis, show simple card
  if (!signal.ai_analysis?.stage1 || !signal.ai_analysis?.stage3) {
    return (
      <div style={{ 
        background: '#0D1117', 
        border: '1px solid rgba(255,255,255,0.08)', 
        borderRadius: '8px', 
        padding: compact ? '12px' : '16px', 
        marginBottom: '12px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
            {formatTimeAgo(signal.published_at)}
          </span>
          {signal.is_breaking && (
            <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 700 }}>BREAKING</span>
          )}
          {signal.category && (
            <span style={{ 
              background: 'rgba(0,229,255,0.15)', 
              color: '#00E5FF', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              fontSize: '0.65rem', 
              textTransform: 'uppercase' 
            }}>
              {signal.category}
            </span>
          )}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: compact ? '0.85rem' : '0.9rem', lineHeight: 1.5 }}>
          {signal.title}
        </p>
        {signal.summary && !compact && (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: '8px' }}>
            {signal.summary}
          </p>
        )}
      </div>
    );
  }

  // Convert to NewsAnalysisCard format
  const cardData = {
    id: signal.id,
    news_id: signal.news_id || signal.id,
    source: signal.source,
    url: signal.url || '',
    published_at: signal.published_at,
    category: signal.category,
    content: signal.title,
    analyzed_at: new Date().toISOString(),
    is_breaking: signal.is_breaking,
    ai_analysis: signal.ai_analysis
  };

  return <NewsAnalysisCard data={cardData} onAssetClick={onAssetClick} />;
}

// Helper function
const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export { NewsSignalCard };
