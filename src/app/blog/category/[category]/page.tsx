import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts, getCategories } from '@/lib/blog-service';
import type { BlogPost } from '@/lib/blog-data';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import Breadcrumbs from '@/components/seo/Breadcrumbs';

export const revalidate = 60;

// All known categories for static generation
const CATEGORY_MAP: Record<string, { title: string; description: string; icon: string }> = {
  'trading-strategy': {
    title: 'Trading Strategies',
    description: 'Expert guides on swing trading, day trading, scalping, price action, and more. Learn proven strategies used by professional traders.',
    icon: '📊',
  },
  'technical-analysis': {
    title: 'Technical Analysis',
    description: 'Master RSI, MACD, Bollinger Bands, moving averages, and advanced technical indicators. Chart analysis guides for all skill levels.',
    icon: '📈',
  },
  'chart-patterns': {
    title: 'Chart Patterns',
    description: 'Identify head and shoulders, double tops, triangles, flags, and candlestick patterns. Visual pattern recognition for better entries.',
    icon: '📐',
  },
  'crypto': {
    title: 'Crypto Trading',
    description: 'Bitcoin, Ethereum, altcoin, and DeFi trading strategies. Navigate the crypto market with AI-powered insights and analysis.',
    icon: '₿',
  },
  'forex': {
    title: 'Forex Trading',
    description: 'Forex strategies for EUR/USD, GBP/USD, USD/JPY, and gold. Session-based trading, carry trades, and fundamental analysis.',
    icon: '💱',
  },
  'ai-trading': {
    title: 'AI & Automated Trading',
    description: 'Algorithmic trading, trading bots, backtesting, and machine learning in finance. The future of trading with artificial intelligence.',
    icon: '🤖',
  },
  'psychology': {
    title: 'Trading Psychology',
    description: 'Overcome fear, greed, and emotional trading. Build discipline, manage stress, and develop the mindset of successful traders.',
    icon: '🧠',
  },
  'risk-management': {
    title: 'Risk Management',
    description: 'Position sizing, stop-loss strategies, portfolio protection, and drawdown management. Preserve your capital like the pros.',
    icon: '🛡️',
  },
  'options': {
    title: 'Options Trading',
    description: 'Covered calls, iron condors, spreads, and options Greeks explained. Strategies for income generation and hedging.',
    icon: '📋',
  },
  'stocks': {
    title: 'Stock Trading',
    description: 'Penny stocks, blue chips, IPO trading, earnings plays, and sector rotation strategies. Stock market guides for all levels.',
    icon: '📉',
  },
  'defi': {
    title: 'DeFi & Web3',
    description: 'Decentralized finance protocols, yield farming, liquidity pools, and Web3 investment strategies explained simply.',
    icon: '🔗',
  },
  'tradingview': {
    title: 'TradingView Guides',
    description: 'Pine Script tutorials, TradingView alerts, screeners, chart layouts, and indicator setup guides for the most popular charting platform.',
    icon: '📊',
  },
  'beginner': {
    title: 'Beginner Trading Guides',
    description: 'Start trading with confidence. Learn the basics of markets, charts, orders, and build your first trading plan step by step.',
    icon: '🎓',
  },
  'passive-income': {
    title: 'Passive Income & Investing',
    description: 'Dividend investing, copy trading, crypto staking, and long-term wealth building strategies for consistent passive income.',
    icon: '💰',
  },
  'market-analysis': {
    title: 'Market Analysis',
    description: 'Market cycles, economic indicators, sector rotation, and volatility analysis. Understand the bigger picture for better trades.',
    icon: '🌍',
  },
  'portfolio': {
    title: 'Portfolio Management',
    description: 'Asset allocation, diversification, rebalancing, and modern portfolio theory. Build and manage a winning portfolio.',
    icon: '📁',
  },
};

// Normalize category slug
function normalizeCategory(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Find best matching category info
function getCategoryInfo(slug: string) {
  if (CATEGORY_MAP[slug]) return { slug, ...CATEGORY_MAP[slug] };
  // Partial match
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (slug.includes(key) || key.includes(slug)) return { slug, ...val };
  }
  // Fallback
  const readable = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    slug,
    title: readable,
    description: `Articles and guides about ${readable.toLowerCase()}. Expert insights for traders at all levels.`,
    icon: '📰',
  };
}

