import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIP } from "@/lib/api/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 🔒 SECURITY: In-memory rate limiting (backup for Upstash)
const signupAttempts = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_SIGNUPS_PER_IP = 5;

function cleanupSignupAttempts() {
  const now = Date.now();
  for (const [key, value] of signupAttempts.entries()) {
    if (now - value.firstAttempt > RATE_LIMIT_WINDOW) {
      signupAttempts.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // 🔒 SECURITY: Upstash rate limiting (persistent across serverless)
    const { success: rateLimitOk, reset } = await checkRateLimit(`signup:${clientIP}`, 'auth');
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later.", retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }
    
    // 🔒 SECURITY: Backup in-memory rate limit
    cleanupSignupAttempts();
    const attempts = signupAttempts.get(clientIP);
    if (attempts && attempts.count >= MAX_SIGNUPS_PER_IP) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    const emailLower = String(email || "").trim().toLowerCase();
    const userName = String(name || "").trim();

    // Validation
    if (!emailLower || !password || !userName) {
      return NextResponse.json(
        { error: "Name, email and password are required." },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    if (!/\d/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one number." },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter." },
        { status: 400 }
      );
    }

    // Check if email already exists in public.users (handles legacy rows)
    const { data: existingUserRow, error: existingUserError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", emailLower)
      .maybeSingle();

    if (existingUserError && existingUserError.code !== "PGRST116") { // ignore "no rows" error
      console.error("User lookup error:", existingUserError);
      return NextResponse.json(
        { error: "Failed to create account." },
        { status: 500 }
      );
    }

    // Check if email already exists in auth.users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === emailLower
    );

    if (existingAuth || existingUserRow) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth (without email confirmation - we handle it ourselves)
    console.log('Creating auth user for:', emailLower);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailLower,
      password: password,
      email_confirm: false, // We will confirm manually after verification
      user_metadata: {
        full_name: userName,
      },
    });

    console.log('Auth creation result:', { authData: !!authData, error: authError });

    if (authError || !authData.user) {
      console.error("Auth user creation error:", authError);
      return NextResponse.json(
        { error: "Failed to create account.", details: authError?.message },
        { status: 500 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Check if user already exists in our users table
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", authData.user.id)
      .maybeSingle();

    // Create user in our users table
    if (!existingUser) {
      const userData: any = {
        id: authData.user.id,
        email: emailLower,
        full_name: userName,
        role: "user",
        verification_token: verificationToken,
        verification_token_expires: verificationExpires.toISOString(),
        email_verified: false,
      };

      const { error: insertError } = await supabaseAdmin.from("users").insert(userData);

      if (insertError) {
        console.error("User insert error:", insertError);
        // Rollback: delete auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { error: "Failed to create account." },
          { status: 500 }
        );
      }
    } else {
      console.log("User record already exists, skipping insert");
    }

    // Create basic subscription for new user (non-blocking)
    try {
      const { error: subError } = await supabaseAdmin.from("subscriptions").insert({
        user_id: authData.user.id,
        plan_id: "basic",
        plan_name: "basic",
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: null,
        auto_renew: true,
        tradingview_access_granted: false,
      });

      if (subError) {
        console.error("Subscription creation error:", subError);
        // Don't fail signup for subscription errors
      }
    } catch (subError) {
      console.error("Subscription creation error:", subError);
      // Don't fail signup for subscription errors
    }

    // Send verification email using our SMTP
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const verifyLink = `${baseUrl}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(emailLower)}`;

    try {
      await sendVerificationEmail(emailLower, verifyLink);
      console.log("Verification email sent to:", emailLower, "with link:", verifyLink);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail registration, but log the error
    }

    // 🔒 SECURITY: Record signup attempt for rate limiting
    const existing = signupAttempts.get(clientIP);
    if (existing) {
      existing.count++;
    } else {
      signupAttempts.set(clientIP, { count: 1, firstAttempt: Date.now() });
    }

    return NextResponse.json({
      success: true,
      message: "Account created. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
