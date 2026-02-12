-- ============================================================
-- Blog Post Translations — Multilingual Blog Content
-- Each blog post can have translations in up to 29 languages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blog_post_translations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Reference to blog_posts.slug (not FK to allow static post translations too)
  slug TEXT NOT NULL,
  
  -- ISO 639-1 locale code (tr, de, es, ja, etc.)
  locale TEXT NOT NULL,
  
  -- Translated content fields
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- SEO fields
  meta_title TEXT,
  meta_description TEXT,
  
  -- FAQ translations (same structure as blog_posts.faq)
  faq JSONB DEFAULT NULL,
  
  -- Translation metadata
  translation_status TEXT DEFAULT 'pending' CHECK (translation_status IN ('pending', 'completed', 'failed', 'needs_review')),
  ai_model TEXT DEFAULT 'deepseek-chat',
  word_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one translation per slug per locale
  UNIQUE(slug, locale)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_blog_translations_slug ON public.blog_post_translations(slug);
CREATE INDEX IF NOT EXISTS idx_blog_translations_locale ON public.blog_post_translations(locale);
CREATE INDEX IF NOT EXISTS idx_blog_translations_slug_locale ON public.blog_post_translations(slug, locale);
CREATE INDEX IF NOT EXISTS idx_blog_translations_status ON public.blog_post_translations(translation_status);

-- Enable RLS
ALTER TABLE public.blog_post_translations ENABLE ROW LEVEL SECURITY;

-- Public read access for completed translations
CREATE POLICY "Completed translations are viewable by everyone"
  ON public.blog_post_translations FOR SELECT
  USING (translation_status = 'completed');

-- Service role full access (for translation script)
CREATE POLICY "Service role can do everything on blog_post_translations"
  ON public.blog_post_translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comment
COMMENT ON TABLE public.blog_post_translations IS 'Multilingual blog post translations. Each row = one blog post translated into one locale.';
