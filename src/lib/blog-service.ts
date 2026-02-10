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
import { blogPosts as staticPosts, BlogPost } from './blog-data';

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
  };
}

// Enhance static posts on first access
const enhancedStaticPosts: BlogPost[] = staticPosts.map(p => ({
  ...p,
  content: enhanceContent(p.content),
}));

/**
 * Get all published blog posts (static + Supabase)
 * Sorted by date descending
 */
export async function getAllPosts(): Promise<BlogPost[]> {
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
      return sortByDate(enhancedStaticPosts);
    }

    const dbPosts = (data as DBBlogPost[]).map(dbToPost);
    
    // Merge: DB posts + static posts (avoid duplicates by slug)
    const dbSlugs = new Set(dbPosts.map(p => p.slug));
    const uniqueStatic = enhancedStaticPosts.filter(p => !dbSlugs.has(p.slug));
    
    return sortByDate([...dbPosts, ...uniqueStatic]);
  } catch {
    // Fallback to static if Supabase is unavailable
    return sortByDate(enhancedStaticPosts);
  }
}

/**
 * Get a single blog post by slug
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (!error && data) {
      return dbToPost(data as DBBlogPost);
    }
  } catch {
    // Fall through to static
  }

  // Fallback to static (enhanced)
  return enhancedStaticPosts.find(p => p.slug === slug);
}

/**
 * Get all unique categories/tags
 */
export async function getCategories(): Promise<string[]> {
  const posts = await getAllPosts();
  const allTags = posts.flatMap(p => p.tags);
  return [...new Set(allTags)].sort();
}

/**
 * Get recent posts (for sidebar, related, etc.)
 */
export async function getRecentPostsDB(limit: number = 5): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.slice(0, limit);
}

/**
 * Get related posts based on tag overlap
 */
export async function getRelatedPostsDB(currentSlug: string, limit: number = 3): Promise<BlogPost[]> {
  const posts = await getAllPosts();
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

function sortByDate(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
