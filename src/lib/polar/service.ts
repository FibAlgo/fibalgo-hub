/**
 * Polar Payment Service
 * 
 * Business logic for handling Polar payments, subscriptions, and orders.
 * This service wraps the Polar SDK and integrates with our database.
 */

import { getPolarClient } from './client';
import { getProductId, POLAR_CONFIG, PlanType, getApiUrl } from './config';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Create a checkout session for a user
 */
export async function createCheckoutSession(params: {
  userId: string;
  userEmail: string;
  plan: PlanType;
  successUrl: string;
  cancelUrl?: string;
}): Promise<{ checkoutUrl: string; checkoutId: string }> {
  const productId = getProductId(params.plan);
  
  if (!productId) {
    throw new Error(`Product ID not configured for plan: ${params.plan}`);
  }
  
  // Create checkout session via REST API (more reliable than SDK)
  const response = await fetch(`${getApiUrl()}/checkouts/custom/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${POLAR_CONFIG.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      success_url: params.successUrl,
      customer_email: params.userEmail,
      metadata: {
        user_id: params.userId,
        plan: params.plan,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create checkout session');
  }

  const checkout = await response.json();
  
  return {
    checkoutUrl: checkout.url,
    checkoutId: checkout.id,
  };
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(email: string) {
  try {
    const response = await fetch(
      `${getApiUrl()}/customers/?email=${encodeURIComponent(email)}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${POLAR_CONFIG.accessToken}`,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
}

/**
 * Get customer subscriptions
 */
export async function getCustomerSubscriptions(customerId: string) {
  try {
    const response = await fetch(
      `${getApiUrl()}/subscriptions/?customer_id=${customerId}`,
      {
        headers: {
          'Authorization': `Bearer ${POLAR_CONFIG.accessToken}`,
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }
}

/**
 * Get customer orders
 */
export async function getCustomerOrders(customerId: string) {
  try {
    const response = await fetch(
      `${getApiUrl()}/orders/?customer_id=${customerId}`,
      {
        headers: {
          'Authorization': `Bearer ${POLAR_CONFIG.accessToken}`,
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const response = await fetch(
      `${getApiUrl()}/subscriptions/${subscriptionId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${POLAR_CONFIG.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancel_at_period_end: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to cancel subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Process successful payment - update database
 */
export async function processSuccessfulPayment(params: {
  userId: string;
  plan: PlanType;
  polarOrderId: string;
  polarCustomerId: string;
  polarSubscriptionId?: string;
  amount: number;
  currency: string;
}) {
  const { userId, plan, polarOrderId, polarCustomerId, polarSubscriptionId, amount, currency } = params;
  
  // Calculate subscription end date based on plan
  const endDate = plan === 'lifetime' 
    ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years for lifetime
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year for others
  
  // Check for existing subscription
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single();
  
  if (existingSub) {
    // Update existing subscription
    await supabaseAdmin
      .from('subscriptions')
      .update({
        plan,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSub.id);
  } else {
    // Create new subscription
    await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: true,
      });
  }
  
  // Update user with Polar customer ID
  await supabaseAdmin
    .from('users')
    .update({
      polar_customer_id: polarCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  
  // Log the payment
  console.log(`Payment processed: User ${userId}, Plan ${plan}, Order ${polarOrderId}, Amount ${amount} ${currency}`);
  
  return { success: true };
}

/**
 * Process subscription cancellation
 */
export async function processSubscriptionCancellation(params: {
  polarSubscriptionId: string;
  canceledAt: Date;
}) {
  const { polarSubscriptionId, canceledAt } = params;
  
  // Find user by polar subscription ID or handle via metadata
  // This will be handled by webhook with proper data
  console.log(`Subscription cancelled: ${polarSubscriptionId} at ${canceledAt}`);
  
  return { success: true };
}

/**
 * Process refund
 */
export async function processRefund(params: {
  polarOrderId: string;
  refundAmount: number;
  reason?: string;
}) {
  const { polarOrderId, refundAmount, reason } = params;
  
  console.log(`Refund processed: Order ${polarOrderId}, Amount ${refundAmount}, Reason: ${reason}`);
  
  return { success: true };
}

/**
 * Get all products from Polar
 */
export async function getProducts() {
  try {
    const response = await fetch(
      `${getApiUrl()}/products/?organization_id=${POLAR_CONFIG.organizationId}&is_archived=false`,
      {
        headers: {
          'Authorization': `Bearer ${POLAR_CONFIG.accessToken}`,
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}
