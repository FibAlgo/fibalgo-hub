import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts } from '@/lib/blog-service';
import { timeAgo } from '@/lib/time-ago';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

// Revalidate every 60 seconds (ISR) — picks up new Supabase posts
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Trading Education – AI Signals, Strategies & Market Analysis',
  description:
    'Expert trading guides, AI signal strategies, Forex & crypto analysis, TradingView tips, and market insights. Learn to trade smarter with FibAlgo.',
  alternates: { canonical: 'https://fibalgo.com/education' },
  openGraph: {
    title: 'FibAlgo Trading Education – Expert Guides & Strategies',
    description:
      'Free trading education: AI signals, Forex strategies, crypto analysis, and TradingView tips from professional traders.',
    url: 'https://fibalgo.com/education',
    type: 'website',
    images: [{ url: 'https://fibalgo.com/opengraph-image', width: 1200, height: 630, alt: 'FibAlgo Trading Education' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FibAlgo Trading Education – Expert Guides & Strategies',
    description: 'Free trading education: AI signals, Forex strategies, crypto analysis, and TradingView tips.',
  },
};

// Category colors for visual variety
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  'fibonacci': { bg: 'rgba(0,245,255,0.08)', border: 'rgba(0,245,255,0.25)', text: '#00F5FF', glow: 'rgba(0,245,255,0.15)' },
  'ai-trading': { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)', text: '#8B5CF6', glow: 'rgba(139,92,246,0.15)' },
  'smart-money': { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#10B981', glow: 'rgba(16,185,129,0.15)' },
  'risk-management': { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#F59E0B', glow: 'rgba(245,158,11,0.15)' },
  'crypto': { bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)', text: '#EC4899', glow: 'rgba(236,72,153,0.15)' },
  'technical-analysis': { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', text: '#3B82F6', glow: 'rgba(59,130,246,0.15)' },
  'tradingview': { bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)', text: '#0EA5E9', glow: 'rgba(14,165,233,0.15)' },
  'defi': { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', text: '#A855F7', glow: 'rgba(168,85,247,0.15)' },
  default: { bg: 'rgba(0,245,255,0.06)', border: 'rgba(0,245,255,0.2)', text: '#00F5FF', glow: 'rgba(0,245,255,0.1)' },
};

function getCatColor(tag: string) {
  const key = tag.toLowerCase().replace(/\s+/g, '-');
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
}

// Gradient covers based on category
function getCoverGradient(tag: string, index: number) {
  const gradients = [
    'linear-gradient(135deg, #0a1628 0%, #0d2847 40%, #0a1a3a 100%)',
    'linear-gradient(135deg, #0a0f1e 0%, #1a0a2e 40%, #0d0a20 100%)',
    'linear-gradient(135deg, #0a1a18 0%, #0a2e25 40%, #071a16 100%)',
    'linear-gradient(135deg, #1a1408 0%, #2e1f0a 40%, #1a1305 100%)',
    'linear-gradient(135deg, #1a0a1e 0%, #2e0a25 40%, #1a0515 100%)',
    'linear-gradient(135deg, #0a1020 0%, #0a1e3e 40%, #050d1a 100%)',
  ];
  return gradients[index % gradients.length];
}

// Category icons (emoji-based for simplicity, works everywhere)
const CATEGORY_ICONS: Record<string, string> = {
  'fibonacci': '📐',
  'ai-trading': '🤖',
  'smart-money': '🏦',
  'risk-management': '🛡️',
  'crypto': '₿',
  'technical-analysis': '📊',
  'tradingview': '📈',
  'defi': '🔗',
  'sentiment': '🧠',
  'bitcoin': '₿',
  'forex': '💱',
  'psychology': '🧘',
  'options': '📋',
  'stocks': '📉',
  'beginner': '🎓',
};

function getCatIcon(tag: string) {
  const key = tag.toLowerCase().replace(/\s+/g, '-');
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v;
  }
  return '📰';
}

export default async function BlogPage() {
  const allPosts = await getAllPosts();

  const featuredPost = allPosts[0];
  const restPosts = allPosts.slice(1);

  // CollectionPage + ItemList JSON-LD for blog listing
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'FibAlgo Trading Education',
    description: 'Expert trading guides, AI signal strategies, Forex & crypto analysis, TradingView tips, and market insights.',
    url: 'https://fibalgo.com/education',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: allPosts.length,
      itemListElement: allPosts.slice(0, 50).map((post: { slug: string; title: string }, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://fibalgo.com/education/${post.slug}`,
        name: post.title,
      })),
    },
  };

  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://fibalgo.com' },
        { name: 'Education', url: 'https://fibalgo.com/education' },
      ]} />
      <AnimatedBackground />
      <Navbar />

      <section
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '8rem 1.25rem 4rem',
        }}
      >
        {/* ═══ HERO HEADER ═══ */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            background: 'rgba(0,245,255,0.06)',
            border: '1px solid rgba(0,245,255,0.15)',
            marginBottom: '1.25rem',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00F5FF', boxShadow: '0 0 8px #00F5FF' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00F5FF' }}>
              Trading Education
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            margin: '0 0 1.25rem 0',
          }}>
            Trading Education
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.7,
            maxWidth: '38rem',
            margin: '0 auto',
          }}>
            In-depth guides on AI signals, advanced strategies, and market analysis — written for traders who want an edge.
          </p>
        </div>

        {/* ═══ FEATURED POST ═══ */}
        {featuredPost && (
          <Link href={`/education/${featuredPost.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '2.5rem' }}>
            <article className="blog-card-hover blog-featured" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0',
              background: 'rgba(12,15,22,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              cursor: 'pointer',
            }}>
              {/* Cover image area */}
              <div style={{
                position: 'relative',
                minHeight: '320px',
                overflow: 'hidden',
              }}>
                {featuredPost.coverImage ? (
                  <>
                    <Image
                      src={featuredPost.coverImage}
                      alt={featuredPost.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      style={{ objectFit: 'cover' }}
                      priority
                    />
                    {/* Dark gradient overlay for readability */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,8,0.7) 0%, rgba(5,5,8,0.1) 50%, rgba(5,5,8,0.3) 100%)' }} />
                  </>
                ) : (
                  <>
                    <div style={{ position: 'absolute', inset: 0, background: getCoverGradient(featuredPost.tags[0], 0) }} />
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2300f5ff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                  </>
                )}
                {/* Featured badge */}
                <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                  <span style={{
                    padding: '0.4rem 1.2rem',
                    borderRadius: '9999px',
                    background: 'rgba(0,245,255,0.15)',
                    border: '1px solid rgba(0,245,255,0.3)',
                    color: '#00F5FF',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    backdropFilter: 'blur(8px)',
                  }}>
                    ⭐ Featured Article
                  </span>
                </div>
              </div>

              {/* Content side */}
              <div className="blog-featured-content" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {featuredPost.tags.slice(0, 3).map(tag => {
                    const c = getCatColor(tag);
                    return (
                      <span key={tag} style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        background: c.bg,
                        border: `1px solid ${c.border}`,
                        color: c.text,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {tag}
                      </span>
                    );
                  })}
                </div>
                <h2 style={{
                  fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  lineHeight: 1.3,
                  margin: '0 0 1rem 0',
                  letterSpacing: '-0.01em',
                }}>
                  {featuredPost.title}
                </h2>
                <p style={{
                  fontSize: '0.95rem',
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.7,
                  margin: '0 0 1.5rem 0',
                }}>
                  {featuredPost.description}
                </p>
                <div className="blog-featured-meta" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Image
                      src="/images/websitelogo.jpg"
                      alt="FibAlgo"
                      width={32}
                      height={32}
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                      {featuredPost.author || 'FibAlgo Team'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>
                    {new Date(featuredPost.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                    {timeAgo(featuredPost.date)}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    📖 {featuredPost.readTime}
                  </span>
                </div>
                {/* Read arrow */}
                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00F5FF', fontSize: '0.85rem', fontWeight: 600 }}>
                  Read Article
                  <span style={{ transition: 'transform 0.3s', display: 'inline-block' }}>→</span>
                </div>
              </div>
            </article>
          </Link>
        )}

        {/* ═══ POST GRID ═══ */}
        <div className="blog-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}>
          {restPosts.map((post, i) => {
            const catColor = getCatColor(post.tags[0]);
            return (
              <Link key={post.slug} href={`/education/${post.slug}`} style={{ textDecoration: 'none' }}>
                <article className="blog-card-hover" style={{
                  background: 'rgba(12,15,22,0.85)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* Card cover */}
                  <div style={{
                    position: 'relative',
                    minHeight: '180px',
                    overflow: 'hidden',
                  }}>
                    {post.coverImage ? (
                      <>
                        <Image
                          src={post.coverImage}
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          style={{ objectFit: 'cover' }}
                        />
                        {/* Subtle dark overlay */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,8,0.6) 0%, rgba(5,5,8,0) 60%)' }} />
                      </>
                    ) : (
                      <>
                        <div style={{ position: 'absolute', inset: 0, background: getCoverGradient(post.tags[0], i + 1) }} />
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.2, background: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%2300f5ff\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H20v-1.5z\'/%3E%3C/g%3E%3C/svg%3E")' }} />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '2.5rem', zIndex: 1, filter: 'drop-shadow(0 0 12px rgba(0,245,255,0.2))' }}>
                          {getCatIcon(post.tags[0])}
                        </div>
                      </>
                    )}
                    {/* Category badge */}
                    <span style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      padding: '0.3rem 0.7rem',
                      borderRadius: '8px',
                      background: 'rgba(5,5,8,0.6)',
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${catColor.border}`,
                      color: catColor.text,
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      zIndex: 2,
                    }}>
                      {post.tags[0]}
                    </span>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{
                      fontSize: '1.1rem',
                      fontWeight: 650,
                      color: '#FFFFFF',
                      lineHeight: 1.35,
                      margin: '0 0 0.75rem 0',
                      letterSpacing: '-0.01em',
                    }}>
                      {post.title}
                    </h2>

                    <p style={{
                      fontSize: '0.85rem',
                      color: 'rgba(255,255,255,0.45)',
                      lineHeight: 1.65,
                      margin: '0 0 1.25rem 0',
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {post.description}
                    </p>

                    {/* Footer */}
                    <div className="blog-card-footer" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '1rem',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Image
                          src="/images/websitelogo.jpg"
                          alt="FibAlgo"
                          width={24}
                          height={24}
                          style={{ borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                          {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)' }}>
                        {timeAgo(post.date)}
                      </span>
                      <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        📖 {post.readTime}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        {/* ═══ BOTTOM CTA ═══ */}
        <div className="blog-bottom-cta" style={{
          marginTop: '4rem',
          padding: '3rem 2rem',
          background: 'linear-gradient(135deg, rgba(0,245,255,0.04) 0%, rgba(139,92,246,0.04) 100%)',
          border: '1px solid rgba(0,245,255,0.1)',
          borderRadius: '16px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '200px', height: '1px', background: 'linear-gradient(90deg, transparent, #00F5FF, transparent)' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
            Trade Smarter with AI-Powered Indicators
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', maxWidth: '30rem', margin: '0 auto 1.5rem' }}>
            Join 10,000+ traders using FibAlgo on TradingView. Get precise buy/sell signals for Forex, Crypto & Stocks.
          </p>
          <Link href="/#pricing" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.85rem 2rem',
            background: 'linear-gradient(135deg, #00F5FF, #00C4CC)',
            color: '#000',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.9rem',
            textDecoration: 'none',
            boxShadow: '0 0 25px rgba(0,245,255,0.2)',
          }}>
            Get Started Free →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
