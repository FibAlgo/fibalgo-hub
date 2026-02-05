-- Purchase Tokens Table
-- One-time use tokens for activating Premium/Ultimate plans after CopeCart purchase

CREATE TABLE IF NOT EXISTS public.purchase_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL, -- Unique activation token
  plan TEXT NOT NULL CHECK (plan IN ('premium', 'ultimate')),
  
  -- Security info
  client_ip TEXT, -- IP that requested the token
  referrer TEXT, -- Referrer URL for auditing
  
  -- Token status
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES public.users(id),
  
  -- Expiration (tokens expire after 10 minutes if not used)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_tokens_token ON public.purchase_tokens(token);
CREATE INDEX IF NOT EXISTS idx_purchase_tokens_client_ip ON public.purchase_tokens(client_ip);
CREATE INDEX IF NOT EXISTS idx_purchase_tokens_used ON public.purchase_tokens(used);
CREATE INDEX IF NOT EXISTS idx_purchase_tokens_expires ON public.purchase_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_purchase_tokens_created ON public.purchase_tokens(created_at);

-- Cleanup function to delete expired tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.purchase_tokens
  WHERE expires_at < NOW() AND used = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.purchase_tokens ENABLE ROW LEVEL SECURITY;

-- Admins can view all tokens
DROP POLICY IF EXISTS "Admins can view all purchase tokens" ON public.purchase_tokens;
CREATE POLICY "Admins can view all purchase tokens" ON public.purchase_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
    )
  );

-- Users can view their own used tokens
DROP POLICY IF EXISTS "Users can view their own used tokens" ON public.purchase_tokens;
CREATE POLICY "Users can view their own used tokens" ON public.purchase_tokens
  FOR SELECT USING (used_by_user_id = auth.uid());

COMMENT ON TABLE public.purchase_tokens IS 'One-time activation tokens for CopeCart purchases. Tokens expire after 10 minutes.';
