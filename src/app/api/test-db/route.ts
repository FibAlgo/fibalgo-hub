import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    // Simple test - just try to select from users table
    const { data, error } = await supabaseAdmin.from('users').select('*').limit(1);

    return NextResponse.json({
      success: !error,
      error: error?.message,
      data: data || []
    });
  } catch (err) {
    return NextResponse.json({ error: 'Exception occurred', details: String(err) }, { status: 500 });
  }
}