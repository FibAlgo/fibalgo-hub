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
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyTouchAction = document.body.style.touchAction;
    const prevHtmlTouchAction = document.documentElement.style.touchAction;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.touchAction = prevBodyTouchAction;
      document.documentElement.style.touchAction = prevHtmlTouchAction;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
    };
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
          width: 100%;
          height: 100%;
          background: #0A0A0B;
          margin: 0;
          padding: 0;
          touch-action: none;
          overscroll-behavior: none;
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

