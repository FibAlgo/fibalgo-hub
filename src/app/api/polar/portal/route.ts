/**
 * Polar Customer Portal Route
 * 
 * Redirects authenticated users to their Polar customer portal
 * where they can manage subscriptions, view orders, etc.
 * 
 * Usage: GET /api/polar/portal?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOwnershipOrAdmin, getErrorStatus } from '@/lib/api/auth';

// Runtime configuration to avoid build-time errors
function getConfig() {
  const mode = process.env.POLAR_MODE || 'sandbox';
  return {
    accessToken: process.env.POLAR_ACCESS_TOKEN || '',
    mode: mode as 'sandbox' | 'production',
    apiUrl: mode === 'sandbox' 
      ? 'https://sandbox-api.polar.sh/v1'
      : 'https://api.polar.sh/v1',
  };
}

export async function GET(request: NextRequest) {
  const config = getConfig();
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 🔒 SECURITY: Verify user can only access their own portal
    const { user: authUser, error: authError } = await requireOwnershipOrAdmin(userId);
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }
    
    // Get Polar customer ID from our database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('polar_customer_id')
      .eq('id', userId)
      .single();
    
    if (error || !user?.polar_customer_id) {
      return NextResponse.json(
        { error: 'No Polar customer found for this user' }, 
        { status: 404 }
      );
    }

    // Create customer portal session via Polar API
    const response = await fetch(`${config.apiUrl}/customer-portal/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: user.polar_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Polar portal error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create portal session' }, 
        { status: 500 }
      );
    }

    const session = await response.json();
    
    // Redirect to the portal URL
    return NextResponse.redirect(session.url);

  } catch (error) {
    console.error('Portal API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
