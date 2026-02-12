import { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAlternates, getOgLocale, getLocalizedUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';
import Breadcrumbs from '@/components/seo/Breadcrumbs';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('community');

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: getAlternates('/community', locale),
    openGraph: {
      type: 'website',
      title: t('metaOgTitle'),
      description: t('metaOgDescription'),
      url: getLocalizedUrl('/community', locale),
      locale: getOgLocale(locale),
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function CommunityPage() {
  const t = useTranslations('community');
  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <AnimatedBackground />
      <Navbar />
      <Breadcrumbs items={[{ name: t('breadcrumb'), href: '/community' }]} />

      <section style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 80px)',
        padding: '4rem 1.25rem',
        textAlign: 'center',
      }}>
        {/* Glow circle */}
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,245,255,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }} />

        {/* Animated icon */}
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(139,92,246,0.1))',
          border: '1px solid rgba(0,245,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          marginBottom: '2rem',
          animation: 'pulse-glow 3s ease-in-out infinite',
        }}>
          🚀
        </div>

        {/* Badge */}
        <span style={{
          display: 'inline-block',
          padding: '0.4rem 1rem',
          borderRadius: '9999px',
          background: 'rgba(0,245,255,0.08)',
          border: '1px solid rgba(0,245,255,0.2)',
          color: '#00F5FF',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: '1.5rem',
        }}>
          {t('badge')}
        </span>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 800,
          color: '#FFFFFF',
          lineHeight: 1.15,
          marginBottom: '1rem',
          letterSpacing: '-0.03em',
          maxWidth: '600px',
        }}>
          {t('title')}
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #00F5FF, #8B5CF6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {t('titleGradient')}
          </span>
        </h1>

        {/* Description */}
        <p style={{
          fontSize: '1.1rem',
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.7,
          maxWidth: '480px',
          marginBottom: '2.5rem',
        }}>
          {t('subtitle')}
        </p>

        {/* Feature pills */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '3rem',
          maxWidth: '500px',
        }}>
          {[t('feat1'), t('feat2'), t('feat3'), t('feat4')].map((feature) => (
            <span key={feature} style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}>
              {feature}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/#pricing"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.85rem 2rem',
              background: 'linear-gradient(135deg, #00F5FF, #00C4CC)',
              color: '#000',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 0 25px rgba(0,245,255,0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            {t('ctaPrimary')}
          </Link>
          <Link
            href="/education"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.85rem 2rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s',
            }}
          >
            {t('ctaSecondary')}
          </Link>
        </div>
      </section>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0,245,255,0.1); transform: scale(1); }
          50% { box-shadow: 0 0 40px rgba(0,245,255,0.2); transform: scale(1.05); }
        }
      `}</style>

      <Footer />
    </main>
  );
}
