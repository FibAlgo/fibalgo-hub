/**
 * Polar Webhook Handler
 * 
 * Receives and processes webhook events from Polar.
 * Uses @polar-sh/sdk for proper signature verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { PlanType, isSandbox, POLAR_CONFIG, POLAR_PRODUCTS } from '@/lib/polar';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Health check / debug endpoint to confirm routing & env in local dev
export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: POLAR_CONFIG.mode,
    allowSkip: process.env.POLAR_SKIP_WEBHOOK_VERIFY === 'true',
  });
}

// Helper: Normalize plan
function normalizePlan(value?: string | null): PlanType | null {
  if (!value) return null;
  const name = value.toLowerCase();
  if (name.includes('lifetime')) return 'lifetime';
  if (name.includes('ultimate')) return 'ultimate';
  if (name.includes('premium')) return 'premium';
  if (name.includes('basic')) return 'basic';
  return null;
}

// Helper: Get plan type from metadata/product id/name
function getPlanFromProduct(params: {
  productName?: string | null;
  productId?: string | null;
  metadataPlan?: string | null;
  metadataPlanName?: string | null;
  metadataProductId?: string | null;
}): PlanType {
  const fromMetadata = normalizePlan(params.metadataPlan || params.metadataPlanName);
  if (fromMetadata) return fromMetadata;

  const productId = params.productId || params.metadataProductId || '';
  const products = POLAR_PRODUCTS[POLAR_CONFIG.mode] || POLAR_PRODUCTS.sandbox || {};
  for (const [planKey, id] of Object.entries(products)) {
    if (id && id === productId) return planKey as PlanType;
  }

  const fromName = normalizePlan(params.productName || '');
  if (fromName) return fromName;

  return 'basic';
}

const PLAN_LABELS: Record<PlanType, string> = {
  basic: 'Basic',
  premium: 'Premium',
  ultimate: 'Ultimate',
  lifetime: 'Lifetime',
};

// Helper: Update user subscription in database (single source of truth = order.paid)
async function updateUserSubscription(params: {
  userId: string;
  plan: PlanType;
  status: 'active' | 'cancelled' | 'expired';
  polarCustomerId?: string;
  polarSubscriptionId?: string;
  endDate?: Date;
  amount?: number;
}) {
  const { userId, plan, status, polarCustomerId, polarSubscriptionId, endDate, amount } = params;
  
  const subscriptionEndDate = endDate || (
    plan === 'lifetime' 
      ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );
  const startedAt = new Date();
  
  // Plan name mapping
  const planNames: Record<PlanType, string> = {
    basic: 'Basic',
    premium: 'Premium',
    ultimate: 'Ultimate',
    lifetime: 'Lifetime'
  };
  
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('id, plan_id')
    .eq('user_id', userId)
    .single();
  
  const previousPlan = existingSub?.plan_id || 'basic';
  
  if (existingSub) {
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        plan_id: plan,
        plan: plan,
        plan_name: planNames[plan],
        status,
        started_at: startedAt.toISOString(),
        start_date: startedAt.toISOString(),
        expires_at: subscriptionEndDate.toISOString(),
        end_date: subscriptionEndDate.toISOString(),
        price: amount ? amount / 100 : undefined,
        is_active: status === 'active',
        polar_subscription_id: polarSubscriptionId || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSub.id);
    
    if (updateError) {
      console.error(`[Polar Webhook] ❌ Subscription UPDATE failed:`, updateError.message, updateError.details, updateError.hint);
    } else {
      console.log(`[Polar Webhook] ✅ Subscription UPDATED: ${existingSub.id} -> plan=${plan}, status=${status}`);
    }
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: plan,
        plan: plan,
        plan_name: planNames[plan],
        status,
        started_at: startedAt.toISOString(),
        start_date: startedAt.toISOString(),
        expires_at: subscriptionEndDate.toISOString(),
        end_date: subscriptionEndDate.toISOString(),
        price: amount ? amount / 100 : undefined,
        is_active: status === 'active',
        polar_subscription_id: polarSubscriptionId || undefined,
      });
    
    if (insertError) {
      console.error(`[Polar Webhook] ❌ Subscription INSERT failed:`, insertError.message, insertError.details, insertError.hint);
    } else {
      console.log(`[Polar Webhook] ✅ Subscription INSERTED for user ${userId} -> plan=${plan}`);
    }
  }
  
  if (polarCustomerId) {
    await supabaseAdmin
      .from('users')
      .update({
        polar_customer_id: polarCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }
  
  console.log(`[Polar Webhook] Subscription updated: User ${userId}, Plan ${plan}, Status ${status}`);
  return { previousPlan };
}

// Helper: Sync subscription metadata without granting access (avoid duplicate grants)
async function syncSubscriptionMetadata(params: {
  userId: string;
  polarCustomerId?: string;
  polarSubscriptionId?: string;
  endDate?: Date;
  status?: 'active' | 'cancelled' | 'expired';
}) {
  const { userId, polarCustomerId, polarSubscriptionId, endDate, status } = params;
  
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single();
  
  if (existingSub) {
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        expires_at: endDate ? endDate.toISOString() : undefined,
        end_date: endDate ? endDate.toISOString() : undefined,
        status: status || undefined,
        is_active: status === 'cancelled' ? false : undefined,
        polar_subscription_id: polarSubscriptionId || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSub.id);
    
    if (updateError) {
      console.error(`[Polar Webhook] ❌ syncSubscriptionMetadata UPDATE failed:`, updateError.message);
    }
  }
  
  if (polarCustomerId) {
    await supabaseAdmin
      .from('users')
      .update({
        polar_customer_id: polarCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }
}

// Helper: Track TradingView downgrade
async function trackTradingViewDowngrade(params: {
  userId: string;
  previousPlan: PlanType;
  reason: 'subscription_canceled' | 'subscription_revoked' | 'payment_failed' | 'refunded';
  polarSubscriptionId?: string;
}) {
  const { userId, previousPlan, reason, polarSubscriptionId } = params;
  
  // Only track for Ultimate and Lifetime plans (they have TradingView access)
  if (previousPlan !== 'ultimate' && previousPlan !== 'lifetime') {
    console.log(`[Polar Webhook] Skipping TradingView tracking - user was on ${previousPlan}`);
    return;
  }
  
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, trading_view_id')
    .eq('id', userId)
    .single();
  
  if (!user) return;
  
  const { data: existing } = await supabaseAdmin
    .from('tradingview_downgrades')
    .select('id')
    .eq('user_id', userId)
    .eq('is_removed', false)
    .single();
  
  if (existing) return;
  
  await supabaseAdmin
    .from('tradingview_downgrades')
    .insert({
      user_id: userId,
      email: user.email,
      tradingview_username: user.trading_view_id,
      previous_plan: previousPlan,
      downgrade_reason: reason,
      is_removed: false,
    });
  
  console.log(`[Polar Webhook] TradingView downgrade tracked: ${user.email}`);
}

// Helper: Track TradingView upgrade (for admin to grant access)
async function trackTradingViewUpgrade(params: {
  userId: string;
  newPlan: PlanType;
  polarSubscriptionId?: string;
}) {
  const { userId, newPlan, polarSubscriptionId } = params;
  
  // Only track Ultimate/Lifetime upgrades (they need TradingView access)
  if (newPlan !== 'ultimate' && newPlan !== 'lifetime') {
    console.log(`[Polar Webhook] Skipping TradingView upgrade tracking - plan is ${newPlan}`);
    return;
  }
  
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, trading_view_id')
    .eq('id', userId)
    .single();
  
  if (!user) return;
  
  // Check if user already has pending upgrade
  const { data: existing } = await supabaseAdmin
    .from('tradingview_upgrades')
    .select('id')
    .eq('user_id', userId)
    .eq('is_granted', false)
    .single();
  
  if (existing) {
    console.log(`[Polar Webhook] User already has pending TradingView upgrade: ${user.email}`);
    return;
  }
  
  await supabaseAdmin
    .from('tradingview_upgrades')
    .insert({
      user_id: userId,
      email: user.email,
      tradingview_username: user.trading_view_id,
      plan: newPlan,
      is_granted: false,
    });
  
  console.log(`[Polar Webhook] TradingView upgrade tracked: ${user.email} -> ${newPlan}`);
}

// Helper: Find user by email
async function findUserByEmail(email: string) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .ilike('email', email)
    .single();
  return user;
}

// Helper: Re-link records if metadata user_id differs from found user
async function reconcileUserIdIfNeeded(foundUser: { id: string; email: string }, targetUserId?: string) {
  if (!targetUserId || !foundUser || foundUser.id === targetUserId) return foundUser;

  const oldUserId = foundUser.id;
  const newUserId = targetUserId;

  await supabaseAdmin
    .from('users')
    .update({ id: newUserId })
    .eq('email', foundUser.email);

  await Promise.allSettled([
    supabaseAdmin.from('subscriptions').update({ user_id: newUserId }).eq('user_id', oldUserId),
    supabaseAdmin.from('billing_history').update({ user_id: newUserId }).eq('user_id', oldUserId),
    supabaseAdmin.from('refund_requests').update({ user_id: newUserId }).eq('user_id', oldUserId),
    supabaseAdmin.from('cancellation_requests').update({ user_id: newUserId }).eq('user_id', oldUserId),
    supabaseAdmin.from('tradingview_downgrades').update({ user_id: newUserId }).eq('user_id', oldUserId),
    supabaseAdmin.from('polar_payments').update({ user_id: newUserId }).eq('user_id', oldUserId),
  ]);

  return { id: newUserId, email: foundUser.email };
}

// Helper: Add billing history (with duplicate check)
async function addBillingHistory(params: {
  userId: string;
  amount: number;
  plan: string;
  status: 'completed' | 'refunded' | 'failed' | 'pending';
  polarOrderId?: string;
  description?: string;
  invoiceUrl?: string;
  invoiceId?: string;
  billingReason?: string;
}) {
  const { userId, amount, plan, status, polarOrderId, description, invoiceUrl, invoiceId, billingReason } = params;
  
  console.log(`[Polar Webhook] addBillingHistory called with:`, JSON.stringify({
    userId, amount, plan, status, polarOrderId, description: description?.substring(0, 50), invoiceUrl: invoiceUrl?.substring(0, 50)
  }));
  
  // DUPLICATE CHECK: Don't add if same polar_order_id with same status already exists
  if (polarOrderId) {
    const { data: existing } = await supabaseAdmin
      .from('billing_history')
      .select('id')
      .eq('polar_order_id', polarOrderId)
      .eq('status', status)
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`[Polar Webhook] ⏭️ Billing history SKIPPED - duplicate entry for order ${polarOrderId} with status ${status}`);
      return;
    }
  }
  
  // Use actual invoice id/number if provided; fallback to generated
  const resolvedInvoiceId = invoiceId || `INV-${polarOrderId?.substring(0, 8) || Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  const insertData = {
    user_id: userId,
    invoice_id: resolvedInvoiceId,
    amount: amount / 100,
    plan_description: description || `${plan} Plan - Monthly`,
    billing_reason: billingReason,
    status,
    polar_order_id: polarOrderId,
    invoice_url: invoiceUrl,
    payment_method: 'credit_card',  // Polar uses credit card payments
    created_at: new Date().toISOString(),
  };
  
  console.log(`[Polar Webhook] Inserting billing record:`, JSON.stringify(insertData));
  
  const { data, error } = await supabaseAdmin
    .from('billing_history')
    .insert(insertData)
    .select();
  
  if (error) {
    console.error(`[Polar Webhook] ❌ Billing history insert FAILED:`, error.message, error.details, error.hint);
  } else {
    console.log(`[Polar Webhook] ✅ Billing history inserted successfully:`, JSON.stringify(data));
  }
}

function extractInvoiceUrlFromOrder(order: any): string {
  const candidates = [
    order?.invoice?.download_url,
    order?.invoice?.file_url,
    order?.invoice?.pdf_url,
    order?.invoice?.document_url,
    order?.invoice?.hosted_invoice_url,
    order?.invoice?.url,
    order?.latest_invoice?.download_url,
    order?.latest_invoice?.file_url,
    order?.latest_invoice?.pdf_url,
    order?.latest_invoice?.document_url,
    order?.latest_invoice?.hosted_invoice_url,
    order?.latest_invoice?.url,
  ];

  return candidates.find((url) => typeof url === 'string' && url.length > 0) || '';
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function resolveOrderAmount(order: any): number {
  const candidates = [
    order?.total_amount,
    order?.amount,
    order?.net_amount,
    order?.subtotal_amount,
    order?.product_price?.price_amount,
    order?.subscription?.amount,
    order?.price?.price_amount,
  ];

  for (const candidate of candidates) {
    const value = toNumber(candidate);
    if (value > 0) return value;
  }

  return 0;
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    const allowInsecureWebhook = process.env.POLAR_SKIP_WEBHOOK_VERIFY === 'true';
    console.log(`[Polar Webhook] Config: mode=${POLAR_CONFIG.mode}, allowSkip=${allowInsecureWebhook}`);
    
    if (!webhookSecret) {
      console.error('[Polar Webhook] POLAR_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    // Debug logging
    console.log(`[Polar Webhook] ${isSandbox() ? '[SANDBOX]' : '[PRODUCTION]'} Received webhook`);
    
    // Validate and parse the webhook using Polar SDK
    let event: any;
    if (allowInsecureWebhook && isSandbox()) {
      console.warn('[Polar Webhook] ⚠️ Skipping webhook verification (POLAR_SKIP_WEBHOOK_VERIFY=true) - sandbox only');
      try {
        event = JSON.parse(body);
        console.log(`[Polar Webhook] ⚠️ Using unverified event type: ${event?.type || 'unknown'}`);
      } catch (parseError) {
        console.error('[Polar Webhook] Unable to parse webhook body after skipping verification', parseError);
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 403 });
      }
    } else {
      try {
        // Convert headers to plain object for validateEvent
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const signatureHeaders = ['webhook-id', 'webhook-signature', 'webhook-timestamp', 'polar-signature'];
        const headerSnapshot = signatureHeaders.reduce<Record<string, string | undefined>>((acc, key) => {
          acc[key] = headers[key];
          return acc;
        }, {});
        console.log('[Polar Webhook] Headers snapshot for verification', headerSnapshot);
        
        event = validateEvent(body, headers, webhookSecret);
        console.log(`[Polar Webhook] ✅ Validated event type: ${event.type}`);
      } catch (error: any) {
        if (error instanceof WebhookVerificationError) {
          console.error('[Polar Webhook] Signature verification failed', error?.message || error);
          return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }
        console.error('[Polar Webhook] Validation failed', error?.message || error);
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 403 });
      }
    }
    
    // Handle different event types
    switch (event.type) {
      // =============================================
      // subscription.created - MAIN HANDLER: Grant access + create billing history
      // This is the PRIMARY event for granting subscription access!
      // =============================================
      case 'subscription.created': {
        const subscription = event.data;
        const customerEmail = subscription.customer?.email || (subscription as any).customer_email;
        const metadata = subscription.metadata as { user_id?: string; plan?: string; plan_name?: string; product_id?: string } | null;
        
        console.log(`[Polar Webhook] 🎉 subscription.created received!`);
        console.log(`[Polar Webhook] Subscription ID: ${subscription.id}`);
        console.log(`[Polar Webhook] Status: ${subscription.status}`);
        console.log(`[Polar Webhook] Amount: ${subscription.amount}`);
        console.log(`[Polar Webhook] Product: ${subscription.product?.name}`);
        console.log(`[Polar Webhook] Customer email: ${customerEmail}`);
        console.log(`[Polar Webhook] Metadata user_id: ${metadata?.user_id}`);
        
        if (!metadata?.user_id && !customerEmail) {
          console.error('[Polar Webhook] ❌ No user_id or customer email in subscription.created');
          break;
        }
        
        let user = null;
        
        // Try to find user by metadata user_id first
        if (metadata?.user_id) {
          const { data } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('id', metadata.user_id)
            .single();
          user = data;
        }
        
        // Fallback to email if user not found by ID
        if (!user && customerEmail) {
          console.log(`[Polar Webhook] User not found by ID, trying email: ${customerEmail}`);
          user = await findUserByEmail(customerEmail);
        }

        // Re-link to metadata user_id if needed
        if (user && metadata?.user_id) {
          user = await reconcileUserIdIfNeeded(user, metadata.user_id);
        }
        
        if (!user) {
          console.error('[Polar Webhook] ❌ User not found by ID or email:', metadata?.user_id, customerEmail);
          break;
        }
        
        console.log(`[Polar Webhook] ✅ Found user: ${user.id} (${user.email})`);
        
        // Only grant access if subscription is active
        if (subscription.status !== 'active') {
          console.log(`[Polar Webhook] ⏳ Subscription status is ${subscription.status}, not granting access yet`);
          break;
        }
        
        // Get plan from product name
        const productName = subscription.product?.name || 'Unknown';
        const plan = getPlanFromProduct({
          productName,
          productId: subscription.product?.id || (subscription as any).product_id,
          metadataPlan: metadata?.plan || null,
          metadataPlanName: metadata?.plan_name || null,
          metadataProductId: metadata?.product_id || null,
        });
        const amount = subscription.amount || subscription.price?.price_amount || 0;
        const periodEnd = subscription.current_period_end;
        const periodStart = subscription.current_period_start || subscription.started_at;
        
        console.log(`[Polar Webhook] 🚀 Granting ${plan} subscription to user ${user.email}`);
        console.log(`[Polar Webhook] Amount: ${amount} cents = $${(amount / 100).toFixed(2)}`);
        
        // UPDATE SUBSCRIPTION - This grants access!
        const { previousPlan } = await updateUserSubscription({
          userId: user.id,
          plan,
          status: 'active',
          polarCustomerId: subscription.customer?.id,
          polarSubscriptionId: subscription.id,
          endDate: periodEnd ? new Date(periodEnd) : undefined,
          amount,
        });

        // Clear any pending/approved cancellation requests when a new subscription starts
        await supabaseAdmin
          .from('cancellation_requests')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('status', ['pending', 'approved']);

        await supabaseAdmin
          .from('refund_requests')
          .update({ status: 'rejected', processed_at: new Date().toISOString(), feedback: 'Closed due to new purchase' })
          .eq('user_id', user.id)
          .eq('status', 'pending');
        
        // Billing history is created on order.paid to avoid duplicates and ensure invoice URL
        console.log('[Polar Webhook] ⏭️ Skipping billing history on subscription.created (handled by order.paid)');
        
        // TradingView upgrade is tracked on billing history (order.paid) for consistency
        
        console.log(`[Polar Webhook] 🎉 subscription.created fully processed for ${user.email}!`);
        break;
      }

      // subscription.active/updated - Just sync metadata
      case 'subscription.active':
      case 'subscription.updated': {
        const subscription = event.data;
        const customerEmail = subscription.customer?.email;
        const metadata = subscription.metadata as { user_id?: string } | null;
        
        console.log(`[Polar Webhook] 📝 ${event.type} - Syncing metadata only`);
        
        if (!metadata?.user_id && !customerEmail) {
          console.error('[Polar Webhook] No user_id or customer email');
          break;
        }
        
        let user = null;
        
        // Try to find user by metadata user_id first
        if (metadata?.user_id) {
          const { data } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('id', metadata.user_id)
            .single();
          user = data;
        }
        
        // Fallback to email if user not found by ID
        if (!user && customerEmail) {
          console.log(`[Polar Webhook] User not found by ID, trying email: ${customerEmail}`);
          user = await findUserByEmail(customerEmail);
        }

        // Re-link to metadata user_id if needed
        if (user && metadata?.user_id) {
          user = await reconcileUserIdIfNeeded(user, metadata.user_id);
        }
        
        if (!user) {
          console.error('[Polar Webhook] User not found by ID or email:', metadata?.user_id, customerEmail);
          break;
        }
        
        console.log(`[Polar Webhook] Found user: ${user.id} (${user.email})`);
        
        const periodEnd = subscription.current_period_end;
        
        // Metadata sync only (subscription.created already granted access)
        await syncSubscriptionMetadata({
          userId: user.id,
          polarCustomerId: subscription.customer?.id,
          polarSubscriptionId: subscription.id,
          endDate: periodEnd ? new Date(periodEnd) : undefined,
          status: subscription.status === 'canceled' ? 'cancelled' : undefined,
        });
        
        console.log(`[Polar Webhook] ${event.type} metadata synced for user ${user.email}`);
        break;
      }
      
      case 'subscription.canceled':
      case 'subscription.revoked':
      case 'subscription.past_due': {
        console.log(`[Polar Webhook] 🚫 Processing ${event.type} event`);
        
        const subscription = event.data;
        const customerEmail = subscription.customer?.email;
        
        console.log(`[Polar Webhook] Subscription ID: ${subscription.id}`);
        console.log(`[Polar Webhook] Customer email: ${customerEmail}`);
        console.log(`[Polar Webhook] Cancel reason: ${subscription.customer_cancellation_reason || 'N/A'}`);
        console.log(`[Polar Webhook] Cancel comment: ${subscription.customer_cancellation_comment || 'N/A'}`);
        
        if (!customerEmail) {
          console.error(`[Polar Webhook] ❌ No customer email in ${event.type} event`);
          break;
        }
        
        const user = await findUserByEmail(customerEmail);
        if (!user) {
          console.error(`[Polar Webhook] ❌ User not found for email: ${customerEmail}`);
          break;
        }
        
        console.log(`[Polar Webhook] Found user: ${user.id} (${user.email})`);
        
        if (event.type === 'subscription.canceled') {
          // Keep access until end of period; do NOT downgrade plan yet
          const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : undefined;
          await syncSubscriptionMetadata({
            userId: user.id,
            polarSubscriptionId: subscription.id,
            endDate: periodEnd,
            status: 'cancelled',
          });
          console.log(`[Polar Webhook] ✅ Subscription marked cancelled (access until period end) for user ${user.email}`);
        } else {
          const { data: sub } = await supabaseAdmin
            .from('subscriptions')
            .select('plan')
            .eq('user_id', user.id)
            .single();

          const previousPlan = (sub?.plan || 'basic') as PlanType;

          await supabaseAdmin
            .from('subscriptions')
            .update({
              plan: 'basic',
              plan_id: 'basic',
              plan_name: 'Basic',
              status: 'expired',
              is_active: false,
              days_remaining: 0,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

          // Clear any pending/approved cancellation requests
          await supabaseAdmin
            .from('cancellation_requests')
            .update({ status: 'processed', processed_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .in('status', ['pending', 'approved']);

          const downgradeReason = event.type === 'subscription.past_due' ? 'payment_failed' : 'subscription_revoked';

          console.log(`[Polar Webhook] ✅ Subscription ended - downgraded from ${previousPlan} to basic`);
          
          await trackTradingViewDowngrade({
            userId: user.id,
            previousPlan: previousPlan as PlanType,
            reason: downgradeReason,
            polarSubscriptionId: subscription.id,
          });
          
          console.log(`[Polar Webhook] ✅ TradingView downgrade tracked (if applicable)`);
        }
        
        console.log(`[Polar Webhook] ✅ ${event.type} completed for user ${user.email}`);
        break;
      }
      
      case 'order.created':
      case 'order.paid': {
        const order = event.data;
        
        // Log full order data for debugging
        console.log(`[Polar Webhook] 📦 ${event.type} - Full order data:`, JSON.stringify({
          id: order.id,
          status: order.status,
          amount: order.amount,
          total_amount: order.total_amount,
          net_amount: order.net_amount,
          subtotal_amount: order.subtotal_amount,
          billing_reason: order.billing_reason,
          customer_email: order.customer?.email,
          product_name: order.product?.name,
          metadata: order.metadata,
        }));
        
        // Always skip order.created to avoid duplicate billing history
        if (event.type === 'order.created') {
          console.log(`[Polar Webhook] ⏭️ Skipping order.created to avoid duplicates`);
          break;
        }
        
        const customerEmail = order.customer?.email || (order as any).customer_email;
        const metadata = order.metadata as { user_id?: string; plan?: string; plan_name?: string; product_id?: string } | null;
        
        if (!metadata?.user_id && !customerEmail) break;
        
        let user = null;
        
        // Try to find user by metadata user_id first
        if (metadata?.user_id) {
          const { data } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('id', metadata.user_id)
            .single();
          user = data;
        }
        
        // Fallback to email if user not found by ID
        if (!user && customerEmail) {
          console.log(`[Polar Webhook] User not found by ID, trying email: ${customerEmail}`);
          user = await findUserByEmail(customerEmail);
        }

        if (user && metadata?.user_id) {
          user = await reconcileUserIdIfNeeded(user, metadata.user_id);
        }
        
        if (!user) {
          console.error('[Polar Webhook] Order paid - user not found');
          break;
        }
        
        console.log(`[Polar Webhook] Order paid - Found user: ${user.id} (${user.email})`);
        
        const productName = order.product?.name || 'basic';
        const plan = getPlanFromProduct({
          productName,
          productId: order.product?.id || (order as any).product_id,
          metadataPlan: metadata?.plan || null,
          metadataPlanName: metadata?.plan_name || null,
          metadataProductId: metadata?.product_id || null,
        });
        // Try multiple amount fields - Polar uses different ones in different events
        const orderAmount = resolveOrderAmount(order);
        console.log(`[Polar Webhook] Order amount: ${orderAmount} (raw: amount=${order.amount}, total_amount=${order.total_amount}, net_amount=${order.net_amount})`);
        let invoiceUrl = extractInvoiceUrlFromOrder(order);
        
        if (!invoiceUrl) {
          const polarMode = (process.env.POLAR_MODE || 'sandbox').trim();
          const polarApiUrl = polarMode === 'sandbox'
            ? 'https://sandbox-api.polar.sh/v1'
            : 'https://api.polar.sh/v1';
          const accessToken = (process.env.POLAR_ACCESS_TOKEN || '').trim();

          if (accessToken) {
            try {
              const orderRes = await fetch(`${polarApiUrl}/orders/${order.id}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
              if (orderRes.ok) {
                const fullOrder = await orderRes.json();
                invoiceUrl = extractInvoiceUrlFromOrder(fullOrder);
              }
            } catch (error) {
              console.error('[Polar Webhook] Failed to fetch order for invoice URL:', error);
            }
          }
        }

        if (!invoiceUrl) {
          invoiceUrl = `https://${isSandbox() ? 'sandbox.' : ''}polar.sh/orders/${order.id}/invoice`;
        }
        const invoiceId = order.invoice?.number || order.invoice?.id || order.invoice_number || null;
        
        // Update subscription
        await updateUserSubscription({
          userId: user.id,
          plan,
          status: 'active',
          polarCustomerId: order.customer?.id,
          polarSubscriptionId: order.subscription_id || undefined,
          amount: orderAmount,
        });

        // Clear any pending/approved cancellation requests when a new paid order is received
        await supabaseAdmin
          .from('cancellation_requests')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('status', ['pending', 'approved']);
        
        // Add billing history
        const planLabel = PLAN_LABELS[plan] || plan;
        await addBillingHistory({
          userId: user.id,
          amount: orderAmount,
          plan,
          status: 'completed',
          polarOrderId: order.id,
          description: `${planLabel} Plan - ${productName} - ${order.billing_reason || 'Purchase'}`,
          invoiceUrl,
          invoiceId,
          billingReason: order.billing_reason,
        });
        
        // Track TradingView upgrade ONLY on initial subscription purchase
        if (order.billing_reason === 'subscription_create') {
          await trackTradingViewUpgrade({
            userId: user.id,
            newPlan: plan,
            polarSubscriptionId: order.subscription_id || undefined,
          });
        }
        
        console.log(`[Polar Webhook] Order paid for user ${user.email}, plan ${plan}`);
        break;
      }

      case 'order.updated': {
        const order = event.data;
        const invoiceUrl = extractInvoiceUrlFromOrder(order);
        const invoiceId = order.invoice?.number || order.invoice?.id || order.invoice_number || null;
        const orderAmount = resolveOrderAmount(order);

        const updatePayload: Record<string, any> = {
          invoice_url: invoiceUrl || undefined,
          invoice_id: invoiceId || undefined,
        };

        if (orderAmount && orderAmount > 0) {
          updatePayload.amount = orderAmount / 100;
        }

        if (!invoiceUrl && !invoiceId && !updatePayload.amount) {
          console.log('[Polar Webhook] order.updated has no invoice or amount data');
          break;
        }

        const { error: updateError } = await supabaseAdmin
          .from('billing_history')
          .update(updatePayload)
          .eq('polar_order_id', order.id);

        if (updateError) {
          console.error('[Polar Webhook] Failed to update invoice URL:', updateError.message);
        } else {
          console.log('[Polar Webhook] ✅ Invoice URL updated from order.updated');
        }

        break;
      }
      
      case 'order.refunded': {
        console.log(`[Polar Webhook] 💰 Processing order.refunded event`);
        
        const order = event.data;
        const customerEmail = order.customer?.email;
        
        console.log(`[Polar Webhook] Order ID: ${order.id}`);
        console.log(`[Polar Webhook] Customer email: ${customerEmail}`);
        console.log(`[Polar Webhook] Refund amount: ${order.amount || order.total_amount || 0}`);
        console.log(`[Polar Webhook] Order data:`, JSON.stringify({
          id: order.id,
          amount: order.amount,
          total_amount: order.total_amount,
          product_name: order.product?.name,
          refund_reason: order.refund_reason
        }));
        
        if (!customerEmail) {
          console.error(`[Polar Webhook] ❌ No customer email in order.refunded event`);
          break;
        }
        
        const user = await findUserByEmail(customerEmail);
        if (!user) {
          console.error(`[Polar Webhook] ❌ User not found for email: ${customerEmail}`);
          break;
        }
        
        console.log(`[Polar Webhook] Found user: ${user.id} (${user.email})`);
        
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .single();
        
        const previousPlan = (sub?.plan || 'basic') as PlanType;
        console.log(`[Polar Webhook] User's previous plan: ${previousPlan}`);
        
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error(`[Polar Webhook] ❌ Failed to update subscription:`, updateError.message);
        } else {
          console.log(`[Polar Webhook] ✅ Subscription marked cancelled (plan retained)`);
        }
        
        const refundAmount = order.amount || order.total_amount || 0;
        console.log(`[Polar Webhook] Marking order as refunded: $${refundAmount / 100}`);

        const { data: existingBilling } = await supabaseAdmin
          .from('billing_history')
          .select('id, status')
          .eq('polar_order_id', order.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existingBilling) {
          if (existingBilling.status !== 'refunded') {
            await supabaseAdmin
              .from('billing_history')
              .update({ status: 'refunded' })
              .eq('id', existingBilling.id);
          }
        } else {
          await addBillingHistory({
            userId: user.id,
            amount: -refundAmount,
            plan: previousPlan,
            status: 'refunded',
            polarOrderId: order.id,
            description: `Refund - ${previousPlan} Plan`,
          });
        }

        // Clear cancellation requests after refund downgrade
        await supabaseAdmin
          .from('cancellation_requests')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('status', ['pending', 'approved']);
        
        await trackTradingViewDowngrade({
          userId: user.id,
          previousPlan,
          reason: 'refunded',
        });
        
        console.log(`[Polar Webhook] ✅ TradingView downgrade tracked (if applicable)`);
        console.log(`[Polar Webhook] ✅ order.refunded completed for user ${user.email}`);
        break;
      }
      
      default:
        console.log(`[Polar Webhook] ⚠️ Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true }, { status: 200 });
    
  } catch (error) {
    console.error('[Polar Webhook] ❌ Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
