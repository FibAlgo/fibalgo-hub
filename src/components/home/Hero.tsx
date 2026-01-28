'use client';

import Link from 'next/link';
import { ArrowRight, Play, TrendingUp, Zap, Shield, ChevronDown } from 'lucide-react';

export default function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: '5rem',
        width: '100%',
      }}
    >
      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            marginBottom: '2rem',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              background: '#4ade80',
              borderRadius: '50%',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
            Trusted by 10,000+ Traders Worldwide
          </span>
        </div>

        {/* Main Heading */}
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
            fontWeight: 700,
            marginBottom: '1.5rem',
            lineHeight: 1.1,
          }}
        >
          <span style={{ color: '#FFFFFF' }}>Trade Smarter with</span>
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            AI-Powered Signals
          </span>
        </h1>

        {/* Subheading */}
        <p
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            color: 'rgba(255,255,255,0.6)',
            maxWidth: '42rem',
            margin: '0 auto 2rem',
            lineHeight: 1.6,
          }}
        >
          Transform your trading with institutional-grade algorithms. 
          Our AI analyzes millions of data points to deliver precise entry and exit signals.
        </p>

        {/* Stats Row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '3rem',
            marginBottom: '2.5rem',
          }}
        >
          {[
            { value: '98%', label: 'Accuracy Rate' },
            { value: '24/7', label: 'Market Analysis' },
            { value: '10K+', label: 'Active Users' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {stat.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: 'center',
          }}
        >
          <Link
            href="/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)',
              color: '#000',
              fontWeight: 600,
              padding: '1rem 2rem',
              borderRadius: '0.75rem',
              textDecoration: 'none',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
            }}
          >
            <span>Get Started</span>
            <ArrowRight style={{ width: '20px', height: '20px' }} />
          </Link>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              fontWeight: 600,
              padding: '1rem 2rem',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
            }}
          >
            <Play style={{ width: '20px', height: '20px' }} />
            <span>Watch Demo</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '2rem',
            marginTop: '4rem',
          }}
        >
          {[
            { icon: Shield, text: 'Secure & Encrypted' },
            { icon: TrendingUp, text: 'TradingView Partner' },
            { icon: Zap, text: 'Instant Signals' },
          ].map((badge) => (
            <div
              key={badge.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              <badge.icon style={{ width: '20px', height: '20px' }} />
              <span style={{ fontSize: '0.875rem' }}>{badge.text}</span>
            </div>
          ))}
        </div>

        {/* Scroll Indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <ChevronDown style={{ width: '24px', height: '24px', color: 'rgba(255,255,255,0.3)' }} />
        </div>
      </div>

      {/* Holographic Preview Card - Desktop Only */}
      <div
        style={{
          display: 'none',
          position: 'absolute',
          right: '2.5rem',
          top: '50%',
          transform: 'translateY(-50%) rotate(3deg)',
          width: '320px',
        }}
        className="lg:block"
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '1.5rem',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Card Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: '#0A0A0F', fontWeight: 700, fontSize: '0.875rem' }}>F</span>
              </div>
              <span style={{ fontWeight: 600, color: '#FFFFFF' }}>Live Signal</span>
            </div>
            <span
              style={{
                width: '12px',
                height: '12px',
                background: '#4ade80',
                borderRadius: '50%',
              }}
            />
          </div>
          
          {/* Signal Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Pair', value: 'BTC/USDT', color: '#FFFFFF' },
              { label: 'Signal', value: 'STRONG BUY', color: '#4ade80' },
              { label: 'Entry', value: '$67,420', color: '#FFFFFF' },
              { label: 'Target', value: '$72,500', color: '#00F5FF' },
              { label: 'Stop Loss', value: '$65,200', color: '#f87171' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{item.label}</span>
                <span style={{ color: item.color, fontFamily: 'monospace', fontWeight: item.label === 'Signal' ? 600 : 400 }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Confidence</span>
              <span style={{ color: '#00F5FF' }}>94%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: '94%',
                  background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                  borderRadius: '9999px',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
