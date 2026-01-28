import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import Features from '@/components/home/Features';
import Pricing from '@/components/home/Pricing';
import FAQ from '@/components/home/FAQ';
import CTA from '@/components/home/CTA';
import Trustpilot from '@/components/home/Trustpilot';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import SectionDivider from '@/components/ui/SectionDivider';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <AnimatedBackground />
      <Navbar />
      <Hero />
      <SectionDivider variant="cyan" />
      <Features />
      <SectionDivider variant="gradient" />
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
