'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function IndicatorPromo() {
  const t = useTranslations('indicatorPromo');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
      <Link
        href="/#features"
        style={{
          padding: '0.5rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(0,245,255,0.2) 0%, rgba(139,92,246,0.2) 100%)',
          borderRadius: '2rem',
          border: '1px solid rgba(0,245,255,0.3)',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        <span style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #00F5FF 0%, #8B5CF6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          📊 {t('title')}
        </span>
      </Link>
    </div>
  );
}
