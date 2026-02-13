import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, getErrorStatus, maskEmail } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * PATCH - Admin marks a billing entry as cancelled or refunded (VISUAL ONLY)
 * 
 * This does NOT downgrade the user or change their plan.
 * The actual cancellation/refund is handled by CopeCart webhooks.
 * This only updates the visual status in the user's dashboard.
 */
export async function PATCH(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const { billingId, userId, action } = body;

    if (!billingId || !userId || !action) {
      return NextResponse.json({ error: 'Missing required fields (billingId, userId, action)' }, { status: 400 });
    }

    if (action !== 'cancel' && action !== 'refund') {
      return NextResponse.json({ error: 'Invalid action. Must be "cancel" or "refund"' }, { status: 400 });
    }

    console.log(`[Admin Billing Status] Admin ${maskEmail(adminUser.email)} marking billing ${billingId} as ${action} for user ${userId}`);

    // Get the billing entry to verify it exists and belongs to the user
    const { data: billingEntry, error: fetchError } = await supabaseAdmin
      .from('billing_history')
      .select('id, user_id, status, payment_method, billing_reason, invoice_number, amount, currency, plan_description')
      .eq('id', billingId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !billingEntry) {
      return NextResponse.json({ error: 'Billing entry not found' }, { status: 404 });
    }

    // Get user info for the notification
    const { data: userInfo } = await supabaseAdmin
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    // Get current subscription plan
    const { data: subInfo } = await supabaseAdmin
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .single();

    const newStatus = action === 'refund' ? 'refunded' : 'cancelled';

    // Update billing history status (visual only)
    const { error: updateError } = await supabaseAdmin
      .from('billing_history')
      .update({ status: newStatus })
      .eq('id', billingId);

    if (updateError) {
      console.error('Error updating billing status:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Also update subscription status for visual display in user's dashboard
    const subStatus = action === 'refund' ? 'refunded' : 'cancelled';
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: subStatus })
      .eq('user_id', userId);

    if (subError) {
      console.error('Error updating subscription status:', subError);
      // Don't fail the whole request, billing update already succeeded
    }

    // Create a notification in admin_billing_actions so admin remembers to process on CopeCart
    const amountStr = `${billingEntry.currency === 'EUR' ? '€' : '$'}${(billingEntry.amount || 0).toFixed(2)}`;
    await supabaseAdmin.from('admin_billing_actions').insert({
      user_id: userId,
      billing_id: billingId,
      action,
      user_email: userInfo?.email || '',
      user_name: userInfo?.full_name || 'User',
      plan: subInfo?.plan || billingEntry.plan_description || '',
      invoice_number: billingEntry.invoice_number || '',
      amount: amountStr,
      admin_email: adminUser.email || '',
    });

    console.log(`[Admin Billing Status] ✅ Billing ${billingId} marked as ${newStatus} for user ${userId}`);

    return NextResponse.json({ success: true, action, newStatus });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
