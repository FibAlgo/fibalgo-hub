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
    const { success: rateLimitOk, reset } = await checkRateLimit(`auth:${clientIP}:verify-reset-code`, 'auth');
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const code = String(body?.code || "").trim();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid verification code format." }, { status: 400 });
    }

    // Check for valid code
    const { data: verificationCode, error: codeError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'password-change')
      .single();

    if (codeError || !verificationCode) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    // Check if code has expired
    const expiresAt = new Date(verificationCode.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // Code is valid - don't mark as used yet (will be marked when password is actually reset)
    return NextResponse.json({ success: true, message: "Code verified successfully." });
  } catch (error) {
    console.error("Verify reset code error:", error);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
