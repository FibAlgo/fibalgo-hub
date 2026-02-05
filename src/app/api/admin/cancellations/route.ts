import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, requireAuth, getErrorStatus, maskEmail } from '@/lib/api/auth';

// Use service role for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET - Get all pending cancellation requests (ADMIN ONLY)
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    // If refund exists, cancellation should not show; auto-reject pending cancellations
    const { data: refundUsers } = await supabaseAdmin
      .from('refund_requests')
      .select('user_id, status')
      .in('status', ['pending']);

    const refundUserIds = new Set((refundUsers || []).map((r: any) => r.user_id));

    if (refundUserIds.size > 0) {
      await supabaseAdmin
        .from('cancellation_requests')
        .update({ status: 'rejected', admin_note: 'Cancelled due to refund request' })
        .in('user_id', Array.from(refundUserIds))
        .eq('status', 'pending');
    }

    const { data: requests, error } = await supabaseAdmin
      .from('cancellation_requests')
      .select(`
        *,
        users!cancellation_requests_user_id_fkey (
          id,
          email,
          full_name
        ),
        subscriptions (
          plan,
          status
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cancellations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = (requests || []).filter((req: any) => !refundUserIds.has(req.user_id));
    return NextResponse.json(filtered);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - User creates a cancellation request (requires authentication)
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify user is authenticated
    const { user: authUser, error: authError } = await requireAuth();
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const { reason } = body;
    
    // Use authenticated user's ID, not client-provided
    const userId = authUser.id;

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    // If refund request exists, cancel any pending cancellation and block new one
    const { data: anyRefund } = await supabaseAdmin
      .from('refund_requests')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['pending'])
      .limit(1)
      .single();

    if (anyRefund) {
      await supabaseAdmin
        .from('cancellation_requests')
        .update({ status: 'rejected', admin_note: 'Cancelled due to refund request' })
        .eq('user_id', userId)
        .eq('status', 'pending');
      return NextResponse.json({ error: 'Refund request exists. Cancellation is not allowed.' }, { status: 400 });
    }


    // Check if user already has a pending request
    const { data: existing } = await supabaseAdmin
      .from('cancellation_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending cancellation request' }, { status: 400 });
    }

    // Create cancellation request (subscription_id not in schema)
    const { data, error } = await supabaseAdmin
      .from('cancellation_requests')
      .insert({
        user_id: userId,
        reason: reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating cancellation request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Admin approves or rejects cancellation (ADMIN ONLY)
export async function PATCH(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const { userId, action, note } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[Admin Cancellations] Admin ${maskEmail(adminUser.email)} ${action}ing cancellation for user ${userId}`);

    if (action === 'approve') {
      // Block cancellation if refund exists; auto-reject pending cancellation
      const { data: anyRefund } = await supabaseAdmin
        .from('refund_requests')
        .select('id, status')
        .eq('user_id', userId)
        .in('status', ['pending'])
        .limit(1)
        .single();

      if (anyRefund) {
        await supabaseAdmin
          .from('cancellation_requests')
          .update({ status: 'rejected', admin_note: 'Cancelled due to refund request' })
          .eq('user_id', userId)
          .eq('status', 'pending');
        return NextResponse.json({ error: 'Refund request exists. Cancellation is not allowed.' }, { status: 400 });
      }


      // Get user's subscription info
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('plan')
        .eq('user_id', userId)
        .single();

      // Update cancellation request
      const { error: reqError } = await supabaseAdmin
        .from('cancellation_requests')
        .update({
          status: 'approved',
          processed_date: new Date().toISOString(),
          processed_by: adminUser.id,
          admin_note: note || null,
        })
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (reqError) {
        console.error('Error approving cancellation:', reqError);
        return NextResponse.json({ error: reqError.message }, { status: 500 });
      }

      // Update subscription - mark cancelled, keep access until period end
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'cancelled',
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (subError) {
        console.error('Error updating subscription:', subError);
      }

      return NextResponse.json({ success: true, action: 'approved' });
    } else if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('cancellation_requests')
        .update({
          status: 'rejected',
          processed_date: new Date().toISOString(),
          processed_by: adminUser.id,
          admin_note: note || null,
        })
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error rejecting cancellation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
