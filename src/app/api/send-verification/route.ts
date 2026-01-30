import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendVerificationCodeEmail, generateVerificationCode, sendEmailChangedNotification, sendEmailChangeSuccessNotification, sendPasswordChangedNotification } from '@/lib/email';
import bcrypt from 'bcryptjs';
import { requireOwnershipOrAdmin, getErrorStatus, checkRateLimit, getClientIP } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST - Send verification code
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success: rateLimitOk, reset } = await checkRateLimit(`auth:${clientIP}:send-verification`, 'auth');
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, type, userName, newEmail, newPassword, currentPassword, userId } = body;

    if (!email || !type) {
      return NextResponse.json(
        { error: 'Email and type are required' },
        { status: 400 }
      );
    }

    // 🔒 SECURITY: For sensitive operations, verify session
    if ((type === 'email-change' || type === 'password-change') && userId) {
      const { user: authUser, error: authError } = await requireOwnershipOrAdmin(userId);
      if (authError || !authUser) {
        return NextResponse.json({ error: authError || 'Unauthorized' }, { status: getErrorStatus(authError || 'Unauthorized') });
      }
    }

    // Security limits check
    if (userId) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('email_changed_at, password_changed_at')
        .eq('id', userId)
        .single();

      if (!userError && userData) {
        // Email change limit: once per 30 days
        if (type === 'email-change' && userData.email_changed_at) {
          const lastChange = new Date(userData.email_changed_at);
          const daysSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceChange < 30) {
            const daysRemaining = Math.ceil(30 - daysSinceChange);
            return NextResponse.json(
              { error: `You can change your email again in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.` },
              { status: 429 }
            );
          }
        }

        // Password change limit: once per 24 hours
        if (type === 'password-change' && userData.password_changed_at) {
          const lastChange = new Date(userData.password_changed_at);
          const hoursSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60);
          if (hoursSinceChange < 24) {
            const hoursRemaining = Math.ceil(24 - hoursSinceChange);
            return NextResponse.json(
              { error: `You can change your password again in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}.` },
              { status: 429 }
            );
          }
        }
      }
    }

    // For password change, verify current password and validate new password
    if (type === 'password-change' && userId) {
      console.log('[Password Change] Validating password change request');
      
      // Verify user exists in database
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('[Password Change] User not found:', userError);
        return NextResponse.json(
          { error: 'User not found. Please try logging out and back in.' },
          { status: 404 }
        );
      }

      // Validate current password is provided
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required.' },
          { status: 400 }
        );
      }

      // Validate new password is provided
      if (!newPassword) {
        return NextResponse.json(
          { error: 'New password is required.' },
          { status: 400 }
        );
      }

      // Validate new password meets requirements (match signup rules)
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters long.' },
          { status: 400 }
        );
      }
      if (!/\d/.test(newPassword)) {
        return NextResponse.json(
          { error: 'New password must contain at least one number.' },
          { status: 400 }
        );
      }
      if (!/[A-Z]/.test(newPassword)) {
        return NextResponse.json(
          { error: 'New password must contain at least one uppercase letter.' },
          { status: 400 }
        );
      }

      // Check new password is not the same as current password
      if (currentPassword === newPassword) {
        return NextResponse.json(
          { error: 'New password must be different from your current password.' },
          { status: 400 }
        );
      }

      // Verify current password using a separate auth client (won't affect user's session)
      const tempAuthClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { error: signInError } = await tempAuthClient.auth.signInWithPassword({
        email: userData.email,
        password: currentPassword,
      });

      if (signInError) {
        console.error('[Password Change] Current password verification failed:', signInError.message);
        return NextResponse.json(
          { error: 'Current password is incorrect.' },
          { status: 400 }
        );
      }

      console.log('[Password Change] All validations passed, will send code to:', userData.email);
    }

    // For email change, verify new email is not already taken
    if (type === 'email-change' && newEmail) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', newEmail)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { error: 'This email address is already in use' },
          { status: 400 }
        );
      }
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString(); // 3 minutes

    // Hash the new password if provided (for password change)
    let newPasswordHash: string | undefined;
    if (type === 'password-change' && newPassword) {
      newPasswordHash = await bcrypt.hash(newPassword, 12);
    }

    // Delete any existing verification codes for this email
    await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('email', email);

    // Store code in database
    const { error: insertError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        email,
        code,
        type,
        expires_at: expiresAt,
        new_email: type === 'email-change' ? newEmail : null,
        new_password_hash: newPasswordHash || null,
        user_id: userId || null
      });

    if (insertError) {
      console.error('Failed to store verification code:', insertError);
      return NextResponse.json(
        { error: 'Failed to generate verification code' },
        { status: 500 }
      );
    }

    // Send verification email
    try {
      await sendVerificationCodeEmail(email, code, type, userName, newEmail);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent'
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}

