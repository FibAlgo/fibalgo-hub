'use client';

import { Link } from '@/i18n/navigation';
import { ArrowRight, TrendingUp, Zap, Shield, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Hero() {
  const t = useTranslations('hero');
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        // Use responsive CSS units instead of JS breakpoint state to prevent
        // “big font then shrink” on mobile during hydration.
        paddingTop: 'clamp(3.5rem, 6vw, 4rem)',
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
          padding: '0 clamp(1rem, 3vw, 1.5rem)',
        }}
      >
        {/* Kategori — profesyonel stil */}
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(0,245,255,0.85)',
            margin: '0 0 0.75rem 0',
          }}
        >
          {t('badge')}
        </p>

        {/* Ana başlık */}
        <h1
          style={{
            fontSize: 'clamp(1.5rem, 6vw, 3.5rem)',
            fontWeight: 600,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            marginBottom: '0.75rem',
          }}
        >
          {t('title')}
        </h1>

        {/* Alt başlık — Hub + TradingView */}
        <h2
          style={{
            fontSize: 'clamp(0.9375rem, 2.2vw, 1rem)',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            maxWidth: '36rem',
            margin: '0 auto 2rem',
            fontWeight: 400,
          }}
        >
          {t('subtitle')}
        </h2>

        {/* Metrikler + CTA tek blok */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2rem',
            marginTop: '2.5rem',
          }}
        >
          {/* Metrikler — ince çizgili, sade */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'clamp(1rem, 3vw, 2rem)',
              flexWrap: 'wrap',
              padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 1.5rem)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {[
              { value: '10K+', label: t('stat1Label') },
              { value: '3x', label: t('stat2Label') },
              { value: '20+', label: t('stat3Label') },
            ].map((stat, i) => (
              <span key={stat.label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.5rem' }}>
                {i > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 'clamp(0.65rem, 1.2vw, 0.75rem)', marginRight: '0.25rem' }}>·</span>
                )}
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 'clamp(1rem, 2.5vw, 1.125rem)' }}>{stat.value}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(0.75rem, 2vw, 0.8125rem)', fontWeight: 500 }}>{stat.label}</span>
              </span>
            ))}
          </div>

          {/* CTA — Get Started + money back */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
            <Link
              href="/#pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)',
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #67E8F9 0%, #22D3EE 35%, #06B6D4 70%, #0891B2 100%)',
                color: '#000',
                fontWeight: 600,
                fontSize: 'clamp(0.9375rem, 2.2vw, 1rem)',
                textDecoration: 'none',
                transition: 'opacity 0.2s, transform 0.2s',
                boxShadow: '0 0 24px rgba(34,211,238,0.4), 0 0 48px rgba(6,182,212,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {t('ctaButton')}
              <ArrowRight size={20} strokeWidth={2.5} color="#000" />
            </Link>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
              {t('moneyBackGuarantee')}
            </span>
          </div>

          {/* Trust — yapay zeka, güvenlik odaklı */}
          <p
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              margin: 0,
              fontSize: '0.8125rem',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Zap size={14} style={{ flexShrink: 0 }} />
              {t('trustAi')}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Shield size={14} style={{ flexShrink: 0 }} />
              {t('trustSecurity')}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <TrendingUp size={14} style={{ flexShrink: 0 }} />
              {t('trustAlgo')}
            </span>
          </p>

          {/* Scroll — smooth scroll to next section */}
          <a
            href="#features"
            aria-label="Scroll down"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('features');
              if (!el) return;
              const targetTop = el.getBoundingClientRect().top + window.scrollY;
              const start = window.scrollY;
              const distance = targetTop - start;
              const duration = 700;
              let startTime: number | null = null;
              const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
              const step = (timestamp: number) => {
                if (startTime === null) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                window.scrollTo(0, start + distance * easeOutCubic(progress));
                if (progress < 1) requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '0.5rem',
              color: 'rgba(255,255,255,0.25)',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
          >
            <ChevronDown size={22} strokeWidth={2} />
          </a>
        </div>
      </div>
    </section>
  );
}
