import { createClient } from '@supabase/supabase-js';
import { sendPushToUsers } from './sendPushNotification';
import { enqueueNewsEmails, enqueueSignalEmails } from './sendEmailNotification';

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
      // Get IDs of notifications to keep (most recent 20)
      const { data: toKeep } = await supabaseAdmin
        .from('notification_history')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS_PER_USER);

      if (toKeep && toKeep.length >= MAX_NOTIFICATIONS_PER_USER) {
        const keepIds = toKeep.map(n => n.id);
        
        // Delete all notifications NOT in the keep list
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

interface NewsItem {
  id?: string;
  title: string;
  category: string;
  is_breaking?: boolean;
  impact?: string;
  sentiment?: string;
  trading_pairs?: string[];
  signal?: string;
}

interface UserPreferences {
  user_id: string;
  notifications_enabled: boolean;
  news_breaking: boolean;
  news_high_impact: boolean;
  news_medium_impact: boolean;
  news_low_impact: boolean;
  news_crypto: boolean;
  news_forex: boolean;
  news_stocks: boolean;
  news_commodities: boolean;
  news_indices: boolean;
  news_economic: boolean;
  news_central_bank: boolean;
  news_geopolitical: boolean;
  signal_strong_buy: boolean;
  signal_buy: boolean;
  signal_sell: boolean;
  signal_strong_sell: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

// Check if user is in quiet hours
function isInQuietHours(prefs: UserPreferences): boolean {
  if (!prefs.quiet_hours_enabled) return false;
  
  try {
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: prefs.timezone || 'UTC' }));
    const currentMinutes = userTime.getHours() * 60 + userTime.getMinutes();
    
    const [startH, startM] = prefs.quiet_hours_start.split(':').map(Number);
    const [endH, endM] = prefs.quiet_hours_end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch {
    return false;
  }
}

// Check if user should receive notification for this news
// Simplified: breaking news, market news (bullish/bearish), and signals
function shouldNotifyUser(prefs: UserPreferences, news: NewsItem): boolean {
  if (!prefs.notifications_enabled) return false;
  if (isInQuietHours(prefs)) return false;
  
  // Breaking news — if breaking pref is ON, always allow (skip impact check)
  if (news.is_breaking) {
    return prefs.news_breaking; // true → notify, false → skip
  }
  
  // Non-breaking: check impact level ("Market News" toggle controls high+medium)
  const impact = news.impact?.toLowerCase() || 'medium';
  if (impact === 'high' && !prefs.news_high_impact) return false;
  if (impact === 'medium' && !prefs.news_medium_impact) return false;
  if (impact === 'low' && !prefs.news_low_impact) return false;
  
  // NOTE: Signal filtering is NOT done here — it has its own function
  // (createSignalNotifications) with separate filtering logic.
  // This function only gates NEWS notifications.
  
  return true;
}

// Get notification icon based on news type
function getNotificationIcon(news: NewsItem): string {
  if (news.is_breaking) return '🚨';
  
  const signal = news.signal || 'NO_TRADE';
  switch (signal) {
    case 'STRONG_BUY': return '🟢';
    case 'BUY': return '📈';
    case 'SELL': return '📉';
    case 'STRONG_SELL': return '🔴';
    default: break;
  }
  
  const sentiment = news.sentiment?.toLowerCase();
  if (sentiment === 'bullish') return '📈';
  if (sentiment === 'bearish') return '📉';
  
  return '📰';
}

