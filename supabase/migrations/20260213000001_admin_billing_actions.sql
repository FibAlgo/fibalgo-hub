-- Admin billing actions: tracks cancel/refund actions done from admin panel
-- These serve as reminders for admin to process on CopeCart
CREATE TABLE IF NOT EXISTS admin_billing_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('cancel', 'refund')),
  user_email TEXT,
  user_name TEXT,
  plan TEXT,
  invoice_number TEXT,
  amount TEXT,
  admin_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_billing_actions_created ON admin_billing_actions(created_at DESC);

-- RLS
ALTER TABLE admin_billing_actions ENABLE ROW LEVEL SECURITY;

-- Only service role can access (admin API uses service role)
CREATE POLICY "Service role full access" ON admin_billing_actions
  FOR ALL USING (true) WITH CHECK (true);
