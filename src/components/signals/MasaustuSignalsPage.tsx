'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  RefreshCw,
  X,
  Flame,
  Timer,
  Zap,
  ExternalLink,
  Newspaper
} from 'lucide-react';
import Link from 'next/link';

interface SignalStats {
  total_signals: number;
  signals_with_1h: number;
  signals_with_4h: number;
  signals_with_24h: number;
  winners_1h: number;
  winners_4h: number;
  winners_24h: number;
  win_rate_1h: number;
  win_rate_4h: number;
  win_rate_24h: number;
  avg_change_1h: number;
  avg_change_4h: number;
  avg_change_24h: number;
  by_signal_type: {
    type: string;
    count: number;
    winners_1h: number;
    winners_4h: number;
    winners_24h: number;
  }[];
  recent_signals: {
    id: string;
    title: string;
    category: string;
    signal: string;
    primary_asset: string;
    entry_price: number;
    current_price: number | null;
    current_change: number | null;
    current_pnl: number | null;
    price_1h: number | null;
    price_4h: number | null;
    price_24h: number | null;
    change_1h: number | null;
    change_4h: number | null;
    change_24h: number | null;
    is_winner_1h: boolean | null;
    is_winner_4h: boolean | null;
    is_winner_24h: boolean | null;
    created_at: string;
  }[];
  current_streak: number;
  max_streak: number;
  last_updated: string;
}

