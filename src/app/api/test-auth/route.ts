import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    console.log('Testing auth user creation...');

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123',
      email_confirm: false,
      user_metadata: {
        full_name: 'Test User',
      },
    });

    console.log('Auth creation result:', { success: !!data, error });

    return NextResponse.json({
      success: !error,
      error: error?.message,
      user: data?.user ? { id: data.user.id, email: data.user.email } : null
    });
  } catch (err) {
    console.error('Exception:', err);
    return NextResponse.json({ error: 'Exception occurred', details: String(err) }, { status: 500 });
  }
}