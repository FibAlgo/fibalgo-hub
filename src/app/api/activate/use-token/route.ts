import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }
    
    // Get user from session
    const cookieStore = await cookies();
    const supabaseAuthToken = cookieStore.get('sb-access-token')?.value;
    
    // Create authenticated client to get user
    const { createServerClient } = await import('@supabase/ssr');
    const supabaseAuth = createServerClient(
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
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Please login to activate your plan' },
        { status: 401 }
      );
    }
    
    // Find the token
    const { data: tokenData, error: tokenError } = await supabase
      .from('purchase_tokens')
      .select('*')
      .eq('token', token)
      .single();
    
    if (tokenError || !tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid activation code' },
        { status: 400 }
      );
    }
    
    // Check if already used
    if (tokenData.used) {
      return NextResponse.json(
        { success: false, error: 'This activation code has already been used' },
        { status: 400 }
      );
    }
    
    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This activation code has expired' },
        { status: 400 }
      );
    }
    
    // Check if user already has an active subscription
    const { data: existingUser } = await supabase
      .from('users')
      .select('subscription_type, subscription_status, subscription_end')
      .eq('id', user.id)
      .single();
    
    if (existingUser?.subscription_status === 'active' && 
        existingUser?.subscription_end && 
        new Date(existingUser.subscription_end) > new Date()) {
      // User already has active subscription - extend it
      console.log('User already has active subscription, extending...');
    }
    
    // Mark token as used
    const { error: updateTokenError } = await supabase
      .from('purchase_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString(),
        used_by_user_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.id);
    
    if (updateTokenError) {
      console.error('Failed to mark token as used:', updateTokenError);
      return NextResponse.json(
        { success: false, error: 'Failed to activate plan' },
        { status: 500 }
      );
    }
    
    // Calculate subscription dates - both plans get 30 days
    const now = new Date();
    const subscriptionEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    // Update user's subscription in profiles table
    const { error: updateUserError } = await supabase
      .from('profiles')
      .update({
        is_premium: true,
        subscription_status: 'active',
        subscription_product_id: tokenData.plan, // 'premium' or 'ultimate'
        subscription_started_at: now.toISOString(),
        subscription_expires_at: subscriptionEnd.toISOString(),
      })
      .eq('id', user.id);
    
    if (updateUserError) {
      console.error('Failed to update user subscription:', updateUserError);
      // Try to rollback token
      await supabase
        .from('purchase_tokens')
        .update({ used: false, used_at: null, used_by_user_id: null })
        .eq('id', tokenData.id);
        
      return NextResponse.json(
        { success: false, error: 'Failed to activate subscription' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Plan activated successfully!',
      plan: tokenData.plan,
      expiresAt: subscriptionEnd.toISOString()
    });
    
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
