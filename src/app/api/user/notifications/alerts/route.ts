import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch user's price alerts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assetType = searchParams.get('asset_type');
    const symbol = searchParams.get('symbol');

    let query = supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (assetType) {
      query = query.eq('asset_type', assetType);
    }
    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data: alerts, error } = await query;

    if (error) throw error;

    return NextResponse.json(alerts || []);
  } catch (error) {
    console.error('Error fetching price alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST - Create a new price alert
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
      alert_type, 
      target_value,
      current_value,
      timeframe,
      repeat_alert,
      cooldown_minutes,
      expires_at,
      note
    } = body;

    // Validation
    if (!symbol || !asset_type || !alert_type || target_value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check alert limit (max 50 active alerts per user)
    const { count } = await supabase
      .from('price_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (count && count >= 50) {
      return NextResponse.json(
        { error: 'Maximum alert limit reached (50)' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: user.id,
        symbol,
        asset_name,
        asset_type,
        alert_type,
        target_value,
        current_value,
        timeframe: timeframe || '1h',
        repeat_alert: repeat_alert || false,
        cooldown_minutes: cooldown_minutes || 60,
        expires_at,
        note,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating price alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a price alert
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting price alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}

// PATCH - Update a price alert
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Alert ID required' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated
    delete updates.user_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('price_alerts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating price alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}
