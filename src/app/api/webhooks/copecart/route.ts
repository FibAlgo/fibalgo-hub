import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  sendSubscriptionActivatedEmail,
  sendPaymentFailedEmail,
  sendRefundProcessedEmail,
  sendSubscriptionCancelledEmail,
} from '@/lib/email';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Admin Client (service role — bypasses RLS)
// ─────────────────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// CopeCart IPN Secret — must match the key entered in CopeCart integration panel
// ─────────────────────────────────────────────────────────────────────────────
const COPECART_IPN_SECRET = process.env.COPECART_IPN_SECRET!;

// ─────────────────────────────────────────────────────────────────────────────
// Product ID → Plan mapping (from CopeCart product slugs)
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCT_PLAN_MAP: Record<string, 'premium' | 'ultimate'> = {
  '7a66056a': 'premium',
  '58924473': 'ultimate',
};

// ─────────────────────────────────────────────────────────────────────────────
// Plan configuration — prices from config.ts, 30-day subscription cycle
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_CONFIG: Record<string, { displayName: string; price: number; days: number }> = {
  premium:  { displayName: 'Premium Plan',  price: 24.99, days: 30 },
  ultimate: { displayName: 'Ultimate Plan', price: 49.99, days: 30 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Database-level IPN logging (survives removeConsole in production)
// ─────────────────────────────────────────────────────────────────────────────
async function dbLog(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): Promise<void> {
  try {
    await supabase.from('ipn_logs').insert({
      level,
      message,
      data: data || {},
      created_at: new Date().toISOString(),
    });
  } catch {
    // Last resort — console.error survives removeConsole with exclude config
    console.error('[IPN DB LOG FAILED]', level, message, data);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CopeCart IPN Payload Type (from IPN Documentation v1.6.7)
// ─────────────────────────────────────────────────────────────────────────────
interface CopeCartIPN {
  // ── Event ─────────────────────────────────────────────────
  event_type: string;           // payment.made | payment.trial | payment.failed | payment.pending | payment.refunded | payment.charged_back | payment.recurring.cancelled | payment.recurring.upcoming

  // ── Order ─────────────────────────────────────────────────
  order_id: string;             // Unique order id (e.g. M6B5zL7i)
  order_date: string;           // ISO date
  order_time: string | null;
  order_source_identifier: string | null; // null | shopping_cart | phone_offer

  // ── Product ───────────────────────────────────────────────
  product_id: string;           // Unique product id (e.g. 7a66056a)
  product_name: string;
  product_type: string;         // digital | electronic_book | event | physical | printed_book | services
  product_internal_name: string;
  category_name: string;
  category_option_name: string;

  // ── Buyer ─────────────────────────────────────────────────
  buyer_id: string;
  buyer_email: string;
  buyer_firstname: string;
  buyer_lastname: string;
  buyer_phone_number: string;
  buyer_country: string;
  buyer_country_code: string;
  buyer_address: string;
  buyer_city: string;
  buyer_zipcode: string;
  buyer_company_name: string;
  buyer_vat_number: string;
  buyer_subscribed_for_newsletter: boolean;

  // ── Payment ───────────────────────────────────────────────
  payment_method: string;       // credit_card | sepa | sofort | paypal | invoice | test
  payment_plan: string;         // one_time_payment | breakdown_payment | abonnement
  payment_status: string;       // paid | pending | trial | failed | upcoming | successed_refunded | chargeback_succeeded | ...

  // ── Transaction ───────────────────────────────────────────
  transaction_id: string;
  transaction_amount: number;
  transaction_earned_amount: number;
  transaction_currency: string;
  transaction_date: string;
  transaction_type: string;     // sale | refund | chargeback
  transaction_processed_at: string;
  transaction_vat_amount: number;
  transaction_amount_per_product: Array<{ amount: number; vat_amount: number; slug: string; is_addon: boolean; name: string; internal_name: string }>;

  // ── Recurring ─────────────────────────────────────────────
  rate_number: number;
  total_number_of_payments: number;
  frequency: string;            // daily | weekly | biweekly | monthly | quarterly | half_yearly | yearly
  first_payment: number;
  next_payments: number;
  next_payment_at: string | null;
  is_cancelled_for: string | null; // Date — access should stop on this day
  subscription_state: string;
  cancelation_reason: string;

  // ── Amounts ───────────────────────────────────────────────
  earned_amount: number;
  line_item_amount: number;
  line_item_vat_amount: number;
  shipping_price: number;
  quantity: number;

  // ── Flags ─────────────────────────────────────────────────
  is_upsell: boolean;
  is_addon: boolean;
  test_payment: boolean;

  // ── Extra ─────────────────────────────────────────────────
  affiliate: string;
  tags: string[];
  metadata: string | null;       // Our user UUID passed via checkout URL ?metadata=UUID
  cash_flow_at: string;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  1. SIGNATURE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
function verifySignature(rawBody: string, signature: string): boolean {
  if (!COPECART_IPN_SECRET || !signature) return false;

  const generated = crypto
    .createHmac('sha256', COPECART_IPN_SECRET)
    .update(rawBody)
    .digest('base64');

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(generated, 'utf8')
    );
  } catch {
    return false;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  2. USER RESOLUTION — metadata (UUID) → email fallback
// ═══════════════════════════════════════════════════════════════════════════════
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveUserId(ipn: CopeCartIPN): Promise<string | null> {
  // Priority 1 — metadata contains the site user UUID
  if (ipn.metadata) {
    const candidate = ipn.metadata.trim();
    if (UUID_RE.test(candidate)) {
      const { data } = await supabase.from('users').select('id').eq('id', candidate).single();
      if (data) {
        console.log('[CopeCart IPN] User resolved via metadata:', candidate);
        return data.id;
      }
    }
    console.warn('[CopeCart IPN] metadata present but user not found:', ipn.metadata);
  }

  // Priority 2 — match buyer_email against users table
  if (ipn.buyer_email) {
    const email = ipn.buyer_email.toLowerCase().trim();
    const { data } = await supabase.from('users').select('id').eq('email', email).single();
    if (data) {
      console.log('[CopeCart IPN] User resolved via email:', email);
      return data.id;
    }

    // Priority 3 — check auth.users (e-mail might exist there but not yet in public.users)
    const { data: authList } = await supabase.auth.admin.listUsers();
    const authUser = authList?.users?.find(u => u.email?.toLowerCase() === email);
    if (authUser) {
      console.log('[CopeCart IPN] User resolved via auth.users:', email);
      return authUser.id;
    }
  }

  return null;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  3. IDEMPOTENCY — prevent duplicate processing of the same transaction
// ═══════════════════════════════════════════════════════════════════════════════
async function isAlreadyProcessed(transactionId: string, eventType: string): Promise<boolean> {
  // For payment.made — check billing_history by invoice_id
  if (eventType === 'payment.made' || eventType === 'payment.trial') {
    const { data } = await supabase
      .from('billing_history')
      .select('id')
      .eq('invoice_id', `IPN-${transactionId}`)
      .single();
    return !!data;
  }

  // For refund — check if refund record already exists
  if (eventType === 'payment.refunded') {
    const { data } = await supabase
      .from('billing_history')
      .select('id')
      .eq('invoice_id', `IPN-REFUND-${transactionId}`)
      .single();
    return !!data;
  }

  // For chargeback — check if chargeback record already exists
  if (eventType === 'payment.charged_back') {
    const { data } = await supabase
      .from('billing_history')
      .select('id')
      .eq('invoice_id', `IPN-CB-${transactionId}`)
      .single();
    return !!data;
  }

  // For cancellation — check by order_id
  if (eventType === 'payment.recurring.cancelled') {
    const { data } = await supabase
      .from('billing_history')
      .select('id')
      .eq('invoice_id', `IPN-CANCEL-${transactionId}`)
      .single();
    return !!data;
  }

  return false;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  4a. TRADINGVIEW DOWNGRADE QUEUE — queue Ultimate users for TV access removal
// ═══════════════════════════════════════════════════════════════════════════════
async function queueTradingViewDowngrade(
  userId: string,
  previousPlan: string,
  reason: string,
  notes: string
): Promise<void> {
  if (previousPlan !== 'ultimate') return; // Only Ultimate has TradingView access

  try {
    // Get user info for the downgrade record
    const { data: userData } = await supabase
      .from('users')
      .select('email, full_name, trading_view_id')
      .eq('id', userId)
      .single();

    if (!userData) return;

    // Check if a pending downgrade already exists for this user
    const { data: existingDowngrade } = await supabase
      .from('tradingview_downgrades')
      .select('id')
      .eq('user_id', userId)
      .eq('is_removed', false)
      .single();

    if (existingDowngrade) {
      console.log('[CopeCart IPN] TradingView downgrade already queued for:', userId);
      return;
    }

    await supabase.from('tradingview_downgrades').insert({
      user_id: userId,
      email: userData.email,
      full_name: userData.full_name || null,
      tradingview_id: userData.trading_view_id || null,
      tradingview_username: userData.trading_view_id || null,
      previous_plan: previousPlan,
      downgrade_reason: reason,
      is_removed: false,
      notes,
    });

    console.log(`[CopeCart IPN] 📉 TradingView downgrade queued: user=${userId}, reason=${reason}`);
  } catch (err) {
    console.error('[CopeCart IPN] Failed to queue TradingView downgrade:', err);
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  4b. PLAN RESOLVER — product_id → plan name
// ═══════════════════════════════════════════════════════════════════════════════
function resolvePlan(ipn: CopeCartIPN): 'premium' | 'ultimate' | null {
  return PRODUCT_PLAN_MAP[ipn.product_id] || null;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  5. EVENT HANDLER — payment.made  (New subscription / Renewal / Upgrade)
// ═══════════════════════════════════════════════════════════════════════════════
async function handlePaymentMade(ipn: CopeCartIPN): Promise<void> {
  const plan = resolvePlan(ipn);
  if (!plan) {
    console.error('[CopeCart IPN] Unknown product_id:', ipn.product_id);
    return;
  }

  const userId = await resolveUserId(ipn);
  if (!userId) {
    await logUnmatchedPayment(ipn, plan);
    return;
  }

  // Log test payments but still process them (CopeCart test mode uses test_payment=true)
  if (ipn.test_payment) {
    await dbLog('info', 'Processing TEST payment', { order_id: ipn.order_id, product_id: ipn.product_id });
  }

  const config = PLAN_CONFIG[plan];
  const now = new Date();

  // ── Check existing subscription ────────────────────────────────────
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, plan, end_date, expires_at, status, is_active')
    .eq('user_id', userId)
    .limit(1)
    .single();

  // If active sub exists and hasn't expired → extend from its end date
  let startDate = now;
  if (existingSub) {
    const endVal = existingSub.expires_at || existingSub.end_date;
    if (endVal && new Date(endVal) > now) {
      startDate = new Date(endVal);
      console.log('[CopeCart IPN] Extending from existing end date:', startDate.toISOString());
    }
  }

  const subscriptionEnd = new Date(startDate.getTime() + config.days * 24 * 60 * 60 * 1000);
  const daysRemaining = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // ── Upsert subscription ────────────────────────────────────────────
  let subscriptionResult;

  const subscriptionPayload = {
    plan,
    plan_id: plan,
    plan_name: config.displayName,
    status: 'active' as const,
    start_date: now.toISOString().split('T')[0],
    end_date: subscriptionEnd.toISOString().split('T')[0],
    started_at: now.toISOString(),
    expires_at: subscriptionEnd.toISOString(),
    days_remaining: daysRemaining,
    is_active: true,
    updated_at: now.toISOString(),
  };

  if (existingSub) {
    subscriptionResult = await supabase
      .from('subscriptions')
      .update(subscriptionPayload)
      .eq('id', existingSub.id)
      .select();
  } else {
    subscriptionResult = await supabase
      .from('subscriptions')
      .insert({ user_id: userId, ...subscriptionPayload })
      .select();
  }

  if (subscriptionResult.error) {
    console.error('[CopeCart IPN] Subscription upsert failed:', subscriptionResult.error);
    throw new Error('Subscription activation failed');
  }

  const subscriptionId = subscriptionResult.data?.[0]?.id;

  // ── Billing history ────────────────────────────────────────────────
  const isRenewal = ipn.rate_number > 1;
  const description = isRenewal
    ? `${config.displayName} - Renewal (Payment ${ipn.rate_number}/${ipn.total_number_of_payments || '∞'})`
    : `${config.displayName} - ${config.days} days`;

  await supabase.from('billing_history').insert({
    user_id: userId,
    subscription_id: subscriptionId,
    invoice_id: `IPN-${ipn.transaction_id}`,
    invoice_number: `COPE-${ipn.order_id}`,
    amount: ipn.transaction_amount || config.price,
    currency: ipn.transaction_currency || 'EUR',
    description,
    plan_description: `${config.displayName} - ${config.days} days (CopeCart)`,
    payment_method: `copecart_${ipn.payment_method || 'unknown'}`,
    status: 'completed',
    added_by: 'copecart-ipn',
  });

  // ── TradingView upgrade queue (Ultimate only) ──────────────────────
  if (plan === 'ultimate') {
    const { data: userData } = await supabase
      .from('users')
      .select('trading_view_id, email')
      .eq('id', userId)
      .single();

    const { data: existingUpgrade } = await supabase
      .from('tradingview_upgrades')
      .select('id')
      .eq('user_id', userId)
      .eq('is_granted', false)
      .single();

    if (!existingUpgrade) {
      await supabase.from('tradingview_upgrades').insert({
        user_id: userId,
        email: userData?.email || ipn.buyer_email,
        tradingview_username: userData?.trading_view_id || null,
        plan: 'ultimate',
        is_granted: false,
        notes: `CopeCart IPN — Order ${ipn.order_id}, Tx ${ipn.transaction_id}`,
      });
      console.log('[CopeCart IPN] TradingView upgrade queued for:', userId);
    }
  }

  // ── Send subscription activated email ────────────────────────
  try {
    const buyerName = [ipn.buyer_firstname, ipn.buyer_lastname].filter(Boolean).join(' ') || undefined;
    await sendSubscriptionActivatedEmail(ipn.buyer_email, buyerName, plan, subscriptionEnd.toISOString());
    console.log(`[CopeCart IPN] 📧 Subscription activated email sent to: ${ipn.buyer_email}`);
  } catch (emailErr) {
    console.error('[CopeCart IPN] Failed to send subscription activated email:', emailErr);
  }

  console.log(
    `[CopeCart IPN] ✅ Subscription activated:`,
    `user=${userId} plan=${plan} expires=${subscriptionEnd.toISOString()} renewal=${isRenewal}`
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
//  6. EVENT HANDLER — payment.failed  (Payment failed → downgrade to basic)
// ═══════════════════════════════════════════════════════════════════════════════
async function handlePaymentFailed(ipn: CopeCartIPN): Promise<void> {
  const userId = await resolveUserId(ipn);
  if (!userId) {
    console.warn('[CopeCart IPN] payment.failed: user not found for order:', ipn.order_id);
    return;
  }

  // Get current subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, plan, end_date, expires_at, status')
    .eq('user_id', userId)
    .neq('plan', 'basic')
    .single();

  if (!sub) {
    console.log('[CopeCart IPN] payment.failed: no paid subscription for user:', userId);
    return;
  }

  // Payment failed → immediate downgrade to basic regardless of remaining time
  const now = new Date();

  await supabase
    .from('subscriptions')
    .update({
      plan: 'basic',
      plan_id: 'basic',
      plan_name: 'Basic Plan',
      status: 'expired',
      end_date: now.toISOString().split('T')[0],
      expires_at: now.toISOString(),
      days_remaining: 0,
      is_active: true,
      updated_at: now.toISOString(),
    })
    .eq('id', sub.id);

  // Add billing record for failed payment
  await supabase.from('billing_history').insert({
    user_id: userId,
    invoice_id: `IPN-FAIL-${ipn.transaction_id}`,
    invoice_number: `COPE-FAIL-${ipn.order_id}`,
    amount: ipn.transaction_amount || 0,
    currency: ipn.transaction_currency || 'EUR',
    description: `Payment Failed — Downgraded to Basic`,
    plan_description: `Payment failed for ${ipn.product_name || 'subscription'}`,
    payment_method: `copecart_${ipn.payment_method || 'unknown'}`,
    status: 'failed',
    added_by: 'copecart-ipn',
  });

  // Queue TradingView downgrade if was Ultimate
  const previousPlan = sub.plan || 'unknown';
  await queueTradingViewDowngrade(userId, previousPlan, 'payment_failed', `Payment failed — Order ${ipn.order_id}, Tx ${ipn.transaction_id}`);

  // ── Send payment failed email ────────────────────────────────
  try {
    const buyerName = [ipn.buyer_firstname, ipn.buyer_lastname].filter(Boolean).join(' ') || undefined;
    await sendPaymentFailedEmail(ipn.buyer_email, buyerName, previousPlan);
    console.log(`[CopeCart IPN] 📧 Payment failed email sent to: ${ipn.buyer_email}`);
  } catch (emailErr) {
    console.error('[CopeCart IPN] Failed to send payment failed email:', emailErr);
  }

  console.log(`[CopeCart IPN] ⬇️ Downgraded to basic (payment failed): user=${userId}`);
}


// ═══════════════════════════════════════════════════════════════════════════════
//  7. EVENT HANDLER — payment.refunded  (Refund → immediate deactivation)
// ═══════════════════════════════════════════════════════════════════════════════
async function handlePaymentRefunded(ipn: CopeCartIPN): Promise<void> {
  const userId = await resolveUserId(ipn);
  if (!userId) {
    console.warn('[CopeCart IPN] Refund: user not found for order:', ipn.order_id);
    return;
  }

  const now = new Date();

  // Get current plan BEFORE downgrading (needed for TradingView downgrade check)
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .neq('plan', 'basic')
    .single();
  const previousPlan = currentSub?.plan || 'unknown';

  // Deactivate subscription → downgrade to basic immediately
  await supabase
    .from('subscriptions')
    .update({
      plan: 'basic',
      plan_id: 'basic',
      plan_name: 'Basic Plan',
      status: 'refunded',
      end_date: now.toISOString().split('T')[0],
      expires_at: now.toISOString(),
      days_remaining: 0,
      is_active: true, // basic is always "active"
      updated_at: now.toISOString(),
    })
    .eq('user_id', userId)
    .neq('plan', 'basic');

  // Update the original billing record to refunded
  const { data: originalBilling } = await supabase
    .from('billing_history')
    .select('id')
    .eq('invoice_number', `COPE-${ipn.order_id}`)
    .eq('user_id', userId)
    .single();

  if (originalBilling) {
    await supabase
      .from('billing_history')
      .update({ status: 'refunded' })
      .eq('id', originalBilling.id);
  }

  // Also add a new billing record documenting the refund
  await supabase.from('billing_history').insert({
    user_id: userId,
    invoice_id: `IPN-REFUND-${ipn.transaction_id}`,
    invoice_number: `COPE-REFUND-${ipn.order_id}`,
    amount: -(ipn.transaction_amount || 0), // Negative amount for refund
    currency: ipn.transaction_currency || 'EUR',
    description: `Refund — ${ipn.product_name || 'Subscription'}`,
    plan_description: `Refund processed for order ${ipn.order_id}`,
    payment_method: `copecart_${ipn.payment_method || 'unknown'}`,
    status: 'refunded',
    added_by: 'copecart-ipn',
  });

  // Queue TradingView downgrade if was Ultimate
  await queueTradingViewDowngrade(userId, previousPlan, 'refunded', `Refund — Order ${ipn.order_id}, Tx ${ipn.transaction_id}`);

  // ── Send refund processed email ────────────────────────────────
  try {
    const buyerName = [ipn.buyer_firstname, ipn.buyer_lastname].filter(Boolean).join(' ') || undefined;
    await sendRefundProcessedEmail(ipn.buyer_email, buyerName, previousPlan);
    console.log(`[CopeCart IPN] 📧 Refund processed email sent to: ${ipn.buyer_email}`);
  } catch (emailErr) {
    console.error('[CopeCart IPN] Failed to send refund processed email:', emailErr);
  }

  console.log(`[CopeCart IPN] 💸 Refund processed, downgraded to basic: user=${userId}, order=${ipn.order_id}`);
}


// ═══════════════════════════════════════════════════════════════════════════════
//  8. EVENT HANDLER — payment.charged_back  (Chargeback → immediate deactivation)
// ═══════════════════════════════════════════════════════════════════════════════
async function handlePaymentChargedBack(ipn: CopeCartIPN): Promise<void> {
  const userId = await resolveUserId(ipn);
  if (!userId) {
    console.warn('[CopeCart IPN] Chargeback: user not found for order:', ipn.order_id);
    return;
  }

  const now = new Date();

  // Get current plan BEFORE downgrading (needed for TradingView downgrade check)
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .neq('plan', 'basic')
    .single();
  const previousPlan = currentSub?.plan || 'unknown';

  // Immediately deactivate — chargeback is more severe than refund
  await supabase
    .from('subscriptions')
    .update({
      plan: 'basic',
      plan_id: 'basic',
      plan_name: 'Basic Plan',
      status: 'cancelled',
      end_date: now.toISOString().split('T')[0],
      expires_at: now.toISOString(),
      days_remaining: 0,
      is_active: true,
      updated_at: now.toISOString(),
    })
    .eq('user_id', userId)
    .neq('plan', 'basic');

  // Update original billing record
  const { data: originalBilling } = await supabase
    .from('billing_history')
    .select('id')
    .eq('invoice_number', `COPE-${ipn.order_id}`)
    .eq('user_id', userId)
    .single();

  if (originalBilling) {
    await supabase
      .from('billing_history')
      .update({ status: 'failed' })
      .eq('id', originalBilling.id);
  }

  // Add chargeback billing record
  await supabase.from('billing_history').insert({
    user_id: userId,
    invoice_id: `IPN-CB-${ipn.transaction_id}`,
    invoice_number: `COPE-CB-${ipn.order_id}`,
    amount: -(ipn.transaction_amount || 0),
    currency: ipn.transaction_currency || 'EUR',
    description: `Chargeback — ${ipn.product_name || 'Subscription'}`,
    plan_description: `Chargeback for order ${ipn.order_id}`,
    payment_method: `copecart_${ipn.payment_method || 'unknown'}`,
    status: 'failed',
    added_by: 'copecart-ipn',
  });

  // Queue TradingView downgrade if was Ultimate
  await queueTradingViewDowngrade(userId, previousPlan, 'chargeback', `Chargeback — Order ${ipn.order_id}, Tx ${ipn.transaction_id}`);

  console.log(`[CopeCart IPN] 🚫 Chargeback — downgraded to basic: user=${userId}, order=${ipn.order_id}`);
}


// ═══════════════════════════════════════════════════════════════════════════════
//  9. EVENT HANDLER — payment.recurring.cancelled
//     User cancelled subscription → let current period run out, then daily cron
//     (check-subscriptions) handles the actual downgrade to basic when end_date passes
// ═══════════════════════════════════════════════════════════════════════════════
async function handleRecurringCancelled(ipn: CopeCartIPN): Promise<void> {
  const userId = await resolveUserId(ipn);
  if (!userId) {
    console.warn('[CopeCart IPN] Recurring cancel: user not found for order:', ipn.order_id);
    return;
  }

  const now = new Date();

  // Don't deactivate immediately — user paid for the current period
  // is_cancelled_for = the date when access should stop
  const cancelDate = ipn.is_cancelled_for || null;

  const updatePayload: Record<string, unknown> = {
    status: 'cancelled',
    updated_at: now.toISOString(),
  };

  // If CopeCart tells us when to stop access, set it as end_date
  if (cancelDate) {
    updatePayload.end_date = cancelDate;
    updatePayload.expires_at = new Date(cancelDate).toISOString();
    const diffDays = Math.max(0, Math.ceil((new Date(cancelDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    updatePayload.days_remaining = diffDays;
  }

  await supabase
    .from('subscriptions')
    .update(updatePayload)
    .eq('user_id', userId)
    .in('status', ['active']);

  // Add billing record documenting the cancellation
  await supabase.from('billing_history').insert({
    user_id: userId,
    invoice_id: `IPN-CANCEL-${ipn.transaction_id || ipn.order_id}`,
    invoice_number: `COPE-CANCEL-${ipn.order_id}`,
    amount: 0,
    currency: ipn.transaction_currency || 'EUR',
    description: `Subscription Cancelled — Access until ${cancelDate || 'end of current period'}`,
    plan_description: `Cancellation: ${ipn.cancelation_reason || 'No reason provided'}`,
    payment_method: `copecart_${ipn.payment_method || 'unknown'}`,
    status: 'completed',
    added_by: 'copecart-ipn',
  });

  // ── Send subscription cancelled email ────────────────────────
  try {
    const buyerName = [ipn.buyer_firstname, ipn.buyer_lastname].filter(Boolean).join(' ') || undefined;
    // Get current plan name for the email
    const { data: currentSubForEmail } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .single();
    await sendSubscriptionCancelledEmail(ipn.buyer_email, buyerName, currentSubForEmail?.plan || undefined, cancelDate || undefined);
    console.log(`[CopeCart IPN] 📧 Subscription cancelled email sent to: ${ipn.buyer_email}`);
  } catch (emailErr) {
    console.error('[CopeCart IPN] Failed to send subscription cancelled email:', emailErr);
  }

  console.log(
    `[CopeCart IPN] ⏳ Subscription cancelled, access until ${cancelDate || 'current period end'}: user=${userId}`
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 10. EVENT HANDLER — payment.recurring.upcoming  (Next payment reminder)
// ═══════════════════════════════════════════════════════════════════════════════
async function handleRecurringUpcoming(ipn: CopeCartIPN): Promise<void> {
  // Informational only — no database changes needed
  console.log(
    `[CopeCart IPN] 📅 Upcoming payment:`,
    `order=${ipn.order_id}`,
    `next_at=${ipn.next_payment_at}`,
    `amount=${ipn.next_payments} ${ipn.transaction_currency}`,
    `rate=${ipn.rate_number}/${ipn.total_number_of_payments}`
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 11. UNMATCHED PAYMENT LOGGER
// ═══════════════════════════════════════════════════════════════════════════════
async function logUnmatchedPayment(ipn: CopeCartIPN, plan: string): Promise<void> {
  console.error(
    `[CopeCart IPN] ❌ UNMATCHED PAYMENT — MANUAL RESOLUTION REQUIRED`,
    JSON.stringify({
      order_id: ipn.order_id,
      transaction_id: ipn.transaction_id,
      buyer_email: ipn.buyer_email,
      buyer_name: `${ipn.buyer_firstname} ${ipn.buyer_lastname}`,
      buyer_id: ipn.buyer_id,
      metadata: ipn.metadata || 'none',
      product_id: ipn.product_id,
      product_name: ipn.product_name,
      plan,
      amount: `${ipn.transaction_amount} ${ipn.transaction_currency}`,
      payment_method: ipn.payment_method,
      event_type: ipn.event_type,
      timestamp: new Date().toISOString(),
    })
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// 12. AUDIT LOGGER
// ═══════════════════════════════════════════════════════════════════════════════
function logIPN(ipn: CopeCartIPN, verified: boolean): void {
  console.log('[CopeCart IPN] ──────────────────────────────────────────');
  console.log('[CopeCart IPN] Received:', JSON.stringify({
    event_type: ipn.event_type,
    order_id: ipn.order_id,
    product_id: ipn.product_id,
    product_name: ipn.product_name,
    buyer_email: ipn.buyer_email,
    metadata: ipn.metadata,
    transaction_id: ipn.transaction_id,
    transaction_amount: ipn.transaction_amount,
    transaction_currency: ipn.transaction_currency,
    payment_status: ipn.payment_status,
    payment_method: ipn.payment_method,
    payment_plan: ipn.payment_plan,
    rate_number: ipn.rate_number,
    total_number_of_payments: ipn.total_number_of_payments,
    is_cancelled_for: ipn.is_cancelled_for,
    test_payment: ipn.test_payment,
    verified,
  }));
}


// ═══════════════════════════════════════════════════════════════════════════════
// ██  POST /api/webhooks/copecart  —  MAIN IPN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // DB log: request received
  await dbLog('info', 'IPN request received', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });

  try {
    // ── Read raw body ──────────────────────────────────────────────
    const rawBody = await request.text();

    await dbLog('info', 'Raw body received', {
      bodyLength: rawBody.length,
      bodyPreview: rawBody.substring(0, 500),
    });

    // ── Verify HMAC-SHA256 signature ───────────────────────────────
    const signature = request.headers.get('x-copecart-signature') || '';

    await dbLog('info', 'Signature check', {
      signaturePresent: !!signature,
      signatureLength: signature.length,
      secretPresent: !!COPECART_IPN_SECRET,
      secretLength: COPECART_IPN_SECRET?.length || 0,
    });

    if (!verifySignature(rawBody, signature)) {
      await dbLog('error', 'Signature verification FAILED', {
        receivedSignature: signature,
        bodyLength: rawBody.length,
      });
      console.error('[CopeCart IPN] ❌ Signature verification FAILED');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await dbLog('info', 'Signature verified OK');

    // ── Parse JSON ─────────────────────────────────────────────────
    const ipn: CopeCartIPN = JSON.parse(rawBody);

    // ── Log full IPN payload to DB ─────────────────────────────────
    await dbLog('info', 'IPN parsed successfully', {
      event_type: ipn.event_type,
      order_id: ipn.order_id,
      product_id: ipn.product_id,
      product_name: ipn.product_name,
      buyer_email: ipn.buyer_email,
      buyer_id: ipn.buyer_id,
      metadata: ipn.metadata,
      transaction_id: ipn.transaction_id,
      transaction_amount: ipn.transaction_amount,
      transaction_currency: ipn.transaction_currency,
      payment_status: ipn.payment_status,
      payment_method: ipn.payment_method,
      payment_plan: ipn.payment_plan,
      test_payment: ipn.test_payment,
      rate_number: ipn.rate_number,
    });

    // ── Log every IPN for audit trail ──────────────────────────────
    logIPN(ipn, true);

    // ── Idempotency — skip if already processed ────────────────────
    if (await isAlreadyProcessed(ipn.transaction_id, ipn.event_type)) {
      await dbLog('info', 'Already processed, skipping', { transaction_id: ipn.transaction_id, event_type: ipn.event_type });
      console.warn('[CopeCart IPN] ⏭️ Already processed, skipping:', ipn.transaction_id, ipn.event_type);
      return new NextResponse('OK', { status: 200 });
    }

    // ── Route to event handler ─────────────────────────────────────
    switch (ipn.event_type) {
      // ── Payment successful ────────────────────────────────
      case 'payment.made':
        await handlePaymentMade(ipn);
        break;

      // ── Trial payment (treat as new subscription) ─────────
      case 'payment.trial':
        console.log('[CopeCart IPN] Trial payment → activating as regular subscription');
        await handlePaymentMade(ipn);
        break;

      // ── Payment failed ────────────────────────────────────
      case 'payment.failed':
        await handlePaymentFailed(ipn);
        break;

      // ── Payment pending (not yet processed) ───────────────
      case 'payment.pending':
        console.log('[CopeCart IPN] ⏳ Payment pending:', ipn.order_id, ipn.payment_status);
        break;

      // ── Refund processed ──────────────────────────────────
      case 'payment.refunded':
        await handlePaymentRefunded(ipn);
        break;

      // ── Chargeback ────────────────────────────────────────
      case 'payment.charged_back':
        await handlePaymentChargedBack(ipn);
        break;

      // ── Recurring subscription cancelled ──────────────────
      case 'payment.recurring.cancelled':
        await handleRecurringCancelled(ipn);
        break;

      // ── Upcoming recurring payment notification ───────────
      case 'payment.recurring.upcoming':
        await handleRecurringUpcoming(ipn);
        break;

      // ── Unknown event ─────────────────────────────────────
      default:
        await dbLog('warn', 'Unhandled event_type', { event_type: ipn.event_type });
        console.warn('[CopeCart IPN] Unhandled event_type:', ipn.event_type);
    }

    const elapsed = Date.now() - startTime;
    await dbLog('info', `IPN processed successfully in ${elapsed}ms`, {
      event_type: ipn.event_type,
      order_id: ipn.order_id,
      elapsed_ms: elapsed,
    });
    console.warn(`[CopeCart IPN] ✅ Processed in ${elapsed}ms: ${ipn.event_type} → ${ipn.order_id}`);

    // CopeCart requires "OK" (uppercase, without quotes) for success
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    const elapsed = Date.now() - startTime;
    await dbLog('error', `Fatal error after ${elapsed}ms`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.error(`[CopeCart IPN] 💥 Fatal error after ${elapsed}ms:`, error);
    // Return 500 → CopeCart retries up to 10 times over 3 hours
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/webhooks/copecart — Health check
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'CopeCart IPN Webhook',
    version: '2.0.0',
    events: [
      'payment.made',
      'payment.trial',
      'payment.failed',
      'payment.pending',
      'payment.refunded',
      'payment.charged_back',
      'payment.recurring.cancelled',
      'payment.recurring.upcoming',
    ],
    timestamp: new Date().toISOString(),
  });
}
