/**
 * API Authentication & Authorization Helpers
 * 
 * Centralized auth functions for all API routes.
 * NEVER trust client-provided userId/adminId - always verify server-side.
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Upstash Redis Rate Limiter (persistent across serverless instances)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Different rate limiters for different use cases
const rateLimiters = redis ? {
  // General API: 100 requests per minute
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:general',
  }),
  // Auth endpoints: 10 requests per minute (prevent brute force)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:auth',
  }),
  // AI endpoints: 20 requests per minute (expensive operations)
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'rl:ai',
  }),
  // Sensitive operations: 5 requests per minute
  sensitive: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:sensitive',
  }),
} : null;

export type RateLimitType = 'general' | 'auth' | 'ai' | 'sensitive';

/**
 * 🔒 Rate Limiting with Upstash Redis
 * Returns { success: true } if allowed, { success: false, reset: timestamp } if blocked
 * If Redis is not configured or errors out, requests are ALLOWED (fail open)
 * to prevent total site blackout.
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'general'
): Promise<{ success: boolean; reset?: number; remaining?: number }> {
  if (!rateLimiters) {
    // Fail open: allow requests when Redis is unavailable
    if (process.env.NODE_ENV === 'production') {
      console.warn('[RateLimit] UPSTASH_REDIS not configured – allowing request (fail open)');
    }
    return { success: true };
  }

  try {
    const limiter = rateLimiters[type];
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      reset: result.reset,
      remaining: result.remaining,
    };
  } catch (error) {
    // Fail open: don't block users when Redis has issues
    console.error('[RateLimit] Redis error, allowing request (fail open):', error);
    return { success: true };
  }
}

/**
 * Get client IP from request (works with Vercel)
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: 'user' | 'admin' | 'super_admin';
  } | null;
  error: string | null;
}

export interface PremiumAuthResult extends AuthResult {
  subscription?: {
    plan: string;
    isActive: boolean;
    expiresAt: string | null;
  };
}

/**
 * Require authenticated user
 * Returns the current user from session, NOT from request body/params
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      if (process.env.NODE_ENV !== 'production') console.log('[Auth] No session found');
      return { user: null, error: 'Unauthorized' };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Auth] Session user:', maskUserId(user.id), maskEmail(user.email ?? ''));
    }

    // IMPORTANT: Always lookup by email first (handles Google OAuth + Email signup mismatch)
    // This is critical because same email can have different IDs in auth.users vs public.users
    let userData: { id: string; role: string; email: string; is_banned?: boolean } | null = null;
    
    if (user.email) {
      const { data: userByEmail, error: emailError } = await supabaseAdmin
        .from('users')
        .select('id, role, email, is_banned')
        .ilike('email', user.email)
        .single();
      
      if (userByEmail) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Auth] Found user by email:', maskEmail(userByEmail.email ?? ''), 'role:', userByEmail.role, 'db_id:', maskUserId(userByEmail.id));
        }
        userData = userByEmail;
      } else if (process.env.NODE_ENV !== 'production') {
        console.log('[Auth] User not found by email, error:', emailError?.message);
      }
    }

    // Fallback to ID lookup if email didn't work
    if (!userData) {
      const { data: userById } = await supabaseAdmin
        .from('users')
        .select('id, role, email, is_banned')
        .eq('id', user.id)
        .single();
      
      if (userById) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Auth] Found user by ID:', maskEmail(userById.email ?? ''), 'role:', userById.role);
        }
        userData = userById;
      }
    }

    if (!userData) {
      if (process.env.NODE_ENV !== 'production') console.log('[Auth] User not found in database');
      return { user: null, error: 'User not found' };
    }

    // 🔒 SECURITY: Check if user is banned (API-level ban check)
    // This ensures banned users cannot access API endpoints even if middleware is bypassed
    if (userData.is_banned === true) {
      console.log('[Auth] Banned user attempted API access:', maskUserId(userData.id));
      return { user: null, error: 'Account suspended' };
    }

    return {
      user: {
        id: userData.id, // Use the database ID, not auth ID
        email: userData.email || user.email || '',
        role: (userData.role as 'user' | 'admin' | 'super_admin') || 'user',
      },
      error: null,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error('[Auth] Exception:', err);
    return { user: null, error: 'Authentication failed' };
  }
}

/**
 * 🔒 SECURITY: Require premium subscription
 * Verifies user is logged in AND has an active premium/ultimate subscription
 * This is the SERVER-SIDE check - client-side checks are for UI only
 */
export async function requirePremium(): Promise<PremiumAuthResult> {
  const { user, error } = await requireAuth();
  
  if (error || !user) {
    return { user: null, error: error || 'Unauthorized' };
  }

  // Check subscription status from database
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status, is_active, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (subError || !subscription) {
    return { 
      user, 
      error: 'Premium subscription required',
      subscription: { plan: 'basic', isActive: false, expiresAt: null }
    };
  }

  // Check if plan is premium or ultimate
  const isPremiumPlan = subscription.plan === 'premium' || subscription.plan === 'ultimate';
  
  // Check if subscription is active
  const isActive = subscription.is_active === true && subscription.status === 'active';
  
  // Check if subscription is not expired
  const isNotExpired = !subscription.expires_at || new Date(subscription.expires_at) > new Date();

  if (!isPremiumPlan || !isActive || !isNotExpired) {
    return { 
      user, 
      error: 'Premium subscription required',
      subscription: { 
        plan: subscription.plan || 'basic', 
        isActive: false, 
        expiresAt: subscription.expires_at 
      }
    };
  }

  return { 
    user, 
    error: null,
    subscription: { 
      plan: subscription.plan, 
      isActive: true, 
      expiresAt: subscription.expires_at 
    }
  };
}

