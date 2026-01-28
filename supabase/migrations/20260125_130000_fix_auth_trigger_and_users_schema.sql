-- =====================================================
-- FIX AUTH TRIGGER + USERS SCHEMA MISMATCHES
-- =====================================================

-- 1. USERS TABLE FIXES (columns used by API)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS verification_token TEXT;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

-- Backfill name for existing users
UPDATE public.users
SET name = COALESCE(name, full_name, split_part(email, '@', 1))
WHERE name IS NULL;

-- 2. REPLACE handle_new_user TRIGGER WITH SAFE INSERTS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_user_id UUID;
  user_role TEXT := 'user';
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

  -- Check if user already exists by email (case-insensitive)
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE LOWER(email) = LOWER(NEW.email);

  IF existing_user_id IS NOT NULL THEN
    -- User exists with different ID - update the ID to match auth
    IF existing_user_id != NEW.id THEN
      -- First, get the current role (preserve admin role)
      SELECT role INTO user_role
      FROM public.users
      WHERE id = existing_user_id;

      -- Update all related tables to use new ID (only if tables exist)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        EXECUTE 'UPDATE public.subscriptions SET user_id = $1 WHERE user_id = $2' USING NEW.id, existing_user_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_history') THEN
        EXECUTE 'UPDATE public.billing_history SET user_id = $1 WHERE user_id = $2' USING NEW.id, existing_user_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refund_requests') THEN
        EXECUTE 'UPDATE public.refund_requests SET user_id = $1 WHERE user_id = $2' USING NEW.id, existing_user_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cancellation_requests') THEN
        EXECUTE 'UPDATE public.cancellation_requests SET user_id = $1 WHERE user_id = $2' USING NEW.id, existing_user_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tradingview_downgrades') THEN
        EXECUTE 'UPDATE public.tradingview_downgrades SET user_id = $1 WHERE user_id = $2' USING NEW.id, existing_user_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'polar_payments') THEN
        EXECUTE 'UPDATE public.polar_payments SET user_id = $1 WHERE user_id = $2' USING NEW.id, existing_user_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
        EXECUTE 'UPDATE public.support_tickets SET user_id = $1 WHERE user_id = $2' USING NEW.id, existing_user_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_messages') THEN
        EXECUTE 'UPDATE public.ticket_messages SET user_id = $1 WHERE user_id = $2' USING NEW.id, existing_user_id;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'ticket_messages' AND column_name = 'sender_id'
        ) THEN
          EXECUTE 'UPDATE public.ticket_messages SET sender_id = $1 WHERE sender_id = $2' USING NEW.id, existing_user_id;
        END IF;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_preferences') THEN
        EXECUTE 'UPDATE public.notification_preferences SET user_id = $1 WHERE user_id = $2' USING NEW.id, existing_user_id;
      END IF;

      -- Delete old user record
      DELETE FROM public.users WHERE id = existing_user_id;

      -- Insert new user record with correct ID
      INSERT INTO public.users (id, email, full_name, role, avatar_url, account_type, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        user_name,
        COALESCE(user_role, 'user'),
        user_avatar,
        COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        NOW(),
        NOW()
      );
    ELSE
      -- IDs match, just update metadata if needed
      UPDATE public.users
      SET 
        avatar_url = COALESCE(user_avatar, avatar_url),
        full_name = COALESCE(NULLIF(full_name, ''), user_name),
        account_type = COALESCE(NEW.raw_app_meta_data->>'provider', account_type),
        updated_at = NOW()
      WHERE id = NEW.id;
    END IF;
  ELSE
    -- User doesn't exist - create new record
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
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
      full_name = COALESCE(NULLIF(public.users.full_name, ''), EXCLUDED.full_name),
      account_type = COALESCE(EXCLUDED.account_type, public.users.account_type),
      updated_at = NOW();
  END IF;

  -- Keep name column in sync if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name'
  ) THEN
    EXECUTE 'UPDATE public.users SET name = COALESCE(NULLIF(name, ''''), $1) WHERE id = $2'
    USING user_name, NEW.id;
  END IF;

  -- Create basic subscription for new users (safe insert)
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also update the email verification trigger (safe: column exists now)
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email verification status
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users
    SET email_verified = true, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();
