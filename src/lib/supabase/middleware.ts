import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const AUTH_TIMEOUT_MS = 1200;

/** Strip locale prefix for path matching. e.g. /tr/dashboard → /dashboard */
const localePattern = /^\/(en|tr|es|de|fr|it|pt|nl|pl|ru|uk|ar|ja|ko|zh|hi|th|vi|id|ms|sv|da|fi|no|cs|ro|hu|el|he|bn)(\/|$)/;
function stripLocale(pathname: string): string {
  const match = pathname.match(localePattern);
  if (!match) return pathname;
  const stripped = pathname.replace(localePattern, '/');
  return stripped === '' ? '/' : stripped;
}

export type UpdateSessionOptions = {
  protectedPaths?: string[];
};

export async function updateSession(request: NextRequest, options: UpdateSessionOptions = {}) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Middleware runs on the Edge and has strict execution limits.
  // If Supabase is slow/unreachable, don't block the whole site.
  let user: any = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('auth_timeout')), AUTH_TIMEOUT_MS)),
    ]);
    user = (result as any)?.data?.user ?? null;
  } catch {
    user = null;
  }

  // Use locale-stripped pathname for route matching
  const cleanPath = stripLocale(request.nextUrl.pathname);

  // Protected routes - require authentication
  const protectedPaths = options.protectedPaths ?? ['/dashboard', '/admin', '/terminal'];
  const isProtectedRoute = protectedPaths.some(path => 
    cleanPath.startsWith(path)
  );

  // Auth routes - redirect logged-in users away
  const authPaths = ['/login', '/signup', '/forgot-password'];
  const isAuthRoute = authPaths.some(path => 
    cleanPath === path || cleanPath.startsWith(path + '/')
  );

  // If user is logged in and trying to access auth pages, redirect to dashboard
  if (user && isAuthRoute) {
    // Don't redirect if banned parameter is set (they were just banned)
    if (!request.nextUrl.searchParams.get('banned')) {
      return { response: NextResponse.redirect(new URL('/dashboard', request.url)), user };
    }
  }

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    // Save redirect URL (login sonrası geri dönmek için)
    const redirectTo = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.searchParams.set('redirectTo', redirectTo);
    return { response: NextResponse.redirect(url), user: null };
  }

  return { response: supabaseResponse, user };
}
