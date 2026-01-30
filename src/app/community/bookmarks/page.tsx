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
  Share,
  Bookmark,
  Loader2,
  Trash2
} from 'lucide-react';

interface BookmarkedPost {
  id: string;
  post_id: string;
  created_at: string;
  post: {
    id: string;
    content: string;
    image_url?: string;
    like_count: number;
    comment_count: number;
    repost_count: number;
    created_at: string;
    user: {
      id: string;
      full_name: string;
      email: string;
      avatar_url?: string;
    };
  };
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchBookmarks = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('community_bookmarks')
        .select(`
          id,
          post_id,
          created_at,
          post:community_posts!community_bookmarks_post_id_fkey(
            id,
            content,
            image_url,
            like_count,
            comment_count,
            repost_count,
            created_at,
            user:users!community_posts_user_id_fkey(id, full_name, email, avatar_url)
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBookmarks(data as any);
      }
      
      setLoading(false);
    };

    fetchBookmarks();
  }, [router, supabase]);

  const removeBookmark = async (bookmarkId: string) => {
    await supabase
      .from('community_bookmarks')
      .delete()
      .eq('id', bookmarkId);

    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

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
    <div className="bookmarks-container">
      <header className="page-header">
        <Link href="/community" className="back-btn">
          <ChevronLeft size={24} />
        </Link>
        <div className="header-info">
          <h1>Kaydedilenler</h1>
          <span>{bookmarks.length} gönderi</span>
        </div>
      </header>

      <div className="bookmarks-list">
        {bookmarks.length === 0 ? (
          <div className="empty-state">
            <Bookmark size={48} />
            <h3>Kayıtlı gönderi yok</h3>
            <p>Beğendiğin gönderileri kaydet, daha sonra kolayca bul</p>
          </div>
        ) : (
          bookmarks.map(bookmark => (
            <article key={bookmark.id} className="post-card">
              <Link href={`/community/profile/${bookmark.post.user.id}`} className="post-avatar">
                {bookmark.post.user.avatar_url ? (
                  <img src={bookmark.post.user.avatar_url} alt={bookmark.post.user.full_name} />
                ) : (
                  <span>{getInitials(bookmark.post.user.full_name)}</span>
                )}
              </Link>
              <div className="post-content">
                <div className="post-header">
                  <Link href={`/community/profile/${bookmark.post.user.id}`} className="post-author">
                    <span className="author-name">{bookmark.post.user.full_name}</span>
                    <span className="author-handle">@{bookmark.post.user.email.split('@')[0]}</span>
                  </Link>
                  <span className="post-time">· {timeAgo(bookmark.post.created_at)}</span>
                </div>
                <p className="post-text">{bookmark.post.content}</p>
                {bookmark.post.image_url && (
                  <div className="post-image">
                    <img src={bookmark.post.image_url} alt="Post image" />
                  </div>
                )}
                <div className="post-actions">
                  <button className="action-btn">
                    <MessageCircle size={18} />
                    <span>{bookmark.post.comment_count || ''}</span>
                  </button>
                  <button className="action-btn">
                    <Repeat2 size={18} />
                    <span>{bookmark.post.repost_count || ''}</span>
                  </button>
                  <button className="action-btn">
                    <Heart size={18} />
                    <span>{bookmark.post.like_count || ''}</span>
                  </button>
                  <button 
                    className="action-btn bookmarked"
                    onClick={() => removeBookmark(bookmark.id)}
                    title="Kaydı Kaldır"
                  >
                    <Bookmark size={18} fill="#00f5ff" />
                  </button>
                  <button className="action-btn">
                    <Share size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <style jsx>{`
        .bookmarks-container {
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

        .header-info h1 {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .header-info span {
          font-size: 13px;
          color: #555;
        }

        .bookmarks-list {
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
          text-align: center;
        }

        .empty-state h3 {
          color: #fff;
          margin: 0;
        }

        .empty-state p {
          margin: 0;
          max-width: 300px;
        }

        .post-card {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #1a1a2e;
          transition: background 0.2s;
        }

        .post-card:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .post-avatar {
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
          text-decoration: none;
        }

        .post-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .post-content {
          flex: 1;
          min-width: 0;
        }

        .post-header {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 4px;
        }

        .post-author {
          display: flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
        }

        .author-name {
          color: #fff;
          font-weight: 600;
          font-size: 15px;
        }

        .author-name:hover {
          text-decoration: underline;
        }

        .author-handle, .post-time {
          color: #555;
          font-size: 14px;
        }

        .post-text {
          color: #e0e0e0;
          font-size: 15px;
          line-height: 1.5;
          margin: 0 0 12px;
          word-wrap: break-word;
        }

        .post-image {
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .post-image img {
          width: 100%;
          max-height: 400px;
          object-fit: cover;
        }

        .post-actions {
          display: flex;
          justify-content: space-between;
          max-width: 400px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #555;
          cursor: pointer;
          padding: 8px;
          border-radius: 50px;
          font-size: 13px;
          transition: all 0.2s;
        }

        .action-btn:hover {
          color: #00f5ff;
          background: rgba(0, 245, 255, 0.1);
        }

        .action-btn.bookmarked {
          color: #00f5ff;
        }

        .action-btn.bookmarked:hover {
          color: #f91880;
          background: rgba(249, 24, 128, 0.1);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .bookmarks-container {
            border: none;
          }

          .post-actions {
            max-width: 100%;
          }

          .action-btn span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
