import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, requireAuth, getErrorStatus, maskEmail } from '@/lib/api/auth';

// Use service role for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Check if refund request is within 3-day window
function withinRefundWindow(firstPurchaseDate: string): boolean {
  const purchase = new Date(firstPurchaseDate);
  if (Number.isNaN(purchase.getTime())) return false;

  const now = new Date();
  const startOfPurchase = new Date(purchase.getFullYear(), purchase.getMonth(), purchase.getDate());
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfPurchase.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays < 3;
}

// GET - Get all pending refund requests (ADMIN ONLY)
export async function GET() {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const { data: requests, error } = await supabaseAdmin
      .from('refund_requests')
      .select(`
        *,
        users!refund_requests_user_id_fkey (
          id,
          email,
          full_name
        ),
        subscriptions (
          plan,
          status
        ),
        billing_history!refund_requests_billing_history_id_fkey (
          id,
          amount,
          plan_description,
          created_at,
          polar_order_id,
          invoice_id
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching refunds:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(requests || []);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - User creates a refund request for a specific invoice (requires authentication)
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify user is authenticated
    const { user: authUser, error: authError } = await requireAuth();
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const { reason, billingHistoryId } = body;
    
    // Use authenticated user's ID, not client-provided
    const userId = authUser.id;

    if (!reason || !billingHistoryId) {
      return NextResponse.json({ error: 'Missing required fields (reason, billingHistoryId)' }, { status: 400 });
    }

    // Check if there's already a pending refund for this specific billing entry
    const { data: existingForInvoice } = await supabaseAdmin
      .from('refund_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('billing_history_id', billingHistoryId)
      .eq('status', 'pending')
      .single();

    if (existingForInvoice) {
      return NextResponse.json({ error: 'You already have a pending refund request for this invoice' }, { status: 400 });
    }

    // Check if this invoice was already refunded
    const { data: alreadyRefunded } = await supabaseAdmin
      .from('refund_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('billing_history_id', billingHistoryId)
      .eq('status', 'approved')
      .single();

    if (alreadyRefunded) {
      return NextResponse.json({ error: 'This invoice has already been refunded' }, { status: 400 });
    }

    // Get the specific billing entry
    const { data: billingEntry, error: billingError } = await supabaseAdmin
      .from('billing_history')
      .select('id, created_at, amount, plan_description, status, payment_method, polar_order_id, billing_reason')
      .eq('id', billingHistoryId)
      .eq('user_id', userId)
      .single();

    if (billingError || !billingEntry) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if the billing entry is paid/completed
    const isPaid = billingEntry.status === 'paid' || billingEntry.status === 'completed';
    if (!isPaid) {
      return NextResponse.json({ error: 'Only paid invoices can be refunded' }, { status: 400 });
    }

    // Check if it's an extension (extensions cannot be refunded)
    const isExtension = /extension/i.test(billingEntry.plan_description || '') || billingEntry.billing_reason === 'subscription_extend';
    if (isExtension) {
      return NextResponse.json({ error: 'Extension purchases cannot be refunded' }, { status: 400 });
    }

    // Only initial subscription purchases are refundable
    if (billingEntry.billing_reason && billingEntry.billing_reason !== 'subscription_create') {
      return NextResponse.json({ error: 'Only initial subscription purchases can be refunded' }, { status: 400 });
    }

    // Check if payment method is crypto (crypto cannot be refunded)
    if (billingEntry.payment_method === 'crypto') {
      return NextResponse.json({ error: 'Crypto payments cannot be refunded' }, { status: 400 });
    }

    // Check if within 3-day refund window
    if (!withinRefundWindow(billingEntry.created_at)) {
      return NextResponse.json({ error: 'Refund window expired (3 days from purchase date)' }, { status: 400 });
    }

    // Get subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, plan')
      .eq('user_id', userId)
      .limit(1)
      .single();

    const { data, error } = await supabaseAdmin
      .from('refund_requests')
      .insert({
        user_id: userId,
        subscription_id: subscription?.id || null,
        billing_history_id: billingHistoryId,
        reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating refund request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Admin approves or rejects refund (ADMIN ONLY)
export async function PATCH(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const { userId, action, note, refundRequestId } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[Admin Refunds] Admin ${maskEmail(adminUser.email)} ${action}ing refund for user ${userId}`);

    if (action === 'approve') {
      // Get the specific refund request with billing_history_id
      const { data: refundRequest, error: refundFetchError } = await supabaseAdmin
        .from('refund_requests')
        .select('id, billing_history_id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (refundFetchError || !refundRequest) {
        return NextResponse.json({ error: 'No pending refund request found' }, { status: 404 });
      }

      // Get user's subscription with Polar info
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('id, plan, polar_subscription_id')
        .eq('user_id', userId)
        .single();

      // Get the specific billing entry that is being refunded
      let billingEntryToRefund = null;

      if (refundRequest.billing_history_id) {
        // New system: Get the specific invoice linked to this refund request
        const { data: specificBilling } = await supabaseAdmin
          .from('billing_history')
          .select('id, amount, plan_description, status, created_at, polar_order_id, billing_reason')
          .eq('id', refundRequest.billing_history_id)
          .single();
        
        billingEntryToRefund = specificBilling;
        console.log('[Refund] Using specific billing_history_id:', refundRequest.billing_history_id);
      } else {
        // Legacy fallback: Find the LAST paid billing entry (for old refund requests without billing_history_id)
        const { data: billingEntries } = await supabaseAdmin
          .from('billing_history')
          .select('id, amount, plan_description, status, created_at, polar_order_id, billing_reason')
          .eq('user_id', userId)
          .in('status', ['paid', 'completed'])
          .order('created_at', { ascending: false });

        billingEntryToRefund = (billingEntries || []).find((b: any) => {
          const amount = Number(b.amount) || 0;
          const isExtension = /extension/i.test(b.plan_description || '');
          const isPaid = b.status === 'paid' || b.status === 'completed';
          return isPaid && amount > 0 && !isExtension;
        });
        console.log('[Refund] Legacy mode: Using last paid entry');
      }

      // Process refund through Polar if we have the order ID
      if (billingEntryToRefund?.polar_order_id) {
        try {
          const polarMode = (process.env.POLAR_MODE || 'sandbox').trim();
          const polarApiUrl = polarMode === 'sandbox' 
            ? 'https://sandbox-api.polar.sh/v1'
            : 'https://api.polar.sh/v1';
          
          const accessToken = (process.env.POLAR_ACCESS_TOKEN || '').trim();
          
          console.log('[Refund] POLAR_MODE:', polarMode, 'API URL:', polarApiUrl);
          console.log('[Refund] Access token obtained');
          console.log('[Refund] Refunding order:', billingEntryToRefund.polar_order_id);
          console.log('[Refund] Billing entry ID:', billingEntryToRefund.id);

          const refundAmountCents = Math.round(Number(billingEntryToRefund.amount || 0) * 100);
          const polarResponse = await fetch(`${polarApiUrl}/refunds/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_id: billingEntryToRefund.polar_order_id,
              amount: refundAmountCents,
              reason: 'customer_request',
              comment: note || 'Admin approved refund',
            }),
          });

          if (!polarResponse.ok) {
            const errorText = await polarResponse.text();
            console.error('Polar refund failed:', errorText);
            return NextResponse.json({ error: 'Polar refund failed', details: errorText }, { status: 502 });
          } else {
            const refund = await polarResponse.json().catch(() => null);
            console.log('Polar refund processed for order:', billingEntryToRefund.polar_order_id);
            if (refund?.id) {
              await supabaseAdmin
                .from('refund_requests')
                .update({
                  polar_refund_id: refund.id,
                  refund_amount: refund.amount ? refund.amount / 100 : null,
                })
                .eq('id', refundRequest.id);
            }

            // Mark the billing entry as refunded
            await supabaseAdmin
              .from('billing_history')
              .update({ status: 'refunded' })
              .eq('id', billingEntryToRefund.id);
          }
        } catch (polarError) {
          console.error('Polar API error:', polarError);
        }
      } else {
        console.log('No polar_order_id found for billing entry. Manual Polar refund may be needed.');
        
        // Still mark billing entry as refunded locally if it exists
        if (billingEntryToRefund?.id) {
          await supabaseAdmin
            .from('billing_history')
            .update({ status: 'refunded' })
            .eq('id', billingEntryToRefund.id);
        }
      }

      // Also revoke the subscription in Polar (immediate cancellation, not at period end)
      if (subscription?.polar_subscription_id) {
        try {
          const polarMode = (process.env.POLAR_MODE || 'sandbox').trim();
          const polarApiUrl = polarMode === 'sandbox' 
            ? 'https://sandbox-api.polar.sh/v1'
            : 'https://api.polar.sh/v1';
          
          const accessToken = (process.env.POLAR_ACCESS_TOKEN || '').trim();
          
          console.log('[Refund] Revoking subscription immediately:', subscription.polar_subscription_id);

          // Use DELETE to immediately revoke the subscription
          const polarResponse = await fetch(`${polarApiUrl}/subscriptions/${subscription.polar_subscription_id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!polarResponse.ok) {
            const errorText = await polarResponse.text();
            console.error('Polar subscription revoke failed:', errorText);
            
            // Fallback: Try PATCH with canceled status
            const fallbackResponse = await fetch(`${polarApiUrl}/subscriptions/${subscription.polar_subscription_id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cancel_at_period_end: false,
                canceled: true,
              }),
            });
            
            if (!fallbackResponse.ok) {
              console.error('Polar subscription cancel fallback also failed');
            } else {
              console.log('Polar subscription cancelled via fallback');
            }
          } else {
            console.log('Polar subscription revoked immediately:', subscription.polar_subscription_id);
          }
        } catch (polarError) {
          console.error('Polar revoke error:', polarError);
        }
      }

      // Update refund request status - use specific refund request ID
      const { error: refundError } = await supabaseAdmin
        .from('refund_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: adminUser.id,
          feedback: note || null,
        })
        .eq('id', refundRequest.id);

      if (refundError) {
        console.error('Error approving refund:', refundError);
        return NextResponse.json({ error: refundError.message }, { status: 500 });
      }

      // Track TradingView downgrade if was Ultimate
      if (subscription?.plan === 'ultimate' || subscription?.plan === 'lifetime') {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('email, full_name, trading_view_id')
          .eq('id', userId)
          .single();

        if (user) {
          // Check if not already in downgrades list
          const { data: existingDowngrade } = await supabaseAdmin
            .from('tradingview_downgrades')
            .select('id')
            .eq('user_id', userId)
            .eq('is_removed', false)
            .single();

          if (!existingDowngrade) {
            await supabaseAdmin
              .from('tradingview_downgrades')
              .insert({
                user_id: userId,
                email: user.email,
                tradingview_username: user.trading_view_id,
                previous_plan: subscription.plan,
                downgrade_reason: 'refunded',
                is_removed: false,
              });
          }
        }

        // Also remove from pending upgrades list if exists
        await supabaseAdmin
          .from('tradingview_upgrades')
          .update({ is_granted: true, notes: 'Removed: User refunded' })
          .eq('user_id', userId)
          .eq('is_granted', false);
      }

      // Downgrade subscription to basic immediately (refund = immediate downgrade)
      const nowIso = new Date().toISOString();
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan: 'basic',
          plan_id: 'basic',
          plan_name: 'Basic',
          status: 'cancelled',
          is_active: false,
          days_remaining: -1,
          start_date: null,
          started_at: null,
          end_date: nowIso,
          expires_at: nowIso,
          tradingview_access_granted: false,
          updated_at: nowIso,
        })
        .eq('user_id', userId);

      if (subError) {
        console.error('Error updating subscription:', subError);
      }

      // Reset notification preferences to default when refunded (downgraded to basic)
      try {
        await supabaseAdmin
          .from('notification_preferences')
          .update({
            notifications_enabled: false,
            email_notifications: false,
            push_notifications: false,
            sound_enabled: false,
            sound_type: 'default',
            news_breaking: true,
            news_high_impact: true,
            news_medium_impact: true,
            news_low_impact: false,
            news_crypto: true,
            news_forex: true,
            news_stocks: true,
            news_commodities: true,
            news_indices: true,
            news_economic: true,
            news_central_bank: true,
            news_geopolitical: false,
            signal_strong_buy: true,
            signal_buy: true,
            signal_sell: true,
            signal_strong_sell: true,
            calendar_enabled: true,
            calendar_high_impact: true,
            calendar_medium_impact: true,
            calendar_low_impact: false,
            calendar_reminder_minutes: 15,
            quiet_hours_enabled: false,
            quiet_hours_start: '22:00',
            quiet_hours_end: '08:00',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        console.log(`[Admin Refund] Reset notification preferences for refunded user ${userId}`);
      } catch (e) {
        console.warn('Could not reset notification preferences:', e);
      }

      // Clear any pending/approved cancellation requests
      await supabaseAdmin
        .from('cancellation_requests')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('status', ['pending', 'approved']);

      return NextResponse.json({ success: true, action: 'approved' });
    }

    if (action === 'reject') {
      // Get the pending refund request first
      const { data: pendingRefund } = await supabaseAdmin
        .from('refund_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!pendingRefund) {
        return NextResponse.json({ error: 'No pending refund request found' }, { status: 404 });
      }

      const { error } = await supabaseAdmin
        .from('refund_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: adminUser.id,
          feedback: note || null,
        })
        .eq('id', pendingRefund.id);

      if (error) {
        console.error('Error rejecting refund:', error);
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
