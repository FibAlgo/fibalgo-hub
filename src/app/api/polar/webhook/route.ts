/**
 * Polar Webhook Handler - DISABLED
 * 
 * Polar payment system has been disabled.
 * This endpoint is kept to avoid 404 errors from any pending webhooks.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    status: 'disabled',
    message: 'Polar integration disabled' 
  });
}

export async function POST(request: NextRequest) {
  // Silently accept any webhooks but don't process them
  console.log('[Polar Webhook] Received webhook but Polar is disabled');
  return NextResponse.json({ received: true, processed: false });
}
