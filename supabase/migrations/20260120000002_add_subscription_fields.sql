-- Add subscription fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_product_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Create index for premium users
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON public.profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);

-- Comment
COMMENT ON COLUMN public.profiles.is_premium IS 'Whether user has active premium subscription';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Polar subscription status: none, active, trialing, canceled, revoked';
COMMENT ON COLUMN public.profiles.subscription_id IS 'Polar subscription ID';
COMMENT ON COLUMN public.profiles.subscription_expires_at IS 'When the current subscription period ends';
