
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://votjcpabuofvmghugkdq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdGpjcGFidW9mdm1naHVna2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODY0NTM2MCwiZXhwIjoyMDg0MjIxMzYwfQ.bROjwjVzeq3MX2C1BZve1dj8nyPjZmeFY3TyaCZbC2E";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixConflict() {
  const email = 'burakbagdatli06@gmail.com';
  console.log(`Cleaning up user: ${email}`);

  // 1. Check if user exists in public.users
  const { data: publicUsers, error: pubError } = await supabase
    .from('users')
    .select('id, email')
    .ilike('email', email);

  if (pubError) {
    console.error('Error finding public user:', pubError);
  } else if (publicUsers.length > 0) {
    console.log(`Found ${publicUsers.length} in public.users. Deleting...`);
    for (const u of publicUsers) {
      const { error: delError } = await supabase.from('users').delete().eq('id', u.id);
      if (delError) console.error('Delete failed:', delError);
      else console.log(`Deleted public user ${u.id}`);
    }
  } else {
    console.log('No public.users found.');
  }

  // 2. Check and delete from auth.users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const target = authUsers.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (target) {
    console.log(`Found in auth.users (${target.id}). Deleting...`);
    const { error: authDelError } = await supabase.auth.admin.deleteUser(target.id);
    if (authDelError) console.error('Auth delete failed:', authDelError);
    else console.log('Deleted auth user.');
  } else {
    console.log('No auth.users found.');
  }
}

fixConflict();
