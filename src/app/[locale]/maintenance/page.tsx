'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type Health = {
  maintenance: boolean;
  updatedAt: number | null;
  reason: string | null;
};

export default function MaintenancePage() {
  const t = useTranslations('maintenance');
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(false);

  const updatedAtText = useMemo(() => {
    if (!health?.updatedAt) return null;
    try {
      return new Date(health.updatedAt).toLocaleString();
    } catch {
      return null;
    }
  }, [health?.updatedAt]);

  async function check() {
    setChecking(true);
    try {
      const res = await fetch('/api/health/maintenance', { cache: 'no-store' });
      const json = (await res.json()) as Health;
      setHealth(json);
      if (json.maintenance === false) {
        window.location.href = '/';
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    check();
    const id = window.setInterval(check, 10_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1000px 600px at 20% 20%, rgba(0,245,255,0.12), transparent 60%), radial-gradient(900px 500px at 80% 30%, rgba(191,0,255,0.10), transparent 60%), linear-gradient(180deg, var(--bg-darker) 0%, var(--bg-dark) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.03)',
          boxShadow: '0 0 0 1px rgba(0,245,255,0.12), 0 0 28px rgba(0,245,255,0.10)',
          padding: '22px 18px',
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(0,245,255,0.35), rgba(191,0,255,0.25))',
              boxShadow: '0 0 24px rgba(0,245,255,0.22)',
              flex: '0 0 auto',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '1.35rem', lineHeight: 1.25, marginBottom: 6 }}>
              {t('title')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {t('description')}
            </p>

            <div
              style={{
                marginTop: 14,
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.20)',
                padding: '12px 12px',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('statusLabel')}</div>
                  <div style={{ fontSize: '0.95rem' }}>
                    {health?.maintenance === false ? t('online') : t('maintenanceStatus')}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('lastCheck')}</div>
                  <div style={{ fontSize: '0.95rem' }}>{updatedAtText || '—'}</div>
                </div>
              </div>
              {health?.reason ? (
                <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', wordBreak: 'break-word' }}>
                  {health.reason}
                </div>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              <button
                onClick={check}
                disabled={checking}
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'linear-gradient(135deg, rgba(0,245,255,0.18), rgba(191,0,255,0.12))',
                  color: 'white',
                  cursor: checking ? 'not-allowed' : 'pointer',
                }}
              >
                {checking ? t('checking') : t('tryAgain')}
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                {t('refreshPage')}
              </button>
            </div>

            <p style={{ marginTop: 14, fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>
              {t('autoCheck')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
