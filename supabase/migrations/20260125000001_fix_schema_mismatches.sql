-- =====================================================
-- FIX SCHEMA MISMATCHES
-- =====================================================
-- This migration fixes column name mismatches between code and database

-- 1. USERS TABLE FIXES
-- Rename tradingview_username to trading_view_id if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'tradingview_username'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'trading_view_id'
  ) THEN
    ALTER TABLE public.users RENAME COLUMN tradingview_username TO trading_view_id;
  END IF;
END $$;

-- Add trading_view_id if doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS trading_view_id TEXT;

-- Add account_type for Google/Email login tracking
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'email';

-- Add is_banned for ban functionality
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Add banned_at and banned_by
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES public.users(id);

-- Add ban_reason
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- 2. SUBSCRIPTIONS TABLE FIXES
-- Add missing columns that code expects

-- Add 'plan' column if not exists (code uses 'plan', init used 'plan_id' and 'plan_name')
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'basic';

-- Add start_date and end_date (code uses these, init used started_at/expires_at)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add is_active
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add days_remaining
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS days_remaining INTEGER DEFAULT -1;

-- 3. BILLING_HISTORY TABLE FIXES
-- Rename description to plan_description if needed
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS plan_description TEXT;

-- Add invoice_id (code uses this, init used invoice_number)
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS invoice_id TEXT;

-- Add polar_order_id
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS polar_order_id TEXT;

-- Add billing_reason
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS billing_reason TEXT;

-- Add currency if not exists
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add payment_method if not exists
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'credit_card';

-- 4. REFUND_REQUESTS TABLE FIXES
-- Add polar_order_id
ALTER TABLE public.refund_requests 
ADD COLUMN IF NOT EXISTS polar_order_id TEXT;

-- Add polar_subscription_id  
ALTER TABLE public.refund_requests 
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

-- Add amount
ALTER TABLE public.refund_requests 
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);

-- Add currency
ALTER TABLE public.refund_requests 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add plan
ALTER TABLE public.refund_requests 
ADD COLUMN IF NOT EXISTS plan TEXT;

-- 5. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_trading_view_id ON public.users(trading_view_id);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON public.users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON public.subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_billing_history_polar_order_id ON public.billing_history(polar_order_id);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'subscriptions' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'billing_history' ORDER BY ordinal_position;
