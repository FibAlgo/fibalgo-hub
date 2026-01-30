-- Ensure subscriptions.user_id supports ON CONFLICT upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_user_id_unique'
      AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
