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

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
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
