import { MetadataRoute } from 'next';
import { blogPosts } from '@/lib/blog-data';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600; // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://fibalgo.com';
  // Use stable dates for static pages — don't change on every revalidation
  // This prevents Google from re-crawling unchanged pages unnecessarily
  const siteLastUpdate = '2026-02-10T00:00:00.000Z';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: siteLastUpdate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: siteLastUpdate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: siteLastUpdate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/education`,
      lastModified: siteLastUpdate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: siteLastUpdate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: siteLastUpdate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Note: /community excluded from sitemap because it has noindex meta tag
  ];

  // Static blog posts
  const staticBlogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/education/${post.slug}`,
    lastModified: post.date,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

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
        .map(post => ({
          url: `${baseUrl}/education/${post.slug}`,
          lastModified: post.updated_at || post.date,
          changeFrequency: 'monthly' as const,
          priority: 0.8,
        }));
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
      .map(([slug]) => ({
        url: `${baseUrl}/education/category/${slug}`,
        lastModified: siteLastUpdate,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
  } catch {
    // If categories fail, skip
  }

  return [...staticPages, ...staticBlogPages, ...dbBlogPages, ...categoryPages];
}
