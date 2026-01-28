import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, getErrorStatus, maskEmail, maskUserId, sanitizeDbError } from '@/lib/api/auth';

// Use service role for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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
          tradingview_id: user?.trading_view_id || downgrade.tradingview_id,
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
          .select('plan')
          .eq('user_id', upgrade.user_id)
          .single();
        
        if (sub?.plan === 'ultimate' || sub?.plan === 'lifetime') {
          // Get current user data
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('trading_view_id, email, full_name')
            .eq('id', upgrade.user_id)
            .single();
          
          validUpgrades.push({
            ...upgrade,
            tradingview_id: user?.trading_view_id || upgrade.tradingview_id,
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
        tradingview_id: user?.trading_view_id || downgrade.tradingview_id,
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

    // Get the upgrade record first to get user_id
    const { data: upgrade } = await supabaseAdmin
      .from('tradingview_upgrades')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!upgrade) {
      return NextResponse.json({ error: 'Upgrade record not found' }, { status: 404 });
    }

    // Update the upgrade record as granted - use adminUser.id from session
    const { error } = await supabaseAdmin
      .from('tradingview_upgrades')
      .update({
        is_granted: true,
        granted_at: new Date().toISOString(),
        granted_by: adminUser.id,
        tradingview_id: tradingViewId || null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error marking TradingView access as granted:', error);
      return NextResponse.json({ error: sanitizeDbError(error, 'grant-tradingview') }, { status: 500 });
    }

    // Also update the user's tradingview_id if provided
    if (tradingViewId) {
      await supabaseAdmin
        .from('users')
        .update({
          trading_view_id: tradingViewId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', upgrade.user_id);
    }

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
