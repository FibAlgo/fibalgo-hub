'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft,
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
  AtSign,
  Loader2,
  Bell,
  Check
} from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'comment' | 'follow' | 'repost' | 'mention';
  post_id?: string;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('community_notifications')
        .select(`
          *,
          actor:users!community_notifications_actor_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotifications(data);
      }
      
      setLoading(false);
    };

    fetchNotifications();
  }, [router, supabase]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('community_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    await supabase
      .from('community_notifications')
      .update({ is_read: true })
      .eq('user_id', userId);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={20} fill="#f91880" color="#f91880" />;
      case 'comment': return <MessageCircle size={20} color="#00f5ff" />;
      case 'repost': return <Repeat2 size={20} color="#00ba7c" />;
      case 'follow': return <UserPlus size={20} color="#1d9bf0" />;
      case 'mention': return <AtSign size={20} color="#ffd700" />;
      default: return <Bell size={20} />;
    }
  };

  const getMessage = (type: string) => {
    switch (type) {
      case 'like': return 'gönderini beğendi';
      case 'comment': return 'gönderine yanıt verdi';
      case 'repost': return 'gönderini paylaştı';
      case 'follow': return 'seni takip etmeye başladı';
      case 'mention': return 'senden bahsetti';
      default: return 'etkileşimde bulundu';
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="loading-container">
        <Loader2 className="spin" size={40} />
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0a0a0a;
            color: #00f5ff;
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <header className="page-header">
        <Link href="/community" className="back-btn">
          <ChevronLeft size={24} />
        </Link>
        <h1>Bildirimler</h1>
        {unreadCount > 0 && (
          <button className="mark-all-btn" onClick={markAllAsRead}>
            <Check size={18} />
            Tümünü Okundu İşaretle
          </button>
        )}
      </header>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>Bildirim yok</h3>
            <p>Yeni bildirimler burada görünecek</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
              onClick={() => {
                if (!notification.is_read) markAsRead(notification.id);
                if (notification.type === 'follow') {
                  router.push(`/community/profile/${notification.actor.id}`);
                } else if (notification.post_id) {
                  router.push(`/community/post/${notification.post_id}`);
                }
              }}
            >
              <div className="notification-icon">
                {getIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="actor-avatar">
                  {notification.actor.avatar_url ? (
                    <img src={notification.actor.avatar_url} alt={notification.actor.full_name} />
                  ) : (
                    <span>{getInitials(notification.actor.full_name)}</span>
                  )}
                </div>
                <div className="notification-text">
                  <strong>{notification.actor.full_name}</strong>
                  <span>{getMessage(notification.type)}</span>
                </div>
                <span className="notification-time">{timeAgo(notification.created_at)}</span>
              </div>
              {!notification.is_read && <div className="unread-dot" />}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .notifications-container {
          min-height: 100vh;
          background: #0a0a0a;
          max-width: 600px;
          margin: 0 auto;
          border-left: 1px solid #1a1a2e;
          border-right: 1px solid #1a1a2e;
        }

        .page-header {
          position: sticky;
          top: 0;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: rgba(10, 10, 10, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #1a1a2e;
          z-index: 100;
        }

        .back-btn {
          color: #fff;
          padding: 8px;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .page-header h1 {
          flex: 1;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .mark-all-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid #333;
          color: #fff;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mark-all-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .notifications-list {
          min-height: 400px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px 20px;
          color: #555;
        }

        .empty-state h3 {
          color: #fff;
          margin: 0;
        }

        .empty-state p {
          margin: 0;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #1a1a2e;
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
        }

        .notification-item:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .notification-item.unread {
          background: rgba(0, 245, 255, 0.03);
        }

        .notification-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .actor-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00f5ff, #0080ff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          color: #0a0a0a;
          overflow: hidden;
          flex-shrink: 0;
        }

        .actor-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .notification-text {
          flex: 1;
          font-size: 14px;
          color: #aaa;
        }

        .notification-text strong {
          color: #fff;
          margin-right: 4px;
        }

        .notification-time {
          color: #555;
          font-size: 13px;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: #00f5ff;
          border-radius: 50%;
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .notifications-container {
            border: none;
          }

          .mark-all-btn span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
