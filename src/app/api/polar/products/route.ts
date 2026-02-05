/**
 * Polar Products API - DISABLED
 * 
 * Polar payment system has been disabled.
 * Returns empty products list.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    products: [],
    message: 'Payment system disabled. Subscriptions are managed by admin.',
  });
}
