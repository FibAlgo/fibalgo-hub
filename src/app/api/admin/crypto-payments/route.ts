import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api/auth';
import { sendCryptoAccessEmail, sendSubscriptionActivatedEmail } from '@/lib/email';
import { appConfig } from '@/lib/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function assertAdmin() {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return { error: 'Unauthorized', status: 401 as const };
  }
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return { error: 'Forbidden', status: 403 as const };
  }
  return { user };
}

function getSupabaseAdmin() {
  return createSupabaseAdmin(supabaseUrl, supabaseServiceKey);
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await assertAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error: selectError } = await supabaseAdmin
      .from('crypto_payments')
      .select('id, plan, tx_hash, proof_path, created_at, status, user_id, users:users!crypto_payments_user_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (selectError) {
      console.error('Crypto payments fetch error:', selectError);
      return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 });
    }

    // Sign URLs for proofs
    const signedData = await Promise.all(
      (data || []).map(async (row) => {
        let proof_url: string | null = null;
        if (row.proof_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from('crypto-payments')
            .createSignedUrl(row.proof_path, 3600);
          proof_url = signed?.signedUrl || null;
        }
        return { ...row, proof_url };
      })
    );

    return NextResponse.json({ payments: signedData });
  } catch (err) {
    console.error('Crypto payments admin error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await assertAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch to delete proof file if exists
    const { data: row } = await supabaseAdmin
      .from('crypto_payments')
      .select('id, proof_path')
      .eq('id', id)
      .single();

    const { error: deleteError } = await supabaseAdmin
      .from('crypto_payments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Crypto payment delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    if (row?.proof_path) {
      await supabaseAdmin.storage.from('crypto-payments').remove([row.proof_path]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Crypto payments delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await assertAdmin();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { id, action } = body || {};
    if (!id || action !== 'grant') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const adminUser = auth.user;

    const supabaseAdmin = getSupabaseAdmin();

    const { data: row, error: fetchError } = await supabaseAdmin
      .from('crypto_payments')
      .select('id, plan, tx_hash, proof_path, user_id, users:users!crypto_payments_user_id_fkey(*)')
      .eq('id', id)
      .single();

    if (fetchError || !row) {
      console.error('Crypto payment grant fetch error:', fetchError);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Send access-granted email
    const userEmail = (row as any).users?.email as string | undefined;
    const userName = (row as any).users?.full_name || (row as any).users?.name;
    if (userEmail) {
      await sendCryptoAccessEmail(userEmail, userName || undefined, row.plan || undefined);
    }

    // Grant 30-day access based on plan (default premium)
    const plan = (row.plan === 'ultimate' ? 'ultimate' : 'premium') as 'premium' | 'ultimate';
    const planName = plan === 'ultimate' ? 'Ultimate' : 'Premium';
    const planPrice = plan === 'ultimate' ? appConfig.plans.ultimate.price : appConfig.plans.premium.price;
    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Fill legacy columns (plan_id/plan_name/started_at/expires_at) so NOT NULL constraints are satisfied
    const { data: subscriptionRow, error: upsertError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: row.user_id,
        plan_id: plan,
        plan_name: planName,
        plan,
        status: 'active',
        is_active: true,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        started_at: startDate.toISOString(),
        expires_at: endDate.toISOString(),
        days_remaining: 30,
        auto_renew: true,
        tradingview_access_granted: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Crypto payment grant subscription error:', upsertError);
      return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
    }

    const { error: billingError } = await supabaseAdmin
      .from('billing_history')
      .insert({
        user_id: row.user_id,
        subscription_id: subscriptionRow?.id || null,
        currency: 'USD',
        plan_description: planName,
        payment_method: 'crypto',
        status: 'completed',
        billing_reason: 'crypto_manual_grant',
        invoice_id: row.tx_hash || null,
        added_by: adminUser.id,
        amount: planPrice,
      });

    if (billingError) {
      console.error('Crypto payment billing insert error:', billingError);
      return NextResponse.json({ error: 'Failed to record billing' }, { status: 500 });
    }

    // Send subscription activated email (in addition to crypto access email sent earlier)
    try {
      if (userEmail) {
        await sendSubscriptionActivatedEmail(userEmail, userName || undefined, plan, endDate.toISOString());
        console.log(`[Admin Crypto] 📧 Subscription activated email sent to: ${userEmail}`);
      }
    } catch (emailErr) {
      console.error('[Admin Crypto] Failed to send subscription activated email:', emailErr);
    }

    // If Ultimate, add TradingView upgrade task so user appears in "TradingView eklenecekler"
    if (plan === 'ultimate') {
      const { data: existingUpgrade } = await supabaseAdmin
        .from('tradingview_upgrades')
        .select('id')
        .eq('user_id', row.user_id)
        .eq('is_granted', false)
        .limit(1)
        .maybeSingle();

      if (!existingUpgrade) {
        const { data: tvUser } = await supabaseAdmin
          .from('users')
          .select('email, full_name, trading_view_id')
          .eq('id', row.user_id)
          .single();

        await supabaseAdmin
          .from('tradingview_upgrades')
          .insert({
            user_id: row.user_id,
            email: tvUser?.email || (row as any).users?.email || null,
            tradingview_username: tvUser?.trading_view_id || (row as any).users?.trading_view_id || null,
            plan: 'ultimate',
            is_granted: false,
          });
      }
    }

    // Delete record and proof once access granted
    const { error: deleteError } = await supabaseAdmin
      .from('crypto_payments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Crypto payment grant delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to finalize' }, { status: 500 });
    }

    if (row.proof_path) {
      await supabaseAdmin.storage.from('crypto-payments').remove([row.proof_path]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Crypto payments grant error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
