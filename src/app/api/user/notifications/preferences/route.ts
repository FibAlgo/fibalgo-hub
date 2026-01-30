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

    const updates = await request.json();

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;
    delete updates.updated_at;

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
