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
  const normalizedPlan = planName?.toLowerCase() || '';
  if (normalizedPlan === 'basic' || normalizedPlan === 'lifetime') return -1;

  const now = new Date();
  const expiry = new Date(expiresAt);

  // Compare by date only in UTC to avoid TZ drift
  const utcToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcExpiry = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());
  const diffTime = utcExpiry - utcToday;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
        admin_note,
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
      const daysRemaining = calculateDaysRemaining(subscription?.expires_at || subscription?.end_date || null, planName);

      // Handle both array and object responses for billing_history and cancellation_requests
      const billingHistoryRaw = Array.isArray(user.billing_history) 
        ? user.billing_history 
        : (user.billing_history ? [user.billing_history] : []);

      const refundOrderIds = new Set(
        billingHistoryRaw
          .filter((b: any) => b.status === 'refunded' && b.polar_order_id)
          .map((b: any) => b.polar_order_id)
      );

      const seenKeys = new Set<string>();
      const billingHistory = billingHistoryRaw.filter((b: any) => {
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
        adminNote: user.admin_note || '',
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

// POST - Admin creates (invites) a new user
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session (not header)
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const fullName = String(body?.fullName || '').trim();
    const tradingViewId = String(body?.tradingViewId || '').trim();

    if (!email || !fullName || !tradingViewId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteError || !inviteData?.user?.id) {
      console.error('Invite user error:', inviteError);
      return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 });
    }

    const userId = inviteData.user.id;

    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        name: fullName,
        trading_view_id: tradingViewId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Failed to upsert user profile:', upsertError);
      return NextResponse.json({ error: 'Failed to save user profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Admin updates user note
export async function PATCH(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify admin access via session (not header)
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const body = await request.json();
    const { userId, adminNote } = body || {};

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        admin_note: adminNote || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating admin note:', error);
      return NextResponse.json({ error: sanitizeDbError(error, 'update-admin-note') }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
