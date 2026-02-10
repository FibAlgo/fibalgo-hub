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

export const metadata: Metadata = {
  title: 'FibAlgo – AI-Powered Trading Indicators & Signals for TradingView',
  description:
    'Transform your trading with institutional-grade AI algorithms. Get precise buy/sell signals, entry & exit zones for Forex, Crypto, and Stocks on TradingView. Trusted by 10,000+ traders.',
  alternates: { canonical: 'https://fibalgo.com' },
  openGraph: {
    title: 'FibAlgo – AI-Powered Trading Indicators & Signals',
    description: 'Institutional-grade AI trading algorithms for TradingView. Precise buy/sell signals for Forex, Crypto & Stocks. Trusted by 10,000+ traders worldwide.',
    url: 'https://fibalgo.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FibAlgo – AI-Powered Trading Indicators & Signals',
    description: 'Institutional-grade AI trading algorithms for TradingView. Precise buy/sell signals for Forex, Crypto & Stocks.',
  },
};

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
