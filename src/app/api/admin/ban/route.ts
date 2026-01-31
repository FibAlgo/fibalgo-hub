import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, getErrorStatus, maskEmail } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST - Ban a user
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session (not client-provided adminId)
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`[Admin Ban] Admin ${maskEmail(adminUser.email)} banning user ${userId}`);

    // Prevent banning admins
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (targetUser?.role === 'admin' || targetUser?.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot ban admin or super admin users' }, { status: 403 });
    }

    // Update user's ban status
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        ban_reason: reason || 'Violation of terms of service',
      })
      .eq('id', userId);

    if (error) {
      console.error('Error banning user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optionally: Revoke all sessions for this user
    // This will force them to log out immediately
    try {
      await supabaseAdmin.auth.admin.signOut(userId, 'global');
    } catch (e) {
      console.warn('Could not revoke user sessions:', e);
    }

    return NextResponse.json({ success: true, message: 'User has been banned' });
  } catch (error) {
    console.error('Ban API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Unban a user
export async function DELETE(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`[Admin Unban] Admin ${maskEmail(adminUser.email)} unbanning user ${userId}`);

    // Remove ban
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        is_banned: false,
        banned_at: null,
        ban_reason: null,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error unbanning user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User has been unbanned' });
  } catch (error) {
    console.error('Unban API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get banned users list
export async function GET() {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const { data: bannedUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, banned_at, ban_reason')
      .eq('is_banned', true)
      .order('banned_at', { ascending: false });

    if (error) {
      console.error('Error fetching banned users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(bannedUsers || []);
  } catch (error) {
    console.error('Get banned users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
