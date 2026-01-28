import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getErrorStatus } from '@/lib/api/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require authentication
    const { user: authUser, error: authError } = await requireAuth();
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const ticketId = formData.get('ticketId') as string;
    const userId = formData.get('userId') as string;

    if (!file || !ticketId || !userId) {
      return NextResponse.json(
        { error: 'File, ticketId, and userId are required' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Verify ticket ownership
    const supabaseCheck = createClient(supabaseUrl, supabaseServiceKey);
    const { data: ticket } = await supabaseCheck
      .from('support_tickets')
      .select('user_id')
      .eq('id', ticketId)
      .single();

    if (!ticket || (ticket.user_id !== authUser.id && authUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for support attachments)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${ticketId}-${userId}-${Date.now()}.${fileExt}`;
    const filePath = `tickets/${ticketId}/${fileName}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if ticket-attachments bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets();
    const ticketsBucket = buckets?.find(b => b.name === 'ticket-attachments');
    
    if (!ticketsBucket) {
      await supabase.storage.createBucket('ticket-attachments', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });
    }

    // Upload attachment
    const { error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Create signed URL
    const { data: signedData } = await supabase.storage
      .from('ticket-attachments')
      .createSignedUrl(filePath, 3600);

    const attachmentUrl = signedData?.signedUrl || null;

    return NextResponse.json({ 
      success: true, 
      attachmentUrl,
      attachmentPath: filePath,
    });

  } catch (error) {
    console.error('Ticket attachment upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
