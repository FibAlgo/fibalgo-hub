import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  "https://votjcpabuofvmghugkdq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function cleanupVerifications() {
  try {
    console.log('Checking users table for verification data...');

    // Check users with verification tokens
    const { data: usersWithTokens, error: tokenError } = await supabaseAdmin
      .from('users')
      .select('id, email, verification_token, verification_token_expires, email_verified')
      .not('verification_token', 'is', null);

    if (tokenError) {
      console.error('Error checking tokens:', tokenError);
    } else {
      console.log('Users with verification tokens:', usersWithTokens?.length || 0);
      if (usersWithTokens && usersWithTokens.length > 0) {
        console.log('Users:', usersWithTokens.map(u => ({
          email: u.email,
          token: u.verification_token?.substring(0, 10) + '...',
          expires: u.verification_token_expires
        })));
      }
    }

    // Clear all verification tokens
    console.log('Clearing all verification tokens...');
    const { error: clearError } = await supabaseAdmin
      .from('users')
      .update({
        verification_token: null,
        verification_token_expires: null,
        email_verified: false
      })
      .not('verification_token', 'is', null);

    if (clearError) {
      console.error('Error clearing tokens:', clearError);
    } else {
      console.log('Verification tokens cleared successfully');
    }

    // Check verification_codes table
    console.log('Checking verification_codes table...');
    try {
      const { data: codes, error: codesError } = await supabaseAdmin
        .from('verification_codes')
        .select('id, email, type, expires_at')
        .gt('expires_at', new Date().toISOString());

      if (codesError) {
        console.log('verification_codes table might not exist or error:', codesError.message);
      } else {
        console.log('Active verification codes:', codes?.length || 0);

        // Clear expired codes
        const { error: deleteError } = await supabaseAdmin
          .from('verification_codes')
          .delete()
          .lt('expires_at', new Date().toISOString());

        if (deleteError) {
          console.error('Error deleting expired codes:', deleteError);
        } else {
          console.log('Expired verification codes cleaned up');
        }
      }
    } catch (err) {
      console.log('verification_codes table operations failed:', err);
    }

    console.log('Database cleanup completed');
  } catch (err) {
    console.error('Error:', err);
  }
}

cleanupVerifications();