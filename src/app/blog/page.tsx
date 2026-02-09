import { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts, getAllCategories } from '@/lib/blog-data';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import Breadcrumbs from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Trading Blog – AI Signals, Strategies & Market Analysis',
  description:
    'Expert trading guides, AI signal strategies, Forex & crypto analysis, TradingView tips, and market insights. Learn to trade smarter with FibAlgo.',
  alternates: { canonical: 'https://fibalgo.com/blog' },
  openGraph: {
    title: 'FibAlgo Trading Blog – Expert Guides & Strategies',
    description:
      'Free trading education: AI signals, Forex strategies, crypto analysis, and TradingView tips from professional traders.',
    url: 'https://fibalgo.com/blog',
  },
};

export default function BlogPage() {
  const categories = getAllCategories();
  const sortedPosts = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <AnimatedBackground />
      <Navbar />
      <Breadcrumbs items={[{ name: 'Blog', href: '/blog' }]} />

      <section
        style={{
          position: 'relative',
          zIndex: 1,
          paddingTop: '8rem',
          paddingBottom: '4rem',
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '8rem 1rem 4rem',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(0,245,255,0.85)',
              margin: '0 0 0.75rem 0',
            }}
          >
            Trading Education
          </p>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: '0 0 1rem 0',
            }}
          >
            Trading Blog: AI Signals, Strategies & Market Insights
          </h1>
          <p
            style={{
              fontSize: '1.05rem',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.6,
              maxWidth: '36rem',
              margin: '0 auto',
            }}
          >
            Expert guides to help you trade smarter. From beginner strategies to advanced AI analysis.
          </p>
        </div>

        {/* Categories */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: '3rem',
          }}
        >
          {categories.map((cat) => (
            <span
              key={cat}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '9999px',
                background: 'rgba(0,245,255,0.08)',
                border: '1px solid rgba(0,245,255,0.2)',
                color: '#00F5FF',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Blog Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {sortedPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <article
                style={{
                  background: 'rgba(18,21,28,0.8)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Category badge */}
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#00F5FF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '0.75rem',
                  }}
                >
                  {post.tags[0]}
                </span>

                {/* Title */}
                <h2
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    lineHeight: 1.3,
                    margin: '0 0 0.75rem 0',
                  }}
                >
                  {post.title}
                </h2>

                {/* Description */}
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1.6,
                    margin: '0 0 1rem 0',
                    flex: 1,
                  }}
                >
                  {post.description}
                </p>

                {/* Meta */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    paddingTop: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {post.readTime} read
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
