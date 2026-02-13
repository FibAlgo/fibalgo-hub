import { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { getAllPosts, getCategories } from '@/lib/blog-service';
import { timeAgo } from '@/lib/time-ago';
import type { BlogPost } from '@/lib/blog-data';
import EducationNavbar from '@/components/layout/EducationNavbar';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { getTranslations } from 'next-intl/server';
import { getAlternates, getOgLocale, getLocalizedUrl } from '@/lib/seo';

export const revalidate = 60;

// Category icons for display
const CATEGORY_ICONS: Record<string, string> = {
  'trading-strategy': '📊',
  'technical-analysis': '📈',
  'chart-patterns': '📐',
  'crypto': '₿',
  'forex': '💱',
  'ai-trading': '🤖',
  'psychology': '🧠',
  'risk-management': '🛡️',
  'options': '📋',
  'stocks': '📉',
  'defi': '🔗',
  'tradingview': '📊',
  'beginner': '🎓',
  'passive-income': '💰',
  'market-analysis': '🌍',
  'portfolio': '📁',
};

const KNOWN_CATEGORIES = Object.keys(CATEGORY_ICONS);

// Normalize category slug
function normalizeCategory(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Get category icon
function getCategoryIcon(slug: string): string {
  if (CATEGORY_ICONS[slug]) return CATEGORY_ICONS[slug];
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (slug.includes(key) || key.includes(slug)) return icon;
  }
  return '📰';
}

// Find matching slug in known categories
function findMatchingSlug(slug: string): string {
  if (CATEGORY_ICONS[slug]) return slug;
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (slug.includes(key) || key.includes(slug)) return key;
  }
  return slug;
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
  KNOWN_CATEGORIES.forEach(k => slugs.add(k));
  return Array.from(slugs).map(category => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; locale: string }>;
}): Promise<Metadata> {
  const { category, locale } = await params;
  const tc = await getTranslations('categories');
  const matchSlug = findMatchingSlug(category);
  const fallback = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const catTitle = tc.has(`${matchSlug}.title` as any) ? tc(`${matchSlug}.title` as any) : fallback;
  const catDescription = tc.has(`${matchSlug}.description` as any) ? tc(`${matchSlug}.description` as any) : tc('fallbackDescription', { category: catTitle });
  const metaSuffix = tc.has('metaSuffix' as any) ? tc('metaSuffix' as any) : 'Trading Guides & Strategies';
  const pagePath = `/education/category/${category}`;

  return {
    title: catTitle,
    description: catDescription,
    alternates: getAlternates(pagePath, locale),
    openGraph: {
      title: `${catTitle} | FibAlgo Education`,
      description: catDescription,
      url: getLocalizedUrl(pagePath, locale),
      type: 'website',
      locale: getOgLocale(locale),
      images: [{ url: 'https://fibalgo.com/opengraph-image', width: 1200, height: 630, alt: `${catTitle} - FibAlgo Education` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${catTitle} | FibAlgo Education`,
      description: catDescription,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string; locale: string }>;
}) {
  const { category, locale } = await params;
  const allPosts = await getAllPosts(locale);
  const posts = getMatchingPosts(allPosts, category);
  const t = await getTranslations('educationCategory');
  const tc = await getTranslations('categories');
  const tn = await getTranslations('nav');
  const te = await getTranslations('education');
  const matchSlug = findMatchingSlug(category);
  const fallback = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const catTitle = tc.has(`${matchSlug}.title` as any) ? tc(`${matchSlug}.title` as any) : fallback;
  const catDescription = tc.has(`${matchSlug}.description` as any) ? tc(`${matchSlug}.description` as any) : tc('fallbackDescription', { category: catTitle });
  const catIcon = getCategoryIcon(category);

  // Category list JSON-LD
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: catTitle,
    description: catDescription,
    url: getLocalizedUrl(`/education/category/${category}`, locale),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.slice(0, 50).map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: post.title,
        url: getLocalizedUrl(`/education/${post.slug}`, locale),
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
        { name: tn('home'), url: getLocalizedUrl('/', locale) },
        { name: te('title'), url: getLocalizedUrl('/education', locale) },
        { name: catTitle, url: getLocalizedUrl(`/education/category/${category}`, locale) },
      ]} />
      <AnimatedBackground />
      <EducationNavbar />

      <section style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '10rem 1.25rem 4rem',
      }}>
        {/* Category Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>{catIcon}</span>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            margin: '0 0 1rem 0',
          }}>
            {catTitle}
          </h1>
          <p style={{
            fontSize: '1.05rem',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.7,
            maxWidth: '36rem',
            margin: '0 auto 1rem',
          }}>
            {catDescription}
          </p>
          <span style={{
            fontSize: '0.8rem',
            color: 'rgba(0,245,255,0.7)',
            fontWeight: 600,
          }}>
            {posts.length} {posts.length === 1 ? t('article') : t('articles')}
          </span>
        </div>

        {/* Back link */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/education" style={{
            fontSize: '0.85rem',
            color: '#00F5FF',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            ← {t('allArticles')}
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
              <Link key={post.slug} href={`/education/${post.slug}`} style={{ textDecoration: 'none' }}>
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
                    position: 'relative',
                    minHeight: '160px',
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
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,8,0.6) 0%, rgba(5,5,8,0) 60%)' }} />
                      </>
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0a1628, #0d0a20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '2.5rem' }}>{catIcon}</span>
                      </div>
                    )}
                    <span style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      background: 'rgba(5,5,8,0.6)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(0,245,255,0.2)',
                      color: '#00F5FF',
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
                          {new Date(post.date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)' }}>
                        {timeAgo(post.date)}
                      </span>
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
              {t('noArticles')}
            </p>
            <Link href="/education" style={{ color: '#00F5FF', textDecoration: 'none', fontWeight: 600 }}>
              {t('browseAll')}
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
            {t('ctaTitle')}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.25rem', maxWidth: '28rem', margin: '0 auto 1.25rem' }}>
            {t('ctaDescription')}
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
            {t('ctaButton')}
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
