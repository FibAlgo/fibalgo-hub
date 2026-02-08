import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// This cron runs daily at midnight to check and update subscription statuses
export async function GET(request: NextRequest) {
  // Verify cron authentication (handles x-vercel-cron, Bearer token, query param, user-agent)
  const { verifyCronAuth } = await import('@/lib/api/auth');
  const cronAuth = verifyCronAuth(request);
  if (!cronAuth.authorized) {
    return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.statusCode || 401 });
  }

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 1. Find expired subscriptions (end_date passed and not already basic)
    // This includes both active and cancelled (is_active: false) subscriptions
    const { data: expiredSubs, error: expiredError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, plan, plan_id, plan_name, end_date, expires_at, is_active, status')
      .or(`end_date.lt.${today},expires_at.lt.${today}`);

    if (expiredError) {
      console.error('Error fetching expired subscriptions:', expiredError);
      return NextResponse.json({ error: expiredError.message }, { status: 500 });
    }

    let adminPendingCount = 0;

    // 2. Process expired subscriptions
    let downgradedCount = 0;
    for (const sub of expiredSubs || []) {
      const planValue = (sub.plan_id || sub.plan || sub.plan_name || 'basic').toString().toLowerCase();
      if (planValue === 'basic' || planValue === 'lifetime') {
        continue; // Lifetime never expires, basic doesn't need downgrade
      }

      const endDateValue = sub.end_date || sub.expires_at;
      if (!endDateValue) continue;

      const endDate = new Date(endDateValue);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Auto-downgrade: if subscription is cancelled/expired AND end_date has passed
      // This handles CopeCart IPN cancellations where user keeps access until period end
      const statusValue = (sub.status || '').toString().toLowerCase();
      const shouldDowngrade = diffDays < 0 && (statusValue === 'cancelled' || statusValue === 'expired' || statusValue === 'refunded');

      if (shouldDowngrade) {
        const { error: downgradeError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            plan: 'basic',
            plan_id: 'basic',
            plan_name: 'Basic Plan',
            status: 'expired',
            days_remaining: 0,
            is_active: true,
            updated_at: now.toISOString(),
          })
          .eq('id', sub.id);

        if (!downgradeError) {
          downgradedCount++;
          console.log(`[Cron] ⬇️ Auto-downgraded to basic: sub=${sub.id} user=${sub.user_id} (was ${planValue}, expired ${diffDays}d ago)`);

          // Queue TradingView downgrade if was Ultimate
          if (planValue === 'ultimate') {
            try {
              const { data: userData } = await supabaseAdmin
                .from('users')
                .select('email, full_name, trading_view_id')
                .eq('id', sub.user_id)
                .single();

              if (userData) {
                const { data: existingDowngrade } = await supabaseAdmin
                  .from('tradingview_downgrades')
                  .select('id')
                  .eq('user_id', sub.user_id)
                  .eq('is_removed', false)
                  .single();

                if (!existingDowngrade) {
                  await supabaseAdmin.from('tradingview_downgrades').insert({
                    user_id: sub.user_id,
                    email: userData.email,
                    full_name: userData.full_name || null,
                    tradingview_id: userData.trading_view_id || null,
                    tradingview_username: userData.trading_view_id || null,
                    previous_plan: 'ultimate',
                    downgrade_reason: 'subscription_canceled',
                    is_removed: false,
                    notes: `Auto-downgraded by cron — subscription expired ${Math.abs(diffDays)}d ago (status: ${statusValue})`,
                  });
                  console.log(`[Cron] 📉 TradingView downgrade queued: user=${sub.user_id}`);
                }
              }
            } catch (tvErr) {
              console.error(`[Cron] Failed to queue TradingView downgrade for ${sub.user_id}:`, tvErr);
            }
          }
        }
      } else if (diffDays < 0) {
        // Expired but still active (waiting for payment retry from CopeCart)
        const { error: updateError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            days_remaining: diffDays,
            updated_at: now.toISOString(),
          })
          .eq('id', sub.id);

        if (!updateError) {
          adminPendingCount++;
          console.log(`[Cron] Subscription ${sub.id} expired ${Math.abs(diffDays)}d ago (awaiting payment retry or admin action)`);
        }
      }
    }

    // 3. Update days_remaining for active subscriptions
    const { data: activeSubs, error: activeError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, end_date, expires_at, plan, plan_id, plan_name, status')
      .neq('status', 'expired');

    if (!activeError && activeSubs) {
      for (const sub of activeSubs) {
        const planValue = (sub.plan_id || sub.plan || sub.plan_name || 'basic').toString().toLowerCase();
        if (planValue === 'lifetime') continue;

        const endDateValue = sub.end_date || sub.expires_at;
        if (endDateValue) {
          const endDate = new Date(endDateValue);
          const diffTime = endDate.getTime() - now.getTime();
          const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

          await supabaseAdmin
            .from('subscriptions')
            .update({
              days_remaining: diffDays,
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      admin_pending: adminPendingCount,
      downgraded: downgradedCount,
      checked: activeSubs?.length || 0,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
