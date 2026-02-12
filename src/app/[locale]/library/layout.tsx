import { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAlternates, getOgLocale, getLocalizedUrl } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('library');

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: getAlternates('/library', locale),
    openGraph: {
      type: 'website',
      title: t('metaOgTitle'),
      description: t('metaOgDescription'),
      url: getLocalizedUrl('/library', locale),
      locale: getOgLocale(locale),
    },
  };
}

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
