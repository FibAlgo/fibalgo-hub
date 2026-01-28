-- Community System Tables
-- Twitter-like social features for FibAlgo users

-- Posts table (tweets)
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  image_url TEXT,
  parent_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE, -- for replies
  repost_of UUID REFERENCES public.community_posts(id) ON DELETE CASCADE, -- for reposts/quotes
  quote_content TEXT CHECK (char_length(quote_content) <= 500), -- for quote tweets
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS public.community_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Follows table
CREATE TABLE IF NOT EXISTS public.community_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS public.community_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.community_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL, -- who receives
  actor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL, -- who triggered
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'repost', 'mention')),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add followers/following count to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT CHECK (char_length(bio) <= 200);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id ON public.community_posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.community_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.community_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.community_notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Anyone can view posts" ON public.community_posts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON public.community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Anyone can view likes" ON public.community_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" ON public.community_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike" ON public.community_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Anyone can view follows" ON public.community_follows
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can follow" ON public.community_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.community_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Bookmarks policies (private)
CREATE POLICY "Users can view own bookmarks" ON public.community_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks" ON public.community_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete bookmarks" ON public.community_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.community_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.community_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.community_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Functions for auto-updating counts

-- Update likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_likes_count
AFTER INSERT OR DELETE ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Update comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE public.community_posts SET comments_count = comments_count - 1 WHERE id = OLD.parent_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_comments_count
AFTER INSERT OR DELETE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Update followers/following count
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE public.users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON public.community_follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Update user posts count
CREATE OR REPLACE FUNCTION update_user_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NULL THEN
    UPDATE public.users SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NULL THEN
    UPDATE public.users SET posts_count = posts_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_posts_count
AFTER INSERT OR DELETE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION update_user_posts_count();
