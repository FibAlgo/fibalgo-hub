'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  Settings,
  Volume2,
  VolumeX,
  Mail,
  Smartphone,
  Clock,
  TrendingUp,
  AlertTriangle,
  Zap,
  Globe,
  Calendar,
  Loader2,
  Save,
  RefreshCw,
  Play,
  Lock,
} from 'lucide-react';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { useNotificationSound, NOTIFICATION_SOUNDS, NotificationSoundId } from '@/lib/hooks/useNotificationSound';
import { useTranslations } from 'next-intl';

// Types
interface NotificationPreferences {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  sound_enabled: boolean;
  sound_type: string;
  // Simplified news prefs (kept in DB for backward compat, UI only shows these)
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

interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  icon: string;
  action_url: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  /** When false (basic user), panel content is blurred and locked with upgrade overlay */
  isPremium?: boolean;
}

type TabType = 'notifications' | 'settings';

const defaultPreferences: Partial<NotificationPreferences> = {
  notifications_enabled: false,
  email_notifications: false,
  push_notifications: false,
  sound_enabled: false,
  sound_type: 'default',
  news_breaking: true,
  news_high_impact: true,
  news_medium_impact: true,
  news_low_impact: false,
  news_crypto: true,
  news_forex: true,
  news_stocks: true,
  news_commodities: true,
  news_indices: true,
  news_economic: true,
  news_central_bank: true,
  news_geopolitical: true,
  signal_strong_buy: true,
  signal_buy: true,
  signal_sell: true,
  signal_strong_sell: true,
  calendar_enabled: true,
  calendar_high_impact: true,
  calendar_medium_impact: true,
  calendar_low_impact: false,
  calendar_reminder_minutes: 15,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  timezone: 'UTC'
};

