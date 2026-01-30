import { createClient } from '@/lib/supabase/server';
import CommunityClient from './CommunityClient';

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userProfile = null;
  
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    userProfile = data;
  }

  return <CommunityClient initialUser={userProfile} />;
}
