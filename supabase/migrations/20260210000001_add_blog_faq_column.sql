-- Add faq JSONB column to blog_posts table for FAQ Schema support
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.blog_posts.faq IS 'FAQ items as JSON array: [{question, answer}] for FAQPage schema';
