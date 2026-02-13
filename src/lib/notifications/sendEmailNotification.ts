import { createClient } from '@supabase/supabase-js';
import { 
  sendPriceAlertEmail, 
  sendCalendarReminderEmail, 
  sendNewsNotificationEmail, 
  sendSignalNotificationEmail 
} from '@/lib/email';

/** Max emails processed per cron run (avoids timeout). */
export const EMAIL_QUEUE_BATCH_SIZE = Math.min(500, Math.max(50, parseInt(process.env.EMAIL_QUEUE_BATCH_SIZE || '200', 10) || 200));

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Check if user has email notifications enabled
// SAFETY: Also checks subscription plan — basic users must NEVER get notification emails
async function userHasEmailEnabled(userId: string): Promise<boolean> {
  try {
    // 1. Plan-level gate: only premium+ users can receive notification emails
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, plan_id, status')
      .eq('user_id', userId)
      .single();
    const plan = (sub?.plan_id || sub?.plan || 'basic').toString().toLowerCase();
    const isBanned = sub?.status === 'banned' || sub?.status === 'suspended';
    if (plan === 'basic' || isBanned) return false;

    // 2. Check user is not banned in users table
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_banned')
      .eq('id', userId)
      .single();
    if (userData?.is_banned === true) return false;

    // 3. Check notification preferences
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
  retried: number;
  stuckRecovered: number;
}

/** Kuyruktan batch alıp e-posta gönderir (cron tarafından çağrılır).
 *  SEQUENTIAL — tek tek gönderir; sendMail'in rate-limiter'ı aşırı yüklenmez.
 *  Retry-after: başarısız olan joblar bir sonraki çalışmada yeniden denenir.
 *  Stuck recovery: 10 dakikadan uzun süredir 'processing' kalan jobları pending'e döndürür.
 */
export async function processEmailQueue(batchSize: number = EMAIL_QUEUE_BATCH_SIZE): Promise<ProcessEmailQueueResult> {
  // ── 1) Stuck recovery: 10+ dakika 'processing' kalmış jobları kurtarılır ──
  let stuckRecovered = 0;
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: stuckJobs } = await supabaseAdmin
    .from('email_queue')
    .update({ status: 'pending' })
    .eq('status', 'processing')
    .lt('updated_at', tenMinutesAgo)
    .select('id');
  stuckRecovered = stuckJobs?.length ?? 0;
  if (stuckRecovered > 0) {
    console.warn(`[email-queue] Recovered ${stuckRecovered} stuck jobs`);
  }

  // ── 2) Fetch pending jobs (retry_after'ı geçmiş olanlar dahil) ──
  const now = new Date().toISOString();
  const { data: jobs, error: fetchError } = await supabaseAdmin
    .from('email_queue')
    .select('id, user_id, type, payload, attempts, max_attempts')
    .eq('status', 'pending')
    .or(`retry_after.is.null,retry_after.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError || !jobs?.length) {
    return { processed: 0, sent: 0, failed: 0, retried: 0, stuckRecovered };
  }

  // Mark all fetched jobs as 'processing' so another cron doesn't pick them
  const jobIds = jobs.map((j) => j.id);
  await supabaseAdmin
    .from('email_queue')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .in('id', jobIds);

  let sent = 0;
  let failed = 0;
  let retried = 0;

  // ── 3) Process SEQUENTIALLY — one at a time, rate-limiter handles timing ──
  for (const job of jobs) {
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
      await supabaseAdmin.from('email_queue').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        attempts: nextAttempts,
      }).eq('id', job.id);
      sent++;
    } else if (isFinal) {
      // Max attempts exceeded — mark as failed permanently
      await supabaseAdmin.from('email_queue').update({
        status: 'failed',
        last_error: errMessage,
        attempts: nextAttempts,
      }).eq('id', job.id);
      failed++;
      console.error(`[email-queue] Job ${job.id} FAILED permanently after ${nextAttempts} attempts: ${errMessage}`);
    } else {
      // Schedule retry with exponential backoff: 2min, 4min, 8min, 16min ...
      const backoffMinutes = Math.pow(2, nextAttempts); // 2, 4, 8, 16...
      const retryAfter = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
      await supabaseAdmin.from('email_queue').update({
        status: 'pending',
        last_error: errMessage,
        attempts: nextAttempts,
        retry_after: retryAfter,
      }).eq('id', job.id);
      retried++;
      console.warn(`[email-queue] Job ${job.id} will retry at ${retryAfter} (attempt ${nextAttempts}/${job.max_attempts})`);
    }
  }

  console.log(`[email-queue] Batch done: ${sent} sent, ${retried} retried, ${failed} failed, ${stuckRecovered} stuck recovered`);
  return { processed: jobs.length, sent, failed, retried, stuckRecovered };
}
