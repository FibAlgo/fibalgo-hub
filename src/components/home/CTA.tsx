'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const GRADIENT = 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)';

export default function CTA() {
  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        padding: '6rem 0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '1000px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(191,0,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '960px',
          margin: '0 auto',
          padding: '0 1.5rem',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(0,245,255,0.9)',
            margin: '0 0 0.75rem 0',
          }}
        >
          Get Started
        </p>
        <h2
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            margin: '0 0 1rem 0',
          }}
        >
          Ready to Transform Your Trading?
        </h2>
        <p
          style={{
            fontSize: '1rem',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.65,
            maxWidth: '32rem',
            margin: '0 auto 2.5rem',
          }}
        >
          Join thousands of traders using FibAlgo for smarter, more profitable trades.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}
        >
          {[
            { value: '57%', label: 'Average Win Rate Increase' },
            { value: '3x', label: 'ROI Improvement' },
            { value: '5min', label: 'Setup Time' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '1rem',
                padding: '1.25rem 1.75rem',
                minWidth: '140px',
                transition: 'border-color 0.2s ease, background 0.2s ease',
              }}
            >
              <div
                style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  background: GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {stat.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

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
              background: 'linear-gradient(90deg, #67E8F9 0%, #22D3EE 35%, #06B6D4 70%, #0891B2 100%)',
              color: '#000',
              fontWeight: 600,
              padding: '1rem 2rem',
              borderRadius: '9999px',
              textDecoration: 'none',
              fontSize: '1rem',
              transition: 'all 0.25s ease',
              boxShadow: '0 0 24px rgba(34,211,238,0.4), 0 0 48px rgba(6,182,212,0.2)',
            }}
          >
            <span>Get Started Now</span>
            <ArrowRight style={{ width: '20px', height: '20px', color: '#000' }} />
          </Link>
          <Link
            href="#pricing"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              fontWeight: 600,
              padding: '0.875rem 1.75rem',
              borderRadius: '0.75rem',
              textDecoration: 'none',
              fontSize: '1rem',
              transition: 'all 0.25s ease',
            }}
          >
            <span>View Pricing</span>
          </Link>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '2rem' }}>
          Cancel anytime • 3-day money-back guarantee
        </p>
      </div>
    </section>
  );
}
