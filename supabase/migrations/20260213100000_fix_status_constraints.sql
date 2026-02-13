-- Fix billing_history status constraint to include 'cancelled' and 'paid'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'billing_history_status_check' 
    AND table_name = 'billing_history'
  ) THEN
    ALTER TABLE public.billing_history DROP CONSTRAINT billing_history_status_check;
  END IF;

  ALTER TABLE public.billing_history 
  ADD CONSTRAINT billing_history_status_check 
  CHECK (status IN ('pending', 'completed', 'paid', 'failed', 'refunded', 'cancelled'));
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Fix subscriptions status constraint to include 'refunded'
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
  CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'suspended', 'refunded'));
EXCEPTION
  WHEN others THEN NULL;
END $$;
