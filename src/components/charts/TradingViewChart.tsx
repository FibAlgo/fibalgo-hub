'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, X } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// 📈 TRADINGVIEW CHART EMBED
// Her haber için ilgili asset'in canlı chart'ını gösterir
// ═══════════════════════════════════════════════════════════════════════════════

interface TradingViewChartProps {
  symbol: string; // TradingView format: NASDAQ:AAPL, BINANCE:BTCUSDT
  height?: number;
  showToolbar?: boolean;
  theme?: 'dark' | 'light';
  interval?: string;
  autosize?: boolean;
}

export function TradingViewMiniChart({ 
  symbol, 
  height = 200,
  theme = 'dark',
  interval = 'D'
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Clean symbol for TradingView
  const cleanSymbol = symbol.replace(':', '%3A');
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous content
    containerRef.current.innerHTML = '';
    
    // Create TradingView widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      width: '100%',
      height: height,
      locale: 'en',
      dateRange: '1M',
      colorTheme: theme,
      isTransparent: true,
      autosize: false,
      largeChartUrl: `https://www.tradingview.com/chart/?symbol=${cleanSymbol}`
    });
    
    containerRef.current.appendChild(script);
    
    setTimeout(() => setIsLoaded(true), 1000);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, height, theme, cleanSymbol]);
  
  return (
    <div style={{ position: 'relative' }}>
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: `${height}px`,
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.3)'
        }}
      />
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)'
        }}>
          <div style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Loading chart...</div>
        </div>
      )}
    </div>
  );
}

export function TradingViewAdvancedChart({ 
  symbol, 
  height = 400,
  theme = 'dark',
  interval = 'D',
  showToolbar = true
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId] = useState(() => `tv_chart_${Math.random().toString(36).substr(2, 9)}`);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous content
    containerRef.current.innerHTML = '';
    
    // Create container div for the widget
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = `calc(100% - ${showToolbar ? 32 : 0}px)`;
    widgetDiv.style.width = '100%';
    
    widgetContainer.appendChild(widgetDiv);
    containerRef.current.appendChild(widgetContainer);
    
    // Create TradingView widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: !showToolbar,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      container_id: widgetId
    });
    
    widgetContainer.appendChild(script);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, height, theme, interval, showToolbar, widgetId]);
  
  return (
    <div 
      ref={containerRef}
      id={widgetId}
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'rgba(0,0,0,0.3)'
      }}
    />
  );
}

// Inline chart for news cards
export function TradingViewInlineChart({ symbol }: { symbol: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Extract clean ticker for display
  const displayTicker = symbol.includes(':') ? symbol.split(':')[1] : symbol;
  const cleanSymbol = symbol.replace(':', '%3A');
  
  return (
    <div style={{ marginTop: '0.75rem' }}>
      {/* Collapsed view - just a link */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(0,229,255,0.08)',
            border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: '6px',
            color: '#00E5FF',
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,229,255,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
          }}
        >
          <Maximize2 size={14} />
          <span>View {displayTicker} Chart</span>
        </button>
      )}
      
      {/* Expanded view - show chart */}
      {isExpanded && (
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.8rem' }}>{symbol}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <a
                href={`https://www.tradingview.com/chart/?symbol=${cleanSymbol}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: '#00E5FF',
                  fontSize: '0.7rem',
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={12} />
                <span>TradingView</span>
              </a>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#9CA3AF',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          
          {/* Chart */}
          <TradingViewMiniChart symbol={symbol} height={180} />
        </div>
      )}
    </div>
  );
}

// Multi-asset chart view
export function TradingViewMultiChart({ symbols }: { symbols: string[] }) {
  const [activeSymbol, setActiveSymbol] = useState(symbols[0] || '');
  
  if (symbols.length === 0) return null;
  
  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.1)',
      overflow: 'hidden'
    }}>
      {/* Symbol tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        padding: '4px',
        background: 'rgba(0,0,0,0.3)',
        overflowX: 'auto'
      }}>
        {symbols.slice(0, 5).map(symbol => {
          const ticker = symbol.includes(':') ? symbol.split(':')[1] : symbol;
          const isActive = symbol === activeSymbol;
          
          return (
            <button
              key={symbol}
              onClick={() => setActiveSymbol(symbol)}
              style={{
                padding: '0.35rem 0.6rem',
                background: isActive ? 'rgba(0,229,255,0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(0,229,255,0.3)' : '1px solid transparent',
                borderRadius: '4px',
                color: isActive ? '#00E5FF' : '#9CA3AF',
                fontSize: '0.7rem',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {ticker}
            </button>
          );
        })}
      </div>
      
      {/* Active chart */}
      {activeSymbol && (
        <TradingViewMiniChart symbol={activeSymbol} height={200} />
      )}
    </div>
  );
}

export default TradingViewMiniChart;
