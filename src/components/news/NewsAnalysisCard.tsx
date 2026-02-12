'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  news_sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  conviction?: number;
  importance_score: number;
  category?: 'forex' | 'cryptocurrency' | 'stocks' | 'commodities' | 'indices' | 'macro';
  info_quality?: 'VERIFIED' | 'SPECULATIVE' | 'RUMOR';
  market_impact?: number;
  market_regime?: 'RISK-ON' | 'RISK-OFF';
  risk_mode?: 'NORMAL' | 'ELEVATED' | 'HIGH RISK';
  action_type?: 'OPEN' | 'CLOSE' | 'HOLD' | 'SCALE_IN' | 'SCALE_OUT' | 'HEDGE' | 'REVERSE';
  reason_for_action?: string;
  invalidation_signal?: string;
  position_memory?: {
    generatedAt: string;
    window: { shortHours: number; swingHours: number; macroDays: number };
    assets: Array<{
      asset: string;
      lastSignal?: {
        direction: 'BUY' | 'SELL' | 'HOLD';
        signal?: string;
        conviction?: number;
        timeHorizon?: 'short' | 'swing' | 'macro';
        minutesAgo?: number;
      };
      trendLast5?: Array<'BUY' | 'SELL' | 'HOLD'>;
      flipRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
      openPositionState?: {
        status: 'UNKNOWN' | 'OPEN' | 'CLOSED';
        direction?: 'LONG' | 'SHORT';
        entryPrice?: number;
        pnlPercent?: number;
        note?: string;
      };
    }>;
  };
  positions: TradePosition[];
  /** Assets affected by this news in TradingView format (e.g. NASDAQ:AAPL, AMEX:SPY). Used for chart buttons. */
  tradingview_assets?: string[];
  main_risks: string[];
  overall_assessment: string;
}

interface PerplexityData {
  query: string;
  data: string;
  citations: string[];
}

type MarketReactionPack = {
  provider: 'fmp';
  generatedAt: string;
  assets: Array<{
    tvAsset: string;
    fmpSymbol: string | null;
    status: 'ok' | 'no_api_key' | 'no_data' | 'error';
    error?: string;
    intraday?: {
      interval: string;
      lookbackMinutes: number;
      candles?: Array<any>;
      derived?: {
        movePercent: number | null;
        rangePercent: number | null;
        high: number | null;
        low: number | null;
        open: number | null;
        last: number | null;
      };
    } | null;
  }>;
};

type ExternalImpactPack = {
  provider: 'perplexity';
  generatedAt: string;
  metrics: {
    narrative_bias: 'bullish' | 'bearish' | 'mixed' | 'unclear';
    priced_in_likelihood_0_10: number;
    confidence_0_10: number;
    second_order_effects: string[];
    key_invalidation_triggers: string[];
  };
  sources: string[];
  notes?: string;
};

/** Data pack from fundamental/market data (fmp_requests) */
interface FmpCollectedPack {
  generatedAt?: string;
  byType?: Record<string, unknown>;
  errors?: string[];
}

