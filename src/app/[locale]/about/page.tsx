// ISR: revalidate about page every hour for edge caching (reduces TTFB)
export const revalidate = 3600;

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import { useTranslations } from 'next-intl';
import { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAlternates, getOgLocale, getLocalizedUrl } from '@/lib/seo';
import Breadcrumbs from '@/components/seo/Breadcrumbs';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('about');

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: getAlternates('/about', locale),
    openGraph: {
      title: t('metaOgTitle'),
      description: t('metaOgDescription'),
      url: getLocalizedUrl('/about', locale),
      type: 'website',
      locale: getOgLocale(locale),
      images: [{ url: 'https://fibalgo.com/opengraph-image', width: 1200, height: 630, alt: t('metaImageAlt') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaTwitterTitle'),
      description: t('metaTwitterDescription'),
    },
  };
}

export default function AboutPage() {
  const t = useTranslations('about');
  const tc = useTranslations('common');

  const stats = [
    { value: '20+', label: t('stat1Label') },
    { value: 'AI', label: t('stat2Label') },
    { value: 'Smart', label: t('stat3Label') },
    { value: '10K+', label: t('stat4Label') },
  ];

  const whyChoose = [
    {
      title: t('why1Title'),
      body: t('why1Body'),
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
    },
    {
      title: t('why2Title'),
      body: t('why2Body'),
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      ),
    },
    {
      title: t('why3Title'),
      body: t('why3Body'),
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      ),
    },
  ];

  const features = [
    { title: t('feat1Title'), desc: t('feat1Desc'), icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { title: t('feat2Title'), desc: t('feat2Desc'), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { title: t('feat3Title'), desc: t('feat3Desc'), icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { title: t('feat4Title'), desc: t('feat4Desc'), icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  ];
  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <AnimatedBackground />
      <Navbar />
      <Breadcrumbs items={[{ name: t('breadcrumb'), href: '/about' }]} />

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, paddingTop: '8rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '0 1rem', textAlign: 'center' }}>
          <p style={{ color: '#00F5FF', fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            {t('badge')}
          </p>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600, color: '#FFFFFF', marginBottom: '1.5rem', lineHeight: 1.2 }}>
            {t.rich('heroTitle', {
              brand: (chunks) => (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {chunks}
                </span>
              ),
            })}
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: '36rem', margin: '0 auto' }}>
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Our Story + Stats */}
      <section style={{ position: 'relative', zIndex: 1, padding: '4rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '1.5rem', lineHeight: 1.2 }}>
                {t('storyHeading')}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '1rem' }}>
                {t('storyP1')}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.75 }}>
                {t('storyP2')}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {stats.map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#00F5FF', marginBottom: '0.25rem' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Traders Choose Us */}
      <section style={{ position: 'relative', zIndex: 1, padding: '4rem 1rem', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '42rem', margin: '0 auto 3rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '1rem', lineHeight: 1.2 }}>
              {t('whyTitle')}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.75 }}>
              {t('whySubtitle')}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {whyChoose.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(5,5,8,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  padding: '1.5rem 2rem',
                }}
              >
                <div style={{ width: '3rem', height: '3rem', borderRadius: '0.5rem', background: 'rgba(0,245,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00F5FF', marginBottom: '1.25rem' }}>
                  <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.75rem' }}>{item.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.7 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes FibAlgo Different */}
      <section style={{ position: 'relative', zIndex: 1, padding: '4rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '0 1rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#FFFFFF', textAlign: 'center', marginBottom: '3rem', lineHeight: 1.2 }}>
            {t('differentTitle')}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem' }}>
            {features.map((f, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', color: '#00F5FF' }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.25rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '4rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '0 1rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '1rem', lineHeight: 1.2 }}>
            {t('ctaTitle')}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', marginBottom: '2rem' }}>
            {t('ctaSubtitle')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <Link
              href="/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#00F5FF',
                color: '#050508',
                fontWeight: 500,
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              {t('ctaPrimary')}
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/#pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                fontWeight: 500,
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
