
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error selecting subscriptions:', error);
  } else {
    console.log('Subscriptions sample:', data);
  }

  const { data: columns, error: colError } = await supabase.rpc('get_schema_info');
  // I can't easily call rpc if it doesn't exist. I'll just rely on the select '*' keys.
}

checkSchema();
