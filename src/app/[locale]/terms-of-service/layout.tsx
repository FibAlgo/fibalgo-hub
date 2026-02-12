import { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAlternates, getOgLocale, getLocalizedUrl } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('termsOfService');

  const BASE_URL = 'https://fibalgo.com';

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
      images: [{ url: `${BASE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'FibAlgo Terms of Service' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaOgTitle'),
      description: t('metaOgDescription'),
      images: [`${BASE_URL}/opengraph-image`],
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
