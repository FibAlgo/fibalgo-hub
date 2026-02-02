/**
 * E-posta kuyruğu işleyici cron.
 * Her 1–2 dakikada çalıştırın; kuyruktan batch alıp e-posta gönderir (timeout riski yok).
 *
 * Vercel Cron örnek: schedule = "her 2 dakika" (star-slash-2 * * * *)
 */

import { NextResponse } from 'next/server';
import { processEmailQueue, EMAIL_QUEUE_BATCH_SIZE } from '@/lib/notifications/sendEmailNotification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron authentication (handles x-vercel-cron, Bearer token, query param, user-agent)
  const { verifyCronAuth } = await import('@/lib/api/auth');
  const cronAuth = verifyCronAuth(request);
  if (!cronAuth.authorized) {
    return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.statusCode || 401 });
  }

  try {
    const result = await processEmailQueue(EMAIL_QUEUE_BATCH_SIZE);
    return NextResponse.json({
      success: true,
      ...result,
      batchSize: EMAIL_QUEUE_BATCH_SIZE,
    });
  } catch (error) {
    console.error('[process-email-queue]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
