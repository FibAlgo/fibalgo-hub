import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// In-memory rate limiting (backup for Upstash)
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// Verify reCAPTCHA token
async function verifyCaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    // 🔒 SECURITY: CAPTCHA is required in production - fail closed
    console.error('RECAPTCHA_SECRET_KEY not configured - blocking request for security');
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    // 🔒 SECURITY: Fail closed on CAPTCHA verification errors
    return false;
  }
}

// Clean up old attempts
function cleanupAttempts() {
  const now = Date.now();
  for (const [key, value] of loginAttempts.entries()) {
    if (now - value.firstAttempt > RATE_LIMIT_WINDOW) {
      loginAttempts.delete(key);
    }
  }
}

// GET - Check if CAPTCHA is required for an email
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.toLowerCase();

  if (!email) {
    return NextResponse.json({ requiresCaptcha: false });
  }

  cleanupAttempts();
  const attempts = loginAttempts.get(email);
  const requiresCaptcha = attempts ? attempts.count >= MAX_ATTEMPTS : false;

  return NextResponse.json({ 
    requiresCaptcha,
    attemptsLeft: attempts ? Math.max(0, MAX_ATTEMPTS - attempts.count) : MAX_ATTEMPTS,
  });
}

// POST - Login with rate limiting and ban check
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Upstash rate limiting (persistent across serverless)
    const clientIP = getClientIP(request);
    const { success: rateLimitOk, reset } = await checkRateLimit(`login:${clientIP}`, 'auth');
    
    if (!rateLimitOk) {
      return NextResponse.json({ 
        error: 'Too many login attempts. Please try again later.',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    const body = await request.json();
    const { email, password, captchaToken } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    cleanupAttempts();

    // Check rate limit
    const attempts = loginAttempts.get(normalizedEmail);
    const requiresCaptcha = attempts ? attempts.count >= MAX_ATTEMPTS : false;

    // If CAPTCHA is required, verify it
    if (requiresCaptcha) {
      if (!captchaToken) {
        return NextResponse.json({ 
          error: 'CAPTCHA verification required',
          requiresCaptcha: true,
        }, { status: 429 });
      }

      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        return NextResponse.json({ 
          error: 'CAPTCHA verification failed. Please try again.',
          requiresCaptcha: true,
        }, { status: 400 });
      }

      // CAPTCHA verified successfully - reset counter to give more attempts
      // This prevents requiring CAPTCHA on every single attempt after the 5th
      loginAttempts.set(normalizedEmail, { count: 0, firstAttempt: Date.now() });
    }

    // Attempt login via Supabase Auth FIRST (verify password before checking ban)
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    // If password is wrong, return error without revealing ban status
    if (authError) {
      // Record failed attempt
      const currentAttempts = loginAttempts.get(normalizedEmail) || { count: 0, firstAttempt: Date.now() };
      currentAttempts.count += 1;
      loginAttempts.set(normalizedEmail, currentAttempts);

      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - currentAttempts.count);
      const nowRequiresCaptcha = currentAttempts.count >= MAX_ATTEMPTS;

      return NextResponse.json({ 
        error: authError.message,
        attemptsLeft,
        requiresCaptcha: nowRequiresCaptcha,
      }, { status: 401 });
    }

    // Password verified - NOW check if user is banned
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, is_banned, ban_reason')
      .ilike('email', normalizedEmail)
      .single();

    if (userData?.is_banned === true) {
      // Sign out the banned user immediately
      if (authData.session) {
        await supabaseAdmin.auth.admin.signOut(authData.user.id, 'global');
      }
      return NextResponse.json({ 
        error: 'Your account has been suspended. Please contact support for assistance.',
        banned: true,
        banReason: userData.ban_reason || 'Violation of terms of service',
      }, { status: 403 });
    }

    // Successful login - clear attempts
    loginAttempts.delete(normalizedEmail);

    // Check email verification
    if (authData.user && !authData.user.email_confirmed_at) {
      // Note: Don't sign out here, let frontend handle it
      return NextResponse.json({ 
        error: 'Please verify your email address before logging in.',
        unverified: true,
      }, { status: 403 });
    }

    // Get user role
    const { data: roleData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authData.user?.id)
      .single();

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
        role: roleData?.role || 'user',
      },
      session: authData.session,
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
