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
    for (const sub of expiredSubs || []) {
      const planValue = (sub.plan_id || sub.plan || sub.plan_name || 'basic').toString().toLowerCase();
      if (planValue === 'basic' || planValue === 'lifetime') {
        continue; // Lifetime never expires, basic doesn't need downgrade
      }

      const endDateValue = sub.end_date || sub.expires_at;
      if (!endDateValue) continue;

      // Calculate negative days remaining
      const endDate = new Date(endDateValue);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Will be negative
      
      // Update days_remaining to negative value - admin must manually downgrade
      // We no longer auto-downgrade any subscriptions to basic
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          days_remaining: diffDays, // Negative value
          updated_at: now.toISOString(),
        })
        .eq('id', sub.id);

      if (!updateError) {
        adminPendingCount++;
        console.log(`[Cron] Subscription ${sub.id} marked with ${diffDays} days (awaiting admin action)`);
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
      checked: activeSubs?.length || 0,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
