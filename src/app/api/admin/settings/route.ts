import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, getErrorStatus } from '@/lib/api/auth';

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Settings key constants
const SETTINGS_KEY = 'app_settings';

// Ensure settings exist and get current values
async function getSettings() {
  // Try to get from cache_metadata (using it as a simple key-value store)
  const { data, error } = await supabaseAdmin
    .from('cache_metadata')
    .select('*')
    .eq('cache_key', SETTINGS_KEY)
    .single();

  if (error && error.code === 'PGRST116') {
    // Not found, create it
    const { data: newData, error: insertError } = await supabaseAdmin
      .from('cache_metadata')
      .insert({
        cache_key: SETTINGS_KEY,
        table_name: 'app_settings',
        default_ttl_seconds: 0,
        // Store settings in hit_count (1 = enabled, 0 = disabled)
        hit_count: 0, // news_api_enabled default false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create settings:', insertError);
      return { news_api_enabled: false }; // default
    }
    return { news_api_enabled: false };
  }

  if (error) {
    console.error('Failed to get settings:', error);
    return { news_api_enabled: false }; // default
  }

  return {
    news_api_enabled: data.hit_count === 1,
  };
}

// GET - Fetch current settings
export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: getErrorStatus(authError || 'Unauthorized') }
      );
    }

    const settings = await getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('GET settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update settings
export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const { user: adminUser, error: authError } = await requireAdmin();
    if (authError || !adminUser) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: getErrorStatus(authError || 'Unauthorized') }
      );
    }

    const body = await request.json();
    const { news_api_enabled } = body;

    if (typeof news_api_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
    }

    // Update in cache_metadata using upsert
    const { error } = await supabaseAdmin
      .from('cache_metadata')
      .upsert({
        cache_key: SETTINGS_KEY,
        table_name: 'app_settings',
        default_ttl_seconds: 0,
        hit_count: news_api_enabled ? 1 : 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cache_key'
      });

    if (error) {
      console.error('Failed to update settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    console.log(`[Admin] Settings updated by ${adminUser.email}: news_api_enabled = ${news_api_enabled}`);

    return NextResponse.json({ 
      success: true, 
      settings: { news_api_enabled },
      message: news_api_enabled ? 'Haber API\'leri aktif edildi' : 'Haber API\'leri devre dışı bırakıldı'
    });
  } catch (error) {
    console.error('POST settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
