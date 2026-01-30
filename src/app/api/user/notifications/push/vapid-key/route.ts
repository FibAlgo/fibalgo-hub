import { NextResponse } from 'next/server';

// Return VAPID public key for push subscription
export async function GET() {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  
  if (!vapidPublicKey) {
    return NextResponse.json(
      { error: 'VAPID key not configured' },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ publicKey: vapidPublicKey });
}
