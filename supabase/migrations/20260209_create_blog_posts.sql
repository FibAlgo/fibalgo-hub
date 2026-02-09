-- ============================================================
-- AI Blog System: blog_posts + blog_keywords tables
-- ============================================================

-- Blog posts table (AI generated + static seed posts)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  author TEXT DEFAULT 'FibAlgo Team',
  tags TEXT[] DEFAULT '{}',
  cover_image TEXT,
  read_time TEXT DEFAULT '10 min',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  target_keyword TEXT,
  meta_title TEXT,
  meta_description TEXT,
  word_count INTEGER DEFAULT 0,
  ai_model TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword tracker: avoid duplicate topics
CREATE TABLE IF NOT EXISTS public.blog_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT UNIQUE NOT NULL,
  category TEXT,
  used_in_slug TEXT,
  search_volume_estimate TEXT CHECK (search_volume_estimate IN ('low', 'medium', 'high', 'very_high')),
  competition TEXT CHECK (competition IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'used', 'planned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast slug lookup and status filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_date ON public.blog_posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_blog_keywords_status ON public.blog_keywords(status);
CREATE INDEX IF NOT EXISTS idx_blog_keywords_keyword ON public.blog_keywords(keyword);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_keywords ENABLE ROW LEVEL SECURITY;

-- Public read access for published posts
CREATE POLICY "Published blog posts are viewable by everyone"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

-- Service role full access (for cron/admin)
CREATE POLICY "Service role can do everything on blog_posts"
  ON public.blog_posts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on blog_keywords"
  ON public.blog_keywords FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Public read access for keywords (needed for topic selection)
CREATE POLICY "Keywords are viewable by everyone"
  ON public.blog_keywords FOR SELECT
  USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();
