import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser, sendPushToUsers } from '@/lib/notifications/sendPushNotification';
import { enqueueCalendarEmails, enqueueCalendarEmail } from '@/lib/notifications/sendEmailNotification';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_NOTIFICATIONS_PER_USER = 20;

// Cleanup old notifications to keep max 20 per user
async function cleanupOldNotifications(userIds: string[]): Promise<void> {
  try {
    for (const userId of userIds) {
      const { data: toKeep } = await supabaseAdmin
        .from('notification_history')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS_PER_USER);

      if (toKeep && toKeep.length >= MAX_NOTIFICATIONS_PER_USER) {
        const keepIds = toKeep.map(n => n.id);
        await supabaseAdmin
          .from('notification_history')
          .delete()
          .eq('user_id', userId)
          .not('id', 'in', `(${keepIds.join(',')})`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
  }
}

interface UserCalendarPrefs {
  user_id: string;
  notifications_enabled: boolean;
  calendar_enabled: boolean;
  calendar_high_impact: boolean;
  calendar_medium_impact: boolean;
  calendar_low_impact: boolean;
  calendar_reminder_minutes: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

// Check if user is in quiet hours
function isInQuietHours(prefs: UserCalendarPrefs): boolean {
  if (!prefs.quiet_hours_enabled) return false;
  
  try {
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: prefs.timezone || 'UTC' }));
    const currentMinutes = userTime.getHours() * 60 + userTime.getMinutes();
    
    const [startH, startM] = prefs.quiet_hours_start.split(':').map(Number);
    const [endH, endM] = prefs.quiet_hours_end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch {
    return false;
  }
}

// This cron runs every minute to check upcoming calendar events
export async function GET(request: Request) {
  // Verify cron authentication (handles x-vercel-cron, Bearer token, query param, user-agent)
  const { verifyCronAuth } = await import('@/lib/api/auth');
  const cronAuth = verifyCronAuth(request);
  if (!cronAuth.authorized) {
    return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.statusCode || 401 });
  }

  try {
    const now = new Date();
    
    // Fetch user preferences for calendar notifications
    const { data: allPrefs, error: prefsError } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id, notifications_enabled, calendar_enabled, calendar_high_impact, calendar_medium_impact, calendar_low_impact, calendar_reminder_minutes, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone')
      .eq('notifications_enabled', true)
      .eq('calendar_enabled', true);

    if (prefsError || !allPrefs || allPrefs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No users with calendar notifications enabled',
        notified: 0
      });
    }

    // SAFETY: Filter out basic/banned users — notifications are a premium feature
    const calUserIds = allPrefs.map((p: any) => p.user_id);
    const { data: calSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan, plan_id, status')
      .in('user_id', calUserIds);
    const premiumCalUserIds = new Set(
      (calSubs || []).filter(s => {
        const plan = (s.plan_id || s.plan || 'basic').toString().toLowerCase();
        return plan !== 'basic' && s.status !== 'banned' && s.status !== 'suspended';
      }).map(s => s.user_id)
    );
    const filteredPrefs = allPrefs.filter((p: any) => premiumCalUserIds.has(p.user_id));
    if (filteredPrefs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No premium users with calendar notifications enabled',
        notified: 0
      });
    }

    // Group users by reminder time preference
    const reminderGroups: Record<number, UserCalendarPrefs[]> = {};
    for (const prefs of filteredPrefs as UserCalendarPrefs[]) {
      const mins = prefs.calendar_reminder_minutes || 15;
      if (!reminderGroups[mins]) {
        reminderGroups[mins] = [];
      }
      reminderGroups[mins].push(prefs);
    }

    // Get unique reminder times
    const reminderTimes = Object.keys(reminderGroups).map(Number);
    
    // Fetch upcoming calendar events for each reminder window
    let totalNotifications = 0;
    
    for (const reminderMinutes of reminderTimes) {
      const targetTime = new Date(now.getTime() + reminderMinutes * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 30 * 1000); // 30 second window
      const windowEnd = new Date(targetTime.getTime() + 30 * 1000);
      
      // Fetch calendar events from investing.com data or our calendar table
      // For now, we'll check calendar_alerts that users have subscribed to
      const { data: pendingAlerts, error: alertsError } = await supabaseAdmin
        .from('calendar_alerts')
        .select('*')
        .eq('status', 'pending')
        .gte('event_datetime', windowStart.toISOString())
        .lte('event_datetime', windowEnd.toISOString());

      if (alertsError) {
        console.error('Error fetching calendar alerts:', alertsError);
        continue;
      }

      if (!pendingAlerts || pendingAlerts.length === 0) continue;

      // Create notifications for each alert
      const notifications = [];
      const alertIdsToUpdate: string[] = [];

      for (const alert of pendingAlerts) {
        // Find user's preferences
        const userPrefs = reminderGroups[reminderMinutes]?.find(
          p => p.user_id === alert.user_id
        );

        if (!userPrefs) continue;
        if (isInQuietHours(userPrefs)) continue;

        // Check impact level preference (UI now only shows high impact toggle)
        const impact = alert.event_impact?.toLowerCase() || 'medium';
        if (impact === 'high' && !userPrefs.calendar_high_impact) continue;
        if (impact === 'medium' && !userPrefs.calendar_medium_impact) continue;
        if (impact === 'low' && !userPrefs.calendar_low_impact) continue;

        const impactEmoji = impact === 'high' ? '🔴' : impact === 'medium' ? '🟡' : '🟢';
        
        notifications.push({
          user_id: alert.user_id,
          type: 'calendar',
          notification_type: 'calendar',
          title: `📅 ${impactEmoji} Upcoming: ${alert.event_title}`,
          message: `${alert.event_country || 'Global'} event in ${reminderMinutes} minutes`,
          icon: 'calendar',
          action_url: '/terminal/calendar',
          related_id: alert.event_id,
          related_type: 'calendar_event',
          metadata: {
            event_id: alert.event_id,
            event_title: alert.event_title,
            event_country: alert.event_country,
            event_impact: alert.event_impact,
            event_datetime: alert.event_datetime,
            reminder_minutes: reminderMinutes
          }
        });

        alertIdsToUpdate.push(alert.id);
      }

      if (notifications.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('notification_history')
          .insert(notifications);

        if (!insertError) {
          totalNotifications += notifications.length;

          // Send notifications based on user preferences
          for (const notif of notifications) {
            const metadata = notif.metadata as { event_title: string; event_country: string; event_impact: string; reminder_minutes: number };
            
            // Get user's notification preferences to decide push vs email
            const { data: prefs } = await supabaseAdmin
              .from('notification_preferences')
              .select('push_notifications, email_notifications, notifications_enabled')
              .eq('user_id', notif.user_id)
              .single();

            // Only send if notifications are enabled
            if (prefs?.notifications_enabled) {
              // Send push notification if enabled
              if (prefs.push_notifications) {
                await sendPushToUser(notif.user_id, {
                  title: notif.title,
                  body: notif.message,
                  tag: `calendar-${notif.related_id}`,
                  url: notif.action_url,
                  requireInteraction: true
                });
              }

              // Send email notification if enabled
              if (prefs.email_notifications) {
                await enqueueCalendarEmail(
                  notif.user_id,
                  metadata.event_title,
                  metadata.event_country || 'Global',
                  metadata.event_impact || 'medium',
                  metadata.reminder_minutes
                );
              }
            }
          }

          // Mark alerts as sent
          await supabaseAdmin
            .from('calendar_alerts')
            .update({ status: 'sent', sent_at: now.toISOString() })
            .in('id', alertIdsToUpdate);

          // Cleanup old notifications (keep max 20 per user)
          const userIds = notifications.map(n => n.user_id);
          await cleanupOldNotifications(userIds);
        }
      }
    }

    // Also send notifications for auto-subscribed high-impact events
    // Fetch high impact events happening soon that users haven't been notified about
    await sendAutoCalendarNotifications(now, filteredPrefs as UserCalendarPrefs[]);

    return NextResponse.json({
      success: true,
      notified: totalNotifications,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Calendar reminder cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Send auto notifications for high-impact events (users don't need to manually subscribe)
async function sendAutoCalendarNotifications(now: Date, allPrefs: UserCalendarPrefs[]): Promise<number> {
  // Group users by reminder time
  const usersByReminder: Record<number, string[]> = {};
  
  for (const prefs of allPrefs) {
    if (!prefs.calendar_high_impact) continue;
    if (isInQuietHours(prefs)) continue;
    
    const mins = prefs.calendar_reminder_minutes || 15;
    if (!usersByReminder[mins]) {
      usersByReminder[mins] = [];
    }
    usersByReminder[mins].push(prefs.user_id);
  }

  let totalSent = 0;

  for (const [reminderStr, userIds] of Object.entries(usersByReminder)) {
    const reminderMinutes = parseInt(reminderStr);
    const targetTime = new Date(now.getTime() + reminderMinutes * 60 * 1000);
    const windowStart = new Date(targetTime.getTime() - 30 * 1000);
    const windowEnd = new Date(targetTime.getTime() + 30 * 1000);

    // Check if we have calendar analyses for high-impact events at this time
    const { data: calendarEvents } = await supabaseAdmin
      .from('calendar_analyses')
      .select('*')
      .eq('impact', 'high')
      .gte('event_datetime', windowStart.toISOString())
      .lte('event_datetime', windowEnd.toISOString());

    if (!calendarEvents || calendarEvents.length === 0) continue;

    for (const event of calendarEvents) {
      // Check if we already sent notifications for this event
      const notificationKey = `cal_auto_${event.id}_${reminderMinutes}`;
      
      const { data: existing } = await supabaseAdmin
        .from('notification_history')
        .select('id')
        .eq('related_id', notificationKey)
        .limit(1);

      if (existing && existing.length > 0) continue; // Already sent

      // Create notifications for all eligible users
      const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'calendar',
        notification_type: 'calendar',
        title: `📅 🔴 High Impact: ${event.event_name}`,
        message: `${event.country || 'Global'} - Starting in ${reminderMinutes} minutes`,
        icon: 'calendar',
        action_url: '/terminal/calendar',
        related_id: notificationKey,
        related_type: 'calendar_auto',
        metadata: {
          event_id: event.id,
          event_name: event.event_name,
          country: event.country,
          impact: event.impact,
          event_datetime: event.event_datetime,
          reminder_minutes: reminderMinutes,
          previous: event.previous,
          forecast: event.forecast
        }
      }));

      const { error } = await supabaseAdmin
        .from('notification_history')
        .insert(notifications);

      if (!error) {
        totalSent += notifications.length;

        // Send push notifications to all users
        const title = `📅 🔴 High Impact: ${event.event_name}`;
        const body = `${event.country || 'Global'} - Starting in ${reminderMinutes} minutes`;
        
        await sendPushToUsers(userIds, {
          title,
          body,
          tag: `calendar-auto-${event.id}`,
          url: '/terminal/calendar',
          requireInteraction: true
        });

        // E-postaları kuyruğa ekle (process-email-queue cron'da gönderilir, timeout yok)
        await enqueueCalendarEmails(
          userIds,
          event.event_name,
          event.country || 'Global',
          'high',
          reminderMinutes
        );

        // Cleanup old notifications (keep max 20 per user)
        await cleanupOldNotifications(userIds);
      }
    }
  }

  return totalSent;
}
