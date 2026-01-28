import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch user's watchlist
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assetType = searchParams.get('asset_type');

    let query = supabase
      .from('user_watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (assetType) {
      query = query.eq('asset_type', assetType);
    }

    const { data: watchlist, error } = await query;

    if (error) throw error;

    return NextResponse.json(watchlist || []);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

// POST - Add to watchlist
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      symbol, 
      asset_name, 
      asset_type,
      notify_price_change,
      notify_news,
      notify_signals,
      price_change_threshold
    } = body;

    if (!symbol || !asset_type) {
      return NextResponse.json(
        { error: 'Symbol and asset type required' },
        { status: 400 }
      );
    }

    // Check watchlist limit (max 100 items)
    const { count } = await supabase
      .from('user_watchlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count && count >= 100) {
      return NextResponse.json(
        { error: 'Maximum watchlist limit reached (100)' },
        { status: 400 }
      );
    }

    // Get max sort order
    const { data: maxOrder } = await supabase
      .from('user_watchlist')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from('user_watchlist')
      .upsert({
        user_id: user.id,
        symbol,
        asset_name,
        asset_type,
        notify_price_change: notify_price_change ?? true,
        notify_news: notify_news ?? true,
        notify_signals: notify_signals ?? true,
        price_change_threshold: price_change_threshold ?? 5.00,
        sort_order: (maxOrder?.sort_order || 0) + 1
      }, { onConflict: 'user_id,symbol' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    );
  }
}

// DELETE - Remove from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('symbol', symbol);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to remove from watchlist' },
      { status: 500 }
    );
  }
}

// PATCH - Update watchlist item
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, ...updates } = body;

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol required' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id;
    delete updates.created_at;
    delete updates.id;

    const { data, error } = await supabase
      .from('user_watchlist')
      .update(updates)
      .eq('user_id', user.id)
      .eq('symbol', symbol)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to update watchlist' },
      { status: 500 }
    );
  }
}
