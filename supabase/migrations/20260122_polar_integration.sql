-- =====================================================
-- POLAR PAYMENT INTEGRATION - DATABASE MIGRATION
-- =====================================================
-- Run this SQL in Supabase SQL Editor to add Polar-related columns
-- Supabase Dashboard > SQL Editor > New Query > Paste & Run

-- Add polar_customer_id to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_polar_customer_id 
ON public.users(polar_customer_id);

-- Add polar-related columns to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS polar_order_id TEXT,
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'polar';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_subscription_id 
ON public.subscriptions(polar_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_order_id 
ON public.subscriptions(polar_order_id);

-- Optional: Create a polar_payments table for tracking all payments
CREATE TABLE IF NOT EXISTS public.polar_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  polar_order_id TEXT NOT NULL,
  polar_customer_id TEXT,
  polar_subscription_id TEXT,
  product_name TEXT,
  plan TEXT,
  amount INTEGER, -- Amount in cents
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'paid',
  environment TEXT DEFAULT 'sandbox', -- 'sandbox' or 'production'
  webhook_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on polar_payments
ALTER TABLE public.polar_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payments
CREATE POLICY "Users can view own payments" ON public.polar_payments
  FOR SELECT USING (user_id = auth.uid());

-- Policy: Admins can view all payments
CREATE POLICY "Admins can view all payments" ON public.polar_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify the migration:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'polar_customer_id';
