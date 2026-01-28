-- =====================================================
-- RELAX AUTH USER TRIGGER TO PREVENT SIGNUP FAILURES
-- =====================================================

-- Ensure required columns exist (safe)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'email';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Replace handle_new_user with a safe, non-failing version
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

  -- Try to upsert by id
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
  EXCEPTION WHEN unique_violation THEN
    -- Email already exists with a different id; update that row without changing id
    UPDATE public.users
    SET 
      full_name = COALESCE(NULLIF(full_name, ''), user_name),
      avatar_url = COALESCE(user_avatar, avatar_url),
      account_type = COALESCE(NEW.raw_app_meta_data->>'provider', account_type),
      updated_at = NOW()
    WHERE LOWER(email) = LOWER(NEW.email);
  WHEN OTHERS THEN
    -- Do not block auth signup on public.users issues
    RAISE NOTICE 'handle_new_user failed: %', SQLERRM;
  END;

  -- Keep name column in sync if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name'
  ) THEN
    UPDATE public.users
    SET name = COALESCE(NULLIF(name, ''), user_name)
    WHERE id = NEW.id OR LOWER(email) = LOWER(NEW.email);
  END IF;

  -- Create basic subscription for new users (non-blocking)
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
      IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id) THEN
        INSERT INTO public.subscriptions (user_id, plan_id, plan_name, status, started_at, expires_at, auto_renew, tradingview_access_granted)
        VALUES (NEW.id, 'basic', 'basic', 'active', NOW(), NULL, true, false);
      END IF;

      -- Optional columns if present
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan'
      ) THEN
        EXECUTE 'UPDATE public.subscriptions SET plan = $1 WHERE user_id = $2' USING 'basic', NEW.id;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'start_date'
      ) THEN
        EXECUTE 'UPDATE public.subscriptions SET start_date = $1 WHERE user_id = $2' USING CURRENT_DATE, NEW.id;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'is_active'
      ) THEN
        EXECUTE 'UPDATE public.subscriptions SET is_active = $1 WHERE user_id = $2' USING true, NEW.id;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'days_remaining'
      ) THEN
        EXECUTE 'UPDATE public.subscriptions SET days_remaining = $1 WHERE user_id = $2' USING -1, NEW.id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'subscription init failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
