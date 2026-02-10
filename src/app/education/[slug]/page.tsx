import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getPostBySlug, getRecentPostsDB, getAllSlugs } from '@/lib/blog-service';
import { timeAgo } from '@/lib/time-ago';
import { blogPosts } from '@/lib/blog-data';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import ShareButtons from '@/components/blog/ShareButtons';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

// Revalidate every 60 seconds for new Supabase posts
export const revalidate = 60;

// Generate static paths — static posts at build time, DB posts via ISR
export async function generateStaticParams() {
  // Always include static posts
  const staticSlugs = blogPosts.map((post) => ({ slug: post.slug }));
  
  // Try to include DB posts too
  try {
    const allSlugs = await getAllSlugs();
    const dbSlugs = allSlugs
      .filter(s => !staticSlugs.some(ss => ss.slug === s))
      .map(s => ({ slug: s }));
    return [...staticSlugs, ...dbSlugs];
  } catch {
    return staticSlugs;
  }
}

// Dynamic metadata for each blog post
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  const seoTitle = post.metaTitle || post.title;
  const seoDesc = post.metaDescription || post.description;

  return {
    title: seoTitle,
    description: seoDesc,
    keywords: [
      ...(post.targetKeyword ? [post.targetKeyword] : []),
      ...post.tags,
    ],
    alternates: { canonical: `https://fibalgo.com/education/${post.slug}` },
    openGraph: {
      title: seoTitle,
      description: seoDesc,
      url: `https://fibalgo.com/education/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updatedAt || post.date,
      authors: ['FibAlgo'],
      tags: post.tags,
      images: post.coverImage
        ? [{ url: post.coverImage, width: 800, height: 450, alt: seoTitle }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDesc,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const recentPosts = (await getRecentPostsDB(5)).filter((p) => p.slug !== slug);

  // Article JSON-LD
  const wordCount = post.wordCount || post.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.description,
    image: post.coverImage
      ? {
          '@type': 'ImageObject',
          url: post.coverImage,
          width: 800,
          height: 450,
        }
      : {
          '@type': 'ImageObject',
          url: 'https://fibalgo.com/images/websitelogo.jpg',
          width: 512,
          height: 512,
        },
    datePublished: post.date,
    dateModified: post.updatedAt || post.date,
    wordCount: wordCount,
    author: {
      '@type': 'Organization',
      name: 'FibAlgo',
      url: 'https://fibalgo.com',
      logo: 'https://fibalgo.com/images/websitelogo.jpg',
    },
    publisher: {
      '@type': 'Organization',
      name: 'FibAlgo',
      logo: {
        '@type': 'ImageObject',
        url: 'https://fibalgo.com/images/websitelogo.jpg',
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://fibalgo.com/education/${post.slug}`,
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
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://fibalgo.com' },
        { name: 'Education', url: 'https://fibalgo.com/education' },
        { name: post.title, url: `https://fibalgo.com/education/${post.slug}` },
      ]} />
      <AnimatedBackground />
      <Navbar />

      {/* ═══ HERO HEADER ═══ */}
      <div className="article-hero" style={{
        position: 'relative',
        zIndex: 1,
        paddingTop: '7rem',
        paddingBottom: '0',
      }}>
        <div className="article-hero-inner" style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '0 1.25rem',
        }}>
          {/* Breadcrumb nav */}
          <nav
            className="article-breadcrumb"
            aria-label="Breadcrumb"
            style={{
              marginBottom: '1.5rem',
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Link href="/" style={{ color: 'rgba(0,245,255,0.7)', textDecoration: 'none' }}>Home</Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <Link href="/education" style={{ color: 'rgba(0,245,255,0.7)', textDecoration: 'none' }}>Education</Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{post.title}</span>
          </nav>

          {/* Tags row */}
          <div className="article-tags" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {post.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(0,245,255,0.08)',
                  border: '1px solid rgba(0,245,255,0.2)',
                  color: '#00F5FF',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="article-title" style={{
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.2,
            marginBottom: '1.25rem',
            letterSpacing: '-0.03em',
          }}>
            {post.title}
          </h1>

          <p className="article-description" style={{
            fontSize: '1.15rem',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.7,
            marginBottom: '1.5rem',
            maxWidth: '700px',
          }}>
            {post.description}
          </p>

          {/* Author & Meta bar */}
          <div className="article-meta" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            paddingBottom: '2rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            {/* Row 1: Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Image
                src="/images/websitelogo.jpg"
                alt="FibAlgo"
                width={40}
                height={40}
                style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 15px rgba(0,245,255,0.2)' }}
              />
              <div>
                <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                  {post.author || 'FibAlgo Team'}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)' }}>
                  Trading Research
                </div>
              </div>
            </div>
            {/* Row 2: Date · Time Ago · Read Time */}
            <div className="article-meta-row" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                📅 {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>
                🕐 {timeAgo(post.date)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                📖 {post.readTime} read
              </span>
            </div>
          </div>
        </div>
      </div>

      <article className="article-body" style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '780px',
        margin: '0 auto',
        padding: '2.5rem 1.25rem 2rem',
      }}>
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags bottom */}
        <div style={{
          marginTop: '3rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', display: 'block' }}>
            Topics
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/education/category/${tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>

        <div className="article-author-box" style={{
          marginTop: '2.5rem',
          padding: '2rem',
          background: 'rgba(12,15,22,0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Image
              src="/images/websitelogo.jpg"
              alt="FibAlgo Team"
              width={56}
              height={56}
              style={{ borderRadius: '14px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 20px rgba(0,245,255,0.15)' }}
            />
            <div>
              <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700, marginBottom: '0.25rem' }}>
                Written by FibAlgo Team
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                AI-powered trading research. Institutional-grade indicators and signals for TradingView.
              </div>
            </div>
          </div>
          <ShareButtons url={`https://fibalgo.com/education/${post.slug}`} title={post.title} />
        </div>

        <div className="article-cta" style={{
          marginTop: '2.5rem',
          padding: '2.5rem 2rem',
          background: 'linear-gradient(135deg, rgba(0,245,255,0.06) 0%, rgba(139,92,246,0.06) 100%)',
          border: '1px solid rgba(0,245,255,0.12)',
          borderRadius: '16px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '150px', height: '1px', background: 'linear-gradient(90deg, transparent, #00F5FF, transparent)' }} />
          <h3 style={{ color: '#FFFFFF', fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Ready to Trade Smarter with AI?
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '1.25rem', maxWidth: '28rem', margin: '0 auto 1.25rem' }}>
            Join 10,000+ traders using FibAlgo&apos;s AI-powered indicators on TradingView.
          </p>
          <Link
            href="/#pricing"
            style={{
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
            }}
          >
            Get Started Free →
          </Link>
        </div>

        {/* ═══ RELATED POSTS ═══ */}
        {recentPosts.length > 0 && (
          <div style={{ marginTop: '3.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                Continue Reading
              </h2>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <Link href="/education" style={{ fontSize: '0.82rem', color: '#00F5FF', textDecoration: 'none', fontWeight: 500 }}>
                View All →
              </Link>
            </div>
            <div className="article-related-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '1rem',
            }}>
              {recentPosts.slice(0, 3).map((rp) => (
                <Link key={rp.slug} href={`/education/${rp.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="blog-card-hover" style={{
                    background: 'rgba(12,15,22,0.8)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}>
                    {/* Cover image */}
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16/9',
                      background: 'linear-gradient(135deg, #0a1628, #0d0a20)',
                    }}>
                      {rp.coverImage ? (
                        <Image
                          src={rp.coverImage}
                          alt={rp.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 280px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'linear-gradient(135deg, #0a1628, #0d0a20)',
                        }}>
                          <span style={{ fontSize: '2rem', opacity: 0.5 }}>📊</span>
                        </div>
                      )}
                      <span style={{
                        position: 'absolute', top: '0.5rem', right: '0.5rem',
                        fontSize: '0.6rem', color: '#00F5FF', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        padding: '0.2rem 0.5rem', borderRadius: '6px',
                        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,245,255,0.25)',
                        backdropFilter: 'blur(4px)',
                      }}>
                        {rp.tags[0]}
                      </span>
                    </div>
                    <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
                      <h3 style={{
                        fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF',
                        lineHeight: 1.35, margin: '0 0 0.5rem 0',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {rp.title}
                      </h3>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                        📖 {rp.readTime}
                      </span>
                    </div>
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
