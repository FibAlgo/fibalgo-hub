'use client';

import { useEffect, useState } from 'react';
import NewsSignalCard, { type NewsSignal } from './NewsSignalCard';
import {
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface NewsSignalListProps {
  maxItems?: number;
  showFilters?: boolean;
}

type FilterType = 'all' | 'buy' | 'sell' | 'breaking' | 'tradeable';

// ═══════════════════════════════════════════════════════════════════════════════
// STATS SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

function StatsSummary({ signals }: { signals: NewsSignal[] }) {
  const buySignals = signals.filter(s => s.signal === 'BUY' || s.signal === 'STRONG_BUY').length;
  const sellSignals = signals.filter(s => s.signal === 'SELL' || s.signal === 'STRONG_SELL').length;
  const tradeableSignals = signals.filter(s => s.would_trade && !s.signal_blocked).length;
  const breakingNews = signals.filter(s => s.is_breaking).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
        <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
          <TrendingUp className="w-4 h-4" />
          Buy Signals
        </div>
        <div className="text-2xl font-bold text-white">{buySignals}</div>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
        <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
          <TrendingDown className="w-4 h-4" />
          Sell Signals
        </div>
        <div className="text-2xl font-bold text-white">{sellSignals}</div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
          <Activity className="w-4 h-4" />
          Tradeable
        </div>
        <div className="text-2xl font-bold text-white">{tradeableSignals}</div>
      </div>

      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
        <div className="flex items-center gap-2 text-orange-400 text-sm mb-1">
          <Zap className="w-4 h-4" />
          Breaking
        </div>
        <div className="text-2xl font-bold text-white">{breakingNews}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER TABS
// ═══════════════════════════════════════════════════════════════════════════════

function FilterTabs({
  activeFilter,
  onFilterChange
}: {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}) {
  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Activity className="w-4 h-4" /> },
    { id: 'buy', label: 'Buy', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'sell', label: 'Sell', icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'breaking', label: 'Breaking', icon: <Zap className="w-4 h-4" /> },
    { id: 'tradeable', label: 'Tradeable', icon: <Filter className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map(filter => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${activeFilter === filter.id
              ? 'bg-white text-black'
              : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }
          `}
        >
          {filter.icon}
          {filter.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function NewsSignalList({ maxItems = 20, showFilters = true }: NewsSignalListProps) {
  const [signals, setSignals] = useState<NewsSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchSignals = async () => {
    try {
      const response = await fetch(`/api/signals/news?limit=${maxItems}`);
      if (!response.ok) throw new Error('Failed to fetch signals');
      const data = await response.json();
      setSignals(data.signals || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchSignals, 60000);
    return () => clearInterval(interval);
  }, [maxItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSignals();
  };

  // Filter signals
  const filteredSignals = signals.filter(signal => {
    switch (filter) {
      case 'buy':
        return signal.signal === 'BUY' || signal.signal === 'STRONG_BUY';
      case 'sell':
        return signal.signal === 'SELL' || signal.signal === 'STRONG_SELL';
      case 'breaking':
        return signal.is_breaking;
      case 'tradeable':
        return signal.would_trade && !signal.signal_blocked;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">AI News Signals</h2>
          <p className="text-sm text-gray-500">
            Real-time AI analysis of market-moving news
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Summary */}
      <StatsSummary signals={signals} />

      {/* Filters */}
      {showFilters && (
        <FilterTabs activeFilter={filter} onFilterChange={setFilter} />
      )}

      {/* Last Updated */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <Clock className="w-3 h-3" />
        Last updated: {new Date().toLocaleTimeString()}
      </div>

      {/* Signal List */}
      {filteredSignals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No signals match your filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSignals.map(signal => (
            <NewsSignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      )}
    </div>
  );
}
