// Run database migration using Supabase Admin API
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://votjcpabuofvmghugkdq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log('Starting migration...\n');

  // 1. Check if polar_subscription_id exists in subscriptions
  const { data: subCols, error: subColsErr } = await supabase
    .from('subscriptions')
    .select('*')
    .limit(1);
  
  console.log('1. Subscriptions table accessible:', !subColsErr);
  
  // 2. Check if polar_customer_id exists in users
  const { data: userCols, error: userColsErr } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  console.log('2. Users table accessible:', !userColsErr);

  // 3. Try to check tradingview_downgrades table
  const { data: tvData, error: tvErr } = await supabase
    .from('tradingview_downgrades')
    .select('*')
    .limit(1);
  
  if (tvErr && tvErr.message.includes('does not exist')) {
    console.log('3. tradingview_downgrades table: NOT EXISTS - needs to be created');
  } else if (tvErr) {
    console.log('3. tradingview_downgrades table error:', tvErr.message);
  } else {
    console.log('3. tradingview_downgrades table: EXISTS');
  }

  // 4. Check billing_history for polar_order_id
  const { data: bhData, error: bhErr } = await supabase
    .from('billing_history')
    .select('*')
    .limit(1);
  
  console.log('4. Billing history table accessible:', !bhErr);

  console.log('\n--- MIGRATION SQL ---');
  console.log('Since Supabase REST API cannot run DDL statements,');
  console.log('please run the SQL in Supabase Dashboard > SQL Editor:\n');
  
  console.log(`
-- Run this in Supabase SQL Editor:

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;

CREATE TABLE IF NOT EXISTS public.tradingview_downgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  tradingview_id TEXT,
  previous_plan TEXT NOT NULL,
  downgrade_reason TEXT,
  polar_subscription_id TEXT,
  is_removed BOOLEAN DEFAULT false,
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_tradingview_downgrades_user_id ON public.tradingview_downgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_tradingview_downgrades_is_removed ON public.tradingview_downgrades(is_removed);

ALTER TABLE public.tradingview_downgrades ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage tradingview_downgrades') THEN
    CREATE POLICY "Admins can manage tradingview_downgrades" ON public.tradingview_downgrades
      FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS polar_order_id TEXT;

ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS invoice_url TEXT;

ALTER TABLE public.refund_requests 
ADD COLUMN IF NOT EXISTS polar_order_id TEXT;

ALTER TABLE public.refund_requests 
ADD COLUMN IF NOT EXISTS polar_refund_id TEXT;

ALTER TABLE public.refund_requests 
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);
  `);
}

runMigration().catch(console.error);
