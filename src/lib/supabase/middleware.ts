import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

// Admin client for ban checks
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function updateSession(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes - require authentication
  const protectedPaths = ['/dashboard', '/admin', '/terminal'];
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
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    // Redirect URL'i kaydet (login sonrası geri dönmek için)
    const redirectTo = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.searchParams.set('redirectTo', redirectTo);
    return NextResponse.redirect(url);
  }

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  // If user is logged in, check if they are banned (any page)
  if (user) {
    try {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('is_banned')
        .eq('id', user.id)
        .single();

      if (userData?.is_banned === true) {
        // User is banned - sign them out globally and redirect to login
        try {
          await supabaseAdmin.auth.admin.signOut(user.id, 'global');
        } catch (signOutError) {
          console.error('Failed to sign out banned user:', signOutError);
        }
        
        // Clear all supabase cookies
        if (isLoginPage && request.nextUrl.searchParams.get('banned')) {
          return supabaseResponse;
        }

        const response = NextResponse.redirect(new URL('/login?banned=true', request.url));
        
        // Clear auth cookies
        request.cookies.getAll().forEach(cookie => {
          if (cookie.name.startsWith('sb-')) {
            response.cookies.delete(cookie.name);
          }
        });
        
        return response;
      }
    } catch (error) {
      console.error('Ban check error:', error);
    }
  }

  return supabaseResponse;
}
