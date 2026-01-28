'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowUp,
  ArrowDown,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Search,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';

interface CoinData {
  symbol: string;
  name: string;
  logo: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
}

interface ForexData {
  symbol: string;
  name: string;
  flag: string;
  baseLogo: string;
  quoteLogo: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  rank: number;
}

interface StockData {
  symbol: string;
  name: string;
  sector: string;
  logo: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  rank: number;
}

interface CommodityData {
  symbol: string;
  name: string;
  unit: string;
  category: string;
  logo: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  rank: number;
}

interface IndexData {
  symbol: string;
  name: string;
  country: string;
  flag: string;
  flagImage: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  rank: number;
}

interface MobileResponsiveMarketsProps {
  coins: CoinData[];
  forexPairs: ForexData[];
  stocks: StockData[];
  commodities: CommodityData[];
  indices: IndexData[];
  fearGreedIndex: { value: number; classification: string } | null;
  isLoading: boolean;
  fetchMarketData: (showLoading?: boolean) => void;
}

// Sort options for each tab
const sortOptions = {
  crypto: [
    { value: 'marketCap-desc', label: 'Market Cap ↓' },
    { value: 'marketCap-asc', label: 'Market Cap ↑' },
    { value: 'price-desc', label: 'Price ↓' },
    { value: 'price-asc', label: 'Price ↑' },
    { value: 'change24h-desc', label: '24h % ↓' },
    { value: 'change24h-asc', label: '24h % ↑' },
  ],
  forex: [
    { value: 'price-desc', label: 'Price ↓' },
    { value: 'price-asc', label: 'Price ↑' },
    { value: 'change24h-desc', label: '24h % ↓' },
    { value: 'change24h-asc', label: '24h % ↑' },
  ],
  stocks: [
    { value: 'price-desc', label: 'Price ↓' },
    { value: 'price-asc', label: 'Price ↑' },
    { value: 'change24h-desc', label: '24h % ↓' },
    { value: 'change24h-asc', label: '24h % ↑' },
  ],
  commodities: [
    { value: 'price-desc', label: 'Price ↓' },
    { value: 'price-asc', label: 'Price ↑' },
    { value: 'change24h-desc', label: '24h % ↓' },
    { value: 'change24h-asc', label: '24h % ↑' },
  ],
  indices: [
    { value: 'price-desc', label: 'Price ↓' },
    { value: 'price-asc', label: 'Price ↑' },
    { value: 'change24h-desc', label: '24h % ↓' },
    { value: 'change24h-asc', label: '24h % ↑' },
  ],
};

