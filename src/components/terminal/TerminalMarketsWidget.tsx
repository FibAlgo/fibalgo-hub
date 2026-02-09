'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { assetToTradingViewSymbol } from '@/lib/utils/tradingview';

type TabId = 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices';

interface CoinRow {
  symbol: string;
  name: string;
  logo: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h?: number;
  low24h?: number;
}

interface ForexRow {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h?: number;
  baseLogo?: string;
  quoteLogo?: string;
}

interface StockRow {
  symbol: string;
  name: string;
  logo: string;
  price: number;
  change24h: number;
  volume24h?: number;
}

interface CommodityRow {
  symbol: string;
  name: string;
  unit: string;
  price: number;
  change24h: number;
}

interface IndexRow {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  country?: string;
  flagImage?: string;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'forex', label: 'Forex' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'indices', label: 'Indices' },
];

const TOP_N = 5;

// İndeks ülke kodu -> bayrak resmi (API'de gelmezse yedek)
const INDEX_FLAG_IMAGES: Record<string, string> = {
  US: 'https://flagcdn.com/w40/us.png',
  GB: 'https://flagcdn.com/w40/gb.png',
  DE: 'https://flagcdn.com/w40/de.png',
  FR: 'https://flagcdn.com/w40/fr.png',
  JP: 'https://flagcdn.com/w40/jp.png',
  HK: 'https://flagcdn.com/w40/hk.png',
  CN: 'https://flagcdn.com/w40/cn.png',
  KR: 'https://flagcdn.com/w40/kr.png',
  AU: 'https://flagcdn.com/w40/au.png',
  BR: 'https://flagcdn.com/w40/br.png',
  CA: 'https://flagcdn.com/w40/ca.png',
  TR: 'https://flagcdn.com/w40/tr.png',
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

interface TerminalMarketsWidgetProps {
  onSymbolClick?: (tvSymbol: string) => void;
}

export function TerminalMarketsWidget({ onSymbolClick }: TerminalMarketsWidgetProps) {
  const [activeTab, setActiveTab] = useState<TabId>('forex');
  const [coins, setCoins] = useState<CoinRow[]>([]);
  const [forex, setForex] = useState<ForexRow[]>([]);
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [commodities, setCommodities] = useState<CommodityRow[]>([]);
  const [indices, setIndices] = useState<IndexRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [marketsRes, forexRes, stocksRes, commoditiesRes, indicesRes] = await Promise.all([
        fetch('/api/markets'),
        fetch('/api/forex'),
        fetch('/api/stocks'),
        fetch('/api/commodities'),
        fetch('/api/indices'),
      ]);
      const [marketsData, forexData, stocksData, commoditiesData, indicesData] = await Promise.all([
        marketsRes.json(),
        forexRes.json(),
        stocksRes.json(),
        commoditiesRes.json(),
        indicesRes.json(),
      ]);
      if (marketsData.coins) setCoins(marketsData.coins);
      if (forexData.forex) setForex(forexData.forex);
      if (stocksData.stocks) setStocks(stocksData.stocks);
      if (commoditiesData.commodities) setCommodities(commoditiesData.commodities);
      if (indicesData.indices) setIndices(indicesData.indices);
    } catch (e) {
      console.error('TerminalMarketsWidget fetch error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 60000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const handleRowClick = useCallback(
    (symbol: string) => {
      const tv = assetToTradingViewSymbol(symbol, activeTab);
      if (tv && onSymbolClick) onSymbolClick(tv);
    },
    [onSymbolClick, activeTab]
  );

  const listByTab = useMemo(() => {
    const list = activeTab === 'crypto' ? coins : activeTab === 'forex' ? forex : activeTab === 'stocks' ? stocks : activeTab === 'commodities' ? commodities : indices;
    return (list as { symbol: string; name: string; change24h: number; price?: number; logo?: string; baseLogo?: string; quoteLogo?: string; flagImage?: string; country?: string }[]).slice();
  }, [activeTab, coins, forex, stocks, commodities, indices]);

  const { gainers, losers, active } = useMemo(() => {
    const sortedDesc = [...listByTab].sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0));
    const gainers = sortedDesc.filter((x) => (x.change24h ?? 0) >= 0).slice(0, TOP_N);
    const losers = [...listByTab].filter((x) => (x.change24h ?? 0) < 0).sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0)).slice(0, TOP_N);
    const active = [...listByTab].sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0)).slice(0, TOP_N);
    return { gainers, losers, active };
  }, [listByTab]);

  const renderRow = (
    item: { symbol: string; name: string; change24h: number; price?: number; logo?: string; baseLogo?: string; quoteLogo?: string; flagImage?: string; country?: string },
    type: 'gainers' | 'losers' | 'active',
    key: string
  ) => {
    const ch = item.change24h ?? 0;
    const isPositive = ch >= 0;
    const pctColor = type === 'gainers' ? '#22C55E' : type === 'losers' ? '#EF4444' : isPositive ? '#22C55E' : '#F59E0B';
    const isForex = 'baseLogo' in item && (item.baseLogo || item.quoteLogo);
    const isIndices = activeTab === 'indices';
    const indexFlagUrl = isIndices && (item.flagImage || (item.country && INDEX_FLAG_IMAGES[item.country]));
    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        onClick={() => handleRowClick(item.symbol)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(item.symbol); } }}
        style={{
          padding: '6px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          cursor: onSymbolClick ? 'pointer' : 'default',
          fontSize: '0.7rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          {isForex ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              {item.baseLogo && <img src={item.baseLogo} alt={`${item.symbol.slice(0, 3)} flag`} style={{ width: '18px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
              {item.quoteLogo && <img src={item.quoteLogo} alt={`${item.symbol.slice(3)} flag`} style={{ width: '18px', height: '12px', objectFit: 'cover', borderRadius: '2px' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            </div>
          ) : indexFlagUrl ? (
            <img src={indexFlagUrl} alt={`${item.symbol} flag`} style={{ width: '18px', height: '12px', objectFit: 'cover', borderRadius: '2px', flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : 'logo' in item && item.logo ? (
            <img src={item.logo} alt={`${item.symbol} logo`} style={{ width: '18px', height: '18px', borderRadius: activeTab === 'crypto' ? '50%' : '4px', flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : null}
          <span style={{ color: '#fff', fontWeight: 700, flexShrink: 0 }}>{item.symbol}</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
          {item.name && item.name !== item.symbol ? item.name : item.symbol}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {item.price != null && <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.7rem' }}>{formatPrice(item.price)}</span>}
          <span style={{ color: pctColor, fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
            {isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {isPositive ? '+' : '-'}{Math.abs(ch).toFixed(2)}%
          </span>
        </div>
      </div>
    );
  };

  const panelBase = (title: string, icon: React.ReactNode, borderColor: string, items: typeof listByTab, type: 'gainers' | 'losers' | 'active') => (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '6px',
        borderLeft: `3px solid ${borderColor}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, color: '#fff', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {icon}
        {title}
      </div>
      <div className="terminal-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {items.length === 0 ? (
          <div style={{ padding: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>—</div>
        ) : (
          items.map((item, i) => renderRow(item, type, `${type}-${item.symbol}-${i}`))
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Tab bar — Crypto, Forex, Stocks, Commodities, Indices */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 0 8px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === tab.id ? 'rgba(0,245,255,0.15)' : 'transparent',
              color: activeTab === tab.id ? 'rgba(0,245,255,0.95)' : 'rgba(255,255,255,0.5)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content — 3 küçük tablo: GAINERS | LOSERS | ACTIVE (örnek fotoğraf gibi) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '8px', padding: '4px 0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
            Loading...
          </div>
        ) : (
          <>
            {panelBase('Gainers', <TrendingUp size={14} color="#22C55E" />, '#22C55E', gainers, 'gainers')}
            {panelBase('Losers', <TrendingDown size={14} color="#EF4444" />, '#EF4444', losers, 'losers')}
            {panelBase('Active', <Activity size={14} color="#00F5FF" />, '#00F5FF', active, 'active')}
          </>
        )}
      </div>
    </div>
  );
}
