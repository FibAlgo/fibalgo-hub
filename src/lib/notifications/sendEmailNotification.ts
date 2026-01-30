import { createClient } from '@supabase/supabase-js';
import { 
  sendPriceAlertEmail, 
  sendCalendarReminderEmail, 
  sendNewsNotificationEmail, 
  sendSignalNotificationEmail 
} from '@/lib/email';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Check if user has email notifications enabled
async function userHasEmailEnabled(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('email_notifications, notifications_enabled')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      const { error: insertError } = await supabaseAdmin
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          notifications_enabled: false,
          email_notifications: false,
          push_notifications: false,
          sound_enabled: false
        }, { onConflict: 'user_id' });

      if (insertError) return false;
      return false;
    }

    return data.notifications_enabled === true && data.email_notifications === true;
  } catch {
    return false;
  }
}

// Get user email by ID
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    return data?.email || null;
  } catch {
    return null;
  }
}

// Send price alert email to user (if enabled)
export async function sendPriceAlertEmailToUser(
  userId: string,
  symbol: string,
  alertType: string,
  targetValue: number,
  currentValue: number
): Promise<boolean> {
  const hasEmail = await userHasEmailEnabled(userId);
  if (!hasEmail) return false;

  const email = await getUserEmail(userId);
  if (!email) return false;

  return sendPriceAlertEmail(email, symbol, alertType, targetValue, currentValue);
}

// Send calendar reminder email to user (if enabled)
export async function sendCalendarEmailToUser(
  userId: string,
  eventName: string,
  country: string,
  impact: string,
  minutesUntil: number
): Promise<boolean> {
  const hasEmail = await userHasEmailEnabled(userId);
  if (!hasEmail) return false;

  const email = await getUserEmail(userId);
  if (!email) return false;

  return sendCalendarReminderEmail(email, eventName, country, impact, minutesUntil);
}

// Send news notification email to user (if enabled)
export async function sendNewsEmailToUser(
  userId: string,
  title: string,
  category: string,
  isBreaking: boolean
): Promise<boolean> {
  const hasEmail = await userHasEmailEnabled(userId);
  if (!hasEmail) return false;

  const email = await getUserEmail(userId);
  if (!email) return false;

  return sendNewsNotificationEmail(email, title, category, isBreaking);
}

// Send signal notification email to user (if enabled)
export async function sendSignalEmailToUser(
  userId: string,
  signal: 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL',
  symbol: string,
  summary: string
): Promise<boolean> {
  const hasEmail = await userHasEmailEnabled(userId);
  if (!hasEmail) return false;

  const email = await getUserEmail(userId);
  if (!email) return false;

  return sendSignalNotificationEmail(email, signal, symbol, summary);
}

// Send email to multiple users
export async function sendNewsEmailToUsers(
  userIds: string[],
  title: string,
  category: string,
  isBreaking: boolean
): Promise<number> {
  let sentCount = 0;
  
  for (const userId of userIds) {
    const sent = await sendNewsEmailToUser(userId, title, category, isBreaking);
    if (sent) sentCount++;
  }
  
  return sentCount;
}

export async function sendSignalEmailToUsers(
  userIds: string[],
  signal: 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL',
  symbol: string,
  summary: string
): Promise<number> {
  let sentCount = 0;
  
  for (const userId of userIds) {
    const sent = await sendSignalEmailToUser(userId, signal, symbol, summary);
    if (sent) sentCount++;
  }
  
  return sentCount;
}

export async function sendCalendarEmailToUsers(
  userIds: string[],
  eventName: string,
  country: string,
  impact: string,
  minutesUntil: number
): Promise<number> {
  let sentCount = 0;
  
  for (const userId of userIds) {
    const sent = await sendCalendarEmailToUser(userId, eventName, country, impact, minutesUntil);
    if (sent) sentCount++;
  }
  
  return sentCount;
}
