import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { getMaintenanceStateCached } from '@/lib/maintenance/edge';

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

  const state = await getMaintenanceStateCached();
  const maintenanceActive = state?.active === true;

  if (maintenanceActive) {
    if (pathname === '/maintenance') return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/maintenance';
    return NextResponse.redirect(url);
  }

  if (!maintenanceActive && pathname === '/maintenance') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const { response } = await updateSession(request);
    return response;
  }

  if (pathname.startsWith('/terminal')) {
    const { response, user } = await updateSession(request, {
      protectedPaths: ['/dashboard', '/admin'],
    });

    if (user) return response;

    const previewMinutes = getTerminalPreviewMinutes();
    const durationMs = previewMinutes * 60 * 1000;
    const now = Date.now();
    const authRequired = request.nextUrl.searchParams.get('authRequired') === '1';

    const startedAtRaw = request.cookies.get(TERMINAL_PREVIEW_COOKIE)?.value;
    const startedAt = startedAtRaw ? Number(startedAtRaw) : NaN;

    // No cookie yet — first visit.  Let the client-side component handle
    // elapsed-time tracking.  Just allow through.
    if (!startedAtRaw || !Number.isFinite(startedAt)) {
      return response;
    }

    // The cookie stores a "fake" startedAt = Date.now() - elapsedMs,
    // so (now - startedAt) ≈ total elapsed active time on terminal.
    const isExpired = now - startedAt > durationMs;
    if (isExpired && !authRequired) {
      const url = request.nextUrl.clone();
      const redirectTo = request.nextUrl.pathname + request.nextUrl.search;

      url.pathname = '/terminal';
      url.searchParams.set('authRequired', '1');
      url.searchParams.set('redirectTo', redirectTo);

      const redirectResponse = NextResponse.redirect(url);
      copyResponseCookies(response, redirectResponse);
      return redirectResponse;
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
