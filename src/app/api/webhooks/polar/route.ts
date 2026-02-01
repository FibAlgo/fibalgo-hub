import { NextResponse } from 'next/server';

/**
 * 🔒 SECURITY: This endpoint is DEPRECATED and DISABLED
 * All Polar webhook events should go to /api/polar/webhook
 * This endpoint exists only to return 410 Gone for any legacy integrations
 */
export async function POST() {
  console.warn('[SECURITY] Deprecated webhook endpoint hit: /api/webhooks/polar - returning 410');
  return NextResponse.json({ error: 'This endpoint is deprecated. Use /api/polar/webhook' }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ error: 'This endpoint is deprecated' }, { status: 410 });
}
