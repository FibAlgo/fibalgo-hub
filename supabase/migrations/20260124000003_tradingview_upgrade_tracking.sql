-- =====================================================
-- Polar Integration - TradingView Upgrade Tracking
-- =====================================================
-- This migration adds support for tracking users who 
-- upgrade to Ultimate via Polar and need TradingView access

-- 1. Create TradingView upgrade tracking table
-- This tracks users who upgraded to Ultimate but haven't received TradingView access yet
CREATE TABLE IF NOT EXISTS public.tradingview_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  tradingview_id TEXT, -- Current TradingView ID if user has one
  new_plan TEXT NOT NULL, -- The plan they upgraded to (ultimate)
  polar_subscription_id TEXT,
  is_granted BOOLEAN DEFAULT false, -- Admin marks as granted on TradingView
  granted_at TIMESTAMPTZ,
  granted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tradingview_upgrades_user_id ON public.tradingview_upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_tradingview_upgrades_is_granted ON public.tradingview_upgrades(is_granted);

-- Enable RLS
ALTER TABLE public.tradingview_upgrades ENABLE ROW LEVEL SECURITY;

-- Admin-only policy
CREATE POLICY "Admins can manage tradingview_upgrades" ON public.tradingview_upgrades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
