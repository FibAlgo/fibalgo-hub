import { createClient } from '@supabase/supabase-js';
import { sendPushToUsers } from './sendPushNotification';
import { sendNewsEmailToUsers, sendSignalEmailToUsers } from './sendEmailNotification';

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
function shouldNotifyUser(prefs: UserPreferences, news: NewsItem): boolean {
  if (!prefs.notifications_enabled) return false;
  if (isInQuietHours(prefs)) return false;
  
  // Check breaking news
  if (news.is_breaking && !prefs.news_breaking) return false;
  
  // Check impact level
  const impact = news.impact?.toLowerCase() || 'medium';
  if (impact === 'high' && !prefs.news_high_impact) return false;
  if (impact === 'medium' && !prefs.news_medium_impact) return false;
  if (impact === 'low' && !prefs.news_low_impact) return false;
  
  // Check category
  const category = news.category?.toLowerCase() || '';
  const categoryMap: Record<string, keyof UserPreferences> = {
    'crypto': 'news_crypto',
    'cryptocurrency': 'news_crypto',
    'forex': 'news_forex',
    'stocks': 'news_stocks',
    'equities': 'news_stocks',
    'commodities': 'news_commodities',
    'indices': 'news_indices',
    'economic': 'news_economic',
    'macro': 'news_economic',
    'central_bank': 'news_central_bank',
    'fed': 'news_central_bank',
    'ecb': 'news_central_bank',
    'geopolitical': 'news_geopolitical',
    'politics': 'news_geopolitical'
  };
  
  const prefKey = categoryMap[category];
  if (prefKey && !prefs[prefKey]) return false;
  
  // Check signal preferences
  const signal = news.signal || 'NO_TRADE';
  if (signal === 'STRONG_BUY' && !prefs.signal_strong_buy) return false;
  if (signal === 'BUY' && !prefs.signal_buy) return false;
  if (signal === 'SELL' && !prefs.signal_sell) return false;
  if (signal === 'STRONG_SELL' && !prefs.signal_strong_sell) return false;
  
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
    
    // Create notification for each user
    const icon = getNotificationIcon(news);
    const title = news.is_breaking 
      ? `🚨 Breaking: ${news.title.slice(0, 50)}...`
      : `${icon} ${news.category}: New Update`;
    
    const message = news.title.length > 150 
      ? news.title.slice(0, 147) + '...'
      : news.title;
    
    const notifications = usersToNotify.map(prefs => ({
      user_id: prefs.user_id,
      notification_type: 'news',
      title,
      message,
      icon: news.is_breaking ? 'alert-triangle' : 'newspaper',
      action_url: `/terminal/news${news.id ? `?newsId=${news.id}` : ''}`,
      related_id: news.id || null,
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
    
    const { error: insertError } = await supabaseAdmin
      .from('notification_history')
      .insert(notifications);
    
    if (insertError) {
      console.error('Error creating notifications:', insertError);
      return 0;
    }
    
    // Send push notifications
    const userIds = usersToNotify.map(p => p.user_id);
    await sendPushToUsers(userIds, {
      title,
      body: message,
      tag: `news-${news.id || Date.now()}`,
      url: '/terminal/news',
      requireInteraction: news.is_breaking
    });

    // Send email notifications
    await sendNewsEmailToUsers(userIds, news.title, news.category, news.is_breaking || false);
    
    // Cleanup old notifications (keep max 20 per user)
    await cleanupOldNotifications(userIds);
    
    console.log(`Created ${usersToNotify.length} news notifications for: ${news.title.slice(0, 50)}`);
    return usersToNotify.length;
    
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
      .select('user_id, notifications_enabled, signal_strong_buy, signal_buy, signal_sell, signal_strong_sell, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone');
    
    if (prefsError || !allPrefs) return 0;
    
    // Filter by signal preference
    const prefKey = `signal_${signal.toLowerCase().replace('_', '_')}` as keyof UserPreferences;
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
    
    const notifications = usersToNotify.map(prefs => ({
      user_id: prefs.user_id,
      notification_type: 'signal',
      title: `${signalIcons[signal]} ${signalLabels[signal]} Signal: ${symbol}`,
      message: summary.length > 150 ? summary.slice(0, 147) + '...' : summary,
      icon: 'zap',
      action_url: `/terminal/chart?symbol=${symbol}`,
      related_id: newsId,
      related_type: 'signal',
      metadata: {
        signal,
        symbol
      }
    }));
    
    const { error: insertError } = await supabaseAdmin
      .from('notification_history')
      .insert(notifications);
    
    if (insertError) {
      console.error('Error creating signal notifications:', insertError);
      return 0;
    }
    
    // Send push notifications
    const userIds = usersToNotify.map(p => p.user_id);
    await sendPushToUsers(userIds, {
      title: `${signalIcons[signal]} ${signalLabels[signal]} Signal: ${symbol}`,
      body: summary.length > 150 ? summary.slice(0, 147) + '...' : summary,
      tag: `signal-${newsId}`,
      url: `/terminal/chart?symbol=${symbol}`,
      requireInteraction: signal === 'STRONG_BUY' || signal === 'STRONG_SELL'
    });

    // Send email notifications
    await sendSignalEmailToUsers(userIds, signal, symbol, summary);
    
    // Cleanup old notifications (keep max 20 per user)
    await cleanupOldNotifications(userIds);
    
    return usersToNotify.length;
    
  } catch (error) {
    console.error('Error in createSignalNotifications:', error);
    return 0;
  }
}
