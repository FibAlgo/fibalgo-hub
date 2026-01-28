import { createClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Configure web-push with VAPID keys (will be called at runtime)
let vapidConfigured = false;

function ensureVapidConfigured() {
  if (!vapidConfigured && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:support@fibalgo.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
  }
  return vapidConfigured;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

// Send push notification to a specific user
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ success: number; failed: number }> {
  if (!ensureVapidConfigured()) {
    console.warn('VAPID keys not configured, skipping push notification');
    return { success: 0, failed: 0 };
  }

  try {
    // First check if user has push notifications enabled in preferences
    const { data: prefs } = await supabaseAdmin
      .from('notification_preferences')
      .select('push_notifications, notifications_enabled')
      .eq('user_id', userId)
      .single();

    // If user disabled notifications or push, don't send
    if (!prefs?.notifications_enabled || !prefs?.push_notifications) {
      return { success: 0, failed: 0 };
    }

    // Get user's active push subscriptions
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !subscriptions || subscriptions.length === 0) {
      return { success: 0, failed: 0 };
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/logo-icon.png',
      badge: payload.badge || '/logo-icon.png',
      tag: payload.tag || 'fibalgo-notification',
      url: payload.url || '/terminal',
      requireInteraction: payload.requireInteraction || false
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
        }, pushPayload);
        
        successCount++;
        
        // Update last used timestamp
        await supabaseAdmin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id);
          
      } catch (pushError: unknown) {
        failCount++;
        
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

    return { success: successCount, failed: failCount };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: 0, failed: 0 };
  }
}

// Send push notification to multiple users
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<{ success: number; failed: number }> {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendPushToUser(userId, payload);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  return { success: totalSuccess, failed: totalFailed };
}

// Check if user has push notifications enabled and subscribed
export async function userHasPushEnabled(userId: string): Promise<boolean> {
  try {
    const [prefsResult, subsResult] = await Promise.all([
      supabaseAdmin
        .from('notification_preferences')
        .select('push_notifications')
        .eq('user_id', userId)
        .single(),
      supabaseAdmin
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
    ]);

    return (
      prefsResult.data?.push_notifications === true &&
      subsResult.data !== null &&
      subsResult.data.length > 0
    );
  } catch {
    return false;
  }
}
