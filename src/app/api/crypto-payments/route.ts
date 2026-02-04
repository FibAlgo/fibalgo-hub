import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { requireAuth, getErrorStatus } from '@/lib/api/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const txHash = (formData.get('txHash') as string | null)?.trim();
    const plan = (formData.get('plan') as string | null)?.trim() || null;

    if (!file || !txHash) {
      return NextResponse.json({ error: 'Proof image and TX hash are required' }, { status: 400 });
    }

    if (txHash.length < 6) {
      return NextResponse.json({ error: 'TX hash looks too short' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF are allowed' }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin(supabaseUrl, supabaseServiceKey);

    // Ensure storage bucket
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const hasBucket = buckets?.some((b) => b.name === 'crypto-payments');
    if (!hasBucket) {
      await supabaseAdmin.storage.createBucket('crypto-payments', {
        public: false,
        fileSizeLimit: maxSize,
        allowedMimeTypes: allowedTypes,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('crypto-payments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Crypto payment upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload proof' }, { status: 500 });
    }

    const { error: insertError, data } = await supabaseAdmin
      .from('crypto_payments')
      .insert({
        user_id: user.id,
        plan,
        tx_hash: txHash,
        proof_path: filePath,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Crypto payment insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Crypto payment handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
