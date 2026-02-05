import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, getErrorStatus, maskEmail, maskUserId, sanitizeDbError } from '@/lib/api/auth';
import { sendCryptoAccessEmail } from '@/lib/email';

// Use service role for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function normalizePlan(value?: string | null): 'basic' | 'premium' | 'ultimate' | 'lifetime' | 'unknown' {
  if (!value) return 'unknown';
  const name = value.toLowerCase();
  if (name.includes('lifetime')) return 'lifetime';
  if (name.includes('ultimate')) return 'ultimate';
  if (name.includes('premium') || name.includes('hub')) return 'premium';
  if (name.includes('basic')) return 'basic';
  return 'unknown';
}

// GET - Get all pending TradingView downgrades and upgrades
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'downgrades' | 'upgrades' | null (both)

    // Get downgrades (users who need TradingView access removed)
    if (!type || type === 'downgrades') {
      // Backfill: users who previously purchased Ultimate/Lifetime but no longer have it
      const { data: ultimatePurchases } = await supabaseAdmin
        .from('billing_history')
        .select('user_id, plan_description')
        .or('plan_description.ilike.%ultimate%,plan_description.ilike.%lifetime%');

      const ultimateUserIds = new Set((ultimatePurchases || []).map((p: any) => p.user_id));

      const { data: currentSubs } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id, plan, plan_id, plan_name, status, is_active, polar_subscription_id');

      const { data: existingDowngrades } = await supabaseAdmin
        .from('tradingview_downgrades')
        .select('id, user_id, is_removed');

      // Track users with ANY downgrade record (including removed ones) to prevent duplicates
      const usersWithAnyDowngrade = new Set(
        (existingDowngrades || []).map((d: any) => d.user_id)
      );
      
      // Track users with PENDING (not removed) downgrades for display
      const existingDowngradeByUser = new Set(
        (existingDowngrades || [])
          .filter((d: any) => d.is_removed === false)
          .map((d: any) => d.user_id)
      );

      for (const sub of currentSubs || []) {
        if (!ultimateUserIds.has(sub.user_id)) continue;

        const planValue = normalizePlan((sub.plan_id || sub.plan || sub.plan_name || '').toString());
        if (planValue === 'ultimate' || planValue === 'lifetime') continue;
        
        // Skip if user already has ANY downgrade record (including processed ones)
        // This prevents creating duplicate records after admin marks as "removed"
        if (usersWithAnyDowngrade.has(sub.user_id)) continue;

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('email, full_name, trading_view_id')
          .eq('id', sub.user_id)
          .single();

        if (!user?.email) continue;

        await supabaseAdmin
          .from('tradingview_downgrades')
          .insert({
            user_id: sub.user_id,
            email: user.email,
            tradingview_username: user.trading_view_id,
            previous_plan: 'ultimate',
            downgrade_reason: 'subscription_revoked',
            is_removed: false,
          });
      }

      const { data: downgrades, error: downgradeError } = await supabaseAdmin
        .from('tradingview_downgrades')
        .select('*')
        .eq('is_removed', false)
        .order('created_at', { ascending: false });

      if (downgradeError) {
        console.error('Error fetching TradingView downgrades:', downgradeError);
        return NextResponse.json({ error: downgradeError.message }, { status: 500 });
      }

      // Enrich with current user trading_view_id from users table
      const enrichedDowngrades = [];
      for (const downgrade of downgrades || []) {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('trading_view_id, email, full_name')
          .eq('id', downgrade.user_id)
          .single();
        
        enrichedDowngrades.push({
          ...downgrade,
          tradingview_id: user?.trading_view_id || downgrade.tradingview_username,
          email: user?.email || downgrade.email,
          full_name: user?.full_name || downgrade.full_name,
        });
      }

      if (type === 'downgrades') {
        return NextResponse.json(enrichedDowngrades);
      }
    }

    // Get upgrades (users who need TradingView access granted)
    if (!type || type === 'upgrades') {
      // Backfill: ensure Ultimate/Lifetime purchases have a pending upgrade record
      // Check ALL existing entries (granted or not) to avoid creating duplicates
      const { data: existingUpgrades } = await supabaseAdmin
        .from('tradingview_upgrades')
        .select('id, user_id, is_granted');

      // Track users who already have ANY upgrade record (granted or pending)
      const usersWithAnyUpgrade = new Set(
        (existingUpgrades || []).map((u: any) => u.user_id)
      );
      
      // Track users who only have pending (not granted) upgrades
      const existingPendingByUser = new Map(
        (existingUpgrades || [])
          .filter((u: any) => u.is_granted === false)
          .map((u: any) => [u.user_id, u])
      );

      const { data: ultimatePayments } = await supabaseAdmin
        .from('billing_history')
        .select('user_id, plan_description, status, created_at')
        .in('status', ['paid', 'completed'])
        .or('plan_description.ilike.%ultimate%,plan_description.ilike.%lifetime%')
        .order('created_at', { ascending: false });

      const latestPaymentByUser = new Map<string, any>();
      for (const p of ultimatePayments || []) {
        if (!latestPaymentByUser.has(p.user_id)) {
          latestPaymentByUser.set(p.user_id, p);
        }
      }

      const { data: eligibleSubs } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id, plan, plan_id, plan_name, status, is_active, polar_subscription_id')
        .eq('is_active', true)
        .in('status', ['active', 'cancelled']);

      const subByUser = new Map((eligibleSubs || []).map((s: any) => [s.user_id, s]));

      for (const [userId, payment] of latestPaymentByUser.entries()) {
        const sub = subByUser.get(userId);
        if (!sub) continue;
        // Skip if user already has ANY upgrade record (granted or pending)
        if (usersWithAnyUpgrade.has(userId)) continue;

        const planValue = normalizePlan(payment.plan_description || '');
        if (planValue !== 'ultimate' && planValue !== 'lifetime') continue;

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('email, full_name, trading_view_id')
          .eq('id', userId)
          .single();

        if (!user?.email) continue;

        await supabaseAdmin
          .from('tradingview_upgrades')
          .insert({
            user_id: userId,
            email: user.email,
            tradingview_username: user.trading_view_id,
            plan: planValue,
            is_granted: false,
          });
        
        // Add to set to prevent duplicates in same request
        usersWithAnyUpgrade.add(userId);
      }

      // Fallback: if billing history doesn't contain plan name but user has Ultimate/Lifetime subscription
      for (const sub of eligibleSubs || []) {
        const userId = sub.user_id;
        // Skip if user already has ANY upgrade record (granted or pending)
        if (usersWithAnyUpgrade.has(userId)) continue;
        if (latestPaymentByUser.has(userId)) continue;

        const planValue = normalizePlan((sub.plan_id || sub.plan || sub.plan_name || '').toString());
        if (planValue !== 'ultimate' && planValue !== 'lifetime') continue;

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('email, full_name, trading_view_id')
          .eq('id', userId)
          .single();

        if (!user?.email) continue;

        await supabaseAdmin
          .from('tradingview_upgrades')
          .insert({
            user_id: userId,
            email: user.email,
            tradingview_username: user.trading_view_id,
            plan: planValue === 'lifetime' ? 'lifetime' : 'ultimate',
            is_granted: false,
            notes: 'Backfill: subscription active without matching billing history',
          });
      }

      const { data: upgrades, error: upgradeError } = await supabaseAdmin
        .from('tradingview_upgrades')
        .select('*')
        .eq('is_granted', false)
        .order('created_at', { ascending: false });

      if (upgradeError) {
        console.error('Error fetching TradingView upgrades:', upgradeError);
        return NextResponse.json({ error: upgradeError.message }, { status: 500 });
      }

      // Filter out users who no longer have ultimate plan and enrich with current data
      const validUpgrades = [];
      for (const upgrade of upgrades || []) {
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('plan, plan_id, plan_name')
          .eq('user_id', upgrade.user_id)
          .single();

        const planValue = normalizePlan((sub?.plan_id || sub?.plan || sub?.plan_name || '').toString());

        if (planValue === 'ultimate' || planValue === 'lifetime') {
          // Get current user data
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('trading_view_id, email, full_name')
            .eq('id', upgrade.user_id)
            .single();
          
          validUpgrades.push({
            ...upgrade,
            tradingview_id: user?.trading_view_id || upgrade.tradingview_username,
            email: user?.email || upgrade.email,
            full_name: user?.full_name || upgrade.full_name,
          });
        } else {
          // Auto-remove from pending list if no longer eligible
          await supabaseAdmin
            .from('tradingview_upgrades')
            .update({ is_granted: true, notes: 'Auto-removed: User no longer has ultimate plan' })
            .eq('id', upgrade.id);
        }
      }

      if (type === 'upgrades') {
        return NextResponse.json(validUpgrades);
      }
    }

    // Return both if no type specified (for backwards compatibility, return downgrades only)
    const { data: downgrades, error } = await supabaseAdmin
      .from('tradingview_downgrades')
      .select('*')
      .eq('is_removed', false)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: sanitizeDbError(error, 'fetch-tradingview') }, { status: 500 });
    }

    // Enrich with current user data
    const enrichedDowngrades = [];
    for (const downgrade of downgrades || []) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('trading_view_id, email, full_name')
        .eq('id', downgrade.user_id)
        .single();
      
      enrichedDowngrades.push({
        ...downgrade,
        tradingview_id: user?.trading_view_id || downgrade.tradingview_username,
        email: user?.email || downgrade.email,
        full_name: user?.full_name || downgrade.full_name,
      });
    }

    return NextResponse.json(enrichedDowngrades);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Mark TradingView access as granted (admin action for upgrades)
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const { id, tradingViewId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing upgrade ID' }, { status: 400 });
    }

    console.log(`[Admin TradingView] Admin ${maskEmail(adminUser.email)} granting TradingView access for upgrade ${id}`);

    // Get the upgrade record first to get user_id and plan
    const { data: upgrade } = await supabaseAdmin
      .from('tradingview_upgrades')
      .select('user_id, plan, email')
      .eq('id', id)
      .single();

    if (!upgrade) {
      return NextResponse.json({ error: 'Upgrade record not found' }, { status: 404 });
    }

    // Update the user's tradingview_id if provided
    if (tradingViewId) {
      await supabaseAdmin
        .from('users')
        .update({
          trading_view_id: tradingViewId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', upgrade.user_id);
    }

    // Send email notification to user BEFORE deleting the record
    try {
      // Get user details for email
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email, full_name')
        .eq('id', upgrade.user_id)
        .single();
      
      const userEmail = user?.email || upgrade.email;
      if (userEmail) {
        await sendCryptoAccessEmail(userEmail, user?.full_name || undefined, upgrade.plan || 'Ultimate');
        console.log(`[Admin TradingView] Sent access granted email to ${maskEmail(userEmail)}`);
      }
    } catch (emailError) {
      console.error('[Admin TradingView] Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    // Delete the upgrade record from database (access has been granted)
    const { error: deleteError } = await supabaseAdmin
      .from('tradingview_upgrades')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting TradingView upgrade record:', deleteError);
      return NextResponse.json({ error: sanitizeDbError(deleteError, 'grant-tradingview') }, { status: 500 });
    }
    
    console.log(`[Admin TradingView] Deleted upgrade record ${id} after granting access`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Mark TradingView access as removed (admin action)
export async function DELETE(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing downgrade ID' }, { status: 400 });
    }

    console.log(`[Admin TradingView] Admin ${maskEmail(adminUser.email)} removing TradingView access for downgrade ${id}`);

    // Build update object - use adminUser.id from session
    const updateData = {
      is_removed: true,
      removed_at: new Date().toISOString(),
      removed_by: adminUser.id,
    };

    const { error } = await supabaseAdmin
      .from('tradingview_downgrades')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error marking TradingView access as removed:', error);
      return NextResponse.json({ error: sanitizeDbError(error, 'remove-tradingview') }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
