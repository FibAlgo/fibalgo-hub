import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const AUTH_TIMEOUT_MS = 1200;

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

  // Protected routes - require authentication
  const protectedPaths = options.protectedPaths ?? ['/dashboard', '/admin', '/terminal'];
  const isProtectedRoute = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // Auth routes - redirect logged-in users away
  const authPaths = ['/login', '/signup', '/forgot-password'];
  const isAuthRoute = authPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
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
    // Redirect URL'i kaydet (login sonrası geri dönmek için)
    const redirectTo = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.searchParams.set('redirectTo', redirectTo);
    return { response: NextResponse.redirect(url), user: null };
  }

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  // Note: Ban checks via service-role + DB queries should not run in Edge middleware.
  // They can cause timeouts and require privileged credentials. Handle bans in server routes instead.

  return { response: supabaseResponse, user };
}
