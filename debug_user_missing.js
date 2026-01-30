
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://votjcpabuofvmghugkdq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const email = 'burakbagdatli07@gmail.com';
  console.log(`Checking user: ${email}`);

  // Check public.users
  const { data: publicData, error: publicError } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email);

  if (publicError) {
    console.log('Public user check error:', publicError.message);
  } else {
    console.log(`Found ${publicData.length} users in public.users`);
    publicData.forEach(u => console.log(' - ' + u.id));
  }

  // Check auth.users (pagination)
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  
  if (authError) {
    console.log('Auth check error:', authError.message);
  } else {
    const authUser = authUsers.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (authUser) {
      console.log('Found in auth.users:', authUser.id);
      
      // If missing in public, propose fix
      if (!publicUser) {
        console.log('MISSING IN PUBLIC USERS! Attempting to create...');
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: email,
            name: authUser.user_metadata?.full_name || 'User',
            role: 'user',
            created_at: authUser.created_at
          });
          
        if (insertError) {
           console.log('Insert failed:', insertError);
           // Maybe ID conflict (if auth ID != public ID expected format?)
        } else {
           console.log('Successfully restored user in public.users');
        }
      }
    } else {
      console.log('User not found in auth.users');
    }
  }
}

checkUser();
