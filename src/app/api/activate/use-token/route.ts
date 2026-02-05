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
    const days = 30;
    
    console.log('Updating subscription for user:', user.id);
    console.log('Plan:', tokenData.plan, 'Days:', days);
    
    // Check if user already has a subscription
    const { data: existingSub, error: existingSubError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    
    console.log('Existing subscription:', existingSub, 'Error:', existingSubError);
    
    let subscriptionResult;
    
    // Plan name mapping for display
    const planDisplayName = tokenData.plan === 'ultimate' ? 'Ultimate Plan' : 'Premium Plan';
    
    if (existingSub) {
      // Update existing subscription
      subscriptionResult = await supabase
        .from('subscriptions')
        .update({
          plan: tokenData.plan,
          plan_id: tokenData.plan,
          plan_name: planDisplayName,
          status: 'active',
          start_date: now.toISOString().split('T')[0],
          end_date: subscriptionEnd.toISOString().split('T')[0],
          started_at: now.toISOString(),
          expires_at: subscriptionEnd.toISOString(),
          days_remaining: days,
          is_active: true,
          updated_at: now.toISOString(),
        })
        .eq('id', existingSub.id)
        .select();
    } else {
      // Insert new subscription
      subscriptionResult = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: tokenData.plan,
          plan_id: tokenData.plan,
          plan_name: planDisplayName,
          status: 'active',
          start_date: now.toISOString().split('T')[0],
          end_date: subscriptionEnd.toISOString().split('T')[0],
          started_at: now.toISOString(),
          expires_at: subscriptionEnd.toISOString(),
          days_remaining: days,
          is_active: true,
        })
        .select();
    }
    
    console.log('Subscription result - data:', subscriptionResult.data);
    console.log('Subscription result - error:', subscriptionResult.error);
    
    if (subscriptionResult.error) {
      console.error('Failed to update subscription:', subscriptionResult.error);
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
    
    // Also add billing history (subscription_id is the new subscription)
    const subscriptionId = subscriptionResult.data?.[0]?.id;
    const priceMap: Record<string, number> = { premium: 29.99, ultimate: 49.99 };
    const price = priceMap[tokenData.plan] || 0;
    
    await supabase
      .from('billing_history')
      .insert({
        user_id: user.id,
        subscription_id: subscriptionId,
        invoice_id: `INV-${Date.now()}`,
        invoice_number: `COPE-${Date.now()}`,
        amount: price,
        currency: 'EUR',
        description: `${planDisplayName} - ${days} days`,
        plan_description: `${planDisplayName} - ${days} days (CopeCart)`,
        payment_method: 'copecart',
        status: 'completed',
      });
    
    console.log('Successfully updated subscription for user:', user.id);
    
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
