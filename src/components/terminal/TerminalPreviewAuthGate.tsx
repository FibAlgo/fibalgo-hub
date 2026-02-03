'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const COOKIE_NAME = 'terminal_preview_started_at';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getPreviewMinutes(): number {
  const raw = process.env.NEXT_PUBLIC_TERMINAL_PREVIEW_MINUTES ?? '10';
  const minutes = Number(raw);
  if (!Number.isFinite(minutes)) return 10;
  return Math.min(Math.max(Math.floor(minutes), 1), 60 * 24);
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (!part) continue;
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = decodeURIComponent(part.slice(0, idx));
    if (key !== name) continue;
    return decodeURIComponent(part.slice(idx + 1));
  }
  return null;
}

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const maxAge = `Max-Age=${COOKIE_MAX_AGE_SECONDS}`;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; ${maxAge}`;
}

function buildRedirectTo(pathname: string, searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams);
  next.delete('authRequired');
  next.delete('redirectTo');
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export default function TerminalPreviewAuthGate({
  user,
}: {
  user: SupabaseUser | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const previewMinutes = useMemo(() => getPreviewMinutes(), []);
  const [expired, setExpired] = useState(false);

  const authRequiredParam = searchParams?.get('authRequired') === '1';
  const redirectToParam = searchParams?.get('redirectTo');

  const redirectTo = useMemo(() => {
    if (redirectToParam) return redirectToParam;
    return buildRedirectTo(pathname, new URLSearchParams(searchParams?.toString() ?? ''));
  }, [pathname, redirectToParam, searchParams]);

  useEffect(() => {
    if (user) {
      setExpired(false);
      return;
    }

    if (authRequiredParam) {
      setExpired(true);
      return;
    }

    const now = Date.now();
    const durationMs = previewMinutes * 60 * 1000;

    const startedAtRaw = getCookie(COOKIE_NAME);
    const startedAt = startedAtRaw ? Number(startedAtRaw) : NaN;

    if (!startedAtRaw || !Number.isFinite(startedAt)) {
      setCookie(COOKIE_NAME, String(now));
      setExpired(false);
      return;
    }

    const expiryAt = startedAt + durationMs;
    if (now >= expiryAt) {
      setExpired(true);
      return;
    }

    const timeout = window.setTimeout(() => setExpired(true), Math.max(0, expiryAt - now));
    return () => window.clearTimeout(timeout);
  }, [authRequiredParam, previewMinutes, user]);

  if (user || !expired) return null;

  const onLogin = () => {
    const url = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
    router.push(url);
  };

  return (
    <>
      <style jsx>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      {/* Overlay */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.55)',
        }}
      >
        {/* Modal */}
        <div
          role="dialog"
          aria-modal="true"
          style={{
            animation: 'modalIn 0.25s ease-out forwards',
            width: '100%',
            maxWidth: '340px',
          }}
        >
          {/* Card */}
          <div
            style={{
              position: 'relative',
              background: 'linear-gradient(180deg, rgba(18, 16, 12, 0.98) 0%, rgba(12, 10, 8, 0.99) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.08)',
              overflow: 'hidden',
            }}
          >
            {/* Top accent line - amber gradient */}
            <div
              style={{
                height: '2px',
                background: 'linear-gradient(90deg, transparent 0%, #F59E0B 50%, transparent 100%)',
              }}
            />

            {/* Glow effect */}
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                left: '50%',
                width: '200px',
                height: '100px',
                background: 'radial-gradient(ellipse, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              }}
            />

            {/* Content */}
            <div style={{ position: 'relative', padding: '28px 24px 24px', textAlign: 'center' }}>
              {/* Logo */}
              <div style={{ marginBottom: '20px' }}>
                <img
                  src="/logo-white.png"
                  alt="FibAlgo"
                  style={{
                    height: '32px',
                    width: 'auto',
                    margin: '0 auto',
                    display: 'block',
                    opacity: 0.95,
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <span
                  style={{
                    display: 'none',
                    fontSize: '22px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#F59E0B',
                  }}
                >
                  FibAlgo
                </span>
              </div>

              {/* Text */}
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: 0,
                }}
              >
                To continue, please log in.
              </p>

              {/* Button */}
              <button
                type="button"
                onClick={onLogin}
                style={{
                  width: '100%',
                  marginTop: '20px',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#F59E0B',
                  color: '#000',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#D97706';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(245, 158, 11, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F59E0B';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.3)';
                }}
              >
                Log in
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