// Create notifications for a news item
export async function createNewsNotifications(news: NewsItem): Promise<number> {
  try {
    // Fetch all user preferences
    const { data: allPrefs, error: prefsError } = await supabaseAdmin
      .from('notification_preferences')
      .select('*');
    
    if (prefsError || !allPrefs) {
      console.error('Error fetching preferences:', prefsError);
      return 0;
    }
    
    // Filter users who should be notified
    const usersToNotify = allPrefs.filter(prefs => shouldNotifyUser(prefs, news));
    
    if (usersToNotify.length === 0) {
      return 0;
    }

    // SAFETY: Remove basic/banned users — notifications are a premium feature
    const userIds = usersToNotify.map(p => p.user_id);
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan, plan_id, status')
      .in('user_id', userIds);
    const premiumUserIds = new Set(
      (subscriptions || []).filter(s => {
        const plan = (s.plan_id || s.plan || 'basic').toString().toLowerCase();
        return plan !== 'basic' && s.status !== 'banned' && s.status !== 'suspended';
      }).map(s => s.user_id)
    );
    const filteredUsers = usersToNotify.filter(p => premiumUserIds.has(p.user_id));
    if (filteredUsers.length === 0) {
      return 0;
    }
    
    // Create notification for each user (title/message NOT NULL in DB)
    const rawTitle = String(news?.title ?? '');
    const icon = getNotificationIcon(news);
    const title = news.is_breaking
      ? `🚨 Breaking: ${rawTitle.slice(0, 50)}${rawTitle.length > 50 ? '...' : ''}`
      : `${icon} ${(news.category || 'news')}: New Update`;
    const message = rawTitle.length > 150 ? rawTitle.slice(0, 147) + '...' : rawTitle;

    const notifications = filteredUsers.map(prefs => ({
      user_id: prefs.user_id,
      type: 'news',
      notification_type: 'news',
      title: title || 'New update',
      message: message || 'New market update',
      icon: news.is_breaking ? 'alert-triangle' : 'newspaper',
      action_url: `/terminal/news${news.id ? `?newsId=${news.id}` : ''}`,
      related_id: news.id ?? null,
      related_type: 'news',
      metadata: {
        category: news.category,
        is_breaking: news.is_breaking,
        impact: news.impact,
        sentiment: news.sentiment,
        signal: news.signal,
        trading_pairs: news.trading_pairs
      }
    }));
    
    let inserted = 0;
    for (const row of notifications) {
      const { error: insertError } = await supabaseAdmin
        .from('notification_history')
        .insert(row);
      if (insertError) {
        console.error('[notification_history] insert failed:', insertError.code, insertError.message, JSON.stringify(insertError.details), 'user_id:', row.user_id);
        continue;
      }
      inserted++;
    }
    if (inserted === 0 && notifications.length > 0) {
      console.error('[notification_history] all inserts failed for news', news.id);
      return 0;
    }

    // Send push notifications to users who have push enabled
    const pushUserIds = filteredUsers
      .filter(prefs => prefs.push_notifications === true)
      .map(p => p.user_id);
    
    if (pushUserIds.length > 0) {
      await sendPushToUsers(pushUserIds, {
        title,
        body: message,
        tag: `news-${news.id || Date.now()}`,
        url: '/terminal/news',
        requireInteraction: news.is_breaking
      });
    }

    // E-postaları kuyruğa ekle - sadece email ayarları açık olan kullanıcılar
    const emailUserIds = filteredUsers
      .filter(prefs => prefs.email_notifications === true)
      .map(p => p.user_id);
      
    if (emailUserIds.length > 0) {
      await enqueueNewsEmails(emailUserIds, news.title, news.category, news.is_breaking || false);
    }
    
    // Cleanup old notifications (keep max 20 per user)
    const allUserIds = filteredUsers.map(p => p.user_id);
    await cleanupOldNotifications(allUserIds);
    
    console.log(`Created ${inserted}/${filteredUsers.length} news notifications for: ${(news.title || '').slice(0, 50)}`);
    return inserted;
    
  } catch (error) {
    console.error('Error in createNewsNotifications:', error);
    return 0;
  }
}