export interface AIAnalysis {
  stage1: Stage1Analysis;
  collectedData: PerplexityData[];
  stage3: Stage3Decision;
  market_reaction?: MarketReactionPack | null;
  /** Fundamental/market data (quote, profile, earnings, etc.) */
  collected_fmp_data?: FmpCollectedPack | null;
  external_impact?: ExternalImpactPack | null;
  stage2_debug?: {
    external_impact_raw?: { prompt: string; response: string; citations: string[] } | null;
  } | null;
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

const getSentimentConfig = (sentiment: SentimentType, t: (key: string) => string) => {
  const configs = {
    strong_bullish: { label: t('sentimentStrongBuy'), color: '#00E676', bgColor: 'rgba(0,230,118,0.15)', icon: '▲', tooltip: t('tooltipStrongBuy') },
    bullish: { label: t('sentimentBuy'), color: '#00E676', bgColor: 'rgba(0,230,118,0.15)', icon: '▲', tooltip: t('tooltipBuy') },
    lean_bullish: { label: t('sentimentLeanBuy'), color: '#22C55E', bgColor: 'rgba(34,197,94,0.12)', icon: '△', tooltip: t('tooltipLeanBuy') },
    neutral: { label: t('sentimentHold'), color: '#78909C', bgColor: 'rgba(120,144,156,0.15)', icon: '—', tooltip: t('tooltipNeutral') },
    lean_bearish: { label: t('sentimentLeanSell'), color: '#F87171', bgColor: 'rgba(248,113,113,0.12)', icon: '▽', tooltip: t('tooltipLeanSell') },
    bearish: { label: t('sentimentSell'), color: '#EF4444', bgColor: 'rgba(239,68,68,0.15)', icon: '▼', tooltip: t('tooltipSell') },
    strong_bearish: { label: t('sentimentStrongSell'), color: '#DC2626', bgColor: 'rgba(220,38,38,0.15)', icon: '▼', tooltip: t('tooltipStrongSell') },
  };
  return configs[sentiment] || configs.neutral;
};
function clampText(s: string, max = 1800): string {
  const str = String(s || '');
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeAssetKey(s: string): string {
  return String(s || '')
    .toUpperCase()
    .replace(/^(BINANCE:|NASDAQ:|NYSE:|AMEX:|FX:|TVC:|COMEX:)/, '')
    .replace(/[^A-Z0-9]/g, '');
}

/** Kullanıcıya gösterilen etiketlerde Stage / FMP / Perplexity kullanılmaz. */
function sanitizeResearchLabel(query: string): string {
  return query
    .replace(/\bStage\s*2[AB0-9]*\s*[—\-]\s*/gi, '')
    .replace(/\bFMP\b/gi, 'Market data')
    .replace(/\bPerplexity\b/gi, 'Web research')
    .replace(/\s*[—\-]\s*Perplexity\s*$/i, '')
    .replace(/\s*[—\-]\s*FMP\s*$/i, '')
    .trim() || query;
}

function buildStage2ResearchItems(ai: AIAnalysis): Array<{ query: string; data: string; citations?: string[] }> {
  const out: Array<{ query: string; data: string; citations?: string[] }> = [];

  const fmpData = ai.collected_fmp_data;
  if (fmpData?.byType && Object.keys(fmpData.byType).length > 0) {
    out.push({
      query: sanitizeResearchLabel('Fundamental & market data pack'),
      data: clampText(safeJson(fmpData), 4000),
      citations: [],
    });
    for (const [type, payload] of Object.entries(fmpData.byType)) {
      if (payload != null) {
        out.push({
          query: sanitizeResearchLabel(`${type}`),
          data: clampText(safeJson(payload), 2000),
          citations: [],
        });
      }
    }
    if (Array.isArray(fmpData.errors) && fmpData.errors.length > 0) {
      out.push({
        query: sanitizeResearchLabel('Data errors'),
        data: fmpData.errors.join('\n'),
        citations: [],
      });
    }
  }

  const mr = ai.market_reaction;
  if (mr?.provider === 'fmp' && Array.isArray(mr.assets) && mr.assets.length > 0) {
    for (const a of mr.assets) {
      const derived = a.intraday?.derived;
      const candlesCount = Array.isArray(a.intraday?.candles) ? a.intraday!.candles!.length : 0;
      const interval = a.intraday?.interval || 'N/A';
      const lookback = a.intraday?.lookbackMinutes ?? 120;

      const lines: string[] = [
        `Source: Market data (price reaction)`,
        `Generated at: ${mr.generatedAt}`,
        `Asset: ${a.tvAsset} → ${a.fmpSymbol || 'N/A'}`,
        `Status: ${a.status}${a.error ? ` (${a.error})` : ''}`,
        `Window: last ${lookback}m | Interval: ${interval} | Candles: ${candlesCount}`,
      ];

      if (derived) {
        lines.push(
          `Derived:`,
          `- move%: ${derived.movePercent ?? 'n/a'}`,
          `- range%: ${derived.rangePercent ?? 'n/a'}`,
          `- open: ${derived.open ?? 'n/a'} | last: ${derived.last ?? 'n/a'}`,
          `- high: ${derived.high ?? 'n/a'} | low: ${derived.low ?? 'n/a'}`
        );
      }

      const citations =
        a.fmpSymbol && a.fmpSymbol !== 'N/A'
          ? [
              `https://financialmodelingprep.com/stable/quote?symbol=${encodeURIComponent(a.fmpSymbol)}`,
              `https://financialmodelingprep.com/stable/historical-chart/${encodeURIComponent(String(interval))}?symbol=${encodeURIComponent(a.fmpSymbol)}`,
            ]
          : [];

      out.push({
        query: sanitizeResearchLabel(`Market reaction — ${a.tvAsset}`),
        data: clampText(lines.join('\n')),
        citations,
      });
    }
  }

  const ext = ai.external_impact;
  if (ext?.provider === 'perplexity' && ext.metrics) {
    const lines: string[] = [
      `Source: Web research (external impact metrics)`,
      `Generated at: ${ext.generatedAt}`,
      `Metrics:`,
      `- narrative_bias: ${ext.metrics.narrative_bias}`,
      `- priced_in_likelihood_0_10: ${ext.metrics.priced_in_likelihood_0_10}`,
      `- confidence_0_10: ${ext.metrics.confidence_0_10}`,
      `- second_order_effects: ${Array.isArray(ext.metrics.second_order_effects) ? ext.metrics.second_order_effects.join('; ') : ''}`,
      `- key_invalidation_triggers: ${Array.isArray(ext.metrics.key_invalidation_triggers) ? ext.metrics.key_invalidation_triggers.join('; ') : ''}`,
    ];
    if (ext.notes) lines.push(`Notes: ${ext.notes}`);

    out.push({
      query: sanitizeResearchLabel('External impact metrics'),
      data: clampText(lines.join('\n')),
      citations: Array.isArray(ext.sources) ? ext.sources.slice(0, 6) : [],
    });
  }

  if (Array.isArray(ai.collectedData) && ai.collectedData.length > 0) {
    out.push(
      ...ai.collectedData.map((item) => ({
        ...item,
        query: sanitizeResearchLabel(item.query),
      }))
    );
  }

  return out;
}

const getTradeTypeLabel = (tradeType: string, t: (key: string) => string): { label: string; color: string; bgColor: string; tooltip?: string } => {
  switch (tradeType) {
    case 'scalping': return { label: t('tradeTypeScalp'), color: '#FF6B6B', bgColor: 'rgba(255,107,107,0.15)', tooltip: t('tooltipScalp') };
    case 'day_trading': return { label: t('tradeTypeDay'), color: '#4ECDC4', bgColor: 'rgba(78,205,196,0.15)', tooltip: t('tooltipDay') };
    case 'swing_trading': return { label: t('tradeTypeSwing'), color: '#45B7D1', bgColor: 'rgba(69,183,209,0.15)', tooltip: t('tooltipSwing') };
    case 'position_trading': return { label: t('tradeTypePosition'), color: '#96CEB4', bgColor: 'rgba(150,206,180,0.15)', tooltip: t('tooltipPosition') };
    default: return { label: t('tradeTypeTrade'), color: '#888', bgColor: 'rgba(136,136,136,0.15)', tooltip: t('tooltipTradeStyle') };
  }
};

const getMagnitudeFromScore = (score: number): 'negligible' | 'minor' | 'moderate' | 'significant' | 'massive' => {
  if (score >= 9) return 'massive';
  if (score >= 7) return 'significant';
  if (score >= 5) return 'moderate';
  if (score >= 3) return 'minor';
  return 'negligible';
};

// Bounded tooltip: stays inside card (like TerminalShowcase), dynamic position + animation
type TooltipAnchor = { x: number; y: number; w: number; h: number; cW: number; cH: number; key: string };
const TOOLTIP_PADDING = 12;
const CARD_TOOLTIP_SIZE = { width: 260, height: 120 };

const getTooltipAnchor = (el: HTMLElement | null, container: HTMLElement | null, key: string): TooltipAnchor | null => {
  if (!el || !container) return null;
  const rect = el.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  return {
    x: rect.left - cRect.left + rect.width / 2,
    y: rect.top - cRect.top,
    w: rect.width,
    h: rect.height,
    cW: cRect.width,
    cH: cRect.height,
    key,
  };
};

const getAutoTooltipStyle = (anchor: TooltipAnchor, size = CARD_TOOLTIP_SIZE): React.CSSProperties => {
  const { x, y, h, cW, cH } = anchor;
  const maxWidth = Math.max(200, cW - TOOLTIP_PADDING * 2);
  const maxHeight = Math.max(100, cH - TOOLTIP_PADDING * 2);
  const availableTop = Math.max(0, y - TOOLTIP_PADDING);
  const availableBottom = Math.max(0, cH - (y + h) - TOOLTIP_PADDING);
  const placeAbove = availableTop >= size.height || availableTop >= availableBottom;
  const heightLimit = Math.max(100, Math.min(maxHeight, placeAbove ? availableTop || maxHeight : availableBottom || maxHeight));
  const scale = Math.min(1, maxWidth / size.width, heightLimit / size.height);

  const left = Math.max(
    TOOLTIP_PADDING + (size.width * scale) / 2,
    Math.min(x, cW - TOOLTIP_PADDING - (size.width * scale) / 2)
  );

  let top = placeAbove ? y - TOOLTIP_PADDING : y + h + TOOLTIP_PADDING;
  if (placeAbove) {
    top = Math.max(top, size.height * scale + TOOLTIP_PADDING);
  } else {
    top = Math.min(top, cH - size.height * scale - TOOLTIP_PADDING);
  }

  return {
    left,
    top,
    transform: placeAbove
      ? `translate(-50%, -100%) scale(${scale})`
      : `translate(-50%, 0) scale(${scale})`,
    transformOrigin: placeAbove ? '50% 100%' : '50% 0%',
    width: size.width,
    maxHeight: size.height,
  };
};

// Trigger wrapper: shows bounded tooltip on hover (desktop) or tap (mobile)
function BoundedTooltipTrigger({
  children,
  text,
  title,
  cardRef,
  showTooltip,
  hideTooltip,
  style,
}: {
  children: React.ReactNode;
  text: string;
  title?: string;
  cardRef: React.RefObject<HTMLElement | null>;
  showTooltip: (el: HTMLElement | null, text: string, title?: string) => void;
  hideTooltip: () => void;
  style?: React.CSSProperties;
}) {
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleShow = useCallback(
    (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
      const el = e.currentTarget;
      if (cardRef.current) showTooltip(el, text, title);
    },
    [cardRef, showTooltip, text, title]
  );
  const handleHide = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    hideTooltip();
  }, [hideTooltip]);
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      const el = e.currentTarget; // Capture before timeout (currentTarget is null after async)
      touchTimerRef.current = setTimeout(() => {
        touchTimerRef.current = null;
        if (cardRef.current && el) showTooltip(el, text, title);
      }, 400);
    },
    [cardRef, showTooltip, text, title]
  );
  const handleTouchEnd = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    hideTooltip();
  }, [hideTooltip]);

  return (
    <div
      style={{ display: 'inline-flex', minWidth: 0, ...style }}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

// Collapsible Research Data Item Component
function ResearchDataItem({ item, index, t }: { item: { query: string; data: string; citations?: string[] }; index: number; t: (key: string) => string }) {
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
          <pre
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '0.78rem',
              lineHeight: 1.45,
              margin: '8px 0 0 0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace',
              maxHeight: '320px',
              overflow: 'auto',
              padding: '8px',
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {item.data}
          </pre>

          {Array.isArray(item.citations) && item.citations.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 600 }}>{t('sources')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {item.citations.slice(0, 8).map((c, i) => (
                  <a
                    key={i}
                    href={c}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'rgba(0,229,255,0.9)', fontSize: '0.75rem', textDecoration: 'none' }}
                  >
                    {c}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Collapsible Trade Position Item Component
function TradePositionItem({
  position,
  t,
}: {
  position: { asset: string; direction: 'BUY' | 'SELL'; confidence: number; trade_type?: string; reasoning?: string; stop_loss_reasoning?: string };
  t: (key: string) => string;
}) {
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
          {isBuy ? t('long') : t('short')} {position.asset}
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
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginBottom: '4px', fontWeight: 600 }}>{t('tradeReasoning')}</p>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
                {position.reasoning}
              </p>
            </div>
          )}
          {position.stop_loss_reasoning && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <p style={{ color: '#F59E0B', fontSize: '0.7rem', marginBottom: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle style={{ width: 12, height: 12 }} /> {t('tradeInvalidation')}
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

type CardTooltipState = { text: string; title?: string; anchor: TooltipAnchor } | null;

export function NewsAnalysisCard({ data, className, onAssetClick }: NewsAnalysisCardProps) {
  const t = useTranslations('newsAnalysis');
  const [expanded, setExpanded] = useState(false);
  const [isAgentExpanded, setIsAgentExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [cardTooltip, setCardTooltip] = useState<CardTooltipState>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const showCardTooltip = useCallback((el: HTMLElement | null, text: string, title?: string) => {
    if (!cardRef.current) return;
    const anchor = getTooltipAnchor(el, cardRef.current, 'card');
    if (anchor) setCardTooltip({ text, title, anchor });
  }, []);
  const hideCardTooltip = useCallback(() => setCardTooltip(null), []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { stage1, stage3 } = data.ai_analysis;
  const positions = Array.isArray((stage3 as any)?.positions) ? ((stage3 as any).positions as any[]) : [];
  const researchItems = buildStage2ResearchItems(data.ai_analysis);
  const isBreaking = data.is_breaking || false;
  
  // Quick reject: Stage 1 decided not to build infrastructure (NO case)
  const isQuickReject = stage1.should_build_infrastructure === false;
  
  const isTrade = stage3.trade_decision === 'TRADE';
  const score = stage3.importance_score;
  const firstPosition = positions[0];
  
  // Use AI's direct news_sentiment from Stage 3 (independent of positions/trade decision)
  const aiSentiment = stage3.news_sentiment?.toUpperCase();
  let sentiment: SentimentType;
  if (aiSentiment === 'BULLISH') {
    sentiment = score >= 8 ? 'strong_bullish' : score >= 6 ? 'bullish' : 'lean_bullish';
  } else if (aiSentiment === 'BEARISH') {
    sentiment = score >= 8 ? 'strong_bearish' : score >= 6 ? 'bearish' : 'lean_bearish';
  } else {
    // Fallback: use position direction if news_sentiment is missing
    sentiment = getSentimentFromScore(score, positions.length > 0, (firstPosition as any)?.direction);
  }
  const sentimentConfig = getSentimentConfig(sentiment, t);
  const magnitude = getMagnitudeFromScore(score);
  
  // Get unique trade types from all positions
  const uniqueTradeTypes = [...new Set(positions.map((p: any) => p.trade_type).filter(Boolean))];
  
  // Tek kaynak: API/parent'tan gelen data.category (stage1 öncelikli); yoksa stage3/stage1; böylece home ve news aynı kategoriyi gösterir
  const rawCategory = (data.category?.trim() || stage3.category || stage1.category || 'macro') || 'macro';
  const category = (rawCategory || '').toLowerCase() === 'cryptocurrency' ? 'crypto' : (rawCategory || 'macro');
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

    if (diffSec < 60) return t('justNow');
    if (diffMin < 60) return t('minutesAgo', { minutes: diffMin });
    if (diffHour < 24) return t('hoursAgo', { hours: diffHour });
    if (diffDay < 7) return t('daysAgo', { days: diffDay });
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

  // Stage 3 sends TradingView format only (EXCHANGE:SYMBOL). Display the symbol part for labels.
  const displayAsset = (asset: string) => (asset.includes(':') ? asset.split(':')[1] : asset);

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
        @keyframes cardTooltipIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
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
        ref={cardRef}
        id={`news-card-${data.news_id || data.id}`}
        className={`news-card-container ${className || ''}`}
        style={{
          background: isBreaking
            ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, #0D1117 50%, rgba(239,68,68,0.05) 100%)'
            : '#0D1117',
          borderTop: isBreaking ? '1px solid rgba(239,68,68,0.5)' : `1px solid ${sentimentConfig.color}30`,
          borderRight: isBreaking ? '1px solid rgba(239,68,68,0.5)' : `1px solid ${sentimentConfig.color}30`,
          borderBottom: isBreaking ? '1px solid rgba(239,68,68,0.5)' : `1px solid ${sentimentConfig.color}30`,
          borderLeft: isBreaking
            ? '3px solid #EF4444'
            : `3px solid ${sentimentConfig.color}`,
          borderRadius: '8px',
          overflow: 'visible',
          position: 'relative',
          animation: isBreaking ? 'breakingPulse 2s ease-in-out infinite' : 'none',
        }}
      >
        {/* Bounded tooltip: stays inside card, animated */}
        {cardTooltip && (
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              ...getAutoTooltipStyle(cardTooltip.anchor),
              zIndex: 200,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                background: '#0a0a0f',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '10px',
                padding: '12px 14px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                animation: 'cardTooltipIn 0.22s ease-out forwards',
              }}
            >
              {cardTooltip.title && (
                <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                  {cardTooltip.title}
                </div>
              )}
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', lineHeight: 1.45, whiteSpace: 'normal' }}>
                {cardTooltip.text}
              </div>
            </div>
          </div>
        )}
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
          <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitlePubTime')} text={t('tooltipPubTimeText')}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 500 }}>{displayTime}</span>
          </BoundedTooltipTrigger>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>•</span>
          <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleSource')} text={data.source === 'FibAlgo' ? t('tooltipSourceFibAlgo') : t('tooltipSourceOther', { source: data.source || 'FibAlgo' })}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ background: 'linear-gradient(135deg, #00E5FF 0%, #00B8D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700, fontSize: '0.8rem' }}>
                {data.source || 'FibAlgo'}
              </span>
              {data.ai_analysis?.analysis_duration_seconds !== undefined && data.ai_analysis.analysis_duration_seconds > 0 && (
                <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleSpeed')} text={t('tooltipSpeedText')}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', fontWeight: 500 }}>
                    {t('speedLabel', { seconds: data.ai_analysis.analysis_duration_seconds })}
                  </span>
                </BoundedTooltipTrigger>
              )}
            </span>
          </BoundedTooltipTrigger>
          <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleCategory')} text={t('tooltipCategoryText')}>
            <span style={{ background: catColors.bg, color: catColors.color, padding: '2px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {category}
            </span>
          </BoundedTooltipTrigger>
          {isBreaking && (
            <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleBreaking')} text={t('tooltipBreakingText')}>
              <span style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444', padding: '2px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s ease-in-out infinite' }} />
                {t('breaking')}
              </span>
            </BoundedTooltipTrigger>
          )}
        </div>

        {/* NEWS CONTENT - AI Title (if available) or Original Content */}
        <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleHeadline')} text={t('tooltipHeadlineText')} style={{ display: 'block', width: '100%' }}>
          <div className="news-card-content" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500, lineHeight: 1.5 }}>
              {stage1.title || data.content}
            </p>
          </div>
        </BoundedTooltipTrigger>

        {/* Advanced blocks intentionally removed; UI is position-first */}

        {/* AI ANALYSIS SECTION */}
        <div className="news-card-expanded" style={{ background: 'rgba(0,0,0,0.2)' }}>
          
          {/* QUICK REJECT CASE: Stage 1 decided not worth researching */}
          {isQuickReject ? (
            <>
              {/* Signal Row for Quick Reject - Low Impact with random 1-3 conviction */}
              {(() => {
                const randomConviction = ((data.id || data.news_id || '').charCodeAt(0) % 3) + 1;
                return (
                  <div className="signal-row">
                    <BoundedTooltipTrigger
                      cardRef={cardRef}
                      showTooltip={showCardTooltip}
                      hideTooltip={hideCardTooltip}
                      title={t('tooltipTitleLowImpact')}
                      text={t('tooltipLowImpactText')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Minus style={{ width: 28, height: 28, color: '#78909C' }} />
                          <div>
                            <div style={{ color: '#78909C', fontSize: '1rem', fontWeight: 700 }}>
                              {t('lowImpactNews')}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginLeft: '16px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('conviction')}</span>
                          <div className="conviction-bars">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className="conviction-bar" style={{ background: i < randomConviction ? '#78909C' : 'rgba(255,255,255,0.1)' }} />
                            ))}
                          </div>
                          <span style={{ color: '#78909C', fontSize: '0.85rem', fontWeight: 700 }}>{randomConviction}</span>
                        </div>
                      </div>
                    </BoundedTooltipTrigger>
                  </div>
                );
              })()}

              {/* FIBALGO AGENT Box - Same style as normal but with rejection message */}
              {(() => {
                const raw = stage1.infrastructure_reasoning || stage3.overall_assessment || t('noTradeOpportunity');
                const assessmentText = raw.replace(/^(NO\s*[—\-]\s*|YES\s*[—\-]\s*)/i, '').trim();
                // Mobile: 200 chars, Desktop: 1000 chars
                const charLimit = isMobile ? 200 : 1000;
                const isLongText = assessmentText.length > charLimit;
                const displayText = isLongText && !isAgentExpanded 
                  ? assessmentText.slice(0, charLimit) + '...' 
                  : assessmentText;
                
                return (
                  <div className="agent-box" style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(0,184,212,0.05) 100%)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px' }}>
                    <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleAgent')} text={t('tooltipAgentQuickReject')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Brain style={{ width: 18, height: 18, color: '#00E5FF' }} />
                        <span style={{ color: '#00E5FF', fontSize: '0.85rem', fontWeight: 700 }}>{t('fibalgoAgent')}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{t('agentReady')}</span>
                      </div>
                    </BoundedTooltipTrigger>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6, marginTop: 0, marginLeft: 0, marginRight: 0, marginBottom: isLongText ? '8px' : '12px' }}>
                      {displayText}
                    </p>
                    {isLongText && (
                      <button onClick={() => setIsAgentExpanded(!isAgentExpanded)} style={{ background: 'transparent', border: 'none', color: '#00E5FF', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        {isAgentExpanded ? (<><ChevronUp style={{ width: 14, height: 14 }} /> {t('showLess')}</>) : (<><ChevronDown style={{ width: 14, height: 14 }} /> {t('readMore')}</>)}
                      </button>
                    )}
                  </div>
                );
              })()}

              <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleFullAnalysis')} text={t('tooltipFullAnalysisQuickReject')}>
                <button onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>
                  {expanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                  {expanded ? t('hideAnalysis') : t('fullAnalysis')}
                </button>
              </BoundedTooltipTrigger>


              {expanded && stage1.analysis && (
                <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleNewsAnalysis')} text={t('tooltipNewsAnalysisQuickReject')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Lightbulb style={{ width: 14, height: 14, color: '#F59E0B' }} />
                        <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600 }}>{t('newsAnalysisLabel')}</span>
                      </div>
                    </BoundedTooltipTrigger>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.5, paddingLeft: '20px' }}>
                      {stage1.analysis}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* NORMAL CASE: Full analysis with collected data */}
              
              {/* Signal Row */}
              <div className="signal-row">
                <BoundedTooltipTrigger
                  cardRef={cardRef}
                  showTooltip={showCardTooltip}
                  hideTooltip={hideCardTooltip}
                  text={sentimentConfig.tooltip}
                  title={t('tooltipTitleSignal')}
                >
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
                          {sentiment.includes('bullish') ? t('bullishNews') : sentiment.includes('bearish') ? t('bearishNews') : t('neutralNews')}
                        </div>
                      </div>
                    </div>

                    {/* Conviction Bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginLeft: '16px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('conviction')}</span>
                      <div className="conviction-bars">
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            className="conviction-bar"
                            style={{
                              background: i < conviction
                                ? sentimentConfig.color
                                : 'rgba(255,255,255,0.1)',
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ color: sentimentConfig.color, fontSize: '0.85rem', fontWeight: 700 }}>{conviction}</span>
                    </div>
                  </div>
                </BoundedTooltipTrigger>

                {/* Trade Type Badges */}
                <div className="time-badges">
                  {uniqueTradeTypes.length > 0 && (
                    uniqueTradeTypes.map((tradeType, idx) => {
                      const typeConfig = getTradeTypeLabel(tradeType, t);
                      return (
                        <BoundedTooltipTrigger
                          key={idx}
                          cardRef={cardRef}
                          showTooltip={showCardTooltip}
                          hideTooltip={hideCardTooltip}
                          text={typeConfig.tooltip ?? t('tooltipTradeStyleText', { type: tradeType.replace('_', ' ') })}
                          title={t('tooltipTitleTradeStyle')}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: typeConfig.bgColor, padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', color: typeConfig.color, fontWeight: 600 }}>
                            <Timer style={{ width: 12, height: 12 }} />
                            {typeConfig.label}
                          </span>
                        </BoundedTooltipTrigger>
                      );
                    })
                  )}
                  <BoundedTooltipTrigger
                    cardRef={cardRef}
                    showTooltip={showCardTooltip}
                    hideTooltip={hideCardTooltip}
                    text={marketRegime === 'RISK-OFF' ? t('tooltipRiskOff') : t('tooltipRiskOn')}
                    title={t('tooltipTitleMarketRegime', { regime: marketRegime })}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: marketRegime === 'RISK-OFF' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', color: marketRegime === 'RISK-OFF' ? '#EF4444' : '#22C55E' }}>
                      {marketRegime === 'RISK-OFF' ? '🛡️' : '📈'} {marketRegime}
                    </span>
                  </BoundedTooltipTrigger>
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
                    <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleAgent')} text={t('tooltipAgentNormal')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Brain style={{ width: 18, height: 18, color: '#00E5FF' }} />
                        <span style={{ color: '#00E5FF', fontSize: '0.85rem', fontWeight: 700 }}>{t('fibalgoAgent')}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{t('agentReady')}</span>
                      </div>
                    </BoundedTooltipTrigger>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6, marginTop: 0, marginLeft: 0, marginRight: 0, marginBottom: isLongText ? '8px' : '12px' }}>
                      {displayText}
                    </p>
                    {isLongText && (
                      <button onClick={() => setIsAgentExpanded(!isAgentExpanded)} style={{ background: 'transparent', border: 'none', color: '#00E5FF', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        {isAgentExpanded ? (<><ChevronUp style={{ width: 14, height: 14 }} /> {t('showLess')}</>) : (<><ChevronDown style={{ width: 14, height: 14 }} /> {t('readMore')}</>)}
                      </button>
                    )}
                    {positions.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        {positions.map((position: any, idx: number) => (
                          <TradePositionItem key={idx} position={position} t={t} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Metrics Grid - Market Impact, Priced In, Info Quality */}
              <div className="news-card-grid" style={{ marginBottom: '16px' }}>
            {/* Market Impact - Use stage3.market_impact if available */}
            <BoundedTooltipTrigger
              cardRef={cardRef}
              showTooltip={showCardTooltip}
              hideTooltip={hideCardTooltip}
              text={t('tooltipMarketImpactText')}
              title={t('tooltipTitleMarketImpact')}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}
            >
            <div className="metric-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', textAlign: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('marketImpact')}</div>
              {(() => {
                const impactScore = stage3.market_impact ?? score;
                const impactLabel = impactScore >= 9 ? t('magnitudeMassive') : impactScore >= 7 ? t('magnitudeSignificant') : impactScore >= 5 ? t('magnitudeModerate') : impactScore >= 3 ? t('magnitudeMinor') : t('magnitudeNegligible');
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
            </BoundedTooltipTrigger>

            {/* Risk Mode - Use stage3.risk_mode if available */}
            <BoundedTooltipTrigger
              cardRef={cardRef}
              showTooltip={showCardTooltip}
              hideTooltip={hideCardTooltip}
              text={t('tooltipRiskModeText')}
              title={t('tooltipTitleRiskMode')}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}
            >
            <div className="metric-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', textAlign: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('riskMode')}</div>
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
            </BoundedTooltipTrigger>

            {/* Info Quality - Use stage3.info_quality if available */}
            <BoundedTooltipTrigger
              cardRef={cardRef}
              showTooltip={showCardTooltip}
              hideTooltip={hideCardTooltip}
              text={t('tooltipInfoQualityText')}
              title={t('tooltipTitleInfoQuality')}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}
            >
            <div className="metric-box" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', textAlign: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('infoQuality')}</div>
              {(() => {
                const infoQuality = stage3.info_quality || (researchItems.length > 0 ? 'VERIFIED' : 'SPECULATIVE');
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
            </BoundedTooltipTrigger>
          </div>

          <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleFullAnalysis')} text={t('tooltipFullAnalysisNormal')}>
            <button onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>
              {expanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
              {expanded ? t('hideAnalysis') : t('fullAnalysis')}
            </button>
          </BoundedTooltipTrigger>

          {expanded && (
            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {stage1.analysis && (
                <div style={{ marginBottom: '16px' }}>
                  <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleNewsAnalysis')} text={t('tooltipNewsAnalysisNormal')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Lightbulb style={{ width: 14, height: 14, color: '#F59E0B' }} />
                      <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600 }}>{t('newsAnalysisLabel')}</span>
                    </div>
                  </BoundedTooltipTrigger>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.5, paddingLeft: '20px' }}>
                    {stage1.analysis}
                  </p>
                </div>
              )}

              {stage3.main_risks.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleKeyRisk')} text={t('tooltipKeyRiskText')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <AlertTriangle style={{ width: 14, height: 14, color: '#EF4444' }} />
                      <span style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 600 }}>{t('keyRisk')}</span>
                    </div>
                  </BoundedTooltipTrigger>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.5, paddingLeft: '20px' }}>
                    {stage3.main_risks[0]}
                  </p>
                </div>
              )}

              {researchItems.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleResearchData')} text={t('tooltipResearchDataText')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Users style={{ width: 14, height: 14, color: '#00E5FF' }} />
                      <span style={{ color: '#00E5FF', fontSize: '0.75rem', fontWeight: 600 }}>{t('researchData')}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{t('researchItems', { count: researchItems.length })}</span>
                    </div>
                  </BoundedTooltipTrigger>
                  <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {researchItems.map((item, i) => (
                      <ResearchDataItem key={i} item={item} index={i} t={t} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>

        {/* FOOTER - Trade Assets from final analysis (hidden for Quick Reject) */}
        {!isQuickReject && (
          <div className="news-card-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div className="related-assets-row">
              {(Array.isArray(stage3?.tradingview_assets) ? stage3.tradingview_assets : []).slice(0, 8).map((asset, i) => (
                <BoundedTooltipTrigger key={i} cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleChart', { asset: displayAsset(asset) })} text={t('tooltipChartText', { asset })}>
                  <button
                    onClick={(e) => handleAssetClick(asset, e)}
                    style={{ background: 'rgba(0,229,255,0.1)', color: '#00E5FF', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(0,229,255,0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,229,255,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; }}
                  >
                    {displayAsset(asset)}
                  </button>
                </BoundedTooltipTrigger>
              ))}
            </div>
            {data.url && (
              <BoundedTooltipTrigger cardRef={cardRef} showTooltip={showCardTooltip} hideTooltip={hideCardTooltip} title={t('tooltipTitleOriginalSource')} text={t('tooltipOriginalSourceText')}>
                <a href={data.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textDecoration: 'none' }}>
                  {t('sourceLink')} <ExternalLink style={{ width: 12, height: 12 }} />
                </a>
              </BoundedTooltipTrigger>
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
  const t = useTranslations('newsAnalysis');
  if (!aiAnalysis?.stage1 || !aiAnalysis?.stage3) {
    // Simple card for non-analyzed news
    return (
      <div className={className} style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{time}</span>
          {isBreaking && <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 700 }}>{t('breaking')}</span>}
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
