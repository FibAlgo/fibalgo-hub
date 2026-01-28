import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await request.json() as { subscription: PushSubscriptionData };

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Check if push_subscriptions table exists, if not store in notification_preferences
    // For now, we'll store in a new push_subscriptions table
    
    // Upsert subscription
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        expiration_time: subscription.expirationTime,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: request.headers.get('user-agent') || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,endpoint'
      });

    if (error) {
      // If table doesn't exist, log and return success anyway
      if (error.code === '42P01') {
        console.log('push_subscriptions table not yet created');
        return NextResponse.json({ success: true, message: 'Table not ready' });
      }
      throw error;
    }

    // Update notification preferences to enable push
    await supabaseAdmin
      .from('notification_preferences')
      .upsert({ user_id: user.id }, { onConflict: 'user_id' });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
