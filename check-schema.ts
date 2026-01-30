import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  "https://votjcpabuofvmghugkdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkSchema() {
  try {
    console.log('Checking users table schema...');

    // Try to select verification columns
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, verification_token, verification_token_expires, email_verified')
      .limit(1);

    if (error) {
      console.log('Error accessing verification columns:', error.message);
      console.log('This suggests the columns may not exist in the database.');

      // Try basic columns
      const { data: basicData, error: basicError } = await supabaseAdmin
        .from('users')
        .select('id, email, role, created_at')
        .limit(1);

      if (basicError) {
        console.log('Error accessing basic columns:', basicError.message);
      } else {
        console.log('Basic columns exist. Sample user:', basicData?.[0]);
      }
    } else {
      console.log('Verification columns exist. Sample data:', data?.[0]);
    }

    // Check verification_codes table
    console.log('\nChecking verification_codes table...');
    const { data: codesData, error: codesError } = await supabaseAdmin
      .from('verification_codes')
      .select('id, email, type, expires_at')
      .limit(1);

    if (codesError) {
      console.log('Error accessing verification_codes:', codesError.message);
    } else {
      console.log('verification_codes table exists. Sample:', codesData?.[0]);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkSchema();