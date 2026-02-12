/**
 * ═══════════════════════════════════════════════════════════════
 * 📚 UNIFIED BLOG SERVICE
 * ═══════════════════════════════════════════════════════════════
 * 
 * Merges static blog posts (from blog-data.ts) with dynamic 
 * Supabase posts. Provides a single interface for the blog pages.
 * Includes content enhancement for richer visual presentation.
 */

import { createClient } from '@supabase/supabase-js';
import { blogPosts as staticPosts, BlogPost, FAQItem } from './blog-data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/* ═══════════════════════════════════════════════════════════
   CONTENT ENHANCER — Transforms plain markdown/HTML into 
   rich visual content with callout boxes, dividers, etc.
   Works on BOTH static (markdown) and AI-generated (HTML) content.
   ═══════════════════════════════════════════════════════════ */

function enhanceContent(raw: string): string {
  let html = raw;

  // ── 0. Fix old /blog/ internal links → /education/ ────────
  html = html.replace(/href="\/blog\//g, 'href="/education/');
  html = html.replace(/href="https:\/\/fibalgo\.com\/blog\//g, 'href="https://fibalgo.com/education/');

  // ── 1. Convert Markdown → HTML (for static posts) ─────────
  // Only if content has markdown headings (starts with #)
  if (/^#{1,3}\s/m.test(html)) {
    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, ''); // Remove h1 (title shown separately)
    
    // Bold & italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Lists (simple)
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    
    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
    
    // Links (markdown style)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Paragraphs — wrap non-tag lines
    html = html.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^</.test(trimmed)) return trimmed; // Already HTML
      return `<p>${trimmed}</p>`;
    }).join('\n');
  }

  // ── 2. Smart Enhancements (applies to all content) ────────

  // Already has callout divs? Skip enhancement for AI posts that use them
  const hasCallouts = /class="callout-|class="key-takeaways"/.test(html);

  if (!hasCallouts) {
    // Track h2 count to insert dividers & callouts strategically
    let h2Count = 0;
    let pCountSinceH2 = 0;
    let insightInserted = false;
    let exampleInserted = false;

    const lines = html.split('\n');
    const enhanced: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Count h2 sections
      if (line.startsWith('<h2>')) {
        h2Count++;
        pCountSinceH2 = 0;

        // Add section divider before every 3rd h2 (visual breathing room)
        if (h2Count > 1 && h2Count % 3 === 0) {
          enhanced.push('<div class="section-divider">✦</div>');
        }
        enhanced.push(line);
        continue;
      }

      // Count paragraphs in each section
      if (line.startsWith('<p>')) {
        pCountSinceH2++;
      }

      // Transform blockquotes into callout-insight (if no callouts yet)
      if (line.startsWith('<blockquote>') && !insightInserted) {
        const content = line.replace(/<\/?blockquote>/g, '').replace(/<\/?p>/g, '').trim();
        if (content.length > 30) {
          enhanced.push(`<div class="callout-insight"><strong>Key Insight</strong><p>${content}</p></div>`);
          insightInserted = true;
          continue;
        }
      }

      // Auto-detect "example" paragraphs and convert to callout-example
      if (!exampleInserted && line.startsWith('<p>') && h2Count >= 3) {
        const text = line.replace(/<[^>]+>/g, '');
        // Detect example-like content (mentions specific prices, dates, scenarios)
        if (/(\$[\d,]+|BTC|ETH|Bitcoin|Ethereum|January|February|March|for example|imagine|scenario|let'?s say)/i.test(text) && text.length > 80) {
          const content = line.replace(/^<p>/, '').replace(/<\/p>$/, '');
          enhanced.push(`<div class="callout-example"><strong>Real-World Example</strong><p>${content}</p></div>`);
          exampleInserted = true;
          continue;
        }
      }

      // Detect warning-like paragraphs
      if (line.startsWith('<p>') && /\b(caution|warning|danger|risk|avoid|mistake|never|do not|don'?t)\b/i.test(line) && /\b(stop.?loss|lose|loss|blow|wipe)\b/i.test(line)) {
        const content = line.replace(/^<p>/, '').replace(/<\/p>$/, '');
        enhanced.push(`<div class="callout-warning"><strong>Warning</strong><p>${content}</p></div>`);
        continue;
      }

      enhanced.push(line);
    }

    // If there's a "Key Takeaways" or "Summary" section, wrap it
    html = enhanced.join('\n');
    html = html.replace(
      /<h2>(.*?(?:Key Takeaway|Summary|Conclusion|Final Thought).*?)<\/h2>\s*(<p>.*?<\/p>)?\s*(<ul>[\s\S]*?<\/ul>)/gi,
      (_, heading, introPara, list) => {
        const intro = introPara ? introPara : '';
        return `<div class="key-takeaways"><h3>🎯 ${heading}</h3>${intro}${list}</div>`;
      }
    );
  }

  // ── 3. Final cleanup ──────────────────────────────────────
  // Remove empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  // Remove duplicate <ul> wraps
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  return html;
}

