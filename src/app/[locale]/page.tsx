import { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import IndicatorTabs from '@/components/home/IndicatorTabs';
import TerminalShowcase from '@/components/home/TerminalShowcase';
import Pricing from '@/components/home/Pricing';
import FAQ from '@/components/home/FAQ';
import CTA from '@/components/home/CTA';
import Trustpilot from '@/components/home/Trustpilot';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
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
      <AnimatedBackground />
      <HashScroll />
      <Navbar />
      <Hero />
      <SectionDivider variant="cyan" />
      <IndicatorTabs />
      <SectionDivider variant="gradient" />
      <TerminalShowcase />
      <SectionDivider variant="cyan" />
      <Trustpilot />
      <SectionDivider variant="cyan" />
      <Pricing />
      <SectionDivider variant="purple" />
      <FAQ />
      <SectionDivider variant="gradient" />
      <CTA />
      <Footer />
    </main>
  );
}
