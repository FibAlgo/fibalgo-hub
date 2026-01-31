import { createClient } from '@supabase/supabase-js';
import { 
  sendPriceAlertEmail, 
  sendCalendarReminderEmail, 
  sendNewsNotificationEmail, 
  sendSignalNotificationEmail 
} from '@/lib/email';

/** Run async tasks with limited concurrency (for bulk email without overwhelming SMTP). */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      if (i >= items.length) break;
      try {
        const result = await fn(items[i]);
        results[i] = result;
      } catch {
        // leave results[i] undefined on error; caller can count successes
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** Max concurrent SMTP sends. Resend allows high throughput; conservative default for reliability. */
const EMAIL_CONCURRENCY = Math.min(50, Math.max(10, parseInt(process.env.EMAIL_CONCURRENCY || '25', 10) || 25));

/** Max emails processed per cron run (avoids timeout). */
export const EMAIL_QUEUE_BATCH_SIZE = Math.min(500, Math.max(50, parseInt(process.env.EMAIL_QUEUE_BATCH_SIZE || '200', 10) || 200));

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

// Send email to multiple users (batched, concurrent — scales to thousands)
export async function sendNewsEmailToUsers(
  userIds: string[],
  title: string,
  category: string,
  isBreaking: boolean
): Promise<number> {
  if (userIds.length === 0) return 0;
  const results = await runWithConcurrency(
    userIds,
    EMAIL_CONCURRENCY,
    (userId) => sendNewsEmailToUser(userId, title, category, isBreaking)
  );
  return results.filter(Boolean).length;
}

export async function sendSignalEmailToUsers(
  userIds: string[],
  signal: 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL',
  symbol: string,
  summary: string
): Promise<number> {
  if (userIds.length === 0) return 0;
  const results = await runWithConcurrency(
    userIds,
    EMAIL_CONCURRENCY,
    (userId) => sendSignalEmailToUser(userId, signal, symbol, summary)
  );
  return results.filter(Boolean).length;
}

export async function sendCalendarEmailToUsers(
  userIds: string[],
  eventName: string,
  country: string,
  impact: string,
  minutesUntil: number
): Promise<number> {
  if (userIds.length === 0) return 0;
  const results = await runWithConcurrency(
    userIds,
    EMAIL_CONCURRENCY,
    (userId) => sendCalendarEmailToUser(userId, eventName, country, impact, minutesUntil)
  );
  return results.filter(Boolean).length;
}

// ═══════════════════════════════════════════════════════════════
// EMAIL QUEUE — parçalı gönderim, cron timeout önleme
// ═══════════════════════════════════════════════════════════════

export type EmailQueueType = 'news' | 'signal' | 'calendar';

/** Kuyruğa ekle: haber e-postaları (cron hızlı döner, gönderim ayrı cron'da). */
export async function enqueueNewsEmails(
  userIds: string[],
  title: string,
  category: string,
  isBreaking: boolean
): Promise<number> {
  if (userIds.length === 0) return 0;
  const rows = userIds.map((user_id) => ({
    user_id,
    type: 'news' as const,
    payload: { title, category, isBreaking },
  }));
  const { data, error } = await supabaseAdmin.from('email_queue').insert(rows).select('id');
  if (error) {
    console.error('email_queue insert (news):', error);
    return 0;
  }
  return data?.length ?? 0;
}

/** Kuyruğa ekle: sinyal e-postaları. */
export async function enqueueSignalEmails(
  userIds: string[],
  signal: 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL',
  symbol: string,
  summary: string
): Promise<number> {
  if (userIds.length === 0) return 0;
  const rows = userIds.map((user_id) => ({
    user_id,
    type: 'signal' as const,
    payload: { signal, symbol, summary },
  }));
  const { data, error } = await supabaseAdmin.from('email_queue').insert(rows).select('id');
  if (error) {
    console.error('email_queue insert (signal):', error);
    return 0;
  }
  return data?.length ?? 0;
}

/** Kuyruğa ekle: takvim hatırlatma e-postaları. */
export async function enqueueCalendarEmails(
  userIds: string[],
  eventName: string,
  country: string,
  impact: string,
  minutesUntil: number
): Promise<number> {
  if (userIds.length === 0) return 0;
  const rows = userIds.map((user_id) => ({
    user_id,
    type: 'calendar' as const,
    payload: { eventName, country, impact, minutesUntil },
  }));
  const { data, error } = await supabaseAdmin.from('email_queue').insert(rows).select('id');
  if (error) {
    console.error('email_queue insert (calendar):', error);
    return 0;
  }
  return data?.length ?? 0;
}

/** Tek kullanıcı için takvim e-postası kuyruğa ekle (farklı event'ler için döngüde kullanılır). */
export async function enqueueCalendarEmail(
  userId: string,
  eventName: string,
  country: string,
  impact: string,
  minutesUntil: number
): Promise<boolean> {
  const { error } = await supabaseAdmin.from('email_queue').insert({
    user_id: userId,
    type: 'calendar',
    payload: { eventName, country, impact, minutesUntil },
  });
  if (error) {
    console.error('email_queue insert (calendar single):', error);
    return false;
  }
  return true;
}

interface ProcessEmailQueueResult {
  processed: number;
  sent: number;
  failed: number;
}

/** Kuyruktan batch alıp e-posta gönderir (cron tarafından çağrılır). */
export async function processEmailQueue(batchSize: number = EMAIL_QUEUE_BATCH_SIZE): Promise<ProcessEmailQueueResult> {
  const { data: jobs, error: fetchError } = await supabaseAdmin
    .from('email_queue')
    .select('id, user_id, type, payload, attempts, max_attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError || !jobs?.length) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  const sendOne = async (job: { id: string; user_id: string; type: string; payload: Record<string, unknown>; attempts: number; max_attempts: number }) => {
    let ok = false;
    let errMessage: string | null = null;
    try {
      if (job.type === 'news') {
        const { title, category, isBreaking } = job.payload as { title: string; category: string; isBreaking: boolean };
        ok = await sendNewsEmailToUser(job.user_id, title, category, isBreaking ?? false);
      } else if (job.type === 'signal') {
        const { signal, symbol, summary } = job.payload as { signal: 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL'; symbol: string; summary: string };
        ok = await sendSignalEmailToUser(job.user_id, signal, symbol, summary);
      } else if (job.type === 'calendar') {
        const { eventName, country, impact, minutesUntil } = job.payload as { eventName: string; country: string; impact: string; minutesUntil: number };
        ok = await sendCalendarEmailToUser(job.user_id, eventName, country, impact, minutesUntil);
      }
    } catch (e) {
      errMessage = e instanceof Error ? e.message : String(e);
    }

    const nextAttempts = job.attempts + 1;
    const isFinal = nextAttempts >= job.max_attempts;

    if (ok) {
      await supabaseAdmin.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', job.id);
      sent++;
    } else {
      if (isFinal) {
        await supabaseAdmin.from('email_queue').update({ status: 'failed', last_error: errMessage, attempts: nextAttempts }).eq('id', job.id);
        failed++;
      } else {
        await supabaseAdmin.from('email_queue').update({ last_error: errMessage, attempts: nextAttempts }).eq('id', job.id);
      }
    }
  };

  await runWithConcurrency(jobs, EMAIL_CONCURRENCY, sendOne);

  return { processed: jobs.length, sent, failed };
}
