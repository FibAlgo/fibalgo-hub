
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://votjcpabuofvmghugkdq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDowngrade() {
  // Use the user ID from the sample row or a known user
  const userId = '6d8ba693-79aa-4483-b6ef-d3a67d4f5b79'; // From check_schema_v2 output

  console.log(`Checking user ${userId}`);
  
  let { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single();
  console.log('Before:', sub.plan);

  console.log('Downgrading...');
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan: 'basic',
      status: 'active',
      end_date: null,
      days_remaining: -1,
      is_active: true,
    })
    .eq('user_id', userId);

  if (error) console.error('Error:', error);
  
  let { data: subAfter } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single();
  console.log('After:', subAfter.plan);
}

testDowngrade();
