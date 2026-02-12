import { getTranslations } from 'next-intl/server';
import { Zap, Shield, TrendingUp } from 'lucide-react';
import HeroCta from './HeroCta';
import ScrollArrow from './ScrollArrow';

export default async function Hero() {
  const t = await getTranslations('hero');
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
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
        {/* Kategori */}
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

        {/* Ana baslik */}
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

        {/* Alt baslik */}
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

        {/* Metrikler + CTA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2rem',
            marginTop: '2.5rem',
          }}
        >
          {/* Metrikler */}
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

          {/* CTA */}
          <HeroCta label={t('ctaButton')} moneyBack={t('moneyBackGuarantee')} />

          {/* Trust */}
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

          {/* Scroll */}
          <ScrollArrow />
        </div>
      </div>
    </section>
  );
}