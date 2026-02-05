import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return cookieStore.get(name)?.value;
          },
          async set() {},
          async remove() {},
        },
      }
    );
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Handle any auth error (including invalid refresh token)
    if (error) {
      console.log('Auth check - no valid session:', error.message);
      return NextResponse.json({ user: null });
    }
    
    if (!user) {
      return NextResponse.json({ user: null });
    }
    
    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
      }
    });
    
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ user: null });
  }
}
