import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireOwnershipOrAdmin, getErrorStatus } from '@/lib/api/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function extractAvatarPath(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('http')) {
    const marker = '/storage/v1/object/public/avatars/';
    if (value.includes(marker)) {
      const path = value.split(marker)[1]?.split('?')[0];
      return path || null;
    }
    return null;
  }
  return value.startsWith('avatars/') ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Verify user can only update their own avatar (or admin can update any)
    const { user: authUser, error: authError } = await requireOwnershipOrAdmin(userId);
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if avatars bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets();
    const avatarsBucket = buckets?.find(b => b.name === 'avatars');
    
    if (!avatarsBucket) {
      await supabase.storage.createBucket('avatars', {
        public: false,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });
    }

    // Delete old avatar if exists
    const { data: oldUser } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (oldUser?.avatar_url) {
      const oldPath = extractAvatarPath(oldUser.avatar_url);
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from('avatars')
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

    // Get public URL
    const { data: signedData } = await supabase.storage
      .from('avatars')
      .createSignedUrl(filePath, 3600);

    const avatarUrl = signedData?.signedUrl || null;

    // Update user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      avatarUrl,
      avatarPath: filePath,
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: Verify user can only delete their own avatar (or admin)
    const { user: authUser, error: authError } = await requireOwnershipOrAdmin(userId);
    if (authError || !authUser) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current avatar URL
    const { data: user } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (user?.avatar_url) {
      const filePath = extractAvatarPath(user.avatar_url);
      if (filePath) {
        await supabase.storage.from('avatars').remove([filePath]);
      }
    }

    // Clear avatar_url in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