/**
 * Require admin role
 * Verifies user is logged in AND has admin/super_admin role
 */
export async function requireAdmin(): Promise<AuthResult> {
  const { user, error } = await requireAuth();
  
  if (error || !user) {
    return { user: null, error: error || 'Unauthorized' };
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return { user: null, error: 'Forbidden - Admin access required' };
  }

  return { user, error: null };
}

/**
 * Require ownership - user must own the resource or be admin
 */
export async function requireOwnershipOrAdmin(resourceUserId: string): Promise<AuthResult> {
  const { user, error } = await requireAuth();
  
  if (error || !user) {
    return { user: null, error: error || 'Unauthorized' };
  }

  // Admin can access any resource
  if (user.role === 'admin' || user.role === 'super_admin') {
    return { user, error: null };
  }

  // User can only access their own resources
  if (user.id !== resourceUserId) {
    return { user: null, error: 'Forbidden - You can only access your own data' };
  }

  return { user, error: null };
}

/**
 * Get HTTP status code from error message
 */
export function getErrorStatus(error: string): number {
  if (error === 'Unauthorized' || error === 'Authentication failed') {
    return 401;
  }
  if (error.startsWith('Forbidden')) {
    return 403;
  }
  return 400;
}

/**
 * Validate redirect URL to prevent open redirect attacks
 * Only allows internal paths
 */
export function sanitizeRedirectUrl(url: string | null): string {
  const defaultRedirect = '/dashboard';
  
  if (!url) return defaultRedirect;
  
  // Must start with / and not //
  if (!url.startsWith('/') || url.startsWith('//')) {
    return defaultRedirect;
  }
  
  // Check for protocol injection
  if (url.toLowerCase().includes('://') || url.toLowerCase().includes('javascript:')) {
    return defaultRedirect;
  }
  
  // Only allow known safe paths
  const allowedPaths = ['/dashboard', '/admin', '/terminal', '/library'];
  const path = url.split('?')[0];
  
  if (!allowedPaths.some(allowed => path === allowed || path.startsWith(allowed + '/'))) {
    return defaultRedirect;
  }
  
  return url;
}

/**
 * Mask email for logging (hide middle part)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  
  return `${local.substring(0, 2)}***@${domain}`;
}

/**
 * Mask user ID for logging
 */
export function maskUserId(userId: string): string {
  if (!userId || userId.length < 8) return '***';
  return `${userId.substring(0, 4)}...${userId.substring(userId.length - 4)}`;
}

/**
 * 🔒 CRON Authentication
 * Verifies that cron requests come from Vercel's cron system.
 * Checks multiple methods for flexibility:
 * 1. x-vercel-cron header (most reliable for Vercel-triggered crons)
 * 2. Authorization Bearer token matching CRON_SECRET
 * 3. Query parameter cron_secret (for manual testing)
 * 4. User-agent containing "vercel-cron"
 */
export interface CronAuthResult {
  authorized: boolean;
  error?: string;
  statusCode?: number;
}

export function verifyCronAuth(request: Request): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;
  
  // Development mode: always allow
  if (process.env.NODE_ENV !== 'production') {
    return { authorized: true };
  }
  
  // Production: CRON_SECRET must be configured
  if (!cronSecret) {
    console.error('[CronAuth] CRON_SECRET not configured in production');
    return { authorized: false, error: 'CRON_SECRET not configured', statusCode: 500 };
  }
  
  const authHeader = request.headers.get('authorization');
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  
  let match = false;
  
  // Method 1: Vercel cron header (most reliable for Vercel-triggered crons)
  if (vercelCronHeader === '1') {
    match = true;
  }
  
  // Method 2: Authorization Bearer token
  if (!match && authHeader) {
    const got = authHeader.trim();
    if (got.toLowerCase().startsWith('bearer ') && got.slice(7).trim() === cronSecret.trim()) {
      match = true;
    }
  }
  
  // Method 3: Query parameter fallback (for manual testing)
  if (!match) {
    try {
      const url = new URL(request.url);
      const q = url.searchParams.get('cron_secret');
      if (q && q.trim() === cronSecret.trim()) {
        match = true;
      }
    } catch {
      // ignore URL parse errors
    }
  }
  
  // Method 4: User-agent fallback
  if (!match && userAgent.includes('vercel-cron')) {
    match = true;
  }
  
  if (!match) {
    console.warn('[CronAuth] Auth failed: header=', !!authHeader, 'x-vercel-cron=', vercelCronHeader, 'ua=', userAgent.slice(0, 50));
    return { authorized: false, error: 'Unauthorized', statusCode: 401 };
  }
  
  return { authorized: true };
}

/**
 * 🔒 SECURITY: Sanitize database errors before sending to client
 * Never expose internal error details to users
 */
export function sanitizeDbError(error: { message?: string; code?: string } | null, operation: string = 'operation'): string {
  if (!error) return 'An unexpected error occurred';
  
  // Log the actual error for debugging (server-side only)
  console.error(`[${operation}] Database error:`, error.message, error.code);
  
  // Return generic messages to client
  const code = error.code || '';
  
  // Handle specific known error codes with user-friendly messages
  if (code === '23505') return 'This record already exists';
  if (code === '23503') return 'Referenced record not found';
  if (code === '42501') return 'Permission denied';
  if (code === 'PGRST116') return 'Record not found';
  
  // Generic fallback - never expose actual error message
  return 'An error occurred. Please try again.';
}
