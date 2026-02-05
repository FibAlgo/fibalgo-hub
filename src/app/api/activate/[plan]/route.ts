import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Allowed referrers - CopeCart domains (add more as needed)
const ALLOWED_REFERRERS = [
  'copecart.com',
  'www.copecart.com',
  'checkout.copecart.com',
  'app.copecart.com',
  'pay.copecart.com',
  'secure.copecart.com',
  'order.copecart.com',
  'buy.copecart.com',
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
    let referrerHostname = '';
    
    try {
      if (referrer) {
        referrerHostname = new URL(referrer).hostname;
      }
    } catch (e) {
      // Invalid URL, ignore
    }
    
    // Log all referrers for debugging
    console.log('Activation attempt:', {
      referrer,
      referrerHostname,
      plan,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    const isValidReferrer = ALLOWED_REFERRERS.some(allowed => 
      referrerHostname === allowed || referrerHostname.endsWith('.' + allowed)
    );
    
    // Also allow if referrer contains 'copecart' anywhere
    const containsCopecart = referrerHostname.includes('copecart');
    
    // Allow explicit CopeCart flag from success URL
    const url = request.nextUrl;
    const sourceParam = (url.searchParams.get('source') || '').toLowerCase();
    const ccParam = (url.searchParams.get('cc') || '').toLowerCase();
    const copecartParam = (url.searchParams.get('copecart') || '').toLowerCase();
    const isCopecartFlag = sourceParam === 'copecart' || ccParam === '1' || copecartParam === '1';
    const fetchSite = (request.headers.get('sec-fetch-site') || '').toLowerCase();
    const isCrossSite = fetchSite === 'cross-site';

    // For development, also allow localhost
    const isDev = process.env.NODE_ENV === 'development';
    const isLocalhost = referrerHostname === 'localhost' || referrerHostname === '127.0.0.1';
    
    if (!isValidReferrer && !containsCopecart && !(isDev && isLocalhost) && !(isCopecartFlag && isCrossSite)) {
      console.warn('Invalid referrer - Access denied:', {
        referrer,
        referrerHostname,
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
    
    // Check if this IP recently got a token (rate limiting - 1 per 1 minute for testing)
    const { data: recentToken } = await supabase
      .from('purchase_tokens')
      .select('id')
      .eq('client_ip', clientIp)
      .eq('used', false) // Only check unused tokens
      .gte('created_at', new Date(Date.now() - 1 * 60 * 1000).toISOString())
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
    const storedReferrer = referrer || (isCopecartFlag ? 'copecart:query' : '');
    const { error: insertError } = await supabase
      .from('purchase_tokens')
      .insert({
        token,
        plan,
        client_ip: clientIp,
        referrer: storedReferrer.substring(0, 500), // Store referrer for auditing
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
