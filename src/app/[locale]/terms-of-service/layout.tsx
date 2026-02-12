import { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAlternates, getOgLocale, getLocalizedUrl } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('termsOfService');

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: getAlternates('/terms-of-service', locale),
    openGraph: {
      type: 'website',
      title: t('metaOgTitle'),
      description: t('metaOgDescription'),
      url: getLocalizedUrl('/terms-of-service', locale),
      locale: getOgLocale(locale),
    },
    robots: { index: true, follow: true },
  };
}

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