// Create signal notifications
export async function createSignalNotifications(
  newsId: string,
  signal: 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL',
  symbol: string,
  summary: string
): Promise<number> {
  try {
    const { data: allPrefs, error: prefsError } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id, notifications_enabled, signal_strong_buy, signal_buy, signal_sell, signal_strong_sell, email_notifications, push_notifications, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone');
    
    if (prefsError || !allPrefs) return 0;
    
    // Filter by signal preference
    const usersToNotify = allPrefs.filter(p => {
      if (!p.notifications_enabled) return false;
      if (isInQuietHours(p as UserPreferences)) return false;
      
      switch (signal) {
        case 'STRONG_BUY': return p.signal_strong_buy;
        case 'BUY': return p.signal_buy;
        case 'SELL': return p.signal_sell;
        case 'STRONG_SELL': return p.signal_strong_sell;
        default: return false;
      }
    });
    
    if (usersToNotify.length === 0) return 0;

    // SAFETY: Remove basic/banned users — notifications are a premium feature
    const signalUserIds = usersToNotify.map(p => p.user_id);
    const { data: signalSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, plan, plan_id, status')
      .in('user_id', signalUserIds);
    const premiumSignalUserIds = new Set(
      (signalSubs || []).filter(s => {
        const plan = (s.plan_id || s.plan || 'basic').toString().toLowerCase();
        return plan !== 'basic' && s.status !== 'banned' && s.status !== 'suspended';
      }).map(s => s.user_id)
    );
    const filteredSignalUsers = usersToNotify.filter(p => premiumSignalUserIds.has(p.user_id));
    if (filteredSignalUsers.length === 0) return 0;
    
    const signalIcons: Record<string, string> = {
      'STRONG_BUY': '🟢',
      'BUY': '📈',
      'SELL': '📉',
      'STRONG_SELL': '🔴'
    };
    
    const signalLabels: Record<string, string> = {
      'STRONG_BUY': 'Strong Buy',
      'BUY': 'Buy',
      'SELL': 'Sell',
      'STRONG_SELL': 'Strong Sell'
    };
    
    const safeSummary = String(summary ?? '');
    const notifications = filteredSignalUsers.map(prefs => ({
      user_id: prefs.user_id,
      type: 'signal',
      notification_type: 'signal',
      title: `${signalIcons[signal]} ${signalLabels[signal]} Signal: ${symbol}`,
      message: safeSummary.length > 150 ? safeSummary.slice(0, 147) + '...' : (safeSummary || 'New signal'),
      icon: 'zap',
      action_url: `/terminal/chart?symbol=${encodeURIComponent(symbol)}`,
      related_id: newsId,
      related_type: 'signal',
      metadata: {
        signal,
        symbol
      }
    }));
    
    let inserted = 0;
    for (const row of notifications) {
      const { error: insertError } = await supabaseAdmin
        .from('notification_history')
        .insert(row);
      if (insertError) {
        console.error('[notification_history] signal insert failed:', insertError.code, insertError.message, JSON.stringify(insertError.details), 'user_id:', row.user_id);
        continue;
      }
      inserted++;
    }
    if (inserted === 0 && notifications.length > 0) {
      console.error('[notification_history] all signal inserts failed for', newsId);
      return 0;
    }

    // Send push notifications to users who have push enabled
    const pushUserIds = filteredSignalUsers
      .filter(prefs => prefs.push_notifications === true)
      .map(p => p.user_id);
      
    if (pushUserIds.length > 0) {
      await sendPushToUsers(pushUserIds, {
        title: `${signalIcons[signal]} ${signalLabels[signal]} Signal: ${symbol}`,
        body: summary.length > 150 ? summary.slice(0, 147) + '...' : summary,
        tag: `signal-${newsId}`,
        url: `/terminal/chart?symbol=${symbol}`,
        requireInteraction: signal === 'STRONG_BUY' || signal === 'STRONG_SELL'
      });
    }

    // E-postaları kuyruğa ekle - sadece email ayarları açık olan kullanıcılar
    const emailUserIds = filteredSignalUsers
      .filter(prefs => prefs.email_notifications === true)
      .map(p => p.user_id);
      
    if (emailUserIds.length > 0) {
      await enqueueSignalEmails(emailUserIds, signal, symbol, summary);
    }
    
    // Cleanup old notifications (keep max 20 per user)
    const allUserIds = filteredSignalUsers.map(p => p.user_id);
    await cleanupOldNotifications(allUserIds);
    
    return inserted;
    
  } catch (error) {
    console.error('Error in createSignalNotifications:', error);
    return 0;
  }
}
