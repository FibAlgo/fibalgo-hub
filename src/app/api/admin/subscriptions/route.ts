import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PLAN_PRICES } from '@/lib/config';
import { requireAdmin, getErrorStatus, maskEmail, sanitizeDbError } from '@/lib/api/auth';
import { sendSubscriptionActivatedEmail, sendAdminDowngradeEmail } from '@/lib/email';

// Use service role for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST - Add or update subscription
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const { userId, plan, days, amount, paymentMethod, createBillingRecord } = body;

    console.log(`[Admin Subscriptions] Admin ${maskEmail(adminUser.email)} adding subscription for user ${userId}`);

    // 🔒 SECURITY: Input validation
    if (!userId || !plan || days === undefined || days === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate userId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    // Validate plan
    const validPlans = ['basic', 'premium', 'ultimate', 'lifetime'];
    if (!validPlans.includes(plan.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    const daysNumber = Number(days);
    if (Number.isNaN(daysNumber) || daysNumber < 0 || daysNumber > 36500) { // Max 100 years
      return NextResponse.json({ error: 'Invalid days value (must be 0-36500)' }, { status: 400 });
    }

    // Validate amount if provided
    if (amount !== undefined && amount !== null) {
      const parsedAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
      if (Number.isNaN(parsedAmount) || parsedAmount < 0 || parsedAmount > 100000) {
        return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
      }
    }

    const now = new Date();
    // For lifetime plan, set expiry to 100 years in the future
    const isLifetime = plan === 'lifetime';
    const endDate = isLifetime 
      ? new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years
      : new Date(now.getTime() + daysNumber * 24 * 60 * 60 * 1000);
    
    // Use provided amount or fallback to config price
    // This preserves the exact amount user paid (important for discounts)
    const planKey = plan.toLowerCase() as keyof typeof PLAN_PRICES;
    const defaultPrice = PLAN_PRICES[planKey] ?? 0;
    const numericAmount = amount 
      ? parseFloat(String(amount).replace(/[^0-9.]/g, '')) 
      : defaultPrice;
    // Always use USD for all transactions
    const currency = 'USD';

    // Check if user has existing subscription
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (existingSub) {
      // Update existing subscription
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan_id: plan,
          plan_name: plan.charAt(0).toUpperCase() + plan.slice(1),
          plan: plan,
          status: 'active',
          start_date: now.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          expires_at: endDate.toISOString(),
          days_remaining: daysNumber,
          is_active: true,
          updated_at: now.toISOString(),
        })
        .eq('id', existingSub.id);

      if (error) {
        console.error('Error updating subscription:', error);
        return NextResponse.json({ error: sanitizeDbError(error, 'update_subscription') }, { status: 500 });
      }

      // Clear any pending/approved cancellation requests since user got a new subscription
      await supabaseAdmin
        .from('cancellation_requests')
        .update({ status: 'rejected' })
        .eq('user_id', userId)
        .eq('status', 'pending');
      
      await supabaseAdmin
        .from('cancellation_requests')
        .update({ status: 'rejected' })
        .eq('user_id', userId)
        .eq('status', 'approved');

      // Clear any approved refund requests since user got a new subscription (allows new refund eligibility)
      await supabaseAdmin
        .from('refund_requests')
        .update({ status: 'closed' })
        .eq('user_id', userId)
        .eq('status', 'approved');
    } else {
      // Create new subscription
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: plan,
          plan_name: plan.charAt(0).toUpperCase() + plan.slice(1),
          plan: plan,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: endDate.toISOString(),
          start_date: now.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          days_remaining: daysNumber,
          is_active: true,
        });

      if (error) {
        console.error('Error creating subscription:', error);
        return NextResponse.json({ error: sanitizeDbError(error, 'create_subscription') }, { status: 500 });
      }

      // Clear any pending/approved cancellation requests since user got a new subscription
      await supabaseAdmin
        .from('cancellation_requests')
        .update({ status: 'rejected' })
        .eq('user_id', userId)
        .eq('status', 'pending');
      
      await supabaseAdmin
        .from('cancellation_requests')
        .update({ status: 'rejected' })
        .eq('user_id', userId)
        .eq('status', 'approved');

      // Clear any approved refund requests since user got a new subscription (allows new refund eligibility)
      await supabaseAdmin
        .from('refund_requests')
        .update({ status: 'closed' })
        .eq('user_id', userId)
        .eq('status', 'approved');
    }

    // Add billing record (only if admin checked the billing checkbox)
    if (createBillingRecord !== false) {
      const planDescription = `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${daysNumber} days`;
      
      await supabaseAdmin
        .from('billing_history')
        .insert({
          user_id: userId,
          invoice_id: `INV-${Date.now()}`,
          amount: numericAmount,
          currency: currency,
          plan_description: planDescription,
          payment_method: paymentMethod || 'crypto',
          status: 'completed',
          billing_reason: 'subscription_create',
        });
    }

    // ── TradingView upgrade/downgrade queue + access_granted flag ──
    const planLower = plan.toLowerCase();
    const isUltimateOrLifetime = planLower === 'ultimate' || planLower === 'lifetime';

    if (isUltimateOrLifetime) {
      // Set tradingview_access_granted = false (pending admin grant)
      await supabaseAdmin
        .from('subscriptions')
        .update({ tradingview_access_granted: false })
        .eq('user_id', userId);

      // Queue TradingView upgrade if not already pending
      const { data: tvUser } = await supabaseAdmin
        .from('users')
        .select('email, full_name, trading_view_id')
        .eq('id', userId)
        .single();

      const { data: existingUpgrade } = await supabaseAdmin
        .from('tradingview_upgrades')
        .select('id')
        .eq('user_id', userId)
        .eq('is_granted', false)
        .maybeSingle();

      if (!existingUpgrade) {
        await supabaseAdmin.from('tradingview_upgrades').insert({
          user_id: userId,
          email: tvUser?.email || '',
          tradingview_username: tvUser?.trading_view_id || null,
          plan: planLower,
          is_granted: false,
          notes: `Admin manual subscription — by ${maskEmail(adminUser.email)}`,
        });
        console.log(`[Admin Subscriptions] 📈 TradingView upgrade queued for user: ${userId}`);
      }
    }

    // Send subscription activated email to user
    try {
      const { data: emailUser } = await supabaseAdmin
        .from('users')
        .select('email, full_name')
        .eq('id', userId)
        .single();
      if (emailUser?.email) {
        await sendSubscriptionActivatedEmail(
          emailUser.email,
          emailUser.full_name || undefined,
          plan,
          endDate.toISOString()
        );
        console.log(`[Admin Subscriptions] 📧 Subscription activated email sent to: ${emailUser.email}`);
      }
    } catch (emailErr) {
      console.error('[Admin Subscriptions] Failed to send subscription activated email:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Extend subscription
export async function PATCH(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const { userId, days, amount, paymentMethod, createBillingRecord } = body;

    console.log(`[Admin Subscriptions] Admin ${maskEmail(adminUser.email)} extending subscription for user ${userId}`);

    const daysNumber = Number(days);

    if (!userId || days === undefined || days === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (Number.isNaN(daysNumber)) {
      return NextResponse.json({ error: 'Invalid days value' }, { status: 400 });
    }

    // Get current subscription
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const currentEnd = subscription.end_date ? new Date(subscription.end_date) : new Date();
    const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + daysNumber * 24 * 60 * 60 * 1000);
    
    const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
    const currency = String(amount).startsWith('€') ? 'EUR' : 'USD';

    // Calculate new days remaining
    const now = new Date();
    const newDaysRemaining = Math.ceil((newEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Update subscription
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        end_date: newEnd.toISOString().split('T')[0],
        expires_at: newEnd.toISOString(),
        days_remaining: newDaysRemaining,
        status: 'active',
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (error) {
      console.error('Error extending subscription:', error);
      return NextResponse.json({ error: sanitizeDbError(error, 'extend_subscription') }, { status: 500 });
    }

    // Add billing record (only if admin checked the billing checkbox)
    if (createBillingRecord !== false) {
      await supabaseAdmin
        .from('billing_history')
        .insert({
          user_id: userId,
          invoice_id: `INV-${Date.now()}`,
          amount: numericAmount,
          currency: currency,
          plan_description: `Subscription Extension - ${daysNumber} days`,
          payment_method: paymentMethod || 'crypto',
          status: 'completed',
          billing_reason: 'subscription_extend',
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Downgrade to basic
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
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log(`[Admin Subscriptions] Admin ${maskEmail(adminUser.email)} downgrading user ${userId} to basic`);

    // Get current subscription to check if user was on Ultimate/Lifetime
    const { data: currentSub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .single();
    
    const previousPlan = currentSub?.plan || 'basic';

    // Upsert subscription to basic (handles missing subscription rows)
    const now = new Date();
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan: 'basic',
        plan_id: 'basic',
        plan_name: 'Basic',
        status: 'active',
        start_date: now.toISOString().split('T')[0],
        started_at: now.toISOString(),
        end_date: null,
        expires_at: null,
        days_remaining: -1,
        is_active: true,
        tradingview_access_granted: false,
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error downgrading subscription:', error);
      return NextResponse.json({ error: sanitizeDbError(error, 'downgrade_subscription') }, { status: 500 });
    }

    // Reset notification preferences to default when downgraded to basic
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
      console.log(`[Admin Downgrade] Reset notification preferences for downgraded user ${userId}`);
    } catch (e) {
      console.warn('Could not reset notification preferences:', e);
    }

    // If user was on Ultimate or Lifetime, add to TradingView downgrades
    if (previousPlan === 'ultimate' || previousPlan === 'lifetime') {
      // Get user details for downgrade record
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, trading_view_id')
        .eq('id', userId)
        .single();
      
      if (user) {
        // Check if already has pending downgrade
        const { data: existing } = await supabaseAdmin
          .from('tradingview_downgrades')
          .select('id')
          .eq('user_id', userId)
          .eq('is_removed', false)
          .single();
        
        if (!existing) {
          await supabaseAdmin
            .from('tradingview_downgrades')
            .insert({
              user_id: userId,
              email: user.email,
              tradingview_username: user.trading_view_id,
              previous_plan: previousPlan,
              downgrade_reason: 'admin_downgrade',
              is_removed: false,
            });
          console.log(`[Admin] TradingView downgrade tracked for user: ${user.email}`);
        }
      }
    }

    // Clear any pending/approved cancellation requests
    await supabaseAdmin
      .from('cancellation_requests')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('status', ['pending', 'approved']);

    // Send downgrade notification email to user
    if (previousPlan !== 'basic') {
      try {
        const { data: emailUser } = await supabaseAdmin
          .from('users')
          .select('email, full_name')
          .eq('id', userId)
          .single();
        if (emailUser?.email) {
          await sendAdminDowngradeEmail(emailUser.email, emailUser.full_name || undefined, previousPlan);
          console.log(`[Admin Subscriptions] 📧 Downgrade email sent to: ${emailUser.email}`);
        }
      } catch (emailErr) {
        console.error('[Admin Subscriptions] Failed to send downgrade email:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
