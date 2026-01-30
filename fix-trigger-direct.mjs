import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=');
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      envVars[key.trim()] = value;
    }
  }
});

const supabaseAdmin = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fixTrigger() {
  try {
    console.log('Dropping problematic trigger...');

    // First, drop the problematic trigger
    const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;'
    });

    if (dropError) {
      console.error('Error dropping trigger:', dropError);
      return;
    }

    console.log('Trigger dropped successfully.');

    // Now create a safe trigger
    const safeTriggerSQL = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Safe user creation - don't fail if public.users operations fail
  BEGIN
    INSERT INTO public.users (id, email, full_name, role, account_type, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'user',
      COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(NULLIF(public.users.full_name, ''), EXCLUDED.full_name),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'handle_new_user: Failed to create user record: %', SQLERRM;
  END;

  -- Safe subscription creation
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
      INSERT INTO public.subscriptions (user_id, plan_id, plan_name, status, started_at, expires_at, auto_renew, tradingview_access_granted)
      VALUES (NEW.id, 'basic', 'basic', 'active', NOW(), NULL, true, false)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'handle_new_user: Failed to create subscription: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
`;

    const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
      sql: safeTriggerSQL
    });

    if (createError) {
      console.error('Error creating safe trigger:', createError);
      return;
    }

    console.log('Safe trigger created successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}

fixTrigger();