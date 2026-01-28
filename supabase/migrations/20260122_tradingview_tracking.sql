-- =====================================================
-- Polar Integration - TradingView Downgrade Tracking
-- =====================================================
-- This migration adds support for tracking users who 
-- downgrade from Ultimate to Basic for TradingView access removal

-- 1. Add polar_subscription_id to subscriptions table if not exists
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

-- 2. Add polar_customer_id to users table if not exists  
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;

-- 3. Create TradingView downgrade tracking table
-- This tracks users whose TradingView access needs to be removed manually
CREATE TABLE IF NOT EXISTS public.tradingview_downgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  tradingview_id TEXT,
  previous_plan TEXT NOT NULL,
  downgrade_reason TEXT, -- 'subscription_canceled', 'subscription_revoked', 'payment_failed', 'refunded'
  polar_subscription_id TEXT,
  is_removed BOOLEAN DEFAULT false, -- Admin marks as removed from TradingView
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tradingview_downgrades_user_id ON public.tradingview_downgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_tradingview_downgrades_is_removed ON public.tradingview_downgrades(is_removed);

-- Enable RLS
ALTER TABLE public.tradingview_downgrades ENABLE ROW LEVEL SECURITY;

-- Admin-only policy
CREATE POLICY "Admins can manage tradingview_downgrades" ON public.tradingview_downgrades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Add polar_order_id and invoice_url to billing_history for refund tracking and invoice access
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS polar_order_id TEXT;

ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- 5. Add polar-related columns to refund_requests if not exists
ALTER TABLE public.refund_requests 
ADD COLUMN IF NOT EXISTS polar_order_id TEXT,
ADD COLUMN IF NOT EXISTS polar_refund_id TEXT,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);

-- =====================================================
-- IMPORTANT: After running this migration:
-- 1. Go to Polar Dashboard > Webhooks
-- 2. Add webhook URL: https://your-domain.com/api/polar/webhook
-- 3. Select events: order.paid, subscription.*, order.refunded
-- =====================================================
