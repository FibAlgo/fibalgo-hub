'use client';

import { Shield, Percent, TrendingUp } from 'lucide-react';
import type { FmpMarketRiskItem, FmpTreasuryItem } from '@/app/api/fmp/widgets/route';

const MONO = '"SF Mono", "Roboto Mono", "Consolas", "Liberation Mono", monospace';

function normalizeArray<T>(raw: T | T[] | null): T[] {
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function formatPct(val: number | undefined): string {
  if (val == null || Number.isNaN(val)) return '—';
  return `${Number(val).toFixed(2)}%`;
}

interface MarketRiskWidgetProps {
  marketRiskPremium: FmpMarketRiskItem | FmpMarketRiskItem[] | null;
  treasuryRates: FmpTreasuryItem | FmpTreasuryItem[] | null;
}

export function MarketRiskWidget({ marketRiskPremium, treasuryRates }: MarketRiskWidgetProps) {
  const mrpList = normalizeArray(marketRiskPremium);
  const treasuryList = normalizeArray(treasuryRates);
  const latestMrp = mrpList[0] ?? (typeof marketRiskPremium === 'object' && !Array.isArray(marketRiskPremium) ? marketRiskPremium : null);
  const latestTreasury = treasuryList[0] ?? (typeof treasuryRates === 'object' && !Array.isArray(treasuryRates) ? treasuryRates : null);

  const mrpValue = latestMrp?.marketRiskPremium ?? (latestMrp as Record<string, unknown>)?.value ?? (latestMrp as Record<string, unknown>)?.premium;
  const numMrp = typeof mrpValue === 'number' ? mrpValue : undefined;

  const treasuryLabels: { key: keyof FmpTreasuryItem; label: string }[] = [
    { key: 'month3', label: '3M' },
    { key: 'year1', label: '1Y' },
    { key: 'year2', label: '2Y' },
    { key: 'year10', label: '10Y' },
    { key: 'year30', label: '30Y' },
  ];

  return (
    <div
      className="market-risk-widget"
      style={{
        background: 'rgba(11,15,24,0.92)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: '3px solid rgba(245,158,11,0.4)',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{
        padding: '8px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ width: 24, height: 24, borderRadius: '4px', background: 'rgba(245,158,11,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={12} style={{ color: '#F59E0B' }} />
        </div>
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market Risk</span>
      </div>
      <div className="market-risk-grid market-risk-inner" style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
        <div className="market-risk-cell" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Percent size={11} style={{ color: '#F59E0B' }} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Risk Premium</span>
          </div>
          <div style={{ color: numMrp != null ? '#F59E0B' : 'rgba(255,255,255,0.35)', fontSize: '1rem', fontWeight: 700, fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
            {numMrp != null ? formatPct(numMrp) : '—'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginTop: '2px' }}>Equity vs risk-free</div>
        </div>
        <div className="market-risk-cell" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <TrendingUp size={11} style={{ color: '#3B82F6' }} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Treasury</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
            {latestTreasury
              ? treasuryLabels.map(({ key, label }) => {
                  const val = (latestTreasury as Record<string, unknown>)[key];
                  const num = typeof val === 'number' ? val : undefined;
                  return (
                    <span key={key} style={{ color: num != null ? '#60A5FA' : 'rgba(255,255,255,0.35)', fontSize: '0.68rem', fontWeight: 600, fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
                      {label} {num != null ? formatPct(num) : '—'}
                    </span>
                  );
                })
              : <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontFamily: MONO }}>—</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
