-- =====================================================
-- SYNC AUTH.USERS TO PUBLIC.USERS TRIGGER
-- =====================================================
-- This trigger ensures that when a user signs up via Google OAuth or Email,
-- their public.users record uses the same ID as auth.users.
-- This prevents ID mismatch issues.

-- Function to handle new user signups
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
      
      -- Update all related tables to use new ID
      UPDATE public.subscriptions SET user_id = NEW.id WHERE user_id = existing_user_id;
      UPDATE public.billing_history SET user_id = NEW.id WHERE user_id = existing_user_id;
      UPDATE public.refund_requests SET user_id = NEW.id WHERE user_id = existing_user_id;
      UPDATE public.cancellation_requests SET user_id = NEW.id WHERE user_id = existing_user_id;
      UPDATE public.tradingview_downgrades SET user_id = NEW.id WHERE user_id = existing_user_id;
      UPDATE public.polar_payments SET user_id = NEW.id WHERE user_id = existing_user_id;
      UPDATE public.tickets SET user_id = NEW.id WHERE user_id = existing_user_id;
      UPDATE public.ticket_messages SET user_id = NEW.id WHERE user_id = existing_user_id;
      UPDATE public.notification_preferences SET user_id = NEW.id WHERE user_id = existing_user_id;
      
      -- Delete old user record
      DELETE FROM public.users WHERE id = existing_user_id;
      
      -- Insert new user record with correct ID
      INSERT INTO public.users (id, email, name, role, avatar_url, account_type, created_at, updated_at)
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
        name = COALESCE(NULLIF(name, ''), user_name),
        account_type = COALESCE(NEW.raw_app_meta_data->>'provider', account_type),
        updated_at = NOW()
      WHERE id = NEW.id;
    END IF;
  ELSE
    -- User doesn't exist - create new record
    INSERT INTO public.users (id, email, name, role, avatar_url, account_type, created_at, updated_at)
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
      name = COALESCE(NULLIF(public.users.name, ''), EXCLUDED.name),
      account_type = COALESCE(EXCLUDED.account_type, public.users.account_type),
      updated_at = NOW();
      
    -- Create basic subscription for new users
    INSERT INTO public.subscriptions (user_id, plan, status, is_active, start_date, days_remaining)
    VALUES (NEW.id, 'basic', 'active', true, CURRENT_DATE, -1)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates (for email verification, etc.)
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;
GRANT ALL ON public.subscriptions TO supabase_auth_admin;
GRANT ALL ON public.billing_history TO supabase_auth_admin;
GRANT ALL ON public.refund_requests TO supabase_auth_admin;
GRANT ALL ON public.cancellation_requests TO supabase_auth_admin;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
  ) THEN
    GRANT ALL ON public.tickets TO supabase_auth_admin;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ticket_messages'
  ) THEN
    GRANT ALL ON public.ticket_messages TO supabase_auth_admin;
  END IF;
END $$;
GRANT ALL ON public.notification_preferences TO supabase_auth_admin;
