-- Social Proof Active Queue Table
-- This table holds the currently active 100 notifications
-- Each entry expires after 60 minutes and gets replaced with a new user

CREATE TABLE IF NOT EXISTS public.social_proof_queue (
  id SERIAL PRIMARY KEY,
  source_user_id INTEGER NOT NULL REFERENCES public.social_proof_users(id),
  name TEXT NOT NULL,
  flag_emoji TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('Premium', 'Ultimate')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  display_order INTEGER NOT NULL, -- 0-99 for ordering
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_social_proof_queue_order ON public.social_proof_queue(display_order);
CREATE INDEX IF NOT EXISTS idx_social_proof_queue_purchased ON public.social_proof_queue(purchased_at);

-- Function to refresh expired entries and maintain 100 active notifications
CREATE OR REPLACE FUNCTION refresh_social_proof_queue()
RETURNS void AS $$
DECLARE
  expired_count INTEGER;
  current_count INTEGER;
  needed_count INTEGER;
  random_user RECORD;
  random_plan TEXT;
  random_minutes INTEGER;
  i INTEGER;
BEGIN
  -- Delete entries older than 60 minutes
  DELETE FROM public.social_proof_queue
  WHERE purchased_at < NOW() - INTERVAL '60 minutes';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Count current entries
  SELECT COUNT(*) INTO current_count FROM public.social_proof_queue;
  
  -- Calculate how many we need to add
  needed_count := 100 - current_count;
  
  -- Add new entries if needed
  IF needed_count > 0 THEN
    FOR i IN 1..needed_count LOOP
      -- Get a random user that's not already in the queue
      SELECT id, name, flag_emoji INTO random_user
      FROM public.social_proof_users
      WHERE id NOT IN (SELECT source_user_id FROM public.social_proof_queue)
      ORDER BY RANDOM()
      LIMIT 1;
      
      -- If all users are in queue, just pick a random one
      IF random_user IS NULL THEN
        SELECT id, name, flag_emoji INTO random_user
        FROM public.social_proof_users
        ORDER BY RANDOM()
        LIMIT 1;
      END IF;
      
      -- Random plan (Premium or Ultimate)
      IF RANDOM() > 0.5 THEN
        random_plan := 'Premium';
      ELSE
        random_plan := 'Ultimate';
      END IF;
      
      -- Random purchase time within last 59 minutes (1-59 minutes ago)
      random_minutes := FLOOR(RANDOM() * 59) + 1;
      
      -- Find next available display_order (0-99)
      INSERT INTO public.social_proof_queue (source_user_id, name, flag_emoji, plan, purchased_at, display_order)
      SELECT 
        random_user.id,
        random_user.name,
        random_user.flag_emoji,
        random_plan,
        NOW() - (random_minutes * INTERVAL '1 minute'),
        COALESCE(
          (SELECT MIN(o) FROM generate_series(0, 99) o WHERE o NOT IN (SELECT display_order FROM public.social_proof_queue)),
          0
        );
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get the current queue (called by API)
-- This also triggers a refresh if needed
CREATE OR REPLACE FUNCTION get_social_proof_queue()
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  flag_emoji TEXT,
  plan TEXT,
  minutes_ago INTEGER,
  display_order INTEGER
) AS $$
BEGIN
  -- First refresh the queue
  PERFORM refresh_social_proof_queue();
  
  -- Return current queue sorted by minutes_ago (newest first)
  RETURN QUERY
  SELECT 
    q.id,
    q.name,
    q.flag_emoji,
    q.plan,
    EXTRACT(EPOCH FROM (NOW() - q.purchased_at))::INTEGER / 60 AS minutes_ago,
    q.display_order
  FROM public.social_proof_queue q
  ORDER BY (EXTRACT(EPOCH FROM (NOW() - q.purchased_at))::INTEGER / 60) ASC;
END;
$$ LANGUAGE plpgsql;

-- Initialize the queue with 100 entries
DO $$
BEGIN
  PERFORM refresh_social_proof_queue();
END $$;

-- RLS policies
ALTER TABLE public.social_proof_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Social proof queue is viewable by everyone" ON public.social_proof_queue;
DROP POLICY IF EXISTS "Only authenticated can modify queue" ON public.social_proof_queue;

-- Everyone can read the queue
CREATE POLICY "Social proof queue is viewable by everyone" ON public.social_proof_queue
  FOR SELECT USING (true);

-- Only system can modify (via functions)
CREATE POLICY "Only authenticated can modify queue" ON public.social_proof_queue
  FOR ALL USING (false);

COMMENT ON TABLE public.social_proof_queue IS 'Active social proof notifications - 100 entries, each expires after 60 minutes';
