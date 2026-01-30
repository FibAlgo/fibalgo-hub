import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { POLAR_CONFIG, POLAR_PRODUCTS, PlanType, getApiUrl } from '@/lib/polar';
import { requireAuth, requireOwnershipOrAdmin, getErrorStatus, sanitizeRedirectUrl } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get API URL based on environment (sandbox or production)
const POLAR_API_URL = getApiUrl();

function buildSafeReturnUrl(request: NextRequest, input: string | null | undefined, fallbackPath: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const fallback = siteUrl + fallbackPath;

  if (!input) return fallback;

  try {
    if (input.startsWith('/')) {
      const safePath = sanitizeRedirectUrl(input);
      return siteUrl + safePath;
    }

    const url = new URL(input);
    if (url.origin !== siteUrl) {
      return fallback;
    }

    const safePath = sanitizeRedirectUrl(url.pathname + url.search);
    return siteUrl + safePath;
  } catch {
    return fallback;
  }
}

function resolvePlanFromProductId(productId: string | null | undefined): PlanType | null {
  if (!productId) return null;
  const products = POLAR_PRODUCTS[POLAR_CONFIG.mode] || POLAR_PRODUCTS.sandbox || {};
  for (const [planKey, id] of Object.entries(products)) {
    if (id && id === productId) return planKey as PlanType;
  }
  return null;
}

// Create checkout session for a product
export async function POST(request: NextRequest) {
  try {
    const { productId, userId, userEmail, successUrl, cancelUrl } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { user: authUser, error: authError } = await requireAuth();
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const effectiveUserId = userId || authUser.id;
    const { user: ownerUser, error: ownerError } = await requireOwnershipOrAdmin(effectiveUserId);
    if (ownerError || !ownerUser) {
      return NextResponse.json({ error: ownerError || 'Unauthorized' }, { status: getErrorStatus(ownerError || 'Unauthorized') });
    }

    let effectiveEmail = userEmail || authUser.email || null;
    if (!effectiveEmail || effectiveUserId !== authUser.id) {
      const { data: userRecord } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', effectiveUserId)
        .single();
      effectiveEmail = userRecord?.email || effectiveEmail;
    }

    const safeSuccessUrl = buildSafeReturnUrl(request, successUrl, '/dashboard?payment=success');
    const safeCancelUrl = buildSafeReturnUrl(request, cancelUrl, '/dashboard?payment=cancelled');

    const resolvedPlan = resolvePlanFromProductId(productId);

    // Create checkout session via Polar API
    const response = await fetch(`${POLAR_API_URL}/checkouts/custom/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLAR_CONFIG.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        success_url: safeSuccessUrl,
        cancel_url: safeCancelUrl,
        customer_email: effectiveEmail,
        metadata: {
          user_id: effectiveUserId,
          environment: POLAR_CONFIG.mode, // Track which environment this was from
          plan: resolvedPlan || undefined,
          product_id: productId || undefined,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Polar checkout error:', error);
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    const checkout = await response.json();

    return NextResponse.json({
      success: true,
      checkoutUrl: checkout.url,
      checkoutId: checkout.id,
    });

  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get subscription status for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const { user: authUser, error: authError } = await requireAuth();
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const effectiveUserId = userId || authUser.id;
    const { user: ownerUser, error: ownerError } = await requireOwnershipOrAdmin(effectiveUserId);
    if (ownerError || !ownerUser) {
      return NextResponse.json({ error: ownerError || 'Unauthorized' }, { status: getErrorStatus(ownerError || 'Unauthorized') });
    }

    // Check subscription in our database first
    if (effectiveUserId) {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('id, plan, status, end_date, is_active')
        .eq('user_id', effectiveUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subscription) {
        const isPremium = subscription.plan !== 'basic' && subscription.is_active;
        return NextResponse.json({
          success: true,
          isPremium: isPremium,
          status: subscription.status,
          subscriptionId: subscription.id,
          expiresAt: subscription.end_date,
        });
      }
    }

    return NextResponse.json({
      success: true,
      isPremium: false,
      status: 'none',
    });

  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json({ isPremium: false, status: 'error' });
  }
}