export default function NotificationCenter({ isOpen, onClose, isPremium = true }: NotificationCenterProps) {
  const t = useTranslations('notifications');
  const [activeTab, setActiveTab] = useState<TabType>('notifications');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    news: true,
    calendar: true,
    quiet: false
  });

  // Notification sound hook
  const { playSound, previewSound } = useNotificationSound();
  const lastNotificationIdRef = useRef<string | null>(null);
  const preferencesRef = useRef<NotificationPreferences | null>(null);
  
  // Keep preferences ref in sync
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Push notification hook
  const {
    isSupported: isPushSupported,
    isSubscribed: isPushSubscribed,
    permission: pushPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    loading: pushLoading,
    error: pushError
  } = usePushNotifications();

  // Handle push notification toggle
  const handlePushToggle = async () => {
    if (!isPushSupported) return;
    
    if (isPushSubscribed) {
      await unsubscribePush();
      if (preferences) {
        setPreferences({ ...preferences, push_notifications: false });
      }
    } else {
      const success = await subscribePush();
      if (success && preferences) {
        setPreferences({ ...preferences, push_notifications: true });
      }
    }
  };

  // Fetch all data
  const fetchData = useCallback(async (showLoading = true, checkNewNotifications = false) => {
    if (showLoading) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const [prefsRes, notifRes] = await Promise.all([
        fetch('/api/user/notifications/preferences'),
        fetch('/api/user/notifications/history?limit=20')
      ]);

      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        // Merge with defaults: only use API values when not null/undefined
        const merged = { ...defaultPreferences } as Record<string, unknown>;
        for (const key of Object.keys(prefsData)) {
          const v = prefsData[key];
          if (v !== undefined && v !== null) merged[key] = v;
        }
        setPreferences(merged as unknown as NotificationPreferences);
        setLoadError(null);
      } else {
        // API error - show error message but keep any existing preferences
        const errData = await prefsRes.json().catch(() => ({}));
        console.error('Error fetching preferences:', errData);
        // Use ref to check if we have preferences (avoids stale closure)
        if (!preferencesRef.current) {
          // Only set defaults if we don't have any preferences yet
          setPreferences(defaultPreferences as unknown as NotificationPreferences);
        }
        if (showLoading) {
          setLoadError(t('couldNotLoadSettings'));
        }
      }

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        const newNotifications = notifData.notifications || [];
        
        // Check for new notifications and play sound
        if (checkNewNotifications && newNotifications.length > 0) {
          const latestNotif = newNotifications[0];
          if (latestNotif && lastNotificationIdRef.current && latestNotif.id !== lastNotificationIdRef.current) {
            // New notification arrived - play sound if enabled
            const prefs = preferencesRef.current;
            if (prefs?.sound_enabled) {
              const soundType = (prefs.sound_type || 'default') as NotificationSoundId;
              playSound(soundType);
            }
          }
        }
        
        // Update last notification ID
        if (newNotifications.length > 0) {
          lastNotificationIdRef.current = newNotifications[0].id;
        }
        
        setNotifications(newNotifications);
        setUnreadCount(notifData.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching notification data:', error);
      if (showLoading) {
        setLoadError(t('connectionError'));
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [playSound]); // Removed 'preferences' from dependencies - use ref instead

  useEffect(() => {
    if (isOpen) {
      fetchData(true, false); // Show loading on first fetch, don't check for new notifications
      
      // Set up polling for realtime updates (every 30 seconds when panel is open)
      const pollInterval = setInterval(() => {
        fetchData(false, true); // Don't show loading on polling, but check for new notifications
      }, 30000);
      
      return () => clearInterval(pollInterval);
    }
  }, [isOpen, fetchData]);

  // Prevent background scroll when notification panel is open (mobile)
  // Use a safer approach that doesn't modify body styles
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      
      // Use a class-based approach instead of inline styles
      document.body.setAttribute('data-scroll-lock', 'true');
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
      
      return () => {
        document.body.removeAttribute('data-scroll-lock');
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Save preferences
  const savePreferences = async () => {
    if (!preferences) return;
    
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const res = await fetch('/api/user/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save');
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveError(error instanceof Error ? error.message : t('failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  // Toggle preference
  const togglePreference = (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [key]: !preferences[key]
    });
  };

  // Update preference value
  const updatePreference = (key: keyof NotificationPreferences, value: unknown) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [key]: value
    });
  };

  // Mark all as read
  const markAllRead = async () => {
    try {
      const res = await fetch('/api/user/notifications/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' })
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Mark single notification as read
  const markSingleAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Check if mobile - must be before conditional return
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  const currentPrefs = preferences || defaultPreferences as NotificationPreferences;

  // Mobile: Max 70% of available height (between header and bottom nav)
  const mobileMaxHeight = 'min(70vh, calc(100vh - 64px - 65px - 20px))';

  return (
    <>
      {/* Backdrop - click to close */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 999
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: isMobile ? '64px' : 0,
        right: 0,
        width: isMobile ? '100%' : '420px',
        maxWidth: '100vw',
        height: isMobile ? 'auto' : '100vh',
        maxHeight: isMobile ? mobileMaxHeight : '100vh',
        background: 'linear-gradient(180deg, #0f0f0f 0%, #141416 100%)',
        borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
        borderTop: isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        animation: isMobile ? 'slideDown 0.2s ease' : 'slideIn 0.3s ease',
        borderRadius: isMobile ? '0 0 16px 16px' : 0,
        boxShadow: isMobile ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
        overflow: 'hidden'
      }}>
        {/* Basic user: overlay with lock (content below is blurred and non-interactive) */}
        {!isPremium && (
          <a
            href="/#pricing"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              background: 'rgba(0,0,0,0.5)',
              color: 'rgba(255,255,255,0.95)',
              fontSize: '1rem',
              fontWeight: 600,
              textDecoration: 'none',
              zIndex: 10
            }}
          >
            <Lock size={40} strokeWidth={2} />
            <span>{t('upgradeToView')}</span>
          </a>
        )}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          filter: !isPremium ? 'blur(8px)' : undefined,
          pointerEvents: !isPremium ? 'none' : undefined,
          userSelect: !isPremium ? 'none' : undefined
        }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0,245,255,0.2) 0%, rgba(0,245,255,0.05) 100%)',
              border: '1px solid rgba(0,245,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bell size={18} color="#00F5FF" />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                {t('title')}
              </h2>
              {unreadCount > 0 && (
                <span style={{ color: '#888', fontSize: '0.8rem' }}>
                  {t('unreadCount', { count: unreadCount })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '0.5rem',
              cursor: 'pointer',
              color: '#888',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          padding: '0 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          gap: '0.25rem'
        }}>
          {[
            { id: 'notifications', label: t('tabNotifications'), icon: Bell },
            { id: 'settings', label: t('tabSettings'), icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              style={{
                flex: 1,
                padding: '0.875rem 0.5rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #00F5FF' : '2px solid transparent',
                color: activeTab === tab.id ? '#fff' : '#666',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content - overscroll-behavior prevents scroll chaining to background */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: '1rem',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#666'
            }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : activeTab === 'notifications' ? (
            <NotificationsTab 
              notifications={notifications}
              onMarkAllRead={markAllRead}
              onMarkAsRead={markSingleAsRead}
              unreadCount={unreadCount}
              onClose={onClose}
            />
          ) : (
            <>
              {loadError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  background: 'rgba(255,100,100,0.1)',
                  border: '1px solid rgba(255,100,100,0.3)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'rgba(255,150,150,0.95)'
                }}>
                  <AlertTriangle size={14} />
                  <span>{loadError}</span>
                  <button
                    onClick={() => fetchData(true)}
                    style={{
                      marginLeft: 'auto',
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.25rem 0.5rem',
                      color: '#fff',
                      fontSize: '0.7rem',
                      cursor: 'pointer'
                    }}
                  >
                    {t('retry')}
                  </button>
                </div>
              )}
              <SettingsTab 
                preferences={currentPrefs}
                togglePreference={togglePreference}
                updatePreference={updatePreference}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
                isPushSupported={isPushSupported}
                isPushSubscribed={isPushSubscribed}
                pushPermission={pushPermission}
                pushLoading={pushLoading}
                pushError={pushError}
                onPushToggle={handlePushToggle}
                previewSound={previewSound}
              />
            </>
          )}
        </div>

        {/* Footer for settings tab */}
        {activeTab === 'settings' && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {/* Loading / success feedback above buttons */}
            {saving && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: 'rgba(0,245,255,0.9)'
              }}>
                <Loader2 size={14} className="animate-spin" />
                <span>{t('saving')}</span>
              </div>
            )}
            {saveSuccess && !saving && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: 'rgba(0,200,120,0.95)'
              }}>
                <Check size={14} />
                <span>{t('settingsSaved')}</span>
              </div>
            )}
            {saveError && !saving && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: 'rgba(255,100,100,0.95)'
              }}>
                <span>{saveError}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => fetchData(true)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#888',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <RefreshCw size={14} />
              {t('reset')}
            </button>
            <button
              onClick={savePreferences}
              disabled={saving}
              style={{
                flex: 2,
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #00F5FF 0%, #00D4FF 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? t('saving') : t('saveChanges')}
            </button>
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideDown {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
        </div>
      </div>
    </>
  );
}

// Notifications Tab Component
function NotificationsTab({ 
  notifications, 
  onMarkAllRead,
  onMarkAsRead,
  unreadCount,
  onClose
}: { 
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onMarkAsRead: (id: string) => void;
  unreadCount: number;
  onClose: () => void;
}) {
  const t = useTranslations('notifications');
  const router = useRouter();

  const handleNotificationClick = (notif: NotificationItem) => {
    console.log('[NotificationClick] Clicked:', notif.id, 'action_url:', notif.action_url, 'type:', notif.notification_type, 'related_id:', notif.related_id);
    
    // Mark as read locally immediately
    if (!notif.is_read) {
      onMarkAsRead(notif.id);
    }
    
    // Mark as read on server (fire and forget - don't wait)
    fetch('/api/user/notifications/history', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: notif.id })
    }).catch(e => console.error('Error marking notification as read:', e));

    // Build navigation URL — news: habere git (related_id veya action_url'deki newsId)
    let targetUrl = notif.action_url?.trim() || '';
    if (notif.notification_type === 'news' && notif.related_id && (!targetUrl || !targetUrl.includes('newsId='))) {
      targetUrl = `/terminal/news?newsId=${encodeURIComponent(notif.related_id)}`;
    }
    
    console.log('[NotificationClick] Final URL:', targetUrl);
    
    if (targetUrl) {
      onClose();
      router.push(targetUrl);
    } else {
      console.log('[NotificationClick] No targetUrl!');
    }
  };
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'news': return <Globe size={14} />;
      case 'signal': return <Zap size={14} />;
      case 'price_alert': return <Target size={14} />;
      case 'calendar': return <Calendar size={14} />;
      default: return <Bell size={14} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'news': return '#00F5FF';
      case 'signal': return '#FFD700';
      case 'price_alert': return '#FF6B6B';
      case 'calendar': return '#A855F7';
      default: return '#888';
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diff < 60) return t('justNow');
    if (diff < 3600) return t('minutesAgo', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('hoursAgo', { count: Math.floor(diff / 3600) });
    return t('daysAgo', { count: Math.floor(diff / 86400) });
  };

  return (
    <div>
      {unreadCount > 0 && (
        <button
          onClick={onMarkAllRead}
          style={{
            width: '100%',
            padding: '0.625rem',
            background: 'rgba(0,245,255,0.1)',
            border: '1px solid rgba(0,245,255,0.2)',
            borderRadius: '8px',
            color: '#00F5FF',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <Check size={14} />
          {t('markAllAsRead')}
        </button>
      )}

      {notifications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: '#666'
        }}>
          <BellOff size={48} strokeWidth={1} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t('noNotifications')}</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
            {t('noNotificationsHint')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifications.map(notif => (
            <div
              key={notif.id}
              data-read={notif.is_read ? 'true' : 'false'}
              onClick={() => handleNotificationClick(notif)}
              style={{
                padding: '0.875rem',
                background: notif.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(0,245,255,0.05)',
                border: `1px solid ${notif.is_read ? 'rgba(255,255,255,0.05)' : 'rgba(0,245,255,0.15)'}`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,245,255,0.1)'}
              onMouseLeave={(e) => {
                const isRead = e.currentTarget.dataset.read === 'true';
                e.currentTarget.style.background = isRead ? 'rgba(255,255,255,0.02)' : 'rgba(0,245,255,0.05)';
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: `${getTypeColor(notif.notification_type)}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: getTypeColor(notif.notification_type),
                  flexShrink: 0
                }}>
                  {getTypeIcon(notif.notification_type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{ 
                      color: '#fff', 
                      fontSize: '0.85rem', 
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {notif.title}
                    </span>
                    <span style={{ 
                      color: '#666', 
                      fontSize: '0.7rem',
                      flexShrink: 0,
                      marginLeft: '0.5rem'
                    }}>
                      {formatTime(notif.created_at)}
                    </span>
                  </div>
                  <p style={{ 
                    color: '#888', 
                    fontSize: '0.8rem', 
                    margin: 0,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {notif.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ 
  preferences,
  togglePreference,
  updatePreference,
  expandedSections,
  toggleSection,
  isPushSupported,
  isPushSubscribed,
  pushPermission,
  pushLoading,
  pushError,
  onPushToggle,
  previewSound
}: {
  preferences: NotificationPreferences;
  togglePreference: (key: keyof NotificationPreferences) => void;
  updatePreference: (key: keyof NotificationPreferences, value: unknown) => void;
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  pushPermission: NotificationPermission | null;
  pushLoading: boolean;
  pushError: string | null;
  onPushToggle: () => void;
  previewSound: (soundId: NotificationSoundId) => void;
}) {
  const t = useTranslations('notifications');

  // Derived: signals master toggle (all 4 signal prefs on/off together)
  const signalsEnabled = preferences.signal_strong_buy || preferences.signal_buy || preferences.signal_sell || preferences.signal_strong_sell;

  // Derived: bullish/bearish toggle — maps to news_high_impact + news_medium_impact + all categories
  const marketNewsEnabled = preferences.news_high_impact || preferences.news_medium_impact;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Global Toggle */}
      <div style={{
        padding: '1rem',
        background: preferences.notifications_enabled 
          ? 'linear-gradient(135deg, rgba(0,245,255,0.1) 0%, rgba(0,245,255,0.02) 100%)'
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${preferences.notifications_enabled ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {preferences.notifications_enabled ? (
              <Bell size={20} color="#00F5FF" />
            ) : (
              <BellOff size={20} color="#666" />
            )}
            <div>
              <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>
                {t('notificationsLabel')}
              </span>
              <p style={{ color: '#666', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                {preferences.notifications_enabled ? t('enabled') : t('disabled')}
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={preferences.notifications_enabled}
            onChange={() => togglePreference('notifications_enabled')}
          />
        </div>
      </div>

      {/* Delivery Methods */}
      <div style={{
        padding: '1rem',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
          {t('deliveryMethods')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <SettingRow
            icon={<Mail size={16} />}
            label={t('emailNotifications')}
            checked={preferences.email_notifications}
            onChange={() => togglePreference('email_notifications')}
          />
          
          {/* Push Notifications Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: '#666', display: 'flex' }}>
                {pushLoading ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
              </span>
              <div>
                <span style={{ color: '#fff', fontSize: '0.85rem' }}>{t('pushNotifications')}</span>
                {!isPushSupported ? (
                  <p style={{ color: '#FF6B6B', fontSize: '0.7rem', margin: '0.125rem 0 0' }}>
                    {t('pushNotSupported')}
                  </p>
                ) : pushPermission === 'denied' ? (
                  <p style={{ color: '#FF6B6B', fontSize: '0.7rem', margin: '0.125rem 0 0' }}>
                    {t('pushBlocked')}
                  </p>
                ) : pushError ? (
                  <p style={{ color: '#FF6B6B', fontSize: '0.7rem', margin: '0.125rem 0 0' }}>
                    {pushError}
                  </p>
                ) : isPushSubscribed ? (
                  <p style={{ color: '#00FF88', fontSize: '0.7rem', margin: '0.125rem 0 0' }}>
                    {t('pushActive')}
                  </p>
                ) : (
                  <p style={{ color: '#888', fontSize: '0.7rem', margin: '0.125rem 0 0' }}>
                    {t('pushClickToEnable')}
                  </p>
                )}
              </div>
            </div>
            <ToggleSwitch 
              checked={isPushSubscribed && preferences.push_notifications} 
              onChange={() => {
                if (!isPushSubscribed) {
                  onPushToggle();
                } else {
                  togglePreference('push_notifications');
                }
              }} 
            />
          </div>
          
          <SettingRow
            icon={preferences.sound_enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            label={t('sound')}
            checked={preferences.sound_enabled}
            onChange={() => togglePreference('sound_enabled')}
          />
          
          {/* Sound Selection */}
          {preferences.sound_enabled && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              paddingLeft: '1.5rem'
            }}>
              <span style={{ color: '#888', fontSize: '0.8rem' }}>{t('notificationSound')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={preferences.sound_type || 'default'}
                  onChange={(e) => {
                    updatePreference('sound_type', e.target.value);
                  }}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    color: '#fff',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {NOTIFICATION_SOUNDS.map((sound) => (
                    <option key={sound.id} value={sound.id}>
                      {sound.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const soundId = (preferences?.sound_type || 'default') as NotificationSoundId;
                    previewSound(soundId);
                  }}
                  style={{
                    background: 'rgba(0, 255, 136, 0.1)',
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    color: '#00FF88',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Play size={12} />
                  {t('test')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Types — Simplified */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '1rem'
      }}>
        <h3 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={16} color="#00F5FF" />
          {t('newsNotifications')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Breaking News */}
          <SettingRow
            icon={<AlertTriangle size={14} color="#FF6B6B" />}
            label={t('breakingNews')}
            description={t('breakingNewsDesc')}
            checked={preferences.news_breaking}
            onChange={() => togglePreference('news_breaking')}
          />

          {/* Bullish / Bearish Market News */}
          <SettingRow
            icon={<TrendingUp size={14} color="#4ECDC4" />}
            label={t('marketNews') || 'Market News'}
            description={t('marketNewsDesc') || 'Bullish & bearish market-moving news'}
            checked={marketNewsEnabled}
            onChange={() => {
              const newVal = !marketNewsEnabled;
              // Toggle high+medium impact and all categories together
              updatePreference('news_high_impact', newVal);
              updatePreference('news_medium_impact', newVal);
              updatePreference('news_crypto', newVal);
              updatePreference('news_forex', newVal);
              updatePreference('news_stocks', newVal);
              updatePreference('news_commodities', newVal);
              updatePreference('news_indices', newVal);
              updatePreference('news_economic', newVal);
              updatePreference('news_central_bank', newVal);
              updatePreference('news_geopolitical', newVal);
            }}
          />

          {/* Trading Signals */}
          <SettingRow
            icon={<Zap size={14} color="#FFD700" />}
            label={t('signalNotificationsLabel') || 'Trading Signals'}
            description={t('signalNotificationsDesc') || 'Buy & sell position signals from news'}
            checked={signalsEnabled}
            onChange={() => {
              const newVal = !signalsEnabled;
              updatePreference('signal_strong_buy', newVal);
              updatePreference('signal_buy', newVal);
              updatePreference('signal_sell', newVal);
              updatePreference('signal_strong_sell', newVal);
            }}
          />
        </div>
      </div>

      {/* Calendar — Only High Impact */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '1rem'
      }}>
        <h3 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={16} color="#00F5FF" />
          {t('calendarNotifications')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <SettingRow
            icon={<AlertTriangle size={14} color="#FF6B6B" />}
            label={t('highImpactEvents')}
            description={t('calendarAlertsDesc')}
            checked={preferences.calendar_enabled && preferences.calendar_high_impact}
            onChange={() => {
              const isCurrentlyOn = preferences.calendar_enabled && preferences.calendar_high_impact;
              if (isCurrentlyOn) {
                // Turn off calendar entirely
                updatePreference('calendar_enabled', false);
                updatePreference('calendar_high_impact', false);
              } else {
                // Turn on calendar + only high impact
                updatePreference('calendar_enabled', true);
                updatePreference('calendar_high_impact', true);
                updatePreference('calendar_medium_impact', false);
                updatePreference('calendar_low_impact', false);
              }
            }}
          />
          
          {preferences.calendar_enabled && preferences.calendar_high_impact && (
            <div style={{ 
              padding: '0.75rem', 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#888', fontSize: '0.8rem' }}>{t('reminderTime')}</span>
                <select
                  value={preferences.calendar_reminder_minutes}
                  onChange={(e) => updatePreference('calendar_reminder_minutes', parseInt(e.target.value))}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '0.375rem 0.5rem',
                    color: '#fff',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value={5}>{t('minutesBefore5')}</option>
                  <option value={10}>{t('minutesBefore10')}</option>
                  <option value={15}>{t('minutesBefore15')}</option>
                  <option value={30}>{t('minutesBefore30')}</option>
                  <option value={60}>{t('hourBefore1')}</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quiet Hours */}
      <CollapsibleSection
        title={t('quietHours')}
        icon={<Clock size={16} />}
        isExpanded={expandedSections.quiet}
        onToggle={() => toggleSection('quiet')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <SettingRow
            icon={<BellOff size={14} />}
            label={t('enableQuietHours')}
            description={t('enableQuietHoursDesc')}
            checked={preferences.quiet_hours_enabled}
            onChange={() => togglePreference('quiet_hours_enabled')}
          />
          
          {preferences.quiet_hours_enabled && (
            <div style={{ 
              padding: '0.75rem', 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: '8px',
              display: 'flex',
              gap: '1rem'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginBottom: '0.375rem' }}>
                  {t('start')}
                </label>
                <input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#666', fontSize: '0.75rem', display: 'block', marginBottom: '0.375rem' }}>
                  {t('end')}
                </label>
                <input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}

// Reusable Components
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        background: checked ? 'linear-gradient(135deg, #00F5FF 0%, #00D4FF 100%)' : 'rgba(255,255,255,0.1)',
        border: 'none',
        padding: '2px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative'
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: '#fff',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.2s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </button>
  );
}

function SettingRow({ 
  icon, 
  label, 
  description,
  checked, 
  onChange 
}: { 
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.5rem 0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: '#666', display: 'flex' }}>{icon}</span>
        <div>
          <span style={{ color: '#fff', fontSize: '0.85rem' }}>{label}</span>
          {description && (
            <p style={{ color: '#666', fontSize: '0.7rem', margin: '0.125rem 0 0' }}>
              {description}
            </p>
          )}
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  icon, 
  isExpanded, 
  onToggle, 
  children 
}: {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '1rem',
          background: 'none',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: '#00F5FF', display: 'flex' }}>{icon}</span>
          <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown size={16} color="#666" />
        ) : (
          <ChevronRight size={16} color="#666" />
        )}
      </button>
      {isExpanded && (
        <div style={{ padding: '0 1rem 1rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}
