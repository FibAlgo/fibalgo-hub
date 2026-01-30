-- =====================================================
-- FIX NEW USER PLAN ASSIGNMENT - IMPROVED ROBUSTNESS
-- =====================================================
-- Ensures that new users are assigned the 'basic' plan correctly.
-- Handles orphaned public.users rows by deleting them to allow fresh auth signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_avatar TEXT;
BEGIN
  -- Extract name from metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Extract avatar from metadata
  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  -- 1. Handle orphaned users: Delete any existing public.users row with same email but different ID
  -- This prevents "unique constraint 'users_email_key'" errors if Auth ID changes
  BEGIN
    DELETE FROM public.users 
    WHERE email = NEW.email AND id != NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to cleanup old user %: %', NEW.email, SQLERRM;
  END;

  -- 2. Create/Update User in public.users
  BEGIN
    INSERT INTO public.users (id, email, full_name, role, avatar_url, account_type, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      'user',
      user_avatar,
      COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(public.users.full_name, ''), EXCLUDED.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
      account_type = COALESCE(EXCLUDED.account_type, public.users.account_type),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Log and re-raise, this is critical
    RAISE EXCEPTION 'Public user creation failed for %: %', NEW.id, SQLERRM;
  END;

  -- 3. Create Basic Subscription (Basic Plan)
  -- Uses nested blocks to try modern schema first, then fallback
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id) THEN
      
      -- ATTEMPT 1: Modern schema (plan, start_date, days_remaining)
      BEGIN
        INSERT INTO public.subscriptions (user_id, plan, status, is_active, start_date, days_remaining)
        VALUES (NEW.id, 'basic', 'active', true, CURRENT_DATE, -1);
      EXCEPTION WHEN OTHERS THEN
        
        -- ATTEMPT 2: Fallback schema (plan_id, plan_name, started_at)
        BEGIN
          INSERT INTO public.subscriptions (user_id, plan_id, plan_name, status, started_at, is_active)
          VALUES (NEW.id, 'basic', 'basic', 'active', NOW(), true);
        EXCEPTION WHEN OTHERS THEN
          -- Log warning but do NOT fail the transaction. 
          -- Allow user creation to proceed even if subscription init fails.
          RAISE WARNING 'Subscription init failed for user %: %', NEW.id, SQLERRM;
        END;
        
      END;
      
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
