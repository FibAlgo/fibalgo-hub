import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIP } from '@/lib/api/auth';
import { createHash, randomBytes } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // 🔒 Abuse prevention:
    // - Rate limit by IP
    // - Rate limit by email (hashed) so attackers can't spam one address
    const ipKey = `auth:${clientIP}:resend-verification`;
    const emailHash = createHash('sha256').update(email).digest('hex').slice(0, 32);
    const emailKey = `auth:email:${emailHash}:resend-verification`;

    // Use "sensitive" limiter (stricter than generic auth)
    const ipLimit = await checkRateLimit(ipKey, 'sensitive');
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: ipLimit.reset ? Math.ceil((ipLimit.reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    const emailLimit = await checkRateLimit(emailKey, 'sensitive');
    if (!emailLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: emailLimit.reset ? Math.ceil((emailLimit.reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    // Find user
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email_verified, full_name")
      .ilike("email", email)
      .maybeSingle();

    if (userError || !user) {
      // Don't reveal if email exists or not
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a verification link will be sent.",
      });
    }

    // 🔒 Abuse prevention: do not send another email if already verified
    if (user.email_verified) {
      return NextResponse.json(
        { error: "Account already verified. Please log in.", code: "ALREADY_VERIFIED" },
        { status: 409 }
      );
    }

    // Generate new verification token
    const verificationToken = randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update token
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        verification_token: verificationToken,
        verification_token_expires: verificationExpires.toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update verification token:", updateError);
      return NextResponse.json(
        { error: "Failed to send verification email." },
        { status: 500 }
      );
    }

    // Send verification email
    const verifyLink = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    try {
      await sendVerificationEmail(email, verifyLink);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return NextResponse.json(
        { error: "Failed to send verification email." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Please check your inbox (and spam/junk). Only the most recent verification link will work.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
