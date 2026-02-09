import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBlogPost, getRecentPosts, blogPosts } from '@/lib/blog-data';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import Breadcrumbs from '@/components/seo/Breadcrumbs';

// Generate static paths for all blog posts
export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

// Dynamic metadata for each blog post
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://fibalgo.com/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://fibalgo.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: ['FibAlgo'],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const recentPosts = getRecentPosts(5).filter((p) => p.slug !== slug);

  // Article JSON-LD
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: post.coverImage || 'https://fibalgo.com/images/websitelogo.jpg',
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Organization',
      name: 'FibAlgo',
      url: 'https://fibalgo.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'FibAlgo',
      logo: {
        '@type': 'ImageObject',
        url: 'https://fibalgo.com/images/websitelogo.jpg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://fibalgo.com/blog/${post.slug}`,
    },
    keywords: post.tags.join(', '),
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'FibAlgo',
      url: 'https://fibalgo.com',
    },
  };

  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <AnimatedBackground />
      <Navbar />
      <Breadcrumbs items={[{ name: 'Blog', href: '/blog' }, { name: post.title, href: `/blog/${post.slug}` }]} />

      <article
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '800px',
          margin: '0 auto',
          padding: '8rem 1rem 4rem',
        }}
      >
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          style={{
            marginBottom: '2rem',
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <Link href="/" style={{ color: 'rgba(0,245,255,0.7)', textDecoration: 'none' }}>
            Home
          </Link>
          {' / '}
          <Link href="/blog" style={{ color: 'rgba(0,245,255,0.7)', textDecoration: 'none' }}>
            Blog
          </Link>
          {' / '}
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{post.title}</span>
        </nav>

        {/* Category & Meta */}
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              background: 'rgba(0,245,255,0.1)',
              border: '1px solid rgba(0,245,255,0.2)',
              color: '#00F5FF',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {post.tags[0]}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
            {post.readTime} read
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.25,
            marginBottom: '1.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          {post.title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.7,
            marginBottom: '2rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '2rem',
          }}
        >
          {post.description}
        </p>

        {/* Article Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
          style={{
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.8,
            fontSize: '1rem',
          }}
        />

        {/* Tags */}
        <div
          style={{
            marginTop: '3rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {post.tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.75rem',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: '3rem',
            padding: '2rem',
            background: 'linear-gradient(135deg, rgba(0,245,255,0.08) 0%, rgba(139,92,246,0.08) 100%)',
            border: '1px solid rgba(0,245,255,0.15)',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Ready to Trade Smarter with AI?
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Join 10,000+ traders using FibAlgo&apos;s AI-powered indicators on TradingView.
          </p>
          <Link
            href="/#pricing"
            style={{
              display: 'inline-block',
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #00F5FF, #00C4CC)',
              color: '#000',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            Get Started Free
          </Link>
        </div>

        {/* Related Posts */}
        {recentPosts.length > 0 && (
          <div style={{ marginTop: '4rem' }}>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#FFFFFF',
                marginBottom: '1.5rem',
              }}
            >
              More Articles
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {recentPosts.slice(0, 3).map((rp) => (
                <Link
                  key={rp.slug}
                  href={`/blog/${rp.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      background: 'rgba(18,21,28,0.6)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: '#00F5FF',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontWeight: 600,
                      }}
                    >
                      {rp.tags[0]}
                    </span>
                    <h3
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        lineHeight: 1.35,
                        margin: '0.5rem 0',
                      }}
                    >
                      {rp.title}
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                      {rp.readTime} read
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <Footer />
    </main>
  );
}
