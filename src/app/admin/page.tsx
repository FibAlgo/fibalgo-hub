import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function AdminPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Check if user is admin - try by ID first, then by email
  let userData = null;
  
  const { data: userById } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (userById) {
    userData = userById;
  } else if (user.email) {
    // Try by email
    const { data: userByEmail } = await supabaseAdmin
      .from('users')
      .select('role')
      .ilike('email', user.email)
      .single();
    userData = userByEmail;
  }

  console.log('Admin check - user:', user.email, 'role:', userData?.role);

  if (userData?.role !== 'admin') {
    redirect('/dashboard');
  }

  return <AdminDashboardClient userId={user.id} />;
}
