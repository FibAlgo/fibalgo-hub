/**
 * Polar Checkout Route - DISABLED
 * 
 * Polar payment system has been disabled.
 * Subscriptions are now managed by admin only.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Payment system disabled', 
      message: 'Subscriptions are managed by admin. Please contact support.' 
    }, 
    { status: 501 }
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Payment system disabled', 
      message: 'Subscriptions are managed by admin. Please contact support.' 
    }, 
    { status: 501 }
  );
}
