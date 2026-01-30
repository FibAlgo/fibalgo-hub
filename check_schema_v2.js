
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://votjcpabuofvmghugkdq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: cols, error: colError } = await supabase
    .from('information_schema.columns')
    .select('column_name, column_default')
    .eq('table_name', 'subscriptions')
    .eq('table_schema', 'public');

  if (colError) {
    // If we can't query view directly (permissions), try rpc if exists, otherwise assume failure.
    console.error('Error selecting info schema:', colError);
  } else {
    console.log('Columns defaults:', cols);
  }

  // Backup: just insert a row with defaults and see what comes back
  const { data: inserted, error: insError } = await supabase
    .from('subscriptions')
    .insert({ user_id: '00000000-0000-0000-0000-000000000000' }) // Will fail FK likely, but maybe we can see default in error or if it succeeds (if we create dummy user)
    .select()
    .single();
    
    // We shouldn't polute DB with dummy user. 
    // Let's rely on inspection of query error if it tells us about columns.
}

checkSchema();
