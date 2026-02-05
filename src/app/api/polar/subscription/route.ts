/**
 * Polar Subscription Management API - DISABLED
 * 
 * Polar payment system has been disabled.
 * Subscriptions are now managed through the admin panel.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Payment system disabled', 
      message: 'Subscriptions are managed by admin.' 
    }, 
    { status: 501 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Payment system disabled', 
      message: 'Subscriptions are managed by admin.' 
    }, 
    { status: 501 }
  );
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Payment system disabled', 
      message: 'Subscriptions are managed by admin.' 
    }, 
    { status: 501 }
  );
}
