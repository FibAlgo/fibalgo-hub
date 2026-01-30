import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' });
  }

  // Update pending to cancelled
  await supabaseAdmin
    .from('cancellation_requests')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('status', 'pending');

  // Update approved to cancelled
  await supabaseAdmin
    .from('cancellation_requests')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('status', 'approved');

  // Get current state
  const { data } = await supabaseAdmin
    .from('cancellation_requests')
    .select('id, status')
    .eq('user_id', userId);

  return NextResponse.json({ success: true, data });
}
