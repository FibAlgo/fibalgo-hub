import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPasswordResetCodeEmail } from "@/lib/email";
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Generate 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success: rateLimitOk, reset } = await checkRateLimit(`auth:${clientIP}:forgot-password`, 'auth');
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Check user exists in our users table (fast query)
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, password_changed_at')
      .ilike('email', email)
      .single();

    if (!user) {
      return NextResponse.json({ success: true, message: "If an account exists for this email, a verification code has been sent." });
    }

    // Check 24-hour cooldown for password change
    if (user.password_changed_at) {
      const lastChange = new Date(user.password_changed_at);
      const hoursSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceChange < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceChange);
        return NextResponse.json({ 
          error: `You recently changed your password. You can change it again in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}.` 
        }, { status: 429 });
      }
    }

    // Get auth user by ID to check provider and email verification (faster than listUsers)
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(user.id);
    const authUser = authData?.user;

    if (authUser) {
      // Check if user signed up with OAuth (Google, Twitter, TikTok)
      const provider = authUser.app_metadata?.provider as string | undefined;
      const providers: string[] = authUser.app_metadata?.providers || [];
      const oauthProviders = ['google', 'twitter', 'tiktok'];
      
      const isOAuthUser = (provider && oauthProviders.includes(provider)) || oauthProviders.some(p => providers.includes(p));
      
      if (isOAuthUser) {
        return NextResponse.json({
          success: true,
          message: "If an account exists for this email, a verification code has been sent. If you signed up with a social provider, please use that provider to sign in."
        });
      }

      // Check if email is verified
      if (!authUser.email_confirmed_at) {
        return NextResponse.json({
          success: true,
          message: "If an account exists for this email, a verification code has been sent."
        });
      }
    }

    // Check 3-minute cooldown between code requests (backend enforcement)
    const { data: recentCode } = await supabaseAdmin
      .from('verification_codes')
      .select('created_at')
      .eq('email', email)
      .eq('type', 'password-change')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentCode) {
      const codeCreatedAt = new Date(recentCode.created_at);
      const secondsSinceCode = (Date.now() - codeCreatedAt.getTime()) / 1000;
      
      if (secondsSinceCode < 180) { // 3 minutes = 180 seconds
        const secondsRemaining = Math.ceil(180 - secondsSinceCode);
        const minutesRemaining = Math.ceil(secondsRemaining / 60);
        return NextResponse.json({ 
          error: `Please wait ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''} before requesting a new code.` 
        }, { status: 429 });
      }
    }

    // SECURITY: Delete ALL old codes for this email first - only the latest code should be valid!
    await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('type', 'password-change');

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database
    const { error: insertError } = await supabaseAdmin
      .from('verification_codes')
      .insert({
        email: email,
        code: code,
        type: 'password-change',
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to store verification code:', insertError);
      return NextResponse.json({ error: "Failed to send verification code." }, { status: 500 });
    }

    // Send email with code
    console.log('Sending password reset code to:', email);
    
    try {
      await sendPasswordResetCodeEmail(email, code);
      console.log('Password reset code sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send password reset code email:', emailError);
      return NextResponse.json({ error: "Failed to send verification code. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Verification code sent to your email." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to send verification code." }, { status: 500 });
  }
}
