import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import Breadcrumbs from '@/components/seo/Breadcrumbs';
import { getTranslations } from 'next-intl/server';

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('privacyPolicy');
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', color: '#FFFFFF' }}>
      <AnimatedBackground />
      <Navbar />
      <Breadcrumbs items={[{ name: t('breadcrumb'), href: '/privacy-policy' }]} />

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
            <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: '2rem' }}>
              {t('intro')}
            </p>

            <Section title={t('sections.personalInfo.title')}>
              <p>
                {t('sections.personalInfo.body')}
              </p>
            </Section>

            <Section title={t('sections.technologies.title')}>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.75rem' }}>
                  <strong>{t('sections.technologies.cookies.label')}</strong>{' '}
                  {t('sections.technologies.cookies.bodyBeforeLink')}{' '}
                  <a href="http://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" style={{ color: '#00F5FF' }}>
                    {t('sections.technologies.cookies.linkText')}
                  </a>
                  {t('sections.technologies.cookies.bodyAfterLink')}
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <strong>{t('sections.technologies.logFiles.label')}</strong>{' '}
                  {t('sections.technologies.logFiles.body')}
                </li>
                <li style={{ marginBottom: '0.75rem' }}>
                  <strong>{t('sections.technologies.webBeacons.label')}</strong>{' '}
                  {t('sections.technologies.webBeacons.body')}
                </li>
              </ul>
              <p>
                {t('sections.technologies.orderInfo')}
              </p>
              <p style={{ marginTop: '1rem' }}>
                {t('sections.technologies.personalInfoNote')}
              </p>
            </Section>

            <Section title={t('sections.usePersonalInfo.title')}>
              <p>{t('sections.usePersonalInfo.orderInfo')}
              </p>
              <p style={{ marginTop: '1rem' }}>{t('sections.usePersonalInfo.orderInfoListIntro')}</p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.usePersonalInfo.orderInfoList.0')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.usePersonalInfo.orderInfoList.1')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.usePersonalInfo.orderInfoList.2')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.usePersonalInfo.orderInfoList.3')}</li>
                <li style={{ marginBottom: '0.5rem' }}>{t('sections.usePersonalInfo.orderInfoList.4')}</li>
              </ul>
              <p>
                {t('sections.usePersonalInfo.deviceInfo')}
              </p>
            </Section>

            <Section title={t('sections.sharing.title')}>
              <p>
                {t('sections.sharing.intro')}
              </p>
              <p style={{ marginTop: '1rem' }}>
                {t('sections.sharing.googleIntro')}{' '}
                <a href="https://www.google.com/intl/en/policies/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#00F5FF' }}>
                  {t('sections.sharing.googlePrivacyLinkText')}
                </a>
                {t('sections.sharing.googleMiddle')}{' '}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: '#00F5FF' }}>
                  {t('sections.sharing.googleOptOutLinkText')}
                </a>
                {t('sections.sharing.googleOutro')}
              </p>
              <p style={{ marginTop: '1rem' }}>
                {t('sections.sharing.compliance')}
              </p>
            </Section>

            <Section title={t('sections.doNotTrack.title')}>
              <p>
                {t('sections.doNotTrack.body')}
              </p>
            </Section>

            <Section title={t('sections.rights.title')}>
              <p>
                {t('sections.rights.body1')}
              </p>
              <p style={{ marginTop: '1rem' }}>
                {t('sections.rights.body2')}
              </p>
              <p style={{ marginTop: '1rem' }}>
                {t('sections.rights.body3')}
              </p>
            </Section>

            <Section title={t('sections.dataRetention.title')}>
              <p>
                {t('sections.dataRetention.body')}
              </p>
            </Section>

            <Section title={t('sections.changes.title')}>
              <p>
                {t('sections.changes.body')}
              </p>
            </Section>

            <Section title={t('sections.contact.title')}>
              <p>
                {t('sections.contact.bodyBeforeEmail')}{' '}
                <a href="mailto:support@fibalgo.com" style={{ color: '#00F5FF' }}>
                  {t('sections.contact.email')}
                </a>
                {t('sections.contact.bodyAfterEmail')}
              </p>
            </Section>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
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
