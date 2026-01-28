import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@fibalgo.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if VAPID keys are configured
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Push notifications not configured' 
      }, { status: 500 });
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (subError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active push subscriptions found' 
      }, { status: 400 });
    }

    const payload = JSON.stringify({
      title: '🔔 Test Notification',
      body: 'Push notifications are working correctly!',
      icon: '/logo-icon.png',
      badge: '/logo-icon.png',
      tag: 'test-notification',
      url: '/terminal'
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key
          }
        }, payload);
        
        successCount++;
        
        // Update last used timestamp
        await supabaseAdmin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id);
          
      } catch (pushError: unknown) {
        failCount++;
        console.error('Push send error:', pushError);
        
        // If subscription is expired/invalid, mark as inactive
        const error = pushError as { statusCode?: number };
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabaseAdmin
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id);
        }
      }
    }

    return NextResponse.json({ 
      success: successCount > 0,
      message: `Sent to ${successCount} device(s), ${failCount} failed`
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
