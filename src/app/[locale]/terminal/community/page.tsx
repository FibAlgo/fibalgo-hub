'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CommunityPage() {
  const t = useTranslations('community');
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          color: '#fff',
          fontSize: '1.5rem',
          fontWeight: 700,
          margin: 0
        }}>
          {t('title')}
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.875rem',
          margin: '0.25rem 0 0 0'
        }}>
          {t('subtitle')}
        </p>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Feed Area */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.5)'
          }}>
            <Users size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>{t('emptyTitle')}</h2>
            <p>{t('emptyText')}</p>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside style={{
          width: '350px',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          {/* Search */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '9999px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input 
              type="text"
              placeholder={t('searchPlaceholder')}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.9rem',
                width: '100%'
              }}
            />
          </div>

          {/* Trending Topics */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '1rem',
            padding: '1rem'
          }}>
            <h3 style={{
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: 700,
              marginBottom: '1rem'
            }}>
              🔥 {t('trending')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['#Bitcoin', '#Altcoin', t('hashTechnicalAnalysis'), '#FibAlgo'].map((tag, i) => (
                <div key={tag} style={{
                  padding: '0.5rem 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer'
                }}>
                  <div style={{ color: '#00F5FF', fontWeight: 600 }}>{tag}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                    {[1234, 892, 567, 345][i]} {t('posts')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Who to Follow */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '1rem',
            padding: '1rem'
          }}>
            <h3 style={{
              color: '#fff',
              fontSize: '1.2rem',
              fontWeight: 700,
              marginBottom: '1rem'
            }}>
              👥 {t('suggestedUsers')}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
              {t('comingSoon')}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
