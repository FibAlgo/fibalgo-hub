'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// localStorage key – stores the number of milliseconds the guest has actively
// spent on any /terminal/* page.  The timer is paused whenever the tab is hidden
// or the user navigates away from the terminal.
const ELAPSED_KEY = 'terminal_preview_elapsed_ms';
// We also keep the cookie so the middleware can do a server-side check.
const COOKIE_NAME = 'terminal_preview_started_at';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getPreviewMinutes(): number {
  const raw = process.env.NEXT_PUBLIC_TERMINAL_PREVIEW_MINUTES ?? '2';
  const minutes = Number(raw);
  if (!Number.isFinite(minutes)) return 2;
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

/** Read accumulated elapsed ms from localStorage (0 if not set). */
function getElapsedMs(): number {
  try {
    const raw = localStorage.getItem(ELAPSED_KEY);
    if (!raw) return 0;
    const val = Number(raw);
    return Number.isFinite(val) && val >= 0 ? val : 0;
  } catch {
    return 0;
  }
}

/** Persist accumulated elapsed ms to localStorage. */
function setElapsedMs(ms: number) {
  try {
    localStorage.setItem(ELAPSED_KEY, String(Math.floor(ms)));
  } catch {
    // storage full or blocked
  }
}

/**
 * Sync the cookie so that the edge middleware can also enforce the limit.
 * We fake a "started_at" that, combined with elapsed time, looks like the
 * preview started `elapsed` ms ago from *now*.
 */
function syncCookieFromElapsed(elapsedMs: number) {
  const fakeStartedAt = Date.now() - elapsedMs;
  setCookie(COOKIE_NAME, String(fakeStartedAt));
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
  const t = useTranslations('terminal');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const previewMinutes = useMemo(() => getPreviewMinutes(), []);
  const durationMs = previewMinutes * 60 * 1000;

  const [expired, setExpired] = useState(false);

  const authRequiredParam = searchParams?.get('authRequired') === '1';
  const redirectToParam = searchParams?.get('redirectTo');

  const redirectTo = useMemo(() => {
    if (redirectToParam) return redirectToParam;
    return buildRedirectTo(pathname, new URLSearchParams(searchParams?.toString() ?? ''));
  }, [pathname, redirectToParam, searchParams]);

  // ---- Active-time tracking refs ----
  // When the current "active segment" started (Date.now()).  null = paused.
  const segmentStartRef = useRef<number | null>(null);
  // Accumulated ms from previous segments (loaded from localStorage).
  const accumulatedRef = useRef<number>(0);
  // Interval handle for the countdown tick.
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Flush current segment into accumulated total and persist. */
  const flush = useCallback(() => {
    if (segmentStartRef.current !== null) {
      const delta = Date.now() - segmentStartRef.current;
      accumulatedRef.current += delta;
      segmentStartRef.current = null;
    }
    setElapsedMs(accumulatedRef.current);
    syncCookieFromElapsed(accumulatedRef.current);
  }, []);

  /** Start / resume the active timer. */
  const resume = useCallback(() => {
    if (segmentStartRef.current !== null) return; // already running
    segmentStartRef.current = Date.now();
  }, []);

  /** Pause the active timer and persist. */
  const pause = useCallback(() => {
    flush();
  }, [flush]);

  /** Get total elapsed including the current running segment. */
  const getTotalElapsed = useCallback(() => {
    let total = accumulatedRef.current;
    if (segmentStartRef.current !== null) {
      total += Date.now() - segmentStartRef.current;
    }
    return total;
  }, []);

  useEffect(() => {
    // Logged-in users don't need a timer
    if (user) {
      setExpired(false);
      return;
    }

    if (authRequiredParam) {
      setExpired(true);
      return;
    }

    // Load persisted elapsed time
    accumulatedRef.current = getElapsedMs();

    // Already expired?
    if (accumulatedRef.current >= durationMs) {
      setExpired(true);
      syncCookieFromElapsed(accumulatedRef.current);
      return;
    }

    // Start counting
    resume();

    // Tick every second to check if expired
    tickRef.current = setInterval(() => {
      const total = getTotalElapsed();
      if (total >= durationMs) {
        flush();
        setExpired(true);
        if (tickRef.current) clearInterval(tickRef.current);
      }
    }, 1000);

    // Pause on visibility hidden (tab switch, minimize)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pause();
      } else if (document.visibilityState === 'visible') {
        // Check if expired while away
        if (accumulatedRef.current >= durationMs) {
          setExpired(true);
        } else {
          resume();
        }
      }
    };

    // Flush before unload (close tab, navigate away)
    const onBeforeUnload = () => {
      flush();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      // Cleanup: pause & persist when component unmounts (navigate away from /terminal)
      pause();
      if (tickRef.current) clearInterval(tickRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [authRequiredParam, durationMs, user, flush, pause, resume, getTotalElapsed]);

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
                {t('continueLogIn')}
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
                {t('logIn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
