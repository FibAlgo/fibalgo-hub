import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, getErrorStatus } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET - List all admin billing action notifications (cancel/refund reminders)
 */
export async function GET() {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return NextResponse.json({ error: authError }, { status: getErrorStatus(authError) });
    }

    const { data, error } = await supabaseAdmin
      .from('admin_billing_actions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching billing actions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Remove a billing action notification (after CopeCart processes it)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return NextResponse.json({ error: authError }, { status: getErrorStatus(authError) });
    }

    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('id');

    if (!actionId) {
      return NextResponse.json({ error: 'Missing action id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('admin_billing_actions')
      .delete()
      .eq('id', actionId);

    if (error) {
      console.error('Error deleting billing action:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
