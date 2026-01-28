/**
 * Polar Subscription Management API
 * 
 * Allows admin to cancel subscriptions and process refunds via Polar API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, requireOwnershipOrAdmin, getErrorStatus } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Get Polar API URL based on mode
function getPolarApiUrl(): string {
  const mode = process.env.POLAR_MODE || 'sandbox';
  return mode === 'sandbox' 
    ? 'https://sandbox-api.polar.sh/v1'
    : 'https://api.polar.sh/v1';
}

// Cancel a subscription in Polar
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');
    const userId = searchParams.get('userId');

    if (!subscriptionId && !userId) {
      return NextResponse.json({ error: 'subscriptionId or userId is required' }, { status: 400 });
    }

    let effectiveUserId = userId;

    if (!effectiveUserId && subscriptionId) {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .or(`polar_subscription_id.eq.${subscriptionId},id.eq.${subscriptionId}`)
        .single();

      effectiveUserId = subscription?.user_id || null;
    }

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'User not found for subscription' }, { status: 404 });
    }

    // 🔒 SECURITY: Verify user can only cancel their own subscription (or admin)
    const { user: authUser, error: authError } = await requireOwnershipOrAdmin(effectiveUserId);
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    let polarSubscriptionId = subscriptionId;

    // If userId provided, get polar_subscription_id from database
    if (effectiveUserId && !polarSubscriptionId) {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('polar_subscription_id')
        .eq('user_id', effectiveUserId)
        .single();
      
      polarSubscriptionId = subscription?.polar_subscription_id;
    }

    if (!polarSubscriptionId) {
      // No Polar subscription to cancel, just update locally (end of period behavior)
      if (effectiveUserId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', effectiveUserId);
      }
      return NextResponse.json({ success: true, message: 'Subscription marked as cancelled (no Polar subscription found)' });
    }

    // Cancel subscription in Polar at period end
    const response = await fetch(`${getPolarApiUrl()}/subscriptions/${polarSubscriptionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_at_period_end: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Polar cancel error:', error);
      // Still update locally even if Polar fails
      if (effectiveUserId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', effectiveUserId);
      }
      return NextResponse.json({ 
        success: true, 
        warning: 'Subscription marked cancelled locally but Polar API failed',
        polarError: error 
      });
    }

    // Update local database
    if (effectiveUserId) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'cancelled',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', effectiveUserId);
    }

    return NextResponse.json({ success: true, message: 'Subscription will cancel at period end' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a refund in Polar
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Refunds are admin-only
    const { user: adminUser, error: adminError } = await requireAdmin();
    if (adminError || !adminUser) {
      return NextResponse.json({ error: adminError || 'Unauthorized' }, { status: getErrorStatus(adminError || 'Unauthorized') });
    }

    const body = await request.json();
    const { userId, orderId, amount, reason } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    let polarOrderId = orderId;

    // If no orderId provided, try to find the last order from billing history
    if (!polarOrderId) {
      const { data: billingHistory } = await supabaseAdmin
        .from('billing_history')
        .select('polar_order_id, amount, plan_description, billing_reason')
        .eq('user_id', userId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const isSubscriptionCreate = (billingHistory?.billing_reason || '').toLowerCase() === 'subscription_create' || /subscription_create/i.test(billingHistory?.plan_description || '');
      polarOrderId = isSubscriptionCreate ? billingHistory?.polar_order_id : null;
    }

    if (!polarOrderId) {
      // No Polar order to refund, just update locally
      await supabaseAdmin
        .from('subscriptions')
        .update({
          plan: 'basic',
          status: 'cancelled',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return NextResponse.json({ 
        success: true, 
        message: 'Refund allowed only for initial subscription (subscription_create) within 3 days.',
        manualRefundRequired: true
      });
    }

    // Create refund in Polar
    const refundPayload: any = {
      order_id: polarOrderId,
      reason: reason || 'customer_request',
    };

    // If specific amount provided, add it (partial refund)
    if (amount) {
      refundPayload.amount = Math.round(amount * 100); // Convert to cents
    }

    const response = await fetch(`${getPolarApiUrl()}/refunds/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refundPayload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Polar refund error:', error);
      
      // Still update locally even if Polar fails
      await supabaseAdmin
        .from('subscriptions')
        .update({
          plan: 'basic',
          status: 'cancelled',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return NextResponse.json({ 
        success: true, 
        warning: 'Subscription cancelled locally but Polar refund failed',
        polarError: error,
        manualRefundRequired: true
      });
    }

    const refund = await response.json();

    // Update local database
    await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'basic',
        status: 'cancelled',
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Add refund to billing history
    await supabaseAdmin
      .from('billing_history')
      .insert({
        user_id: userId,
        amount: -(refund.amount || amount || 0) / 100,
        plan_description: 'Refund',
        status: 'refunded',
        polar_order_id: polarOrderId,
        payment_method: 'polar',
        created_at: new Date().toISOString(),
      });

    // Update refund request if exists
    await supabaseAdmin
      .from('refund_requests')
      .update({
        status: 'approved',
        polar_refund_id: refund.id,
        refund_amount: (refund.amount || amount || 0) / 100,
        processed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'pending');

    return NextResponse.json({ 
      success: true, 
      message: 'Refund processed successfully',
      refundId: refund.id,
      amount: (refund.amount || 0) / 100
    });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
