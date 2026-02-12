import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET /api/dev/i18n-admin
 * Returns { isAdmin: true/false } for the currently logged-in user.
 * Used by I18nDevWidget to conditionally render only for admin users.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ isAdmin: false });
    }

    // Look up user role in DB — try email first, then ID
    let role: string | null = null;

    if (user.email) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('role')
        .ilike('email', user.email)
        .single();
      if (data) role = data.role;
    }

    if (!role) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (data) role = data.role;
    }

    const isAdmin = role === 'admin' || role === 'super_admin';
    return NextResponse.json({ isAdmin });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
