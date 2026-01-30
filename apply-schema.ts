import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  "https://votjcpabuofvmghugkdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function applyVerificationSchema() {
  try {
    console.log('Applying verification schema changes...');

    // Add verification columns to users table
    const alterQueries = [
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_token TEXT;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;`
    ];

    for (const query of alterQueries) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql: query });
        if (error) {
          console.log(`Query failed (might be expected): ${query.substring(0, 50)}...`);
          console.log('Error:', error.message);
        } else {
          console.log(`Applied: ${query.split('ADD COLUMN')[1]?.split(' ')[1] || 'column'}`);
        }
      } catch (err) {
        console.log(`Query failed: ${query.substring(0, 50)}...`);
      }
    }

    // Backfill name for existing users
    const { error: backfillError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `UPDATE public.users SET name = COALESCE(name, full_name, split_part(email, '@', 1)) WHERE name IS NULL;`
    });

    if (backfillError) {
      console.log('Backfill failed (might be expected):', backfillError.message);
    } else {
      console.log('Backfilled names for existing users');
    }

    console.log('Schema updates completed');

    // Test the columns exist
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, verification_token, verification_token_expires, email_verified')
      .limit(1);

    if (error) {
      console.log('Columns still not accessible:', error.message);
    } else {
      console.log('Verification columns now exist. Sample:', data?.[0]);
    }

  } catch (err) {
    console.error('Error applying schema:', err);
  }
}

applyVerificationSchema();