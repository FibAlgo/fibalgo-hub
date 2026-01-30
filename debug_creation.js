
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://votjcpabuofvmghugkdq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E";

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTriggers() {
  // Query to get triggers. This requires querying pg_trigger. 
  // Function to do this usually needs to be RPC or direct SQL if allowed. 
  // Let's assume there is no RPC. I will try to use the 'check_schema' approach but triggers are metadata.
  
  // Since I can't run SQL directly on schema metadata easily without admin rights/RPC in this environment setup (client lib),
  // I will check if there is any suspicious column value in the subscription that might cause a 'computed' value.
  
  // But wait! 
  // Maybe "ultimate" is coming from a JOIN?
  // No, `getUser` selects `*` from `subscriptions`.
  
  // Let's create a test user via script and see what happens.
  
  // Script to:
  // 1. Create a user (using specific details to avoid conflict)
  // 2. Read the user subscription immediately.
  // 3. If it's Ultimate, we know it's creation/trigger logic.
    
  const email = `test_debug_${Date.now()}@example.com`;
  const password = "TestPassword123!";
  
  console.log(`Creating user: ${email}`);
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Debug User' }
  });
  
  if (authError) {
    console.error('Auth create error:', authError);
    return;
  }
  
  const userId = authData.user.id;
  console.log(`User created: ${userId}`);
  
  // Wait a moment for triggers
  await new Promise(r => setTimeout(r, 2000));
  
  // Check subscription
  const { data: subs, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId);
    
  if (subError) {
    console.error('Sub fetch error:', subError);
  } else {
    console.log('Subscriptions:', subs);
  }
  
  // Cleanup
  // await supabase.auth.admin.deleteUser(userId);
}

listTriggers();
