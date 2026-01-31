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

const supabaseAdmin = createAdminClient(
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
 * Production: Redis yoksa istek reddedilir (fail closed). Development: atlanır.
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'general'
): Promise<{ success: boolean; reset?: number; remaining?: number }> {
  if (!rateLimiters) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[RateLimit] UPSTASH_REDIS not configured in production – blocking request');
      return { success: false, reset: Date.now() + 60_000 };
    }
    console.warn('[RateLimit] Upstash not configured, skipping rate limit (dev)');
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
    console.error('[RateLimit] Error:', error);
    if (process.env.NODE_ENV === 'production') {
      return { success: false, reset: Date.now() + 60_000 };
    }
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
    let userData = null;
    
    if (user.email) {
      const { data: userByEmail, error: emailError } = await supabaseAdmin
        .from('users')
        .select('id, role, email')
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
        .select('id, role, email')
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
