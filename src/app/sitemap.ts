import { MetadataRoute } from 'next';
import { blogPosts } from '@/lib/blog-data';
import { createClient } from '@supabase/supabase-js';
import { locales } from '@/i18n/routing';
import { getAllTranslatedSlugs } from '@/lib/blog-service';

export const revalidate = 3600; // Revalidate sitemap every hour

const baseUrl = 'https://fibalgo.com';

/**
 * Get the full URL for a given path and locale.
 * - English root: fibalgo.com/
 * - Turkish root: fibalgo.com/tr/
 * - English sub-page: fibalgo.com/about
 * - Turkish sub-page: fibalgo.com/tr/about
 */
function getLocaleUrl(path: string, locale: string): string {
  const isRoot = path === '/';
  const cleanPath = isRoot ? '' : path;

  if (locale === 'en') {
    return `${baseUrl}${cleanPath || '/'}`;
  }
  return isRoot
    ? `${baseUrl}/${locale}/`
    : `${baseUrl}/${locale}${cleanPath}`;
}

/**
 * Generate hreflang alternates for a given path.
 * Returns all 30 locale URLs so Google can serve the right version.
 */
function getAlternates(path: string): MetadataRoute.Sitemap[number]['alternates'] {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = getLocaleUrl(path, locale);
  }
  return { languages };
}

/**
 * Create sitemap entries for ALL 30 locale versions of a page.
 * Google requires each locale URL to be a separate <url> entry,
 * with all alternates listed in each entry (including itself).
 * This generates 30 entries per page path.
 */
function localizedEntries(
  path: string,
  options: {
    lastModified?: string;
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority?: number;
  }
): MetadataRoute.Sitemap {
  const alternates = getAlternates(path);

  return locales.map((locale) => ({
    url: getLocaleUrl(path, locale),
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates,
  }));
}

/**
 * Create sitemap entries for blog posts — only includes locales
 * that have completed translations. English is always included.
 * Non-translated locales are excluded to avoid duplicate content.
 */
function localizedBlogEntries(
  path: string,
  translatedLocales: string[],
  options: {
    lastModified?: string;
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority?: number;
  }
): MetadataRoute.Sitemap {
  // Build alternates only for available locales
  const languages: Record<string, string> = {};
  for (const locale of translatedLocales) {
    languages[locale] = getLocaleUrl(path, locale);
  }
  const alternates = { languages };

  return translatedLocales.map((locale) => ({
    url: getLocaleUrl(path, locale),
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use stable dates for static pages — don't change on every revalidation
  // This prevents Google from re-crawling unchanged pages unnecessarily
  const siteLastUpdate = '2026-02-10T00:00:00.000Z';

  // Static pages — each generates 30 locale entries (one per language)
  const staticPages: MetadataRoute.Sitemap = [
    ...localizedEntries('/', {
      lastModified: siteLastUpdate,
      changeFrequency: 'daily',
      priority: 1.0,
    }),
    ...localizedEntries('/about', {
      lastModified: siteLastUpdate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }),
    ...localizedEntries('/library', {
      lastModified: siteLastUpdate,
      changeFrequency: 'weekly',
      priority: 0.9,
    }),
    ...localizedEntries('/education', {
      lastModified: siteLastUpdate,
      changeFrequency: 'daily',
      priority: 0.9,
    }),
    ...localizedEntries('/privacy-policy', {
      lastModified: siteLastUpdate,
      changeFrequency: 'yearly',
      priority: 0.3,
    }),
    ...localizedEntries('/terms-of-service', {
      lastModified: siteLastUpdate,
      changeFrequency: 'yearly',
      priority: 0.3,
    }),
    // Note: /community excluded from sitemap because it has noindex meta tag
  ];

  // Static blog posts — include only locales with translations
  // Fetch all translated slugs from Supabase in one batch query
  const translatedSlugsMap = await getAllTranslatedSlugs();
  
  const staticBlogPages: MetadataRoute.Sitemap = blogPosts.flatMap((post) => {
    const availableLocales = translatedSlugsMap.get(post.slug) || ['en'];
    return localizedBlogEntries(`/education/${post.slug}`, availableLocales, {
      lastModified: post.date,
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  });

  // Dynamic blog posts from Supabase
  let dbBlogPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, date, updated_at')
      .eq('status', 'published');

    if (data) {
      const staticSlugs = new Set(blogPosts.map(p => p.slug));
      dbBlogPages = data
        .filter(p => !staticSlugs.has(p.slug))
        .flatMap(post => {
          const availableLocales = translatedSlugsMap.get(post.slug) || ['en'];
          return localizedBlogEntries(`/education/${post.slug}`, availableLocales, {
            lastModified: post.updated_at || post.date,
            changeFrequency: 'monthly',
            priority: 0.8,
          });
        });
    }
  } catch {
    // If Supabase fails, just use static posts
  }

  // Category pages — only include categories with 3+ posts to avoid thin content
  // that wastes Google's crawl budget
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const allPosts = [...blogPosts];
    // Count posts per category
    const categoryCounts = new Map<string, number>();
    allPosts.forEach(post => {
      if ('tags' in post && Array.isArray(post.tags)) {
        post.tags.forEach((tag: string) => {
          const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          if (slug) categoryCounts.set(slug, (categoryCounts.get(slug) || 0) + 1);
        });
      }
    });
    
    // Also count Supabase post tags
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: dbPosts } = await supabase
        .from('blog_posts')
        .select('tags')
        .eq('status', 'published');
      if (dbPosts) {
        dbPosts.forEach(post => {
          if (Array.isArray(post.tags)) {
            post.tags.forEach((tag: string) => {
              const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              if (slug) categoryCounts.set(slug, (categoryCounts.get(slug) || 0) + 1);
            });
          }
        });
      }
    } catch {
      // If Supabase fails for tags, use what we have
    }

    // Only include categories with 3+ posts
    categoryPages = Array.from(categoryCounts.entries())
      .filter(([, count]) => count >= 3)
      .flatMap(([slug]) =>
        localizedEntries(`/education/category/${slug}`, {
          lastModified: siteLastUpdate,
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      );
  } catch {
    // If categories fail, skip
  }

  return [...staticPages, ...staticBlogPages, ...dbBlogPages, ...categoryPages];
}
