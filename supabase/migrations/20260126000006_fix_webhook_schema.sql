-- Fix schema to match webhook requirements
-- Run this migration to ensure all required columns exist

-- =============================================
-- 1. USERS TABLE - Add polar_customer_id
-- =============================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_polar_customer_id 
ON public.users(polar_customer_id);

-- =============================================
-- 2. SUBSCRIPTIONS TABLE - Add missing columns
-- =============================================
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_subscription_id 
ON public.subscriptions(polar_subscription_id);

-- =============================================
-- 3. BILLING_HISTORY TABLE - Add missing columns
-- =============================================
-- Add invoice_id (webhook uses this instead of invoice_number)
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS invoice_id TEXT;

-- Add plan_description (webhook uses this instead of description)
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS plan_description TEXT;

-- Add billing_reason (subscription_create, subscription_cycle, etc.)
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS billing_reason TEXT;

-- Add polar_order_id for duplicate detection
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS polar_order_id TEXT;

-- Add added_by for manual entries
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_billing_history_polar_order_id 
ON public.billing_history(polar_order_id);

-- =============================================
-- 4. VERIFY CONSTRAINTS
-- =============================================
-- Ensure billing_history status constraint includes all needed values
-- First drop existing constraint if exists, then recreate
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'billing_history_status_check' 
    AND table_name = 'billing_history'
  ) THEN
    ALTER TABLE public.billing_history DROP CONSTRAINT billing_history_status_check;
  END IF;
  
  -- Add new constraint with correct values
  ALTER TABLE public.billing_history 
  ADD CONSTRAINT billing_history_status_check 
  CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));
EXCEPTION
  WHEN others THEN
    NULL; -- Ignore if constraint already correct
END $$;

-- Ensure subscriptions status constraint includes all needed values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subscriptions_status_check' 
    AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_status_check;
  END IF;
  
  ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'suspended'));
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- =============================================
-- 5. GRANT PERMISSIONS
-- =============================================
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.billing_history TO service_role;
