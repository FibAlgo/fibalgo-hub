import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fixTrigger() {
  try {
    const sql = readFileSync('fix_auth_trigger.sql', 'utf8');

    // Execute the SQL directly
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: sql
    });

    if (error) {
      console.error('Error executing SQL:', error);
      return;
    }

    console.log('Trigger fixed successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}

fixTrigger();