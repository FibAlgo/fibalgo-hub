'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { 
  ChevronLeft,
  Calendar,
  MapPin,
  LinkIcon,
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  Bookmark,
  MoreHorizontal,
  Settings,
  Loader2,
  Users,
  Edit3,
  X,
  Camera
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  location?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  like_count: number;
  comment_count: number;
  repost_count: number;
  created_at: string;
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
}

export default function ProfilePage() {
  const params = useParams();
  const profileId = params.id as string;
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'likes'>('posts');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations('community');

  const isOwnProfile = currentUser?.id === profileId;

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userData) {
        setCurrentUser(userData);
      }
    };

    fetchCurrentUser();
  }, [router, supabase]);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      
      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error || !profileData) {
        router.push('/community');
        return;
      }

      setProfile(profileData);
      setEditBio(profileData.bio || '');
      setEditLocation(profileData.location || '');
      setEditWebsite(profileData.website || '');
      setLoading(false);
    };

    if (profileId) {
      fetchProfile();
    }
  }, [profileId, router, supabase]);

  // Check if following
  useEffect(() => {
    const checkFollowing = async () => {
      if (!currentUser || !profileId || currentUser.id === profileId) return;

      const { data } = await supabase
        .from('community_follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profileId)
        .single();

      setIsFollowing(!!data);
    };

    checkFollowing();
  }, [currentUser, profileId, supabase]);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    if (!profileId || !currentUser) return;

    let query = supabase
      .from('community_posts')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false });

    if (activeTab === 'posts') {
      query = query.is('parent_id', null);
    } else if (activeTab === 'replies') {
      query = query.not('parent_id', 'is', null);
    }

    const { data: postsData } = await query;

    if (postsData && postsData.length > 0) {
      const postIds = postsData.map(p => p.id);
      
      const [likesResult, bookmarksResult] = await Promise.all([
        supabase.from('community_likes').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds),
        supabase.from('community_bookmarks').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds)
      ]);

      const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
      const bookmarkedPostIds = new Set(bookmarksResult.data?.map(b => b.post_id) || []);

      const enrichedPosts = postsData.map(post => ({
        ...post,
        liked_by_me: likedPostIds.has(post.id),
        bookmarked_by_me: bookmarkedPostIds.has(post.id)
      }));

      setPosts(enrichedPosts);
    } else {
      setPosts([]);
    }
  }, [profileId, activeTab, currentUser, supabase]);

  useEffect(() => {
    if (profile && currentUser) {
      fetchPosts();
    }
  }, [profile, currentUser, activeTab, fetchPosts]);

  // Toggle follow
  const handleFollow = async () => {
    if (!currentUser || !profileId) return;

    try {
      if (isFollowing) {
        await supabase
          .from('community_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileId);

        setProfile(prev => prev ? { ...prev, followers_count: Math.max(0, prev.followers_count - 1) } : null);
      } else {
        await supabase.from('community_follows').insert({
          follower_id: currentUser.id,
          following_id: profileId
        });

        setProfile(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : null);
      }

      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      await supabase
        .from('users')
        .update({
          bio: editBio.trim() || null,
          location: editLocation.trim() || null,
          website: editWebsite.trim() || null
        })
        .eq('id', currentUser.id);

      setProfile(prev => prev ? {
        ...prev,
        bio: editBio.trim() || undefined,
        location: editLocation.trim() || undefined,
        website: editWebsite.trim() || undefined
      } : null);

      setShowEditModal(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  // Like post
  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUser) return;

    try {
      if (isLiked) {
        await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      } else {
        await supabase.from('community_likes').insert({ post_id: postId, user_id: currentUser.id });
      }

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const newCount = isLiked ? post.like_count - 1 : post.like_count + 1;
          supabase.from('community_posts').update({ like_count: newCount }).eq('id', postId);
          return { ...post, liked_by_me: !isLiked, like_count: newCount };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Bookmark post
  const handleBookmark = async (postId: string, isBookmarked: boolean) => {
    if (!currentUser) return;

    try {
      if (isBookmarked) {
        await supabase.from('community_bookmarks').delete().eq('post_id', postId).eq('user_id', currentUser.id);
      } else {
        await supabase.from('community_bookmarks').insert({ post_id: postId, user_id: currentUser.id });
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

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Time ago
  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  // Get initials
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (loading || !profile) {
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
    <div className="profile-container">
      {/* Header */}
      <header className="profile-header">
        <Link href="/community" className="back-btn">
          <ChevronLeft size={24} />
        </Link>
        <div className="header-info">
          <h1>{profile.full_name}</h1>
          <span>{t('profilePosts', { count: profile.posts_count || 0 })}</span>
        </div>
        {isOwnProfile && (
          <button className="settings-btn">
            <Settings size={20} />
          </button>
        )}
      </header>

      {/* Cover & Avatar */}
      <div className="cover-section">
        <div className="cover-image"></div>
        <div className="avatar-wrapper">
          <div className="avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} />
            ) : (
              <span>{getInitials(profile.full_name)}</span>
            )}
          </div>
          {isOwnProfile && (
            <button className="edit-avatar-btn">
              <Camera size={16} />
            </button>
          )}
        </div>
        <div className="action-buttons">
          {isOwnProfile ? (
            <button className="edit-profile-btn" onClick={() => setShowEditModal(true)}>
              <Edit3 size={16} />
              {t('editProfile')}
            </button>
          ) : (
            <button 
              className={`follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={handleFollow}
            >
              {isFollowing ? t('unfollowBtn') : t('followBtnAction')}
            </button>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="profile-info">
        <h2 className="display-name">{profile.full_name}</h2>
        <span className="handle">@{profile.email.split('@')[0]}</span>
        
        {profile.bio && <p className="bio">{profile.bio}</p>}
        
        <div className="meta-info">
          {profile.location && (
            <span className="meta-item">
              <MapPin size={16} />
              {profile.location}
            </span>
          )}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="meta-item link">
              <LinkIcon size={16} />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          <span className="meta-item">
            <Calendar size={16} />
            {t('joinedDate', { date: formatDate(profile.created_at) })}
          </span>
        </div>

        <div className="follow-stats">
          <Link href={`/community/profile/${profile.id}/following`} className="stat">
            <strong>{profile.following_count || 0}</strong>
            <span>{t('followingCount')}</span>
          </Link>
          <Link href={`/community/profile/${profile.id}/followers`} className="stat">
            <strong>{profile.followers_count || 0}</strong>
            <span>{t('followersCount')}</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          {t('tabPosts')}
        </button>
        <button 
          className={`tab ${activeTab === 'replies' ? 'active' : ''}`}
          onClick={() => setActiveTab('replies')}
        >
          {t('tabReplies')}
        </button>
        <button 
          className={`tab ${activeTab === 'likes' ? 'active' : ''}`}
          onClick={() => setActiveTab('likes')}
        >
          {t('tabLikes')}
        </button>
      </div>

      {/* Posts */}
      <div className="posts-list">
        {posts.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>{t('noProfilePosts')}</h3>
            <p>{isOwnProfile ? t('ownNoPostsHint') : t('otherNoPostsHint')}</p>
          </div>
        ) : (
          posts.map(post => (
            <article key={post.id} className="post-card">
              <div className="post-avatar">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} />
                ) : (
                  <span>{getInitials(profile.full_name)}</span>
                )}
              </div>
              <div className="post-content">
                <div className="post-header">
                  <span className="author-name">{profile.full_name}</span>
                  <span className="author-handle">@{profile.email.split('@')[0]}</span>
                  <span className="post-time">· {timeAgo(post.created_at)}</span>
                </div>
                <p className="post-text">{post.content}</p>
                {post.image_url && (
                  <div className="post-image">
                    <img src={post.image_url} alt="Post image" />
                  </div>
                )}
                <div className="post-actions">
                  <button className="action-btn">
                    <MessageCircle size={18} />
                    <span>{post.comment_count || ''}</span>
                  </button>
                  <button className="action-btn">
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
                    className={`action-btn ${post.bookmarked_by_me ? 'bookmarked' : ''}`}
                    onClick={() => handleBookmark(post.id, post.bookmarked_by_me || false)}
                  >
                    <Bookmark size={18} fill={post.bookmarked_by_me ? '#00f5ff' : 'none'} />
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

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <button onClick={() => setShowEditModal(false)}><X size={24} /></button>
              <h3>{t('editProfileTitle')}</h3>
              <button 
                className="save-btn" 
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? <Loader2 size={18} className="spin" /> : t('saveBtn')}
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{t('bioLabel')}</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder={t('bioPlaceholder')}
                  maxLength={160}
                />
                <span className="char-count">{editBio.length}/160</span>
              </div>
              <div className="form-group">
                <label>{t('locationLabel')}</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder={t('locationPlaceholder')}
                />
              </div>
              <div className="form-group">
                <label>{t('websiteLabel')}</label>
                <input
                  type="url"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .profile-container {
          min-height: 100vh;
          background: #0a0a0a;
          max-width: 600px;
          margin: 0 auto;
          border-left: 1px solid #1a1a2e;
          border-right: 1px solid #1a1a2e;
        }

        .profile-header {
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

        .header-info {
          flex: 1;
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

        .settings-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 8px;
        }

        .cover-section {
          position: relative;
        }

        .cover-image {
          height: 200px;
          background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%);
        }

        .avatar-wrapper {
          position: absolute;
          left: 16px;
          bottom: -50px;
        }

        .avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00f5ff, #0080ff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 40px;
          color: #0a0a0a;
          border: 4px solid #0a0a0a;
          overflow: hidden;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .edit-avatar-btn {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: #0a0a0a;
          border: none;
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-buttons {
          position: absolute;
          right: 16px;
          bottom: -40px;
        }

        .edit-profile-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid #333;
          color: #fff;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit-profile-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .follow-btn {
          background: #fff;
          border: none;
          color: #0a0a0a;
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .follow-btn:hover {
          background: #e0e0e0;
        }

        .follow-btn.following {
          background: transparent;
          border: 1px solid #333;
          color: #fff;
        }

        .follow-btn.following:hover {
          border-color: #f91880;
          color: #f91880;
        }

        .profile-info {
          padding: 60px 16px 16px;
        }

        .display-name {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .handle {
          color: #555;
          font-size: 15px;
        }

        .bio {
          color: #e0e0e0;
          margin: 12px 0;
          line-height: 1.4;
        }

        .meta-info {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin: 12px 0;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #555;
          font-size: 14px;
        }

        .meta-item.link {
          color: #00f5ff;
          text-decoration: none;
        }

        .meta-item.link:hover {
          text-decoration: underline;
        }

        .follow-stats {
          display: flex;
          gap: 20px;
          margin-top: 12px;
        }

        .stat {
          display: flex;
          gap: 4px;
          color: #888;
          text-decoration: none;
          font-size: 14px;
        }

        .stat:hover {
          text-decoration: underline;
        }

        .stat strong {
          color: #fff;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #1a1a2e;
        }

        .tab {
          flex: 1;
          padding: 16px;
          background: none;
          border: none;
          color: #555;
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

        .posts-list {
          min-height: 300px;
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
          text-align: center;
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

        .author-name {
          color: #fff;
          font-weight: 600;
          font-size: 15px;
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

        /* Edit Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 60px 20px;
          z-index: 1000;
        }

        .edit-modal {
          background: #16161a;
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          border-bottom: 1px solid #2a2a3e;
        }

        .modal-header button {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 8px;
        }

        .modal-header h3 {
          flex: 1;
          color: #fff;
          margin: 0;
          font-size: 18px;
        }

        .save-btn {
          background: #fff !important;
          color: #0a0a0a !important;
          padding: 8px 16px !important;
          border-radius: 20px !important;
          font-weight: 600 !important;
        }

        .save-btn:disabled {
          opacity: 0.5;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 20px;
          position: relative;
        }

        .form-group label {
          display: block;
          color: #888;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          background: #0a0a0a;
          border: 1px solid #333;
          border-radius: 8px;
          color: #fff;
          padding: 12px;
          font-size: 15px;
          font-family: inherit;
        }

        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #00f5ff;
        }

        .char-count {
          position: absolute;
          right: 12px;
          bottom: 12px;
          color: #555;
          font-size: 12px;
        }

        /* Animations */
        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .profile-container {
            border: none;
          }

          .cover-image {
            height: 150px;
          }

          .avatar {
            width: 80px;
            height: 80px;
            font-size: 28px;
          }

          .avatar-wrapper {
            bottom: -40px;
          }

          .profile-info {
            padding-top: 50px;
          }

          .meta-info {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
