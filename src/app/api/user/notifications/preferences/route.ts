import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch user's notification preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create preferences
    const { data: preferences, error } = await supabase
      .rpc('get_or_create_notification_preferences', { p_user_id: user.id });

    if (error) {
      // If function doesn't exist, try direct query
      const { data: existingPrefs, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingPrefs) {
        // Create default preferences
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return NextResponse.json(newPrefs);
      }

      return NextResponse.json(existingPrefs);
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Allow-list columns to avoid invalid/extra fields
    const allowedKeys = [
      'notifications_enabled', 'email_notifications', 'push_notifications',
      'sound_enabled', 'sound_type', 'news_breaking', 'news_high_impact',
      'news_medium_impact', 'news_low_impact', 'news_crypto', 'news_forex',
      'news_stocks', 'news_commodities', 'news_indices', 'news_economic',
      'news_central_bank', 'news_geopolitical', 'signal_strong_buy', 'signal_buy',
      'signal_sell', 'signal_strong_sell', 'calendar_enabled',
      'calendar_high_impact', 'calendar_medium_impact', 'calendar_low_impact',
      'calendar_reminder_minutes', 'quiet_hours_enabled', 'quiet_hours_start',
      'quiet_hours_end', 'timezone'
    ] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...updates
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
