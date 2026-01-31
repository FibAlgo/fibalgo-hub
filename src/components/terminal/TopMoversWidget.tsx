'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import type { FmpMoverItem } from '@/app/api/fmp/widgets/route';

const MONO = '"SF Mono", "Roboto Mono", "Consolas", "Liberation Mono", monospace';

/** Build TradingView symbol (EXCHANGE:SYMBOL) from FMP mover item */
function toTradingViewSymbol(item: FmpMoverItem): string {
  const sym = (item.symbol ?? item.ticker ?? '') as string;
  if (!sym) return 'NASDAQ:AAPL';
  if (sym.includes(':')) return sym;
  const exchange = (item.exchangeShortName ?? item.exchange ?? 'NASDAQ') as string;
  const clean = exchange.replace(/\s/g, '').toUpperCase();
  return clean ? `${clean}:${sym}` : `NASDAQ:${sym}`;
}

function formatPct(val: number | undefined): string {
  if (val == null || Number.isNaN(val)) return '—';
  const n = Number(val);
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function formatPrice(val: number | undefined): string {
  if (val == null || Number.isNaN(val)) return '—';
  const n = Number(val);
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function MoverRow({ item, type, isLast, onClick }: { item: FmpMoverItem; type: 'gain' | 'loss' | 'active'; isLast: boolean; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  const symbol = (item.symbol ?? item.ticker ?? '—') as string;
  const name = (item.name ?? '') as string;
  const price = typeof item.price === 'number' ? item.price : undefined;
  const pct = typeof item.changesPercentage === 'number' ? item.changesPercentage : (typeof item.change === 'number' ? item.change : undefined);
  const isPositive = type === 'gain' || (type === 'active' && (pct ?? 0) >= 0);
  const color = type === 'loss' ? '#EF4444' : isPositive ? '#22C55E' : '#F59E0B';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderRadius: '6px',
        background: hover && onClick ? 'rgba(255,255,255,0.06)' : 'transparent',
        marginBottom: isLast ? 0 : '4px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s ease',
        border: '1px solid transparent',
        outline: 'none',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: '#E2E8F0', fontSize: '0.8rem', fontWeight: 600, fontFamily: MONO, letterSpacing: '0.02em' }}>{symbol}</div>
        {name && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{name}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>{formatPrice(price)}</span>
        <span style={{ color, fontSize: '0.75rem', fontWeight: 700, minWidth: '56px', textAlign: 'right', fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>{formatPct(pct)}</span>
      </div>
    </div>
  );
}

interface TopMoversWidgetProps {
  gainers: FmpMoverItem[];
  losers: FmpMoverItem[];
  actives: FmpMoverItem[];
  onSymbolClick?: (symbol: string) => void;
}

const CARD_STYLE = {
  background: 'rgba(11,15,24,0.92)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '8px',
  overflow: 'hidden' as const,
  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
};

export function TopMoversWidget({ gainers, losers, actives, onSymbolClick }: TopMoversWidgetProps) {
  const cards = [
    { title: 'Gainers', icon: TrendingUp, color: '#22C55E', borderColor: 'rgba(34,197,94,0.35)', data: gainers.slice(0, 5), type: 'gain' as const },
    { title: 'Losers', icon: TrendingDown, color: '#EF4444', borderColor: 'rgba(239,68,68,0.35)', data: losers.slice(0, 5), type: 'loss' as const },
    { title: 'Active', icon: Activity, color: '#00E5FF', borderColor: 'rgba(0,229,255,0.35)', data: actives.slice(0, 5), type: 'active' as const },
  ];

  return (
    <div className="top-movers-widget" style={{ marginBottom: '10px' }}>
      <div className="top-movers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
      {cards.map(({ title, icon: Icon, color, borderColor, data, type }) => (
        <div
          key={title}
          className="top-movers-card"
          style={{
            ...CARD_STYLE,
            borderLeft: `3px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div className="top-movers-card-head" style={{
            padding: '8px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.2)',
            flexShrink: 0,
          }}>
            <div style={{ width: 24, height: 24, borderRadius: '4px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={12} style={{ color }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
          </div>
          <div className="terminal-scrollbar top-movers-card-body" style={{ padding: '6px 8px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {data.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', padding: '16px 8px', textAlign: 'center', fontFamily: MONO }}>—</div>
            ) : (
              data.map((item, i) => (
                <MoverRow
                  key={`${item.symbol ?? i}-${i}`}
                  item={item}
                  type={type}
                  isLast={i === data.length - 1}
                  onClick={onSymbolClick ? () => onSymbolClick(toTradingViewSymbol(item)) : undefined}
                />
              ))
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
