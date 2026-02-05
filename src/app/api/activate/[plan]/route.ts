import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limit: Max 2 tokens per IP per 24 hours
// This prevents abuse while allowing legitimate retries
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_TOKENS_PER_IP = 2;

// Generate secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ plan: string }> }
) {
  try {
    const { plan } = await params;
    
    // Validate plan
    if (!['premium', 'ultimate'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan' },
        { status: 400 }
      );
    }
    
    // Get client IP for rate limiting and logging
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Log activation attempt for fraud detection
    const referrer = request.headers.get('referer') || '';
    console.log('Activation attempt:', {
      plan,
      ip: clientIp,
      referrer: referrer.substring(0, 100),
      userAgent: (request.headers.get('user-agent') || '').substring(0, 100),
      timestamp: new Date().toISOString()
    });
    
    // Strict rate limiting: Max 2 tokens per IP in 24 hours
    const { data: recentTokens, error: countError } = await supabase
      .from('purchase_tokens')
      .select('id, created_at')
      .eq('client_ip', clientIp)
      .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());
    
    const tokenCount = recentTokens?.length || 0;
    
    if (tokenCount >= MAX_TOKENS_PER_IP) {
      console.warn('Rate limit exceeded:', { clientIp, tokenCount, plan });
      return NextResponse.json(
        { success: false, error: 'Daily activation limit reached. Please try again tomorrow or contact support.' },
        { status: 429 }
      );
    }
    
    // Generate new token with 5 minute expiry
    // Enough time for user to login if needed
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    
    // Save token to database
    const { error: insertError } = await supabase
      .from('purchase_tokens')
      .insert({
        token,
        plan,
        client_ip: clientIp,
        referrer: referrer.substring(0, 500), // Store referrer for auditing
        expires_at: expiresAt.toISOString(),
        used: false
      });
    
    if (insertError) {
      console.error('Failed to create token:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate activation link' },
        { status: 500 }
      );
    }
    
    // Return the activation URL
    const activationUrl = `/activate/${plan}?token=${token}`;
    
    return NextResponse.json({
      success: true,
      activationUrl,
      expiresAt: expiresAt.toISOString(),
      expiresIn: 300 // 5 minutes in seconds
    });
    
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