// PUT - Verify code and apply changes
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, newPassword: plainNewPassword } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    // Get the verification code from database
    const { data: storedData, error: fetchError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !storedData) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if code is expired
    if (new Date() > new Date(storedData.expires_at)) {
      // Delete expired code
      await supabaseAdmin
        .from('verification_codes')
        .delete()
        .eq('id', storedData.id);
      
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if code matches
    if (storedData.code !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Code is valid - apply the change
    const { type, new_email: newEmail, new_password_hash: newPasswordHash, user_id: userId } = storedData;

    if (type === 'email-change' && newEmail && userId) {
      // Get current user data for notification
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('name, email')
        .eq('id', userId)
        .single();
      
      const oldEmail = userData?.email || email;
      const userName = userData?.name;

      // Update email in Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email: newEmail, email_confirm: true }
      );

      if (authError) {
        console.error('Auth email update error:', authError);
        return NextResponse.json(
          { error: 'Failed to update email' },
          { status: 500 }
        );
      }

      // Update email in users table with timestamp
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .update({ 
          email: newEmail,
          email_changed_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (dbError) {
        console.error('DB email update error:', dbError);
      }

      // Send notification to OLD email about the change
      try {
        await sendEmailChangedNotification(oldEmail, newEmail, userName);
      } catch (notifyError) {
        // Email change was successful, notification failure is non-critical
      }

      // Send success notification to NEW email
      try {
        await sendEmailChangeSuccessNotification(newEmail, userName);
      } catch (successNotifyError) {
        // Email change was successful, notification failure is non-critical
      }

      // Mark code as used and delete
      await supabaseAdmin
        .from('verification_codes')
        .delete()
        .eq('id', storedData.id);

      return NextResponse.json({ 
        success: true, 
        message: 'Email updated successfully',
        type: 'email-change',
        newEmail
      });
    }

    if (type === 'password-change' && userId) {
      // For password change, we need the plain password to update Supabase Auth
      // The hashed password is stored in new_password_hash for users table
      
      // If plainNewPassword is provided in the request, use it for Supabase Auth
      if (plainNewPassword) {
        if (plainNewPassword.length < 8) {
          return NextResponse.json(
            { error: 'New password must be at least 8 characters long.' },
            { status: 400 }
          );
        }
        if (!/\d/.test(plainNewPassword)) {
          return NextResponse.json(
            { error: 'New password must contain at least one number.' },
            { status: 400 }
          );
        }
        if (!/[A-Z]/.test(plainNewPassword)) {
          return NextResponse.json(
            { error: 'New password must contain at least one uppercase letter.' },
            { status: 400 }
          );
        }
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: plainNewPassword }
        );

        if (authError) {
          console.error('Auth password update error:', authError);
          return NextResponse.json(
            { error: 'Failed to update password' },
            { status: 500 }
          );
        }
        
        console.log('[Password Change] Password updated successfully in Supabase Auth');
      }

      // Update cooldown timestamp in users table (no need to store password hash - Supabase Auth handles it)
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .update({ 
          password_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (dbError) {
        console.error('DB password_changed_at update error:', dbError);
      }

      // Send password change notification email
      try {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('email, full_name, name')
          .eq('id', userId)
          .single();
        const notifyEmail = userData?.email || email;
        const notifyName = userData?.full_name || userData?.name || null;
        if (notifyEmail) {
          await sendPasswordChangedNotification(notifyEmail, notifyName);
        }
      } catch (notifyError) {
        // Non-blocking
      }

      // Mark code as used and delete
      await supabaseAdmin
        .from('verification_codes')
        .delete()
        .eq('id', storedData.id);

      return NextResponse.json({ 
        success: true, 
        message: 'Password updated successfully',
        type: 'password-change'
      });
    }

    // Generic success (code was valid)
    await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('id', storedData.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Code verified successfully',
      type
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
