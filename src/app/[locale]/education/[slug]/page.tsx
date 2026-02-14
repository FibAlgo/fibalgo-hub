import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { getPostBySlug, getRecentPostsDB, getAllSlugs } from '@/lib/blog-service';
import { timeAgo } from '@/lib/time-ago';
import { blogPosts } from '@/lib/blog-data';
import EducationNavbar from '@/components/layout/EducationNavbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import ShareButtons from '@/components/blog/ShareButtons';
import BlogCTA from '@/components/blog/BlogCTA';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { getTranslations, getLocale } from 'next-intl/server';
import { getAlternates, getOgLocale, getLocalizedUrl } from '@/lib/seo';

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
  const locale = await getLocale();
  const post = await getPostBySlug(slug, locale);
  if (!post) return {};

  const seoTitle = post.metaTitle || post.title;
  const seoDesc = post.metaDescription || post.description;
  const BASE_URL = 'https://fibalgo.com';

  return {
    title: seoTitle,
    description: seoDesc,
    keywords: [
      ...(post.targetKeyword ? [post.targetKeyword] : []),
      ...post.tags,
    ],
    alternates: getAlternates(`/education/${post.slug}`, locale),
    openGraph: {
      title: seoTitle,
      description: seoDesc,
      url: getLocalizedUrl(`/education/${post.slug}`, locale),
      type: 'article',
      locale: getOgLocale(locale),
      publishedTime: post.date,
      modifiedTime: post.updatedAt || post.date,
      authors: ['FibAlgo'],
      tags: post.tags,
      images: post.coverImage
        ? [{ url: post.coverImage, width: 800, height: 450, alt: seoTitle }]
        : [{ url: `${BASE_URL}/opengraph-image`, width: 1200, height: 630, alt: seoTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDesc,
      images: post.coverImage ? [post.coverImage] : [`${BASE_URL}/opengraph-image`],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const post = await getPostBySlug(slug, locale);
  if (!post) notFound();

  const recentPosts = (await getRecentPostsDB(5, locale)).filter((p) => p.slug !== slug);
  const t = await getTranslations('educationSlug');

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
    inLanguage: locale,
    isPartOf: {
      '@type': 'WebSite',
      name: 'FibAlgo',
      url: 'https://fibalgo.com',
    },
  };

  // FAQ JSON-LD (only if FAQ data exists)
  const faqJsonLd = post.faq && post.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faq.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  } : null;

  return (
    <main style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <BreadcrumbJsonLd items={[
        { name: t('home'), url: getLocalizedUrl('/', locale) },
        { name: t('education'), url: getLocalizedUrl('/education', locale) },
        { name: post.title, url: getLocalizedUrl(`/education/${post.slug}`, locale) },
      ]} />
      <AnimatedBackground />
      <EducationNavbar />

      {/* ═══ HERO HEADER ═══ */}
      <div className="article-hero" style={{
        position: 'relative',
        zIndex: 1,
        paddingTop: '9rem',
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
            <Link href="/" style={{ color: 'rgba(0,245,255,0.7)', textDecoration: 'none' }}>{t('home')}</Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <Link href="/education" style={{ color: 'rgba(0,245,255,0.7)', textDecoration: 'none' }}>{t('education')}</Link>
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
                  {post.author || t('authorFallback')}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)' }}>
                  {t('tradingResearch')}
                </div>
              </div>
            </div>
            {/* Row 2: Date · Time Ago · Read Time */}
            <div className="article-meta-row" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                📅 {new Date(post.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>
                🕐 {timeAgo(post.date, locale)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
                📖 {post.readTime} {t('read')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TOP CTA — TradingView Indicator ═══ */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: '1.5rem' }}>
        <BlogCTA variant="top" />
      </div>

      <article className="article-body" style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '780px',
        margin: '0 auto',
        padding: '2.5rem 1.25rem 2rem',
      }}>
        {(() => {
          // Split content in half at a paragraph boundary for mid-CTA injection
          const html = post.content;
          const paragraphs = html.split(/<\/(?:p|h2|h3|ul|ol|blockquote|div|table)>/i);
          const midPoint = Math.floor(paragraphs.length / 2);
          const closingTagMatches = html.match(/<\/(?:p|h2|h3|ul|ol|blockquote|div|table)>/gi) || [];
          let firstHalf = '';
          let secondHalf = '';
          if (paragraphs.length >= 4 && closingTagMatches.length >= 2) {
            for (let i = 0; i < midPoint; i++) {
              firstHalf += paragraphs[i] + (closingTagMatches[i] || '');
            }
            for (let i = midPoint; i < paragraphs.length; i++) {
              secondHalf += paragraphs[i] + (closingTagMatches[i] || '');
            }
          } else {
            firstHalf = html;
            secondHalf = '';
          }
          return (
            <>
              <div className="blog-content" dangerouslySetInnerHTML={{ __html: firstHalf }} />
              {secondHalf && <BlogCTA variant="mid" />}
              {secondHalf && <div className="blog-content" dangerouslySetInnerHTML={{ __html: secondHalf }} />}
              {!secondHalf && <BlogCTA variant="mid" />}
            </>
          );
        })()}

        {/* ═══ FAQ SECTION ═══ */}
        {post.faq && post.faq.length > 0 && (
          <div style={{
            marginTop: '3rem',
            padding: '2rem',
            background: 'rgba(12,15,22,0.6)',
            border: '1px solid rgba(0,245,255,0.1)',
            borderRadius: '16px',
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1.3rem' }}>❓</span>
              {t('faqHeading')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {post.faq.map((item, index) => (
                <details
                  key={index}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}
                >
                  <summary style={{
                    padding: '1rem 1.25rem',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    lineHeight: 1.4,
                    listStyle: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    userSelect: 'none',
                  }}>
                    <span style={{
                      flexShrink: 0,
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(0,245,255,0.1)',
                      border: '1px solid rgba(0,245,255,0.25)',
                      color: '#00F5FF',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {index + 1}
                    </span>
                    {item.question}
                  </summary>
                  <div style={{
                    padding: '0 1.25rem 1.25rem',
                    paddingLeft: 'calc(1.25rem + 24px + 0.75rem)',
                    fontSize: '0.88rem',
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.7,
                  }}>
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Tags bottom */}
        <div style={{
          marginTop: '3rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', display: 'block' }}>
            {t('topics')}
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
                {t('writtenBy')}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                {t('authorBio')}
              </div>
            </div>
          </div>
          <ShareButtons url={`https://fibalgo.com/education/${post.slug}`} title={post.title} />
        </div>

        {/* ═══ BOTTOM CTA ═══ */}
        <BlogCTA variant="bottom" />

        {/* ═══ RELATED POSTS ═══ */}
        {recentPosts.length > 0 && (
          <div style={{ marginTop: '3.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                {t('continueReading')}
              </h2>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <Link href="/education" style={{ fontSize: '0.82rem', color: '#00F5FF', textDecoration: 'none', fontWeight: 500 }}>
                {t('viewAll')}
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