export default function MobileResponsiveMarkets({
  coins,
  forexPairs,
  stocks,
  commodities,
  indices,
  fearGreedIndex,
  isLoading,
  fetchMarketData,
}: MobileResponsiveMarketsProps) {
  const [activeTab, setActiveTab] = useState<'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices'>('crypto');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showIndicators, setShowIndicators] = useState(false);
  const [showMobileSortDropdown, setShowMobileSortDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mobile-sort-container')) {
        setShowMobileSortDropdown(false);
      }
    };
    if (showMobileSortDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMobileSortDropdown]);

  // Handle mobile sort selection
  const handleMobileSortSelect = (value: string) => {
    const [field, order] = value.split('-');
    setSortBy(field);
    setSortOrder(order as 'asc' | 'desc');
    setShowMobileSortDropdown(false);
  };

  // Get current sort label
  const getCurrentSortLabel = () => {
    const options = sortOptions[activeTab];
    const currentValue = `${sortBy}-${sortOrder}`;
    const option = options.find(opt => opt.value === currentValue);
    return option?.label || 'Sort';
  };

  // Sort and filter data
  const getSortedData = () => {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    
    if (activeTab === 'crypto') {
      return [...coins]
        .filter(coin => 
          coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          coin.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
          if (sortBy === 'price') return (a.price - b.price) * multiplier;
          if (sortBy === 'change24h') return (a.change24h - b.change24h) * multiplier;
          if (sortBy === 'marketCap') return (a.marketCap - b.marketCap) * multiplier;
          return 0;
        });
    }
    if (activeTab === 'forex') {
      return [...forexPairs]
        .filter(pair => 
          pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pair.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
          if (sortBy === 'price') return (a.price - b.price) * multiplier;
          if (sortBy === 'change24h') return (a.change24h - b.change24h) * multiplier;
          return 0;
        });
    }
    if (activeTab === 'stocks') {
      return [...stocks]
        .filter(stock => 
          stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
          if (sortBy === 'price') return (a.price - b.price) * multiplier;
          if (sortBy === 'change24h') return (a.change24h - b.change24h) * multiplier;
          return 0;
        });
    }
    if (activeTab === 'commodities') {
      return [...commodities]
        .filter(commodity => 
          commodity.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          commodity.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
          if (sortBy === 'price') return (a.price - b.price) * multiplier;
          if (sortBy === 'change24h') return (a.change24h - b.change24h) * multiplier;
          return 0;
        });
    }
    // indices
    return [...indices]
      .filter(index => 
        index.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        index.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
        if (sortBy === 'price') return (a.price - b.price) * multiplier;
        if (sortBy === 'change24h') return (a.change24h - b.change24h) * multiplier;
        return 0;
      });
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  const sortedData = getSortedData();

  return (
    <div className="mobile-markets-container">
      <style jsx global>{`
        .mobile-markets-container {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          background: #0A0A0B;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .mobile-markets-container * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .mobile-markets-container *::-webkit-scrollbar {
          display: none !important;
        }
        
        .mobile-markets-header {
          padding: 1rem;
        }
        
        .mobile-markets-header h1 {
          color: #fff;
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
        }
        
        .mobile-markets-header p {
          color: rgba(255,255,255,0.5);
          margin: 0;
          font-size: 0.8rem;
        }
        
        .mobile-markets-tabs {
          display: flex;
          overflow-x: auto;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 0 0.5rem;
        }
        
        .mobile-markets-tab {
          padding: 0.6rem 1rem;
          border: none;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
          cursor: pointer;
          font-size: 0.8rem;
          white-space: nowrap;
          flex-shrink: 0;
        }
        
        .mobile-markets-tab.active {
          color: #00F5FF;
          border-bottom-color: #00F5FF;
        }
        
        .mobile-markets-content {
          flex: 1;
          padding: 1rem;
          overflow: auto;
        }
        
        .mobile-indicators-toggle {
          display: flex;
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(0, 245, 255, 0.1);
          border: 1px solid rgba(0, 245, 255, 0.3);
          border-radius: 8px;
          color: #00F5FF;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          margin-bottom: 1rem;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .mobile-indicators-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .mobile-sort-container {
          position: relative;
          margin-bottom: 0.75rem;
        }
        
        .mobile-search-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          padding: 0.65rem 1rem 0.65rem 2.5rem;
          color: #fff;
          font-size: 0.85rem;
          outline: none;
          margin-bottom: 0.75rem;
        }
        
        .mobile-sort-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.65rem 1rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          color: #fff;
          font-size: 0.85rem;
          cursor: pointer;
        }
        
        .mobile-sort-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: #1a1a1b;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          overflow: hidden;
          z-index: 100;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        
        .mobile-sort-option {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.7);
          font-size: 0.85rem;
          text-align: left;
          cursor: pointer;
        }
        
        .mobile-sort-option:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        
        .mobile-sort-option.active {
          background: rgba(0, 245, 255, 0.1);
          color: #00F5FF;
        }
        
        .mobile-market-card {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          gap: 0.75rem;
        }
        
        .mobile-market-card-logo {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .mobile-market-card-info {
          flex: 1;
          min-width: 0;
        }
        
        .mobile-market-card-name {
          color: #fff;
          font-weight: 600;
          font-size: 0.95rem;
        }
        
        .mobile-market-card-symbol {
          color: rgba(255,255,255,0.5);
          font-size: 0.75rem;
        }
        
        .mobile-market-card-price-section {
          text-align: right;
        }
        
        .mobile-market-card-price {
          color: #fff;
          font-weight: 600;
          font-family: monospace;
          font-size: 0.95rem;
        }
        
        .mobile-market-card-change {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 2px;
          font-weight: 600;
          font-size: 0.8rem;
        }
        
        .mobile-market-card-change.positive {
          color: #22C55E;
        }
        
        .mobile-market-card-change.negative {
          color: #EF4444;
        }
        
        .mobile-indicator-card {
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 1rem;
        }
        
        .mobile-indicator-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          color: #00F5FF;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .mobile-indicator-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }
        
        .mobile-indicator-row:last-child {
          margin-bottom: 0;
        }
        
        .mobile-indicator-label {
          color: rgba(255,255,255,0.6);
          font-size: 0.8rem;
        }
        
        .mobile-indicator-value {
          color: #fff;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .mobile-table-container {
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          overflow: hidden;
        }
      `}</style>

      {/* Header */}
      <div className="mobile-markets-header">
        <h1>Markets</h1>
        <p>Live prices for Crypto, Forex, Stocks & more</p>
      </div>

      {/* Tabs */}
      <div className="mobile-markets-tabs">
        {[
          { id: 'crypto', label: 'Crypto' },
          { id: 'forex', label: 'Forex' },
          { id: 'stocks', label: 'Stocks' },
          { id: 'commodities', label: 'Commodities' },
          { id: 'indices', label: 'Indices' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`mobile-markets-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mobile-markets-content">
        
        {/* Indicators Toggle */}
        <button 
          className="mobile-indicators-toggle"
          onClick={() => setShowIndicators(!showIndicators)}
        >
          <Activity size={16} />
          {showIndicators ? 'Hide Market Overview' : 'Show Market Overview'}
          {showIndicators ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Indicators Panel */}
        {showIndicators && (
          <div className="mobile-indicators-panel">
            <div className="mobile-indicator-card">
              <div className="mobile-indicator-header">
                <Activity size={18} />
                {activeTab === 'crypto' ? 'Crypto Market' : 
                 activeTab === 'forex' ? 'Forex Market' :
                 activeTab === 'stocks' ? 'Stock Market' :
                 activeTab === 'commodities' ? 'Commodities' : 'Indices'}
              </div>
              
              {activeTab === 'crypto' && (
                <>
                  <div className="mobile-indicator-row">
                    <span className="mobile-indicator-label">Total Market Cap</span>
                    <span className="mobile-indicator-value">
                      ${(coins.reduce((acc, c) => acc + c.marketCap, 0) / 1e12).toFixed(2)}T
                    </span>
                  </div>
                  <div className="mobile-indicator-row">
                    <span className="mobile-indicator-label">BTC Dominance</span>
                    <span className="mobile-indicator-value" style={{ color: '#F7931A' }}>
                      {coins.length > 0 ? ((coins.find(c => c.symbol === 'BTC')?.marketCap || 0) / coins.reduce((acc, c) => acc + c.marketCap, 0) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  {fearGreedIndex && (
                    <div className="mobile-indicator-row" style={{ 
                      background: fearGreedIndex.value <= 25 ? 'rgba(239, 68, 68, 0.15)' : 
                                 fearGreedIndex.value <= 45 ? 'rgba(249, 115, 22, 0.15)' :
                                 fearGreedIndex.value <= 55 ? 'rgba(234, 179, 8, 0.15)' :
                                 fearGreedIndex.value <= 75 ? 'rgba(132, 204, 22, 0.15)' : 'rgba(34, 197, 94, 0.15)'
                    }}>
                      <span className="mobile-indicator-label">Fear & Greed</span>
                      <span className="mobile-indicator-value" style={{ 
                        color: fearGreedIndex.value <= 25 ? '#EF4444' : 
                               fearGreedIndex.value <= 45 ? '#F97316' :
                               fearGreedIndex.value <= 55 ? '#EAB308' :
                               fearGreedIndex.value <= 75 ? '#84CC16' : '#22C55E'
                      }}>
                        {fearGreedIndex.value} - {fearGreedIndex.classification}
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {activeTab !== 'crypto' && (
                <div className="mobile-indicator-row">
                  <span className="mobile-indicator-label">Assets Tracked</span>
                  <span className="mobile-indicator-value">
                    {activeTab === 'forex' ? forexPairs.length :
                     activeTab === 'stocks' ? stocks.length :
                     activeTab === 'commodities' ? commodities.length : indices.length}
                  </span>
                </div>
              )}
            </div>

            {/* Top Gainers */}
            <div className="mobile-indicator-card" style={{ background: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
              <div className="mobile-indicator-header" style={{ color: '#22C55E' }}>
                <TrendingUp size={16} />
                Top Gainers
              </div>
              {(activeTab === 'crypto' ? coins :
                activeTab === 'forex' ? forexPairs :
                activeTab === 'stocks' ? stocks :
                activeTab === 'commodities' ? commodities : indices)
                .sort((a, b) => b.change24h - a.change24h)
                .slice(0, 3)
                .map((item, idx) => (
                  <div key={`gainer-${idx}`} className="mobile-indicator-row">
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{item.symbol}</span>
                    <span style={{ color: '#22C55E', fontWeight: 700 }}>+{item.change24h.toFixed(2)}%</span>
                  </div>
                ))}
            </div>

            {/* Top Losers */}
            <div className="mobile-indicator-card" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div className="mobile-indicator-header" style={{ color: '#EF4444' }}>
                <TrendingDown size={16} />
                Top Losers
              </div>
              {(activeTab === 'crypto' ? coins :
                activeTab === 'forex' ? forexPairs :
                activeTab === 'stocks' ? stocks :
                activeTab === 'commodities' ? commodities : indices)
                .sort((a, b) => a.change24h - b.change24h)
                .slice(0, 3)
                .map((item, idx) => (
                  <div key={`loser-${idx}`} className="mobile-indicator-row">
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{item.symbol}</span>
                    <span style={{ color: '#EF4444', fontWeight: 700 }}>{item.change24h.toFixed(2)}%</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Search & Sort */}
        <div className="mobile-sort-container">
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mobile-search-input"
            />
          </div>
          <button 
            className="mobile-sort-button"
            onClick={() => setShowMobileSortDropdown(!showMobileSortDropdown)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersHorizontal size={16} />
              {getCurrentSortLabel()}
            </span>
            <ChevronDown 
              size={16} 
              style={{ 
                transform: showMobileSortDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} 
            />
          </button>
          {showMobileSortDropdown && (
            <div className="mobile-sort-dropdown">
              {sortOptions[activeTab].map((option) => (
                <button
                  key={option.value}
                  className={`mobile-sort-option ${`${sortBy}-${sortOrder}` === option.value ? 'active' : ''}`}
                  onClick={() => handleMobileSortSelect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Market Table */}
        <div className="mobile-table-container">
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Loading market data...
            </div>
          ) : sortedData.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No results found
            </div>
          ) : (
            sortedData.map((item: any, index: number) => (
              <div key={`${item.symbol}-${index}`} className="mobile-market-card">
                {/* Logo */}
                {'logo' in item && item.logo && (
                  <img 
                    src={item.logo} 
                    alt={item.symbol}
                    className="mobile-market-card-logo"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                {'baseLogo' in item && item.baseLogo && (
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <img src={item.baseLogo} alt="" style={{ width: '32px', height: '22px', borderRadius: '2px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <img src={item.quoteLogo} alt="" style={{ width: '32px', height: '22px', borderRadius: '2px', objectFit: 'cover', marginLeft: '-8px', border: '2px solid #0A0A0B' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
                {'flagImage' in item && item.flagImage && (
                  <img 
                    src={item.flagImage} 
                    alt={item.country}
                    style={{ width: '40px', height: '28px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                
                {/* Info */}
                <div className="mobile-market-card-info">
                  <div className="mobile-market-card-name">
                    {'name' in item ? (activeTab === 'crypto' || activeTab === 'commodities' ? item.name : item.symbol) : item.symbol}
                  </div>
                  <div className="mobile-market-card-symbol">
                    {activeTab === 'crypto' ? item.symbol : 
                     activeTab === 'commodities' ? item.category :
                     item.name}
                  </div>
                </div>
                
                {/* Price */}
                <div className="mobile-market-card-price-section">
                  <div className="mobile-market-card-price">
                    {activeTab === 'forex' 
                      ? item.price.toFixed(item.symbol.includes('JPY') ? 3 : 5)
                      : activeTab === 'indices'
                        ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : formatPrice(item.price)
                    }
                  </div>
                  <div className={`mobile-market-card-change ${item.change24h >= 0 ? 'positive' : 'negative'}`}>
                    {item.change24h >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {Math.abs(item.change24h).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
