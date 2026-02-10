'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ChartContent() {
  const [isMounted, setIsMounted] = useState(false);
  const searchParams = useSearchParams();
  const symbolParam = searchParams.get('symbol');
  
  // Get symbol from URL or default to BTCUSDT
  const symbol = symbolParam || 'BINANCE:BTCUSDT';
  // Add .P suffix for perpetual if it's a Binance crypto pair
  const chartSymbol = symbol.startsWith('BINANCE:') && !symbol.endsWith('.P') 
    ? `${symbol}.P` 
    : symbol;

  useEffect(() => {
    setIsMounted(true);
    // Only prevent scroll on the chart page wrapper, NOT on html/body
    // html/body overflow locking breaks scroll on other pages via SPA navigation
    return () => {};
  }, []);

  if (!isMounted) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#0A0A0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.5)',
      }}>
        Loading chart...
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .chart-container {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          background: #0A0A0B;
          margin: 0;
          padding: 0;
          touch-action: none;
          overscroll-behavior: none;
          overflow: hidden;
          z-index: 100;
          -webkit-user-select: none;
          user-select: none;
        }
        .chart-iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
          touch-action: none;
        }
        .desktop-message {
          display: none;
        }
        @media (min-width: 769px) {
          .chart-container {
            display: none;
          }
          .desktop-message {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            text-align: center;
            padding: 2rem;
          }
          .desktop-message h2 {
            color: #fff;
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }
          .desktop-message p {
            color: rgba(255,255,255,0.5);
            font-size: 1rem;
          }
        }
      `}</style>
      {/* Desktop Message */}
      <div className="desktop-message">
        <h2>📱 Mobile Only Feature</h2>
        <p>The Chart feature is designed for mobile devices.<br/>Please use the desktop TradingView integration instead.</p>
      </div>

      {/* Mobile TradingView Chart */}
      <div className="chart-container">
        <iframe
          className="chart-iframe"
          src={`https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(chartSymbol)}&interval=1&theme=dark&style=1&locale=en&toolbar_bg=%23000000&enable_publishing=true&hide_side_toolbar=false&allow_symbol_change=true&save_image=true&hideideas=true`}
          allowFullScreen
        />
      </div>
    </>
  );
}

export default function ChartPage() {
  return (
    <Suspense fallback={
      <div style={{
        width: '100%',
        height: '100%',
        background: '#0A0A0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        Loading chart...
      </div>
    }>
      <ChartContent />
    </Suspense>
  );
}