export default function MasaustuSignalsPage() {
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/signals/stats');
      if (!response.ok) throw new Error('Failed to load stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !stats) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '2px solid rgba(0, 245, 255, 0.3)', borderTopColor: '#00F5FF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading signal data...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <X size={40} style={{ color: '#EF4444', marginBottom: 16 }} />
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>{error}</p>
          <button onClick={fetchStats} style={{ padding: '8px 20px', background: 'rgba(0, 245, 255, 0.1)', border: '1px solid rgba(0, 245, 255, 0.3)', borderRadius: 8, color: '#00F5FF', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatChange = (change: number | null | undefined) => {
    if (change === null || change === undefined) return '—';
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 60) return '#22C55E';
    if (rate >= 50) return '#EAB308';
    return '#EF4444';
  };

  const longStats = stats?.by_signal_type?.find(t => t.type === 'LONG' || t.type === 'BUY' || t.type === 'STRONG_BUY');
  const shortStats = stats?.by_signal_type?.find(t => t.type === 'SHORT' || t.type === 'SELL' || t.type === 'STRONG_SELL');

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #00F5FF20 0%, #00F5FF05 100%)', border: '1px solid rgba(0, 245, 255, 0.3)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} style={{ color: '#00F5FF' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>AI Signal Tracker</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>
              Updated: {stats?.last_updated ? new Date(stats.last_updated).toLocaleString() : 'Loading...'}
            </p>
          </div>
        </div>
        <button onClick={fetchStats} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}>
          <RefreshCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span style={{ fontSize: 14 }}>Refresh</span>
        </button>
      </div>

      {/* Win Rate Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: '1 Hour', rate: stats?.win_rate_1h || 0, winners: stats?.winners_1h || 0, total: stats?.signals_with_1h || 0 },
          { label: '4 Hours', rate: stats?.win_rate_4h || 0, winners: stats?.winners_4h || 0, total: stats?.signals_with_4h || 0 },
          { label: '24 Hours', rate: stats?.win_rate_24h || 0, winners: stats?.winners_24h || 0, total: stats?.signals_with_24h || 0 },
        ].map(({ label, rate, winners, total }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
            <p style={{ fontSize: 42, fontWeight: 700, color: getWinRateColor(rate), margin: '0 0 8px 0', fontFamily: 'monospace' }}>{rate.toFixed(1)}%</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{winners} / {total} signals</p>
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BarChart3 size={16} style={{ color: '#3B82F6' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Total Signals</span>
          </div>
          <p style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{stats?.total_signals || 0}</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Flame size={16} style={{ color: '#F97316' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Win Streak</span>
          </div>
          <p style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{stats?.current_streak || 0}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>(max: {stats?.max_streak || 0})</span></p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={16} style={{ color: '#22C55E' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>LONG Win Rate</span>
          </div>
          <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: '#22C55E' }}>{longStats && longStats.count > 0 ? ((longStats.winners_24h / longStats.count) * 100).toFixed(1) : '0'}%</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingDown size={16} style={{ color: '#EF4444' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>SHORT Win Rate</span>
          </div>
          <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: '#EF4444' }}>{shortStats && shortStats.count > 0 ? ((shortStats.winners_24h / shortStats.count) * 100).toFixed(1) : '0'}%</p>
        </div>
      </div>

      {/* Recent Signals Table */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Recent Signals</h2>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Showing {categoryFilter === 'all' ? stats?.recent_signals?.length || 0 : stats?.recent_signals?.filter(s => s.category === categoryFilter).length || 0} signals</span>
        </div>

        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
          {[
            { key: 'all', label: 'All', color: '#fff' },
            { key: 'crypto', label: 'Crypto', color: '#F7931A' },
            { key: 'forex', label: 'Forex', color: '#22C55E' },
            { key: 'stocks', label: 'Stocks', color: '#3B82F6' },
            { key: 'commodities', label: 'Commodities', color: '#EAB308' },
            { key: 'indices', label: 'Indices', color: '#A855F7' },
            { key: 'macro', label: 'Macro', color: '#EC4899' },
          ].map(cat => {
            const isActive = categoryFilter === cat.key;
            const count = cat.key === 'all' 
              ? stats?.recent_signals?.length || 0 
              : stats?.recent_signals?.filter(s => s.category === cat.key).length || 0;
            
            return (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: isActive ? `1px solid ${cat.color}40` : '1px solid rgba(255,255,255,0.1)',
                  background: isActive ? `${cat.color}15` : 'transparent',
                  color: isActive ? cat.color : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                {cat.label}
                <span style={{ 
                  fontSize: 11, 
                  padding: '2px 6px', 
                  borderRadius: 4, 
                  background: isActive ? `${cat.color}20` : 'rgba(255,255,255,0.05)',
                  color: isActive ? cat.color : 'rgba(255,255,255,0.4)'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 90px 90px 90px 90px 100px', padding: '12px 20px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <div>Signal</div>
          <div>Asset</div>
          <div style={{ textAlign: 'right' }}>Entry</div>
          <div style={{ textAlign: 'center' }}>Now</div>
          <div style={{ textAlign: 'center' }}>1H</div>
          <div style={{ textAlign: 'center' }}>4H</div>
          <div style={{ textAlign: 'center' }}>24H</div>
          <div style={{ textAlign: 'center' }}>News</div>
        </div>

        {stats?.recent_signals
          ?.filter(signal => categoryFilter === 'all' || signal.category === categoryFilter)
          .map((signal) => {
          const isBuy = signal.signal === 'BUY' || signal.signal === 'LONG' || signal.signal === 'STRONG_BUY';
          const signalColor = isBuy ? '#22C55E' : '#EF4444';
          
          return (
            <div key={signal.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 90px 90px 90px 90px 100px', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: `${signalColor}20`, color: signalColor }}>
                  {isBuy ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {signal.signal}
                </span>
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{signal.primary_asset}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  {new Date(signal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>${signal.entry_price?.toLocaleString() || '—'}</div>
              <div style={{ textAlign: 'center' }}>
                {signal.current_pnl === null
                  ? <Timer size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  : <span style={{ color: signal.current_pnl >= 0 ? '#22C55E' : '#EF4444', fontFamily: 'monospace', fontSize: 13 }}>{formatChange(signal.current_pnl)}</span>
                }
              </div>
              <div style={{ textAlign: 'center' }}>
                {signal.is_winner_1h === null ? <Timer size={14} style={{ color: 'rgba(255,255,255,0.2)' }} /> : <span style={{ color: signal.is_winner_1h ? '#22C55E' : '#EF4444', fontFamily: 'monospace', fontSize: 13 }}>{formatChange(signal.change_1h)}</span>}
              </div>
              <div style={{ textAlign: 'center' }}>
                {signal.is_winner_4h === null ? <Timer size={14} style={{ color: 'rgba(255,255,255,0.2)' }} /> : <span style={{ color: signal.is_winner_4h ? '#22C55E' : '#EF4444', fontFamily: 'monospace', fontSize: 13 }}>{formatChange(signal.change_4h)}</span>}
              </div>
              <div style={{ textAlign: 'center' }}>
                {signal.is_winner_24h === null ? <Timer size={14} style={{ color: 'rgba(255,255,255,0.2)' }} /> : <span style={{ color: signal.is_winner_24h ? '#22C55E' : '#EF4444', fontFamily: 'monospace', fontSize: 13 }}>{formatChange(signal.change_24h)}</span>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <Link 
                  href={`/terminal/news?newsId=${signal.id}`}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 4, 
                    padding: '6px 12px', 
                    borderRadius: 6, 
                    fontSize: 11, 
                    fontWeight: 500, 
                    background: 'rgba(0, 245, 255, 0.1)', 
                    color: '#00F5FF', 
                    textDecoration: 'none',
                    border: '1px solid rgba(0, 245, 255, 0.2)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 245, 255, 0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 245, 255, 0.1)'; }}
                >
                  <Newspaper size={12} />
                  View
                </Link>
              </div>
            </div>
          );
        })}

        {(!stats?.recent_signals || stats.recent_signals.length === 0) && (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <Activity size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p>No signal data yet</p>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div style={{ marginTop: 24, padding: 20, background: 'rgba(0, 245, 255, 0.05)', border: '1px solid rgba(0, 245, 255, 0.15)', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <Zap size={20} style={{ color: '#00F5FF', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontWeight: 500, marginBottom: 4 }}>Transparency Commitment</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
            This page tracks all AI-generated trading signals with real market data. Results are unfiltered and updated automatically every 15 minutes. Entry prices are captured at the moment of signal generation.
          </p>
        </div>
      </div>

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
