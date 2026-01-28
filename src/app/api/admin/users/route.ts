import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, getErrorStatus, maskEmail, sanitizeDbError } from '@/lib/api/auth';

// Use service role for admin operations (bypasses RLS)
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

  // Compare by date only (same day => 0, past days => negative)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfExpiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const diffTime = startOfExpiry.getTime() - startOfToday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function mapPlanName(planName: string | null): 'basic' | 'premium' | 'ultimate' | 'lifetime' {
  if (!planName) return 'basic';
  const name = planName.toLowerCase();
  if (name.includes('lifetime')) return 'lifetime';
  if (name.includes('ultimate') || name.includes('pro')) return 'ultimate';
  if (name.includes('premium') || name.includes('hub')) return 'premium';
  return 'basic';
}

async function resolveAvatarUrl(rawUrl: string | null | undefined): Promise<string | null> {
  if (!rawUrl) return null;

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

  const { data } = await supabaseAdmin.storage
    .from('avatars')
    .createSignedUrl(path, 3600);

  return data?.signedUrl || rawUrl;
}

export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session (not header)
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    console.log(`[Admin Users] Access by admin: ${maskEmail(user.email)}`);

    // Get auth users to check account type (Google/Normal) and email verified status
    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
    const authUsers = authUsersData?.users || [];
    
    // Create a map of auth user info by ID
    const authUserMap = new Map<string, { provider: string; emailVerified: boolean }>();
    authUsers.forEach((authUser) => {
      const provider = authUser.app_metadata?.provider || 
                      (authUser.app_metadata?.providers?.includes('google') ? 'google' : 'email');
      const emailVerified = !!authUser.email_confirmed_at;
      authUserMap.set(authUser.id, { provider, emailVerified });
    });

    // Get users with their subscriptions and billing history
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        full_name,
        avatar_url,
        role,
        trading_view_id,
        telegram_id,
        created_at,
        updated_at,
        subscriptions (
          id,
          plan_id,
          plan,
          status,
          start_date,
          end_date,
          started_at,
          expires_at,
          days_remaining,
          is_active,
          created_at,
          updated_at
        ),
        billing_history (
          id,
          invoice_id,
          amount,
          currency,
          plan_description,
          payment_method,
          status,
          added_by,
          created_at
        ),
        cancellation_requests!cancellation_requests_user_id_fkey (
          id,
          reason,
          status,
          request_date,
          processed_date,
          processed_by,
          admin_note,
          created_at
        )
      `)
      .order('updated_at', { foreignTable: 'subscriptions', ascending: false })
      .order('created_at', { foreignTable: 'subscriptions', ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: sanitizeDbError(error, 'fetch-users') }, { status: 500 });
    }

    // Show ALL users (not just those with subscriptions)
    // This includes Google OAuth users and manually registered users with verified emails
    const allUsers = users || [];

    // Transform data to match frontend format
    const transformedUsers = await Promise.all(allUsers.map(async (user: any) => {
      // Handle both array and object subscription responses from Supabase
      const subscriptions = user.subscriptions;
      const subscription = Array.isArray(subscriptions) 
        ? subscriptions[0] 
        : subscriptions; // Could be single object or null
      
      const planName = subscription?.plan_id || subscription?.plan || 'Basic';
      const computedDaysRemaining = calculateDaysRemaining(subscription?.expires_at || subscription?.end_date || null, planName);
      const daysRemaining = typeof subscription?.days_remaining === 'number' && subscription.days_remaining >= 0
        ? subscription.days_remaining
        : computedDaysRemaining;

      // Handle both array and object responses for billing_history and cancellation_requests
      const billingHistory = Array.isArray(user.billing_history) 
        ? user.billing_history 
        : (user.billing_history ? [user.billing_history] : []);
      
      const cancellationRequests = Array.isArray(user.cancellation_requests) 
        ? user.cancellation_requests 
        : (user.cancellation_requests ? [user.cancellation_requests] : []);

      const pendingCancellation = cancellationRequests.find((c: any) => c.status === 'pending');

      // Get auth info for account type
      const authInfo = authUserMap.get(user.id);
      const accountType = authInfo?.provider === 'google' ? 'google' : 'email';
      const emailVerified = authInfo?.emailVerified ?? false;

      return {
        id: user.id,
        email: user.email,
        name: user.full_name || user.name || 'User',
        profilePicture: await resolveAvatarUrl(user.avatar_url || null),
        role: user.role === 'super_admin' ? 'admin' : user.role,
        createdAt: user.created_at?.split('T')[0] || '',
        tradingViewId: user.trading_view_id || undefined,
        telegramId: user.telegram_id || undefined,
        accountType: accountType, // 'google' or 'email'
        emailVerified: emailVerified, // true if email is verified
        subscription: {
          plan: subscription ? mapPlanName(planName) : 'basic',
          startDate: (subscription?.started_at || subscription?.start_date || user.created_at)?.split('T')[0] || '',
          endDate: (subscription?.expires_at || subscription?.end_date)?.split('T')[0] || '',
          daysRemaining: subscription ? daysRemaining : -1,
          isActive: subscription ? subscription?.is_active === true : false,
          status: subscription ? (subscription?.status === 'suspended' ? 'expired' : (subscription?.status || 'active')) : 'none',
        },
        billingHistory: billingHistory.map((b: any) => {
          const paymentMethod = (b.payment_method || '').toString().toLowerCase();
          const isCard = paymentMethod === 'credit_card' || paymentMethod === 'card' || paymentMethod === 'polar' || paymentMethod === 'credit card';
          const normalizedStatus = b.status === 'completed' ? 'paid' : b.status;
          return ({
          id: b.invoice_id || b.id,
          date: b.created_at?.split('T')[0] || '',
          amount: `${b.currency === 'EUR' ? '€' : '$'}${(b.amount || 0).toFixed(2)}`,
          plan: b.plan_description || '',
          status: normalizedStatus === 'paid' ? 'paid' : normalizedStatus,
          paymentMethod: isCard ? 'credit_card' : 'crypto',
          addedBy: b.added_by || 'System',
          });
        }),
        cancellationRequest: pendingCancellation 
          ? {
              id: pendingCancellation.id,
              requestDate: pendingCancellation.request_date?.split('T')[0] || '',
              reason: pendingCancellation.reason,
              status: 'pending',
            }
          : undefined,
      };
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
