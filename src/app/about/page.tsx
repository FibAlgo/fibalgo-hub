import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us - FibAlgo',
  description: 'Learn about FibAlgo - AI-powered trading indicators trusted by 10,000+ traders worldwide. Our mission is to make trading fairer and clearer.',
};

export default function AboutPage() {
  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <AnimatedBackground />
      <Navbar />
      
      {/* Hero Section */}
      <section style={{ 
        paddingTop: '8rem', 
        paddingBottom: '4rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1.25rem',
            background: 'rgba(0, 245, 255, 0.1)',
            border: '1px solid rgba(0, 245, 255, 0.3)',
            borderRadius: '50px',
            marginBottom: '1.5rem'
          }}>
            <span style={{ color: '#00F5FF', fontSize: '0.875rem', fontWeight: 500 }}>Our Story</span>
          </div>
          
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
            fontWeight: 700, 
            color: '#FFFFFF',
            marginBottom: '1.5rem',
            lineHeight: 1.1
          }}>
            About <span style={{ 
              background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>FibAlgo</span>
          </h1>
          
          <p style={{ 
            fontSize: '1.25rem', 
            color: 'rgba(255,255,255,0.7)',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: 1.7
          }}>
            Empowering traders worldwide with AI-powered indicators that deliver clear, reliable, and noise-free signals.
          </p>
        </div>
      </section>

      {/* Our Story Section */}
      <section style={{ 
        padding: '4rem 1rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '3rem',
            alignItems: 'center'
          }}>
            {/* Left Content */}
            <div>
              <h2 style={{ 
                fontSize: '2.5rem', 
                fontWeight: 700, 
                color: '#FFFFFF',
                marginBottom: '1.5rem'
              }}>
                Our Story
              </h2>
              <p style={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: '1.1rem',
                lineHeight: 1.8,
                marginBottom: '1.5rem'
              }}>
                After 10+ years of trading, we saw most forex indicators were outdated, misleading, or overly complex. So we built FibAlgo — combining decades of trading experience with cutting-edge AI technology.
              </p>
              <p style={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: '1.1rem',
                lineHeight: 1.8
              }}>
                The result: AI-powered signals that are clear, reliable, and noise-free. Today, FibAlgo is trusted by over 10,000 traders worldwide.
              </p>
            </div>

            {/* Right Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1.5rem'
            }}>
              {[
                { 
                  icon: <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, 
                  title: '20+', 
                  desc: 'Proven Indicators' 
                },
                { 
                  icon: <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, 
                  title: 'AI', 
                  desc: 'Driven Analysis' 
                },
                { 
                  icon: <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
                  title: 'Smart', 
                  desc: 'Money Strategies' 
                },
                { 
                  icon: <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
                  title: '10K+', 
                  desc: 'Global Traders' 
                },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.2) 0%, rgba(191, 0, 255, 0.2) 100%)',
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                    color: '#00F5FF'
                  }}>{stat.icon}</div>
                  <div style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: 700, 
                    color: '#00F5FF',
                    marginBottom: '0.25rem'
                  }}>{stat.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>{stat.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Traders Choose Us Section */}
      <section style={{ 
        padding: '4rem 1rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 700, 
              color: '#FFFFFF',
              marginBottom: '1rem'
            }}>
              Why Traders Choose FibAlgo
            </h2>
            <p style={{ 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: '1.1rem',
              maxWidth: '700px',
              margin: '0 auto'
            }}>
              Banks and institutions drive the markets. They leave hidden footprints in price and volume — and FibAlgo&apos;s AI indicators are trained to detect them in real time.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem'
          }}>
            {/* Card 1 - Trusted by Traders */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.05) 0%, rgba(191, 0, 255, 0.05) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1.5rem',
              padding: '2rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                <svg style={{ width: '28px', height: '28px', color: '#FFFFFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '1rem' }}>
                Trusted by Traders
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                With transparent backtests, live insights, and a global community of 10,000+ traders, FibAlgo has earned worldwide trust. All tools run directly on TradingView, and every result is public.
              </p>
            </div>

            {/* Card 2 - Our Mission */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.05) 0%, rgba(191, 0, 255, 0.05) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1.5rem',
              padding: '2rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                <svg style={{ width: '28px', height: '28px', color: '#FFFFFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '1rem' }}>
                Our Mission
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                Trading is tough, and most tools make it harder. That&apos;s why we combine AI with proven strategies to make trading fairer and clearer. Give every trader access to powerful AI indicators without complexity.
              </p>
            </div>

            {/* Card 3 - Your Market Edge */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.05) 0%, rgba(191, 0, 255, 0.05) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1.5rem',
              padding: '2rem',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                <svg style={{ width: '28px', height: '28px', color: '#FFFFFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '1rem' }}>
                Your Market Edge
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                FibAlgo gives you adaptive smart signals, reliable entry & exit zones, and momentum analysis that feels like x-ray vision. With FibAlgo, you&apos;re gaining a real trading edge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ 
        padding: '4rem 1rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '2rem',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: '#FFFFFF',
              marginBottom: '2rem'
            }}>
              What Makes FibAlgo Different
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem'
            }}>
              {[
                { 
                  icon: <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, 
                  title: 'Precision Signals', 
                  desc: 'AI-optimized entry & exit points' 
                },
                { 
                  icon: <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, 
                  title: 'Real Backtests', 
                  desc: 'Transparent, verifiable results' 
                },
                { 
                  icon: <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, 
                  title: 'Real-Time Analysis', 
                  desc: 'Instant market detection' 
                },
                { 
                  icon: <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, 
                  title: 'Risk Management', 
                  desc: 'Built-in protection tools' 
                },
              ].map((feature, i) => (
                <div key={i}>
                  <div style={{ 
                    width: '64px',
                    height: '64px',
                    background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.15) 0%, rgba(191, 0, 255, 0.15) 100%)',
                    borderRadius: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    color: '#00F5FF'
                  }}>{feature.icon}</div>
                  <h3 style={{ color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {feature.title}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        padding: '4rem 1rem 6rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 700, 
            color: '#FFFFFF',
            marginBottom: '1rem'
          }}>
            Ready to Trade Smarter?
          </h2>
          <p style={{ 
            color: 'rgba(255,255,255,0.6)', 
            fontSize: '1.1rem',
            marginBottom: '2rem'
          }}>
            Join 10,000+ traders who trust FibAlgo for their trading decisions.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link 
              href="/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #00F5FF 0%, #00D4E0 100%)',
                color: '#0A0A0F',
                fontWeight: 600,
                borderRadius: '0.75rem',
                textDecoration: 'none',
                fontSize: '1rem',
                transition: 'all 0.3s ease'
              }}
            >
              Get Started Now
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link 
              href="/#pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '1rem 2rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                fontWeight: 600,
                borderRadius: '0.75rem',
                textDecoration: 'none',
                fontSize: '1rem',
                transition: 'all 0.3s ease'
              }}
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
