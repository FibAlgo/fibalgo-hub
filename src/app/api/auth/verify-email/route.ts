import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=invalid_verification_link', request.url));
    }

    const emailLower = String(email).trim().toLowerCase();
    // Find user
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email_verified, verification_token, verification_token_expires")
      .ilike("email", emailLower)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.redirect(new URL('/login?error=invalid_verification_link', request.url));
    }

    // If token is present, ensure it matches and not expired
    if (token) {
      if (user.verification_token && user.verification_token !== token) {
        return NextResponse.redirect(new URL('/login?error=invalid_verification_link', request.url));
      }
      if (user.verification_token_expires && new Date(user.verification_token_expires) < new Date()) {
        return NextResponse.redirect(new URL('/login?error=verification_link_expired', request.url));
      }
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.redirect(new URL('/login?message=email_already_verified', request.url));
    }

    // Update user as verified in our table
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update user verification:", updateError);
      return NextResponse.redirect(new URL('/login?error=verification_failed', request.url));
    }

    // Also confirm email in Supabase Auth
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (authUpdateError) {
      console.error("Failed to update auth email confirmation:", authUpdateError);
    }

    // Create basic subscription for the user
    const { error: subError } = await supabaseAdmin.from("subscriptions").insert({
      user_id: user.id,
      plan: "basic",
      status: "active",
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      days_remaining: 365,
      is_active: true,
    });

    if (subError) {
      console.error("Failed to create subscription:", subError);
    }

    // Get user name for welcome email
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("name")
      .eq("id", user.id)
      .single();

    // Send welcome email
    if (userData?.name) {
      try {
        await sendWelcomeEmail(emailLower, userData.name);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
    }

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/login?message=email_verified', request.url));
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(new URL('/login?error=verification_failed', request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email } = body;

    if (!token || !email) {
      return NextResponse.json(
        { error: "Invalid verification link." },
        { status: 400 }
      );
    }

    const emailLower = String(email).trim().toLowerCase();

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email_verified, verification_token, verification_token_expires")
      .ilike("email", emailLower)
      .eq("verification_token", token)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired verification link." },
        { status: 400 }
      );
    }

    if (user.verification_token_expires && new Date(user.verification_token_expires) < new Date()) {
      return NextResponse.json(
        { error: "Verification link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (user.email_verified) {
      return NextResponse.json({
        success: true,
        message: "Email already verified. You can login now.",
        alreadyVerified: true,
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update user verification:", updateError);
      return NextResponse.json(
        { error: "Failed to verify email." },
        { status: 500 }
      );
    }

    // Also confirm email in Supabase Auth
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (authUpdateError) {
      console.error("Failed to update auth email confirmation:", authUpdateError);
    }

    // Create basic subscription for the user
    const { error: subError } = await supabaseAdmin.from("subscriptions").insert({
      user_id: user.id,
      plan: "basic",
      status: "active",
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      days_remaining: 365,
      is_active: true,
    });

    if (subError) {
      console.error("Failed to create subscription:", subError);
    }

    // Get user name for welcome email
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("name")
      .eq("id", user.id)
      .single();

    // Send welcome email
    try {
      await sendWelcomeEmail(emailLower, userData?.name);
      console.log("Welcome email sent to:", emailLower);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail verification if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You can now login.",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
