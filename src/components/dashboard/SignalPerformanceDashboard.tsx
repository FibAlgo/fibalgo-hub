'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Target, Activity, 
  Award, Zap, Clock, ChevronRight, BarChart3,
  CheckCircle, XCircle, Minus
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 SIGNAL PERFORMANCE DASHBOARD
// Kullanıcılara sinyal win rate'ini ve performansını gösterir
// ═══════════════════════════════════════════════════════════════════════════════

interface SignalStats {
  totalSignals: number;
  winRate1h: number;
  winRate4h: number;
  winRate24h: number;
  avgChange1h: number;
  avgChange4h: number;
  avgChange24h: number;
  bySignalType: {
    signal: string;
    count: number;
    winRate: number;
    avgChange: number;
  }[];
  byCategory: {
    category: string;
    count: number;
    winRate: number;
  }[];
  recentPerformance: {
    newsId: string;
    signal: string;
    asset: string;
    entryPrice: number;
    change24h: number | null;
    isWinner: boolean | null;
    timestamp: string;
  }[];
  streaks: {
    currentStreak: number;
    longestWinStreak: number;
    longestLoseStreak: number;
  };
}

const getSignalColor = (signal: string) => {
  switch (signal) {
    case 'STRONG_BUY': return '#22C55E';
    case 'BUY': return '#4ADE80';
    case 'SELL': return '#F87171';
    case 'STRONG_SELL': return '#EF4444';
    default: return '#9CA3AF';
  }
};

const getSignalIcon = (signal: string) => {
  switch (signal) {
    case 'STRONG_BUY': return '🚀';
    case 'BUY': return '📈';
    case 'SELL': return '📉';
    case 'STRONG_SELL': return '💀';
    default: return '➡️';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'crypto': return '₿';
    case 'stocks': return '📊';
    case 'forex': return '💱';
    case 'commodities': return '🥇';
    case 'indices': return '📈';
    default: return '📰';
  }
};

const WinRateCircle = ({ rate, label, size = 'large' }: { rate: number; label: string; size?: 'large' | 'small' }) => {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (rate / 100) * circumference;
  
  const getColor = (r: number) => {
    if (r >= 60) return '#22C55E';
    if (r >= 50) return '#F59E0B';
    return '#EF4444';
  };
  
  const isLarge = size === 'large';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: isLarge ? '100px' : '70px', height: isLarge ? '100px' : '70px' }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={getColor(rate)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: isLarge ? '1.5rem' : '1rem', 
            fontWeight: 700, 
            color: getColor(rate) 
          }}>
            {rate.toFixed(0)}%
          </div>
        </div>
      </div>
      <div style={{ 
        fontSize: isLarge ? '0.75rem' : '0.65rem', 
        color: '#9CA3AF', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em' 
      }}>
        {label}
      </div>
    </div>
  );
};

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color = '#00E5FF'
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string;
  color?: string;
}) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '1rem',
    border: '1px solid rgba(255,255,255,0.05)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <Icon size={16} color={color} />
      <span style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase' }}>{label}</span>
    </div>
    <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
    {subValue && (
      <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '0.25rem' }}>{subValue}</div>
    )}
  </div>
);

const StreakBadge = ({ streak }: { streak: number }) => {
  const isWinning = streak > 0;
  const absStreak = Math.abs(streak);
  
  if (absStreak === 0) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.5rem',
        background: 'rgba(156,163,175,0.1)',
        borderRadius: '4px',
        fontSize: '0.75rem',
        color: '#9CA3AF'
      }}>
        <Minus size={14} />
        <span>No streak</span>
      </div>
    );
  }
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.25rem 0.5rem',
      background: isWinning ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      borderRadius: '4px',
      fontSize: '0.75rem',
      color: isWinning ? '#22C55E' : '#EF4444',
      fontWeight: 600
    }}>
      {isWinning ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      <span>{absStreak} {isWinning ? 'Win' : 'Loss'} Streak</span>
    </div>
  );
};

