import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPasswordChangedNotification } from "@/lib/email";
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success: rateLimitOk, reset } = await checkRateLimit(`auth:${clientIP}:reset-password-with-code`, 'auth');
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();
    const newPassword = String(body?.newPassword || "");

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Email, code, and new password are required." }, { status: 400 });
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid verification code format." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (!/\d/.test(newPassword)) {
      return NextResponse.json({ error: "Password must contain at least one number." }, { status: 400 });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter." }, { status: 400 });
    }

    // Verify code again
    const { data: verificationCode, error: codeError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'password-change')
      .single();

    if (codeError || !verificationCode) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    // Check if code has expired
    const expiresAt = new Date(verificationCode.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // Find user in auth.users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email);

    if (!authUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Update password using Supabase Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return NextResponse.json({ error: "Failed to reset password. Please try again." }, { status: 500 });
    }

    // Update password_changed_at in users table for 24-hour cooldown
    await supabaseAdmin
      .from('users')
      .update({ password_changed_at: new Date().toISOString() })
      .ilike('email', email);

    // Delete all password reset codes for this email (code is now used)
    await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('type', 'password-change');

    // Send password change notification email
    try {
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('full_name, name')
        .ilike('email', email)
        .single();
      await sendPasswordChangedNotification(email, profile?.full_name || profile?.name || null);
    } catch (notifyError) {
      // Non-blocking
    }

    console.log('Password reset successful for:', email);

    return NextResponse.json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("Reset password with code error:", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
