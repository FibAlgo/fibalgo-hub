'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

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
      {/* Background Glows */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '1000px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(0,245,255,0.1) 0%, transparent 70%)',
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
          background: 'radial-gradient(circle, rgba(191,0,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '896px',
          margin: '0 auto',
          padding: '0 1.5rem',
          textAlign: 'center',
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
          <Sparkles style={{ width: '16px', height: '16px', color: '#FFD700' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Limited Time Offer</span>
        </div>

        {/* Heading */}
        <h2
          style={{
            fontSize: 'clamp(1.875rem, 5vw, 3rem)',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '1.5rem',
            lineHeight: 1.2,
          }}
        >
          Ready to Transform
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Your Trading?
          </span>
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '1.125rem',
            color: 'rgba(255,255,255,0.6)',
            maxWidth: '42rem',
            margin: '0 auto 2rem',
            lineHeight: 1.6,
          }}
        >
          Join thousands of traders who are already using FibAlgo to make smarter, 
          more profitable trades. Start your free trial today.
        </p>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '1.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {[
            { value: '50%', label: 'Average Win Rate Increase' },
            { value: '3x', label: 'ROI Improvement' },
            { value: '5min', label: 'Setup Time' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '1rem',
                padding: '1rem 1.5rem',
              }}
            >
              <div
                style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {stat.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{stat.label}</div>
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
            <span>Get Started Now</span>
            <ArrowRight style={{ width: '20px', height: '20px' }} />
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
              padding: '1rem 2rem',
              borderRadius: '0.75rem',
              textDecoration: 'none',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
            }}
          >
            <span>View Pricing</span>
          </Link>
        </div>

        {/* Trust Note */}
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', marginTop: '2rem' }}>
          Cancel anytime • 3-day money-back guarantee
        </p>
      </div>
    </section>
  );
}
