import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { getMaintenanceStateCached } from '@/lib/maintenance/edge';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const protectedPrefixes = ['/dashboard', '/admin'];

const TERMINAL_PREVIEW_COOKIE = 'terminal_preview_started_at';
const TERMINAL_PREVIEW_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getTerminalPreviewMinutes(): number {
  const raw =
    process.env.NEXT_PUBLIC_TERMINAL_PREVIEW_MINUTES ??
    process.env.TERMINAL_PREVIEW_MINUTES ??
    '10';
  const minutes = Number(raw);
  if (!Number.isFinite(minutes)) return 10;
  return Math.min(Math.max(Math.floor(minutes), 1), 60 * 24);
}

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  try {
    from.cookies.getAll().forEach((c) => {
      to.cookies.set(c);
    });
  } catch {
    // ignore
  }
}

/**
 * Strip locale prefix from pathname for logic checks.
 * e.g. /tr/dashboard → /dashboard, /dashboard → /dashboard
 */
const localePattern = /^\/(en|tr|es|de|fr|it|pt|nl|pl|ru|uk|ar|ja|ko|zh|hi|th|vi|id|ms|sv|da|fi|no|cs|ro|hu|el|he|bn)(\/|$)/;

function stripLocale(pathname: string): string {
  const match = pathname.match(localePattern);
  if (!match) return pathname;
  const stripped = pathname.replace(localePattern, '/');
  return stripped === '' ? '/' : stripped;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // IndexNow key verification file — rewrite to API route
  if (pathname === '/c811ab2aabd446b5aa6293efccaf0f14.txt') {
    return NextResponse.rewrite(new URL('/api/indexnow-key', request.url));
  }

  const cleanPath = stripLocale(pathname);

  // ──────────────────────────────────────────────
  // 1. Maintenance mode (before everything else)
  // ──────────────────────────────────────────────
  const state = await getMaintenanceStateCached();
  const maintenanceActive = state?.active === true;

  if (maintenanceActive) {
    if (cleanPath === '/maintenance') return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/maintenance';
    return NextResponse.redirect(url);
  }

  if (!maintenanceActive && cleanPath === '/maintenance') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ──────────────────────────────────────────────
  // 2. Protected routes (/dashboard, /admin)
  //    Run intlMiddleware first so locale rewrite/redirect is applied,
  //    then layer auth on top while preserving the rewrite.
  // ──────────────────────────────────────────────
  const isProtected = protectedPrefixes.some((p) => cleanPath.startsWith(p));
  if (isProtected) {
    // Run intlMiddleware first — handles locale redirect/rewrite
    const intlResponse = intlMiddleware(request);

    // If intlMiddleware wants to redirect (e.g. /tr prefix for non-default locale),
    // return that redirect immediately — auth will run on the next request.
    if (intlResponse.headers.get('location')) {
      return intlResponse;
    }

    // intlMiddleware did a rewrite (for default locale with localePrefix: 'as-needed')
    // or the URL already had a locale prefix.
    // Now run auth check. We need to check auth but KEEP the intlResponse 
    // (which has the correct rewrite headers).
    const { response: authResponse, user } = await updateSession(request);

    // If auth wants to redirect (e.g. to login page), return that redirect
    // but copy intl cookies onto it.
    if (authResponse.headers.get('location')) {
      copyResponseCookies(intlResponse, authResponse);
      return authResponse;
    }

    // Auth passed — use intlResponse (has correct rewrite) and copy auth cookies onto it
    copyResponseCookies(authResponse, intlResponse);
    return intlResponse;
  }

  // ──────────────────────────────────────────────
  // 3. Terminal routes (preview logic + auth)
  // ──────────────────────────────────────────────
  if (cleanPath.startsWith('/terminal')) {
    const { user } = await updateSession(request, {
      protectedPaths: ['/dashboard', '/admin'],
    });

    // Logged-in user — let intlMiddleware handle locale routing
    if (user) return intlMiddleware(request);

    const previewMinutes = getTerminalPreviewMinutes();
    const durationMs = previewMinutes * 60 * 1000;
    const now = Date.now();
    const authRequired = request.nextUrl.searchParams.get('authRequired') === '1';

    const startedAtRaw = request.cookies.get(TERMINAL_PREVIEW_COOKIE)?.value;
    const startedAt = startedAtRaw ? Number(startedAtRaw) : NaN;

    // No cookie yet — first visit.  Let the client-side component handle
    // elapsed-time tracking.  Just allow through with locale routing.
    if (!startedAtRaw || !Number.isFinite(startedAt)) {
      return intlMiddleware(request);
    }

    // The cookie stores a "fake" startedAt = Date.now() - elapsedMs,
    // so (now - startedAt) ≈ total elapsed active time on terminal.
    const isExpired = now - startedAt > durationMs;
    if (isExpired && !authRequired) {
      const localeMatch = pathname.match(localePattern);
      const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
      const url = request.nextUrl.clone();
      const redirectTo = request.nextUrl.pathname + request.nextUrl.search;

      url.pathname = `${localePrefix}/terminal`;
      url.searchParams.set('authRequired', '1');
      url.searchParams.set('redirectTo', redirectTo);

      return NextResponse.redirect(url);
    }

    return intlMiddleware(request);
  }

  // ──────────────────────────────────────────────
  // 4. All other routes — just i18n middleware
  // ──────────────────────────────────────────────
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw-notifications.js|images|icon-|apple-touch-icon|opengraph-image|.*\\.png$|.*\\.ico$|.*\\.svg$|.*\\.webp$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.woff2?$|.*\\.js$).*)'],
};
