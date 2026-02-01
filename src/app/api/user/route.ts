import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getErrorStatus } from '@/lib/api/auth';

// Use service role for operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Helper functions
function calculateDaysRemaining(expiresAt: string | null, planName: string): number {
  if (!expiresAt) return -1;
  if (planName?.toLowerCase() === 'basic') return -1;
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function mapPlanName(planName: string | null): 'basic' | 'premium' | 'ultimate' | 'lifetime' {
  if (!planName) return 'basic';
  const name = planName.toLowerCase();
  if (name.includes('lifetime')) return 'lifetime';
  if (name.includes('ultimate') || name.includes('pro')) return 'ultimate';
  if (name.includes('premium') || name.includes('hub')) return 'premium';
  return 'basic';
}

function formatPlanLabel(plan: 'basic' | 'premium' | 'ultimate' | 'lifetime'): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function extractInvoiceUrl(order: any): string | null {
  return (
    order?.invoice?.download_url ||
    order?.invoice?.file_url ||
    order?.invoice?.pdf_url ||
    order?.invoice?.document_url ||
    order?.invoice?.hosted_invoice_url ||
    order?.invoice?.url ||
    order?.latest_invoice?.download_url ||
    order?.latest_invoice?.file_url ||
    order?.latest_invoice?.pdf_url ||
    order?.latest_invoice?.document_url ||
    order?.latest_invoice?.hosted_invoice_url ||
    order?.latest_invoice?.url ||
    null
  );
}

function resolveOrderAmount(order: any): number {
  const candidates = [
    order?.total_amount,
    order?.amount,
    order?.net_amount,
    order?.subtotal_amount,
    order?.product_price?.price_amount,
    order?.price?.price_amount,
  ];

  for (const candidate of candidates) {
    const value = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return 0;
}

function extractAvatarFromAuthUser(authUser: any): string | null {
  if (!authUser) return null;
  const identity = authUser.identities?.find((i: any) => i.provider === 'google') || authUser.identities?.[0];
  const identityData = identity?.identity_data || {};
  return (
    authUser.user_metadata?.avatar_url ||
    authUser.user_metadata?.picture ||
    identityData.avatar_url ||
    identityData.picture ||
    null
  );
}

async function resolveAvatarUrl(rawUrl: string | null | undefined, supabaseAdminClient: any): Promise<string | null> {
  if (!rawUrl) return null;

  // External OAuth avatars should remain as-is
  if (rawUrl.startsWith('http') && !rawUrl.includes('/storage/v1/object/public/avatars/')) {
    return rawUrl;
  }

  let path = rawUrl;
  if (rawUrl.startsWith('http')) {
    const marker = '/storage/v1/object/public/avatars/';
    if (!rawUrl.includes(marker)) return rawUrl;
    path = rawUrl.split(marker)[1]?.split('?')[0] || rawUrl;
  }

  if (!path || !path.startsWith('avatars/')) {
    return rawUrl;
  }

  const { data } = await supabaseAdminClient.storage
    .from('avatars')
    .createSignedUrl(path, 3600);

  return data?.signedUrl || rawUrl;
}

// GET - Get user data by ID
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify user is authenticated
    const { user: authUser, error: authError } = await requireAuth();
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('email');
    const refresh = searchParams.get('refresh') === '1';

    if (!userId && !userEmail) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    // 🔒 SECURITY: Users can only access their own data (admins can access any)
    const isAdmin = authUser.role === 'admin' || authUser.role === 'super_admin';
    const requestedEmail = userEmail || null;
    
    if (!isAdmin) {
      // Non-admin: only own userId or own email
      if (userId && userId !== authUser.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (requestedEmail && requestedEmail.toLowerCase() !== authUser.email?.toLowerCase()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get user - try by EMAIL first (more reliable due to OAuth/email signup ID mismatch)
    let user = null;
    let userError = null;

    // First try by email (most reliable)
    if (userEmail) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .ilike('email', userEmail)
        .single();
      user = data;
      userError = error;
    }

    // If not found by email, try by ID
    if (!user && userId) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      user = data;
      userError = error;
    }

    // If still not found by ID, try to match by email from auth
    if (!user && userId) {
      // Get auth user to find email
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser?.user?.email) {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .ilike('email', authUser.user.email)
          .single();
        user = data;
        userError = error;
        
        // If found, update the user ID to match auth
        if (user && user.id !== userId) {
          const oldUserId = user.id;
          await supabaseAdmin
            .from('users')
            .update({ id: userId })
            .eq('email', user.email);
          
          // Re-link related records to the auth user ID
          await Promise.all([
            supabaseAdmin.from('subscriptions').update({ user_id: userId }).eq('user_id', oldUserId),
            supabaseAdmin.from('billing_history').update({ user_id: userId }).eq('user_id', oldUserId),
            supabaseAdmin.from('refund_requests').update({ user_id: userId }).eq('user_id', oldUserId),
            supabaseAdmin.from('cancellation_requests').update({ user_id: userId }).eq('user_id', oldUserId),
            supabaseAdmin.from('tradingview_downgrades').update({ user_id: userId }).eq('user_id', oldUserId),
            supabaseAdmin.from('polar_payments').update({ user_id: userId }).eq('user_id', oldUserId),
          ]);
          
          user.id = userId;
        }
      }
    }

    if (userError || !user) {
      // Attempt to backfill from auth user for OAuth logins
      if (userId) {
        const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
        const authUser = authUserData?.user;
        if (authUser?.email) {
          const { error: upsertError } = await supabaseAdmin
            .from('users')
            .upsert({ id: authUser.id, email: authUser.email }, { onConflict: 'id' });
          if (!upsertError) {
            const { data: refetchUser, error: refetchError } = await supabaseAdmin
              .from('users')
              .select('*')
              .eq('id', authUser.id)
              .single();
            if (!refetchError && refetchUser) {
              user = refetchUser;
              userError = null;
            }
          }
        }
      }

      if (userError || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // If avatar is missing, pull from OAuth metadata and persist
    if (!user.avatar_url && userId) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const oauthAvatar = extractAvatarFromAuthUser(authUser?.user);
      if (oauthAvatar) {
        const updatedAt = new Date().toISOString();
        let avatarUpdated = false;

        const { error: avatarUpdateError } = await supabaseAdmin
          .from('users')
          .update({ avatar_url: oauthAvatar, updated_at: updatedAt })
          .eq('id', user.id);

        if (!avatarUpdateError) {
          avatarUpdated = true;
        } else if (user.email) {
          const { error: avatarUpdateByEmailError } = await supabaseAdmin
            .from('users')
            .update({ avatar_url: oauthAvatar, updated_at: updatedAt })
            .eq('email', user.email);
          avatarUpdated = !avatarUpdateByEmailError;
        }

        if (avatarUpdated) {
          user.avatar_url = oauthAvatar;
          user.updated_at = updatedAt;
        } else {
          // Fallback for UI even if DB update fails
          user.avatar_url = oauthAvatar;
        }
      }
    }

    // Get subscription - try by user_id first, then by the found user's id
    const searchUserId = userId || user.id;
    let { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', searchUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Optional refresh: sync with Polar to reduce delay after checkout
    if (refresh && user?.email) {
      const polarMode = (process.env.POLAR_MODE || 'sandbox').trim();
      const polarApiUrl = polarMode === 'sandbox'
        ? 'https://sandbox-api.polar.sh/v1'
        : 'https://api.polar.sh/v1';

      const accessToken = (process.env.POLAR_ACCESS_TOKEN || '').trim();

      if (accessToken) {
        try {
          const response = await fetch(
            `${polarApiUrl}/subscriptions/?customer_email=${encodeURIComponent(user.email)}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const activeSub = data.items?.find(
              (sub: any) => sub.status === 'active' || sub.status === 'trialing'
            );

            if (activeSub) {
              const productName = activeSub.product?.name || 'basic';
              const plan = mapPlanName(productName);
              const endDate = activeSub.current_period_end ? new Date(activeSub.current_period_end) : null;

              await supabaseAdmin
                .from('subscriptions')
                .upsert({
                  user_id: searchUserId,
                  plan,
                  status: 'active',
                  start_date: activeSub.started_at || new Date().toISOString().split('T')[0],
                  end_date: endDate ? endDate.toISOString().split('T')[0] : null,
                  is_active: true,
                  polar_subscription_id: activeSub.id,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

              // Refresh local subscription object
              const { data: refreshedSub } = await supabaseAdmin
                .from('subscriptions')
                .select('*')
                .eq('user_id', searchUserId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              subscription = refreshedSub || subscription;
            }
          }

          // Billing history is handled by webhook (order.paid event)
          // TradingView upgrades are also handled by webhook
        } catch (error) {
          console.error('Polar refresh error:', error);
        }
      }
    }

    // NO automatic status changes here!
    // Admin will manually handle expired subscriptions from the admin panel

    // Use the resolved user ID for all queries
    const resolvedUserId = user.id;

    // Get billing history
    const { data: billingHistory } = await supabaseAdmin
      .from('billing_history')
      .select('*')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false });

    const rawBillingHistory = billingHistory || [];
    const refundOrderIds = new Set(
      rawBillingHistory
        .filter((b: any) => b.status === 'refunded' && b.polar_order_id)
        .map((b: any) => b.polar_order_id)
    );

    const seenKeys = new Set<string>();
    const normalizedBillingHistory = rawBillingHistory.filter((b: any) => {
      if (b.polar_order_id && refundOrderIds.has(b.polar_order_id)) {
        if (b.status === 'paid' || b.status === 'completed') {
          return false;
        }
      }

      const key = `${b.polar_order_id || b.id}:${b.status}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Get pending OR approved cancellation request
    const { data: cancellationRequest } = await supabaseAdmin
      .from('cancellation_requests')
      .select('*')
      .eq('user_id', resolvedUserId)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get pending OR approved refund request
    const { data: refundRequest } = await supabaseAdmin
      .from('refund_requests')
      .select('*')
      .eq('user_id', resolvedUserId)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get all pending refund requests for billing history items
    const { data: pendingRefundRequests } = await supabaseAdmin
      .from('refund_requests')
      .select('billing_history_id, status')
      .eq('user_id', resolvedUserId)
      .eq('status', 'pending');
    
    // Create a Set of billing_history_ids that have pending refunds
    const pendingRefundBillingIds = new Set(
      (pendingRefundRequests || []).map((r: any) => r.billing_history_id)
    );

    // Use correct column names from database (plan_id is new, plan is legacy)
    const planName = subscription?.plan_id || subscription?.plan || 'Basic';
    const expiresAt = subscription?.expires_at || subscription?.end_date || null;
    const startedAt = subscription?.started_at || subscription?.start_date || null;
    const daysRemaining = calculateDaysRemaining(expiresAt, planName);
    const normalizedPlan = mapPlanName(planName);
    // Basic plan = unlimited (-1), otherwise use calculated days
    const normalizedDaysRemaining = normalizedPlan === 'basic' ? -1 : daysRemaining;
    const normalizedStatus = normalizedPlan === 'basic'
      ? 'active'
      : (subscription?.status === 'suspended' ? 'expired' : (subscription?.status || 'active'));
    const normalizedIsActive = normalizedPlan === 'basic' ? true : subscription?.status === 'active';

    // Calculate when user can change name again
    const fullNameLastChanged = (user as any).full_name_last_changed;
    let nameChangeAvailableIn = 0;
    if (fullNameLastChanged) {
      const lastChanged = new Date(fullNameLastChanged);
      const daysSinceChange = Math.floor((Date.now() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceChange < 7) {
        nameChangeAvailableIn = 7 - daysSinceChange;
      }
    }

    const transformedUser = {
      id: user.id,
      email: user.email,
      name: (user as any).full_name || (user as any).name || 'User',
      role: user.role === 'super_admin' ? 'admin' : (user.role || 'user'),
      createdAt: user.created_at?.split('T')[0] || '',
      tradingViewId: (user as any).trading_view_id || undefined,
      avatarUrl: await resolveAvatarUrl((user as any).avatar_url || null, supabaseAdmin),
      updatedAt: user.updated_at || undefined,
      nameChangeAvailableIn, // Days until name can be changed (0 = can change now)
      subscription: {
        plan: normalizedPlan,
        startDate: (startedAt || user.created_at)?.split('T')[0] || '',
        // Basic plan = no end date (unlimited)
        endDate: normalizedPlan === 'basic' ? '' : (expiresAt?.split('T')[0] || ''),
        daysRemaining: normalizedDaysRemaining,
        isActive: normalizedIsActive,
        status: normalizedStatus,
        autoRenew: normalizedPlan === 'basic' ? false : (subscription?.is_active ?? true),
        willExpire: normalizedPlan === 'basic' ? false : subscription?.is_active === false, // Abonelik yenilenmeyecek
      },
      billingHistory: normalizedBillingHistory.map((b: any) => {
        const planDescription = b.plan_description || '';
        const isRefunded = b.status === 'refunded';
        const paymentMethod = (b.payment_method || '').toString().toLowerCase();
        const isCard = paymentMethod === 'credit_card' || paymentMethod === 'card' || paymentMethod === 'polar' || paymentMethod === 'credit card';
        const normalizedStatus = b.status === 'completed' ? 'paid' : b.status;
        // Always show original amount - important for historical records
        // For refunded items, we show the amount that was refunded
        const amountStr = `${b.currency === 'EUR' ? '€' : '$'}${(b.amount || 0).toFixed(2)}`;
        return {
          id: b.id, // Real UUID for refund requests
          displayId: b.invoice_id || b.id, // Display ID for UI
          date: b.created_at?.split('T')[0] || '',
          amount: isRefunded ? `${amountStr} (Refunded)` : amountStr,
          plan: planDescription,
          status: normalizedStatus, // 'paid', 'refunded', etc.
          paymentMethod: isCard ? 'credit_card' : 'crypto',
          addedBy: 'System',
          polarOrderId: b.polar_order_id,
          invoiceUrl: b.invoice_url,
          billingReason: b.billing_reason || null,
          hasPendingRefund: pendingRefundBillingIds.has(b.id), // Check if this invoice has pending refund
        };
      }),
      cancellationRequest: cancellationRequest && mapPlanName(planName) !== 'basic' ? {
        id: cancellationRequest.id,
        requestDate: cancellationRequest.created_at?.split('T')[0] || '',
        reason: cancellationRequest.reason,
        status: cancellationRequest.status, // 'pending' or 'approved'
      } : undefined,
      refundRequest: refundRequest ? {
        id: refundRequest.id,
        requestDate: refundRequest.created_at?.split('T')[0] || '',
        reason: refundRequest.reason,
        status: refundRequest.status, // 'pending' or 'approved'
      } : undefined,
    };

    return NextResponse.json(transformedUser);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
