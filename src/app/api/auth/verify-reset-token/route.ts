import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Verify if reset token is valid (not expired and not used)
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success: rateLimitOk, reset } = await checkRateLimit(`auth:${clientIP}:verify-reset-token`, 'auth');
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token, email } = body;

    if (!token || !email) {
      return NextResponse.json({ valid: false, error: "Missing token or email." }, { status: 400 });
    }

    // Check if token exists and is valid
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, reset_token, reset_token_expires")
      .ilike("email", email)
      .eq("reset_token", token)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ 
        valid: false, 
        error: "This reset link has already been used or is invalid." 
      }, { status: 400 });
    }

    // Check if token is expired
    if (new Date(user.reset_token_expires) < new Date()) {
      // Clean up expired token
      await supabaseAdmin
        .from("users")
        .update({ reset_token: null, reset_token_expires: null })
        .eq("id", user.id);
      
      return NextResponse.json({ 
        valid: false, 
        error: "This reset link has expired. Please request a new one." 
      }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Verify reset token error:", error);
    return NextResponse.json({ valid: false, error: "Verification failed." }, { status: 500 });
  }
}
