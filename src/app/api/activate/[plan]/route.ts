import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Allowed referrers - CopeCart domains
const ALLOWED_REFERRERS = [
  'copecart.com',
  'www.copecart.com',
  'checkout.copecart.com',
  'app.copecart.com',
];

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
    
    // Check referrer
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || '';
    const referrerUrl = referrer ? new URL(referrer).hostname : '';
    
    const isValidReferrer = ALLOWED_REFERRERS.some(allowed => 
      referrerUrl === allowed || referrerUrl.endsWith('.' + allowed)
    );
    
    // For development, also allow localhost
    const isDev = process.env.NODE_ENV === 'development';
    const isLocalhost = referrerUrl === 'localhost' || referrerUrl === '127.0.0.1';
    
    if (!isValidReferrer && !(isDev && isLocalhost)) {
      // Log attempted abuse
      console.warn('Invalid referrer attempt:', {
        referrer,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        plan,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check if this IP recently got a token (rate limiting - 1 per 5 minutes)
    const { data: recentToken } = await supabase
      .from('purchase_tokens')
      .select('id')
      .eq('client_ip', clientIp)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1)
      .single();
    
    if (recentToken) {
      return NextResponse.json(
        { success: false, error: 'Please wait before requesting another activation link' },
        { status: 429 }
      );
    }
    
    // Generate new token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    
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
      expiresIn: 600 // 10 minutes in seconds
    });
    
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
