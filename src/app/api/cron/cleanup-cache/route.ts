/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧹 CACHE CLEANUP CRON - Expired Data Temizleme
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Her saat çalışır ve expired cache verilerini temizler.
 * 
 * Vercel Cron: vercel.json'da tanımlanmalı
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-cache",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredCache, getCacheStats } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication (handles x-vercel-cron, Bearer token, query param, user-agent)
    const { verifyCronAuth } = await import('@/lib/api/auth');
    const cronAuth = verifyCronAuth(request);
    if (!cronAuth.authorized) {
      return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.statusCode || 401 });
    }
    
    console.log('[Cache Cleanup] Starting cleanup...');
    
    // Get stats before cleanup
    const statsBefore = await getCacheStats();
    
    // Run cleanup
    const result = await cleanupExpiredCache();
    
    // Get stats after cleanup
    const statsAfter = await getCacheStats();
    
    const summary = {
      timestamp: new Date().toISOString(),
      deleted: result.deleted,
      errors: result.errors,
      stats: {
        before: statsBefore,
        after: statsAfter
      }
    };
    
    console.log('[Cache Cleanup] Completed:', JSON.stringify(summary, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleanup completed',
      ...summary
    });
  } catch (error) {
    console.error('[Cache Cleanup] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
