import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// ISR: revalidate homepage every hour for edge caching (reduces TTFB)
export const revalidate = 3600;
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
      images: [{ url: 'https://fibalgo.com/opengraph-image', width: 1200, height: 630, alt: t('metaOgTitle') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaOgTitle'),
      description: t('metaOgDescription'),
    },
  };
}

export default async function Home() {
  const tFaq = await getTranslations('faq');
  
  // Build localized FAQ data for JSON-LD structured data
  const faqQuestions = [
    { question: tFaq('q1'), answer: tFaq('a1') },
    { question: tFaq('q2'), answer: tFaq('a2') },
    { question: tFaq('q3'), answer: tFaq('a3') },
    { question: tFaq('q4'), answer: tFaq('a4') },
    { question: tFaq('q5', { premiumPrice: '€24.99', ultimatePrice: '€49.99' }), answer: tFaq('a5', { premiumPrice: '€24.99', ultimatePrice: '€49.99' }) },
    { question: tFaq('q6'), answer: tFaq('a6') },
    { question: tFaq('q7'), answer: tFaq('a7') },
    { question: tFaq('q8'), answer: tFaq('a8') },
  ];

  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative', paddingTop: 0, marginTop: 0 }}>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />
      <FAQJsonLd questions={faqQuestions} />
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