export default function SignalPerformanceDashboard() {
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/signals/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        
        // Transform API response (snake_case) to frontend format (camelCase with nested objects)
        const transformedStats: SignalStats = {
          totalSignals: data.total_signals || 0,
          winRate1h: data.win_rate_1h || 0,
          winRate4h: data.win_rate_4h || 0,
          winRate24h: data.win_rate_24h || 0,
          avgChange1h: data.avg_change_1h || 0,
          avgChange4h: data.avg_change_4h || 0,
          avgChange24h: data.avg_change_24h || 0,
          bySignalType: (data.by_signal_type || []).map((st: { type: string; count: number; winners_24h: number }) => ({
            signal: st.type,
            count: st.count,
            winRate: st.count > 0 ? (st.winners_24h / st.count) * 100 : 0,
            avgChange: 0 // API doesn't provide this per signal type
          })),
          byCategory: [], // API doesn't provide category breakdown
          recentPerformance: (data.recent_signals || []).slice(0, 10).map((s: { id: string; signal: string; primary_asset: string; entry_price: number; change_24h: number | null; is_winner_24h: boolean | null; created_at: string }) => ({
            newsId: s.id,
            signal: s.signal,
            asset: s.primary_asset,
            entryPrice: s.entry_price,
            change24h: s.change_24h,
            isWinner: s.is_winner_24h,
            timestamp: s.created_at
          })),
          streaks: {
            currentStreak: data.current_streak || 0,
            longestWinStreak: data.max_streak || 0,
            longestLoseStreak: 0 // API doesn't track this
          }
        };
        
        setStats(transformedStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div style={{
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <Activity className="animate-pulse" size={32} color="#00E5FF" />
        <p style={{ color: '#9CA3AF', marginTop: '1rem' }}>Loading signal performance...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <p style={{ color: '#EF4444' }}>{error || 'No data available'}</p>
      </div>
    );
  }

  if (stats.totalSignals === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,229,255,0.05) 0%, rgba(0,0,0,0.4) 100%)',
        borderRadius: '12px',
        padding: '2rem',
        border: '1px solid rgba(0,229,255,0.1)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Target size={48} color="#00E5FF" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Signal Tracking Active
          </h3>
          <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
            Performance data will appear after signals are generated and tracked.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0,229,255,0.03) 0%, rgba(0,0,0,0.4) 100%)',
      borderRadius: '12px',
      border: '1px solid rgba(0,229,255,0.1)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00E5FF 0%, #0099AA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Target size={20} color="#000" />
          </div>
          <div>
            <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              Signal Performance
            </h3>
            <p style={{ color: '#6B7280', fontSize: '0.7rem', margin: 0 }}>
              {stats.totalSignals} signals tracked
            </p>
          </div>
        </div>
        <StreakBadge streak={stats.streaks.currentStreak} />
      </div>

      {/* Win Rate Circles */}
      <div style={{
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-around',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <WinRateCircle rate={stats.winRate1h} label="1 Hour" size="small" />
        <WinRateCircle rate={stats.winRate4h} label="4 Hours" size="small" />
        <WinRateCircle rate={stats.winRate24h} label="24 Hours" size="large" />
      </div>

      {/* Average Returns */}
      <div style={{
        padding: '1rem 1.25rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.75rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            color: stats.avgChange1h >= 0 ? '#22C55E' : '#EF4444' 
          }}>
            {stats.avgChange1h >= 0 ? '+' : ''}{stats.avgChange1h.toFixed(2)}%
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6B7280' }}>Avg 1h Return</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            color: stats.avgChange4h >= 0 ? '#22C55E' : '#EF4444' 
          }}>
            {stats.avgChange4h >= 0 ? '+' : ''}{stats.avgChange4h.toFixed(2)}%
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6B7280' }}>Avg 4h Return</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '1.1rem', 
            fontWeight: 700, 
            color: stats.avgChange24h >= 0 ? '#22C55E' : '#EF4444' 
          }}>
            {stats.avgChange24h >= 0 ? '+' : ''}{stats.avgChange24h.toFixed(2)}%
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6B7280' }}>Avg 24h Return</div>
        </div>
      </div>

      {/* Performance by Signal Type */}
      {stats.bySignalType.length > 0 && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ 
            fontSize: '0.7rem', 
            color: '#9CA3AF', 
            textTransform: 'uppercase', 
            marginBottom: '0.75rem',
            letterSpacing: '0.05em'
          }}>
            By Signal Type
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats.bySignalType.map(st => (
              <div key={st.signal} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{getSignalIcon(st.signal)}</span>
                  <span style={{ color: getSignalColor(st.signal), fontWeight: 600, fontSize: '0.8rem' }}>
                    {st.signal.replace('_', ' ')}
                  </span>
                  <span style={{ color: '#6B7280', fontSize: '0.7rem' }}>
                    ({st.count})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ 
                    color: st.winRate >= 50 ? '#22C55E' : '#EF4444',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}>
                    {st.winRate.toFixed(0)}%
                  </span>
                  <span style={{ 
                    color: st.avgChange >= 0 ? '#4ADE80' : '#F87171',
                    fontSize: '0.75rem'
                  }}>
                    {st.avgChange >= 0 ? '+' : ''}{st.avgChange.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Signals */}
      {stats.recentPerformance.length > 0 && (
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ 
            fontSize: '0.7rem', 
            color: '#9CA3AF', 
            textTransform: 'uppercase', 
            marginBottom: '0.75rem',
            letterSpacing: '0.05em'
          }}>
            Recent Signals
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {stats.recentPerformance.slice(0, 5).map((perf, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.5rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '4px',
                fontSize: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {perf.isWinner === true && <CheckCircle size={14} color="#22C55E" />}
                  {perf.isWinner === false && <XCircle size={14} color="#EF4444" />}
                  {perf.isWinner === null && <Clock size={14} color="#9CA3AF" />}
                  <span style={{ color: getSignalColor(perf.signal) }}>{perf.signal}</span>
                  <span style={{ color: '#9CA3AF' }}>{perf.asset.split(':')[1] || perf.asset}</span>
                </div>
                <div>
                  {perf.change24h !== null ? (
                    <span style={{ 
                      color: perf.change24h >= 0 ? '#22C55E' : '#EF4444',
                      fontWeight: 600
                    }}>
                      {perf.change24h >= 0 ? '+' : ''}{perf.change24h.toFixed(2)}%
                    </span>
                  ) : (
                    <span style={{ color: '#6B7280' }}>Tracking...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streaks Footer */}
      <div style={{
        padding: '0.75rem 1.25rem',
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'space-around',
        fontSize: '0.7rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#22C55E', fontWeight: 700 }}>{stats.streaks.longestWinStreak}</div>
          <div style={{ color: '#6B7280' }}>Best Win Streak</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#EF4444', fontWeight: 700 }}>{stats.streaks.longestLoseStreak}</div>
          <div style={{ color: '#6B7280' }}>Worst Lose Streak</div>
        </div>
      </div>
    </div>
  );
}
