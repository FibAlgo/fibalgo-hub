import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import HashScroll from '@/components/layout/HashScroll';
import SectionDivider from '@/components/ui/SectionDivider';
import {
  OrganizationJsonLd,
  WebSiteJsonLd,
  SoftwareApplicationJsonLd,
  FAQJsonLd,
} from '@/components/seo/JsonLd';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAlternates, getOgLocale, getLocalizedUrl } from '@/lib/seo';

// Below-fold components — lazy loaded to reduce initial bundle
const IndicatorTabs = dynamic(() => import('@/components/home/IndicatorTabs'), {
  loading: () => <div style={{ minHeight: '600px' }} />,
});
const TerminalShowcase = dynamic(() => import('@/components/home/TerminalShowcase'), {
  loading: () => <div style={{ minHeight: '800px' }} />,
});
const Pricing = dynamic(() => import('@/components/home/Pricing'), {
  loading: () => <div style={{ minHeight: '600px' }} />,
});
const FAQ = dynamic(() => import('@/components/home/FAQ'), {
  loading: () => <div style={{ minHeight: '400px' }} />,
});
const CTA = dynamic(() => import('@/components/home/CTA'), {
  loading: () => <div style={{ minHeight: '300px' }} />,
});
const Trustpilot = dynamic(() => import('@/components/home/Trustpilot'), {
  loading: () => <div style={{ minHeight: '300px' }} />,
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations('hero');

  return {
    title: { absolute: t('metaTitle') },
    description: t('metaDescription'),
    alternates: getAlternates('/', locale),
    openGraph: {
      title: t('metaOgTitle'),
      description: t('metaOgDescription'),
      url: getLocalizedUrl('/', locale),
      type: 'website',
      locale: getOgLocale(locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaOgTitle'),
      description: t('metaOgDescription'),
    },
  };
}

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative', paddingTop: 0, marginTop: 0 }}>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />
      <FAQJsonLd />
      <HashScroll />
      <Navbar />
      <Hero />
      <SectionDivider variant="cyan" />
      <Suspense fallback={<div style={{ minHeight: '600px' }} />}>
        <IndicatorTabs />
      </Suspense>
      <SectionDivider variant="gradient" />
      <Suspense fallback={<div style={{ minHeight: '800px' }} />}>
        <TerminalShowcase />
      </Suspense>
      <SectionDivider variant="cyan" />
      <Suspense fallback={<div style={{ minHeight: '300px' }} />}>
        <Trustpilot />
      </Suspense>
      <SectionDivider variant="cyan" />
      <Suspense fallback={<div style={{ minHeight: '600px' }} />}>
        <Pricing />
      </Suspense>
      <SectionDivider variant="purple" />
      <Suspense fallback={<div style={{ minHeight: '400px' }} />}>
        <FAQ />
      </Suspense>
      <SectionDivider variant="gradient" />
      <Suspense fallback={<div style={{ minHeight: '300px' }} />}>
        <CTA />
      </Suspense>
      <Footer />
    </main>
  );
}
