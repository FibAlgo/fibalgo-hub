'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  User, 
  Bell, 
  Bookmark, 
  Search,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MoreHorizontal,
  X,
  Send,
  TrendingUp,
  Users,
  Loader2,
  ChevronLeft
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  parent_id?: string;
  repost_of?: string;
  quote_content?: string;
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
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
  original_post?: Post;
}

interface CommunityClientProps {
  initialUser: UserProfile | null;
}

export default function CommunityClient({ initialUser }: CommunityClientProps) {
  const [user] = useState<UserProfile | null>(initialUser);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [activeTab, setActiveTab] = useState<'feed' | 'following'>('feed');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('community_posts')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activeTab === 'following' && user) {
        // Get following IDs first
        const { data: followingData } = await supabase
          .from('community_follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        const followingIds = followingData?.map(f => f.following_id) || [];
        followingIds.push(user.id); // Include own posts
        
        if (followingIds.length > 0) {
          query = query.in('user_id', followingIds);
        }
      }

      const { data: postsData, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }

      // Fetch user info for each post
      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        
        const postIds = postsData.map(p => p.id);
        
        let likedPostIds = new Set<string>();
        let bookmarkedPostIds = new Set<string>();
        
        // Only check likes/bookmarks if user is logged in
        if (user) {
          const [likesResult, bookmarksResult] = await Promise.all([
            supabase.from('community_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
            supabase.from('community_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds)
          ]);
          likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
          bookmarkedPostIds = new Set(bookmarksResult.data?.map(b => b.post_id) || []);
        }

        const enrichedPosts = postsData.map(post => ({
          ...post,
          user: usersMap.get(post.user_id) || { id: post.user_id, full_name: 'Unknown', email: 'unknown@email.com' },
          liked_by_me: likedPostIds.has(post.id),
          bookmarked_by_me: bookmarkedPostIds.has(post.id)
        }));

        setPosts(enrichedPosts);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, supabase]);

  useEffect(() => {
    fetchPosts();
  }, [activeTab, fetchPosts]);

  // Fetch suggested users
  useEffect(() => {
    const fetchSuggested = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, bio, followers_count, following_count, posts_count')
        .order('followers_count', { ascending: false })
        .limit(5);

      if (data) {
        // Filter out current user if logged in
        const filtered = user ? data.filter(u => u.id !== user.id) : data;
        setSuggestedUsers(filtered);
      }
    };

    fetchSuggested();
  }, [user, supabase]);

  // Create post
  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim() || posting) return;
    
    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          content: newPostContent.trim()
        })
        .select('*')
        .single();

      if (error) throw error;

      const newPost = {
        ...data,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url
        },
        liked_by_me: false,
        bookmarked_by_me: false
      };

      setPosts(prev => [newPost, ...prev]);
      setNewPostContent('');
      
      // Update user posts count
      await supabase
        .from('users')
        .update({ posts_count: (user.posts_count || 0) + 1 })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setPosting(false);
    }
  };

  // Like/unlike post
  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('community_likes').insert({ post_id: postId, user_id: user.id });
      }

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            liked_by_me: !isLiked,
            like_count: isLiked ? post.like_count - 1 : post.like_count + 1
          };
        }
        return post;
      }));

      // Update like count in database
      const newCount = posts.find(p => p.id === postId)!.like_count + (isLiked ? -1 : 1);
      await supabase.from('community_posts').update({ like_count: newCount }).eq('id', postId);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Bookmark post
  const handleBookmark = async (postId: string, isBookmarked: boolean) => {
    if (!user) return;

    try {
      if (isBookmarked) {
        await supabase.from('community_bookmarks').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('community_bookmarks').insert({ post_id: postId, user_id: user.id });
      }

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return { ...post, bookmarked_by_me: !isBookmarked };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Add comment
  const handleComment = async (parentId: string) => {
    if (!user || !commentContent.trim()) return;

    try {
      await supabase.from('community_posts').insert({
        user_id: user.id,
        content: commentContent.trim(),
        parent_id: parentId
      });

      // Update comment count
      const post = posts.find(p => p.id === parentId);
      if (post) {
        await supabase.from('community_posts').update({ 
          comment_count: post.comment_count + 1 
        }).eq('id', parentId);

        setPosts(prev => prev.map(p => {
          if (p.id === parentId) {
            return { ...p, comment_count: p.comment_count + 1 };
          }
          return p;
        }));
      }

      setCommentContent('');
      setSelectedPost(null);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Follow user
  const handleFollow = async (targetUserId: string) => {
    if (!user) return;

    try {
      await supabase.from('community_follows').insert({
        follower_id: user.id,
        following_id: targetUserId
      });

      // Update counts
      await Promise.all([
        supabase.from('users').update({ following_count: (user.following_count || 0) + 1 }).eq('id', user.id),
        supabase.rpc('increment_followers', { user_id: targetUserId })
      ]);

      setSuggestedUsers(prev => prev.filter(u => u.id !== targetUserId));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  // Format time ago
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

  // Get initials
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  return (
    <div className="community-container">
      {/* Mobile Header */}
      <header className="mobile-header">
        <Link href="/dashboard" className="back-btn">
          <ChevronLeft size={24} />
        </Link>
        <h1>Community</h1>
        <button className="menu-btn" onClick={() => setShowMobileNav(!showMobileNav)}>
          {showMobileNav ? <X size={24} /> : <MoreHorizontal size={24} />}
        </button>
      </header>

      {/* Left Sidebar */}
      <aside className={`sidebar left-sidebar ${showMobileNav ? 'show' : ''}`}>
        <div className="sidebar-content">
          <Link href="/dashboard" className="logo">
            <img src="/logo-white.svg" alt="FibAlgo" />
          </Link>

          <nav className="nav-menu">
            <Link href="/community" className="nav-item active">
              <Home size={24} />
              <span>Ana Sayfa</span>
            </Link>
            {user && (
              <>
                <Link href={`/community/profile/${user.id}`} className="nav-item">
                  <User size={24} />
                  <span>Profil</span>
                </Link>
                <Link href="/community/notifications" className="nav-item">
                  <Bell size={24} />
                  <span>Bildirimler</span>
                </Link>
                <Link href="/community/bookmarks" className="nav-item">
                  <Bookmark size={24} />
                  <span>Kaydedilenler</span>
                </Link>
              </>
            )}
          </nav>

          {user ? (
            <div className="user-card">
              <div className="avatar">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} />
                ) : (
                  <span>{getInitials(user.full_name)}</span>
                )}
              </div>
              <div className="user-info">
                <span className="name">{user.full_name}</span>
                <span className="email">{user.email}</span>
              </div>
            </div>
          ) : (
            <Link href="/login?redirectTo=/community" className="login-card">
              Giriş Yap
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            Keşfet
          </button>
          {user && (
            <button 
              className={`tab ${activeTab === 'following' ? 'active' : ''}`}
              onClick={() => setActiveTab('following')}
            >
              Takip Edilenler
            </button>
          )}
        </div>

        {/* New Post Composer - only for logged in users */}
        {user ? (
          <div className="composer">
            <div className="composer-avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} />
              ) : (
                <span>{getInitials(user.full_name)}</span>
              )}
            </div>
            <div className="composer-input">
              <textarea
                placeholder="Neler düşünüyorsun?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                maxLength={500}
              />
              <div className="composer-actions">
                <div className="composer-tools">
                  <button className="tool-btn" title="Görsel Ekle">
                    <ImageIcon size={20} />
                  </button>
                </div>
                <div className="composer-right">
                  <span className="char-count">{newPostContent.length}/500</span>
                  <button 
                    className="post-btn"
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim() || posting}
                  >
                    {posting ? <Loader2 size={18} className="spin" /> : 'Paylaş'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="guest-prompt">
            <p>Gönderi paylaşmak için <Link href="/login?redirectTo=/community">giriş yap</Link> veya <Link href="/signup">hesap oluştur</Link>.</p>
          </div>
        )}

        {/* Posts Feed */}
        <div className="posts-feed">
          {loading ? (
            <div className="loading-posts">
              <Loader2 size={32} className="spin" />
              <span>Yükleniyor...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-feed">
              <Users size={48} />
              <h3>Henüz gönderi yok</h3>
              <p>{user ? 'İlk gönderiyi sen paylaş!' : 'Henüz kimse gönderi paylaşmamış.'}</p>
            </div>
          ) : (
            posts.map(post => (
              <article key={post.id} className="post-card">
                <Link href={`/community/profile/${post.user.id}`} className="post-avatar">
                  {post.user.avatar_url ? (
                    <img src={post.user.avatar_url} alt={post.user.full_name} />
                  ) : (
                    <span>{getInitials(post.user.full_name)}</span>
                  )}
                </Link>
                <div className="post-content">
                  <div className="post-header">
                    <Link href={`/community/profile/${post.user.id}`} className="post-author">
                      <span className="author-name">{post.user.full_name}</span>
                      <span className="author-handle">@{post.user.email.split('@')[0]}</span>
                    </Link>
                    <span className="post-time">· {timeAgo(post.created_at)}</span>
                  </div>
                  <p className="post-text">{post.content}</p>
                  {post.image_url && (
                    <div className="post-image">
                      <img src={post.image_url} alt="Post image" />
                    </div>
                  )}
                  <div className="post-actions">
                    <button 
                      className="action-btn comment"
                      onClick={() => setSelectedPost(post)}
                    >
                      <MessageCircle size={18} />
                      <span>{post.comment_count || ''}</span>
                    </button>
                    <button className="action-btn repost">
                      <Repeat2 size={18} />
                      <span>{post.repost_count || ''}</span>
                    </button>
                    <button 
                      className={`action-btn like ${post.liked_by_me ? 'liked' : ''}`}
                      onClick={() => handleLike(post.id, post.liked_by_me || false)}
                    >
                      <Heart size={18} fill={post.liked_by_me ? '#f91880' : 'none'} />
                      <span>{post.like_count || ''}</span>
                    </button>
                    <button 
                      className={`action-btn bookmark ${post.bookmarked_by_me ? 'bookmarked' : ''}`}
                      onClick={() => handleBookmark(post.id, post.bookmarked_by_me || false)}
                    >
                      <Bookmark size={18} fill={post.bookmarked_by_me ? '#00f5ff' : 'none'} />
                    </button>
                    <button className="action-btn share">
                      <Share size={18} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="sidebar right-sidebar">
        {/* Search */}
        <div className="search-box">
          <Search size={18} />
          <input type="text" placeholder="Ara..." />
        </div>

        {/* Trending */}
        <div className="widget trending-widget">
          <h3><TrendingUp size={18} /> Trendler</h3>
          <div className="trend-item">
            <span className="trend-category">Trading</span>
            <span className="trend-topic">#FibAlgo</span>
            <span className="trend-count">1,234 gönderi</span>
          </div>
          <div className="trend-item">
            <span className="trend-category">Finans</span>
            <span className="trend-topic">#Bitcoin</span>
            <span className="trend-count">892 gönderi</span>
          </div>
          <div className="trend-item">
            <span className="trend-category">Yatırım</span>
            <span className="trend-topic">#TeknikAnaliz</span>
            <span className="trend-count">567 gönderi</span>
          </div>
        </div>

        {/* Suggested Users */}
        <div className="widget suggestions-widget">
          <h3><Users size={18} /> Önerilen Kullanıcılar</h3>
          {suggestedUsers.map(suggestedUser => (
            <div key={suggestedUser.id} className="suggested-user">
              <Link href={`/community/profile/${suggestedUser.id}`} className="suggested-avatar">
                {suggestedUser.avatar_url ? (
                  <img src={suggestedUser.avatar_url} alt={suggestedUser.full_name} />
                ) : (
                  <span>{getInitials(suggestedUser.full_name)}</span>
                )}
              </Link>
              <div className="suggested-info">
                <span className="suggested-name">{suggestedUser.full_name}</span>
                <span className="suggested-bio">{suggestedUser.bio || 'FibAlgo Kullanıcısı'}</span>
              </div>
              <button className="follow-btn" onClick={() => handleFollow(suggestedUser.id)}>
                Takip Et
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Comment Modal */}
      {selectedPost && user && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="comment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yanıtla</h3>
              <button onClick={() => setSelectedPost(null)}><X size={24} /></button>
            </div>
            <div className="original-post">
              <div className="post-avatar">
                {selectedPost.user.avatar_url ? (
                  <img src={selectedPost.user.avatar_url} alt={selectedPost.user.full_name} />
                ) : (
                  <span>{getInitials(selectedPost.user.full_name)}</span>
                )}
              </div>
              <div className="post-content">
                <div className="post-header">
                  <span className="author-name">{selectedPost.user.full_name}</span>
                  <span className="author-handle">@{selectedPost.user.email.split('@')[0]}</span>
                </div>
                <p>{selectedPost.content}</p>
              </div>
            </div>
            <div className="reply-composer">
              <div className="composer-avatar">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} />
                ) : (
                  <span>{getInitials(user.full_name)}</span>
                )}
              </div>
              <textarea
                placeholder="Yanıtını yaz..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                maxLength={500}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <span className="char-count">{commentContent.length}/500</span>
              <button 
                className="reply-btn"
                onClick={() => handleComment(selectedPost.id)}
                disabled={!commentContent.trim()}
              >
                <Send size={18} />
                Yanıtla
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .community-container {
          min-height: 100vh;
          background: #0a0a0a;
          display: grid;
          grid-template-columns: 280px 1fr 350px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Mobile Header */
        .mobile-header {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: rgba(10, 10, 10, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #1a1a2e;
          padding: 0 16px;
          align-items: center;
          justify-content: space-between;
          z-index: 100;
        }

        .mobile-header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
        }

        .mobile-header .back-btn,
        .mobile-header .menu-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 8px;
        }

        /* Sidebars */
        .sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          border-right: 1px solid #1a1a2e;
          padding: 20px;
          overflow-y: auto;
        }

        .right-sidebar {
          border-right: none;
          border-left: 1px solid #1a1a2e;
        }

        .sidebar-content {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .logo {
          margin-bottom: 32px;
        }

        .logo img {
          height: 32px;
        }

        .nav-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          border-radius: 30px;
          color: #fff;
          text-decoration: none;
          font-size: 18px;
          transition: all 0.2s;
        }

        .nav-item:hover {
          background: rgba(0, 245, 255, 0.1);
        }

        .nav-item.active {
          font-weight: 600;
          color: #00f5ff;
        }

        .user-card {
          margin-top: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 50px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .user-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .login-card {
          display: block;
          margin-top: auto;
          padding: 14px 24px;
          background: #00f5ff;
          color: #0a0a0a;
          text-align: center;
          border-radius: 30px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }

        .login-card:hover {
          background: #00d4e0;
          transform: scale(1.02);
        }

        .guest-prompt {
          padding: 16px;
          border-bottom: 1px solid #1a1a2e;
          text-align: center;
          background: rgba(0, 245, 255, 0.05);
        }

        .guest-prompt p {
          color: #888;
          margin: 0;
        }

        .guest-prompt a {
          color: #00f5ff;
          text-decoration: none;
          font-weight: 600;
        }

        .guest-prompt a:hover {
          text-decoration: underline;
        }

        .avatar, .composer-avatar, .post-avatar, .suggested-avatar {
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

        .avatar img, .composer-avatar img, .post-avatar img, .suggested-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-info .name {
          font-weight: 600;
          color: #fff;
          font-size: 14px;
        }

        .user-info .email {
          color: #888;
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Main Content */
        .main-content {
          border-left: 1px solid #1a1a2e;
          border-right: 1px solid #1a1a2e;
          min-height: 100vh;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #1a1a2e;
          position: sticky;
          top: 0;
          background: rgba(10, 10, 10, 0.95);
          backdrop-filter: blur(10px);
          z-index: 10;
        }

        .tab {
          flex: 1;
          padding: 16px;
          background: none;
          border: none;
          color: #888;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }

        .tab:hover {
          background: rgba(255, 255, 255, 0.03);
          color: #fff;
        }

        .tab.active {
          color: #fff;
          font-weight: 600;
        }

        .tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 4px;
          background: #00f5ff;
          border-radius: 2px;
        }

        /* Composer */
        .composer {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #1a1a2e;
        }

        .composer-input {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .composer-input textarea {
          background: none;
          border: none;
          color: #fff;
          font-size: 18px;
          resize: none;
          min-height: 80px;
          font-family: inherit;
        }

        .composer-input textarea::placeholder {
          color: #555;
        }

        .composer-input textarea:focus {
          outline: none;
        }

        .composer-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #1a1a2e;
        }

        .composer-tools {
          display: flex;
          gap: 8px;
        }

        .tool-btn {
          background: none;
          border: none;
          color: #00f5ff;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .tool-btn:hover {
          background: rgba(0, 245, 255, 0.1);
        }

        .composer-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .char-count {
          color: #555;
          font-size: 13px;
        }

        .post-btn {
          background: #00f5ff;
          color: #0a0a0a;
          border: none;
          padding: 10px 20px;
          border-radius: 30px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .post-btn:hover:not(:disabled) {
          background: #00d4e0;
          transform: scale(1.02);
        }

        .post-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Posts Feed */
        .posts-feed {
          min-height: 400px;
        }

        .loading-posts, .empty-feed {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px 20px;
          color: #555;
        }

        .empty-feed h3 {
          color: #fff;
          margin: 0;
        }

        .empty-feed p {
          margin: 0;
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

        .author-handle {
          color: #555;
          font-size: 14px;
        }

        .post-time {
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

        .action-btn.like:hover {
          color: #f91880;
          background: rgba(249, 24, 128, 0.1);
        }

        .action-btn.liked {
          color: #f91880;
        }

        .action-btn.bookmarked {
          color: #00f5ff;
        }

        /* Right Sidebar */
        .search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #16161a;
          border-radius: 30px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }

        .search-box input {
          background: none;
          border: none;
          color: #fff;
          font-size: 15px;
          width: 100%;
        }

        .search-box input::placeholder {
          color: #555;
        }

        .search-box input:focus {
          outline: none;
        }

        .search-box svg {
          color: #555;
        }

        .widget {
          background: #16161a;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .widget h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 16px;
        }

        .trend-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 12px 0;
          border-bottom: 1px solid #2a2a3e;
          cursor: pointer;
          transition: background 0.2s;
        }

        .trend-item:last-child {
          border-bottom: none;
        }

        .trend-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .trend-category {
          color: #555;
          font-size: 12px;
        }

        .trend-topic {
          color: #fff;
          font-weight: 600;
          font-size: 15px;
        }

        .trend-count {
          color: #555;
          font-size: 12px;
        }

        .suggested-user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #2a2a3e;
        }

        .suggested-user:last-child {
          border-bottom: none;
        }

        .suggested-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .suggested-name {
          color: #fff;
          font-weight: 600;
          font-size: 14px;
        }

        .suggested-bio {
          color: #555;
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .follow-btn {
          background: #fff;
          color: #0a0a0a;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .follow-btn:hover {
          background: #e0e0e0;
        }

        /* Comment Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 80px 20px;
          z-index: 1000;
        }

        .comment-modal {
          background: #16161a;
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #2a2a3e;
        }

        .modal-header h3 {
          color: #fff;
          margin: 0;
          font-size: 18px;
        }

        .modal-header button {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 8px;
        }

        .original-post {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #2a2a3e;
        }

        .original-post .post-content {
          color: #888;
        }

        .original-post .post-content p {
          margin: 8px 0 0;
          color: #aaa;
        }

        .reply-composer {
          display: flex;
          gap: 12px;
          padding: 16px;
        }

        .reply-composer textarea {
          flex: 1;
          background: none;
          border: none;
          color: #fff;
          font-size: 16px;
          resize: none;
          min-height: 100px;
          font-family: inherit;
        }

        .reply-composer textarea:focus {
          outline: none;
        }

        .modal-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-top: 1px solid #2a2a3e;
        }

        .reply-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #00f5ff;
          color: #0a0a0a;
          border: none;
          padding: 10px 20px;
          border-radius: 30px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reply-btn:hover:not(:disabled) {
          background: #00d4e0;
        }

        .reply-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Animations */
        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Responsive */
        @media (max-width: 1200px) {
          .community-container {
            grid-template-columns: 80px 1fr 300px;
          }

          .nav-item span {
            display: none;
          }

          .nav-item {
            justify-content: center;
            padding: 12px;
          }

          .user-card .user-info {
            display: none;
          }

          .logo img {
            height: 28px;
          }
        }

        @media (max-width: 1024px) {
          .community-container {
            grid-template-columns: 1fr;
          }

          .mobile-header {
            display: flex;
          }

          .left-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 280px;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            z-index: 200;
            background: #0a0a0a;
          }

          .left-sidebar.show {
            transform: translateX(0);
          }

          .right-sidebar {
            display: none;
          }

          .main-content {
            padding-top: 56px;
            border: none;
          }

          .tabs {
            top: 56px;
          }

          .nav-item span {
            display: block;
          }

          .nav-item {
            justify-content: flex-start;
            padding: 12px 16px;
          }

          .user-card .user-info {
            display: flex;
          }
        }

        @media (max-width: 480px) {
          .composer {
            padding: 12px;
          }

          .composer-input textarea {
            font-size: 16px;
            min-height: 60px;
          }

          .post-card {
            padding: 12px;
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
