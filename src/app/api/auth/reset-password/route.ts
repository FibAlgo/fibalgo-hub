import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success: rateLimitOk, reset } = await checkRateLimit(`auth:${clientIP}:reset-password`, 'auth');
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token, email, password } = body;

    if (!token || !email || !password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Validate password requirements
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (!/\d/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one number." }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter." }, { status: 400 });
    }

    // Token'ı ve geçerliliğini kontrol et
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, reset_token, reset_token_expiry")
      .ilike("email", email)
      .eq("reset_token", token)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    // Token süresi dolmuş mu?
    if (new Date(user.reset_token_expiry) < new Date()) {
      // Süresi dolmuş token'ı temizle
      await supabaseAdmin
        .from("users")
        .update({ reset_token: null, reset_token_expiry: null })
        .eq("id", user.id);
      
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }

    // Supabase Auth'ta şifreyi güncelle
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password,
    });

    if (updateAuthError) {
      console.error("Auth update error:", updateAuthError);
      return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
    }

    // Token'ı temizle (bir kere kullanılabilir) + cooldown başlat
    await supabaseAdmin
      .from("users")
      .update({ 
        reset_token: null, 
        reset_token_expiry: null,
        password_changed_at: new Date().toISOString()
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