export interface DBBlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  author: string;
  tags: string[];
  cover_image: string | null;
  read_time: string;
  status: 'draft' | 'published' | 'archived';
  target_keyword: string | null;
  meta_title: string | null;
  meta_description: string | null;
  word_count: number;
  ai_model: string | null;
  ai_generated: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  faq: FAQItem[] | null;
}

// Extract the first <img> src from HTML content for use as cover image
function extractFirstImage(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match) return undefined;
  const src = match[1];
  // Only use Unsplash or absolute URLs (not relative paths)
  if (src.startsWith('https://')) return src;
  return undefined;
}

// Convert DB post to BlogPost interface (with content enhancement)
function dbToPost(db: DBBlogPost): BlogPost {
  const enhanced = enhanceContent(db.content);
  return {
    slug: db.slug,
    title: db.title,
    description: db.description,
    content: enhanced,
    date: db.date,
    updatedAt: db.updated_at || db.date,
    author: db.author,
    tags: db.tags || [],
    coverImage: db.cover_image || extractFirstImage(db.content) || undefined,
    readTime: db.read_time,
    wordCount: db.word_count || undefined,
    metaTitle: db.meta_title || undefined,
    metaDescription: db.meta_description || undefined,
    targetKeyword: db.target_keyword || undefined,
    faq: db.faq || undefined,
  };
}

// Enhance static posts on first access
const enhancedStaticPosts: BlogPost[] = staticPosts.map(p => ({
  ...p,
  content: enhanceContent(p.content),
}));

/* ═══════════════════════════════════════════════════════════
   TRANSLATION LAYER — Fetches locale-specific content from
   blog_post_translations table, falls back to English.
   ═══════════════════════════════════════════════════════════ */

interface BlogTranslation {
  slug: string;
  locale: string;
  title: string;
  description: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  faq: FAQItem[] | null;
  translation_status: string;
  word_count: number;
}

/**
 * Apply translation overlay to a BlogPost
 * Replaces title, description, content, meta, and FAQ with translated versions
 */
function applyTranslation(post: BlogPost, translation: BlogTranslation): BlogPost {
  return {
    ...post,
    title: translation.title || post.title,
    description: translation.description || post.description,
    content: translation.content ? enhanceContent(translation.content) : post.content,
    metaTitle: translation.meta_title || post.metaTitle,
    metaDescription: translation.meta_description || post.metaDescription,
    faq: translation.faq && translation.faq.length > 0 ? translation.faq : post.faq,
    wordCount: translation.word_count || post.wordCount,
  };
}

/**
 * Fetch a single translation for a slug + locale
 */
async function getTranslation(slug: string, locale: string): Promise<BlogTranslation | null> {
  if (locale === 'en') return null; // English is the source language
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('blog_post_translations')
      .select('*')
      .eq('slug', slug)
      .eq('locale', locale)
      .eq('translation_status', 'completed')
      .single();

    if (error || !data) return null;
    return data as BlogTranslation;
  } catch {
    return null;
  }
}

/**
 * Fetch all translations for a given locale (for listing pages)
 * Returns a Map<slug, BlogTranslation>
 */
async function getAllTranslationsForLocale(locale: string): Promise<Map<string, BlogTranslation>> {
  const map = new Map<string, BlogTranslation>();
  if (locale === 'en') return map;
  
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('blog_post_translations')
      .select('*')
      .eq('locale', locale)
      .eq('translation_status', 'completed');

    if (error || !data) return map;
    for (const t of data as BlogTranslation[]) {
      map.set(t.slug, t);
    }
  } catch {
    // Fallback: no translations
  }
  return map;
}

/**
 * Get all published blog posts (static + Supabase)
 * Sorted by date descending.
 * When locale is provided and != 'en', overlays translations.
 */
