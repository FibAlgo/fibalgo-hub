-- Fix the handle_new_user trigger to prevent signup failures
-- This creates a safe, non-blocking trigger function

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

  -- Extract avatar from metadata (Google OAuth)
  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  -- Try to upsert user record safely
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
      full_name = COALESCE(NULLIF(public.users.full_name, ''), EXCLUDED.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
      account_type = COALESCE(EXCLUDED.account_type, public.users.account_type),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block auth signup
    RAISE NOTICE 'handle_new_user failed to create user record: %', SQLERRM;
  END;

  -- Try to create basic subscription (non-blocking)
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
      INSERT INTO public.subscriptions (user_id, plan_id, plan_name, status, started_at, expires_at, auto_renew, tradingview_access_granted)
      VALUES (NEW.id, 'basic', 'basic', 'active', NOW(), NULL, true, false)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't block
    RAISE NOTICE 'handle_new_user failed to create subscription: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also ensure the update trigger exists
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email verification status if the column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
      UPDATE public.users
      SET email_verified = true, updated_at = NOW()
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();