// Get posts matching a category
function getMatchingPosts(allPosts: BlogPost[], categorySlug: string): BlogPost[] {
  return allPosts.filter(post =>
    post.tags.some(tag => {
      const normalized = normalizeCategory(tag);
      return normalized === categorySlug || normalized.includes(categorySlug) || categorySlug.includes(normalized);
    })
  );
}

export async function generateStaticParams() {
  const categories = await getCategories();
  const slugs = new Set<string>();
  categories.forEach(cat => slugs.add(normalizeCategory(cat)));
  // Also add known category keys
  Object.keys(CATEGORY_MAP).forEach(k => slugs.add(k));
  return Array.from(slugs).map(category => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const info = getCategoryInfo(category);

  return {
    title: `${info.title} – Trading Guides & Strategies`,
    description: info.description,
    alternates: { canonical: `https://fibalgo.com/blog/category/${category}` },
    openGraph: {
      title: `${info.title} | FibAlgo Blog`,
      description: info.description,
      url: `https://fibalgo.com/blog/category/${category}`,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const info = getCategoryInfo(category);
  const allPosts = await getAllPosts();
  const posts = getMatchingPosts(allPosts, category);

  // Category list JSON-LD
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: info.title,
    description: info.description,
    url: `https://fibalgo.com/blog/category/${category}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.slice(0, 50).map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://fibalgo.com/blog/${post.slug}`,
      })),
    },
  };

  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <AnimatedBackground />
      <Navbar />
      <Breadcrumbs items={[
        { name: 'Blog', href: '/blog' },
        { name: info.title, href: `/blog/category/${category}` },
      ]} />

      <section style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '8rem 1.25rem 4rem',
      }}>
        {/* Category Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>{info.icon}</span>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            margin: '0 0 1rem 0',
          }}>
            {info.title}
          </h1>
          <p style={{
            fontSize: '1.05rem',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.7,
            maxWidth: '36rem',
            margin: '0 auto 1rem',
          }}>
            {info.description}
          </p>
          <span style={{
            fontSize: '0.8rem',
            color: 'rgba(0,245,255,0.7)',
            fontWeight: 600,
          }}>
            {posts.length} {posts.length === 1 ? 'article' : 'articles'}
          </span>
        </div>

        {/* Back link */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{
            fontSize: '0.85rem',
            color: '#00F5FF',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            ← All Articles
          </Link>
        </div>

        {/* Posts grid */}
        {posts.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}>
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <article style={{
                  background: 'rgba(12,15,22,0.85)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}>
                  {/* Card header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #0a1628, #0d0a20)',
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: '2rem' }}>{info.icon}</span>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      background: 'rgba(0,245,255,0.08)',
                      border: '1px solid rgba(0,245,255,0.2)',
                      color: '#00F5FF',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
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
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '1rem',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Image src="/images/websitelogo.jpg" alt="FibAlgo" width={24} height={24} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                          {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.35)' }}>
                        📖 {post.readTime}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(12,15,22,0.5)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', marginBottom: '1rem' }}>
              No articles in this category yet.
            </p>
            <Link href="/blog" style={{ color: '#00F5FF', textDecoration: 'none', fontWeight: 600 }}>
              Browse All Articles →
            </Link>
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{
          marginTop: '4rem',
          padding: '2.5rem 2rem',
          background: 'linear-gradient(135deg, rgba(0,245,255,0.04) 0%, rgba(139,92,246,0.04) 100%)',
          border: '1px solid rgba(0,245,255,0.1)',
          borderRadius: '16px',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
            Trade Smarter with AI-Powered Indicators
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.25rem', maxWidth: '28rem', margin: '0 auto 1.25rem' }}>
            Join 10,000+ traders using FibAlgo on TradingView.
          </p>
          <Link href="/#pricing" style={{
            display: 'inline-flex',
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
