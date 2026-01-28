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

    // Check if email already exists in auth.users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === emailLower
    );

    if (existingAuth) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth (without email confirmation - we handle it ourselves)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailLower,
      password: password,
      email_confirm: false, // We will confirm manually after verification
      user_metadata: {
        full_name: userName,
      },
    });

    if (authError || !authData.user) {
      console.error("Auth user creation error:", authError);
      return NextResponse.json(
        { error: "Failed to create account." },
        { status: 500 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user in our users table (password is handled by Supabase Auth)
    // Use upsert to handle cases where user might already exist (e.g., from OAuth)
    const { error: insertError } = await supabaseAdmin.from("users").upsert({
      id: authData.user.id,
      email: emailLower,
      name: userName,
      full_name: userName,
      role: "user",
      email_verified: false,
      verification_token: verificationToken,
      verification_token_expires: verificationExpires.toISOString(),
    }, { onConflict: 'id' });

    if (insertError) {
      console.error("User insert error:", insertError);
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Failed to create account." },
        { status: 500 }
      );
    }

    // Create default notification preferences (non-blocking)
    try {
      await supabaseAdmin
        .from("notification_preferences")
        .upsert({ 
          user_id: authData.user.id,
          notifications_enabled: false,
          email_notifications: false,
          push_notifications: false,
          sound_enabled: false
        }, { onConflict: "user_id" });
    } catch (prefsError) {
      console.error("Notification preferences create error:", prefsError);
    }

    // Send verification email using our SMTP
    const verifyLink = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(emailLower)}`;

    try {
      await sendVerificationEmail(emailLower, verifyLink);
      console.log("Verification email sent to:", emailLower);
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
