import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import { getTranslations } from 'next-intl/server';

export default async function TermsOfServicePage() {
  const t = await getTranslations('termsOfService');
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', color: '#FFFFFF' }}>
      <AnimatedBackground />
      <Navbar />
      <Breadcrumbs items={[{ name: t('breadcrumb'), href: '/terms-of-service' }]} />

      {/* Content */}
      <main style={{ 
        paddingTop: '120px', 
        paddingBottom: '80px',
        paddingLeft: '2rem',
        paddingRight: '2rem',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 700, 
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #00F5FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {t('title')}
          </h1>

          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '16px', 
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Section title={t('sections.overview.title')}>
              <p>{t('sections.overview.body1')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.overview.body2')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.overview.body3')}</p>
            </Section>

            <Section title={t('sections.onlineStore.title')}>
              <p>{t('sections.onlineStore.body1')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.onlineStore.body2')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.onlineStore.body3')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.onlineStore.body4')}</p>
            </Section>

            <Section title={t('sections.generalConditions.title')}>
              <p>{t('sections.generalConditions.body1')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.generalConditions.body2')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.generalConditions.body3')}</p>
            </Section>

            <Section title={t('sections.riskDisclaimer.title')}>
              <p>{t('sections.riskDisclaimer.body1')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.riskDisclaimer.body2')}</p>
            </Section>

            <Section title={t('sections.hypothetical.title')}>
              <p>{t('sections.hypothetical.body')}</p>
            </Section>

            <Section title={t('sections.testimonials.title')}>
              <p>{t('sections.testimonials.body')}</p>
            </Section>

            <Section title={t('sections.educational.title')}>
              <p>{t('sections.educational.body1')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.educational.body2')}</p>
            </Section>

            <Section title={t('sections.tradingView.title')}>
              <p>{t('sections.tradingView.body1')}</p>
              <p style={{ marginTop: '1rem' }}>
                {t('sections.tradingView.body2BeforeLink')}{' '}
                <a href="http://www.tradingview.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00F5FF' }}>
                  www.TradingView.com
                </a>
                {t('sections.tradingView.body2AfterLink')}
              </p>
            </Section>

            <Section title={t('sections.refunds.title')}>
              <p>{t('sections.refunds.body1')}</p>
              <p style={{ marginTop: '1rem' }}>
                {t('sections.refunds.body2BeforeEmail')}{' '}
                <a href="mailto:support@fibalgo.com" style={{ color: '#00F5FF' }}>support@fibalgo.com</a>{' '}
                {t('sections.refunds.body2AfterEmail')}
              </p>
              <p style={{ marginTop: '1rem' }}>{t('sections.refunds.body3')}</p>
              <p style={{ marginTop: '1rem' }}>
                {t('sections.refunds.body4BeforeEmail')}{' '}
                <a href="mailto:support@fibalgo.com" style={{ color: '#00F5FF' }}>support@fibalgo.com</a>
                {t('sections.refunds.body4AfterEmail')}
              </p>
              <p style={{ marginTop: '1rem' }}>{t('sections.refunds.body5')}</p>
            </Section>

            <Section title={t('sections.product.title')}>
              <p>{t('sections.product.body')}</p>
            </Section>

            <Section title={t('sections.prohibitedUses.title')}>
              <p>{t('sections.prohibitedUses.intro')}</p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.prohibitedUses.list.0')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.prohibitedUses.list.1')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.prohibitedUses.list.2')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.prohibitedUses.list.3')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.prohibitedUses.list.4')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.prohibitedUses.list.5')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.prohibitedUses.list.6')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.prohibitedUses.list.7')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.prohibitedUses.list.8')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.prohibitedUses.list.9')}</li>
              </ul>
              <p>{t('sections.prohibitedUses.outro')}</p>
            </Section>

            <Section title={t('sections.disclaimer.title')}>
              <p>{t('sections.disclaimer.body1')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.disclaimer.body2')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.disclaimer.body3')}</p>
              <p style={{ marginTop: '1rem' }}>{t('sections.disclaimer.body4')}</p>
            </Section>

            <Section title={t('sections.changesToTerms.title')}>
              <p>{t('sections.changesToTerms.body')}</p>
            </Section>

            <Section title={t('sections.contactInfo.title')}>
              <p>
                {t('sections.contactInfo.bodyBeforeEmail')}{' '}
                <a href="mailto:support@fibalgo.com" style={{ color: '#00F5FF' }}>support@fibalgo.com</a>
              </p>
            </Section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ 
        fontSize: '1.25rem', 
        fontWeight: 600, 
        color: '#00F5FF', 
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid rgba(0,245,255,0.2)',
      }}>
        {title}
      </h2>
      <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}
