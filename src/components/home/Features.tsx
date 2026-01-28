'use client';

import { TrendingUp, Zap, Target, BarChart3, Shield, Clock, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: TrendingUp,
    title: 'Smart Trading™',
    description: 'Advanced AI algorithms analyze market patterns to provide accurate buy/sell signals in real-time.',
    color: '#00F5FF',
  },
  {
    icon: Target,
    title: 'Perfect Entry Zone™',
    description: 'Identify optimal entry points with precision. Our AI calculates the best zones for maximum profit.',
    color: '#BF00FF',
  },
  {
    icon: Zap,
    title: 'Scalp Robot™',
    description: 'Lightning-fast scalping signals for day traders. Catch every micro-movement in the market.',
    color: '#FF00FF',
  },
  {
    icon: BarChart3,
    title: 'Oscillator Matrix™',
    description: 'Multi-timeframe oscillator analysis combining RSI, MACD, and proprietary indicators.',
    color: '#00FF88',
  },
  {
    icon: Shield,
    title: 'Risk Management',
    description: 'Built-in stop-loss and take-profit calculations to protect your capital.',
    color: '#FFB800',
  },
  {
    icon: Clock,
    title: '24/7 Monitoring',
    description: 'Never miss a trading opportunity. Our AI works around the clock analyzing markets.',
    color: '#00F5FF',
  },
];

export default function Features() {
  return (
    <section
      id="features"
      style={{
        position: 'relative',
        width: '100%',
        padding: '6rem 0',
        overflow: 'hidden',
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              marginBottom: '1.5rem',
            }}
          >
            <Zap style={{ width: '16px', height: '16px', color: '#00F5FF' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Powerful Features</span>
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.875rem, 5vw, 3rem)',
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: '1rem',
              lineHeight: 1.2,
            }}
          >
            Everything You Need to
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Trade Like a Pro
            </span>
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              maxWidth: '42rem',
              margin: '0 auto',
              fontSize: '1rem',
            }}
          >
            Our suite of AI-powered tools gives you the edge in any market condition.
            From scalping to swing trading, we've got you covered.
          </p>
        </div>

        {/* Features Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            width: '100%',
          }}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '1rem',
                padding: '2rem',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,245,255,0.3)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '1rem',
                  background: `linear-gradient(135deg, ${feature.color}, ${feature.color}88)`,
                  padding: '1px',
                  marginBottom: '1.5rem',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#0A0A0F',
                    borderRadius: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <feature.icon style={{ width: '24px', height: '24px', color: feature.color }} />
                </div>
              </div>

              {/* Content */}
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  marginBottom: '0.75rem',
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  marginBottom: '1rem',
                }}
              >
                {feature.description}
              </p>

              {/* Link */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#00F5FF',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                <span>Learn more</span>
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
            Ready to elevate your trading?
          </p>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
              color: '#000',
              fontWeight: 600,
              padding: '1rem 2rem',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0,245,255,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span>Explore All Features</span>
            <ArrowRight style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
      </div>
    </section>
  );
}