import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FibAlgo – AI-Powered Trading Indicators & Signals';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #050508 0%, #0a0a1a 40%, #0d1117 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow effects */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-80px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,245,255,0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-60px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Logo area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #00F5FF, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 800,
              color: '#000',
            }}
          >
            F
          </div>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-1px',
            }}
          >
            FibAlgo
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: '42px',
            fontWeight: 700,
            color: '#FFFFFF',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.2,
            marginBottom: '16px',
            display: 'flex',
          }}
        >
          AI-Powered Trading Indicators
        </div>

        {/* Sub headline */}
        <div
          style={{
            fontSize: '24px',
            fontWeight: 400,
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.4,
            marginBottom: '32px',
            display: 'flex',
          }}
        >
          Precise buy/sell signals for Forex, Crypto & Stocks on TradingView
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: '48px',
            alignItems: 'center',
          }}
        >
          {[
            { value: '10K+', label: 'Traders' },
            { value: '20+', label: 'Indicators' },
            { value: '55%+', label: 'Accuracy' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '36px',
                  fontWeight: 800,
                  color: '#00F5FF',
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontSize: '16px',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '4px',
            background: 'linear-gradient(90deg, #00F5FF, #8B5CF6, #00F5FF)',
            display: 'flex',
          }}
        />

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '40px',
            fontSize: '18px',
            color: '#475569',
            display: 'flex',
          }}
        >
          fibalgo.com
        </div>
      </div>
    ),
    { ...size }
  );
}
