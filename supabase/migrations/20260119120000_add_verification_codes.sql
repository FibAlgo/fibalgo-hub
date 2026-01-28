-- Verification codes table for email and password changes
-- Stores codes in database instead of in-memory for reliability

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email-change', 'password-change')),
  expires_at TIMESTAMPTZ NOT NULL,
  new_email TEXT,
  new_password_hash TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Index for quick lookup by email
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON public.verification_codes(email);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON public.verification_codes(expires_at);

-- Automatically delete expired codes (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.verification_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No RLS needed - this table is managed by service role only
