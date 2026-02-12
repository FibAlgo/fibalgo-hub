'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { 
  ArrowUp,
  ArrowDown,
  Star,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Search,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import MobileResponsiveMarkets from './MobileResponsiveMarkets';
import { useTerminal } from '@/lib/context/TerminalContext';

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

export default function MarketsPage() {
  const t = useTranslations('markets');
  const { isPremium } = useTerminal();
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [forexPairs, setForexPairs] = useState<ForexData[]>([]);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [fearGreedIndex, setFearGreedIndex] = useState<{ value: number; classification: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices'>('crypto');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tableWidth, setTableWidth] = useState(55); // percentage
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [showIndicators, setShowIndicators] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for mobile viewport and cache result
  useEffect(() => {
    // First check cache for instant response
    const cached = sessionStorage.getItem('fibalgo_isMobile');
    if (cached !== null) {
      setIsMobile(cached === 'true');
    }
    
    // Then verify with real check and update cache
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      sessionStorage.setItem('fibalgo_isMobile', String(mobile));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limit between 30% and 70%
    if (newWidth >= 30 && newWidth <= 70) {
      setTableWidth(newWidth);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle sort click
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Fetch crypto data
  const fetchCryptoData = async () => {
    try {
      const response = await fetch('/api/markets');
      const data = await response.json();
      if (data.coins) setCoins(data.coins);
    } catch (error) {
      console.error('Error fetching crypto:', error);
    }
  };

  // Fetch Fear and Greed Index (Real API)
  const fetchFearGreedIndex = async () => {
    try {
      const response = await fetch('https://api.alternative.me/fng/?limit=1');
      const data = await response.json();
      if (data.data && data.data[0]) {
        setFearGreedIndex({
          value: parseInt(data.data[0].value),
          classification: data.data[0].value_classification
        });
      }
    } catch (error) {
      console.error('Error fetching Fear & Greed Index:', error);
    }
  };

  // Fetch forex data
  const fetchForexData = async () => {
    try {
      const response = await fetch('/api/forex');
      const data = await response.json();
      if (data.forex) setForexPairs(data.forex);
    } catch (error) {
      console.error('Error fetching forex:', error);
    }
  };

  // Fetch stocks data
  const fetchStocksData = async () => {
    try {
      const response = await fetch('/api/stocks');
      const data = await response.json();
      if (data.stocks) setStocks(data.stocks);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  // Fetch commodities data
  const fetchCommoditiesData = async () => {
    try {
      const response = await fetch('/api/commodities');
      const data = await response.json();
      if (data.commodities) setCommodities(data.commodities);
    } catch (error) {
      console.error('Error fetching commodities:', error);
    }
  };

  // Fetch indices data
  const fetchIndicesData = async () => {
    try {
      const response = await fetch('/api/indices');
      const data = await response.json();
      if (data.indices) setIndices(data.indices);
    } catch (error) {
      console.error('Error fetching indices:', error);
    }
  };

  // Fetch all market data
  const fetchMarketData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    await Promise.all([fetchCryptoData(), fetchForexData(), fetchStocksData(), fetchCommoditiesData(), fetchIndicesData(), fetchFearGreedIndex()]);
    if (showLoading) setIsLoading(false);
  };

  useEffect(() => {
    fetchMarketData(true); // Show loading on first load
    const interval = setInterval(() => fetchMarketData(false), 30000); // Silent refresh
    return () => clearInterval(interval);
  }, []);

  // Sort and filter coins
  const sortedCoins = [...coins]
    .filter(coin => 
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
      if (sortBy === 'price') return (a.price - b.price) * multiplier;
      if (sortBy === 'change24h') return (a.change24h - b.change24h) * multiplier;
      if (sortBy === 'volume24h') return (a.volume24h - b.volume24h) * multiplier;
      if (sortBy === 'marketCap') return (a.marketCap - b.marketCap) * multiplier;
      return 0;
    });

  // Sort and filter forex
  const sortedForex = [...forexPairs]
    .filter(pair => 
      pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
      if (sortBy === 'price') return (a.price - b.price) * multiplier;
      if (sortBy === 'change24h') return (a.change24h - b.change24h) * multiplier;
      return 0;
    });

  // Sort and filter stocks
  const sortedStocks = [...stocks]
    .filter(stock => 
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
      if (sortBy === 'price') return (a.price - b.price) * multiplier;
      if (sortBy === 'change24h') return (a.change24h - b.change24h) * multiplier;
      if (sortBy === 'volume24h') return (a.volume24h - b.volume24h) * multiplier;
      if (sortBy === 'high24h') return (a.high24h - b.high24h) * multiplier;
      return 0;
    });

  // Sort and filter commodities
  const sortedCommodities = [...commodities]
    .filter(commodity => 
      commodity.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commodity.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
      if (sortBy === 'price') return (a.price - b.price) * multiplier;
      if (sortBy === 'change24h') return (a.change24h - b.change24h) * multiplier;
      return 0;
    });

  // Sort and filter indices
  const sortedIndices = [...indices]
    .filter(index => 
      index.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      index.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * multiplier;
      if (sortBy === 'price') return (a.price - b.price) * multiplier;
      if (sortBy === 'change24h') return (a.change24h - b.change24h) * multiplier;
      if (sortBy === 'high24h') return (a.high24h - b.high24h) * multiplier;
      return 0;
    });

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    return `$${volume.toLocaleString()}`;
  };

  // Mobile: Use separate component
  if (isMobile === null) {
    // Still detecting viewport - show loading spinner
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A0B',
        zIndex: 9999
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#00F5FF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  if (isMobile) {
    return (
      <MobileResponsiveMarkets
        coins={coins}
        forexPairs={forexPairs}
        stocks={stocks}
        commodities={commodities}
        indices={indices}
        fearGreedIndex={fearGreedIndex}
        isLoading={isLoading}
        fetchMarketData={fetchMarketData}
      />
    );
  }

  // Desktop layout
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100%', 
      background: '#0A0A0B',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Desktop Styles */}
      <style jsx>{`
        .markets-content {
          flex: 1;
          padding: 1.5rem 2rem;
          overflow: auto;
        }
        .markets-header h1 {
          color: #fff;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }
        .markets-header p {
          color: rgba(255,255,255,0.5);
          margin: 0;
          font-size: 0.875rem;
        }
        .markets-tabs-container {
          display: flex;
          align-items: center;
          gap: 0;
          margin-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .markets-tabs {
          display: flex;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          order: 0;
        }
        .markets-tabs::-webkit-scrollbar {
          display: none;
        }
        .markets-tab {
          padding: 0.75rem 1.5rem;
          border: none;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .markets-tab.active {
          color: #00F5FF;
          border-bottom-color: #00F5FF;
        }
        .markets-search-area {
          margin-left: auto;
          display: flex;
          gap: 0.5rem;
          align-items: center;
          order: 1;
        }
        .markets-search-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 0.5rem 1rem 0.5rem 2.25rem;
          color: #fff;
          font-size: 0.875rem;
          width: 200px;
          outline: none;
        }
        .markets-main-layout {
          display: flex;
          align-items: flex-start;
          width: 100%;
        }
        .markets-table-container {
          flex-shrink: 0;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          overflow: hidden;
          max-height: calc(100vh - 220px);
          display: flex;
          flex-direction: column;
        }
        .markets-indicators-panel {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: calc(100vh - 220px);
          overflow: auto;
        }
        .markets-divider {
          width: 12px;
          cursor: col-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: stretch;
          flex-shrink: 0;
          position: relative;
        }
        
        /* Desktop defaults - table rows visible */
        .table-header-desktop {
          display: grid;
        }
        .table-row-desktop {
          display: grid;
        }
      `}</style>
      
      {/* Page Banner - News/Calendar tarzı */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,15,15,0.95) 0%, rgba(20,20,22,0.98) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '1.25rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
        <h1 style={{
          color: '#fff',
          fontSize: '1.25rem',
          fontWeight: 700,
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          {t('trackEveryMove')}
        </h1>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Content Area */}
        <div className="markets-content">

          {/* Tabs */}
          <div className="markets-tabs-container">
            {/* Search Area - Will be reordered on mobile */}
            <div className="markets-search-area">
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="markets-search-input"
                />
              </div>
              <button
                onClick={() => fetchMarketData(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={t('refresh')}
              >
                <RefreshCw size={16} color="rgba(255,255,255,0.5)" />
              </button>
            </div>
            
            {/* Tab Buttons */}
            <div className="markets-tabs">
              {[
                { id: 'crypto', label: t('crypto') },
                { id: 'forex', label: t('forex') },
                { id: 'stocks', label: t('stocks') },
                { id: 'commodities', label: t('commodities') },
                { id: 'indices', label: t('indices') }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`markets-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content - Table + Indicators with resizable divider */}
          <div ref={containerRef} className="markets-main-layout">
          
            {/* Market Table */}
            <div 
              className="markets-table-container"
              style={{ width: `${tableWidth}%` }}
            >
              {/* Table Header */}
              <div 
                className="table-header-desktop"
                style={{
                  display: 'grid',
                  gridTemplateColumns: activeTab === 'crypto' ? '40px 1.8fr 1fr 0.7fr 0.8fr 1fr' : '50px 2fr 1.5fr 1fr 1.5fr',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  flexShrink: 0
                }}
              >
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600 }}>#</div>
              <div 
                style={{ 
                  color: sortBy === 'name' ? '#fff' : 'rgba(255,255,255,0.5)', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  userSelect: 'none'
              }}
              onClick={() => handleSort('name')}
            >
              {activeTab === 'crypto' ? t('name') : activeTab === 'forex' ? t('pair') : activeTab === 'stocks' ? t('company') : activeTab === 'commodities' ? t('commodity') : t('index')}
              {sortBy === 'name' && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
            </div>
            <div 
              style={{ 
                color: sortBy === 'price' ? '#fff' : 'rgba(255,255,255,0.5)', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                textAlign: 'right', 
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => handleSort('price')}
            >
              {t('price')} {sortBy === 'price' && (sortOrder === 'desc' ? '↓' : '↑')}
            </div>
            <div 
              style={{ 
                color: sortBy === 'change24h' ? '#fff' : 'rgba(255,255,255,0.5)', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                textAlign: 'right', 
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => handleSort('change24h')}
            >
              {t('change24h')} {sortBy === 'change24h' && (sortOrder === 'desc' ? '↓' : '↑')}
            </div>
            <div 
              style={{ 
                color: sortBy === 'volume24h' ? '#fff' : 'rgba(255,255,255,0.5)', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                textAlign: 'right', 
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onClick={() => handleSort(activeTab === 'commodities' ? 'price' : 'volume24h')}
            >
              {activeTab === 'crypto' ? t('volume24h') : activeTab === 'forex' ? t('volume') : activeTab === 'commodities' ? t('unit') : t('high24h')}
              {(sortBy === 'volume24h' || (activeTab === 'commodities' && sortBy === 'price')) && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
            </div>
            {activeTab === 'crypto' && (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>{t('range24h')}</div>
            )}
          </div>

          {/* Table Body - Scrollable */}
          <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              {t('loadingMarketData')}
            </div>
          ) : activeTab === 'crypto' ? (
            sortedCoins.map((coin, index) => (
              <div key={`${coin.symbol}-${index}`}>
                <div
                  className="table-row-desktop"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1.8fr 1fr 0.7fr 0.8fr 1fr',
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Rank */}
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{index + 1}</div>
                
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img 
                    src={coin.logo} 
                    alt={coin.symbol}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>{coin.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{coin.symbol}</div>
                  </div>
                </div>

                {/* Price */}
                <div style={{ color: '#fff', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatPrice(coin.price)}
                </div>

                {/* 24h Change */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  gap: '0.25rem',
                  color: coin.change24h >= 0 ? '#22C55E' : '#EF4444',
                  fontWeight: 600
                }}>
                  {coin.change24h >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(coin.change24h).toFixed(2)}%
                </div>

                {/* Volume */}
                <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatVolume(coin.volume24h)}
                </div>

                {/* 24h Range */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', paddingLeft: '1rem' }}>
                  <div style={{ 
                    height: '3px', 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: '2px',
                    position: 'relative',
                    overflow: 'hidden',
                    width: '100%'
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: '0',
                      top: '0',
                      height: '100%',
                      width: `${((coin.price - coin.low24h) / (coin.high24h - coin.low24h)) * 100}%`,
                      background: coin.change24h >= 0 ? '#22C55E' : '#EF4444',
                      borderRadius: '2px'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', width: '100%' }}>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>{formatPrice(coin.low24h)}</span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>{formatPrice(coin.high24h)}</span>
                  </div>
                </div>
                </div>
              </div>
            ))
          ) : activeTab === 'forex' ? (
            /* Forex Table */
            sortedForex.map((pair, index) => (
              <div key={`${pair.symbol}-${index}`}>
                <div
                  className="table-row-desktop"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '50px 2fr 1.5fr 1fr 1.5fr',
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{index + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <img 
                      src={pair.baseLogo} 
                      alt="" 
                      style={{ width: '28px', height: '20px', borderRadius: '2px', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <img 
                      src={pair.quoteLogo} 
                      alt="" 
                      style={{ width: '28px', height: '20px', borderRadius: '2px', objectFit: 'cover', marginLeft: '-8px', border: '2px solid #0A0A0B' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>{pair.symbol}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{pair.name}</div>
                  </div>
                </div>
                <div style={{ color: '#fff', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                  {pair.price.toFixed(pair.symbol.includes('JPY') ? 3 : 5)}
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  gap: '0.25rem',
                  color: pair.change24h >= 0 ? '#22C55E' : '#EF4444',
                  fontWeight: 600
                }}>
                  {pair.change24h >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(pair.change24h).toFixed(2)}%
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatVolume(pair.volume24h)}
                </div>
                </div>
              </div>
            ))
          ) : activeTab === 'stocks' ? (
            /* Stocks Table */
            sortedStocks.map((stock, index) => (
              <div key={`${stock.symbol}-${index}`}>
                <div
                  className="table-row-desktop"
                  style={{
                    display: 'grid',
                  gridTemplateColumns: '50px 2fr 1.5fr 1fr 1.5fr',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  alignItems: 'center',
                  transition: 'background 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{index + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: '4px'
                  }}>
                    <img 
                      src={stock.logo} 
                      alt={stock.symbol}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>{stock.symbol}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{stock.name}</div>
                  </div>
                </div>
                <div style={{ color: '#fff', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                  ${stock.price.toFixed(2)}
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  gap: '0.25rem',
                  color: stock.change24h >= 0 ? '#22C55E' : '#EF4444',
                  fontWeight: 600
                }}>
                  {stock.change24h >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(stock.change24h).toFixed(2)}%
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'monospace' }}>
                  ${stock.high24h.toFixed(2)}
                </div>
                </div>
              </div>
            ))
          ) : activeTab === 'commodities' ? (
            /* Commodities Table */
            sortedCommodities.map((commodity, index) => (
              <div key={`${commodity.symbol}-${index}`}>
                <div
                  className="table-row-desktop"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '50px 2fr 1.5fr 1fr 1.5fr',
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{index + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img 
                    src={commodity.logo} 
                    alt={commodity.name}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>{commodity.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{commodity.category}</div>
                  </div>
                </div>
                <div style={{ color: '#fff', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                  ${commodity.price.toFixed(2)}
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  gap: '0.25rem',
                  color: commodity.change24h >= 0 ? '#22C55E' : '#EF4444',
                  fontWeight: 600
                }}>
                  {commodity.change24h >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(commodity.change24h).toFixed(2)}%
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
                  {t('per')} {commodity.unit}
                </div>
                </div>
              </div>
            ))
          ) : (
            /* Indices Table */
            sortedIndices.map((indexItem, index) => (
              <div key={`${indexItem.symbol}-${index}`}>
                <div
                  className="table-row-desktop"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '50px 2fr 1.5fr 1fr 1.5fr',
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    alignItems: 'center',
                  transition: 'background 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{index + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img 
                    src={indexItem.flagImage} 
                    alt={indexItem.country}
                    style={{ width: '32px', height: '22px', borderRadius: '2px', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>{indexItem.symbol}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{indexItem.name}</div>
                  </div>
                </div>
                <div style={{ color: '#fff', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                  {indexItem.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  gap: '0.25rem',
                  color: indexItem.change24h >= 0 ? '#22C55E' : '#EF4444',
                  fontWeight: 600
                }}>
                  {indexItem.change24h >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(indexItem.change24h).toFixed(2)}%
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'monospace' }}>
                  {indexItem.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                </div>
              </div>
            ))
          )}
            </div>
          </div>

          {/* Resizable Divider - Desktop Only */}
          <div 
            className="markets-divider"
            onMouseDown={handleMouseDown}
          >
            <div style={{
              width: '4px',
              height: '40px',
              background: isDragging ? 'rgba(0, 245, 255, 0.5)' : 'rgba(255,255,255,0.2)',
              borderRadius: '4px',
              transition: isDragging ? 'none' : 'background 0.2s'
            }} />
          </div>

          {/* Indicators Panel */}
          <div 
            className="markets-indicators-panel"
            style={{ 
              width: `${100 - tableWidth - 1}%`,
              display: 'flex',
              minWidth: '320px',
              position: 'relative'
            }}
          >
            {/* Lock overlay for basic users */}
            {!isPremium && (
              <Link
                href="/#pricing"
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: '12px',
                  color: 'rgba(255,255,255,0.95)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Lock size={28} strokeWidth={2} />
                <span>{t('upgradeToView')}</span>
              </Link>
            )}
            <div style={!isPremium ? { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' } : { width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Market Overview Card */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '1.25rem',
              overflow: 'visible',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '1rem',
                color: '#00F5FF',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                <Activity size={18} />
                {activeTab === 'crypto' ? t('cryptoOverview') : 
                 activeTab === 'forex' ? t('forexOverview') :
                 activeTab === 'stocks' ? t('stockOverview') :
                 activeTab === 'commodities' ? t('commoditiesOverview') : t('indicesOverview')}
              </div>
              
              {/* Tab-specific stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeTab === 'crypto' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('totalMarketCap')}</span>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        ${(coins.reduce((acc, c) => acc + c.marketCap, 0) / 1e12).toFixed(2)}T
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('vol24h')}</span>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        ${(coins.reduce((acc, c) => acc + c.volume24h, 0) / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('btcDominance')}</span>
                      <span style={{ color: '#F7931A', fontWeight: 600, fontSize: '0.9rem' }}>
                        {coins.length > 0 ? ((coins.find(c => c.symbol === 'BTC')?.marketCap || 0) / coins.reduce((acc, c) => acc + c.marketCap, 0) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('ethDominance')}</span>
                      <span style={{ color: '#627EEA', fontWeight: 600, fontSize: '0.9rem' }}>
                        {coins.length > 0 ? ((coins.find(c => c.symbol === 'ETH')?.marketCap || 0) / coins.reduce((acc, c) => acc + c.marketCap, 0) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    {fearGreedIndex && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.75rem', 
                        background: fearGreedIndex.value <= 25 ? 'rgba(239, 68, 68, 0.15)' : 
                                   fearGreedIndex.value <= 45 ? 'rgba(249, 115, 22, 0.15)' :
                                   fearGreedIndex.value <= 55 ? 'rgba(234, 179, 8, 0.15)' :
                                   fearGreedIndex.value <= 75 ? 'rgba(132, 204, 22, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        borderRadius: '8px',
                        border: `1px solid ${fearGreedIndex.value <= 25 ? 'rgba(239, 68, 68, 0.3)' : 
                                            fearGreedIndex.value <= 45 ? 'rgba(249, 115, 22, 0.3)' :
                                            fearGreedIndex.value <= 55 ? 'rgba(234, 179, 8, 0.3)' :
                                            fearGreedIndex.value <= 75 ? 'rgba(132, 204, 22, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{t('fearGreedIndex')}</span>
                          <span style={{ 
                            color: fearGreedIndex.value <= 25 ? '#EF4444' : 
                                   fearGreedIndex.value <= 45 ? '#F97316' :
                                   fearGreedIndex.value <= 55 ? '#EAB308' :
                                   fearGreedIndex.value <= 75 ? '#84CC16' : '#22C55E',
                            fontSize: '0.7rem',
                            textTransform: 'capitalize'
                          }}>
                            {fearGreedIndex.classification}
                          </span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: fearGreedIndex.value <= 25 ? 'rgba(239, 68, 68, 0.2)' : 
                                      fearGreedIndex.value <= 45 ? 'rgba(249, 115, 22, 0.2)' :
                                      fearGreedIndex.value <= 55 ? 'rgba(234, 179, 8, 0.2)' :
                                      fearGreedIndex.value <= 75 ? 'rgba(132, 204, 22, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: fearGreedIndex.value <= 25 ? '#EF4444' : 
                                 fearGreedIndex.value <= 45 ? '#F97316' :
                                 fearGreedIndex.value <= 55 ? '#EAB308' :
                                 fearGreedIndex.value <= 75 ? '#84CC16' : '#22C55E',
                          fontWeight: 700,
                          fontSize: '1.1rem'
                        }}>
                          {fearGreedIndex.value}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {activeTab === 'forex' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>EUR/USD</span>
                      <span style={{ color: forexPairs.find(f => f.symbol === 'EUR/USD')?.change24h || 0 >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: '0.9rem' }}>
                        {forexPairs.find(f => f.symbol === 'EUR/USD')?.price.toFixed(4) || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>GBP/USD</span>
                      <span style={{ color: forexPairs.find(f => f.symbol === 'GBP/USD')?.change24h || 0 >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: '0.9rem' }}>
                        {forexPairs.find(f => f.symbol === 'GBP/USD')?.price.toFixed(4) || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>USD/JPY</span>
                      <span style={{ color: forexPairs.find(f => f.symbol === 'USD/JPY')?.change24h || 0 >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: '0.9rem' }}>
                        {forexPairs.find(f => f.symbol === 'USD/JPY')?.price.toFixed(2) || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('pairsTracked')}</span>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{forexPairs.length}</span>
                    </div>
                  </>
                )}
                
                {activeTab === 'stocks' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('totalMarketCap')}</span>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        ${(stocks.reduce((acc, s) => acc + s.marketCap, 0) / 1e12).toFixed(2)}T
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('vol24h')}</span>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        ${(stocks.reduce((acc, s) => acc + s.volume24h, 0) / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('stocksTracked')}</span>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{stocks.length}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('avgChange')}</span>
                      <span style={{ color: stocks.reduce((acc, s) => acc + s.change24h, 0) / stocks.length >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: '0.9rem' }}>
                        {stocks.length > 0 ? (stocks.reduce((acc, s) => acc + s.change24h, 0) / stocks.length).toFixed(2) : 0}%
                      </span>
                    </div>
                  </>
                )}
                
                {activeTab === 'commodities' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('goldXau')}</span>
                      <span style={{ color: '#FFD700', fontWeight: 600, fontSize: '0.9rem' }}>
                        ${commodities.find(c => c.symbol === 'XAUUSD')?.price.toFixed(2) || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('silverXag')}</span>
                      <span style={{ color: '#C0C0C0', fontWeight: 600, fontSize: '0.9rem' }}>
                        ${commodities.find(c => c.symbol === 'XAGUSD')?.price.toFixed(2) || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('crudeOilWti')}</span>
                      <span style={{ color: '#8B4513', fontWeight: 600, fontSize: '0.9rem' }}>
                        ${commodities.find(c => c.symbol === 'USOIL')?.price.toFixed(2) || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('commoditiesTracked')}</span>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{commodities.length}</span>
                    </div>
                  </>
                )}
                
                {activeTab === 'indices' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>S&P 500</span>
                      <span style={{ color: indices.find(i => i.symbol === 'SPX')?.change24h || 0 >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: '0.9rem' }}>
                        {indices.find(i => i.symbol === 'SPX')?.price.toLocaleString() || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>NASDAQ</span>
                      <span style={{ color: indices.find(i => i.symbol === 'IXIC')?.change24h || 0 >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: '0.9rem' }}>
                        {indices.find(i => i.symbol === 'IXIC')?.price.toLocaleString() || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Dow Jones</span>
                      <span style={{ color: indices.find(i => i.symbol === 'DJI')?.change24h || 0 >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: '0.9rem' }}>
                        {indices.find(i => i.symbol === 'DJI')?.price.toLocaleString() || '-'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t('indicesTracked')}</span>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{indices.length}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Top Gainers */}
            <div style={{
              background: 'rgba(34, 197, 94, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              padding: '1rem',
              overflow: 'hidden'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '0.75rem',
                color: '#22C55E',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}>
                <TrendingUp size={16} />
                {t('topGainers')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(activeTab === 'crypto' ? coins :
                  activeTab === 'forex' ? forexPairs :
                  activeTab === 'stocks' ? stocks :
                  activeTab === 'commodities' ? commodities : indices)
                  .sort((a, b) => b.change24h - a.change24h)
                  .slice(0, 4)
                  .map((item, idx) => (
                    <div key={`gainer-${idx}`} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {'logo' in item && item.logo && (
                          <img src={item.logo} alt={item.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                        )}
                        {'baseLogo' in item && item.baseLogo && (
                          <img src={item.baseLogo} alt={item.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                        )}
                        {'flagImage' in item && item.flagImage && (
                          <img src={item.flagImage} alt={item.symbol} style={{ width: 24, height: 24, borderRadius: '4px' }} />
                        )}
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.8rem' }}>{item.symbol}</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{item.name}</div>
                        </div>
                      </div>
                      <div style={{ 
                        color: '#22C55E', 
                        fontWeight: 700, 
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        <ArrowUp size={12} />
                        +{item.change24h.toFixed(2)}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top Losers */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '1rem',
              overflow: 'hidden'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '0.75rem',
                color: '#EF4444',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}>
                <TrendingDown size={16} />
                {t('topLosers')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(activeTab === 'crypto' ? coins :
                  activeTab === 'forex' ? forexPairs :
                  activeTab === 'stocks' ? stocks :
                  activeTab === 'commodities' ? commodities : indices)
                  .sort((a, b) => a.change24h - b.change24h)
                  .slice(0, 4)
                  .map((item, idx) => (
                    <div key={`loser-${idx}`} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {'logo' in item && item.logo && (
                          <img src={item.logo} alt={item.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                        )}
                        {'baseLogo' in item && item.baseLogo && (
                          <img src={item.baseLogo} alt={item.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                        )}
                        {'flagImage' in item && item.flagImage && (
                          <img src={item.flagImage} alt={item.symbol} style={{ width: 24, height: 24, borderRadius: '4px' }} />
                        )}
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.8rem' }}>{item.symbol}</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{item.name}</div>
                        </div>
                      </div>
                      <div style={{ 
                        color: '#EF4444', 
                        fontWeight: 700, 
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        <ArrowDown size={12} />
                        {item.change24h.toFixed(2)}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
