import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Only allow admin access
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
    }

    // Execute the SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });

    if (error) {
      console.error('SQL execution error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}