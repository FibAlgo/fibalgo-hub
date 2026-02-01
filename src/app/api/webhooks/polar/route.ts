import { NextResponse } from 'next/server';

/**
 * 🔒 SECURITY: This endpoint is DEPRECATED and DISABLED
 * All Polar webhook events should go to /api/polar/webhook
 * This endpoint exists only to return 410 Gone for any legacy integrations
 */
export async function POST() {
  console.warn('[SECURITY] Deprecated webhook endpoint hit: /api/webhooks/polar - returning 410');
  return NextResponse.json({ error: 'This endpoint is deprecated. Use /api/polar/webhook' }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ error: 'This endpoint is deprecated' }, { status: 410 });
}

async function handleSubscriptionUpdate(subscription: any) {
  const userId = subscription.metadata?.user_id;
  const customerEmail = subscription.customer?.email;

  if (!userId && !customerEmail) {
    console.error('No user identifier in subscription:', subscription.id);
    return;
  }

  // Find user by email if no userId
  let targetUserId = userId;
  if (!targetUserId && customerEmail) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', customerEmail)
      .single();
    
    targetUserId = user?.id;
  }

  if (!targetUserId) {
    console.error('Could not find user for subscription:', subscription.id);
    return;
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const status = subscription.status === 'trialing' ? 'active' : subscription.status;

  // Check if subscription exists for this user
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', targetUserId)
    .single();

  if (existingSub) {
    // Update existing subscription
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: status,
        start_date: subscription.started_at,
        end_date: subscription.current_period_end,
        is_active: status === 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSub.id);

    if (error) {
      console.error('Failed to update subscription:', error);
    } else {
      console.log('Subscription updated:', existingSub.id);
    }
  } else {
    // Create new subscription
    // Determine plan based on product name or price
    const productName = subscription.product?.name?.toLowerCase() || '';
    const planType = productName.includes('ultimate') ? 'ultimate' : 'premium';
    
    // Calculate days remaining
    const startDate = subscription.started_at ? new Date(subscription.started_at) : new Date();
    const endDate = subscription.current_period_end ? new Date(subscription.current_period_end) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: targetUserId,
        plan: planType,
        status: status,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        days_remaining: daysRemaining,
        is_active: status === 'active',
      });

    if (error) {
      console.error('Failed to create subscription:', error);
    } else {
      console.log('Subscription created for user:', targetUserId);
    }
  }
}

async function handleSubscriptionCanceled(subscription: any) {
  // Find user by email from subscription
  const customerEmail = subscription.customer?.email;
  if (!customerEmail) {
    console.error('No customer email in subscription:', subscription.id);
    return;
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', customerEmail)
    .single();

  if (!user) {
    console.error('User not found for email:', customerEmail);
    return;
  }

  // Update subscription status but keep active until end of billing period
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to cancel subscription:', error);
  } else {
    console.log('Subscription canceled for user:', user.id);
  }
}

async function handleSubscriptionRevoked(subscription: any) {
  // Find user by email from subscription
  const customerEmail = subscription.customer?.email;
  if (!customerEmail) {
    console.error('No customer email in subscription:', subscription.id);
    return;
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', customerEmail)
    .single();

  if (!user) {
    console.error('User not found for email:', customerEmail);
    return;
  }

  // Immediately revoke access
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'expired',
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to revoke subscription:', error);
  } else {
    console.log('Subscription revoked for user:', user.id);
  }
}

async function handleCheckoutSuccess(checkout: any) {
  console.log('Checkout succeeded:', checkout.id);
  // Subscription will be created by subscription.created webhook
}

async function handleOrderCreated(order: any) {
  // Log order creation - no polar_order_id column in subscriptions table
  console.log('Order created:', order.id, 'for subscription:', order.subscription_id);
  // Order tracking would require adding polar_order_id column to subscriptions table
}
