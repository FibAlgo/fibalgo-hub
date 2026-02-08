/**
 * 🧹 DATABASE CLEANUP CRON - Otomatik Veri Temizliği
 * 
 * Her 3 saatte bir çalışır ve gereksiz verileri temizler.
 * RAM kullanımını optimize eder.
 * 
 * Vercel Cron: vercel.json'da tanımlanmalı
 * Schedule: "0 0,3,6,9,12,15,18,21 * * *" (every 3 hours)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface CleanupResult {
  table: string;
  deleted: number;
  error?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron authentication
    const { verifyCronAuth } = await import('@/lib/api/auth');
    const cronAuth = verifyCronAuth(request);
    if (!cronAuth.authorized) {
      return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.statusCode || 401 });
    }
    
    console.log('[Database Cleanup] Starting cleanup...');
    
    const results: CleanupResult[] = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 1. notification_history - 7 günden eski kayıtları sil
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('notification_history')
        .delete()
        .lt('created_at', sevenDaysAgo)
        .select('id');
      
      results.push({
        table: 'notification_history',
        deleted: data?.length || 0,
        error: error?.message
      });
    } catch (e) {
      results.push({ table: 'notification_history', deleted: 0, error: String(e) });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 2. email_queue - sent/failed olanları temizle (24 saatten eski)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('email_queue')
        .delete()
        .in('status', ['sent', 'failed'])
        .lt('created_at', oneDayAgo)
        .select('id');
      
      results.push({
        table: 'email_queue',
        deleted: data?.length || 0,
        error: error?.message
      });
    } catch (e) {
      results.push({ table: 'email_queue', deleted: 0, error: String(e) });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 3. api_call_log - 3 günden eski logları sil
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('api_call_log')
        .delete()
        .lt('called_at', threeDaysAgo)
        .select('id');
      
      results.push({
        table: 'api_call_log',
        deleted: data?.length || 0,
        error: error?.message
      });
    } catch (e) {
      results.push({ table: 'api_call_log', deleted: 0, error: String(e) });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 4. verification_codes - Kullanılmış veya expired olanları sil
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const now = new Date().toISOString();
      
      // Expired olanları sil
      const { data: expiredData, error: expiredError } = await supabase
        .from('verification_codes')
        .delete()
        .lt('expires_at', now)
        .select('id');
      
      // Kullanılmış olanları sil
      const { data: usedData, error: usedError } = await supabase
        .from('verification_codes')
        .delete()
        .not('used_at', 'is', null)
        .select('id');
      
      results.push({
        table: 'verification_codes',
        deleted: (expiredData?.length || 0) + (usedData?.length || 0),
        error: expiredError?.message || usedError?.message
      });
    } catch (e) {
      results.push({ table: 'verification_codes', deleted: 0, error: String(e) });
    }
    
    // purchase_tokens cleanup removed — old token system replaced by CopeCart IPN webhook
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 6. news_analyses - 30 günden eski haberleri sil (batch olarak)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      let totalDeleted = 0;
      let batchDeleted = 0;
      
      // Batch olarak sil (max 1000 per batch, max 5 batch)
      for (let i = 0; i < 5; i++) {
        const { data, error } = await supabase
          .from('news_analyses')
          .delete()
          .lt('published_at', thirtyDaysAgo)
          .limit(1000)
          .select('id');
        
        if (error) {
          results.push({ table: 'news_analyses', deleted: totalDeleted, error: error.message });
          break;
        }
        
        batchDeleted = data?.length || 0;
        totalDeleted += batchDeleted;
        
        // Eğer 1000'den az sildiyse, daha fazla yok demektir
        if (batchDeleted < 1000) break;
      }
      
      results.push({
        table: 'news_analyses',
        deleted: totalDeleted
      });
    } catch (e) {
      results.push({ table: 'news_analyses', deleted: 0, error: String(e) });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 7. Cache tablolarındaki expired verileri temizle
    // ═══════════════════════════════════════════════════════════════════════════
    const cacheTables = [
      'market_data_cache',
      'ohlc_cache',
      'macro_data_cache',
      'fundamentals_cache',
      'crypto_onchain_cache',
      'cot_data_cache',
      'treasury_yields_cache',
      'sentiment_cache'
    ];
    
    const now = new Date().toISOString();
    
    for (const table of cacheTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .delete()
          .lt('expires_at', now)
          .select('id');
        
        results.push({
          table,
          deleted: data?.length || 0,
          error: error?.message
        });
      } catch (e) {
        results.push({ table, deleted: 0, error: String(e) });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 8. social_proof_queue - 24 saatten eski olanları sil
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('social_proof_queue')
        .delete()
        .lt('created_at', oneDayAgo)
        .select('id');
      
      results.push({
        table: 'social_proof_queue',
        deleted: data?.length || 0,
        error: error?.message
      });
    } catch (e) {
      results.push({ table: 'social_proof_queue', deleted: 0, error: String(e) });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════════════════
    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
    const errors = results.filter(r => r.error).map(r => `${r.table}: ${r.error}`);
    const duration = Date.now() - startTime;
    
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      totalDeleted,
      results,
      errors: errors.length > 0 ? errors : undefined
    };
    
    console.log('[Database Cleanup] Completed:', JSON.stringify({
      totalDeleted,
      duration: `${duration}ms`,
      tables: results.map(r => `${r.table}: ${r.deleted}`)
    }));
    
    return NextResponse.json(summary);
    
  } catch (error) {
    console.error('[Database Cleanup] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}
