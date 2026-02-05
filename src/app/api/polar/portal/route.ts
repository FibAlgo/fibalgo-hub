/**
 * Polar Customer Portal Route - DISABLED
 * 
 * Polar payment system has been disabled.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Payment system disabled', 
      message: 'Subscriptions are managed by admin. Please contact support.' 
    }, 
    { status: 501 }
  );
}
