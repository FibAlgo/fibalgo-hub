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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Strip locale prefix for internal logic checks
  const localePattern = /^\/(en|tr|es|de|fr|it|pt|nl|pl|ru|uk|ar|ja|ko|zh|hi|th|vi|id|ms|sv|da|fi|no|cs|ro|hu|el|he|bn)(\/|$)/;
  const localeMatch = pathname.match(localePattern);
  const pathnameWithoutLocale = localeMatch
    ? pathname.replace(localePattern, '/')
    : pathname;
  const cleanPath = pathnameWithoutLocale === '' ? '/' : pathnameWithoutLocale;

  const state = await getMaintenanceStateCached();
  const maintenanceActive = state?.active === true;

  if (maintenanceActive) {
    if (cleanPath === '/maintenance') return intlMiddleware(request);
    const url = request.nextUrl.clone();
    url.pathname = '/maintenance';
    return NextResponse.redirect(url);
  }

  if (!maintenanceActive && cleanPath === '/maintenance') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // --- Auth checks (before intl, because they may redirect) ---

  const isProtected = protectedPrefixes.some((p) => cleanPath.startsWith(p));
  if (isProtected) {
    const { response, user } = await updateSession(request);
    // If updateSession redirected (not logged in → /login), follow that redirect
    if (response.redirected || response.headers.get('location')) {
      return response;
    }
    // User is authenticated — let intl middleware handle locale routing
    const intlResponse = intlMiddleware(request);
    copyResponseCookies(response, intlResponse);
    return intlResponse;
  }

  if (cleanPath.startsWith('/terminal')) {
    const { response, user } = await updateSession(request, {
      protectedPaths: ['/dashboard', '/admin'],
    });

    // If updateSession redirected, follow that
    if (response.redirected || response.headers.get('location')) {
      return response;
    }

    if (user) {
      // Logged-in user — let intl middleware handle locale, copy auth cookies
      const intlResponse = intlMiddleware(request);
      copyResponseCookies(response, intlResponse);
      return intlResponse;
    }

    const previewMinutes = getTerminalPreviewMinutes();
    const durationMs = previewMinutes * 60 * 1000;
    const now = Date.now();
    const authRequired = request.nextUrl.searchParams.get('authRequired') === '1';

    const startedAtRaw = request.cookies.get(TERMINAL_PREVIEW_COOKIE)?.value;
    const startedAt = startedAtRaw ? Number(startedAtRaw) : NaN;

    // Preview expired — redirect to terminal auth gate
    if (startedAtRaw && Number.isFinite(startedAt)) {
      const isExpired = now - startedAt > durationMs;
      if (isExpired && !authRequired) {
        const url = request.nextUrl.clone();
        const redirectTo = request.nextUrl.pathname + request.nextUrl.search;
        const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
        url.pathname = `${localePrefix}/terminal`;
        url.searchParams.set('authRequired', '1');
        url.searchParams.set('redirectTo', redirectTo);

        const redirectResponse = NextResponse.redirect(url);
        copyResponseCookies(response, redirectResponse);
        return redirectResponse;
      }
    }

    // Preview still active or first visit — let intl middleware handle locale
    const intlResponse = intlMiddleware(request);
    copyResponseCookies(response, intlResponse);
    return intlResponse;
  }

  // For all other routes, apply i18n middleware (locale detection & routing)
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw-notifications.js|images|icon-|apple-touch-icon|opengraph-image|.*\\.png$|.*\\.ico$|.*\\.svg$|.*\\.webp$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.woff2?$|.*\\.js$).*)'],
};