export async function getAllPosts(locale: string = 'en'): Promise<BlogPost[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('date', { ascending: false });

    if (error) {
      // Silently fallback if table doesn't exist yet (PGRST205) or other DB issues
      if (error.code !== 'PGRST205') {
        console.error('Error fetching DB blog posts:', error);
      }
      return sortByDate(await applyTranslationsToList(enhancedStaticPosts, locale));
    }

    const dbPosts = (data as DBBlogPost[]).map(dbToPost);
    
    // Merge: DB posts + static posts (avoid duplicates by slug)
    const dbSlugs = new Set(dbPosts.map(p => p.slug));
    const uniqueStatic = enhancedStaticPosts.filter(p => !dbSlugs.has(p.slug));
    
    const allPosts = [...dbPosts, ...uniqueStatic];
    
    // Apply translations for non-English locales
    const translatedPosts = await applyTranslationsToList(allPosts, locale);
    
    return sortByDate(translatedPosts);
  } catch {
    // Fallback to static if Supabase is unavailable
    return sortByDate(await applyTranslationsToList(enhancedStaticPosts, locale));
  }
}

/**
 * Apply translations to a list of posts for a given locale.
 * For non-English locales, ONLY returns posts that have a completed translation.
 * This ensures each locale's education page shows only content in that language.
 */
async function applyTranslationsToList(posts: BlogPost[], locale: string): Promise<BlogPost[]> {
  if (locale === 'en') return posts;
  
  const translations = await getAllTranslationsForLocale(locale);
  
  // Only return posts that have a completed translation for this locale
  // Posts without translations are excluded from non-English listing pages
  return posts
    .filter(post => translations.has(post.slug))
    .map(post => applyTranslation(post, translations.get(post.slug)!));
}

/**
 * Get a single blog post by slug
 * When locale is provided and != 'en', returns translated version.
 * If no translation exists for that locale, returns undefined (→ 404).
 * This ensures non-English users only see fully translated content.
 */
export async function getPostBySlug(slug: string, locale: string = 'en'): Promise<BlogPost | undefined> {
  let post: BlogPost | undefined;
  
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (!error && data) {
      post = dbToPost(data as DBBlogPost);
    }
  } catch {
    // Fall through to static
  }

  // Fallback to static (enhanced)
  if (!post) {
    post = enhancedStaticPosts.find(p => p.slug === slug);
  }
  
  if (!post) return undefined;
  
  // For non-English locales: require a completed translation
  if (locale !== 'en') {
    const translation = await getTranslation(slug, locale);
    if (!translation) {
      // No translation available → this post doesn't exist in this locale
      return undefined;
    }
    post = applyTranslation(post, translation);
  }
  
  return post;
}

/**
 * Get all unique categories/tags
 */
export async function getCategories(locale: string = 'en'): Promise<string[]> {
  const posts = await getAllPosts(locale);
  const allTags = posts.flatMap(p => p.tags);
  return [...new Set(allTags)].sort();
}

/**
 * Get recent posts (for sidebar, related, etc.)
 */
export async function getRecentPostsDB(limit: number = 5, locale: string = 'en'): Promise<BlogPost[]> {
  const posts = await getAllPosts(locale);
  return posts.slice(0, limit);
}

/**
 * Get related posts based on tag overlap
 */
export async function getRelatedPostsDB(currentSlug: string, limit: number = 3, locale: string = 'en'): Promise<BlogPost[]> {
  const posts = await getAllPosts(locale);
  const current = posts.find(p => p.slug === currentSlug);
  if (!current) return [];

  const others = posts.filter(p => p.slug !== currentSlug);
  const scored = others.map(post => ({
    post,
    score: post.tags.filter(tag => current.tags.includes(tag)).length,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.post);
}

/**
 * Get all slugs (for static generation)
 */
export async function getAllSlugs(): Promise<string[]> {
  const posts = await getAllPosts();
  return posts.map(p => p.slug);
}

/**
 * Get which locales have completed translations for a given slug
 * Used by sitemap to only include hreflang for translated locales
 */
export async function getTranslatedLocales(slug: string): Promise<string[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('blog_post_translations')
      .select('locale')
      .eq('slug', slug)
      .eq('translation_status', 'completed');

    if (error || !data) return ['en'];
    return ['en', ...data.map((d: { locale: string }) => d.locale)];
  } catch {
    return ['en'];
  }
}

/**
 * Get all slugs that have at least one completed translation
 * Used by sitemap for efficient batch queries
 */
export async function getAllTranslatedSlugs(): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('blog_post_translations')
      .select('slug, locale')
      .eq('translation_status', 'completed');

    if (error || !data) return result;
    for (const row of data as { slug: string; locale: string }[]) {
      const locales = result.get(row.slug) || ['en'];
      if (!locales.includes(row.locale)) locales.push(row.locale);
      result.set(row.slug, locales);
    }
  } catch {
    // Return empty map
  }
  return result;
}

function sortByDate(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
