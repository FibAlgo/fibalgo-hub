'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface BlogDraft {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  status: string;
  target_keyword: string | null;
  word_count: number;
  ai_model: string | null;
  created_at: string;
  published_at: string | null;
}

export default function BlogAdminPage() {
  const [drafts, setDrafts] = useState<BlogDraft[]>([]);
  const [published, setPublished] = useState<BlogDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'drafts' | 'published'>('drafts');
  const [token, setToken] = useState<string | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchPosts = useCallback(async (accessToken: string) => {
    try {
      const [draftsRes, publishedRes] = await Promise.all([
        fetch('/api/admin/blog?status=draft', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch('/api/admin/blog?status=published', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      const draftsData = await draftsRes.json();
      const publishedData = await publishedRes.json();

      setDrafts(draftsData.posts || []);
      setPublished(publishedData.posts || []);
    } catch {
      showMessage('error', 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setToken(session.access_token);
        fetchPosts(session.access_token);
      } else {
        setLoading(false);
        showMessage('error', 'Not logged in or not admin');
      }
    };
    init();
  }, [fetchPosts]);

  const apiAction = async (action: string, slug?: string) => {
    if (!token) return;
    setActionLoading(slug || action);
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, slug }),
      });
      const data = await res.json();
      if (data.success || data.published) {
        showMessage('success', `${action} successful!`);
        fetchPosts(token);
      } else {
        showMessage('error', data.error || 'Action failed');
      }
    } catch {
      showMessage('error', 'Network error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b0f', color: '#fff' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0f', color: '#fff', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>🤖 AI Blog Manager</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0.25rem 0 0' }}>
              {drafts.length} drafts · {published.length} published
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => apiAction('generate')}
              disabled={actionLoading === 'generate'}
              style={{
                padding: '0.6rem 1.25rem',
                background: 'linear-gradient(135deg, #00F5FF, #00C4CC)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                opacity: actionLoading === 'generate' ? 0.5 : 1,
              }}
            >
              {actionLoading === 'generate' ? '⏳ Generating...' : '✨ Generate New Post'}
            </button>
            <button
              onClick={() => apiAction('publish-all')}
              disabled={actionLoading === 'publish-all' || drafts.length === 0}
              style={{
                padding: '0.6rem 1.25rem',
                background: 'rgba(34,197,94,0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                opacity: (actionLoading === 'publish-all' || drafts.length === 0) ? 0.5 : 1,
              }}
            >
              {actionLoading === 'publish-all' ? '⏳ Publishing...' : `🚀 Publish All (${drafts.length})`}
            </button>
            <button
              onClick={() => apiAction('seed-keywords')}
              disabled={actionLoading === 'seed-keywords'}
              style={{
                padding: '0.6rem 1.25rem',
                background: 'rgba(139,92,246,0.15)',
                color: '#8b5cf6',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                opacity: actionLoading === 'seed-keywords' ? 0.5 : 1,
              }}
            >
              🌱 Seed Keywords
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              background: message.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: message.type === 'success' ? '#22c55e' : '#ef4444',
              fontSize: '0.9rem',
            }}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
          {(['drafts', 'published'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1.25rem',
                background: activeTab === tab ? 'rgba(0,245,255,0.12)' : 'transparent',
                color: activeTab === tab ? '#00F5FF' : 'rgba(255,255,255,0.5)',
                border: activeTab === tab ? '1px solid rgba(0,245,255,0.3)' : '1px solid transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {tab} ({tab === 'drafts' ? drafts.length : published.length})
            </button>
          ))}
        </div>

        {/* Posts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(activeTab === 'drafts' ? drafts : published).map(post => (
            <div
              key={post.id}
              style={{
                background: 'rgba(18,21,28,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: post.status === 'draft' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                        color: post.status === 'draft' ? '#eab308' : '#22c55e',
                        border: `1px solid ${post.status === 'draft' ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
                      }}
                    >
                      {post.status}
                    </span>
                    {post.target_keyword && (
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 600, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' }}>
                        🎯 {post.target_keyword}
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                      {post.word_count} words · {post.ai_model || 'static'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: '0 0 0.35rem', lineHeight: 1.3 }}>
                    {post.title}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                    {post.description}
                  </p>

                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {post.tags?.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          background: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255,255,255,0.4)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {post.status === 'draft' && (
                    <>
                      <button
                        onClick={() => apiAction('publish', post.slug)}
                        disabled={actionLoading === post.slug}
                        style={{
                          padding: '0.45rem 1rem',
                          background: 'rgba(34,197,94,0.15)',
                          color: '#22c55e',
                          border: '1px solid rgba(34,197,94,0.3)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          opacity: actionLoading === post.slug ? 0.5 : 1,
                        }}
                      >
                        ✅ Publish
                      </button>
                      <button
                        onClick={() => apiAction('delete', post.slug)}
                        disabled={actionLoading === post.slug}
                        style={{
                          padding: '0.45rem 1rem',
                          background: 'rgba(239,68,68,0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          opacity: actionLoading === post.slug ? 0.5 : 1,
                        }}
                      >
                        🗑 Delete
                      </button>
                    </>
                  )}
                  {post.status === 'published' && (
                    <a
                      href={`/education/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '0.45rem 1rem',
                        background: 'rgba(0,245,255,0.1)',
                        color: '#00F5FF',
                        border: '1px solid rgba(0,245,255,0.2)',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      👁 View
                    </a>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
                Created: {new Date(post.created_at).toLocaleString()}
                {post.published_at && ` · Published: ${new Date(post.published_at).toLocaleString()}`}
              </div>
            </div>
          ))}

          {(activeTab === 'drafts' ? drafts : published).length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>
                {activeTab === 'drafts' ? '📝' : '📚'}
              </p>
              <p>No {activeTab} posts yet</p>
              {activeTab === 'drafts' && (
                <button
                  onClick={() => apiAction('generate')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.6rem 1.5rem',
                    background: 'linear-gradient(135deg, #00F5FF, #00C4CC)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✨ Generate First Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
